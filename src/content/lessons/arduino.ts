// Commands for the Pulsar C5 lessons: their sketches are Arduino sketches in sketches/pulsar-c5,
// built with arduino-cli for the "ESP32C5 Dev Module" (USB CDC On Boot, 8 MB flash, PSRAM).

const BOARD = "esp32:esp32:esp32c5:CDCOnBoot=cdc,PSRAM=enabled,FlashSize=8M";

/** Build options a sketch adds to the board's, e.g. a Zigbee partition scheme and mode. */
export type SketchOptions = `PartitionScheme=${string}`;

/** Compile, flash and open the serial monitor for one sketch. PORT is the board's port. */
export const arduinoCmd = (sketch: string, options: SketchOptions = "PartitionScheme=default_8MB") =>
  `arduino-cli compile -u -p PORT --fqbn ${BOARD},${options} sketches/pulsar-c5/${sketch} && arduino-cli monitor -p PORT -c baudrate=115200`;

export const ARDUINO_SETUP_CMD =
  "arduino-cli core install esp32:esp32 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json && arduino-cli board list";

export const PULSAR_STATUS = "ported from the C6 course, not flashed yet";
