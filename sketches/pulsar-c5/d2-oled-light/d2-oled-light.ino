// D2 · OLED + light: an SSD1306 OLED and a TEMT6000 (DevLab DDP) on the QWIIC bus, plotting
// ambient light. Ported from the ESP32-C6 course, Lab 2. Libraries: Adafruit SSD1306,
// Adafruit GFX Library, DevLabDDP.
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DevLabDDP.h>

constexpr uint8_t SDA_PIN = 1U;  // QWIIC SDA on the Pulsar C5
constexpr uint8_t SCL_PIN = 6U;  // QWIIC SCL on the Pulsar C5
constexpr uint32_t I2C_FREQUENCY = 400000U;

constexpr uint8_t OLED_ADDRESS = 0x3C;
constexpr uint8_t TEMT6000_ADDRESS = 0x20;
constexpr uint16_t ADC_MAX = 4095U;
constexpr uint32_t SAMPLE_INTERVAL_MS = 50U;

constexpr int16_t SCREEN_WIDTH = 128;
constexpr int16_t SCREEN_HEIGHT = 64;
constexpr int8_t OLED_RESET = -1;

constexpr int16_t GRAPH_X = 0;
constexpr int16_t GRAPH_Y = 19;
constexpr int16_t GRAPH_WIDTH = 128;
constexpr int16_t GRAPH_HEIGHT = 45;
constexpr int16_t PLOT_LEFT = 1;
constexpr int16_t PLOT_TOP = 20;
constexpr int16_t PLOT_BOTTOM = 62;
constexpr size_t HISTORY_LENGTH = 126;

Adafruit_SSD1306 display(
    SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DevLabDDP::Master temt6000(
    Wire, DevLabDDP::DEVICE_TEMT6000);

uint16_t history[HISTORY_LENGTH] = {};
size_t historyCount = 0;
size_t writeIndex = 0;
bool sensorReady = false;
uint32_t nextSampleMs = 0U;

void addSample(uint16_t value) {
  history[writeIndex] = value;
  writeIndex = (writeIndex + 1U) % HISTORY_LENGTH;

  if (historyCount < HISTORY_LENGTH) {
    historyCount++;
  }
}

uint16_t sampleAt(size_t position) {
  const size_t oldest =
      (historyCount == HISTORY_LENGTH) ? writeIndex : 0U;
  return history[(oldest + position) % HISTORY_LENGTH];
}

int16_t sampleToY(uint16_t value) {
  return static_cast<int16_t>(map(
      value, 0, ADC_MAX, PLOT_BOTTOM, PLOT_TOP));
}

void drawGraph(uint16_t currentValue) {
  const uint8_t percent = static_cast<uint8_t>(
      (static_cast<uint32_t>(currentValue) * 100U) / ADC_MAX);

  display.clearDisplay();
  display.setCursor(0, 0);
  display.print(F("TEMT6000 0x20"));
  display.setCursor(0, 9);
  display.print(F("ADC:"));
  display.print(currentValue);
  display.print(' ');
  display.print(percent);
  display.print('%');

  display.drawRect(
      GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT, SSD1306_WHITE);

  // Dotted guide at 50 % of the ADC scale.
  const int16_t middleY = sampleToY(ADC_MAX / 2U);
  for (int16_t x = PLOT_LEFT; x < SCREEN_WIDTH - 1; x += 4) {
    display.drawPixel(x, middleY, SSD1306_WHITE);
  }

  if (historyCount == 1U) {
    display.drawPixel(
        SCREEN_WIDTH - 2, sampleToY(sampleAt(0)), SSD1306_WHITE);
  } else if (historyCount > 1U) {
    const int16_t xOffset = static_cast<int16_t>(
        HISTORY_LENGTH - historyCount);

    for (size_t i = 1; i < historyCount; i++) {
      const int16_t x0 = PLOT_LEFT + xOffset +
                         static_cast<int16_t>(i - 1U);
      const int16_t x1 = x0 + 1;
      display.drawLine(
          x0,
          sampleToY(sampleAt(i - 1U)),
          x1,
          sampleToY(sampleAt(i)),
          SSD1306_WHITE);
    }
  }

  display.display();
}

void showSensorError() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(F("TEMT6000"));
  display.println(F("Not found"));
  display.println(F("Check address 0x20"));
  display.display();
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(I2C_FREQUENCY);

  // The bus is already started on the Pulsar C5 QWIIC pins.
  if (!display.begin(
          SSD1306_SWITCHCAPVCC, OLED_ADDRESS, true, false)) {
    Serial.println(F("ERROR: no SSD1306 OLED at 0x3C"));
    for (;;) {
      delay(10);
    }
  }

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  DevLabDDP::DeviceInfo info;
  sensorReady = temt6000.matchesExpectedDevice(
      TEMT6000_ADDRESS, &info);

  if (!sensorReady) {
    Serial.println(
        F("ERROR: 0x20 is not a TEMT6000 DDP (ID 0x0102)"));
    showSensorError();
    return;
  }

  DevLabDDP::printDeviceInfo(
      Serial,
      TEMT6000_ADDRESS,
      info,
      DevLabDDP::DEVICE_TEMT6000);
  Serial.println(F("adc0_raw"));
}

void loop() {
  if (!sensorReady) {
    delay(1000);
    return;
  }

  const uint32_t now = millis();
  if (static_cast<int32_t>(now - nextSampleMs) < 0) {
    delay(1);
    return;
  }

  // Keep a steady sample period even when reading or drawing takes a few ms.
  nextSampleMs += SAMPLE_INTERVAL_MS;
  if (static_cast<int32_t>(now - nextSampleMs) >= 0) {
    nextSampleMs = now + SAMPLE_INTERVAL_MS;
  }

  uint16_t raw;
  if (temt6000.readAdc(TEMT6000_ADDRESS, 0, raw)) {
    addSample(raw);
    drawGraph(raw);
    Serial.println(raw);
  } else {
    Serial.println(F("ERR"));
  }
}
