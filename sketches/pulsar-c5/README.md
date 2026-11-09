# Pulsar C5 sketches

Arduino sketches for the Pulsar C5 lessons (tracks `intro`, `pulsar`, `sensors`, `iot` and `zigbee`),
ported from the UNIT DevLab ESP32-C6 course. Each folder is one sketch.

Board: **ESP32C5 Dev Module** from the Espressif core (`esp32:esp32` ≥ 3.3), with USB CDC On
Boot enabled, 8 MB flash and PSRAM enabled:

```sh
arduino-cli core install esp32:esp32 \
  --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
FQBN=esp32:esp32:esp32c5:CDCOnBoot=cdc,PSRAM=enabled,FlashSize=8M,PartitionScheme=default_8MB
arduino-cli compile -u -p <port> --fqbn "$FQBN" sketches/pulsar-c5/p1-blink
arduino-cli monitor -p <port> -c baudrate=115200
```

The Intro sequence keeps its Arduino path: `intro-hello` prints the chip information and
cycles the built-in RGB LED; `intro-led` drives an LED on GPIO9 (D4) and accepts `blink 200`,
`sos`, `level 30`, `on` and `off` over the serial monitor. The same three lessons have a
MicroPython editor and REPL in the browser.

The Zigbee pair needs a Zigbee partition scheme and mode:

- `z1-end-device`: `PartitionScheme=zigbee_8MB,ZigbeeMode=ed`
- `z1-coordinator`: `PartitionScheme=zigbee_zczr_8MB,ZigbeeMode=zczr`

Pin numbers follow the UNIT PULSAR ESP32-C5 Product Reference (hardware V1.2.3).
