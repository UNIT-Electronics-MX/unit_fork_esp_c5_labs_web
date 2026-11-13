import { describe, expect, it } from "vitest";
import { dbfsToPercent, PeakHold, peakDbfs, SampleRing, waveformColumns } from "./level-meter";

describe("level meter", () => {
  it("maps dBFS onto a log meter from -60 to 0", () => {
    expect(dbfsToPercent(-120)).toBe(0);
    expect(dbfsToPercent(-Infinity)).toBe(0);
    expect(dbfsToPercent(-30)).toBe(50);
    expect(dbfsToPercent(0)).toBe(100);
    expect(dbfsToPercent(3)).toBe(100);
  });

  it("turns a 16-bit peak into dBFS", () => {
    expect(peakDbfs(32768)).toBe(0);
    expect(peakDbfs(16384)).toBeCloseTo(-6.02, 2);
    expect(peakDbfs(0)).toBe(-Infinity);
  });

  it("holds the peak, then lets it fall", () => {
    const hold = new PeakHold(1000, 20);
    expect(hold.update(-10, 0)).toBe(-10);
    expect(hold.update(-40, 500)).toBe(-10);
    expect(hold.update(-40, 1500)).toBeCloseTo(-20);
    expect(hold.update(-40, 3000)).toBe(-40);
    expect(hold.update(-5, 3100)).toBe(-5);
  });

  it("keeps the latest samples in order", () => {
    const ring = new SampleRing(4);
    ring.push(Int16Array.from([1, 2, 3]));
    ring.push(Int16Array.from([4, 5]));
    expect(Array.from(ring.snapshot())).toEqual([2, 3, 4, 5]);
    ring.push(Int16Array.from([6, 7, 8, 9, 10]));
    expect(Array.from(ring.snapshot())).toEqual([7, 8, 9, 10]);
  });

  it("keeps spikes in the scope envelope", () => {
    const samples = new Int16Array(100);
    samples[37] = 16384;
    samples[80] = -32768;
    const { min, max } = waveformColumns(samples, 10);
    expect(max[3]).toBe(0.5);
    expect(min[8]).toBe(-1);
    expect(max[0]).toBe(0);
  });
});
