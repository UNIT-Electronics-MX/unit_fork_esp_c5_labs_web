import { describe, expect, it } from "vitest";
import {
  PULSAR_EDGE,
  PULSAR_HEADER,
  pulsarAvoidReason,
  pulsarMissing,
  pulsarPadClass,
  pulsarPosition,
  pulsarRow,
  pulsarSide,
  pulsarSilk,
  pulsarUsage,
} from "./pulsar";

describe("PULSAR_HEADER", () => {
  it("has two edges of 15 positions and each GPIO once", () => {
    expect(PULSAR_HEADER).toHaveLength(2 * PULSAR_EDGE);
    const gpios = PULSAR_HEADER.map((p) => p.pin).filter((p) => /^\d+$/.test(p));
    expect(gpios.length).toBe(new Set(gpios).size);
  });
});

describe("pulsarPosition", () => {
  it("finds a GPIO by number and a repeated rail by its index", () => {
    expect(pulsarPosition({ pin: "27", role: "LED", side: "L" })).toBe(0);
    expect(pulsarPosition({ pin: "GND", role: "GND", side: "R", idx: 18 })).toBe(18);
    expect(pulsarPosition({ pin: "GND", role: "GND", side: "L" })).toBe(12);
  });

  it("ignores an index that does not carry the pin, and unknown pins", () => {
    expect(pulsarPosition({ pin: "GND", role: "GND", side: "L", idx: 0 })).toBe(12);
    expect(pulsarPosition({ pin: "48", role: "RGB", side: "R" })).toBe(-1);
  });
});

describe("pulsarSide", () => {
  it("splits the header at position 16", () => {
    expect(pulsarSide(14)).toBe("L");
    expect(pulsarSide(15)).toBe("R");
  });
});

describe("pulsarUsage", () => {
  it("groups lesson pins by header position, in header order", () => {
    const usage = pulsarUsage([
      { pin: "3", role: "SCL", side: "L" },
      { pin: "2", role: "SDA", side: "L" },
      { pin: "99", role: "x", side: "L" },
    ]);
    expect([...usage.keys()]).toEqual([7, 8]);
    expect(usage.get(7)?.[0]?.role).toBe("SDA");
  });
});

describe("drawing helpers", () => {
  it("runs the left edge down and the right edge up", () => {
    expect(pulsarRow(0)).toEqual({ side: "L", row: 0 });
    expect(pulsarRow(29)).toEqual({ side: "R", row: 0 });
    expect(pulsarRow(15)).toEqual({ side: "R", row: 14 });
  });

  it("names and classes pads", () => {
    expect(PULSAR_HEADER.map(pulsarSilk).slice(0, 3)).toEqual(["D13", "3V3", "EN"]);
    expect(pulsarPadClass("27")).toBe("strapping");
    expect(pulsarPadClass("13")).toBe("bus");
    expect(pulsarPadClass("11")).toBe("bus");
    expect(pulsarPadClass("RST")).toBe("control");
    expect(pulsarPadClass("0")).toBe("neopixel");
    expect(pulsarPadClass("DOUT")).toBe("neopixel");
    expect(pulsarPadClass("4")).toBe("safe");
    expect(pulsarPadClass("VIN")).toBe("power");
    expect(pulsarPadClass("GND")).toBe("gnd");
  });

  it("gives every pad that needs care its own reason", () => {
    expect(pulsarAvoidReason("27")).toBe("strapping");
    expect(pulsarAvoidReason("13")).toBe("usb");
    expect(pulsarAvoidReason("11")).toBe("uart");
    expect(pulsarAvoidReason("EN")).toBe("control");
    expect(pulsarAvoidReason("4")).toBeNull();
    for (const { pin } of PULSAR_HEADER) {
      const careful = ["strapping", "bus", "control"].includes(pulsarPadClass(pin));
      expect(pulsarAvoidReason(pin) !== null).toBe(careful);
    }
  });
});

describe("ESP32-S3 lesson pins", () => {
  it("land on the same GPIO number, take 5V as VUSB, and list the rest as missing", () => {
    const pins = [
      { pin: "4", role: "LED +", side: "L" },
      { pin: "5V", role: "VCC", side: "L" },
      { pin: "GND", role: "GND", side: "L", idx: 21 },
      { pin: "48", role: "RGB", side: "R" },
    ] as const;
    expect(pins.map(pulsarPosition)).toEqual([5, 11, 12, -1]);
    expect(pulsarMissing(pins).map((p) => p.pin)).toEqual(["48"]);
  });
});
