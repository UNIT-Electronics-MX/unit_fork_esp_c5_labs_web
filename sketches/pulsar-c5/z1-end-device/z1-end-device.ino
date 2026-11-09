// Z1 · Zigbee end device: counts once a second and reports the count to the coordinator,
// carried in the Temperature Measurement cluster. Ported from the ESP32-C6 course, Lab 6
// (based on Espressif's Zigbee temperature-sensor example, Apache-2.0).
// Tools: Zigbee Mode "Zigbee ED (end device)", Partition Scheme "Zigbee 8MB with spiffs".
#ifndef ZIGBEE_MODE_ED
#error "Select Tools > Zigbee Mode > Zigbee ED (end device)"
#endif

#include "Zigbee.h"

constexpr uint8_t COUNTER_ENDPOINT = 10;
constexpr uint8_t BOOT_BUTTON = 28;

ZigbeeTempSensor zbCounter(COUNTER_ENDPOINT);
static uint32_t counter = 0;

static void countTask(void*) {
  for (;;) {
    counter++;
    Serial.printf("counter %lu\n", (unsigned long)counter);
    zbCounter.setTemperature(static_cast<float>(counter));
    delay(1000);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BOOT_BUTTON, INPUT_PULLUP);

  zbCounter.setManufacturerAndModel("UNIT", "PulsarC5Counter");
  zbCounter.setMinMaxValue(0, 10000);
  zbCounter.setTolerance(1);
  Zigbee.addEndpoint(&zbCounter);

  if (!Zigbee.begin()) {
    Serial.println("Zigbee failed to start, rebooting");
    ESP.restart();
  }
  Serial.print("Joining the network");
  while (!Zigbee.connected()) {
    Serial.print('.');
    delay(100);
  }
  Serial.println();

  xTaskCreate(countTask, "count", 2048, nullptr, 10, nullptr);
  zbCounter.setReporting(1, 0, 1);  // report when the value changes by 1
}

void loop() {
  if (digitalRead(BOOT_BUTTON) == LOW) {
    const uint32_t start = millis();
    while (digitalRead(BOOT_BUTTON) == LOW) {
      delay(50);
      if (millis() - start > 3000) {
        Serial.println("Factory reset of the Zigbee stack");
        delay(1000);
        Zigbee.factoryReset();
      }
    }
    zbCounter.reportTemperature();  // a short press reports right away
  }
  delay(100);
}
