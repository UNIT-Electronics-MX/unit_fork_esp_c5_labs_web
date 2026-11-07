/** Page numbers refer to the bundled ESP32-C5 Series Datasheet v1.5. */
export const C5_PDF_URL = `${import.meta.env.BASE_URL}esp32-c5_datasheet_en.pdf`;
export const C5_OFFICIAL_URL = "https://www.espressif.com/documentation/esp32-c5_datasheet_en.pdf";
export const C5_HARDWARE_URL = "https://github.com/UNIT-Electronics-MX/unit_pulsar_esp32_c5";

export const pdfPage = (page: number) => `${C5_PDF_URL}#page=${page}`;

export const C5_SECTIONS = [
  { id: "overview", path: "/datasheet" },
  { id: "inside", path: "/datasheet/inside" },
  { id: "pins", path: "/datasheet/pins" },
  { id: "blocks", path: "/datasheet/blocks" },
  { id: "read", path: "/datasheet/read" },
] as const;

export type C5Section = (typeof C5_SECTIONS)[number]["id"];

export function sectionForPath(pathname: string): C5Section {
  if (pathname.startsWith("/datasheet/inside")) return "inside";
  if (pathname.startsWith("/datasheet/pins")) return "pins";
  if (pathname.startsWith("/datasheet/blocks")) return "blocks";
  if (pathname.startsWith("/datasheet/read")) return "read";
  return "overview";
}

export const C5_METRICS = [
  { id: "hp", value: "240 MHz", page: 4 },
  { id: "lp", value: "48 MHz", page: 4 },
  { id: "psram", value: "8 MiB", page: 14 },
  { id: "gpio", value: "29", page: 5 },
  { id: "adc", value: "6", page: 5 },
  { id: "radio", value: "2.4 + 5 GHz", page: 3 },
] as const;

export const C5_MEMORY = [
  { id: "rom", value: "320 KB", page: 4 },
  { id: "hpSram", value: "384 KB", page: 4 },
  { id: "lpSram", value: "16 KB", page: 4 },
  { id: "psram", value: "8 MiB", page: 14 },
] as const;

export const C5_BLOCK_GROUPS = [
  {
    id: "system",
    blocks: [
      { id: "hpCpu", page: 38 }, { id: "lpCpu", page: 39 }, { id: "gdma", page: 39 },
      { id: "cache", page: 42 }, { id: "etm", page: 44 }, { id: "timers", page: 45 },
    ],
  },
  {
    id: "interfaces",
    blocks: [
      { id: "uart", page: 55 }, { id: "spi", page: 55 }, { id: "i2c", page: 56 },
      { id: "i2s", page: 56 }, { id: "usb", page: 58 }, { id: "can", page: 58 },
      { id: "ledPwm", page: 59 }, { id: "pcnt", page: 59 }, { id: "mcpwm", page: 60 },
      { id: "rmt", page: 60 }, { id: "parlio", page: 61 }, { id: "sdio", page: 62 },
    ],
  },
  {
    id: "analog",
    blocks: [
      { id: "temperature", page: 63 }, { id: "adc", page: 63 }, { id: "comparator", page: 64 },
    ],
  },
  {
    id: "wireless",
    blocks: [
      { id: "wifi", page: 65 }, { id: "ble", page: 68 }, { id: "ieee802154", page: 69 },
    ],
  },
  {
    id: "security",
    blocks: [
      { id: "crypto", page: 48 }, { id: "secureBoot", page: 48 },
    ],
  },
] as const;

export const C5_CHAPTERS = [
  { id: "overview", page: 2 },
  { id: "variants", page: 14 },
  { id: "pins", page: 16 },
  { id: "boot", page: 33 },
  { id: "system", page: 38 },
  { id: "peripherals", page: 55 },
  { id: "radio", page: 65 },
  { id: "electrical", page: 70 },
  { id: "rf", page: 77 },
] as const;
