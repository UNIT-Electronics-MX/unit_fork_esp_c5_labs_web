import { afterEach, describe, expect, it, vi } from "vitest";
import { PcmPlayer } from "./pcm-player";

class FakeGain {
  gain = {
    value: 1,
    setTargetAtTime: vi.fn((value: number) => { this.gain.value = value; }),
  };
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakePort {
  onmessage: ((event: MessageEvent<{ type: string }>) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
  emit(type: string) { this.onmessage?.({ data: { type } } as MessageEvent<{ type: string }>); }
}

class FakeNode {
  port = new FakePort();
  onprocessorerror: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: vi.fn(async () => {}) };
  gain = new FakeGain();
  createGain() { return this.gain; }
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
}

afterEach(() => vi.unstubAllGlobals());

describe("PcmPlayer", () => {
  it("passes PCM to a dedicated worklet queue without changing the original samples", async () => {
    const context = new FakeAudioContext();
    const node = new FakeNode();
    const rebuffer = vi.fn();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    vi.stubGlobal("AudioWorkletNode", class { constructor() { return node; } });
    const player = new PcmPlayer(rebuffer);
    const samples = new Int16Array([8192, -8192]);

    player.setGain(4);
    await player.start();
    player.enqueue(samples);
    player.setGain(8);
    node.port.emit("rebuffer");

    expect(context.audioWorklet.addModule).toHaveBeenCalledWith(expect.stringContaining("pcm-worklet.js"));
    expect(context.resume.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      context.audioWorklet.addModule.mock.invocationCallOrder[0] ?? 0,
    );
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: "pcm", samples });
    expect(samples).toEqual(new Int16Array([8192, -8192]));
    expect(node.connect).toHaveBeenCalledWith(context.gain);
    expect(context.gain.gain.setTargetAtTime).toHaveBeenCalledWith(8, 0, 0.01);
    expect(rebuffer).toHaveBeenCalledOnce();

    await player.stop();
    expect(node.port.close).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("closes the audio context if the worklet module cannot load", async () => {
    const context = new FakeAudioContext();
    context.audioWorklet.addModule.mockRejectedValueOnce(new Error("module failed"));
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = new PcmPlayer();

    await expect(player.start()).rejects.toThrow("module failed");
    await player.stop();

    expect(context.close).toHaveBeenCalledOnce();
  });
});
