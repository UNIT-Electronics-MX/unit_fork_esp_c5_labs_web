import type { TrackId } from "@/domain/lesson";
import type { BoardId, Track } from "@/domain/track";

// The table of contents. Adding a theme = one entry here + a lessons file + one loader below.
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
    blurb: "Pulsar C5 OLED, the 1.9″ screen and buttons",
    color: "--copper",
    lessonIds: ["O1", "03", "03b"],
  },
  {
    id: "wifi",
    title: "Wi-Fi",
    blurb: "Scan, join, serve pages, and send C5 sensor readings to the cloud",
    color: "--w-sda",
    lessonIds: ["W1", "W2", "W3", "I1", "W4", "W5"],
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
    id: "zigbee",
    title: "Zigbee",
    blurb: "An 802.15.4 network between two boards",
    color: "--part-teal",
    lessonIds: ["Z1"],
    board: "pulsar-c5",
  },
  {
    id: "ble",
    title: "Bluetooth LE",
    blurb: "Listen, pair, control, and send C5 touch notifications to a phone",
    color: "--ble",
    lessonIds: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "I2"],
  },
  // RFID and Sound come last: they are Arduino-only, with no MicroPython support yet.
  {
    id: "rfid",
    title: "RFID & NFC",
    blurb: "Cards, tags and the 13.56 MHz field",
    color: "--rfid",
    lessonIds: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
  },
  {
    id: "sound",
    title: "Sound",
    blurb: "Hear, measure, clap, record, see pitch, play",
    color: "--sound",
    lessonIds: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
  },
];

export const DEFAULT_LESSON_ID = "00";

export const findTrack = (id: string) => TRACKS.find((t) => t.id === id);

/** The board a lesson is wired on; the Wi-Fi and BLE tracks contain both boards. */
export const boardOfLesson = (lessonId: string): BoardId =>
  lessonId === "O1" || lessonId === "I1" || lessonId === "I2"
    ? "pulsar-c5"
    : TRACKS.find((t) => t.lessonIds.includes(lessonId))?.board ?? "devkitc-s3";

/** The track a lesson id belongs to, or undefined for an unknown id. */
export const trackOfLesson = (lessonId: string): TrackId | undefined =>
  TRACKS.find((t) => t.lessonIds.includes(lessonId))?.id;
