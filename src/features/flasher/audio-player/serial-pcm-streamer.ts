import { CHUNK_SAMPLES, encodeEnd, encodeFrame, encodeStart, encodeVolume, readAnswers } from "./play-protocol";

export interface PcmTransport {
  sendBytes(bytes: Uint8Array): Promise<void>;
}

export interface StreamOptions {
  /** Volume (0..100) to apply as soon as the board accepts the rate. */
  readonly volume: number;
  readonly signal: AbortSignal;
  /** Samples the board has confirmed so far. */
  readonly onProgress: (samples: number) => void;
}

export type StreamResult = "finished" | "stopped";

/** Frames in flight: the board's buffer absorbs these while the browser waits for the next confirmation. */
const WINDOW = 6;
const ANSWER_TIMEOUT_MS = 4000;
/** No confirmation for this long while frames are owed means the board's script has stopped. */
const STALL_TIMEOUT_MS = 3000;
/** After a stop, how long to wait for the board to confirm it closed the codec. */
const CLOSE_TIMEOUT_MS = 1500;

export class StreamError extends Error {
  readonly reason: "rejected" | "noAnswer" | "stalled";

  constructor(reason: "rejected" | "noAnswer" | "stalled") {
    super(reason);
    this.reason = reason;
  }
}

/**
 * Streams mono PCM16 to es8311_play_serial.py with credit-based flow control: at most WINDOW frames
 * are unconfirmed at any time, so the board is never flooded and playback stays in step with real time.
 * Feed every byte the board sends to `receive`.
 */
export class SerialPcmStreamer {
  private credits = 0;
  private confirmed = 0;
  private accepted = 0;
  private rejected = 0;
  private done = 0;
  private wake: (() => void) | null = null;
  private desiredVolume = 70;
  private volumeReady = false;

  private readonly transport: PcmTransport;

  constructor(transport: PcmTransport) {
    this.transport = transport;
  }

  receive = (chunk: Uint8Array): void => {
    const answers = readAnswers(chunk);
    this.accepted += answers.accept;
    this.rejected += answers.reject;
    this.credits += answers.chunks;
    this.confirmed += answers.chunks;
    this.done += answers.done;
    this.wake?.();
  };

  /** Changes the codec volume while a song plays. */
  setVolume(percent: number): Promise<void> {
    this.desiredVolume = percent;
    return this.volumeReady ? this.transport.sendBytes(encodeVolume(percent)) : Promise.resolve();
  }

  private async until(ready: () => boolean, signal: AbortSignal, timeoutMs?: number): Promise<boolean> {
    const deadline = timeoutMs === undefined ? Infinity : performance.now() + timeoutMs;
    while (!ready()) {
      if (signal.aborted) return false;
      const remaining = deadline - performance.now();
      if (remaining <= 0) return false;
      await new Promise<void>((resolve) => {
        const timer = Number.isFinite(remaining) ? setTimeout(resolve, remaining) : undefined;
        const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", finish); this.wake = null; resolve(); };
        this.wake = finish;
        signal.addEventListener("abort", finish, { once: true });
      });
    }
    return true;
  }

  async play(pcm: Int16Array, rate: number, options: StreamOptions): Promise<StreamResult> {
    this.desiredVolume = options.volume;
    this.volumeReady = false;
    this.credits = WINDOW;
    this.confirmed = 0;
    this.accepted = 0;
    this.rejected = 0;
    this.done = 0;
    const { signal } = options;
    try {
      await this.transport.sendBytes(encodeStart(rate));
      const answered = await this.until(() => this.accepted > 0 || this.rejected > 0, signal, ANSWER_TIMEOUT_MS);
      if (this.rejected > 0) throw new StreamError("rejected");
      if (!answered && !signal.aborted) throw new StreamError("noAnswer");
      if (signal.aborted) return await this.finish(signal);

      const initialVolume = this.desiredVolume;
      await this.transport.sendBytes(encodeVolume(initialVolume));
      this.volumeReady = true;
      if (this.desiredVolume !== initialVolume) await this.transport.sendBytes(encodeVolume(this.desiredVolume));
      let sent = 0;
      while (sent < pcm.length && !signal.aborted) {
        if (!await this.until(() => this.credits > 0, signal, STALL_TIMEOUT_MS)) {
          if (signal.aborted) break;
          await this.transport.sendBytes(encodeEnd()).catch(() => undefined);
          throw new StreamError("stalled");
        }
        const frame = pcm.subarray(sent, Math.min(pcm.length, sent + CHUNK_SAMPLES));
        this.credits--;
        sent += frame.length;
        await this.transport.sendBytes(encodeFrame(frame));
        options.onProgress(Math.min(pcm.length, this.confirmed * CHUNK_SAMPLES));
      }
      // Let the last frames play out before closing the codec.
      if (!signal.aborted) {
        const total = Math.ceil(pcm.length / CHUNK_SAMPLES);
        await this.until(() => this.confirmed >= total, signal, ANSWER_TIMEOUT_MS);
        options.onProgress(pcm.length);
      }
      return await this.finish(signal);
    } finally {
      this.volumeReady = false;
    }
  }

  private async finish(signal: AbortSignal): Promise<StreamResult> {
    await this.transport.sendBytes(encodeEnd());
    await this.until(() => this.done > 0, new AbortController().signal, CLOSE_TIMEOUT_MS);
    return signal.aborted ? "stopped" : "finished";
  }
}
