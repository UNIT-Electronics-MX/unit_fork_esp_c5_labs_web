// I2 · Bluetooth LE: a GATT server whose characteristic notifies a TTP223B touch pad's state.
// Ported from the ESP32-C6 course, Lab 5. Find "PulsarC5-BLE" in nRF Connect or LightBlue.
#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

const char* DEVICE_NAME = "PulsarC5-BLE";
const char* SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const char* TOUCH_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
constexpr uint8_t TOUCH_PIN = 5;  // A3

BLECharacteristic* touch = nullptr;
bool last = false;

void setup() {
  Serial.begin(115200);
  pinMode(TOUCH_PIN, INPUT);

  BLEDevice::init(DEVICE_NAME);
  BLEServer* server = BLEDevice::createServer();
  BLEService* service = server->createService(SERVICE_UUID);
  touch = service->createCharacteristic(
      TOUCH_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  touch->addDescriptor(new BLE2902());
  touch->setValue("released");
  service->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
  Serial.printf("Advertising as %s\n", DEVICE_NAME);
}

void loop() {
  const bool touched = digitalRead(TOUCH_PIN) == HIGH;
  if (touched != last) {  // notify on change only: less radio time
    last = touched;
    touch->setValue(touched ? "touched" : "released");
    touch->notify();
    Serial.println(touched ? "touched" : "released");
  }
  delay(20);
}
