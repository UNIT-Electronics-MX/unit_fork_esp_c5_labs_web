import { describe, expect, it } from "vitest";
import { jumperPath, STRANDS, strandPath } from "./qwiic-cable";

/** The last point of an SVG path. */
const end = (d: string) => d.trim().split(/[A-Z]/).at(-1)?.trim().split(/\s+/).slice(-2).map(Number);
const lastX = (d: string) => end(d)?.[0] ?? Number.NaN;
const lastY = (d: string) => end(d)?.[1] ?? Number.NaN;

describe("the QWIIC cable", () => {
  it("has the four QWIIC lines", () => {
    expect(STRANDS.map((s) => s.signal)).toEqual(["SCL", "SDA", "3V3", "GND"]);
  });

  it("runs every strand into a side connector, one pitch apart", () => {
    const ends = STRANDS.map((_, k) => strandPath(k, { into: "side", x: 74, y: 254 }));
    expect(ends.map(lastX)).toEqual([74, 74, 74, 74]);
    expect(ends.map(lastY)).toEqual([254, 260, 266, 272]);
  });

  it("brings the strands up into a connector from below, side by side and in order", () => {
    const ends = STRANDS.map((_, k) => strandPath(k, { into: "below", x: 235, y: 448, floor: 500 }));
    expect(ends.map(lastY)).toEqual([448, 448, 448, 448]);
    expect(ends.map(lastX)).toEqual([226, 232, 238, 244]);
  });

  it("drops a jumper into a top connector with the strands in pin order", () => {
    const ends = STRANDS.map((_, k) => jumperPath(k, { x: 370, y: 250 }, { x: 405, y: 330 }));
    expect(ends.map(lastY)).toEqual([330, 330, 330, 330]);
    expect(ends.map(lastX)).toEqual([414, 408, 402, 396]);
  });
});
