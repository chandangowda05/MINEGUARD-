/*
 * ============================================================================
 * MINEGUARD - STEP 4: MPU-6050 (6-AXIS IMU FALL DETECTION & IMPACT)
 * Combined with: DHT11 + SOS Button + MQ-2 + MQ-7 + MQ-135
 * ============================================================================
 * 
 * COMPLETE WIRING GUIDE:
 * ----------------------------------------------------------------------------
 * 1. MPU-6050 (6-Axis Accelerometer & Gyroscope):
 *    - VCC   ──► ESP32 3.3V
 *    - GND   ──► ESP32 GND
 *    - SDA   ──► ESP32 GPIO 21 (Default I2C Data)
 *    - SCL   ──► ESP32 GPIO 22 (Default I2C Clock)
 *    - AD0   ──► (Leave unconnected, sets address to 0x68)
 *    - INT   ──► (Leave unconnected)
 *
 * 2. DHT11 (Temperature & Humidity):
 *    - VCC   ──► ESP32 3.3V
 *    - GND   ──► ESP32 GND
 *    - DATA  ──► ESP32 GPIO 4
 *
 * 3. EMERGENCY SOS BUTTON:
 *    - Leg 1 ──► ESP32 GPIO 27 (Active LOW with internal Pull-up)
 *    - Leg 2 ──► ESP32 GND
 *
 * 4. GAS SENSORS:
 *    - MQ-2 AO   ──► ESP32 GPIO 34 (ADC1_CH6) | VCC -> VIN (5V) | GND -> GND
 *    - MQ-7 AO   ──► ESP32 GPIO 35 (ADC1_CH7) | VCC -> VIN (5V) | GND -> GND
 *    - MQ-135 AO ──► ESP32 GPIO 32 (ADC1_CH4) | VCC -> VIN (5V) | GND -> GND
 *
 * REQUIRED ARDUINO LIBRARIES:
 *   - "Adafruit MPU6050"
 *   - "Adafruit Sensor"
 *   - "DHT sensor library" by Adafruit
 *   - "ArduinoJson" by Benoit Blanchon
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>

// ----------------------------------------------------------------------------
// 1. WIFI & SUPABASE CONFIGURATION
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "VIJAYKUMAR";
const char* WIFI_PASSWORD = "9945296005";

const char* SUPABASE_READINGS_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_ALERTS_URL   = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/alerts";
const char* SUPABASE_KEY          = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

const char* HELMET_UUID  = "a1111111-1111-1111-1111-111111111111"; // HLMT-101
const char* WORKER_UUID  = "b1111111-1111-1111-1111-111111111111"; // Rajesh Sharma

// ----------------------------------------------------------------------------
// 2. PIN ASSIGNMENTS
// ----------------------------------------------------------------------------
#define DHT_PIN          4
#define DHT_TYPE         DHT11
#define SOS_BUTTON_PIN   27
#define MQ2_PIN          34
#define MQ7_PIN          35
#define MQ135_PIN        32
#define I2C_SDA          21
#define I2C_SCL          22

DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_MPU6050 mpu;
bool mpuReady = false;

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
unsigned long lastHazardAlertTime = 0;

// High-Capacity Gas Alert Thresholds (Silenced during bench testing)
const bool ENABLE_AUTO_GAS_ALERTS = false;      // Set to true when demonstrating real gas smoke test
const float CO_CRITICAL_PPM_THRESHOLD = 350.0;  // High capacity threshold
const int MQ2_CRITICAL_RAW_THRESHOLD = 3600;   // High capacity threshold

// Convert raw MQ-7 ADC (0-4095) to estimated CO ppm
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

void sendAlert(const char* alertType, const char* severity, const char* description) {
  Serial.printf("\n🚨 [ALERT: %s] Transmitting to Supabase...\n", alertType);

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
  doc["latitude"]    = 12.9716;
  doc["longitude"]   = 77.5946;
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

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("🚨 [ALERT DISPATCHED] Response HTTP: %d\n", httpCode);
  } else {
    Serial.printf("[ERROR] Failed to post alert, HTTP: %d\n", httpCode);
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n============================================================");
  Serial.println("  MINEGUARD - STEP 4: MPU-6050 + GAS + DHT + SOS READY      ");
  Serial.println("============================================================");

  // 1. Sensors Pin Modes
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MQ2_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);

  analogReadResolution(12);

  // 2. Initialize DHT11
  dht.begin();
  Serial.println("[OK] DHT11 initialized on GPIO 4");
  Serial.printf("[OK] SOS Button configured on GPIO %d (Active LOW)\n", SOS_BUTTON_PIN);
  Serial.println("[OK] MQ-2 Methane / Smoke Sensor on GPIO 34");
  Serial.println("[OK] MQ-7 CO Sensor on GPIO 35");
  Serial.println("[OK] MQ-135 Air Quality Sensor on GPIO 32");

  // 3. Initialize MPU-6050 over I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  if (mpu.begin()) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    mpuReady = true;
    Serial.println("[OK] MPU-6050 6-Axis IMU Initialized on I2C (SDA=21, SCL=22)");
  } else {
    Serial.println("⚠️  [WARN] MPU-6050 not detected! Check SDA=GPIO 21, SCL=GPIO 22, VCC, GND.");
  }

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  // 1. Instant SOS Button Check (150ms sustained press)
  int pinReading = digitalRead(SOS_BUTTON_PIN);
  if (pinReading == LOW) {
    if (!buttonBeingHeld) {
      buttonBeingHeld = true;
      buttonPressStartTime = millis();
    } else {
      if (!alertAlreadySent && (millis() - buttonPressStartTime >= 150)) {
        alertAlreadySent = true;
        sendAlert("EMERGENCY_SOS", "CRITICAL", "Worker pressed physical helmet SOS emergency button in Shaft 4B!");
      }
    }
  } else {
    buttonBeingHeld = false;
    alertAlreadySent = false;
  }

  // 2. Fast MPU-6050 Fall & Impact Detection
  float ax = 0, ay = 0, az = 9.81;
  float gx = 0, gy = 0, gz = 0;
  String movementStatus = "Stationary";

  if (mpuReady) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    ax = a.acceleration.x;
    ay = a.acceleration.y;
    az = a.acceleration.z;
    gx = g.gyro.x;
    gy = g.gyro.y;
    gz = g.gyro.z;

    float totalAccel = sqrt(ax * ax + ay * ay + az * az);
    float devFromGravity = abs(totalAccel - 9.81);

    // Free Fall Stage 1: Weightlessness (total accel < 3.5 m/s^2)
    if (totalAccel < 3.5 && !freeFallDetected) {
      freeFallDetected = true;
      freeFallStartTime = millis();
    }

    // Heavy Impact Stage 2: Free fall followed by hard landing within 1s (> 25 m/s^2)
    if (freeFallDetected && (millis() - freeFallStartTime < 1000)) {
      if (totalAccel > 25.0 && (millis() - lastFallAlertSent > 15000)) {
        lastFallAlertSent = millis();
        freeFallDetected = false;
        movementStatus = "Fall Detected";
        sendAlert("POSSIBLE_FALL", "CRITICAL", "Worker fall confirmed! Weightless free-fall followed by severe impact.");
      }
    } else if (millis() - freeFallStartTime >= 1000) {
      freeFallDetected = false;
    }

    // Standalone Sudden Impact (Falling rock or blunt trauma > 30 m/s^2)
    if (totalAccel > 32.0 && (millis() - lastFallAlertSent > 15000)) {
      lastFallAlertSent = millis();
      movementStatus = "Impact";
      sendAlert("SUDDEN_IMPACT", "HIGH", "Severe kinetic impact vector detected on helmet shell!");
    } else if (devFromGravity > 4.5) {
      movementStatus = "High Activity";
    } else if (devFromGravity > 1.2) {
      movementStatus = "Moving";
    }
  }

  // 3. Periodic Sensor Telemetry every 4 seconds
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) {
      temperature = 28.5;
      humidity = 55.0;
    }

    int mq2Raw   = analogRead(MQ2_PIN);
    int mq7Raw   = analogRead(MQ7_PIN);
    int mq135Raw = analogRead(MQ135_PIN);
    float mq7Ppm = calculateCoPpm(mq7Raw);

    Serial.printf("[TELEMETRY] Temp: %.1f C | Hum: %.1f %% | MQ2: %d | MQ7: %d (%.1f ppm) | Motion: %s\n",
                  temperature, humidity, mq2Raw, mq7Raw, mq7Ppm, movementStatus.c_str());

    // Gas Hazard Checks (Only fires if explicitly enabled and exceeds high threshold)
    if (ENABLE_AUTO_GAS_ALERTS && millis() > 120000 && millis() - lastHazardAlertTime > 60000) {
      if (mq7Ppm >= CO_CRITICAL_PPM_THRESHOLD) {
        lastHazardAlertTime = millis();
        sendAlert("CARBON_MONOXIDE", "CRITICAL", "High Carbon Monoxide concentration detected in Shaft 4B!");
      } else if (mq2Raw >= MQ2_CRITICAL_RAW_THRESHOLD) {
        lastHazardAlertTime = millis();
        sendAlert("HAZARDOUS_GAS", "HIGH", "High concentration of combustible gas/smoke detected by MQ-2!");
      }
    }

    // Push full telemetry payload to Supabase
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
    doc["mq3_raw"]         = mq2Raw; // MQ-2 Methane / Smoke
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
    } else {
      Serial.printf("[WARN] Telemetry push HTTP %d\n", httpCode);
    }
    http.end();
  }

  delay(20); // 50 Hz IMU polling loop
}
