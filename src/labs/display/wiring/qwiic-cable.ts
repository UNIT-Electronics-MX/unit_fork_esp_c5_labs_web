// The QWIIC cable in the wiring examples: four strands that leave the turned board's port upwards,
// arc over to the left edge and run down to a part. Strand k = 0 is the inside of every bend, so
// the strands never cross.
import { BY, mx, QWIIC_PORT, S } from "./example-layout";

/** The four lines, left to right where the cable leaves the board, with their wire colours. */
export const STRANDS = [
  { signal: "SCL", colour: "--w-scl", level: "GPIO6", pin: "SCL" },
  { signal: "SDA", colour: "--w-sda", level: "GPIO1", pin: "SDA" },
  { signal: "3V3", colour: "--w-vcc", level: "3.3 V", pin: "VCC" },
  { signal: "GND", colour: "--w-gnd", level: "0 V", pin: "GND" },
] as const;

/** Space between strands. */
const PITCH = 6;
const OVER_Y = 60;
const LEFT_X = 34;
const ARC = 70;
const BEND = 30;

/**
 * Where the cable plugs in. "side": it runs right into a connector on a part's left edge, first
 * strand at `y`. "below": it runs under the part and up into a connector centred on `x`, whose
 * bottom is at `y`; the strands turn at `floor`.
 */
export type CableEnd =
  | { readonly into: "side"; readonly x: number; readonly y: number }
  | { readonly into: "below"; readonly x: number; readonly y: number; readonly floor: number };

/** Strand k's path from the board's QWIIC port to `end`, as SVG path data. */
export function strandPath(k: number, end: CableEnd): string {
  const px = mx(QWIIC_PORT.x) - 1.5 * PITCH + PITCH * k;
  const top = BY + 0.6 * S;
  const yt = OVER_Y - PITCH * k;
  const xl = LEFT_X - PITCH * k;
  const over = `M${px} ${top} L${px} ${yt + ARC} C${px} ${yt + ARC * 0.3} ${px - ARC * 0.3} ${yt} ${px - ARC} ${yt} `
    + `L${xl + ARC} ${yt} C${xl + ARC * 0.3} ${yt} ${xl} ${yt + ARC * 0.3} ${xl} ${yt + ARC} `;
  const turnRight = (y: number) => `L${xl} ${y - BEND} C${xl} ${y - 9} ${xl + 9} ${y} ${xl + BEND} ${y} `;
  if (end.into === "side") {
    const y = end.y + PITCH * k;
    return `${over}${turnRight(y)}L${end.x} ${y}`;
  }
  const y = end.floor + PITCH * k;
  const x = end.x - 1.5 * PITCH + PITCH * k;
  return `${over}${turnRight(y)}L${x - 24} ${y} C${x - 7} ${y} ${x} ${y - 7} ${x} ${y - 24} L${x} ${end.y}`;
}

/**
 * Strand k of a short cable from a connector on a part's right edge (first strand at `from.y`)
 * across and down into a connector on top of another part, centred on `to.x` with its top at `to.y`.
 */
export function jumperPath(k: number, from: { x: number; y: number }, to: { x: number; y: number }): string {
  const y = from.y + PITCH * k;
  // Turning right then down: the top strand takes the outside, so it drops furthest right.
  const x = to.x + 1.5 * PITCH - PITCH * k;
  return `M${from.x} ${y} L${x - 16} ${y} C${x - 5} ${y} ${x} ${y + 5} ${x} ${y + 16} L${x} ${to.y}`;
}
