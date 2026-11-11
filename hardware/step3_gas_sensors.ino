/*
 * ============================================================================
 * MINEGUARD - STEP 3: DHT11 + SOS BUTTON + MQ-3 + MQ-7 GAS SENSORS
 * ============================================================================
 * 
 * COMPLETE WIRING GUIDE:
 * ----------------------------------------------------------------------------
 * 1. DHT11 (Temperature & Humidity):
 *    - VCC   ──► ESP32 3.3V
 *    - GND   ──► ESP32 GND
 *    - DATA  ──► ESP32 GPIO 4
 *
 * 2. EMERGENCY SOS PUSH BUTTON:
 *    - Leg 1 ──► ESP32 GPIO 27  (Uses internal INPUT_PULLUP)
 *    - Leg 2 ──► ESP32 GND
 *    * Use two diagonally opposite legs of a 4-pin switch.
 *
 * 3. MQ-3 GAS SENSOR (Alcohol / Methane / Flammable Gas):
 *    - VCC   ──► ESP32 VIN (Must be 5V for internal heater coil!)
 *    - GND   ──► ESP32 GND
 *    - AO    ──► ESP32 GPIO 34 (Analog ADC1_CH6 - safe during WiFi)
 *    - DO    ──► (Leave unconnected)
 *
 * 4. MQ-7 CARBON MONOXIDE (CO) SENSOR:
 *    - VCC   ──► ESP32 VIN (Must be 5V for internal heater coil!)
 *    - GND   ──► ESP32 GND
 *    - AO    ──► ESP32 GPIO 35 (Analog ADC1_CH7 - safe during WiFi)
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
#define MQ3_PIN          34      // MQ-3 Analog Output (ADC1)
#define MQ7_PIN          35      // MQ-7 Analog Output (ADC1)

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 4000;

// Anti-False-Trigger Button Logic
unsigned long buttonPressStartTime = 0;
bool buttonBeingHeld = false;
bool alertAlreadySent = false;

// Cooldown for automatic environmental hazard alerts (30 seconds)
unsigned long lastHazardAlertTime = 0;

// Convert raw MQ-7 ADC (0-4095) to estimated CO ppm
float calculateCoPpm(int rawAdc) {
  if (rawAdc <= 100) return 0.0;
  float voltage = (rawAdc / 4095.0) * 3.3;
  // Approximation curve for MQ-7 sensitivity characteristics
  float ppm = pow(10, ((voltage * 1.5) - 0.4));
  if (ppm < 0) ppm = 0;
  if (ppm > 500) ppm = 500;
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
  Serial.printf("\n🚨 [INCIDENT DETECTED: %s] Transmitting to Supabase...\n", alertType);

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

  // Fallback retry without worker_id if foreign-key issue occurs
  if (httpCode == 409) {
    doc.remove("worker_id");
    jsonString = "";
    serializeJson(doc, jsonString);
    httpCode = http.POST(jsonString);
  }

  if (httpCode == 201 || httpCode == 200 || httpCode == 204) {
    Serial.printf("🚨 [ALERT POSTED] %s dispatched successfully (HTTP %d)\n", alertType, httpCode);
  } else {
    Serial.printf("[ERROR] Failed to post alert, HTTP: %d\n", httpCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("  MINEGUARD - STEP 3: DHT11 + SOS + MQ-3 + MQ-7 TEST    ");
  Serial.println("========================================================");

  // Initialize Sensors
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MQ3_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);

  // Configure ADC resolution
  analogReadResolution(12); // 0 to 4095

  dht.begin();
  Serial.println("[OK] DHT11 initialized on GPIO 4");
  Serial.printf("[OK] SOS Button configured on GPIO %d (Active LOW)\n", SOS_BUTTON_PIN);
  Serial.println("[OK] MQ-3 Gas Sensor initialized on GPIO 34 (ADC1)");
  Serial.println("[OK] MQ-7 CO Sensor initialized on GPIO 35 (ADC1)");

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

  // 1. Anti-False-Trigger SOS Button Check (150ms continuous press)
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
      temperature = 28.5; // Fallback only if wire detached
      humidity = 55.0;
      Serial.println("[DHT11 WARN] Check temperature sensor wiring.");
    }

    // Read real Analog Gas Sensor values
    int mq3Raw = analogRead(MQ3_PIN);
    int mq7Raw = analogRead(MQ7_PIN);
    float mq7Ppm = calculateCoPpm(mq7Raw);

    Serial.printf("[TELEMETRY] Temp: %.1f °C | Humidity: %.1f %% | MQ-3 Gas: %d | MQ-7 CO: %d (%.1f ppm)\n",
                  temperature, humidity, mq3Raw, mq7Raw, mq7Ppm);

    // Automatic Gas Hazard Safety Checks
    if (millis() - lastHazardAlertTime > 30000) {
      if (mq7Ppm >= 100.0) {
        lastHazardAlertTime = millis();
        sendAlert("CARBON_MONOXIDE", "CRITICAL", "DANGEROUS Carbon Monoxide level detected in Shaft 4B!");
      } else if (mq3Raw >= 2800) {
        lastHazardAlertTime = millis();
        sendAlert("HAZARDOUS_GAS", "HIGH", "High concentration of combustible gas detected!");
      }
    }

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
    doc["mq3_raw"]         = mq3Raw;
    doc["mq7_raw"]         = mq7Raw;
    doc["mq7_ppm"]         = serialized(String(mq7Ppm, 1));
    doc["movement_status"] = "NORMAL";

    String jsonString;
    serializeJson(doc, jsonString);

    int httpCode = http.POST(jsonString);
    if (httpCode == 201 || httpCode == 200 || httpCode == 204) {
      Serial.println("[OK] Telemetry pushed to Supabase.");
    } else {
      Serial.printf("[WARN] Telemetry push HTTP %d\n", httpCode);
    }
    http.end();
  }
}
