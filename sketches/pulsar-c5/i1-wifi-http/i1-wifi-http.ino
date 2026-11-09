// I1 · Wi-Fi: join a 2.4 or 5 GHz network and post DHT11 readings to ThingSpeak over HTTP.
// Ported from the ESP32-C6 course, Lab 4. Library: DHT sensor library (Adafruit).
#include <Arduino.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";
const char* THINGSPEAK_API_KEY = "YOUR_WRITE_API_KEY";

constexpr uint8_t DHT_PIN = 4;  // A2
constexpr uint32_t PERIOD_MS = 20000;  // ThingSpeak's free tier accepts one update every 15 s

DHT dht(DHT_PIN, DHT11);

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Joining Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.printf("\nIP %s, channel %d (%s), RSSI %d dBm\n", WiFi.localIP().toString().c_str(),
                WiFi.channel(), WiFi.channel() > 14 ? "5 GHz" : "2.4 GHz", WiFi.RSSI());
}

void loop() {
  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature();
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT11 read failed");
    delay(2000);
    return;
  }
  if (WiFi.status() == WL_CONNECTED) {
    String url = "http://api.thingspeak.com/update?api_key=";
    url += THINGSPEAK_API_KEY;
    url += "&field1=" + String(temperature, 1);
    url += "&field2=" + String(humidity, 1);
    HTTPClient http;
    http.begin(url);
    const int status = http.GET();
    Serial.printf("%.1f °C %.0f %%  → HTTP %d\n", temperature, humidity, status);
    http.end();
  }
  delay(PERIOD_MS);
}
