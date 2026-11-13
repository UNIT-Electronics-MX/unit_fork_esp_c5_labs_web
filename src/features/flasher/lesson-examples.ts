/** The MicroPython examples each lesson opens, first one selected. Lessons not listed show the full example list. */
const LESSON_EXAMPLES: Readonly<Record<string, readonly string[]>> = {
  S0: ["ics43434-j20", "ics43434-usb-audio"],
  S0B: ["es8311-mic-capture", "es8311-mic-usb-audio", "es8311-melody", "es8311-tone-lab", "es8311-play-serial", "es8311-mic-diagnose"],
  S2: ["es8311-sound-loudness"],
  S3: ["es8311-sound-clap"],
  S4: ["es8311-sound-recorder"],
  S5: ["es8311-sound-spectrum"],
  S6: ["es8311-sound-game"],
  S8: ["es8311-sound-voice-fx"],
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

/** Examples that stream the browser-audio protocol (RAW/AU frames), so the listening dialog applies. */
const WEB_AUDIO_EXAMPLES: ReadonlySet<string> = new Set(["ics43434-usb-audio", "es8311-mic-usb-audio"]);

export const streamsWebAudio = (exampleId: string): boolean => WEB_AUDIO_EXAMPLES.has(exampleId);

export const SOUND_LAB_MODES = {
  "es8311-sound-loudness": "loudness",
  "es8311-sound-clap": "clap",
  "es8311-sound-recorder": "recorder",
  "es8311-sound-spectrum": "spectrum",
  "es8311-sound-game": "game",
  "es8311-sound-voice-fx": "voice_fx",
} as const;

export type SoundLabMode = (typeof SOUND_LAB_MODES)[keyof typeof SOUND_LAB_MODES];

export function isSoundLabMode(value: string): value is SoundLabMode {
  return Object.values(SOUND_LAB_MODES).some((mode) => mode === value);
}

export function soundLabMode(exampleId: string): SoundLabMode | null {
  return Object.prototype.hasOwnProperty.call(SOUND_LAB_MODES, exampleId)
    ? SOUND_LAB_MODES[exampleId as keyof typeof SOUND_LAB_MODES]
    : null;
}

export const lessonExamples = (lessonId: string): readonly string[] => LESSON_EXAMPLES[lessonId] ?? [];

/** Only the MicroPython workspace belonging to the selected exercise is open. */
export function canOpenLessonCode(lesson: {
  readonly id: string;
  readonly variantKey?: string;
  readonly variants?: readonly { readonly key: string }[];
}): boolean {
  if (lesson.id === "00") return lesson.variantKey === "micropython";
  return lessonExamples(lesson.id).length > 0
    && (!lesson.variants?.length || lesson.variantKey === "micropython");
}

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
