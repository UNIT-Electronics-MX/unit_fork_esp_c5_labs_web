/** Pure geometry for the circular HUD level dial: no canvas, no DOM. */

/** The dial opens at the bottom: it starts at 135° (bottom left) and sweeps 270° clockwise. */
export const DIAL_START = (3 * Math.PI) / 4;
export const DIAL_SWEEP = (3 * Math.PI) / 2;
/** Where the colour bands change, as meter percent (-12 dBFS and -5 dBFS on a -60…0 meter). */
export const WARN_AT = 80;
export const HOT_AT = 92;

export type Band = "ok" | "warn" | "hot";

/** Angle (radians, canvas convention) of a meter percent on the dial. */
export function dialAngle(percent: number): number {
  const clamped = Math.min(100, Math.max(0, percent));
  return DIAL_START + (clamped / 100) * DIAL_SWEEP;
}

/** The lit stretches of the dial for a level, each with its colour band. */
export function dialSegments(percent: number): readonly { from: number; to: number; band: Band }[] {
  const level = Math.min(100, Math.max(0, percent));
  const bands: readonly [number, number, Band][] = [[0, WARN_AT, "ok"], [WARN_AT, HOT_AT, "warn"], [HOT_AT, 100, "hot"]];
  return bands
    .filter(([from]) => level > from)
    .map(([from, to, band]) => ({ from: dialAngle(from), to: dialAngle(Math.min(level, to)), band }));
}

/**
 * Radii of a closed waveform ring: each of `points` spokes reaches out by the loudest sample
 * in its slice, so the ring breathes with the sound. Amplitudes are 0…1 of `reach`.
 */
export function ringRadii(envelope: { min: Float32Array; max: Float32Array }, base: number, reach: number): Float32Array {
  const radii = new Float32Array(envelope.max.length);
  for (let i = 0; i < radii.length; i++) {
    const amplitude = Math.max(Math.abs(envelope.max[i] ?? 0), Math.abs(envelope.min[i] ?? 0));
    radii[i] = base + Math.min(1, amplitude) * reach;
  }
  return radii;
}
