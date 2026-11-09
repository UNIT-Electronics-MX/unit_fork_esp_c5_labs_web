// D1 · I2C on QWIIC: scan the QWIIC bus (GPIO1 SDA, GPIO6 SCL) and read the BMI270 chip ID.
// The QWIIC connector has no pull-ups on the Pulsar C5: the sensor board must provide them.
#include <Arduino.h>
#include <Wire.h>

constexpr uint8_t SDA_PIN = 1;
constexpr uint8_t SCL_PIN = 6;
constexpr uint8_t BMI270_ADDRESSES[] = {0x68, 0x69};
constexpr uint8_t CHIP_ID_REG = 0x00;
constexpr uint8_t BMI270_CHIP_ID = 0x24;

bool readRegister(uint8_t address, uint8_t reg, uint8_t& value) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(address, static_cast<uint8_t>(1)) != 1) return false;
  value = Wire.read();
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(SDA_PIN, SCL_PIN, 100000);

  for (uint8_t address = 0x08; address < 0x78; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) Serial.printf("found 0x%02X\n", address);
  }

  for (uint8_t address : BMI270_ADDRESSES) {
    uint8_t id = 0;
    if (readRegister(address, CHIP_ID_REG, id)) {
      Serial.printf("0x%02X chip ID 0x%02X %s\n", address, id, id == BMI270_CHIP_ID ? "(BMI270)" : "(not a BMI270)");
      return;
    }
  }
  Serial.println("No BMI270 at 0x68 or 0x69: check the QWIIC cable and the pull-ups");
}

void loop() {}
