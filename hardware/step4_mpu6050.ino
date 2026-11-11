/*
 * ============================================================================
 * MINEGUARD - STEP 4: MPU-6050 (DIRECT REGISTER I2C DRIVER + AUTO-PROBE)
 * Combined with: DHT11 + SOS Button + MQ-2 + MQ-7 + MQ-135
 * ============================================================================
 * 
 * COMPLETE WIRING GUIDE:
 * ----------------------------------------------------------------------------
 * 1. MPU-6050 / GY-521:
 *    - VCC   ──► ESP32 VIN (5V)   <-- Connect to VIN (5V)
 *    - GND   ──► ESP32 GND
 *    - SCL   ──► ESP32 GPIO 22
 *    - SDA   ──► ESP32 GPIO 21
 *    - AD0   ──► Leave open OR connect to GND (address 0x68)
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
 *    - MQ-2 AO   ──► ESP32 GPIO 34 | VCC -> VIN (5V) | GND -> GND
 *    - MQ-7 AO   ──► ESP32 GPIO 35 | VCC -> VIN (5V) | GND -> GND
 *    - MQ-135 AO ──► ESP32 GPIO 32 | VCC -> VIN (5V) | GND -> GND
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
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

// MPU State
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
unsigned long lastHazardAlertTime = 0;

// High-Capacity Gas Alert Thresholds (Silenced during bench testing)
const bool ENABLE_AUTO_GAS_ALERTS = false;
const float CO_CRITICAL_PPM_THRESHOLD = 350.0;
const int MQ2_CRITICAL_RAW_THRESHOLD = 3600;

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

// ----------------------------------------------------------------------------
// FULL I2C BUS SCANNER (Runs on GPIO 21 & 22)
// ----------------------------------------------------------------------------
void scanI2CBus() {
  Serial.println("\n--- [I2C BUS SCANNER] (SDA=GPIO 21, SCL=GPIO 22) ---");
  byte count = 0;
  for (byte address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("  --> Device FOUND at address 0x%02X", address);
      if (address == 0x68) Serial.print(" [MPU-6050 Default]");
      else if (address == 0x69) Serial.print(" [MPU-6050 Alternate AD0=HIGH]");
      Serial.println();
      count++;
    }
  }
  if (count == 0) {
    Serial.println("  ❌ NO I2C DEVICES FOUND ON BUS!");
    Serial.println("     Action needed:");
    Serial.println("       1. Check if GY-521 RED POWER LED is ON.");
    Serial.println("       2. Check: VCC -> ESP32 VIN (5V), GND -> GND.");
    Serial.println("       3. Check: SDA -> GPIO 21, SCL -> GPIO 22.");
    Serial.println("       4. Check if header pins are soldered to the module.");
  } else {
    Serial.printf("  --> Total %d device(s) found.\n", count);
  }
  Serial.println("----------------------------------------------------\n");
}

// ----------------------------------------------------------------------------
// PROBE, WAKE UP AND CONFIGURE MPU-6050 DIRECTLY OVER I2C
// (Compatible with genuine InvenSense MPU-6050, MPU-6500, and all clones)
// ----------------------------------------------------------------------------
bool probeAndWakeMPU() {
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000); // 100kHz standard reliable I2C speed
  delay(10);

  // Probe address 0x68
  Wire.beginTransmission(0x68);
  byte err68 = Wire.endTransmission();

  // Probe address 0x69
  Wire.beginTransmission(0x69);
  byte err69 = Wire.endTransmission();

  if (err68 == 0) {
    detectedMpuAddress = 0x68;
  } else if (err69 == 0) {
    detectedMpuAddress = 0x69;
  } else {
    detectedMpuAddress = 0;
    Serial.printf("   [I2C Probe] 0x68 status: %d | 0x69 status: %d\n", err68, err69);
    if (err68 == 2 && err69 == 2) {
      Serial.println("   ❌ Reason: NACK (No chip response). Jumper wires have no electrical contact!");
    } else if (err68 == 5 || err69 == 5) {
      Serial.println("   ❌ Reason: Timeout (Bus locked or SDA/SCL shorted).");
    }
    mpuReady = false;
    return false;
  }

  // 1. Wake up the chip by clearing SLEEP bit (bit 6) in PWR_MGMT_1 (register 0x6B)
  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0x00); // Clear sleep bit, use internal 8MHz oscillator
  byte wakeErr = Wire.endTransmission();
  if (wakeErr != 0) {
    Serial.printf("   [WARN] Failed to write PWR_MGMT_1, error: %d\n", wakeErr);
    mpuReady = false;
    return false;
  }
  delay(15);

  // 2. Set Accelerometer Full Scale Range to ±8g (register 0x1C = 0x10)
  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x1C);
  Wire.write(0x10);
  Wire.endTransmission();

  // 3. Set Gyroscope Full Scale Range to ±500 deg/s (register 0x1B = 0x08)
  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x1B);
  Wire.write(0x08);
  Wire.endTransmission();

  // 4. Read WHO_AM_I register (0x75)
  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x75);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)detectedMpuAddress, (uint8_t)1);
  byte whoami = 0;
  if (Wire.available()) {
    whoami = Wire.read();
  }

  Serial.printf("✅ [OK] MPU-6050 linked at I2C 0x%02X! (WHO_AM_I: 0x%02X)\n", detectedMpuAddress, whoami);
  mpuReady = true;
  return true;
}

// ----------------------------------------------------------------------------
// READ REAL ACCELERATION & GYRO REGISTERS DIRECTLY
// ----------------------------------------------------------------------------
bool readMPUData(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  if (!mpuReady || detectedMpuAddress == 0) return false;

  Wire.beginTransmission(detectedMpuAddress);
  Wire.write(0x3B); // ACCEL_XOUT_H register
  byte err = Wire.endTransmission(false);
  if (err != 0) {
    mpuReady = false;
    return false;
  }

  Wire.requestFrom((uint8_t)detectedMpuAddress, (uint8_t)14, (uint8_t)true);
  if (Wire.available() < 14) {
    mpuReady = false;
    return false;
  }

  int16_t raw_ax = (Wire.read() << 8) | Wire.read();
  int16_t raw_ay = (Wire.read() << 8) | Wire.read();
  int16_t raw_az = (Wire.read() << 8) | Wire.read();
  int16_t raw_temp = (Wire.read() << 8) | Wire.read();
  int16_t raw_gx = (Wire.read() << 8) | Wire.read();
  int16_t raw_gy = (Wire.read() << 8) | Wire.read();
  int16_t raw_gz = (Wire.read() << 8) | Wire.read();

  // Scale for ±8g: 4096 LSB/g -> m/s^2
  ax = (raw_ax / 4096.0) * 9.80665;
  ay = (raw_ay / 4096.0) * 9.80665;
  az = (raw_az / 4096.0) * 9.80665;

  // Scale for ±500 deg/s: 65.5 LSB/(deg/s) -> rad/s
  gx = (raw_gx / 65.5) * (PI / 180.0);
  gy = (raw_gy / 65.5) * (PI / 180.0);
  gz = (raw_gz / 65.5) * (PI / 180.0);

  return true;
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
  Serial.println("  MINEGUARD - STEP 4: MPU-6050 DIRECT I2C + SENSORS         ");
  Serial.println("============================================================");

  // 1. Initialize Pin Modes
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

  // 3. Initialize I2C Bus & Scanner
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);
  scanI2CBus();

  // 4. Probe & Wake MPU
  if (!probeAndWakeMPU()) {
    Serial.println("⚠️  [WARN] MPU-6050 not ready on boot. Live auto-probe active in loop.");
  }

  // 5. Connect WiFi
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  // 0. Auto-Retry MPU-6050 connection every 3 seconds if not yet ready
  if (!mpuReady && (millis() - lastMpuRetry >= 3000)) {
    lastMpuRetry = millis();
    Serial.println("🔄 [IMU] Probing I2C bus for MPU-6050...");
    probeAndWakeMPU();
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

  // 2. Read Real MPU-6050 Data
  float ax = 0, ay = 0, az = 0;
  float gx = 0, gy = 0, gz = 0;
  String movementStatus = "Sensor Disconnected";

  if (mpuReady) {
    if (readMPUData(ax, ay, az, gx, gy, gz)) {
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

      // Standalone Sudden Impact (Falling rock or blunt trauma > 32 m/s^2)
      if (totalAccel > 32.0 && (millis() - lastFallAlertSent > 15000)) {
        lastFallAlertSent = millis();
        movementStatus = "Impact";
        sendAlert("SUDDEN_IMPACT", "HIGH", "Severe kinetic impact vector detected on helmet shell!");
      } else if (devFromGravity > 4.5) {
        movementStatus = "High Activity";
      } else if (devFromGravity > 1.2) {
        movementStatus = "Moving";
      } else {
        movementStatus = "Stationary";
      }
    } else {
      movementStatus = "Sensor Error";
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

    // Detailed Serial Monitor Log
    if (mpuReady) {
      Serial.printf("[TELEMETRY] Temp: %.1f C | Hum: %.1f %% | MQ2: %d | MQ7: %d (%.1f ppm) | Accel(m/s²): X=%.2f Y=%.2f Z=%.2f | Gyro: X=%.2f Y=%.2f Z=%.2f | Motion: %s\n",
                    temperature, humidity, mq2Raw, mq7Raw, mq7Ppm, ax, ay, az, gx, gy, gz, movementStatus.c_str());
    } else {
      Serial.printf("[TELEMETRY] Temp: %.1f C | Hum: %.1f %% | MQ2: %d | MQ7: %d (%.1f ppm) | ⚠️ MPU-6050 DISCONNECTED! (Check VCC->VIN, SDA=21, SCL=22)\n",
                    temperature, humidity, mq2Raw, mq7Raw, mq7Ppm);
    }

    // Gas Hazard Checks (Bench testing silenced)
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
