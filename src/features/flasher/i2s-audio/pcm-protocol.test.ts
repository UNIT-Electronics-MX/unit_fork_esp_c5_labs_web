import { describe, expect, it } from "vitest";
import { PcmProtocol, pcmLevel } from "./pcm-protocol";

function frame(samples: number[]): Uint8Array {
  const bytes = new Uint8Array(6 + samples.length * 2);
  bytes.set([65, 85, samples.length & 255, samples.length >> 8]);
  let checksum = 0;
  samples.forEach((sample, i) => {
    const word = sample & 0xffff;
    bytes[4 + i * 2] = word & 255;
    bytes[5 + i * 2] = word >> 8;
    checksum = (checksum + word) & 0xffff;
  });
  bytes[bytes.length - 2] = checksum & 255;
  bytes[bytes.length - 1] = checksum >> 8;
  return bytes;
}

describe("PcmProtocol", () => {
  it("waits for RAW and reassembles split signed PCM frames", () => {
    const parser = new PcmProtocol();
    expect(parser.push(new TextEncoder().encode("REPL\nRA")).ready).toBe(false);
    const packet = frame([-32768, -1, 0, 1234, 32767]);
    expect(parser.push(new Uint8Array([87, 13, 10, ...packet.slice(0, 5)])).frames).toHaveLength(0);
    expect(parser.push(packet.slice(5)).frames[0]).toEqual(new Int16Array([-32768, -1, 0, 1234, 32767]));
  });

  it("discards a damaged frame and recovers at the next AU marker", () => {
    const parser = new PcmProtocol();
    const bad = frame([100, 200]);
    bad[4] = 0;
    const result = parser.push(new Uint8Array([82, 65, 87, 13, 10, ...bad, ...frame([300])]));
    expect(result.resyncs).toBeGreaterThan(0);
    expect(result.frames).toEqual([new Int16Array([300])]);
  });

  it("only reports a signal for nontrivial PCM level", () => {
    expect(pcmLevel(new Int16Array(512)).signal).toBe(false);
    expect(pcmLevel(new Int16Array([100, 100])).signal).toBe(false);
    expect(pcmLevel(new Int16Array([100, -100])).signal).toBe(true);
  });
});
