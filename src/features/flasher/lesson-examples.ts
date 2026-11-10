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
  D1: ["imu-bmi270"],
  D2: ["oled-light"],
  O1: ["oled"],
  I1: ["wifi-thingspeak"],
  I2: ["ble-touch"],
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
