/**
 * Browser side of es8311_play_serial.py. Everything the browser sends is printable ASCII: the board reads
 * it through the MicroPython console, which treats a 0x03 byte as Ctrl+C even inside a binary stream and
 * would interrupt the script on the first bar of music. The board's answers are single control bytes.
 */
export const CHUNK_SAMPLES = 512;
/** Bytes of PCM per frame the board accepts (its buffer holds 2048 base64 characters). */
export const MAX_FRAME_BYTES = 1536;
export const SAMPLE_RATES = [16_000, 22_050, 32_000] as const;
export type SampleRate = (typeof SAMPLE_RATES)[number];

/** Control bytes the board answers with; they never occur in its text lines. */
export const ANSWER = { accept: 0x06, reject: 0x15, chunk: 0x01, done: 0x04 } as const;

const ascii = (text: string): Uint8Array => Uint8Array.from(text, (char) => char.charCodeAt(0));
const digits = (value: number, width: number): string => String(Math.max(0, Math.round(value))).padStart(width, "0").slice(-width);

/** `P` and the rate as five digits, e.g. `P22050`. */
export const encodeStart = (rate: number): Uint8Array => ascii(`P${digits(rate, 5)}`);

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x2000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
  return btoa(binary);
}

/** `F`, the base64 length as four digits, then the mono PCM16 little-endian samples in base64. */
export function encodeFrame(samples: Int16Array): Uint8Array {
  const length = samples.length * 2;
  if (length === 0 || length > MAX_FRAME_BYTES) throw new RangeError(`frame of ${length} bytes`);
  const pcm = new Uint8Array(length);
  const view = new DataView(pcm.buffer);
  samples.forEach((sample, i) => view.setInt16(i * 2, sample, true));
  const text = base64(pcm);
  return ascii(`F${digits(text.length, 4)}${text}`);
}

/** `V` and the volume as three digits, 000 to 100. */
export const encodeVolume = (percent: number): Uint8Array => ascii(`V${digits(Math.min(100, Math.max(0, percent)), 3)}`);

export const encodeEnd = (): Uint8Array => ascii("E");

export interface Answers {
  readonly accept: number;
  readonly reject: number;
  readonly chunks: number;
  readonly done: number;
}

/** Counts the board's answer bytes in whatever order and chunking they arrive; other bytes are ignored. */
export function readAnswers(chunk: Uint8Array): Answers {
  let accept = 0;
  let reject = 0;
  let chunks = 0;
  let done = 0;
  for (const byte of chunk) {
    if (byte === ANSWER.accept) accept++;
    else if (byte === ANSWER.reject) reject++;
    else if (byte === ANSWER.chunk) chunks++;
    else if (byte === ANSWER.done) done++;
  }
  return { accept, reject, chunks, done };
}
