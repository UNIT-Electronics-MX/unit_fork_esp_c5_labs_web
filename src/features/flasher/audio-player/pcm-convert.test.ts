import { describe, expect, it } from "vitest";
import { clock, floatToPcm16, normalizeGain, overview, peakOf, streamKilobytes } from "./pcm-convert";

describe("floatToPcm16", () => {
  it("maps -1..1 to the full 16-bit range and clips beyond it", () => {
    expect(Array.from(floatToPcm16(Float32Array.of(0, 1, -1, 0.5)))).toEqual([0, 32767, -32768, 16384]);
    expect(Array.from(floatToPcm16(Float32Array.of(2, -3)))).toEqual([32767, -32768]);
  });

  it("applies a gain before clipping", () => {
    expect(Array.from(floatToPcm16(Float32Array.of(0.25), 2))).toEqual([16384]);
  });
});

describe("normalizeGain", () => {
  it("raises quiet audio to about -1 dBFS, never lowers loud audio and leaves silence alone", () => {
    expect(normalizeGain(0.3)).toBeCloseTo(3);
    expect(normalizeGain(0.95)).toBe(1);
    expect(normalizeGain(0)).toBe(1);
    expect(peakOf(Float32Array.of(0.1, -0.7, 0.4))).toBeCloseTo(0.7);
  });
});

describe("overview", () => {
  it("keeps the loudest sample of each slice", () => {
    const peaks = overview(Int16Array.of(0, 16384, -32768, 100, 0, 0, 0, 0), 4);
    expect(Array.from(peaks)).toEqual([0.5, 1, 0, 0]);
  });

  it("returns silence for an empty clip and one value per bin for a short one", () => {
    expect(Array.from(overview(new Int16Array(0), 3))).toEqual([0, 0, 0]);
    expect(overview(Int16Array.of(8192), 5)).toHaveLength(5);
  });
});

describe("display helpers", () => {
  it("formats clocks and the USB rate", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(75.9)).toBe("1:15");
    expect(streamKilobytes(22_050)).toBe(44);
  });
});
