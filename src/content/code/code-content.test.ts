import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "@/domain/code/analyze";
import { createGlossary } from "@/domain/code/glossary";
import { writtenStops } from "@/domain/code/tour";
import { isActive, type LessonEntry } from "@/domain/lesson";
import { envOfCommand } from "@/features/code/queries";
import { collectFirmware } from "../../../tools/firmware/collect";
import { collectMicroPython } from "../../../tools/firmware/micropython";
import { lessonExamples } from "@/features/flasher/lesson-examples";
import { bleLessons } from "../lessons/ble";
import { displayLessons } from "../lessons/display";
import { introLessons } from "../lessons/intro";
import { rfidLessons } from "../lessons/rfid";
import { soundLessons } from "../lessons/sound";
import { wifiLessons } from "../lessons/wifi";
import { GLOSSARY } from "./glossary";
import { TOURS } from "./tours";

// The guide and the firmware live side by side: these checks keep them in step.
// Vitest runs from the project folder; the esp-labs checkout sits next to it.
const firmwareDir = process.env.FIRMWARE_DIR ?? "../esp-labs";
const firmware = collectFirmware(resolve(process.cwd(), firmwareDir));
const byEnv = new Map(firmware.map((e) => [e.env, e]));

describe("code content", () => {
  it("loads all PN532 lessons and their driver from esp-labs", () => {
    const examples = collectMicroPython(resolve(process.cwd(), firmwareDir));
    expect(examples).not.toBeNull();
    const reader = examples?.libraries.find((library) => library.id === "pn532");
    expect(reader?.file).toBe("pn532.py");
    for (let n = 1; n <= 8; n++) {
      const id = `rfid-r${n}-pn532`;
      expect(lessonExamples(`R${n}`)).toEqual([id]);
      expect(examples?.examples.find((example) => example.id === id)?.code).toContain("pn532");
      expect(reader?.examples).toContain(id);
    }
  });
  it("finds the firmware of every lesson and variant that has a command", () => {
    const tracks: readonly (readonly LessonEntry[])[] = [
      introLessons,
      displayLessons,
      wifiLessons,
      rfidLessons,
      bleLessons,
      soundLessons,
    ];
    const lessons = tracks.flat().filter(isActive);
    const commands = lessons.flatMap((l) => [
      l.cmd ?? "",
      ...(l.variants ?? []).map((v) => v.cmd ?? ""),
    ]);
    const envs = commands.map(envOfCommand).filter((e): e is string => !!e);
    // The sound track now uses MicroPython examples instead of eight S3 firmware environments.
    expect(envs.length).toBeGreaterThan(10);
    expect(envs.filter((e) => !byEnv.has(e))).toEqual([]);
  });

  it("packages every sound exercise's MicroPython examples", () => {
    const bundle = collectMicroPython(resolve(process.cwd(), firmwareDir));
    const bundled = new Set(bundle?.examples.map((example) => example.id));
    for (const lesson of soundLessons) {
      for (const id of lessonExamples(lesson.id)) expect(bundled.has(id), `${lesson.id}: ${id}`).toBe(true);
    }
  });

  it("anchors every hand-written tour stop in the current code", () => {
    for (const tour of TOURS) {
      const env = byEnv.get(tour.env);
      expect(env, tour.env).toBeDefined();
      for (const spec of tour.files) {
        const text = env?.files.find((f) => f.path === spec.path)?.text;
        expect(text, spec.path).toBeDefined();
        const { stops, problems } = writtenStops(spec, analyze(text ?? ""));
        expect(problems).toEqual([]);
        expect(stops).toHaveLength(spec.stops.length);
      }
    }
  });

  it("has a phrasebook with unique ids and match keys", () => {
    const ids = GLOSSARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(createGlossary(GLOSSARY).byId.size).toBe(GLOSSARY.length);
  });
});
