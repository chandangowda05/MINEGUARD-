/*
 * ============================================================================
 * MINEGUARD - STEP 1: DHT11 (Temperature & Humidity) + Supabase Live Test
 * ============================================================================
 * 
 * WIRING:
 *   DHT11 Pin 1 (VCC / +)  --> ESP32 3.3V (or 5V / VIN depending on module)
 *   DHT11 Pin 2 (Data / OUT) --> ESP32 GPIO 4
 *   DHT11 Pin 3 (NC)        --> Not Connected (if 4-pin version)
 *   DHT11 Pin 4 (GND / -)  --> ESP32 GND
 *
 * REQUIRED ARDUINO LIBRARIES (Install via Arduino Library Manager):
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
// 1. YOUR WIFI CREDENTIALS (REPLACE WITH YOUR HOTSPOT / WIFI)
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_NAME";      // <-- Enter your WiFi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // <-- Enter your WiFi Password

// ----------------------------------------------------------------------------
// 2. SUPABASE CONFIGURATION
// ----------------------------------------------------------------------------
const char* SUPABASE_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_KEY = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

// Helmet and Worker UUIDs (from MINEGUARD database)
const char* HELMET_UUID  = "a1111111-1111-1111-1111-111111111111"; // HLMT-101
const char* WORKER_UUID  = "b1111111-1111-1111-1111-111111111111"; // Rajesh Sharma

// ----------------------------------------------------------------------------
// 3. HARDWARE PIN DEFINITION
// ----------------------------------------------------------------------------
#define DHT_PIN     4       // GPIO 4 connected to DHT11 Data Pin
#define DHT_TYPE    DHT11

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 4000; // Send telemetry every 4 seconds

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
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection FAILED. Check SSID & Password.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("  MINEGUARD - STEP 1: DHT11 SENSOR INTEGRATION   ");
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

  // Send readings every 4 seconds
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    // Check if reading failed
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[DHT11 ERROR] Failed to read from sensor! Check wiring (VCC, GND, GPIO 4).");
      return;
    }

    Serial.println("----------------------------------------");
    Serial.printf("[SENSOR READ] Temp: %.1f °C | Humidity: %.1f %%\n", temperature, humidity);

    // Send payload to Supabase
    HTTPClient http;
    http.begin(SUPABASE_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Prefer", "return=minimal");

    // Construct JSON payload
    StaticJsonDocument<512> doc;
    doc["helmet_id"]   = HELMET_UUID;
    doc["worker_id"]   = WORKER_UUID;
    doc["temperature"] = serialized(String(temperature, 1));
    doc["humidity"]    = serialized(String(humidity, 1));
    doc["mq3_raw"]     = 0;
    doc["mq7_raw"]     = 0;
    doc["co_ppm"]      = 0.0;
    doc["battery_level"] = 100;

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
