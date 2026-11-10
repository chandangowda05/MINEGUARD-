/*
 * ============================================================================
 * MINEGUARD ESP32 Firmware - Smart Safety Helmet Sensor Module
 * ============================================================================
 *
 * NOTE: This is example firmware. Modify pin assignments, WiFi credentials,
 *       and endpoint URL before use.
 *
 * Sensors:
 *   - DHT11        : Temperature & Humidity
 *   - MQ-3         : Alcohol / flammable gas (analog)
 *   - MQ-7         : Carbon monoxide (analog)
 *   - MPU6050      : 6-axis accelerometer + gyroscope (I2C)
 *   - NEO-6M GPS   : Location (UART via SoftwareSerial)
 *   - Push button  : Emergency SOS
 *
 * Transmission:
 *   - Sends JSON to Supabase Edge Function every 5 seconds.
 *   - Includes retry logic and WiFi reconnection handling.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// ============================================================================
// >>>  CONFIGURATION – EDIT THESE VALUES BEFORE UPLOADING  <<<
// ============================================================================

// -- WiFi Credentials --------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // <-- Change this
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";    // <-- Change this

// -- Supabase Edge Function --------------------------------------------------
const char* ENDPOINT_URL  = "https://nfmziyqvklujuauostug.supabase.co/functions/v1/ingest-sensor-data";
const char* API_KEY       = "YOUR_DEVICE_API_KEY";   // <-- Must match DEVICE_API_KEY env var in Supabase

// -- Helmet Identity ---------------------------------------------------------
const char* HELMET_ID     = "HELMET-001";            // <-- Unique code for this helmet

// -- Pin Assignments ---------------------------------------------------------
#define DHT_PIN           4        // DHT11 data pin
#define DHT_TYPE          DHT11
#define MQ3_PIN           34       // MQ-3 analog input
#define MQ7_PIN           35       // MQ-7 analog input
#define SOS_BUTTON_PIN    15       // Emergency SOS push button (active LOW)
#define GPS_RX_PIN        16       // NEO-6M TX -> ESP32 RX
#define GPS_TX_PIN        17       // NEO-6M RX -> ESP32 TX

// -- Timing ------------------------------------------------------------------
#define SEND_INTERVAL_MS  5000     // Transmit every 5 seconds
#define WIFI_TIMEOUT_MS   20000    // WiFi connection timeout
#define HTTP_TIMEOUT_MS   10000    // HTTP request timeout
#define MAX_RETRIES       3        // Max retries per transmission

// ============================================================================
// >>>  END OF CONFIGURATION
// ============================================================================

// -- Sensor Objects ----------------------------------------------------------
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);  // UART1

// -- State -------------------------------------------------------------------
unsigned long lastSendTime = 0;
bool mpuReady = false;

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== MINEGUARD ESP32 Firmware ===");

  // SOS button
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);

  // DHT sensor
  dht.begin();

  // MPU6050
  Wire.begin();
  if (mpu.begin()) {
    mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    mpuReady = true;
    Serial.println("[OK] MPU6050 initialized");
  } else {
    Serial.println("[WARN] MPU6050 not found – motion data unavailable");
  }

  // GPS
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[OK] GPS serial started");

  // WiFi
  connectWiFi();

  Serial.println("[OK] Setup complete. Starting sensor loop...");
}

// ============================================================================
// LOOP
// ============================================================================
void loop() {
  // Feed GPS parser
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    // Ensure WiFi is connected
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WARN] WiFi disconnected – reconnecting...");
      connectWiFi();
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[ERR] WiFi reconnection failed, skipping this cycle");
        return;
      }
    }

    // Read sensors & send
    sendSensorData();
  }
}

// ============================================================================
// WiFi Connection
// ============================================================================
void connectWiFi() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("[WIFI] Connecting to %s ", WIFI_SSID);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected – IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Connection FAILED");
  }
}

// ============================================================================
// Read Sensors & Transmit
// ============================================================================
void sendSensorData() {
  // ---- DHT11 ----
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  if (isnan(temperature)) temperature = -1;
  if (isnan(humidity))    humidity    = -1;

  // ---- MQ-3 & MQ-7 (raw analog) ----
  float mq3Raw = analogRead(MQ3_PIN);
  float mq7Raw = analogRead(MQ7_PIN);

  // ---- MPU6050 ----
  float ax = 0, ay = 0, az = 0;
  float gx = 0, gy = 0, gz = 0;
  if (mpuReady) {
    sensors_event_t accel, gyro, temp;
    mpu.getEvent(&accel, &gyro, &temp);
    ax = accel.acceleration.x;
    ay = accel.acceleration.y;
    az = accel.acceleration.z;
    gx = gyro.gyro.x;
    gy = gyro.gyro.y;
    gz = gyro.gyro.z;
  }

  // ---- GPS ----
  bool gpsValid     = gps.location.isValid();
  double latitude   = gpsValid ? gps.location.lat() : 0.0;
  double longitude  = gpsValid ? gps.location.lng() : 0.0;

  // ---- SOS Button (active LOW) ----
  bool emergencyPressed = (digitalRead(SOS_BUTTON_PIN) == LOW);

  // ---- Build JSON ----
  StaticJsonDocument<512> doc;
  doc["helmet_id"]          = HELMET_ID;
  doc["temperature"]        = temperature;
  doc["humidity"]           = humidity;
  doc["mq3_raw"]            = mq3Raw;
  doc["mq7_raw"]            = mq7Raw;
  doc["accel_x"]            = ax;
  doc["accel_y"]            = ay;
  doc["accel_z"]            = az;
  doc["gyro_x"]             = gx;
  doc["gyro_y"]             = gy;
  doc["gyro_z"]             = gz;
  doc["latitude"]           = latitude;
  doc["longitude"]          = longitude;
  doc["gps_valid"]          = gpsValid;
  doc["emergency_pressed"]  = emergencyPressed;

  String payload;
  serializeJson(doc, payload);

  Serial.println("[TX] Payload: " + payload);

  // ---- Send with retries ----
  bool success = false;
  for (int attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
    if (attempt > 1) {
      Serial.printf("[TX] Retry %d/%d...\n", attempt, MAX_RETRIES);
      delay(1000 * attempt);  // Exponential-ish back-off
    }

    HTTPClient http;
    http.begin(ENDPOINT_URL);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", API_KEY);

    int httpCode = http.POST(payload);

    if (httpCode == 200) {
      String response = http.getString();
      Serial.printf("[TX] Success (200): %s\n", response.c_str());
      success = true;
    } else if (httpCode > 0) {
      String response = http.getString();
      Serial.printf("[TX] Server responded %d: %s\n", httpCode, response.c_str());
    } else {
      Serial.printf("[TX] HTTP error: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  }

  if (!success) {
    Serial.println("[TX] All retries exhausted – data lost for this cycle");
  }
}
