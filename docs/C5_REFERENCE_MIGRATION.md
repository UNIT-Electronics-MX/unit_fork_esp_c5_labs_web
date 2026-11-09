# Plan: migrate the chip reference from ESP32-S3 to ESP32-C5 (Pulsar C5)

The datasheet reader, the chip pages and the citation checks were built on `docs-llm/esp32-s3/ESP32-S3_REFERENCE.md`, a single Markdown file for the ESP32-S3-DevKitC-1 board and its chip. This plan replaces it with `docs-llm/esp32-c5/ESP32-C5_REFERENCE.md` for the UNIT PULSAR ESP32-C5 board and its ESP32-C5HR8 chip, then moves the app to the new file.

## Sources

| Part | Source | Version | Where it is kept |
| --- | --- | --- | --- |
| A, the board | UNIT PULSAR ESP32-C5 Product Reference (UNIT-Electronics-MX/unit_pulsar_esp32_c5, MIT) | 0.1.0, hardware V1.2.3 | cloned to `docs-llm/esp32-c5/sources/pulsar/` (local) |
| C, the chip | ESP32-C5 Series Datasheet | v1.5 | `public/esp32-c5_datasheet_en.pdf`, copied to `sources/` |
| T, the registers | ESP32-C5 Technical Reference Manual | v1.1, 1746 pages, 47 chapters | `sources/` (local) |

The Pulsar board carries the chip without a module, so the new reference has no Part M. Only the reference file and its `images/` are committed (see `.gitignore`). The source PDFs, the intermediate `parts/` and the conversion scripts in `scripts/` stay local.

## Format contract

The file keeps the S3 reference's shape, so `tools/reference/` parses it without changes:

- Numbered headings carry the section id: `A4.1`, `C2.3.5`, and bare numbers such as `32.4` for TRM chapters.
- Tables are pipe tables, titled by a bold line (`**Table 2-8. …**`) with their footnotes below.
- Figures are `![Figure N-M. …](images/…)` followed by an italic caption.
- Cross-references are anchor links. Links to Espressif documents are full URLs.
- When the sources disagree, the file keeps both values and names each source.

## Phases

| # | Phase | State |
| --- | --- | --- |
| 1 | Part A (board) and Part C (datasheet): 201 sections, 14 figures. Parsed by `buildReference` with no errors, and every anchor and image resolves | **done** |
| 2 | Part T, system chapters: 1–21 (CPU, memory, GPIO, clocks, boot, interrupts, ETM, low-power, timers, PMS) | to do |
| 3 | Part T, security chapters: 22–31 | to do |
| 4 | Part T, peripheral chapters: 32–47 (UART, SPI, I2C, I2S, PCNT, USB Serial/JTAG, CAN FD, SDIO, LEDC, MCPWM, RMT, PARLIO, BitScrambler, temperature sensor, ADC, comparator) and the appendices | to do |
| 5 | Point the app at the new file: `REFERENCE_FILE` default, `tools/chip/check-refs.ts`, the `OFFICIAL_DOCS` links in `features/reference/docs-map.ts`, and the reference-title catalogues | to do |
| 6 | Re-cite `src/content/chip/` against C5 section ids, rework the S3-only blocks (USB OTG, touch, LCD_CAM, SD/MMC, TWAI, ULP) for the C5's own blocks (CAN FD, PARLIO, BitScrambler, ETM, LP CPU, 802.15.4), then retire `docs-llm/esp32-s3/` | to do |

Phases 2–4 can ship chapter by chapter, because a missing TRM section only means that a citation falls back to Espressif's PDF. Phase 5 must wait until Part T covers every section the chip pages cite.

## Known source discrepancies (kept in the file)

- **VDD_SPI pin.** Datasheet §2.3.5 calls GPIO27 the VDD_SPI pin. Its pin tables put VDD_SPI on pin 29, which is GPIO19.
- **LP IO MUX column order.** Table 2-5 and the consolidated pin overview list the LP IO MUX functions in a different column order.
- **Table 3-7 (JTAG source).** Some rows of the merged-cell table overlap as printed.
- **Pulsar D2 and A6 nets.** The schematic labels differ from the header wiring. Part A follows the hardware (§A4.2, §A9.5).
