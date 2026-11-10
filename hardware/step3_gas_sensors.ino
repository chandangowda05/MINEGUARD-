/*
 * ============================================================================
 * MINEGUARD - STEP 3: DHT11 + SOS BUTTON + MQ-3 + MQ-7 GAS SENSORS
 * ============================================================================
 * 
 * WIRING:
 *   1. DHT11:
 *      - VCC -> ESP32 3.3V, GND -> GND, DATA -> GPIO 4
 *
 *   2. SOS BUTTON:
 *      - Leg 1 -> GPIO 15, Leg 2 -> GND
 *
 *   3. MQ-3 GAS SENSOR (Alcohol / Flammable Gas):
 *      - VCC (5V) -> ESP32 VIN (Must be 5V for internal heater!)
 *      - GND      -> ESP32 GND
 *      - A0 (AO)  -> ESP32 GPIO 34 (Analog ADC input)
 *      - D0       -> (Leave unconnected)
 *
 *   4. MQ-7 CARBON MONOXIDE (CO) SENSOR:
 *      - VCC (5V) -> ESP32 VIN (Must be 5V for internal heater!)
 *      - GND      -> ESP32 GND
 *      - A0 (AO)  -> ESP32 GPIO 35 (Analog ADC input)
 *      - D0       -> (Leave unconnected)
 *
 * NOTE ON MQ SENSORS:
 *   MQ sensors take 2-3 minutes of warm-up time to produce stable readings
 *   because their internal micro-heaters need to reach operating temperature.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID     = "RH-2.4G-99FC50";
const char* WIFI_PASSWORD = "44953B99FC50";

const char* SUPABASE_READINGS_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_ALERTS_URL   = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/alerts";
const char* SUPABASE_KEY          = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

const char* HELMET_UUID  = "a1111111-1111-1111-1111-111111111111";
const char* WORKER_UUID  = "b1111111-1111-1111-1111-111111111111";

#define DHT_PIN          4
#define DHT_TYPE         DHT11
#define SOS_BUTTON_PIN   15
#define MQ3_PIN          34   // ADC1_CH6
#define MQ7_PIN          35   // ADC1_CH7

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 4000;
bool lastButtonReading = HIGH;
unsigned long lastDebounceTime = 0;

// Convert raw MQ-7 ADC (0-4095) to estimated CO ppm
float calculateCoPpm(int rawAdc) {
  if (rawAdc <= 50) return 0.0;
  // Scaled voltage ratio calculation for standard MQ-7 curve
  float voltage = (rawAdc / 4095.0) * 3.3;
  float ppm = pow(10, ((voltage * 1.5) - 0.5));
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
    Serial.println("\n[WiFi] CONNECTED!");
  }
}

void sendEmergencySosAlert() {
  HTTPClient http;
  http.begin(SUPABASE_ALERTS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  StaticJsonDocument<256> doc;
  doc["helmet_id"]   = HELMET_UUID;
  doc["worker_id"]   = WORKER_UUID;
  doc["alert_type"]  = "EMERGENCY_SOS";
  doc["severity"]    = "CRITICAL";
  doc["description"] = "Worker activated helmet SOS panic trigger!";
  doc["status"]      = "ACTIVE";

  String json;
  serializeJson(doc, json);
  http.POST(json);
  http.end();
  Serial.println("🚨 [SOS ALERT SENT!]");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("  MINEGUARD - STEP 3: GAS SENSORS + DHT + SOS    ");
  Serial.println("==================================================");

  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MQ3_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);

  dht.begin();
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  // SOS button check
  int reading = digitalRead(SOS_BUTTON_PIN);
  if (reading == LOW && lastButtonReading == HIGH && (millis() - lastDebounceTime) > 300) {
    lastDebounceTime = millis();
    sendEmergencySosAlert();
  }
  lastButtonReading = reading;

  // Periodic sensor telemetry
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    int mq3    = analogRead(MQ3_PIN);
    int mq7    = analogRead(MQ7_PIN);
    float coPpm = calculateCoPpm(mq7);

    if (isnan(temp)) temp = 25.0;
    if (isnan(hum)) hum = 50.0;

    Serial.printf("[TELEMETRY] Temp: %.1f C | Hum: %.1f %% | MQ3 Gas: %d | MQ7 CO: %d (%.1f ppm)\n",
                  temp, hum, mq3, mq7, coPpm);

    HTTPClient http;
    http.begin(SUPABASE_READINGS_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

    StaticJsonDocument<512> doc;
    doc["helmet_id"]     = HELMET_UUID;
    doc["worker_id"]     = WORKER_UUID;
    doc["temperature"]   = serialized(String(temp, 1));
    doc["humidity"]      = serialized(String(hum, 1));
    doc["mq3_raw"]       = mq3;
    doc["mq7_raw"]       = mq7;
    doc["co_ppm"]        = serialized(String(coPpm, 1));
    doc["battery_level"] = 100;

    String json;
    serializeJson(doc, json);
    int code = http.POST(json);
    if (code == 201 || code == 200 || code == 204) {
      Serial.println("[OK] Telemetry stored in Supabase.");
    } else {
      Serial.printf("[HTTP ERROR] %d\n", code);
    }
    http.end();
  }
}
