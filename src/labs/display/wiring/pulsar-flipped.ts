// The Pulsar C5 drawn as it lies on the bench in the wiring examples: turned 180°, USB-C at the
// bottom and QWIIC at the top. Positions come from the board's Gerbers (header holes at 1.27 and
// 16.51 mm, 2.54 mm pitch, first row 3.81 mm from the USB edge), in mm, before scaling.
import { PULSAR_HEADER, type PulsarPosition, type PulsarUse, pulsarRow } from "@/domain/pulsar";

export const BOARD_W_MM = 17.78;
export const BOARD_H_MM = 43.18;
const COLUMN_MM = { L: 1.27, R: 16.51 } as const;
const FIRST_ROW_MM = 3.81;
const PITCH_MM = 2.54;

/** A point on the board, in mm from its top-left corner as drawn (QWIIC edge up). */
export interface BoardPoint {
  readonly x: number;
  readonly y: number;
}

/** Turns a point given in the board's own frame (USB edge at y = 0) by 180°. */
export const flip = (x: number, y: number): BoardPoint => ({ x: BOARD_W_MM - x, y: BOARD_H_MM - y });

export interface FlippedPad {
  readonly position: number;
  readonly pad: PulsarPosition;
  readonly at: BoardPoint;
  /** Which edge of the drawing the pad sits on, after the turn. */
  readonly edge: "left" | "right";
}

/** Every header pad where it appears in the turned drawing. */
export const FLIPPED_PADS: readonly FlippedPad[] = PULSAR_HEADER.map((pad, position) => {
  const { side, row } = pulsarRow(position);
  const at = flip(COLUMN_MM[side], FIRST_ROW_MM + PITCH_MM * row);
  return { position, pad, at, edge: at.x < BOARD_W_MM / 2 ? "left" : "right" };
});

/** The microSD slot's SPI lines in bus order, by the use the header gives each pad. */
const SD_LINES: readonly (readonly [string, PulsarUse])[] = [
  ["CS", "sdCs"],
  ["MOSI", "spiMosi"],
  ["MISO", "spiMiso"],
  ["SCK", "sck"],
];

export interface SdLine {
  /** The SPI signal name, a symbol: "CS", "MOSI". */
  readonly signal: string;
  readonly pad: FlippedPad;
}

/** The four header pads the on-board microSD slot is wired to. */
export const SD_PADS: readonly SdLine[] = SD_LINES.flatMap(([signal, use]) => {
  const pad = FLIPPED_PADS.find((p) => p.pad.use === use);
  return pad ? [{ signal, pad }] : [];
});
