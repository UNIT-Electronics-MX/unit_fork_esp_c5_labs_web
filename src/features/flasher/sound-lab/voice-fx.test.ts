import { describe, expect, it } from "vitest";
import {
  EFFECT_INFO,
  MAX_CUTOFF,
  MIN_CUTOFF,
  VOICE_EFFECTS,
  cutoffToSlider,
  filterGain,
  formatHz,
  isVoiceEffect,
  playCommand,
  playMs,
  responseCurve,
  sliderToCutoff,
} from "./voice-fx";

describe("voice effects", () => {
  it("describes every effect", () => {
    expect(VOICE_EFFECTS).toHaveLength(14);
    for (const effect of VOICE_EFFECTS) expect(EFFECT_INFO[effect]).toBeDefined();
    expect(isVoiceEffect("cave")).toBe(true);
    expect(isVoiceEffect("flanger")).toBe(false);
  });

  it("builds a PLAY command inside the board's ranges", () => {
    expect(playCommand({ effect: "cave", amount: 55, filter: "band", cutoff: 900, volume: 70 })).toBe("PLAY cave 55 band 900 70");
    expect(playCommand({ effect: "robot", amount: 140, filter: "low", cutoff: 20, volume: -3 })).toBe(`PLAY robot 100 low ${MIN_CUTOFF} 0`);
  });

  it("maps the cutoff slider on a log scale, both ways", () => {
    expect(sliderToCutoff(0)).toBe(MIN_CUTOFF);
    expect(sliderToCutoff(100)).toBe(MAX_CUTOFF);
    expect(sliderToCutoff(50)).toBe(Math.round(Math.sqrt(MIN_CUTOFF * MAX_CUTOFF)));
    for (const position of [0, 13, 50, 87, 100]) expect(cutoffToSlider(sliderToCutoff(position))).toBe(position);
  });

  it("models the board's filters", () => {
    expect(filterGain("none", 1000, 50)).toBe(1);
    expect(filterGain("low", 1000, 100)).toBeGreaterThan(0.9);
    expect(filterGain("low", 1000, 6000)).toBeLessThan(0.1);
    expect(filterGain("high", 1000, 100)).toBeLessThan(0.05);
    expect(filterGain("high", 1000, 4000)).toBeGreaterThan(0.6);
    const band = (frequency: number) => filterGain("band", 1000, frequency);
    expect(band(1000)).toBeGreaterThan(band(150) * 5);
    expect(band(1000)).toBeGreaterThan(band(7000) * 3);
  });

  it("draws a response curve from 60 Hz to Nyquist", () => {
    const curve = responseCurve("low", 800, 32);
    expect(curve).toHaveLength(32);
    expect(curve[0]?.frequency).toBeCloseTo(60);
    expect(curve.at(-1)?.frequency).toBeCloseTo(8000);
    expect(curve.at(-1)?.db ?? 0).toBeLessThan(-20);
    expect(responseCurve("none", 800).every((point) => point.db === 0)).toBe(true);
  });

  it("formats duration and frequency", () => {
    expect(playMs(16000)).toBe(1000);
    expect(formatHz(850, "en")).toBe("850 Hz");
    expect(formatHz(2400, "en")).toBe("2.4 kHz");
    expect(formatHz(2400, "es")).toBe("2,4 kHz");
  });
});
