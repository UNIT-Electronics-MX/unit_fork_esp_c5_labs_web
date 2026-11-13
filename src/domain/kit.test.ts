import { describe, expect, it } from "vitest";
import { kitParts, matchKit, type LessonKit } from "./kit";

const exampleKit: LessonKit = { need: [["tft"], ["micA", "micB"]], optional: ["speaker"] };

describe("matchKit", () => {
  it("is ready when the lesson needs nothing beyond the board", () => {
    expect(matchKit({ need: [] }, new Set<string>())).toEqual({ fit: "ready", missing: [] });
  });

  it("accepts any one part of an either-or requirement", () => {
    expect(matchKit(exampleKit, new Set(["tft", "micB"])).fit).toBe("ready");
    expect(matchKit(exampleKit, new Set(["tft", "micA"])).fit).toBe("ready");
  });

  it("is near when exactly one requirement is missing, and names it", () => {
    expect(matchKit(exampleKit, new Set(["tft"]))).toEqual({
      fit: "near",
      missing: [["micA", "micB"]],
    });
  });

  it("is far when two or more are missing; optional parts never count", () => {
    expect(matchKit(exampleKit, new Set(["speaker"]))).toEqual({
      fit: "far",
      missing: [["tft"], ["micA", "micB"]],
    });
  });
});

describe("kitParts", () => {
  it("collects required and optional parts once", () => {
    expect([...kitParts(exampleKit)]).toEqual(["tft", "micA", "micB", "speaker"]);
  });
});
