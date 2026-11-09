import { describe, expect, it } from "vitest";
import { makeFlashPlan, requireEsp32C5 } from "./flash-plan";

const bin = (name: string, size: number) => new File([new Uint8Array(size)], name);

describe("C5 flash plan", () => {
  it("accepts a merged image at zero and orders separate images", () => {
    expect(makeFlashPlan([{ id: 1, file: bin("merged.bin", 42), address: "0x0" }])[0]?.address).toBe(0);
    expect(makeFlashPlan([
      { id: 1, file: bin("app.bin", 4), address: "0x10000" },
      { id: 2, file: bin("boot.bin", 4), address: "0x2000" },
    ]).map((entry) => entry.address)).toEqual([0x2000, 0x10000]);
  });

  it("rejects missing files, unaligned offsets and erase-sector overlap", () => {
    expect(() => makeFlashPlan([{ id: 1, file: null, address: "0x0" }])).toThrow("invalidFile");
    expect(() => makeFlashPlan([{ id: 1, file: bin("a.bin", 1), address: "" }])).toThrow("invalidAddress");
    expect(() => makeFlashPlan([{ id: 1, file: bin("a.bin", 1), address: "0x10" }])).toThrow("invalidAddress");
    expect(() => makeFlashPlan([
      { id: 1, file: bin("a.bin", 0x1001), address: "0x0" },
      { id: 2, file: bin("b.bin", 1), address: "0x1000" },
    ])).toThrow("overlap");
  });

  it("refuses another chip before writing", () => {
    expect(() => requireEsp32C5("ESP32-S3")).toThrow("wrongChip");
    expect(() => requireEsp32C5(undefined)).toThrow("wrongChip");
    expect(() => requireEsp32C5("ESP32-C5")).not.toThrow();
  });
});
