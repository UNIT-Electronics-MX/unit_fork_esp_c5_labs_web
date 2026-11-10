import { describe, expect, it } from "vitest";
import { padsBySide } from "./pad-directory";

describe("padsBySide", () => {
  it("lists each side top to bottom, as on the board", () => {
    const all = Array.from({ length: 30 }, (_, at) => at);
    const [left, right] = padsBySide(all);
    expect(left?.side).toBe("L");
    expect(left?.positions).toEqual(all.slice(0, 15));
    expect(right?.side).toBe("R");
    expect(right?.positions).toEqual(all.slice(15).reverse());
  });

  it("keeps only the sides that still have pads", () => {
    expect(padsBySide([20, 3, 29])).toEqual([
      { side: "L", positions: [3] },
      { side: "R", positions: [29, 20] },
    ]);
    expect(padsBySide([])).toEqual([]);
  });
});
