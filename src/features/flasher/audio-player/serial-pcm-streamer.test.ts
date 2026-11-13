import { describe, expect, it, vi } from "vitest";
import { ANSWER, CHUNK_SAMPLES } from "./play-protocol";
import { SerialPcmStreamer, StreamError } from "./serial-pcm-streamer";

/** A board that confirms every frame after `latency` ms, like es8311_play_serial.py. */
function fakeBoard(options: { reject?: boolean; silent?: boolean; latency?: number } = {}) {
  const log: { tag: number; length: number; volume?: string }[] = [];
  let inFlight = 0;
  let peakInFlight = 0;
  const streamer: SerialPcmStreamer = new SerialPcmStreamer({
    async sendBytes(bytes) {
      const tag = bytes[0] ?? 0;
      log.push({ tag, length: bytes.length, ...(tag === 0x56 ? { volume: new TextDecoder().decode(bytes) } : {}) });
      if (options.silent) return;
      if (tag === 0x50) setTimeout(() => streamer.receive(Uint8Array.of(options.reject ? ANSWER.reject : ANSWER.accept)), 0);
      if (tag === 0x46) {
        inFlight++;
        peakInFlight = Math.max(peakInFlight, inFlight);
        setTimeout(() => { inFlight--; streamer.receive(Uint8Array.of(ANSWER.chunk)); }, options.latency ?? 1);
      }
      if (tag === 0x45) setTimeout(() => streamer.receive(Uint8Array.of(ANSWER.done)), 0);
    },
  });
  return { streamer, log, peak: () => peakInFlight };
}

const tags = (log: { tag: number }[]) => log.map((entry) => String.fromCharCode(entry.tag)).join("");

describe("SerialPcmStreamer", () => {
  it("streams every sample in order, never exceeds the window, and ends the song", async () => {
    const board = fakeBoard();
    const pcm = new Int16Array(CHUNK_SAMPLES * 20 + 100);
    const progress: number[] = [];
    const result = await board.streamer.play(pcm, 22_050, {
      volume: 70, signal: new AbortController().signal, onProgress: (samples) => progress.push(samples),
    });
    expect(result).toBe("finished");
    const frames = board.log.filter((entry) => entry.tag === 0x46);
    expect(frames).toHaveLength(21);
    expect(frames.length).toBe(21);
    expect(tags(board.log)).toMatch(/^PV(F)+E$/);
    expect(board.peak()).toBeLessThanOrEqual(6);
    expect(progress[progress.length - 1]).toBe(pcm.length);
  });

  it("stops on request, still telling the board the song ended", async () => {
    const board = fakeBoard({ latency: 5 });
    const abort = new AbortController();
    const run = board.streamer.play(new Int16Array(CHUNK_SAMPLES * 200), 22_050, {
      volume: 50, signal: abort.signal, onProgress: (samples) => { if (samples >= CHUNK_SAMPLES * 3) abort.abort(); },
    });
    expect(await run).toBe("stopped");
    expect(tags(board.log).endsWith("E")).toBe(true);
    expect(board.log.filter((entry) => entry.tag === 0x46).length).toBeLessThan(200);
  });

  it("reports a sample rate the board rejects", async () => {
    const board = fakeBoard({ reject: true });
    await expect(board.streamer.play(new Int16Array(10), 12_345, {
      volume: 50, signal: new AbortController().signal, onProgress: () => undefined,
    })).rejects.toMatchObject({ reason: "rejected" });
  });

  it("reports a board that does not answer", async () => {
    const board = fakeBoard({ silent: true });
    const attempt = board.streamer.play(new Int16Array(10), 22_050, {
      volume: 50, signal: new AbortController().signal, onProgress: () => undefined,
    });
    await expect(attempt).rejects.toBeInstanceOf(StreamError);
  }, 10_000);

  it("gives up when the board stops confirming frames, instead of waiting forever", async () => {
    vi.useFakeTimers();
    try {
      const log: number[] = [];
      const streamer: SerialPcmStreamer = new SerialPcmStreamer({
        async sendBytes(bytes) {
          log.push(bytes[0] ?? 0);
          if (bytes[0] === 0x50) streamer.receive(Uint8Array.of(ANSWER.accept)); // accepts, then goes silent
        },
      });
      const run = streamer.play(new Int16Array(CHUNK_SAMPLES * 50), 22_050, {
        volume: 50, signal: new AbortController().signal, onProgress: () => undefined,
      });
      const outcome = expect(run).rejects.toMatchObject({ reason: "stalled" });
      await vi.advanceTimersByTimeAsync(3500);
      await outcome;
      expect(log.filter((tag) => tag === 0x46)).toHaveLength(6); // only the window was sent
      expect(log[log.length - 1]).toBe(0x45); // and the board was told to stop
    } finally {
      vi.useRealTimers();
    }
  });

  it("changes the codec volume while frames are being streamed", async () => {
    const board = fakeBoard({ latency: 5 });
    let changed = false;
    await board.streamer.play(new Int16Array(CHUNK_SAMPLES * 20), 22_050, {
      volume: 70, signal: new AbortController().signal,
      onProgress: (samples) => {
        if (!changed && samples >= CHUNK_SAMPLES) {
          changed = true;
          void board.streamer.setVolume(30);
        }
      },
    });
    expect(board.log.filter((entry) => entry.volume).map((entry) => entry.volume)).toEqual(["V070", "V030"]);
  });

  it("keeps a volume change made during startup when the board accepts the song", async () => {
    let releaseStart!: () => void;
    const startGate = new Promise<void>((resolve) => { releaseStart = resolve; });
    const sent: string[] = [];
    const streamer = new SerialPcmStreamer({
      async sendBytes(bytes) {
        const tag = bytes[0];
        if (tag === 0x50) {
          await startGate;
          streamer.receive(Uint8Array.of(ANSWER.accept));
        } else if (tag === 0x46) streamer.receive(Uint8Array.of(ANSWER.chunk));
        else if (tag === 0x45) streamer.receive(Uint8Array.of(ANSWER.done));
        if (tag === 0x56) sent.push(new TextDecoder().decode(bytes));
      },
    });
    const playback = streamer.play(new Int16Array(16), 22_050, {
      volume: 70, signal: new AbortController().signal, onProgress: () => undefined,
    });
    await streamer.setVolume(30);
    releaseStart();
    await playback;
    expect(sent).toEqual(["V030"]);
  });
});
