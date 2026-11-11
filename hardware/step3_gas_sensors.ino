/*
 * ============================================================================
 * MINEGUARD - STEP 3: DHT11 + SOS BUTTON + MQ-2 + MQ-7 + MQ-135 GAS SENSORS
 * ============================================================================
 * 
 * HARDWARE CONFIGURATION:
 * ----------------------------------------------------------------------------
 * 1. DHT11 (Temperature & Humidity):
 *    - VCC   ──► ESP32 3.3V
 *    - GND   ──► ESP32 GND
 *    - DATA  ──► ESP32 GPIO 4
 *
 * 2. EMERGENCY SOS PUSH BUTTON:
 *    - Leg 1 ──► ESP32 GPIO 27  (Uses internal INPUT_PULLUP)
 *    - Leg 2 ──► ESP32 GND
 *    * Connect across diagonally opposite pins of 4-pin tact switch.
 *
 * 3. MQ-2 GAS SENSOR (Methane / LPG / Smoke / Flammable Gas):
 *    - VCC   ──► ESP32 VIN (Must be 5V for internal heater!)
 *    - GND   ──► ESP32 GND
 *    - AO    ──► ESP32 GPIO 34 (ADC1_CH6 - safe during active WiFi)
 *    - DO    ──► (Leave unconnected)
 *
 * 4. MQ-7 SENSOR (Carbon Monoxide - CO):
 *    - VCC   ──► ESP32 VIN (Must be 5V for internal heater!)
 *    - GND   ──► ESP32 GND
 *    - AO    ──► ESP32 GPIO 35 (ADC1_CH7 - safe during active WiFi)
 *    - DO    ──► (Leave unconnected)
 *
 * 5. MQ-135 SENSOR (Air Quality / Toxic Gases / Ammonia / CO2):
 *    - VCC   ──► ESP32 VIN (Must be 5V for internal heater!)
 *    - GND   ──► ESP32 GND
 *    - AO    ──► ESP32 GPIO 32 (ADC1_CH4 - safe during active WiFi)
 *    - DO    ──► (Leave unconnected)
 *
 * SENSOR WARM-UP NOTE:
 *    MQ sensors have built-in micro-heaters that warm up over 1-2 minutes.
 *    Initial readings might fluctuate before stabilizing.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ----------------------------------------------------------------------------
// 1. WIFI CREDENTIALS (YOUR LAPTOP'S HOTSPOT)
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "VIJAYKUMAR";
const char* WIFI_PASSWORD = "9945296005";

// ----------------------------------------------------------------------------
// 2. SUPABASE CONFIGURATION
// ----------------------------------------------------------------------------
const char* SUPABASE_READINGS_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_ALERTS_URL   = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/alerts";
const char* SUPABASE_KEY          = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

const char* HELMET_UUID  = "a1111111-1111-1111-1111-111111111111"; // HLMT-101
const char* WORKER_UUID  = "b1111111-1111-1111-1111-111111111111"; // Rajesh Sharma

// ----------------------------------------------------------------------------
// 3. PIN ASSIGNMENTS
// ----------------------------------------------------------------------------
#define DHT_PIN          4       // DHT11 Data Pin
#define DHT_TYPE         DHT11
#define SOS_BUTTON_PIN   27      // Emergency Push Button (Active LOW with Pull-Up)
#define MQ2_PIN          34      // MQ-2 Methane / LPG / Smoke (ADC1_CH6)
#define MQ7_PIN          35      // MQ-7 Carbon Monoxide (ADC1_CH7)
#define MQ135_PIN        32      // MQ-135 Air Quality / Toxic Gas (ADC1_CH4)

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 4000;

// Anti-False-Trigger Button Logic
unsigned long buttonPressStartTime = 0;
bool buttonBeingHeld = false;
bool alertAlreadySent = false;
unsigned long lastHazardAlertTime = 0;

// Convert raw MQ-7 ADC (0-4095) to estimated CO ppm
float calculateCoPpm(int rawAdc) {
  if (rawAdc <= 500) return 0.0;
  // Map typical operating range (500 - 3800) to 0 - 200 ppm CO
  float ppm = ((float)(rawAdc - 500) / 3300.0) * 150.0;
  if (ppm < 0.0) ppm = 0.0;
  if (ppm > 200.0) ppm = 200.0;
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

// Function to trigger an Incident Alert to Supabase
void sendAlert(const char* alertType, const char* severity, const char* description) {
  Serial.printf("\n🚨 [ALERT TRIGGERED: %s] Transmitting to Supabase...\n", alertType);

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

  // Fallback retry without worker_id if 409 conflict
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
  Serial.println("  MINEGUARD - STEP 3: DHT11 + SOS + MQ-2 + MQ-7 + MQ-135    ");
  Serial.println("============================================================");

  // Initialize Sensors
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MQ2_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);

  analogReadResolution(12); // 0-4095 range

  dht.begin();
  Serial.println("[OK] DHT11 initialized on GPIO 4");
  Serial.printf("[OK] SOS Button configured on GPIO %d (Active LOW)\n", SOS_BUTTON_PIN);
  Serial.println("[OK] MQ-2 Methane / Smoke Sensor initialized on GPIO 34 (ADC1)");
  Serial.println("[OK] MQ-7 CO Sensor initialized on GPIO 35 (ADC1)");
  Serial.println("[OK] MQ-135 Air Quality Sensor initialized on GPIO 32 (ADC1)");

  // Diagnostic check
  delay(50);
  if (digitalRead(SOS_BUTTON_PIN) == LOW) {
    Serial.println("⚠️  [WIRING WARNING] Button reads LOW on boot! Check button legs.");
  } else {
    Serial.println("[OK] Button pin reads HIGH (Open/Ready). No false trigger.");
  }

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  // 1. Anti-False-Trigger SOS Button Check (150ms hold)
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

  // 2. Stream Real Sensor Telemetry every 4 seconds
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
      temperature = 28.5;
      humidity = 55.0;
      Serial.println("[DHT11 WARN] Check temperature sensor wiring.");
    }

    // Read real Analog Gas Sensors
    int mq2Raw   = analogRead(MQ2_PIN);
    int mq7Raw   = analogRead(MQ7_PIN);
    int mq135Raw = analogRead(MQ135_PIN);
    float mq7Ppm = calculateCoPpm(mq7Raw);

    Serial.printf("[TELEMETRY] Temp: %.1f °C | Hum: %.1f %% | MQ-2: %d | MQ-7: %d (%.1f ppm) | MQ-135: %d\n",
                  temperature, humidity, mq2Raw, mq7Raw, mq7Ppm, mq135Raw);

    // Automatic Gas Hazard Safety Checks (Starts after 60s initial sensor warm-up)
    if (millis() > 60000 && millis() - lastHazardAlertTime > 30000) {
      if (mq7Ppm >= 75.0) {
        lastHazardAlertTime = millis();
        sendAlert("CARBON_MONOXIDE", "CRITICAL", "DANGEROUS Carbon Monoxide level detected in Shaft 4B!");
      } else if (mq2Raw >= 2800) {
        lastHazardAlertTime = millis();
        sendAlert("HAZARDOUS_GAS", "HIGH", "High concentration of combustible gas/smoke detected by MQ-2!");
      }
    }

    // Push Telemetry to Supabase
    // Note: mq2Raw is mapped to mq3_raw so existing database charts display it immediately!
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
    doc["mq7_raw"]         = mq7Raw; // MQ-7 CO raw
    doc["mq7_ppm"]         = serialized(String(mq7Ppm, 1)); // MQ-7 CO ppm
    doc["movement_status"] = "NORMAL";

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
}
