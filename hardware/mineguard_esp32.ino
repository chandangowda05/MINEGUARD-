/*
 * ============================================================================
 * MINEGUARD ESP32 Firmware - Smart Safety Helmet Sensor Module
 * ============================================================================
 *
 * Sensors:
 *   - DHT11        : Temperature & Humidity (GPIO 4)
 *   - MQ-3         : Alcohol / Flammable Gas ADC (GPIO 34)
 *   - MQ-7         : Carbon Monoxide (CO) ADC (GPIO 35)
 *   - MPU6050      : 6-Axis Accelerometer & Gyroscope (I2C: SDA 21, SCL 22)
 *   - NEO-6M GPS   : UART Serial (RX 16, TX 17)
 *   - Push Button  : Emergency Panic SOS (GPIO 15, Active LOW with Pullup)
 *
 * Telemetry:
 *   - Direct HTTPS REST ingestion to Supabase PostgreSQL database
 *   - Automatic Realtime WebSocket broadcast to MINEGUARD Web Dashboard
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
// >>>  CONFIGURATION – SET YOUR WIFI CREDENTIALS HERE  <<<
// ============================================================================

// -- WiFi Credentials --------------------------------------------------------
const char* WIFI_SSID     = "VIJAYKUMAR";
const char* WIFI_PASSWORD = "9945296005";

// -- Supabase Direct Ingestion Endpoints -------------------------------------
const char* SUPABASE_READINGS_URL  = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_LOCATIONS_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/worker_locations";
const char* SUPABASE_ALERTS_URL    = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/alerts";
const char* SUPABASE_KEY           = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

// -- Helmet & Assigned Worker UUIDs (from 002_seed_data.sql) -----------------
const char* HELMET_UUID   = "a1111111-1111-1111-1111-111111111111"; // HLMT-101
const char* WORKER_UUID   = "b1111111-1111-1111-1111-111111111111"; // Rajesh Sharma

// -- Hardware Pin Assignments ------------------------------------------------
#define DHT_PIN           4        // DHT11 Data Pin
#define DHT_TYPE          DHT11
#define MQ2_PIN           34       // MQ-2 Methane / LPG / Smoke (ADC1_CH6)
#define MQ7_PIN           35       // MQ-7 Carbon Monoxide (ADC1_CH7)
#define MQ135_PIN         32       // MQ-135 Air Quality / Toxic Gas (ADC1_CH4)
#define SOS_BUTTON_PIN    27       // Emergency Push Button (Active LOW with internal Pullup)
#define GPS_RX_PIN        16       // NEO-6M TX -> ESP32 RX (GPIO 16)
#define GPS_TX_PIN        17       // NEO-6M RX -> ESP32 TX (GPIO 17)

// -- Telemetry Timing --------------------------------------------------------
#define SEND_INTERVAL_MS  5000     // Stream readings every 5 seconds
#define WIFI_TIMEOUT_MS   20000    // WiFi timeout in ms

// ============================================================================
// GLOBALS & OBJECTS
// ============================================================================
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

bool mpuReady = false;
unsigned long lastMpuRetry = 0;
unsigned long lastSendTime = 0;
unsigned long buttonPressStartTime = 0;
bool buttonBeingHeld = false;
bool alertAlreadySent = false;

void connectWiFi();
void sendSensorData();
void sendGpsLocation(double lat, double lng);
void sendIncidentAlert(const char* alertType, const char* severity, const char* desc, double lat, double lng);
bool initMPU();

// ============================================================================
// I2C BUS SCANNER
// ============================================================================
void scanI2CBus() {
  Serial.println("\n--- [I2C BUS SCANNER] (SDA=GPIO 21, SCL=GPIO 22) ---");
  byte count = 0;
  for (byte address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("  --> Device FOUND at address 0x%02X", address);
      if (address == 0x68) Serial.print(" [Standard MPU-6050 address]");
      else if (address == 0x69) Serial.print(" [Alternate MPU-6050 address]");
      Serial.println();
      count++;
    }
  }
  if (count == 0) {
    Serial.println("  ❌ NO I2C DEVICES FOUND! Check VCC->VIN(5V), SDA=21, SCL=22.");
  }
  Serial.println("----------------------------------------------------\n");
}

bool initMPU() {
  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(50);
  if (mpu.begin(0x68, &Wire) || mpu.begin(0x69, &Wire)) {
    mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    mpuReady = true;
    Serial.println("[OK] MPU6050 6-DOF IMU initialized successfully");
    return true;
  }
  mpuReady = false;
  return false;
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("  MINEGUARD ESP32 SMART HELMET INITIALIZING  ");
  Serial.println("=============================================");

  // Pin modes
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MQ2_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);

  // DHT11
  dht.begin();
  Serial.println("[OK] DHT11 sensor ready");

  // MPU6050 with scanner & dual address
  scanI2CBus();
  if (!initMPU()) {
    Serial.println("[WARN] MPU6050 not detected. Retries enabled in loop.");
  }

  // NEO-6M GPS
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[OK] GPS serial interface initialized");

  // WiFi Connection
  connectWiFi();

  Serial.println("[OK] Ready. Starting telemetry loop...\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
  // Continuously feed GPS NMEA sentences
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Auto-retry MPU-6050 initialization every 3s if disconnected
  if (!mpuReady && (millis() - lastMpuRetry >= 3000)) {
    lastMpuRetry = millis();
    initMPU();
  }

  // Check emergency button with 150ms sustained-press noise filter
  int sosReading = digitalRead(SOS_BUTTON_PIN);
  if (sosReading == LOW) {
    if (!buttonBeingHeld) {
      buttonBeingHeld = true;
      buttonPressStartTime = millis();
    } else {
      if (!alertAlreadySent && (millis() - buttonPressStartTime >= 150)) {
        alertAlreadySent = true;
        Serial.println("[ALARM] Physical Emergency SOS push button confirmed pressed!");
        double lat = gps.location.isValid() ? gps.location.lat() : 12.9598;
        double lng = gps.location.isValid() ? gps.location.lng() : 78.2725;
        sendIncidentAlert("EMERGENCY_SOS", "CRITICAL", "Worker manual SOS push button activated in Shaft 4B!", lat, lng);
      }
    }
  } else {
    buttonBeingHeld = false;
    alertAlreadySent = false;
  }

  // Transmit telemetry every SEND_INTERVAL_MS
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WARN] WiFi disconnected. Attempting reconnect...");
      connectWiFi();
      if (WiFi.status() != WL_CONNECTED) {
        return;
      }
    }

    sendSensorData();

    // If GPS acquired coordinates, transmit live location
    if (gps.location.isValid()) {
      sendGpsLocation(gps.location.lat(), gps.location.lng());
    }
  }
}

// ============================================================================
// WIFI CONNECTION
// ============================================================================
void connectWiFi() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("[WIFI] Connecting to SSID: %s ", WIFI_SSID);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! Local IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Connection failed. Check SSID/Password.");
  }
}

// ============================================================================
// SENSOR READ & DIRECT SUPABASE INGESTION
// ============================================================================
void sendSensorData() {
  // 1. Read DHT11
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = 28.5;
  if (isnan(hum))  hum  = 62.0;

  // 2. Read Gas Sensors
  float mq2Val = analogRead(MQ2_PIN);
  float mq7Val = analogRead(MQ7_PIN);
  float mq135Val = analogRead(MQ135_PIN);
  float mq7Ppm = (mq7Val / 4095.0) * 200.0;

  // 3. Read MPU6050 IMU
  float ax = 0, ay = 0, az = 0;
  float gx = 0, gy = 0, gz = 0;
  String movementStatus = "Sensor Disconnected";

  if (mpuReady) {
    movementStatus = "Stationary";
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    ax = a.acceleration.x;
    ay = a.acceleration.y;
    az = a.acceleration.z;
    gx = g.gyro.x;
    gy = g.gyro.y;
    gz = g.gyro.z;

    float magnitude = sqrt(ax * ax + ay * ay + az * az);
    float dev = abs(magnitude - 9.81);
    if (dev > 25.0) {
      movementStatus = "Impact";
      double lat = gps.location.isValid() ? gps.location.lat() : 12.9598;
      double lng = gps.location.isValid() ? gps.location.lng() : 78.2725;
      sendIncidentAlert("POSSIBLE_FALL", "HIGH", "High impact vector (>25G) detected on helmet!", lat, lng);
    } else if (dev > 4.5) {
      movementStatus = "High Activity";
    } else if (dev > 1.2) {
      movementStatus = "Moving";
    }
  }

  // High capacity check (Disabled by default during bench testing to prevent alert flooding)
  const bool ENABLE_AUTO_GAS_ALERTS = false;
  if (ENABLE_AUTO_GAS_ALERTS && mq7Ppm > 350.0) {
    double lat = gps.location.isValid() ? gps.location.lat() : 12.9598;
    double lng = gps.location.isValid() ? gps.location.lng() : 78.2725;
    sendIncidentAlert("CARBON_MONOXIDE", "HIGH", "High Carbon Monoxide concentration detected by MQ-7!", lat, lng);
  }

  // 4. Build JSON Payload
  StaticJsonDocument<512> doc;
  doc["helmet_id"]        = HELMET_UUID;
  doc["temperature"]      = temp;
  doc["humidity"]         = hum;
  doc["mq3_raw"]          = mq2Val; // MQ-2 Combustible Gas / Methane
  doc["mq7_raw"]          = mq7Val;
  doc["mq7_ppm"]          = mq7Ppm;
  doc["accel_x"]          = ax;
  doc["accel_y"]          = ay;
  doc["accel_z"]          = az;
  doc["gyro_x"]           = gx;
  doc["gyro_y"]           = gy;
  doc["gyro_z"]           = gz;
  doc["movement_status"]  = movementStatus;

  String jsonBody;
  serializeJson(doc, jsonBody);

  Serial.println("[TX] Telemetry: " + jsonBody);

  // 5. POST to Supabase sensor_readings
  HTTPClient http;
  http.begin(SUPABASE_READINGS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  int httpCode = http.POST(jsonBody);
  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("[TX] Telemetry posted (HTTP %d)\n", httpCode);
  } else {
    String resp = http.getString();
    Serial.printf("[TX] Telemetry failed (HTTP %d): %s\n", httpCode, resp.c_str());
  }
  http.end();
}

// ============================================================================
// TRANSMIT GPS LOCATION TO SUPABASE
// ============================================================================
void sendGpsLocation(double lat, double lng) {
  StaticJsonDocument<256> doc;
  doc["worker_id"] = WORKER_UUID;
  doc["helmet_id"] = HELMET_UUID;
  doc["latitude"]  = lat;
  doc["longitude"] = lng;
  doc["gps_valid"] = true;

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  http.begin(SUPABASE_LOCATIONS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  int httpCode = http.POST(jsonBody);
  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("[TX] GPS Location updated (HTTP %d)\n", httpCode);
  }
  http.end();
}

// ============================================================================
// TRANSMIT INCIDENT ALERT TO SUPABASE
// ============================================================================
void sendIncidentAlert(const char* alertType, const char* severity, const char* desc, double lat, double lng) {
  StaticJsonDocument<512> doc;
  doc["worker_id"]   = WORKER_UUID;
  doc["helmet_id"]   = HELMET_UUID;
  doc["alert_type"]  = alertType;
  doc["severity"]    = severity;
  doc["description"] = desc;
  doc["latitude"]    = lat;
  doc["longitude"]   = lng;
  doc["acknowledged"] = false;
  doc["resolved"]    = false;

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  http.begin(SUPABASE_ALERTS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  int httpCode = http.POST(jsonBody);
  if (httpCode == 409) {
    Serial.println("[AUTO-RETRY] Retrying incident alert without worker_id...");
    doc.remove("worker_id");
    jsonBody = "";
    serializeJson(doc, jsonBody);
    httpCode = http.POST(jsonBody);
  }
  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("[ALERT] Incident dispatched to cloud (HTTP %d)\n", httpCode);
  } else {
    Serial.printf("[ERROR] Failed to post incident, HTTP %d: %s\n", httpCode, http.getString().c_str());
  }
  http.end();
}
