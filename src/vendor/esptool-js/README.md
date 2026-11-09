Espressif `esptool-js` v0.6.1, based on the official `bundle.js` distribution from the npm package.
The bundle includes its browser dependencies. Source: https://github.com/espressif/esptool-js/tree/v0.6.1
License: Apache-2.0; see `LICENSE`. The small `bundle.d.ts` describes only the API used here.

Two ESP32-C5 compatibility fixes from Espressif's v0.7.0 release are applied to the bundle:
the C5 v1.2 ROM magic value `0x30e1706f`, and the C6-family SPI register base
`0x60003000` used by C5. These changes are limited to the values in the bundle.
See https://github.com/espressif/esptool-js/releases/tag/v0.7.0.

Kept locally so the static guide can build without a registry connection or a runtime CDN.
