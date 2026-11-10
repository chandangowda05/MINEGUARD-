/*
 * ============================================================================
 * MINEGUARD - STEP 5: NEO-6M GPS MODULE INTEGRATION
 * ============================================================================
 * 
 * WIRING:
 *   NEO-6M GPS Pin         ESP32 Pin
 *   ──────────────         ─────────
 *   VCC             ───►   3.3V (or 5V / VIN)
 *   GND             ───►   GND
 *   TX (Transmit)   ───►   GPIO 16 (ESP32 HardwareSerial 2 RX)
 *   RX (Receive)    ───►   GPIO 17 (ESP32 HardwareSerial 2 TX)
 *
 * REQUIRED LIBRARY:
 *   - "TinyGPSPlus" by Mikal Hart (Install via Arduino Library Manager)
 *
 * NOTE ABOUT GPS SATELLITE FIX:
 *   - GPS signals cannot penetrate thick concrete roofs or basements.
 *   - Test near an open window or outdoors.
 *   - The small LED on the NEO-6M module will start BLINKING once a 3D
 *     satellite fix is acquired (usually 1-3 minutes on cold start).
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// 1. AUTO-CONFIGURED WIFI CREDENTIALS
const char* WIFI_SSID     = "RH-2.4G-99FC50";
const char* WIFI_PASSWORD = "44953B99FC50";

// 2. SUPABASE CONFIGURATION
const char* SUPABASE_LOCATIONS_URL = "https://nfmziyqvklujuauostug.supabase.co/rest/v1/worker_locations";
const char* SUPABASE_KEY           = "sb_publishable_gljiKHnXWIDfaIiChuyA1A_9YYqJLUM";

const char* WORKER_UUID = "b1111111-1111-1111-1111-111111111111"; // Rajesh Sharma
const char* HELMET_UUID = "a1111111-1111-1111-1111-111111111111"; // HLMT-101

// 3. GPS UART PINS
#define GPS_RX_PIN  16   // ESP32 RX2 connects to GPS TX
#define GPS_TX_PIN  17   // ESP32 TX2 connects to GPS RX
#define GPS_BAUD    9600 // Standard NEO-6M baud rate

TinyGPSPlus gps;
HardwareSerial gpsSerial(2); // UART2

unsigned long lastUpload = 0;
const unsigned long UPLOAD_INTERVAL = 5000; // Upload location every 5 seconds

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
  } else {
    Serial.println("\n[WiFi] Connection failed.");
  }
}

void uploadLocationToSupabase(double lat, double lng, float speed, int satellites) {
  HTTPClient http;
  http.begin(SUPABASE_LOCATIONS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<512> doc;
  doc["worker_id"] = WORKER_UUID;
  doc["helmet_id"] = HELMET_UUID;
  doc["latitude"]  = serialized(String(lat, 6));
  doc["longitude"] = serialized(String(lng, 6));
  doc["gps_valid"] = true;

  String json;
  serializeJson(doc, json);

  Serial.print("[GPS -> SUPABASE] Uploading: ");
  Serial.println(json);

  int code = http.POST(json);
  if (code == 201 || code == 200 || code == 204) {
    Serial.printf("[SUCCESS] Location updated on Leaflet Live Map! (HTTP %d)\n", code);
  } else {
    Serial.printf("[ERROR] Failed to post location, HTTP: %d\n", code);
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("    MINEGUARD - STEP 5: NEO-6M GPS INTEGRATION    ");
  Serial.println("==================================================");

  // Initialize GPS UART2
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[OK] GPS UART started on RX=GPIO 16, TX=GPIO 17 @ 9600 baud.");

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  // Feed incoming NMEA stream to TinyGPSPlus parser
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // Check and push position periodically
  if (millis() - lastUpload >= UPLOAD_INTERVAL) {
    lastUpload = millis();

    Serial.println("──────────────────────────────────────────────────");
    Serial.printf("[GPS STATUS] Sentences Parsed: %u | Chksum Failures: %u\n",
                  gps.passedChecksum(), gps.failedChecksum());

    if (gps.location.isValid()) {
      double lat = gps.location.lat();
      double lng = gps.location.lng();
      float speed = gps.speed.kmph();
      int sats = gps.satellites.value();

      Serial.printf("[3D FIX ACQUIRED!] Lat: %.6f | Lng: %.6f | Sats: %d | Speed: %.1f km/h\n",
                    lat, lng, sats, speed);

      uploadLocationToSupabase(lat, lng, speed, sats);
    } else {
      Serial.println("[WAITING FOR SATELLITES] Searching for GPS fix...");
      Serial.println("   -> Ensure antenna has a clear view of the sky (near window or outdoor).");
      Serial.printf("   -> Satellites currently in tracking view: %d\n", gps.satellites.value());
    }
  }
}

