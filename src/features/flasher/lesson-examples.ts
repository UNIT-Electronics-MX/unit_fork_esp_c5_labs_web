/** The MicroPython examples each lesson opens, first one selected. Lessons not listed show the full example list. */
const LESSON_EXAMPLES: Readonly<Record<string, readonly string[]>> = {
  S0: ["ics43434-j20", "ics43434-usb-audio"],
  "01": ["neopixel"],
  "02": ["external-led"],
  P1: ["gpio"],
  P2: ["rgb-mixer"],
  P3: ["adc"],
  // The scanner first, then one script per on-board sensor in address order.
  P4: ["i2c-scan", "p4-sensor-stream", "mmc5603-compass", "max17048-battery", "fht40-temp-humidity", "lps22hb-pressure", "vcnl4040-light-prox"],
  P5: ["microsd"],
  P6: ["uart-loopback"],
  D1: ["imu-bmi270", "imu-bmi270-motion", "imu-bmi270-cube"],
  D2: ["oled-light"],
  D3: ["tmp235-temperature"],
  O1: ["oled"],
  O2: ["st7735-display"],
  O3: ["st7735-showcase"],
  I1: ["wifi-thingspeak"],
  W1: ["wifi-w1-scan"],
  W2: ["wifi-w2-display", "wifi-w2-basic", "wifi-w2-phone"],
  W3: ["wifi-w3-basic", "wifi-w3-oracle"],
  I2: ["ble-touch"],
  B1: ["ble-b1-listen"],
  B2: ["ble-b2-beacon"],
  B3: ["ble-b3-gatt"],
  B4: ["ble-b4-pair"],
  B5: ["ble-b5-app"],
  B6: ["ble-b6-keyboard"],
  B7: ["ble-b7-midi"],
  B8: ["ble-b8-host"],
  R1: ["rfid-r1-pn532"],
  R2: ["rfid-r2-pn532"],
  R3: ["rfid-r3-pn532"],
  R4: ["rfid-r4-pn532"],
  R5: ["rfid-r5-pn532"],
  R6: ["rfid-r6-pn532"],
  R7: ["rfid-r7-pn532"],
  R8: ["rfid-r8-pn532"],
};

export const lessonExamples = (lessonId: string): readonly string[] => LESSON_EXAMPLES[lessonId] ?? [];

/** Lessons whose workbench shows the live IMU cube beside the terminal (bmi270_cube.py). */
const IMU_CUBE_LESSONS: ReadonlySet<string> = new Set(["D1"]);

export const showsImuCube = (lessonId: string): boolean => IMU_CUBE_LESSONS.has(lessonId);

/** The examples named by `ids`, in that order; ids the manifest lacks are skipped. */
export function pickExamples<T extends { readonly id: string }>(examples: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(examples.map((example) => [example.id, example]));
  return ids.flatMap((id) => {
    const example = byId.get(id);
    return example ? [example] : [];
  });
}
