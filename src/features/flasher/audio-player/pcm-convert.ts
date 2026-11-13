/** Sample conversion and display maths for the audio player. Pure, so it runs under test. */
export const MAX_SECONDS = 600;

export function floatToPcm16(samples: Float32Array, gain = 1): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, (samples[i] ?? 0) * gain));
    pcm[i] = Math.round(value < 0 ? value * 32768 : value * 32767);
  }
  return pcm;
}

export function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  return peak;
}

/** Gain that brings the loudest sample to `target` (default -0.9 dBFS); never attenuates and never boosts silence. */
export function normalizeGain(peak: number, target = 0.9): number {
  if (peak < 0.001) return 1;
  return Math.max(1, target / peak);
}

/** Loudest absolute sample in each of `bins` equal slices, 0..1, for the waveform overview. */
export function overview(pcm: Int16Array, bins: number): Float32Array {
  const peaks = new Float32Array(bins);
  if (!pcm.length) return peaks;
  const size = pcm.length / bins;
  for (let bin = 0; bin < bins; bin++) {
    const end = Math.min(pcm.length, Math.max(Math.floor((bin + 1) * size), Math.floor(bin * size) + 1));
    let peak = 0;
    for (let i = Math.floor(bin * size); i < end; i++) peak = Math.max(peak, Math.abs(pcm[i] ?? 0));
    peaks[bin] = peak / 32768;
  }
  return peaks;
}

export const clock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

/** USB payload of the stream, in kB/s, for the quality note. */
export const streamKilobytes = (rate: number): number => Math.round(rate * 2 / 1000);
