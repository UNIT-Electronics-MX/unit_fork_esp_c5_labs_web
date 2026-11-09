// Intro 02: a GPIO9 breadboard LED controlled from the Arduino serial monitor.
#include <Arduino.h>

constexpr uint8_t LED_PIN = 9;
enum class Mode { Breathe, Blink, Sos, Level, On, Off };
Mode mode = Mode::Breathe;
uint16_t blinkMs = 200;
uint8_t level = 30;
uint32_t nextTick = 0;
uint8_t phase = 0;

void duty(uint8_t value) { ledcWrite(LED_PIN, value); }

void command(String line) {
  line.trim();
  line.toLowerCase();
  if (line.startsWith("blink ")) {
    blinkMs = constrain(line.substring(6).toInt(), 50L, 5000L);
    mode = Mode::Blink;
  } else if (line == "sos") mode = Mode::Sos;
  else if (line.startsWith("level ")) {
    level = constrain(line.substring(6).toInt(), 0L, 100L);
    mode = Mode::Level;
  } else if (line == "on") mode = Mode::On;
  else if (line == "off") mode = Mode::Off;
  else {
    Serial.println("Use: blink 200 | sos | level 30 | on | off");
    return;
  }
  phase = 0;
  nextTick = 0;
  Serial.printf("Mode: %s\n", line.c_str());
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(15);
  ledcAttach(LED_PIN, 1000, 8);
  duty(0);
  Serial.println("Intro 02 ready: blink 200 | sos | level 30 | on | off");
}

void loop() {
  if (Serial.available()) command(Serial.readStringUntil('\n'));
  const uint32_t now = millis();
  if (now < nextTick) return;

  switch (mode) {
    case Mode::Breathe: {
      const uint16_t t = now % 2000;
      duty(t < 1000 ? t * 255 / 1000 : (2000 - t) * 255 / 1000);
      nextTick = now + 20;
      break;
    }
    case Mode::Blink:
      duty((phase++ & 1) ? 0 : 255);
      nextTick = now + blinkMs;
      break;
    case Mode::Sos: {
      // Three short, three long, three short pulses; then a pause.
      constexpr uint8_t units[] = {1,1,1,1,1,3,3,1,3,1,3,3,1,1,1,1,1,7};
      duty((phase & 1) ? 0 : 255);
      nextTick = now + 150 * units[phase];
      phase = (phase + 1) % 18;
      break;
    }
    case Mode::Level:
      duty(level * 255 / 100);
      nextTick = now + 100;
      break;
    case Mode::On: duty(255); nextTick = now + 100; break;
    case Mode::Off: duty(0); nextTick = now + 100; break;
  }
}
