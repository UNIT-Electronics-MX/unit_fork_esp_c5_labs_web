// The voice-effects lab as data: which effects the board knows, what their one control means,
// the PLAY command the board expects, and the response of its filters for the drawing.
// It mirrors es8311_sound_labs.py; keep the two in step.

export const VOICE_EFFECTS = [
  "normal", "robot", "alien", "chipmunk", "giant", "vibrato", "tremolo",
  "echo", "cave", "telephone", "radio", "retro", "overdrive", "reverse",
] as const;
export type VoiceEffect = (typeof VOICE_EFFECTS)[number];

export const VOICE_FILTERS = ["none", "low", "high", "band"] as const;
export type VoiceFilter = (typeof VOICE_FILTERS)[number];

/** The technique behind an effect, shown as its tag. */
export type Technique = "none" | "ring" | "speed" | "lfo" | "delay" | "comb" | "band" | "crush" | "clip" | "order";

export interface EffectInfo {
  readonly technique: Technique;
  /** Whether the intensity control changes anything. */
  readonly adjustable: boolean;
}

export const EFFECT_INFO: Readonly<Record<VoiceEffect, EffectInfo>> = {
  normal: { technique: "none", adjustable: false },
  robot: { technique: "ring", adjustable: true },
  alien: { technique: "ring", adjustable: true },
  chipmunk: { technique: "speed", adjustable: true },
  giant: { technique: "speed", adjustable: true },
  vibrato: { technique: "lfo", adjustable: true },
  tremolo: { technique: "lfo", adjustable: true },
  echo: { technique: "delay", adjustable: true },
  cave: { technique: "comb", adjustable: true },
  telephone: { technique: "band", adjustable: true },
  radio: { technique: "band", adjustable: true },
  retro: { technique: "crush", adjustable: true },
  overdrive: { technique: "clip", adjustable: true },
  reverse: { technique: "order", adjustable: false },
};

export const isVoiceEffect = (value: string | undefined): value is VoiceEffect =>
  (VOICE_EFFECTS as readonly string[]).includes(value ?? "");

export const RATE = 16000;
export const MIN_CUTOFF = 150;
export const MAX_CUTOFF = 6000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

export interface VoiceSettings {
  readonly effect: VoiceEffect;
  readonly amount: number;
  readonly filter: VoiceFilter;
  readonly cutoff: number;
  readonly volume: number;
}

/** PLAY effect amount filter cutoff volume, every number inside the range the board accepts. */
export function playCommand(settings: VoiceSettings): string {
  const { effect, filter } = settings;
  const amount = clamp(settings.amount, 0, 100);
  const cutoff = clamp(settings.cutoff, MIN_CUTOFF, MAX_CUTOFF);
  const volume = clamp(settings.volume, 0, 100);
  return `PLAY ${effect} ${amount} ${filter} ${cutoff} ${volume}`;
}

/** The cutoff slider runs 0..100 on a log scale, so each step is the same musical interval. */
export function sliderToCutoff(position: number): number {
  const t = Math.min(100, Math.max(0, position)) / 100;
  return Math.round(MIN_CUTOFF * (MAX_CUTOFF / MIN_CUTOFF) ** t);
}

export function cutoffToSlider(cutoff: number): number {
  const hz = Math.min(MAX_CUTOFF, Math.max(MIN_CUTOFF, cutoff));
  return Math.round((100 * Math.log(hz / MIN_CUTOFF)) / Math.log(MAX_CUTOFF / MIN_CUTOFF));
}

/** The board's Q12 one-pole factor at this cutoff, as a fraction. */
function onePole(cutoff: number): number {
  const q12 = Math.max(1, Math.min(4096, Math.trunc(4096 * (1 - Math.exp((-2 * Math.PI * cutoff) / RATE)))));
  return q12 / 4096;
}

/** |H| of one low-pass stage y += a·(x − y) at a frequency, and of its high-pass complement. */
function stage(a: number, frequency: number): { low: number; high: number } {
  const w = (2 * Math.PI * frequency) / RATE;
  // H_low = a / (1 − (1 − a)·e^{−jw}); H_high = 1 − H_low.
  const re = 1 - (1 - a) * Math.cos(w);
  const im = (1 - a) * Math.sin(w);
  const den = re * re + im * im;
  const lowRe = (a * re) / den;
  const lowIm = (-a * im) / den;
  return { low: Math.hypot(lowRe, lowIm), high: Math.hypot(1 - lowRe, -lowIm) };
}

/** Gain (0..1+) the board's two-stage filter applies at a frequency. */
export function filterGain(filter: VoiceFilter, cutoff: number, frequency: number): number {
  if (filter === "none") return 1;
  if (filter === "band") {
    return filterGain("high", Math.trunc((cutoff * 2) / 3), frequency) * filterGain("low", Math.trunc((cutoff * 3) / 2), frequency);
  }
  const one = stage(onePole(cutoff), frequency);
  const single = filter === "low" ? one.low : one.high;
  return single * single;
}

/** Points of the response curve in dB, on a log frequency axis from 60 Hz to the Nyquist limit. */
export function responseCurve(filter: VoiceFilter, cutoff: number, points = 64): { frequency: number; db: number }[] {
  const low = 60;
  const high = RATE / 2;
  return Array.from({ length: points }, (_, i) => {
    const frequency = low * (high / low) ** (i / (points - 1));
    const gain = filterGain(filter, cutoff, frequency);
    return { frequency, db: 20 * Math.log10(Math.max(gain, 1e-4)) };
  });
}

/** How long the board plays a rendered take, in milliseconds. */
export const playMs = (samples: number): number => Math.round((samples * 1000) / RATE);

/** "850 Hz" or "2.4 kHz". */
export function formatHz(hz: number, locale?: string): string {
  if (hz < 1000) return `${Math.round(hz)} Hz`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hz / 1000)} kHz`;
}
