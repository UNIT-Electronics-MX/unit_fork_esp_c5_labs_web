import { describe, expect, it } from "vitest";
import { LABEL_REACH, pinoutMargin, tagWidth } from "./pinout-margin";

describe("pinoutMargin", () => {
  const labelsOnly = pinoutMargin([]);
  const full = pinoutMargin(["a very long role label that would not fit beside the board"]);

  it("leaves room for the printed labels only when no pad has a role", () => {
    expect(labelsOnly).toBe(72);
  });

  it("grows with the widest role tag", () => {
    const short = pinoutMargin(["LED"]);
    const long = pinoutMargin(["LED", "SDA · bus"]);
    expect(short).toBeGreaterThan(labelsOnly);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(full);
    expect(long - short).toBe(Math.ceil(tagWidth("SDA · bus") - tagWidth("LED")));
  });

  it("never exceeds the full margin", () => {
    expect(full).toBe(178);
  });

  it("moves everything out when the labels reach further", () => {
    const extra = 82;
    expect(pinoutMargin([], LABEL_REACH + extra)).toBe(labelsOnly + extra);
    expect(pinoutMargin(["LED"], LABEL_REACH + extra)).toBe(pinoutMargin(["LED"]) + extra);
  });
});
