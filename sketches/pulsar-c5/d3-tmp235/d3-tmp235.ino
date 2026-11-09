// D3 · Analog sensor: a TMP235 on A2 (GPIO4). Vout = 500 mV + 10 mV/°C, smoothed with an
// exponential filter. Ported from the ESP32-C6 course, Lab 3.
#include <Arduino.h>

constexpr uint8_t TMP235_PIN = 4;
constexpr float OFFSET_MV = 500.0f;
constexpr float MV_PER_C = 10.0f;
constexpr float ALPHA = 0.1f;

float filtered = NAN;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  Serial.println("mV\traw_C\tfiltered_C");
}

void loop() {
  const float mv = static_cast<float>(analogReadMilliVolts(TMP235_PIN));
  const float celsius = (mv - OFFSET_MV) / MV_PER_C;
  filtered = isnan(filtered) ? celsius : ALPHA * celsius + (1.0f - ALPHA) * filtered;
  Serial.printf("%.0f\t%.1f\t%.1f\n", mv, celsius, filtered);
  delay(500);
}
