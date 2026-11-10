# Plan: migrate the Wi-Fi (W) and Bluetooth LE (B) tracks from ESP32-S3 to Pulsar C5

The W1–W3 and B1–B8 lessons still target the ESP32-S3-DevKitC-1. Each one is a PlatformIO project in `esp-labs/labs/{wifi,ble}-lab-*`, built on the shared kit (`kit/include/pins.h` and `kit/lib/{bench,wifi-kit,ble-kit}`, about 9.7k lines of C++). The C5 examples I1 and I2 now appear in the Wi-Fi and Bluetooth LE tracks: each lesson has an Arduino sketch and a MicroPython script. This plan moves the remaining labs to the UNIT Pulsar C5, so the S3 firmware can be retired.

## What changes between the boards

| Resource | S3 kit (`pins.h`) | Pulsar C5 | Effect |
| --- | --- | --- | --- |
| TFT ST7789 SCLK / MOSI / CS | 12 / 11 / 10 | 27 (D13/SCK) / 7 (D11/MOSI) / 10 (D10/SS) | Uses the board's own SPI pads. GPIO27 is a strapping pin and also drives the D13 LED, so it is safe as a clock but not as an input |
| TFT DC / RST / BL | 9 / 8 / 7 | 9 (D4) / 24 (D6) / 25 (D7) | GPIO8 is not on the C5 header, and GPIO11/12 are TX0/RX0 |
| External button | 5 | 5 (A3) | Same number, different pad. It conflicts with the TTP223B in I2 |
| BOOT button | 0 | 28 (D3) | GPIO0 on the C5 is the NeoPixel data line (D2) |
| RGB LED | 48, `rgbLedWrite` | NeoPixel on 0 | `rgbLedWrite(0, …)` works in Arduino-ESP32 3.x. Check this on hardware |
| microSD CS | — | 23 (D5) | Shares SPI with the TFT, on its own CS |
| Radio | 2.4 GHz Wi-Fi 4, BLE 5 | Dual-band Wi-Fi 6 (2.4 + 5 GHz), BLE 5, 802.15.4 | W1 and W2 can teach channels and bands. B-labs keep the same GAP/GATT concepts |
| USB | OTG + Serial/JTAG | Serial/JTAG only | No change: B6 is a BLE HID device, not USB HID |
| PSRAM / flash | 8 MB / 16 MB | 8 MB / 16 MB (C5HR8) | Same budget for W3's TLS buffers |

The new pin map is a proposal. It must be checked against `PULSAR_HEADER` in `src/domain/pulsar.ts` and on a real board before any lab moves.

## Toolchain

- Add a `[env:pulsar-c5]` base in `common.ini` with the pioarduino C5 board (Arduino-ESP32 ≥ 3.3, which first shipped C5 support). Keep the S3 base until the last lab has moved.
- Move pin choice into `kit/include/pins.h` behind `#if CONFIG_IDF_TARGET_ESP32C5`, so kit code stays the same for both boards.
- **To verify first:** NimBLE-Arduino 2.5.x on the C5 (B1–B8 depend on it), ESPAsyncWebServer and AsyncTCP on RISC-V (W2), and TLS with `WiFiClientSecure` (W3).

## Per-lab plan

Effort: S = pins and config only, M = some code or content changes, L = new behaviour or a rewrite. MicroPython: whether a script variant like I1/I2 is worth adding.

| Lab | What it does | C5 work | Effort | MicroPython |
| --- | --- | --- | --- | --- |
| W1 Scan & join | Scan, join, status view, ping | Pin map. Show the band (2.4/5 GHz) in the scan table and status view | S | Yes: `network.WLAN.scan()` + join (reuse `thingspeak_dht.py`'s `join()`) |
| W2 Phone control | Async web server, WebSocket, AP set-up, OTA, relay | Pin map, async libs on C5, OTA partition table for the C5 | M | Partial: a small `socket` web page only. No WebSocket or OTA |
| W3 Internet & AI | HTTPS client, API token, AI call | Pin map, TLS certificate bundle on C5 | M | Yes: `requests` HTTPS GET, without the AI streaming |
| B1 Listen | Scanner + ad table | Pin map | S | Yes: `gap_scan` + the same ad decoding |
| B2 Be seen | Advertiser, TX power | Pin map. Check the TX power steps on the C5 | S | Yes: `gap_advertise` (as in `ble_touch.py`) |
| B3 Connect & talk | GATT bench service | Pin map. LED characteristic → NeoPixel | S | Yes: extends `ble_touch.py` |
| B4 Pair & trust | Security, bonds, allow-list | Pin map. Re-test each IO capability | M | No: MicroPython pairing support depends on the build |
| B5 Phone app | Web Bluetooth app → drawing, MTU 247 | Pin map. The app needs no change (same UUIDs) | S | Possible later |
| B6 Keyboard & media | NimBLE HID device | Pin map. Re-test on iOS, macOS and Android | M | No |
| B7 Music | BLE-MIDI, key pads | GPIO13/14 are USB D−/D+ on the C5: move the key pads to free pins (9, 24, 25 if the TFT moves to the OLED, or A1/A2/A6) | M | No |
| B8 Host | NimBLE central, HID host, layouts | Pin map. Check that the client role and passkey injection work | L | No |
| W4, W5 | Bonus, no firmware | Content review only (band and channel facts) | S | — |

## Phases

| # | Phase | State |
| --- | --- | --- |
| 1 | I1/I2 MicroPython variants in the Wi-Fi and Bluetooth LE tracks | **done** |
| 2 | Decide the screen (see Open questions). Add the C5 board env and `pins.h` branch. Port W1 and B1 as pilots and run both on hardware | to do |
| 3 | B2, B3, B5 (S effort), then W2, W3 | to do |
| 4 | B4, B6, B7, B8 (pairing and HID, real-device tests) | to do |
| 5 | Web app: lesson `pins` arrays → C5 header positions, `cmd` → C5 envs, MicroPython variants (code-route `FIRST_EXAMPLE`, `LessonCodeGuide` FOCUS and guide keys, es overlay), D2 = GPIO0 notes | to do, per lab, together with phases 2–4 |
| 6 | Retire the S3 env, the S3 rows of `pins.h` and `docs/legacy-s3-bench` | to do |

Each lab ships on its own: firmware, lesson data and translations together, then `pnpm check`, `pnpm build` and a browser check at desktop and 390 px.

## Open questions

1. **Screen.** Keep the 1.9" ST7789 on the SPI pads above, or move every lab to the Qwiic SSD1306 OLED that O1 already uses? The OLED frees five pads and needs no soldering, but the 128×64 views in `ble_views.h`, `bench_views.h` and `wifi-kit/views.h` would have to be redrawn.
2. **Button.** Keep GPIO5 (A3) and the BOOT button (GPIO28), or use only BOOT, so A3 stays free for the touch sensor from I2?
3. **MicroPython scope.** The table above suggests scripts for W1, W3, B1–B3. Does the course want a MicroPython variant for every lab, or only where the language can do the same thing?
