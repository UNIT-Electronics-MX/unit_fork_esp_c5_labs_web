import { describe, expect, it } from "vitest";
import { DIAL_START, dialAngle, dialSegments, ringRadii } from "./hud-geometry";

describe("hud geometry", () => {
  it("sweeps 270° from the bottom left", () => {
    expect(dialAngle(0)).toBe(DIAL_START);
    expect(dialAngle(100) - dialAngle(0)).toBeCloseTo(1.5 * Math.PI);
    expect(dialAngle(-5)).toBe(DIAL_START);
  });

  it("lights only the bands the level reaches", () => {
    expect(dialSegments(0)).toEqual([]);
    expect(dialSegments(50).map((s) => s.band)).toEqual(["ok"]);
    const hot = dialSegments(95);
    expect(hot.map((s) => s.band)).toEqual(["ok", "warn", "hot"]);
    expect(hot[2]?.to).toBeCloseTo(dialAngle(95));
  });

  it("pushes the ring out by the loudest sample in each slice", () => {
    const radii = ringRadii({ min: Float32Array.from([-0.5, 0, -2]), max: Float32Array.from([0.25, 0, 0]) }, 10, 4);
    expect(Array.from(radii)).toEqual([12, 10, 14]);
  });
});
