import type { LessonKit } from "@/domain/kit";
import type { PartName } from "@/ui/parts/registry";

// The parts on the bench beyond the board and its USB-C cable, and what each lesson needs from
// them (from the lessons' wiring and steps). The kit finder on the labs map reads both; each
// part's name lives in the "home" catalogue (kit.items.<id>), and the content test checks every
// open lesson is listed here.

export const KIT_ITEMS = [
  { id: "led", part: "led" },
  { id: "button", part: "button" },
  { id: "pot", part: "knob" },
  { id: "microsd", part: "memory" },
  { id: "wifi", part: "router" },
  { id: "phone", part: "phone-ble" },
  { id: "bmi270", part: "sensor" },
  { id: "dht11", part: "sensor" },
  { id: "temt6000", part: "sensor" },
  { id: "oled", part: "tft" },
  { id: "ttp223", part: "button" },
  { id: "tft", part: "tft" },
  { id: "st7735", part: "tft" },
  { id: "tmp235", part: "sensor" },
  { id: "keyboard", part: "keyboard" },
  // Parts only the RFID and Sound themes use.
  { id: "pn532", part: "reader" },
  { id: "tags", part: "cards" },
  { id: "ky037", part: "sensor" },
  { id: "inmp441", part: "mic" },
  { id: "ics43434", part: "mic" },
  { id: "es8311", part: "speaker" },
  { id: "amp", part: "speaker" },
] as const satisfies readonly { id: string; part: PartName }[];

export type KitItemId = (typeof KIT_ITEMS)[number]["id"];

const SCREEN = ["tft"] as const;
const READER = [["pn532"], ["tags"]] as const;

export const LESSON_KIT: Readonly<Record<string, LessonKit<KitItemId>>> = {
  "00": { need: [] },
  "01": { need: [] },
  "02": { need: [["led"]] },
  P1: { need: [] },
  P2: { need: [] },
  P3: { need: [["pot"]] },
  P4: { need: [] },
  P5: { need: [["microsd"]] },
  P6: { need: [] },
  O1: { need: [["oled"]] },
  O2: { need: [["st7735"]] },
  O3: { need: [["st7735"]] },
  D1: { need: [["bmi270"]] },
  D2: { need: [["oled"], ["temt6000"]] },
  D3: { need: [["tmp235"]] },
  I1: { need: [["wifi"], ["dht11"]] },
  I2: { need: [["phone"], ["ttp223"]] },
  W1: { need: [SCREEN, ["wifi"]], optional: ["button"] },
  W2: { need: [SCREEN, ["wifi"], ["phone"]], optional: ["button"] },
  W3: { need: [SCREEN, ["wifi"]], optional: ["button"] },
  R1: { need: [["pn532"]], optional: ["tags"] },
  R2: { need: READER },
  R3: { need: READER },
  R4: { need: READER },
  R5: { need: READER },
  R6: { need: READER },
  R7: { need: READER },
  R8: { need: READER },
  B1: { need: [SCREEN, ["phone"]], optional: ["button"] },
  B2: { need: [SCREEN, ["phone"]], optional: ["button"] },
  B3: { need: [SCREEN, ["phone"]], optional: ["button"] },
  B4: { need: [SCREEN, ["phone"]], optional: ["button"] },
  B5: { need: [SCREEN, ["phone"]], optional: ["button"] },
  B6: { need: [SCREEN, ["phone"]], optional: ["button"] },
  B7: { need: [SCREEN], optional: ["button", "phone"] },
  B8: { need: [SCREEN, ["keyboard"]], optional: ["button"] },
  S0: { need: [["ics43434"]] },
  S0B: { need: [["es8311"]] },
  S2: { need: [["es8311"]] },
  S3: { need: [["es8311"]] },
  S4: { need: [["es8311"]] },
  S5: { need: [["es8311"]] },
  S6: { need: [["es8311"]] },
  S8: { need: [["es8311"]] },
};

const NOTHING: LessonKit<KitItemId> = { need: [] };

/** A lesson's kit; a lesson missing from the list needs only the board. */
export const lessonKit = (id: string): LessonKit<KitItemId> => LESSON_KIT[id] ?? NOTHING;
