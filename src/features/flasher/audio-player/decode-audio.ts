import { floatToPcm16, MAX_SECONDS, normalizeGain, peakOf } from "./pcm-convert";

export class DecodeError extends Error {
  readonly reason: "tooLong" | "unreadable";

  constructor(reason: "tooLong" | "unreadable", options?: ErrorOptions) {
    super(reason, options);
    this.reason = reason;
  }
}

/**
 * Decodes any audio file the browser can play (WAV, MP3, OGG, M4A...), mixes it down to mono and
 * resamples it to `rate`, all with the browser's own audio engine. Returns 16-bit PCM.
 */
export async function decodeToMono(file: Blob, rate: number, normalize: boolean): Promise<Int16Array> {
  const encoded = await file.arrayBuffer();
  const decoder = new AudioContext();
  let buffer: AudioBuffer;
  try {
    buffer = await decoder.decodeAudioData(encoded);
  } catch (cause) {
    throw new DecodeError("unreadable", { cause });
  } finally {
    void decoder.close();
  }
  if (buffer.duration > MAX_SECONDS) throw new DecodeError("tooLong");

  // A one-channel offline context mixes the channels down and converts the sample rate.
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(buffer.duration * rate)), rate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  const mono = (await offline.startRendering()).getChannelData(0);
  return floatToPcm16(mono, normalize ? normalizeGain(peakOf(mono)) : 1);
}
