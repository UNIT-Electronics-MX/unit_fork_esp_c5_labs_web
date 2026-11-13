import { describe, expect, it } from "vitest";
import { LineSplitter } from "../imu-cube/imu-protocol";
import { parseSoundLine } from "./sound-protocol";

describe("ES8311 sound lab serial protocol", () => {
  it("parses each exercise's real output", () => {
    expect(parseSoundLine("LEVEL,-24.3,-8.1")).toEqual({ mode: "loudness", phase: "sample", rms: -24.3, peak: -8.1 });
    expect(parseSoundLine("CLAP,2,OFF")).toEqual({ mode: "clap", phase: "toggle", count: 2, on: false });
    expect(parseSoundLine("RECORDER,PLAY,32000")).toEqual({ mode: "recorder", phase: "play", samples: 32000 });
    expect(parseSoundLine("SPECTRUM,#||###||||##|")).toEqual({ mode: "spectrum", phase: "sample", bars: [1, 0, 3, 0, 0, 0, 2, 0] });
    expect(parseSoundLine("SPECTRUM,LEVEL,-45.2,-31.7")).toEqual({ mode: "spectrum", phase: "level", rms: -45.2, peak: -31.7 });
    expect(parseSoundLine("GAME,HIT,4,3")).toEqual({ mode: "game", phase: "hit", round: 4, score: 3 });
    expect(parseSoundLine("GAME,END,13/20")).toEqual({ mode: "game", phase: "end", score: 13, rounds: 20 });
    expect(parseSoundLine("FX,PLAY,chipmunk")).toEqual({ mode: "voice_fx", phase: "play", effect: "chipmunk" });
    expect(parseSoundLine("CLAP,LEVEL,-18.0,-30.0")).toEqual({ mode: "clap", phase: "level", peak: -18, threshold: -30 });
    expect(parseSoundLine("CLAP,SENS,65")).toEqual({ mode: "clap", phase: "sensitivity", value: 65 });
    expect(parseSoundLine("RECORDER,SAVED,32000")).toEqual({ mode: "recorder", phase: "saved", samples: 32000 });
    expect(parseSoundLine("RECORDER,DONE")).toEqual({ mode: "recorder", phase: "done" });
    expect(parseSoundLine("GAME,START,10,900,65")).toEqual({ mode: "game", phase: "start", rounds: 10, window: 900, sensitivity: 65 });
    expect(parseSoundLine("GAME,ABORT,3/10")).toEqual({ mode: "game", phase: "abort", score: 3, rounds: 10 });
    expect(parseSoundLine("FX,SAVED,32000")).toEqual({ mode: "voice_fx", phase: "saved", samples: 32000 });
  });

  it("handles serial chunks and rejects unrelated or malformed lines", () => {
    const splitter = new LineSplitter();
    expect(splitter.push("LEVE")).toEqual([]);
    expect(splitter.push("L,-18.0,-4.0\r\nGAME,GO,1\n").map(parseSoundLine)).toEqual([
      { mode: "loudness", phase: "sample", rms: -18, peak: -4 },
      { mode: "game", phase: "go", round: 1 },
    ]);
    for (const line of [">>>", "LEVEL,NaN,-2", "SPECTRUM,###|##", "SPECTRUM,LEVEL,NaN,-20", "GAME,HIT,21,1", "GAME,START,10,500,65", "FX,PLAY,alien", "RECORDER,PLAY,-1", "CLAP,SENS,101"]) {
      expect(parseSoundLine(line)).toBeNull();
    }
  });
});
