import { describe, expect, it } from "vitest";
import {
  cycleWidth, hzToSlider, keyboard, keyForShortcut, MAX_HZ, MIN_HZ, nearestNote, scopeCycles, SLIDER_STEPS,
  overloaded, parseLoad, sliderToHz, toneCommand, WHITE_KEYS, wavePath,
} from "./tone-math";

describe("pitch slider", () => {
  it("spans the whole range and doubles the pitch every quarter of the slider", () => {
    expect(sliderToHz(0)).toBe(MIN_HZ);
    expect(sliderToHz(SLIDER_STEPS)).toBe(MAX_HZ);
    expect(sliderToHz(SLIDER_STEPS / 4)).toBe(MIN_HZ * 2);
  });

  it("round-trips a frequency and clamps outside the range", () => {
    expect(sliderToHz(hzToSlider(440))).toBeGreaterThanOrEqual(438);
    expect(sliderToHz(hzToSlider(440))).toBeLessThanOrEqual(442);
    expect(hzToSlider(5)).toBe(0);
    expect(hzToSlider(99999)).toBe(SLIDER_STEPS);
  });
});

describe("nearestNote", () => {
  it("names notes and reports the distance in cents", () => {
    expect(nearestNote(440)).toEqual({ name: "A4", cents: 0 });
    expect(nearestNote(262).name).toBe("C4");
    expect(nearestNote(466).name).toBe("A♯4");
    expect(nearestNote(450)).toEqual({ name: "A4", cents: 39 });
  });
});

describe("keyboard", () => {
  it("builds thirteen keys from C to C with the frequencies the board expects", () => {
    const keys = keyboard(4);
    expect(keys).toHaveLength(13);
    expect(keys[0]).toMatchObject({ name: "C4", hz: 262, sharp: false, shortcut: "a" });
    expect(keys[9]).toMatchObject({ name: "A4", hz: 440 });
    expect(keys[12]).toMatchObject({ name: "C5", hz: 523 });
    expect(keys.filter((key) => key.sharp)).toHaveLength(5);
  });

  it("lays the keys out like a piano: eight white keys and black keys on the boundaries", () => {
    const keys = keyboard(4);
    expect(keys.filter((key) => !key.sharp).map((key) => key.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(keys.filter((key) => key.sharp).map((key) => [key.name, key.slot])).toEqual([
      ["C♯4", 1], ["D♯4", 2], ["F♯4", 4], ["G♯4", 5], ["A♯4", 6],
    ]);
    expect(WHITE_KEYS).toBe(8);
  });

  it("keeps every key inside the board's accepted range in each octave", () => {
    for (const octave of [3, 4, 5] as const) {
      for (const key of keyboard(octave)) {
        expect(key.hz).toBeGreaterThanOrEqual(MIN_HZ);
        expect(key.hz).toBeLessThanOrEqual(MAX_HZ);
      }
    }
  });

  it("finds a key by its computer-keyboard shortcut", () => {
    expect(keyForShortcut(4, "A")?.name).toBe("C4");
    expect(keyForShortcut(5, "k")?.name).toBe("C6");
    expect(keyForShortcut(4, "z")).toBeUndefined();
  });
});

describe("scope drawing", () => {
  it("shows more cycles at higher pitch", () => {
    expect(scopeCycles(MIN_HZ)).toBeCloseTo(2);
    expect(scopeCycles(MAX_HZ)).toBeCloseTo(8);
    expect(cycleWidth(MAX_HZ)).toBeLessThan(cycleWidth(MIN_HZ));
  });

  it("scales the drawn amplitude with the level and keeps a visible trace at zero", () => {
    const peak = (path: string) => Math.min(...[...path.matchAll(/ (\d+\.\d)/g)].map((m) => Number(m[1])));
    expect(peak(wavePath("sine", 440, 75))).toBeLessThan(peak(wavePath("sine", 440, 20)));
    expect(peak(wavePath("sine", 440, 0))).toBeLessThan(60);
  });

  it("draws a different shape for each waveform", () => {
    const paths = new Set((["sine", "triangle", "square", "saw"] as const).map((wave) => wavePath(wave, 440, 40)));
    expect(paths.size).toBe(4);
  });
});

describe("toneCommand", () => {
  it("formats the board command", () => {
    expect(toneCommand(440.4, "saw", 34.6)).toBe("T 440 saw 35");
  });
});

describe("board load", () => {
  it("reads the load line and ignores everything else", () => {
    expect(parseLoad("TONE,LOAD,3200,11609")).toEqual({ usedUs: 3200, budgetUs: 11609, slow: false });
    expect(parseLoad("TONE,LOAD,9000,11609,slow")?.slow).toBe(true);
    expect(parseLoad("TONE,READY")).toBeNull();
    expect(parseLoad("TONE,LOAD,x,0")).toBeNull();
  });

  it("flags a block that takes most of its own duration", () => {
    expect(overloaded({ usedUs: 3200, budgetUs: 11609, slow: false })).toBe(false);
    expect(overloaded({ usedUs: 9000, budgetUs: 11609, slow: false })).toBe(true);
    expect(overloaded({ usedUs: 100, budgetUs: 11609, slow: true })).toBe(true);
  });
});
