/** The MicroPython examples each lesson opens, first one selected. Lessons not listed show the full example list. */
const LESSON_EXAMPLES: Readonly<Record<string, readonly string[]>> = {
  "01": ["neopixel"],
  "02": ["external-led"],
  P1: ["gpio"],
  P2: ["rgb-mixer"],
  P3: ["adc"],
  // The scanner first, then one script per on-board sensor in address order.
  P4: ["i2c-scan", "mmc5603-compass", "max17048-battery", "fht40-temp-humidity", "lps22hb-pressure", "vcnl4040-light-prox"],
  P5: ["microsd"],
  P6: ["uart-loopback"],
  D1: ["imu-bmi270", "imu-bmi270-motion"],
  D2: ["oled-light"],
  D3: ["tmp235-temperature"],
  O1: ["oled"],
  O2: ["st7735-display"],
  O3: ["st7735-showcase"],
  I1: ["wifi-thingspeak"],
  I2: ["ble-touch"],
  B1: ["ble-b1-listen"],
  B2: ["ble-b2-beacon"],
  B3: ["ble-b3-gatt"],
  B4: ["ble-b4-pair"],
  B5: ["ble-b5-app"],
  B6: ["ble-b6-keyboard"],
  B7: ["ble-b7-midi"],
  B8: ["ble-b8-host"],
};

export const lessonExamples = (lessonId: string): readonly string[] => LESSON_EXAMPLES[lessonId] ?? [];

/** The examples named by `ids`, in that order; ids the manifest lacks are skipped. */
export function pickExamples<T extends { readonly id: string }>(examples: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(examples.map((example) => [example.id, example]));
  return ids.flatMap((id) => {
    const example = byId.get(id);
    return example ? [example] : [];
  });
}
