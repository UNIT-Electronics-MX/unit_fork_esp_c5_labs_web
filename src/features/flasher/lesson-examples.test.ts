import { describe, expect, it } from "vitest";
import { lessonExamples, pickExamples } from "./lesson-examples";

describe("lessonExamples", () => {
  it("opens the scanner first and every on-board sensor in P4", () => {
    const ids = lessonExamples("P4");
    expect(ids[0]).toBe("i2c-scan");
    expect(ids).toHaveLength(6);
  });

  it("is empty for a lesson without MicroPython examples", () => {
    expect(lessonExamples("W1")).toEqual([]);
  });
});

describe("pickExamples", () => {
  it("keeps the lesson order and skips ids the manifest lacks", () => {
    const examples = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pickExamples(examples, ["c", "missing", "a"]).map((example) => example.id)).toEqual(["c", "a"]);
  });
});
