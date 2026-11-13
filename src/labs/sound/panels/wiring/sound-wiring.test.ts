import { describe, expect, it } from "vitest";
import {
  BOARD_PADS,
  MODULE_PINS,
  modeFromView,
  padById,
  pinY,
  usedPads,
  wirePath,
  wiresFor,
  type CodecMode,
  type SoundPart,
} from "./sound-wiring";

const PARTS: readonly SoundPart[] = ["ics43434", "es8311"];
const MODES: readonly CodecMode[] = ["both", "capture", "playback"];

describe("sound wiring data", () => {
  it.each(PARTS)("every %s wire joins a known pad to a module pin", (part) => {
    for (const wire of wiresFor(part, "both")) {
      expect(padById(wire.pad), wire.id).toBeDefined();
      expect(MODULE_PINS[part]).toContain(wire.pin);
      expect(wirePath(part, wire)).toMatch(/^M \d+ \d+ C /);
    }
  });

  it("connects ground first, then power", () => {
    for (const part of PARTS) {
      const [first, second] = wiresFor(part, "both");
      expect(padById(first?.pad ?? "")?.net).toBe("GND");
      expect(padById(second?.pad ?? "")?.net).toBe("3V3");
    }
  });

  it("matches the lesson pins for the ES8311", () => {
    const net = (pin: string) => padById(wiresFor("es8311", "both").find((w) => w.pin === pin)?.pad ?? "")?.net;
    expect(net("SDA")).toBe("GPIO1");
    expect(net("SCL")).toBe("GPIO6");
    expect(net("BCLK")).toBe("GPIO27");
    expect(net("WS")).toBe("GPIO7");
    expect(net("MCLK")).toBe("GPIO10");
    expect(net("DOUT")).toBe("GPIO24");
    expect(net("DIN")).toBe("GPIO26");
  });

  it("keeps only the data line each codec mode needs", () => {
    const pins = (mode: CodecMode) => wiresFor("es8311", mode).map((w) => w.pin);
    expect(pins("both")).toHaveLength(9);
    expect(pins("capture")).toContain("DOUT");
    expect(pins("capture")).not.toContain("DIN");
    expect(pins("playback")).toContain("DIN");
    expect(pins("playback")).not.toContain("DOUT");
    for (const mode of MODES) expect(wiresFor("ics43434", mode)).toHaveLength(6);
  });

  it("reads the mode from a panel view", () => {
    expect(modeFromView(undefined)).toBe("both");
    expect(modeFromView(1)).toBe("capture");
    expect(modeFromView(2)).toBe("playback");
    expect(modeFromView(9)).toBe("both");
  });

  it("places module pins top to bottom without overlap", () => {
    for (const part of PARTS) {
      const ys = MODULE_PINS[part].map((pin) => pinY(part, pin));
      ys.slice(1).forEach((y, i) => expect(y).toBeGreaterThan((ys[i] ?? 0) + 20));
    }
  });

  it("never draws two pads on the same row", () => {
    expect(new Set(BOARD_PADS.map((pad) => pad.y)).size).toBe(BOARD_PADS.length);
  });

  it("dims the pads an exercise leaves free", () => {
    expect(usedPads("es8311", "playback").has("d6")).toBe(false);
    expect(usedPads("es8311", "capture").has("d6")).toBe(true);
    expect(usedPads("ics43434", "both").has("qwiic-SDA")).toBe(false);
  });
});
