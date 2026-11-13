import { describe, expect, it } from "vitest";
import { ANSWER, encodeEnd, encodeFrame, encodeStart, encodeVolume, MAX_FRAME_BYTES, readAnswers } from "./play-protocol";

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("commands to the board", () => {
  it("encodes the start as P and a five-digit rate", () => {
    expect(text(encodeStart(22_050))).toBe("P22050");
    expect(text(encodeStart(8_000))).toBe("P08000");
  });

  it("encodes a frame as F, the base64 length and the little-endian samples in base64", () => {
    // 1, -2, 256 -> 01 00 | FE FF | 00 01 -> "AQD+/wAB"
    expect(text(encodeFrame(Int16Array.of(1, -2, 256)))).toBe("F0008AQD+/wAB");
  });

  it("never sends a byte the MicroPython console would act on, whatever the audio holds", () => {
    const loud = Int16Array.from({ length: 512 }, (_, i) => (i % 2 ? 0x0303 : -0x7d00 + i)); // bytes 0x03 and 0x04 everywhere
    for (const bytes of [encodeStart(22_050), encodeFrame(loud), encodeVolume(55), encodeEnd()]) {
      expect(bytes.every((byte) => byte >= 0x20 && byte < 0x7f)).toBe(true);
    }
  });

  it("refuses empty or oversized frames", () => {
    expect(() => encodeFrame(new Int16Array(0))).toThrow(RangeError);
    expect(() => encodeFrame(new Int16Array(MAX_FRAME_BYTES / 2 + 1))).toThrow(RangeError);
    expect(encodeFrame(new Int16Array(MAX_FRAME_BYTES / 2)).length).toBe(5 + MAX_FRAME_BYTES / 3 * 4);
  });

  it("clamps the volume and encodes the end", () => {
    expect(text(encodeVolume(250))).toBe("V100");
    expect(text(encodeVolume(-4))).toBe("V000");
    expect(text(encodeVolume(55))).toBe("V055");
    expect(text(encodeEnd())).toBe("E");
  });
});

describe("readAnswers", () => {
  it("counts answers and ignores the board's text lines", () => {
    const text = new TextEncoder().encode("PLAYER,READY\r\n");
    const bytes = Uint8Array.of(ANSWER.accept, ANSWER.chunk, ANSWER.chunk, ...text, ANSWER.done, ANSWER.reject);
    expect(readAnswers(bytes)).toEqual({ accept: 1, reject: 1, chunks: 2, done: 1 });
  });

  it("never mistakes ordinary letters for answers", () => {
    expect(readAnswers(new TextEncoder().encode("PLAYER,READY ADKN"))).toEqual({ accept: 0, reject: 0, chunks: 0, done: 0 });
  });
});
