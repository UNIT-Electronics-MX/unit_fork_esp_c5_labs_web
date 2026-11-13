/** Curated UNIT links for the bench view. No prices or stock are stored here. */
export const MATERIAL_PRODUCTS = {
  potentiometer: { url: "https://uelectronics.com/producto/potenciometro-3-pines-15mm-wh148/", link: "shop" },
  microsd: { url: "https://uelectronics.com/producto/memoria-micro-sd-kingston-16-64-gb-clase-10/", link: "shop" },
  ch340e: { url: "https://uelectronics.com/producto/unit-ch340e-modulo-usb-a-ttl/", link: "shop" },
  qwiicCable: { url: "https://uelectronics.com/producto/arnes-qwiic-4-pines-pitch-1mm/", link: "shop" },
  oled: { url: "https://uelectronics.com/producto/display-oled-azul-y-blanco-128x64-0-96-i2c-ssd1306/", link: "shop" },
  qwiicExpander: { url: "https://uelectronics.com/producto/unit-expansor-i2c-con-bus-qwiic/", link: "shop" },
  st7735: { url: "https://uelectronics.com/producto/tft-display-lcd-0-96-spi-hd-65k-colores-st7735/", link: "shop" },
  bmi270: { url: "https://uelectronics.com/producto/bmi270-sensor-inercial-imu-6dof-i2c-spi-unit-devlab/", link: "shop" },
  temt600: {
    url: "https://uelectronics.com/producto/temt600-sensor-de-luz-ambiental-unit-devlab/",
    docsUrl: "https://wiki.uelectronics.com/wiki/unit_devlab_temt6000_ambient_light_sensor",
    link: "shop",
  },
  pn532: { url: "https://uelectronics.com/producto/pn532-modulo-rfid-nfc-lectura-y-escritura-v3/", link: "shop" },
  rfidCard: { url: "https://uelectronics.com/producto/tarjeta-rfid-13-56-mhz/", link: "shop" },
  rfidFob: { url: "https://uelectronics.com/producto/llavero-tag-rfid-13-56-mhz-nfc/", link: "shop" },
  inmp441: { url: "https://uelectronics.com/producto/inmp441-modulo-de-microfono-omnidireccional-i2s/", link: "shop" },
  sph0645: { url: "https://uelectronics.com/producto/sph0645-microfono-digital-i2s-mems/", link: "shop" },
  ics43434: {
    url: "https://wiki.uelectronics.com/wiki/devlab-i2s-ics-43434-mems-microphone",
    editorUrl: "/lessons/S0/code",
    link: "docs",
  },
  max98357: { url: "https://uelectronics.com/producto/max98357-amplificador-de-audio-mono-i2s-clase-d-3w/", link: "shop" },
  speaker: { url: "https://uelectronics.com/producto/bocinas-4-y-8-ohm/", link: "shop" },
  es8311: {
    url: "https://wiki.uelectronics.com/wiki/unit_devlab_i2s_es8311_codec_with_amplifier_module",
    editorUrl: "/lessons/S0B/code",
    link: "docs",
  },
} as const;

export type MaterialProductId = keyof typeof MATERIAL_PRODUCTS;
export type MaterialRole = "main" | "extra" | "adapt";
export interface MaterialSuggestion {
  readonly product: MaterialProductId;
  readonly role: MaterialRole;
}

const main = (product: MaterialProductId): MaterialSuggestion => ({ product, role: "main" });
const extra = (product: MaterialProductId): MaterialSuggestion => ({ product, role: "extra" });

const RFID_TAGS = [extra("rfidCard"), extra("rfidFob")] as const;
const RFID_LAB = [main("pn532"), ...RFID_TAGS] as const;

/** One recommendation list per lesson; optional accessories never count as a kit requirement. */
export const LESSON_MATERIALS: Readonly<Record<string, readonly MaterialSuggestion[]>> = {
  P3: [main("potentiometer")],
  P5: [main("microsd")],
  P6: [extra("ch340e")],
  O1: [main("oled"), extra("qwiicExpander"), extra("qwiicCable")],
  O2: [main("st7735")],
  O3: [main("st7735")],
  D1: [main("bmi270"), extra("qwiicCable")],
  D2: [main("oled"), main("temt600"), extra("qwiicExpander"), extra("qwiicCable")],
  R1: [main("pn532"), extra("qwiicExpander"), extra("qwiicCable")],
  R2: RFID_LAB,
  R3: RFID_LAB,
  R4: RFID_LAB,
  R5: RFID_LAB,
  R6: RFID_LAB,
  R7: RFID_LAB,
  R8: RFID_LAB,
  S0: [main("ics43434")],
  S0B: [main("es8311")],
  S2: [main("es8311")],
  S3: [main("es8311")],
  S4: [main("es8311")],
  S5: [main("es8311")],
  S6: [main("es8311")],
  S8: [main("es8311")],
};

export const lessonMaterials = (id: string): readonly MaterialSuggestion[] => LESSON_MATERIALS[id] ?? [];
