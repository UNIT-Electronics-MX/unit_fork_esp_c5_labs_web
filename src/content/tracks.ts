import type { TrackId } from "@/domain/lesson";
import type { BoardId, Track } from "@/domain/track";

// The table of contents, in the order a learner follows: the board first, then sensors and
// radios. Adding a theme = one entry here + a lessons file + one loader below.
// Lesson content itself is code-split per track and loaded on demand (see ./queries.ts).
export const TRACKS: readonly Track[] = [
  {
    id: "intro",
    title: "Intro",
    blurb: "Arduino and MicroPython: setup, hello, first circuit",
    color: "--ok",
    lessonIds: ["00", "01", "02"],
    board: "pulsar-c5",
  },
  {
    id: "pulsar",
    title: "On-board hardware",
    blurb: "Arduino and MicroPython experiments with BOOT, RGB, ADC, I²C sensors, microSD and UART",
    color: "--fam-system",
    lessonIds: ["P1", "P2", "P3", "P4", "P5", "P6"],
    board: "pulsar-c5",
  },
  {
    id: "display",
    title: "Display & input",
    blurb: "Pulsar C5 OLED and 80×160 ST7735 TFT",
    color: "--copper",
    lessonIds: ["O1", "O2", "O3"],
    board: "pulsar-c5",
  },
  {
    id: "sensors",
    title: "Sensors",
    blurb: "Temperature, air, motion over I2C",
    color: "--w-dc",
    lessonIds: ["D1", "D2", "D3"],
    board: "pulsar-c5",
  },
  {
    id: "ble",
    title: "Bluetooth LE",
    blurb: "Listen, pair, control, and send C5 touch notifications to a phone",
    color: "--ble",
    lessonIds: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "I2"],
  },
  {
    id: "wifi",
    title: "Wi-Fi",
    blurb: "Scan, join, serve pages, and send C5 sensor readings to the cloud",
    color: "--w-sda",
    lessonIds: ["W1", "W2", "W3", "I1", "W4", "W5"],
  },
  // RFID runs on the C5 in MicroPython; Sound still uses the older S3 labs.
  {
    id: "rfid",
    title: "RFID & NFC",
    blurb: "Cards, tags and the 13.56 MHz field",
    color: "--rfid",
    lessonIds: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
    board: "pulsar-c5",
  },
  {
    id: "sound",
    title: "Sound",
    blurb: "Hear, measure, clap, record, see pitch, play",
    color: "--sound",
    lessonIds: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
  },
  {
    id: "zigbee",
    title: "Zigbee",
    blurb: "An 802.15.4 network between two boards",
    color: "--part-teal",
    lessonIds: ["Z1"],
    board: "pulsar-c5",
  },
];

/**
 * Lessons offered in both Arduino and MicroPython: they follow the language picked in the top bar.
 * The top bar is drawn before any lesson file loads, so the list lives here; a content test keeps
 * it equal to the lessons whose variants are just those two (followsCodePlatform).
 */
export const LANGUAGE_LESSON_IDS: ReadonlySet<string> = new Set([
  "00", "01", "02",
  "P1", "P2", "P3", "P4", "P5", "P6",
  "O1",
  "D1", "D2", "D3",
  "I1", "I2",
  "W1", "W3",
  "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8",
]);

/** Lessons whose MicroPython variant already runs on the Pulsar C5 while the Arduino one is an S3 lab. */
const C5_MICROPYTHON_PORTS: ReadonlySet<string> = new Set(["W1", "W2", "W3", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"]);

export const DEFAULT_LESSON_ID = "00";

export const findTrack = (id: string) => TRACKS.find((t) => t.id === id);

/** The board a lesson (in that language variant) is wired on; the Wi-Fi and BLE tracks contain both boards. */
export const boardOfLesson = (lessonId: string, variantKey?: string): BoardId =>
  lessonId === "I1" || lessonId === "I2" || (variantKey === "micropython" && C5_MICROPYTHON_PORTS.has(lessonId))
    ? "pulsar-c5"
    : TRACKS.find((t) => t.lessonIds.includes(lessonId))?.board ?? "devkitc-s3";

/** The track a lesson id belongs to, or undefined for an unknown id. */
export const trackOfLesson = (lessonId: string): TrackId | undefined =>
  TRACKS.find((t) => t.lessonIds.includes(lessonId))?.id;
