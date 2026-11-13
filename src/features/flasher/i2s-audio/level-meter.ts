/** Pure helpers behind the I²S listening meter and scope: no DOM, no audio. */

/** The quietest level the meter shows; anything below sits at its start. */
export const METER_FLOOR_DB = -60;
/** A 16-bit sample this close to full scale counts as clipped. */
export const CLIP_LEVEL = 32_700;
/** Samples kept for the scope: about 43 ms at 48 kHz. */
export const SCOPE_SAMPLES = 2048;

/** Position of a dBFS level on a meter from METER_FLOOR_DB (0 %) to 0 dBFS (100 %). */
export function dbfsToPercent(dbfs: number, floor = METER_FLOOR_DB): number {
  if (!Number.isFinite(dbfs) || dbfs <= floor) return 0;
  if (dbfs >= 0) return 100;
  return ((dbfs - floor) / -floor) * 100;
}

/** Peak level of a 16-bit sample in dBFS (silence is -Infinity). */
export function peakDbfs(peak: number): number {
  return peak > 0 ? 20 * Math.log10(Math.min(peak, 32768) / 32768) : -Infinity;
}

/** A peak marker that holds its highest level for a moment, then falls at a steady rate. */
export class PeakHold {
  private level = -Infinity;
  private heldAt = 0;
  private readonly holdMs: number;
  private readonly fallDbPerSecond: number;

  constructor(holdMs = 1200, fallDbPerSecond = 20) {
    this.holdMs = holdMs;
    this.fallDbPerSecond = fallDbPerSecond;
  }

  /** Feed the latest peak (dBFS) at time `now` (ms); returns the marker's level. */
  update(dbfs: number, now: number): number {
    if (dbfs >= this.level) {
      this.level = dbfs;
      this.heldAt = now;
      return this.level;
    }
    const falling = now - this.heldAt - this.holdMs;
    if (falling > 0) {
      this.level = Math.max(dbfs, this.level - (falling / 1000) * this.fallDbPerSecond);
      this.heldAt = now - this.holdMs;
    }
    return this.level;
  }

  reset(): void {
    this.level = -Infinity;
    this.heldAt = 0;
  }
}

/** The latest samples, oldest first, in a fixed-size ring. */
export class SampleRing {
  private readonly data: Int16Array;
  private at = 0;

  constructor(size = SCOPE_SAMPLES) {
    this.data = new Int16Array(size);
  }

  push(samples: Int16Array): void {
    const size = this.data.length;
    const start = Math.max(0, samples.length - size);
    for (let i = start; i < samples.length; i++) {
      this.data[this.at] = samples[i] ?? 0;
      this.at = (this.at + 1) % size;
    }
  }

  /** A copy in time order. */
  snapshot(): Int16Array {
    const out = new Int16Array(this.data.length);
    out.set(this.data.subarray(this.at));
    out.set(this.data.subarray(0, this.at), this.data.length - this.at);
    return out;
  }

  clear(): void {
    this.data.fill(0);
    this.at = 0;
  }
}

/**
 * Min/max envelope of `samples` over `columns` columns, scaled to -1…1, so a short scope
 * still shows every spike that falls between two pixels.
 */
export function waveformColumns(samples: Int16Array, columns: number): { min: Float32Array; max: Float32Array } {
  const count = Math.max(0, Math.floor(columns));
  const min = new Float32Array(count);
  const max = new Float32Array(count);
  if (!samples.length) return { min, max };
  for (let c = 0; c < count; c++) {
    const from = Math.floor((c * samples.length) / count);
    const to = Math.max(from + 1, Math.floor(((c + 1) * samples.length) / count));
    let low = Infinity;
    let high = -Infinity;
    for (let i = from; i < to && i < samples.length; i++) {
      const value = samples[i] ?? 0;
      if (value < low) low = value;
      if (value > high) high = value;
    }
    min[c] = low === Infinity ? 0 : low / 32768;
    max[c] = high === -Infinity ? 0 : high / 32768;
  }
  return { min, max };
}
