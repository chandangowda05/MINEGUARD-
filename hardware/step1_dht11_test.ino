/*
 * ============================================================================
 * MINEGUARD - STEP 1: DHT11 (Temperature & Humidity) + Supabase Live Test
 * ============================================================================
 * 
 * WIRING DIAGRAM:
 * ────────────────────────────────────────────────────────────────────────────
 *   DHT11 Pin                  ESP32 Pin
 *   ──────────                 ─────────
 *   VCC (+) / Pin 1      ───►  3.3V  (or VIN / 5V if using a 5V 3-pin breakout)
 *   DATA / OUT / Pin 2   ───►  GPIO 4
 *   NC / Pin 3           ───►  (Leave unconnected if 4-pin version)
 *   GND (-) / Pin 4      ───►  GND
 * ────────────────────────────────────────────────────────────────────────────
 *
 * REQUIRED ARDUINO LIBRARIES (Tools -> Manage Libraries...):
 *   1. "DHT sensor library" by Adafruit
 *   2. "Adafruit Unified Sensor" by Adafruit
 *   3. "ArduinoJson" by Benoit Blanchon (version 6.x or 7.x)
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ----------------------------------------------------------------------------
// 1. AUTO-CONFIGURED WIFI CREDENTIALS (FROM YOUR LAPTOP)
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "RH-2.4G-99FC50";
const char* WIFI_PASSWORD = "44953B99FC50";

// ----------------------------------------------------------------------------
// 2. SUPABASE CONFIGURATION (MINEGUARD LIVE DATABASE)
// ----------------------------------------------------------------------------
const char* SUPABASE_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_KEY = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

// Helmet and Worker UUIDs (from MINEGUARD seed data)
const char* HELMET_UUID  = "a1111111-1111-1111-1111-111111111111"; // HLMT-101
const char* WORKER_UUID  = "b1111111-1111-1111-1111-111111111111"; // Rajesh Sharma

// ----------------------------------------------------------------------------
// 3. HARDWARE PIN DEFINITION
// ----------------------------------------------------------------------------
#define DHT_PIN     4       // GPIO 4 connected to DHT11 Data Pin
#define DHT_TYPE    DHT11

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 3000; // Stream readings every 3 seconds

void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] CONNECTED SUCCESSFULLY!");
    Serial.print("[WiFi] Assigned ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection FAILED. Check if router is reachable.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("   MINEGUARD - STEP 1: DHT11 SENSOR INTEGRATION   ");
  Serial.println("==================================================");

  dht.begin();
  Serial.println("[OK] DHT11 initialized on GPIO 4.");

  connectWiFi();
}

void loop() {
  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  // Send readings every 3 seconds
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    // Check if reading failed
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[DHT11 ERROR] Failed to read from sensor!");
      Serial.println("   -> Check VCC connected to 3.3V (or 5V)");
      Serial.println("   -> Check GND connected to GND");
      Serial.println("   -> Check DATA connected to GPIO 4");
      return;
    }

    Serial.println("──────────────────────────────────────────────────");
    Serial.printf("[SENSOR READ] Temp: %.1f °C  |  Humidity: %.1f %%\n", temperature, humidity);

    // Send payload directly to Supabase REST API
    HTTPClient http;
    http.begin(SUPABASE_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Prefer", "return=minimal");

    // Construct JSON payload matching the Supabase sensor_readings table
    StaticJsonDocument<512> doc;
    doc["helmet_id"]       = HELMET_UUID;
    doc["temperature"]     = serialized(String(temperature, 1));
    doc["humidity"]        = serialized(String(humidity, 1));
    doc["mq3_raw"]         = 120.0;
    doc["mq7_raw"]         = 85.0;
    doc["mq7_ppm"]         = 0.0;
    doc["movement_status"] = "NORMAL";

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.print("[HTTP POST] Sending to Supabase: ");
    Serial.println(jsonString);

    int httpCode = http.POST(jsonString);

    if (httpCode == 201 || httpCode == 200 || httpCode == 204) {
      Serial.printf("[SUCCESS] Telemetry stored in Supabase! (HTTP %d)\n", httpCode);
      Serial.println("--> Check your live MINEGUARD dashboard now!");
    } else {
      Serial.printf("[ERROR] HTTP Request failed, code: %d\n", httpCode);
      String response = http.getString();
      Serial.println("Response: " + response);
    }

    http.end();
  }
}
