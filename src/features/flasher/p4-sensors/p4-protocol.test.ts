import { describe, expect, it } from "vitest";
import { parseP4Line } from "./p4-protocol";

describe("parseP4Line", () => {
  it("reads a complete sample from the board", () => {
    expect(parseP4Line("P4,0,31,28.62,45.59,786.56,30.89,466.55,47,4.202,107.5,-2311,1494,-971\r")).toEqual({
      sequence: 0, mask: 31,
      climate: { temperature: 28.62, humidity: 45.59 },
      pressure: { hpa: 786.56, temperature: 30.89 },
      light: { lux: 466.55, proximity: 47 },
      battery: { volts: 4.202, charge: 107.5 },
      magnetic: [-2311, 1494, -971],
    });
  });

  it("shows only the two available sensors when mask is five", () => {
    expect(parseP4Line("P4,106,5,28.57,45.76,-,-,230.75,48,-,-,-,-,-")?.mask).toBe(5);
    expect(parseP4Line("P4,106,5,28.57,45.76,-,-,230.75,48,-,-,-,-,-")?.pressure).toBeNull();
  });

  it("rejects REPL output, missing fields, blanks and invalid masked values", () => {
    expect(parseP4Line("P4 sensor bus: 0x30, 0x44")).toBeNull();
    expect(parseP4Line("P4_WARN,MMC5603 read: OSError(5)")).toBeNull();
    expect(parseP4Line("P4,1,31,28,50")).toBeNull();
    expect(parseP4Line("P4,1,1,28,,-,-,-,-,-,-,-,-,-")).toBeNull();
    expect(parseP4Line("P4,1,2,28,50,-,-,-,-,-,-,-,-,-")).toBeNull();
  });
});
