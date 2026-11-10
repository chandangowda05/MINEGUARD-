/*
 * ============================================================================
 * MINEGUARD - STEP 4: MPU-6050 (FALL DETECTION & IMPACT) INTEGRATION
 * ============================================================================
 * 
 * WIRING:
 *   MPU6050 Pin            ESP32 Pin
 *   ───────────            ─────────
 *   VCC             ───►   3.3V
 *   GND             ───►   GND
 *   SCL             ───►   GPIO 22 (Default Hardware I2C Clock)
 *   SDA             ───►   GPIO 21 (Default Hardware I2C Data)
 *   XDA / XCL / AD0 ───►   (Leave unconnected, default I2C addr 0x68)
 *   INT             ───►   (Optional, not required for polling mode)
 *
 * LIBRARIES NEEDED:
 *   - "Adafruit MPU6050" by Adafruit
 *   - "Adafruit Sensor" by Adafruit
 *   - "Adafruit BusIO" by Adafruit
 *
 * DETECTION LOGIC:
 *   - Total Acceleration Vector: a_total = sqrt(ax^2 + ay^2 + az^2)
 *   - Free Fall detection: a_total < 0.4 g (~3.9 m/s^2)
 *   - Sudden Impact detection: a_total > 2.8 g (~27 m/s^2)
 *   - Inactivity detection: no change in gyro/accel for configured window
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

const char* WIFI_SSID     = "RH-2.4G-99FC50";
const char* WIFI_PASSWORD = "44953B99FC50";

const char* SUPABASE_ALERTS_URL   = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/alerts";
const char* SUPABASE_KEY          = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

const char* HELMET_UUID  = "a1111111-1111-1111-1111-111111111111";
const char* WORKER_UUID  = "b1111111-1111-1111-1111-111111111111";

Adafruit_MPU6050 mpu;
bool mpuReady = false;

// Fall detection state machine
bool possibleFallStage1 = false;
unsigned long fallStartTime = 0;
unsigned long lastAlertSent = 0;

void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int r = 0;
  while (WiFi.status() != WL_CONNECTED && r < 25) {
    delay(500);
    Serial.print(".");
    r++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] CONNECTED!");
  }
}

void sendFallAlert(const char* alertType, const char* severity, const char* desc) {
  if (millis() - lastAlertSent < 10000) return; // Prevent alert spam (10s cooldown)
  lastAlertSent = millis();

  Serial.printf("\n🚨 [ALARM TRIGGERED] %s: %s\n", alertType, desc);

  HTTPClient http;
  http.begin(SUPABASE_ALERTS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  StaticJsonDocument<256> doc;
  doc["helmet_id"]   = HELMET_UUID;
  doc["worker_id"]   = WORKER_UUID;
  doc["alert_type"]  = alertType;
  doc["severity"]    = severity;
  doc["description"] = desc;
  doc["status"]      = "ACTIVE";

  String json;
  serializeJson(doc, json);
  int code = http.POST(json);
  Serial.printf("Supabase Alert response: %d\n", code);
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("  MINEGUARD - STEP 4: MPU-6050 IMU & FALL TEST   ");
  Serial.println("==================================================");

  Wire.begin(21, 22); // SDA = 21, SCL = 22

  if (!mpu.begin()) {
    Serial.println("[ERROR] Failed to find MPU6050 chip! Check SDA(21), SCL(22), VCC, GND.");
  } else {
    mpuReady = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[OK] MPU6050 initialized successfully!");
  }

  connectWiFi();
}

void loop() {
  if (!mpuReady) {
    delay(2000);
    return;
  }

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Magnitude of total acceleration in m/s^2 (Earth gravity ~ 9.8 m/s^2)
  float totalAccel = sqrt(a.acceleration.x * a.acceleration.x +
                          a.acceleration.y * a.acceleration.y +
                          a.acceleration.z * a.acceleration.z);

  // 1. Stage 1: Free Fall (Worker dropping, weightlessness < 3.5 m/s^2)
  if (totalAccel < 3.5 && !possibleFallStage1) {
    possibleFallStage1 = true;
    fallStartTime = millis();
    Serial.println("[IMU] Free-fall trajectory detected...");
  }

  // 2. Stage 2: Heavy Impact within 1 second of free-fall (> 25 m/s^2)
  if (possibleFallStage1 && (millis() - fallStartTime < 1000)) {
    if (totalAccel > 25.0) {
      sendFallAlert("WORKER_FALL", "CRITICAL", "Worker fall confirmed! Free fall followed by heavy impact.");
      possibleFallStage1 = false;
    }
  } else if (millis() - fallStartTime >= 1000) {
    possibleFallStage1 = false;
  }

  // 3. Standalone Sudden Impact (e.g. falling rock or heavy object hitting helmet)
  if (totalAccel > 35.0) {
    sendFallAlert("SUDDEN_IMPACT", "HIGH", "Severe kinetic impact detected on helmet shell!");
  }

  // Print IMU data once every 1 second
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 1000) {
    lastPrint = millis();
    Serial.printf("[IMU] Accel: X=%.2f Y=%.2f Z=%.2f | Total=%.2f m/s^2\n",
                  a.acceleration.x, a.acceleration.y, a.acceleration.z, totalAccel);
  }

  delay(20); // 50 Hz sampling rate
}
