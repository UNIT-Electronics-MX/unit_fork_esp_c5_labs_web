import type { SoundLabMode } from "../lesson-examples";

export type SoundMessage =
  | { mode: "loudness"; phase: "ready" }
  | { mode: "loudness"; phase: "sample"; rms: number; peak: number }
  | { mode: "clap"; phase: "ready" }
  | { mode: "clap"; phase: "toggle"; count: number; on: boolean }
  | { mode: "clap"; phase: "level"; peak: number; threshold: number }
  | { mode: "clap"; phase: "sensitivity"; value: number }
  | { mode: "recorder"; phase: "ready" | "record" }
  | { mode: "recorder"; phase: "play"; samples: number }
  | { mode: "recorder"; phase: "saved"; samples: number }
  | { mode: "recorder"; phase: "level"; rms: number; peak: number }
  | { mode: "recorder"; phase: "done" | "cleared" }
  | { mode: "recorder"; phase: "error"; code: string }
  | { mode: "spectrum"; phase: "ready" }
  | { mode: "spectrum"; phase: "level"; rms: number; peak: number }
  | { mode: "spectrum"; phase: "sample"; bars: number[] }
  | { mode: "game"; phase: "ready" }
  | { mode: "game"; phase: "go" | "hit" | "miss"; round: number; score?: number }
  | { mode: "game"; phase: "start"; rounds: number; window: number; sensitivity: number }
  | { mode: "game"; phase: "end" | "abort"; score: number; rounds: number }
  | { mode: "game"; phase: "error"; code: string }
  | { mode: "voice_fx"; phase: "ready" | "record" }
  | { mode: "voice_fx"; phase: "play"; effect: "normal" | "robot" | "echo" | "chipmunk" | "giant" }
  | { mode: "voice_fx"; phase: "saved"; samples: number }
  | { mode: "voice_fx"; phase: "level"; rms: number; peak: number }
  | { mode: "voice_fx"; phase: "done" | "cleared" }
  | { mode: "voice_fx"; phase: "error"; code: string };

const MODES: Record<string, SoundLabMode> = {
  LEVEL: "loudness", CLAP: "clap", RECORDER: "recorder",
  SPECTRUM: "spectrum", GAME: "game", FX: "voice_fx",
};

function integer(value: string | undefined, min: number, max: number): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

function db(value: string | undefined): number | null {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return number >= -100 && number <= 0 ? number : null;
}

/** Accept only complete telemetry lines; REPL text and incomplete chunks are ignored. */
export function parseSoundLine(line: string): SoundMessage | null {
  const fields = line.trim().split(",");
  const [prefix, action, third, fourth] = fields;
  const mode = MODES[prefix ?? ""];
  if (!mode) return null;
  if (action?.startsWith("READY")) return { mode, phase: "ready" } as SoundMessage;

  if (mode === "loudness" && fields.length === 3) {
    const rms = Number(action);
    const peak = Number(third);
    return action && third && Number.isFinite(rms) && Number.isFinite(peak)
      && rms >= -100 && rms <= 0 && peak >= -100 && peak <= 0
      ? { mode, phase: "sample", rms, peak } : null;
  }
  if (mode === "clap" && fields.length === 3) {
    const count = integer(action, 0, 1000000);
    if (count !== null && (third === "ON" || third === "OFF")) return { mode, phase: "toggle", count, on: third === "ON" };
    const value = integer(third, 0, 100);
    if (action === "SENS" && value !== null) return { mode, phase: "sensitivity", value };
  }
  if (mode === "clap" && action === "LEVEL" && fields.length === 4) {
    const peak = db(third);
    const threshold = db(fourth);
    if (peak !== null && threshold !== null) return { mode, phase: "level", peak, threshold };
  }
  if (mode === "recorder") {
    if (action === "START" && fields.length === 2) return { mode, phase: "record" };
    if (action === "DONE" && fields.length === 2) return { mode, phase: "done" };
    if (action === "CLEARED" && fields.length === 2) return { mode, phase: "cleared" };
    if (action === "ERROR" && fields.length === 3 && third) return { mode, phase: "error", code: third };
    const samples = integer(third, 1, 1000000);
    if (action === "PLAY" && fields.length === 3 && samples !== null) return { mode, phase: "play", samples };
    if (action === "SAVED" && fields.length === 3 && samples !== null) return { mode, phase: "saved", samples };
    if (action === "LEVEL" && fields.length === 4) {
      const rms = db(third);
      const peak = db(fourth);
      if (rms !== null && peak !== null) return { mode, phase: "level", rms, peak };
    }
  }
  if (mode === "spectrum" && action === "LEVEL" && fields.length === 4) {
    const rms = db(third);
    const peak = db(fourth);
    if (rms !== null && peak !== null) return { mode, phase: "level", rms, peak };
  }
  if (mode === "spectrum" && fields.length === 2) {
    const bars = (action ?? "").split("|");
    return bars.length === 8 && bars.every((bar) => /^#{0,10}$/.test(bar))
      ? { mode, phase: "sample", bars: bars.map((bar) => bar.length) } : null;
  }
  if (mode === "game") {
    if (action === "ERROR" && fields.length === 3 && third) return { mode, phase: "error", code: third };
    if (action === "START" && fields.length === 5) {
      const rounds = integer(third, 5, 20);
      const window = integer(fourth, 600, 1200);
      const sensitivity = integer(fields[4], 0, 100);
      if (rounds !== null && window !== null && sensitivity !== null) return { mode, phase: "start", rounds, window, sensitivity };
    }
    if ((action === "END" || action === "ABORT") && fields.length === 3 && third) {
      const result = /^(\d+)\/(5|10|20)$/.exec(third);
      if (result) {
        const rounds = Number(result[2]);
        const score = integer(result[1], 0, rounds);
        if (score !== null) return { mode, phase: action === "END" ? "end" : "abort", score, rounds };
      }
    }
    const round = integer(third, 1, 20);
    const score = integer(fourth, 0, 20);
    if (action === "GO" && fields.length === 3 && round !== null) return { mode, phase: "go", round };
    if ((action === "HIT" || action === "MISS") && fields.length === 4 && round !== null && score !== null) {
      return { mode, phase: action.toLowerCase() as "hit" | "miss", round, score };
    }
  }
  if (mode === "voice_fx") {
    if (action === "RECORD" && fields.length === 2) return { mode, phase: "record" };
    if (action === "DONE" && fields.length === 2) return { mode, phase: "done" };
    if (action === "CLEARED" && fields.length === 2) return { mode, phase: "cleared" };
    if (action === "ERROR" && fields.length === 3 && third) return { mode, phase: "error", code: third };
    const samples = integer(third, 1, 1000000);
    if (action === "SAVED" && fields.length === 3 && samples !== null) return { mode, phase: "saved", samples };
    if (action === "LEVEL" && fields.length === 4) {
      const rms = db(third);
      const peak = db(fourth);
      if (rms !== null && peak !== null) return { mode, phase: "level", rms, peak };
    }
    if (action === "PLAY" && fields.length === 3 && (third === "normal" || third === "robot" || third === "echo" || third === "chipmunk" || third === "giant")) {
      return { mode, phase: "play", effect: third };
    }
  }
  return null;
}
