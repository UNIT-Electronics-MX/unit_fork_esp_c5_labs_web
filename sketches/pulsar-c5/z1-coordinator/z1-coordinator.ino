// Z1 · Zigbee coordinator: forms the network, binds the end device and prints the counts it
// reports. Ported from the ESP32-C6 course, Lab 6 (based on Espressif's Zigbee thermostat
// example, Apache-2.0).
// Tools: Zigbee Mode "Zigbee ZCZR (coordinator/router)", Partition Scheme "Zigbee ZCZR 8MB with spiffs".
#ifndef ZIGBEE_MODE_ZCZR
#error "Select Tools > Zigbee Mode > Zigbee ZCZR (coordinator/router)"
#endif

#include "Zigbee.h"

constexpr uint8_t THERMOSTAT_ENDPOINT = 1;
constexpr uint8_t BOOT_BUTTON = 28;

ZigbeeThermostat zbThermostat(THERMOSTAT_ENDPOINT);
float counter = 0;
float counterMin = 0;
float counterMax = 0;

void onCount(float value) {
  Serial.printf("count received: %.0f\n", value);
  counter = value;
}

void onConfig(float minValue, float maxValue, float) {
  Serial.printf("end device range: %.0f to %.0f\n", minValue, maxValue);
  counterMin = minValue;
  counterMax = maxValue;
}

void setup() {
  Serial.begin(115200);
  pinMode(BOOT_BUTTON, INPUT_PULLUP);

  zbThermostat.onTempReceive(onCount);
  zbThermostat.onConfigReceive(onConfig);
  zbThermostat.setManufacturerAndModel("UNIT", "PulsarC5Coordinator");
  Zigbee.addEndpoint(&zbThermostat);
  Zigbee.setRebootOpenNetwork(180);  // let devices join for 3 minutes after boot

  if (!Zigbee.begin(ZIGBEE_COORDINATOR)) {
    Serial.println("Zigbee failed to start, rebooting");
    ESP.restart();
  }
  Serial.print("Waiting for the end device to bind");
  while (!zbThermostat.bound()) {
    Serial.print('.');
    delay(500);
  }
  Serial.println("\nEnd device bound");
  zbThermostat.getSensorSettings();
}

void loop() {
  if (digitalRead(BOOT_BUTTON) == LOW) {  // BOOT: ask for a report on every change
    while (digitalRead(BOOT_BUTTON) == LOW) delay(50);
    Serial.println("Asking the end device to report every change");
    zbThermostat.setTemperatureReporting(0, 10, 1);
  }
  static uint32_t lastPrint = 0;
  if (millis() - lastPrint > 10000) {
    lastPrint = millis();
    Serial.printf("last count %.0f (range %.0f–%.0f)\n", counter, counterMin, counterMax);
  }
}
