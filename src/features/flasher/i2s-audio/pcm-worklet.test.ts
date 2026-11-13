import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

interface TestProcessor {
  port: {
    onmessage: ((event: { data: { type: string; samples: Int16Array } }) => void) | null;
    messages: { type: string }[];
  };
  target: number;
  process(inputs: unknown[], outputs: Float32Array[][]): boolean;
}

function makeProcessor(): TestProcessor {
  const processors = new Map<string, new () => TestProcessor>();
  const source = readFileSync(resolve("public/pcm-worklet.js"), "utf8");
  runInNewContext(source, {
    AudioWorkletProcessor: class {
      port = {
        onmessage: null,
        messages: [] as { type: string }[],
        postMessage(message: { type: string }) { this.messages.push(message); },
      };
    },
    registerProcessor: (name: string, processor: new () => TestProcessor) => processors.set(name, processor),
    Int16Array,
    Math,
  });
  const Processor = processors.get("pulsar-pcm-queue");
  if (!Processor) throw new Error("PCM processor was not registered");
  return new Processor();
}

function feed(processor: TestProcessor, count: number, value = 8192) {
  for (let i = 0; i < count; i++) {
    processor.port.onmessage?.({ data: { type: "pcm", samples: new Int16Array(512).fill(value) } });
  }
}

function render(processor: TestProcessor): Float32Array {
  const channel = new Float32Array(128);
  processor.process([], [[channel]]);
  return channel;
}

describe("PCM audio worklet", () => {
  it("prebuffers the stream and plays through packet boundaries continuously", () => {
    const processor = makeProcessor();
    feed(processor, 11);
    expect(render(processor).every((sample) => sample === 0)).toBe(true);
    feed(processor, 1);
    for (let i = 0; i < 4; i++) render(processor);
    const afterBoundary = render(processor);

    expect(afterBoundary[0]).toBeCloseTo(0.25, 5);
    expect(afterBoundary[127]).toBeCloseTo(0.25, 5);
    expect(processor.port.messages).toEqual([]);
  });

  it("fades out at an underrun and can restart after adapting its buffer", () => {
    const processor = makeProcessor();
    feed(processor, 12);
    for (let i = 0; i < 48; i++) render(processor);
    expect(render(processor).every((sample) => sample === 0)).toBe(true);
    expect(processor.port.messages).toEqual([{ type: "rebuffer" }]);
    feed(processor, 14);
    expect(render(processor).every((sample) => sample === 0)).toBe(true);
    feed(processor, 1);
    const resumed = render(processor);
    expect(resumed[0]).toBeGreaterThan(0);
    expect(resumed[0]).toBeLessThan(resumed[127] ?? 0);
  });

  it("caps a burst without getting stuck at the largest prebuffer target", () => {
    const processor = makeProcessor();
    processor.target = 14_400;
    feed(processor, 40);

    expect(processor.port.messages.length).toBeGreaterThan(0);
    expect(render(processor)[127]).toBeGreaterThan(0);
  });
});
