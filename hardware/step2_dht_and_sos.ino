/*
 * ============================================================================
 * MINEGUARD - STEP 2: DHT11 + EMERGENCY SOS BUTTON + Supabase
 * ============================================================================
 * 
 * WIRING:
 *   1. DHT11 (From Step 1):
 *      - VCC   --> ESP32 3.3V
 *      - GND   --> ESP32 GND
 *      - DATA  --> ESP32 GPIO 4
 *
 *   2. EMERGENCY PUSH BUTTON (New in Step 2):
 *      - Pin 1 (One leg)    --> ESP32 GPIO 15
 *      - Pin 2 (Other leg)  --> ESP32 GND
 *      (Uses internal PULLUP resistor - NO external resistor needed!)
 *
 * HOW IT WORKS:
 *   - Continuous stream: Temperature and Humidity every 4 seconds.
 *   - Instant SOS trigger: When you press the button, it immediately sends
 *     a CRITICAL SOS alert to Supabase, triggering the red siren and audio
 *     alarm on the MINEGUARD dashboard!
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ----------------------------------------------------------------------------
// 1. WIFI CREDENTIALS (AUTO-DETECTED FROM YOUR LAPTOP)
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
#define SOS_BUTTON_PIN   15      // Emergency Push Button (Active LOW)

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 4000;

bool lastButtonReading = HIGH;
bool stableButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50;

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

// Function to trigger an Emergency SOS Alert to Supabase
void sendEmergencySosAlert() {
  Serial.println("\n🚨 [EMERGENCY SOS PRESSED!] Transmitting Critical Alert to Supabase...");

  HTTPClient http;
  http.begin(SUPABASE_ALERTS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<512> doc;
  doc["helmet_id"]   = HELMET_UUID;
  doc["worker_id"]   = WORKER_UUID;
  doc["alert_type"]  = "EMERGENCY_SOS";
  doc["severity"]    = "CRITICAL";
  doc["description"] = "Worker pressed physical helmet SOS emergency button in Shaft 4B!";
  doc["latitude"]    = 12.9716;   // Reference GPS coordinates
  doc["longitude"]   = 77.5946;
  doc["acknowledged"] = false;
  doc["resolved"]    = false;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.POST(jsonString);

  // Self-healing fallback: If 409 conflict occurs (e.g. foreign-key mismatch), retry without worker_id
  if (httpCode == 409) {
    Serial.println("[AUTO-RETRY] Retrying SOS alert without worker_id to bypass foreign-key check...");
    doc.remove("worker_id");
    jsonString = "";
    serializeJson(doc, jsonString);
    httpCode = http.POST(jsonString);
  }

  if (httpCode == 201 || httpCode == 200 || httpCode == 204) {
    Serial.printf("🚨 [CRITICAL ALERT POSTED] Supabase response code: %d\n", httpCode);
    Serial.println("--> Red Emergency Siren & Banner ACTIVE on MINEGUARD Dashboard!");
  } else {
    Serial.printf("[ERROR] Failed to post SOS alert, HTTP: %d\n", httpCode);
    String response = http.getString();
    if (response.length() > 0) {
      Serial.printf("[SERVER RESPONSE] %s\n", response.c_str());
    }
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("  MINEGUARD - STEP 2: DHT11 + SOS BUTTON TEST    ");
  Serial.println("==================================================");

  // Setup SOS push button with internal pullup
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  Serial.println("[OK] SOS Button configured on GPIO 15 (Active LOW with Pull-Up)");

  dht.begin();
  Serial.println("[OK] DHT11 initialized on GPIO 4");

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  // 1. Check SOS Button State (Instant Response with debounce)
  int reading = digitalRead(SOS_BUTTON_PIN);
  if (reading != lastButtonReading) {
    lastDebounceTime = millis();
  }
  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != stableButtonState) {
      stableButtonState = reading;
      // Active LOW: button pressed connects GPIO 15 to GND
      if (stableButtonState == LOW) {
        sendEmergencySosAlert();
      }
    }
  }
  lastButtonReading = reading;

  // 2. Stream Temperature & Humidity every 4 seconds
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[DHT11 WARN] Failed reading. Check wiring.");
      return;
    }

    Serial.printf("[TELEMETRY] Temp: %.1f °C | Humidity: %.1f %%\n", temperature, humidity);

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
    doc["mq3_raw"]         = 0.0;
    doc["mq7_raw"]         = 0.0;
    doc["mq7_ppm"]         = 0.0;
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
