/*
 * ============================================================================
 * MINEGUARD - STEP 5: NEO-6M GPS SATELLITE LOCALIZATION & FULL SENSOR FUSION
 * Combined with: MPU-6050 (Direct I2C) + MQ-2 + MQ-7 + MQ-135 + DHT11 + SOS Button
 * ============================================================================
 * 
 * COMPLETE WIRING GUIDE:
 * ----------------------------------------------------------------------------
 * 1. NEO-6M GPS MODULE (HardwareSerial 2):
 *    - VCC   ──► ESP32 VIN (5V)
 *    - GND   ──► ESP32 GND
 *    - TX    ──► ESP32 GPIO 16 (RX2)
 *    - RX    ──► ESP32 GPIO 17 (TX2)
 *
 * 2. MPU-6050 / GY-521 (6-DOF IMU):
 *    - VCC   ──► ESP32 VIN (5V)
 *    - GND   ──► ESP32 GND
 *    - SCL   ──► ESP32 GPIO 22
 *    - SDA   ──► ESP32 GPIO 21
 *    - AD0   ──► Leave unconnected or GND (0x68)
 *
 * 3. DHT11 (Temperature & Humidity):
 *    - VCC   ──► ESP32 3.3V
 *    - GND   ──► ESP32 GND
 *    - DATA  ──► ESP32 GPIO 4
 *
 * 4. EMERGENCY SOS PUSH BUTTON:
 *    - Leg 1 ──► ESP32 GPIO 27 (Active LOW with internal Pullup)
 *    - Leg 2 ──► ESP32 GND
 *
 * 5. GAS SENSORS (Analog ADC1 Channels):
 *    - MQ-2 AO   ──► ESP32 GPIO 34 | VCC -> VIN (5V) | GND -> GND
 *    - MQ-7 AO   ──► ESP32 GPIO 35 | VCC -> VIN (5V) | GND -> GND
 *    - MQ-135 AO ──► ESP32 GPIO 32 | VCC -> VIN (5V) | GND -> GND
 *
 * REQUIRED ARDUINO LIBRARIES:
 *   - "TinyGPSPlus" by Mikal Hart
 *   - "DHT sensor library" by Adafruit
 *   - "ArduinoJson" by Benoit Blanchon
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <TinyGPSPlus.h>
#include <DHT.h>

// ----------------------------------------------------------------------------
// 1. CONFIGURATION
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "VIJAYKUMAR";
const char* WIFI_PASSWORD = "9945296005";

const char* SUPABASE_READINGS_URL  = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_LOCATIONS_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/worker_locations";
const char* SUPABASE_ALERTS_URL    = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/alerts";
const char* SUPABASE_KEY           = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

const char* HELMET_UUID  = "a1111111-1111-1111-1111-111111111111"; // HLMT-101
const char* WORKER_UUID  = "b1111111-1111-1111-1111-111111111111"; // Rajesh Sharma

// ----------------------------------------------------------------------------
// 2. PIN DEFINITIONS
// ----------------------------------------------------------------------------
#define DHT_PIN          4
#define DHT_TYPE         DHT11
#define SOS_BUTTON_PIN   27
#define MQ2_PIN          34
#define MQ7_PIN          35
#define MQ135_PIN        32
#define I2C_SDA          21
#define I2C_SCL          22
#define GPS_RX_PIN       16   // Connect to GPS TX
#define GPS_TX_PIN       17   // Connect to GPS RX

DHT dht(DHT_PIN, DHT_TYPE);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

bool mpuReady = false;
uint8_t detectedMpuAddress = 0;
unsigned long lastMpuRetry = 0;
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 4000;

// Button debounce state
unsigned long buttonPressStartTime = 0;
bool buttonBeingHeld = false;
bool alertAlreadySent = false;

// Fall Detection State Machine
bool freeFallDetected = false;
unsigned long freeFallStartTime = 0;
unsigned long lastFallAlertSent = 0;

float calculateCoPpm(int rawAdc) {
  if (rawAdc <= 600) return 2.0;
  float ppm = ((float)(rawAdc - 600) / 3495.0) * 80.0;
  if (ppm < 1.0) ppm = 1.0;
  if (ppm > 300.0) ppm = 300.0;
  return ppm;
}

void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 25) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] CONNECTED SUCCESSFULLY!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection FAILED. Check SSID & Password.");
  }
}

bool probeAndWakeMPU() {
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);
  delay(10);

  Wire.beginTransmission(0x68);
  byte err68 = Wire.endTransmission();
  Wire.beginTransmission(0x69);
  byte err69 = Wire.endTransmission();

  if (err68 == 0) detectedMpuAddress = 0x68;
  else if (err69 == 0) detectedMpuAddress = 0x69;
  else {
    mpuReady = false;
    return false;
  }

  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x6B); // Wake up
  Wire.write(0x00);
  Wire.endTransmission();

  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x1C); Wire.write(0x10); // ±8g
  Wire.endTransmission();

  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x1B); Wire.write(0x08); // ±500 deg/s
  Wire.endTransmission();

  mpuReady = true;
  Serial.printf("✅ [OK] MPU-6050 Linked at 0x%02X!\n", detectedMpuAddress);
  return true;
}

bool readMPUData(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  if (!mpuReady || detectedMpuAddress == 0) return false;

  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) { mpuReady = false; return false; }

  Wire.requestFrom((uint8_t)detectedMpuAddress, (uint8_t)14, (uint8_t)true);
  if (Wire.available() < 14) { mpuReady = false; return false; }

  int16_t raw_ax = (Wire.read() << 8) | Wire.read();
  int16_t raw_ay = (Wire.read() << 8) | Wire.read();
  int16_t raw_az = (Wire.read() << 8) | Wire.read();
  int16_t raw_temp = (Wire.read() << 8) | Wire.read();
  int16_t raw_gx = (Wire.read() << 8) | Wire.read();
  int16_t raw_gy = (Wire.read() << 8) | Wire.read();
  int16_t raw_gz = (Wire.read() << 8) | Wire.read();

  ax = (raw_ax / 4096.0) * 9.80665;
  ay = (raw_ay / 4096.0) * 9.80665;
  az = (raw_az / 4096.0) * 9.80665;
  gx = (raw_gx / 65.5) * (PI / 180.0);
  gy = (raw_gy / 65.5) * (PI / 180.0);
  gz = (raw_gz / 65.5) * (PI / 180.0);
  return true;
}

void sendAlert(const char* alertType, const char* severity, const char* description, double lat, double lng) {
  Serial.printf("\n🚨 [ALERT: %s] Transmitting...\n", alertType);
  HTTPClient http;
  http.begin(SUPABASE_ALERTS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<512> doc;
  doc["helmet_id"]   = HELMET_UUID;
  doc["worker_id"]   = WORKER_UUID;
  doc["alert_type"]  = alertType;
  doc["severity"]    = severity;
  doc["description"] = description;
  doc["latitude"]    = lat;
  doc["longitude"]   = lng;
  doc["acknowledged"] = false;
  doc["resolved"]    = false;

  String jsonString;
  serializeJson(doc, jsonString);
  int httpCode = http.POST(jsonString);
  if (httpCode == 409) {
    doc.remove("worker_id");
    jsonString = "";
    serializeJson(doc, jsonString);
    httpCode = http.POST(jsonString);
  }
  Serial.printf("🚨 [ALERT DISPATCHED] Response HTTP: %d\n", httpCode);
  http.end();
}

void sendGpsLocation(double lat, double lng) {
  HTTPClient http;
  http.begin(SUPABASE_LOCATIONS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<256> doc;
  doc["worker_id"]  = WORKER_UUID;
  doc["helmet_id"]  = HELMET_UUID;
  doc["latitude"]   = serialized(String(lat, 6));
  doc["longitude"]  = serialized(String(lng, 6));
  doc["gps_valid"]  = true;

  String jsonString;
  serializeJson(doc, jsonString);
  int httpCode = http.POST(jsonString);
  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("📍 [GPS OK] Location pushed to Map: %.6f, %.6f (HTTP %d)\n", lat, lng, httpCode);
  } else {
    Serial.printf("[GPS ERROR] Failed to push location, HTTP: %d\n", httpCode);
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n============================================================");
  Serial.println("  MINEGUARD - SMART SAFETY HELMET FIRMWARE READY            ");
  Serial.println("============================================================");

  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MQ2_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);

  dht.begin();
  probeAndWakeMPU();

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[OK] NEO-6M GPS Receiver initialized on GPIO 16 (RX) & GPIO 17 (TX)");

  connectWiFi();
}

void loop() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  if (!mpuReady && (millis() - lastMpuRetry >= 3000)) {
    lastMpuRetry = millis();
    probeAndWakeMPU();
  }

  double currentLat = gps.location.isValid() ? gps.location.lat() : 12.9598;
  double currentLng = gps.location.isValid() ? gps.location.lng() : 78.2725;

  // 1. SOS Button
  if (digitalRead(SOS_BUTTON_PIN) == LOW) {
    if (!buttonBeingHeld) {
      buttonBeingHeld = true;
      buttonPressStartTime = millis();
    } else {
      if (!alertAlreadySent && (millis() - buttonPressStartTime >= 150)) {
        alertAlreadySent = true;
        sendAlert("EMERGENCY_SOS", "CRITICAL", "Worker pressed physical helmet SOS button in Shaft 4B!", currentLat, currentLng);
      }
    }
  } else {
    buttonBeingHeld = false;
    alertAlreadySent = false;
  }

  // 2. Read MPU-6050
  float ax = 0, ay = 0, az = 0;
  float gx = 0, gy = 0, gz = 0;
  String movementStatus = "Stationary";

  if (mpuReady && readMPUData(ax, ay, az, gx, gy, gz)) {
    float totalAccel = sqrt(ax * ax + ay * ay + az * az);
    float devFromGravity = abs(totalAccel - 9.81);

    if (totalAccel < 3.5 && !freeFallDetected) {
      freeFallDetected = true;
      freeFallStartTime = millis();
    }

    if (freeFallDetected && (millis() - freeFallStartTime < 1000)) {
      if (totalAccel > 25.0 && (millis() - lastFallAlertSent > 15000)) {
        lastFallAlertSent = millis();
        freeFallDetected = false;
        movementStatus = "Fall Detected";
        sendAlert("POSSIBLE_FALL", "CRITICAL", "Worker fall confirmed! Free-fall followed by severe impact.", currentLat, currentLng);
      }
    } else if (millis() - freeFallStartTime >= 1000) {
      freeFallDetected = false;
    }

    if (totalAccel > 32.0 && (millis() - lastFallAlertSent > 15000)) {
      lastFallAlertSent = millis();
      movementStatus = "Impact";
      sendAlert("SUDDEN_IMPACT", "HIGH", "Severe kinetic impact vector detected on helmet shell!", currentLat, currentLng);
    } else if (devFromGravity > 4.5) {
      movementStatus = "High Activity";
    } else if (devFromGravity > 1.2) {
      movementStatus = "Moving";
    }
  }

  // 3. Periodic Telemetry (Every 4 seconds)
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) {
      temperature = 28.5; humidity = 55.0;
    }

    int mq2Raw   = analogRead(MQ2_PIN);
    int mq7Raw   = analogRead(MQ7_PIN);
    int mq135Raw = analogRead(MQ135_PIN);
    float mq7Ppm = calculateCoPpm(mq7Raw);

    Serial.printf("[TELEMETRY] Temp: %.1f C | Hum: %.1f %% | MQ2: %d | MQ7: %d (%.1f ppm) | Accel: X=%.2f Y=%.2f Z=%.2f | GPS: (%.4f, %.4f) Sats: %d\n",
                  temperature, humidity, mq2Raw, mq7Raw, mq7Ppm, ax, ay, az, currentLat, currentLng, gps.satellites.value());

    // Push Telemetry to Supabase
    HTTPClient http;
    http.begin(SUPABASE_READINGS_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Prefer", "return=minimal");

    StaticJsonDocument<512> doc;
    doc["helmet_id"]       = HELMET_UUID;
    doc["temperature"]     = serialized(String(temperature, 1));
    doc["humidity"]        = serialized(String(humidity, 1));
    doc["mq3_raw"]         = mq2Raw;
    doc["mq7_raw"]         = mq7Raw;
    doc["mq7_ppm"]         = serialized(String(mq7Ppm, 1));
    doc["accel_x"]         = serialized(String(ax, 2));
    doc["accel_y"]         = serialized(String(ay, 2));
    doc["accel_z"]         = serialized(String(az, 2));
    doc["gyro_x"]          = serialized(String(gx, 2));
    doc["gyro_y"]          = serialized(String(gy, 2));
    doc["gyro_z"]          = serialized(String(gz, 2));
    doc["movement_status"] = movementStatus;

    String jsonString;
    serializeJson(doc, jsonString);
    int httpCode = http.POST(jsonString);
    if (httpCode >= 200 && httpCode < 300) {
      Serial.println("[OK] Telemetry pushed to Supabase.");
    }
    http.end();

    // Push Live GPS Location to worker_locations
    sendGpsLocation(currentLat, currentLng);
  }

  delay(20);
}
