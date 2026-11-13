/** USB Serial/JTAG protocol emitted by mic_ics43434_usb_master.py. */
export const PCM_RATE = 48_000;
const HEADER = [82, 65, 87, 13, 10]; // RAW\r\n
const MAX_SAMPLES = 512;
const MAX_PENDING = 8192;

export interface PcmPacket {
  readonly ready: boolean;
  readonly frames: readonly Int16Array[];
  readonly resyncs: number;
}

export class PcmProtocol {
  private pending = new Uint8Array(0);
  private ready = false;

  push(chunk: Uint8Array): PcmPacket {
    const joined = new Uint8Array(this.pending.length + chunk.length);
    joined.set(this.pending);
    joined.set(chunk, this.pending.length);
    let at = 0;
    let resyncs = 0;
    const frames: Int16Array[] = [];

    if (!this.ready) {
      const start = find(joined, HEADER, 0);
      if (start < 0) {
        this.pending = joined.slice(Math.max(0, joined.length - HEADER.length + 1));
        return { ready: false, frames, resyncs };
      }
      this.ready = true;
      at = start + HEADER.length;
    }

    while (at < joined.length) {
      const start = find(joined, [65, 85], at); // AU
      if (start < 0) {
        this.pending = joined.slice(Math.max(at, joined.length - 1));
        return { ready: true, frames, resyncs };
      }
      if (start > at) resyncs++;
      if (joined.length - start < 4) {
        at = start;
        break;
      }
      const count = (joined[start + 2] ?? 0) | (joined[start + 3] ?? 0) << 8;
      if (count < 1 || count > MAX_SAMPLES) {
        at = start + 2;
        resyncs++;
        continue;
      }
      const end = start + 4 + count * 2;
      if (joined.length < end + 2) {
        at = start;
        break;
      }
      const samples = new Int16Array(count);
      let checksum = 0;
      for (let i = 0; i < count; i++) {
        const word = (joined[start + 4 + i * 2] ?? 0) | (joined[start + 5 + i * 2] ?? 0) << 8;
        samples[i] = word >= 0x8000 ? word - 0x10000 : word;
        checksum = (checksum + word) & 0xffff;
      }
      const sent = (joined[end] ?? 0) | (joined[end + 1] ?? 0) << 8;
      if (checksum !== sent) {
        at = start + 2;
        resyncs++;
        continue;
      }
      frames.push(samples);
      at = end + 2;
    }
    this.pending = joined.slice(Math.min(at, joined.length));
    if (this.pending.length > MAX_PENDING) this.pending = this.pending.slice(-MAX_PENDING);
    return { ready: this.ready, frames, resyncs };
  }
}

function find(bytes: Uint8Array, pattern: readonly number[], from: number): number {
  for (let at = from; at <= bytes.length - pattern.length; at++) {
    if (pattern.every((byte, i) => bytes[at + i] === byte)) return at;
  }
  return -1;
}

/** A live signal indicator, based on valid PCM frames rather than an I2S device ID. */
export function pcmLevel(samples: Int16Array): { peak: number; dbfs: number; signal: boolean } {
  let peak = 0;
  let squares = 0;
  let total = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
    squares += sample * sample;
    total += sample;
  }
  const rms = samples.length ? Math.sqrt(squares / samples.length) : 0;
  const variance = samples.length ? squares / samples.length - (total / samples.length) ** 2 : 0;
  return { peak, dbfs: rms ? 20 * Math.log10(rms / 32768) : -120, signal: Math.sqrt(Math.max(0, variance)) >= 8 };
}
