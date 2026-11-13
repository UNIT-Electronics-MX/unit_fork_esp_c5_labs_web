import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bundledFirmware } from "./bundled-firmware";

describe("bundled MicroPython firmware", () => {
  it("matches every public binary and keeps each board's flash offset", () => {
    expect(bundledFirmware.pulsar.address).toBe(0x0000);
    expect(bundledFirmware.generic.address).toBe(0x2000);
    expect(bundledFirmware.sparkfun.address).toBe(0x2000);
    for (const firmware of Object.values(bundledFirmware)) {
      const bytes = readFileSync(resolve(process.cwd(), "public", firmware.filename));
      expect(bytes.byteLength).toBe(firmware.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(firmware.sha256);
    }
  });

  it("uses the zero-offset image with exactly one 0x2000-byte padding prefix", () => {
    const merged = readFileSync(resolve(process.cwd(), "public", bundledFirmware.pulsar.filename));
    const bootloaderOffsetImage = readFileSync(resolve(process.cwd(), "public", "MicroPython-PulsarC5-v1.30.0-preview.288.gc85c2cbb80.dirty.bin"));
    expect(merged.subarray(0, 0x2000).every((byte) => byte === 0xff)).toBe(true);
    expect(merged.subarray(0x2000)).toEqual(bootloaderOffsetImage);
  });
});
