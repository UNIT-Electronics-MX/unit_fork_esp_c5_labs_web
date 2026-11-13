import { afterEach, describe, expect, it, vi } from "vitest";
import { PcmPlayer } from "./pcm-player";

class FakeGain {
  gain = {
    value: 1,
    setTargetAtTime: vi.fn((value: number) => { this.gain.value = value; }),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeSource {
  buffer: FakeBuffer | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeBuffer {
  data: Float32Array;
  constructor(length: number) { this.data = new Float32Array(length); }
  getChannelData() { return this.data; }
}

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  gain = new FakeGain();
  sources: FakeSource[] = [];
  envelopes: FakeGain[] = [];
  buffer: FakeBuffer | null = null;
  createGain() {
    if (!this.envelopes.length) {
      this.envelopes.push(this.gain);
      return this.gain;
    }
    const envelope = new FakeGain();
    this.envelopes.push(envelope);
    return envelope;
  }
  createBuffer(_channels: number, length: number) {
    this.buffer = new FakeBuffer(length);
    return this.buffer;
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  async resume() { /* Already running. */ }
  async close() { this.state = "closed"; }
}

afterEach(() => vi.unstubAllGlobals());

describe("PcmPlayer", () => {
  it("raises browser playback gain without modifying the decoded PCM samples", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = new PcmPlayer();
    const samples = new Int16Array([8192, -8192]);

    player.setGain(4);
    await player.start();
    player.enqueue(samples);
    player.setGain(8);

    expect(context.sources[0]?.connect).toHaveBeenCalledWith(context.envelopes[1]);
    expect(context.envelopes[1]?.connect).toHaveBeenCalledWith(context.gain);
    expect(context.gain.gain.setTargetAtTime).toHaveBeenCalledWith(8, 0, 0.01);
    expect(context.buffer?.data).toEqual(new Float32Array([0.25, -0.25]));
    expect(samples).toEqual(new Int16Array([8192, -8192]));
    await player.stop();
  });

  it("buffers late serial frames without stopping a playing source mid-sample", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = new PcmPlayer();
    await player.start();

    expect(player.enqueue(new Int16Array(512).fill(1600))).toBe(false);
    expect(context.sources[0]?.start).toHaveBeenCalledWith(0.12);
    context.currentTime = 0.2;
    expect(player.enqueue(new Int16Array(512).fill(1600))).toBe(true);
    expect(context.sources[0]?.stop).not.toHaveBeenCalled();
    expect(context.sources[1]?.start).toHaveBeenCalledWith(0.36);
    expect(context.envelopes[2]?.gain.setValueAtTime).toHaveBeenCalledWith(0, 0.36);
    context.currentTime = 0.5;
    expect(player.enqueue(new Int16Array(512).fill(1600))).toBe(true);
    expect(context.sources[2]?.start).toHaveBeenCalledWith(0.7);
    await player.stop();
  });

  it("keeps consecutive frames joined without a fade at every packet boundary", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = new PcmPlayer();
    await player.start();

    player.enqueue(new Int16Array(512));
    player.enqueue(new Int16Array(512));

    expect(context.envelopes[1]?.gain.cancelScheduledValues).toHaveBeenCalledOnce();
    expect(context.envelopes[2]?.gain.setValueAtTime).toHaveBeenCalledWith(1, 0.12 + 512 / 48_000);
    await player.stop();
  });
});
