import { describe, expect, it } from "vitest";
import { canOpenLessonCode, lessonExamples, pickExamples, showsImuCube, streamsWebAudio } from "./lesson-examples";

describe("lessonExamples", () => {
  it("separates the listening-only microphone scripts from the codec's capture and playback scripts", () => {
    expect(lessonExamples("S0")).toEqual(["ics43434-j20", "ics43434-usb-audio"]);
    expect(lessonExamples("S0B")).toEqual(["es8311-mic-capture", "es8311-mic-usb-audio", "es8311-melody", "es8311-tone-lab", "es8311-play-serial", "es8311-mic-diagnose"]);
  });

  it("opens the codec sound practices without duplicating listening or speaker", () => {
    const expected = [
      ["S2", "es8311-sound-loudness"],
      ["S3", "es8311-sound-clap"], ["S4", "es8311-sound-recorder"],
      ["S5", "es8311-sound-spectrum"], ["S6", "es8311-sound-game"],
      ["S8", "es8311-sound-voice-fx"],
    ];
    for (const [lesson, example] of expected) {
      expect(lessonExamples(lesson ?? "")[0]).toBe(example);
      expect(canOpenLessonCode({ id: lesson ?? "" })).toBe(true);
    }
    expect(lessonExamples("S1")).toEqual([]);
    expect(lessonExamples("S7")).toEqual([]);
  });

  it("opens the listening dialog only for scripts that stream browser audio", () => {
    expect(streamsWebAudio("ics43434-usb-audio")).toBe(true);
    expect(streamsWebAudio("es8311-mic-usb-audio")).toBe(true);
    expect(streamsWebAudio("es8311-mic-capture")).toBe(false);
  });

  it("opens the scanner first and every on-board sensor in P4", () => {
    const ids = lessonExamples("P4");
    expect(ids[0]).toBe("i2c-scan");
    expect(ids[1]).toBe("p4-sensor-stream");
    expect(ids).toHaveLength(7);
  });

  it("opens each PN532 MicroPython script from the firmware manifest", () => {
    for (let n = 1; n <= 8; n++) {
      expect(lessonExamples(`R${n}`)).toEqual([`rfid-r${n}-pn532`]);
    }
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

describe("canOpenLessonCode", () => {
  const languages = [{ key: "arduino" }, { key: "micropython" }];

  it("opens only the selected exercise's MicroPython workspace", () => {
    expect(canOpenLessonCode({ id: "S0" })).toBe(true);
    expect(canOpenLessonCode({ id: "S0B" })).toBe(true);
    expect(canOpenLessonCode({ id: "P5", variants: languages, variantKey: "micropython" })).toBe(true);
    expect(canOpenLessonCode({ id: "00", variants: languages, variantKey: "micropython" })).toBe(true);
  });

  it("closes Arduino sketches and the Arduino setup", () => {
    expect(canOpenLessonCode({ id: "P5", variants: languages, variantKey: "arduino" })).toBe(false);
    expect(canOpenLessonCode({ id: "00", variants: languages, variantKey: "arduino" })).toBe(false);
  });
});

describe("showsImuCube", () => {
  it("shows the cube in D1, which offers its script", () => {
    expect(showsImuCube("D1")).toBe(true);
    expect(lessonExamples("D1")).toContain("imu-bmi270-cube");
    expect(showsImuCube("P4")).toBe(false);
  });
});
