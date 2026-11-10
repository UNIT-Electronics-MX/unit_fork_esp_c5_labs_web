// Intro 01: identify the Pulsar C5 and cycle its on-board RGB LED.
#include <Arduino.h>

constexpr uint8_t RGB_PIN = 0;  // D2/RGB pad: the WS2812 data line.
constexpr uint8_t BRIGHTNESS = 40;

void wheel(uint8_t pos, uint8_t& r, uint8_t& g, uint8_t& b) {
  if (pos < 85) { r = 255 - pos * 3; g = pos * 3; b = 0; }
  else if (pos < 170) { pos -= 85; r = 0; g = 255 - pos * 3; b = pos * 3; }
  else { pos -= 170; r = pos * 3; g = 0; b = 255 - pos * 3; }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.printf("Chip: %s\n", ESP.getChipModel());
  Serial.printf("Flash: %u bytes\n", ESP.getFlashChipSize());
  Serial.printf("PSRAM: %u bytes\n", ESP.getPsramSize());
  Serial.println("Intro 01 ready: RGB colour wheel");
}

void loop() {
  static uint8_t hue = 0;
  uint8_t r, g, b;
  wheel(hue++, r, g, b);
  rgbLedWrite(RGB_PIN, r * BRIGHTNESS / 255, g * BRIGHTNESS / 255, b * BRIGHTNESS / 255);
  delay(20);
}
