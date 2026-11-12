import { describe, expect, it } from "vitest";
import { lessonExamples, pickExamples, showsImuCube } from "./lesson-examples";

describe("lessonExamples", () => {
  it("opens the scanner first and every on-board sensor in P4", () => {
    const ids = lessonExamples("P4");
    expect(ids[0]).toBe("i2c-scan");
    expect(ids[1]).toBe("p4-sensor-stream");
    expect(ids).toHaveLength(7);
  });

  it("is empty for a lesson without MicroPython examples", () => {
    expect(lessonExamples("R1")).toEqual([]);
  });

  it("opens basic Wi-Fi scripts first and keeps the advanced W2 and W3 scripts", () => {
    expect(lessonExamples("W1")).toEqual(["wifi-w1-scan"]);
    expect(lessonExamples("W2")).toEqual(["wifi-w2-display", "wifi-w2-basic", "wifi-w2-phone"]);
    expect(lessonExamples("W3")).toEqual(["wifi-w3-basic", "wifi-w3-oracle"]);
  });
});

describe("pickExamples", () => {
  it("keeps the lesson order and skips ids the manifest lacks", () => {
    const examples = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pickExamples(examples, ["c", "missing", "a"]).map((example) => example.id)).toEqual(["c", "a"]);
  });
});

describe("showsImuCube", () => {
  it("shows the cube in D1, which offers its script", () => {
    expect(showsImuCube("D1")).toBe(true);
    expect(lessonExamples("D1")).toContain("imu-bmi270-cube");
    expect(showsImuCube("P4")).toBe(false);
  });
});
