/** Pure maths behind the tone lab: pitch scale, note names, keyboard layout and the waveform drawing. */
export const MIN_HZ = 110;
export const MAX_HZ = 1760;
export const MAX_LEVEL = 75;
export const OCTAVES = [3, 4, 5] as const;
export type Octave = (typeof OCTAVES)[number];
export type Wave = "sine" | "triangle" | "square" | "saw";
export const WAVES: readonly Wave[] = ["sine", "triangle", "square", "saw"];

/** Slider resolution: the pitch slider runs 0..SLIDER_STEPS over MIN_HZ..MAX_HZ on a logarithmic scale. */
export const SLIDER_STEPS = 1000;
const OCTAVES_SPAN = Math.log2(MAX_HZ / MIN_HZ);

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Equal temperament: one slider step is the same musical interval everywhere. */
export const hzToSlider = (hz: number): number =>
  Math.round(clamp(Math.log2(clamp(hz, MIN_HZ, MAX_HZ) / MIN_HZ) / OCTAVES_SPAN, 0, 1) * SLIDER_STEPS);

export const sliderToHz = (position: number): number =>
  Math.round(MIN_HZ * 2 ** (clamp(position, 0, SLIDER_STEPS) / SLIDER_STEPS * OCTAVES_SPAN));

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export interface NearestNote {
  readonly name: string;
  readonly cents: number;
}

/** The closest named note and how far (in cents, -50..50) the frequency is from it. */
export function nearestNote(hz: number): NearestNote {
  const midiExact = 69 + 12 * Math.log2(Math.max(hz, 1) / 440);
  const midi = Math.round(midiExact);
  const name = `${NAMES[((midi % 12) + 12) % 12] ?? "C"}${Math.floor(midi / 12) - 1}`;
  return { name, cents: Math.round((midiExact - midi) * 100) };
}

export interface Key {
  readonly name: string;
  readonly hz: number;
  readonly sharp: boolean;
  /** Computer-keyboard key that plays this note. */
  readonly shortcut: string;
  /** White keys: their position among the white keys. Black keys: the boundary they straddle. */
  readonly slot: number;
}

/** White keys across a one-octave keyboard from C to the next C. */
export const WHITE_KEYS = 8;

/** Home-row piano: a w s e d f t g y h u j k are C..C an octave up. */
export const SHORTCUTS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k"] as const;

/** Thirteen keys from C of the octave to the next C. */
export function keyboard(octave: Octave): readonly Key[] {
  const firstMidi = 12 * (octave + 1);
  let whites = 0;
  return SHORTCUTS.map((shortcut, i) => {
    const midi = firstMidi + i;
    const name = `${NAMES[midi % 12] ?? "C"}${Math.floor(midi / 12) - 1}`;
    const sharp = name.includes("♯");
    const slot = sharp ? whites : whites++;
    return { name, hz: Math.round(midiToHz(midi)), sharp, shortcut, slot };
  });
}

export const keyForShortcut = (octave: Octave, shortcut: string): Key | undefined =>
  keyboard(octave).find((key) => key.shortcut === shortcut.toLowerCase());

const POINTS = 120;
const WIDTH = 600;
const MID = 60;
const HEIGHT = 44;

/** Visible cycles on the scope: 2 at the lowest pitch up to 8 at the highest. */
export const scopeCycles = (hz: number): number =>
  2 + 6 * Math.log2(clamp(hz, MIN_HZ, MAX_HZ) / MIN_HZ) / OCTAVES_SPAN;

function shape(wave: Wave, turns: number): number {
  const x = turns - Math.floor(turns);
  if (wave === "sine") return Math.sin(2 * Math.PI * x);
  if (wave === "square") return x < 0.5 ? 1 : -1;
  if (wave === "saw") return 2 * x - 1;
  return x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4;
}

/** SVG path of the waveform over one scope width plus one extra cycle, so it can scroll without a seam. */
export function wavePath(wave: Wave, hz: number, level: number): string {
  const cycles = scopeCycles(hz);
  const amplitude = HEIGHT * clamp(level / MAX_LEVEL, 0.06, 1);
  const span = WIDTH * (1 + 1 / cycles);
  return Array.from({ length: POINTS + 1 }, (_, i) => {
    const x = i / POINTS * span;
    const y = MID - shape(wave, x / WIDTH * cycles) * amplitude;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

/** Horizontal width of one cycle in SVG units: the distance the animation scrolls. */
export const cycleWidth = (hz: number): number => WIDTH / scopeCycles(hz);

export const toneCommand = (frequency: number, wave: Wave, level: number): string =>
  `T ${Math.round(frequency)} ${wave} ${Math.round(level)}`;

export interface BoardLoad {
  readonly usedUs: number;
  readonly budgetUs: number;
  /** The firmware has no native emitter, so blocks are made in plain Python. */
  readonly slow: boolean;
}

/** Parses the board's `TONE,LOAD,<max us>,<budget us>[,slow]` line. */
export function parseLoad(line: string): BoardLoad | null {
  const [tag, kind, used, budget, flag] = line.split(",");
  const usedUs = Number(used);
  const budgetUs = Number(budget);
  if (tag !== "TONE" || kind !== "LOAD" || !Number.isFinite(usedUs) || !Number.isFinite(budgetUs) || budgetUs <= 0) return null;
  return { usedUs, budgetUs, slow: flag === "slow" };
}

/** True when making a block takes most of the time the block lasts: the sound will stutter. */
export const overloaded = (load: BoardLoad): boolean => load.slow || load.usedUs > load.budgetUs * 0.7;
