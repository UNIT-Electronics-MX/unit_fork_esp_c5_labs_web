import { describe, expect, it } from "vitest";
import { bleWidgets } from "@/labs/ble/widgets";
import { displayWidgets } from "@/labs/display/widgets";
import { introWidgets } from "@/labs/intro/widgets";
import { rfidWidgets } from "@/labs/rfid/widgets";
import { soundWidgets } from "@/labs/sound/widgets";
import { wifiWidgets } from "@/labs/wifi/widgets";
import { pulsarPosition, pulsarSide } from "@/domain/pulsar";
import { LESSON_PART } from "./icons";
import { LESSON_KIT } from "./kit";
import { trackLessonsQuery } from "./queries";
import { boardOfLesson, LANGUAGE_LESSON_IDS, TRACKS } from "./tracks";
import { followsCodePlatform, isActive, resolveLesson } from "@/domain/lesson";

describe("content", () => {
  it.each(TRACKS.filter((t) => !t.planned))(
    "the $id table of contents matches its lessons file",
    async (track) => {
      const lessons = await trackLessonsQuery(track.id, "en").queryFn!({} as never);
      expect(lessons.map((l) => l.id)).toEqual(track.lessonIds);
      expect(lessons.every((l) => l.track === track.id)).toBe(true);
    },
  );

  it("gives every lesson in the table of contents its own part, and no stray ones", () => {
    const ids = TRACKS.flatMap((t) => t.lessonIds);
    expect(ids.filter((id) => !LESSON_PART[id])).toEqual([]);
    expect(Object.keys(LESSON_PART).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("lists the kit of every open lesson, and no stray ones", async () => {
    const lessons = await Promise.all(
      TRACKS.filter((t) => !t.planned).map((t) =>
        trackLessonsQuery(t.id, "en").queryFn!({} as never),
      ),
    );
    const open = lessons.flat().filter((l) => l.kind === "lesson").map((l) => l.id);
    expect(open.filter((id) => !LESSON_KIT[id])).toEqual([]);
    expect(Object.keys(LESSON_KIT).filter((id) => !open.includes(id))).toEqual([]);
  });

  it("lists exactly the lessons that follow the top bar's Arduino/MicroPython choice", async () => {
    const lessons = await Promise.all(
      TRACKS.filter((t) => !t.planned).map((t) => trackLessonsQuery(t.id, "en").queryFn!({} as never)),
    );
    const following = lessons.flat().filter((l) => isActive(l) && followsCodePlatform(l)).map((l) => l.id);
    expect(following.sort()).toEqual([...LANGUAGE_LESSON_IDS].sort());
  });

  it("has no widget id registered by two tracks", () => {
    const ids = [
      introWidgets,
      displayWidgets,
      wifiWidgets,
      rfidWidgets,
      bleWidgets,
      soundWidgets,
    ].flatMap((m) => Object.keys(m));
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("places every C5 lesson pin on the Pulsar header", async () => {
    const tracks = TRACKS.filter((track) => !track.planned);
    const contents = await Promise.all(tracks.map((track) => trackLessonsQuery(track.id, "en").queryFn!({} as never)));
    const misplaced = contents.flat()
      .filter((lesson) => lesson.kind === "lesson" && boardOfLesson(lesson.id) === "pulsar-c5")
      .flatMap((lesson) => (lesson.kind === "lesson" ? (lesson.pins ?? []).map((p) => ({ id: lesson.id, p })) : []))
      .filter(({ p }) => {
        const at = pulsarPosition(p);
        return at < 0 || pulsarSide(at) !== p.side || (p.idx !== undefined && p.idx !== at);
      });
    expect(misplaced).toEqual([]);
  });

  it("knows which board each lesson is wired on", () => {
    expect(boardOfLesson("00")).toBe("pulsar-c5");
    expect(boardOfLesson("01")).toBe("pulsar-c5");
    expect(boardOfLesson("02")).toBe("pulsar-c5");
    expect(boardOfLesson("P4")).toBe("pulsar-c5");
    expect(boardOfLesson("O2")).toBe("pulsar-c5");
    expect(boardOfLesson("O3")).toBe("pulsar-c5");
    expect(boardOfLesson("I1")).toBe("pulsar-c5");
    expect(boardOfLesson("I2")).toBe("pulsar-c5");
    expect(boardOfLesson("W1")).toBe("devkitc-s3");
    expect(boardOfLesson("B1")).toBe("devkitc-s3");
    expect(boardOfLesson("R1")).toBe("devkitc-s3");
    expect(boardOfLesson("nope")).toBe("devkitc-s3");
  });

  it.each([
    { track: "wifi" as const, id: "I1" },
    { track: "ble" as const, id: "I2" },
  ])("keeps the C5 $id example and both code variants in $track", async ({ track, id }) => {
    const lessons = await trackLessonsQuery(track, "es").queryFn!({} as never);
    const lesson = lessons.find((entry) => entry.id === id);
    expect(lesson && isActive(lesson)).toBe(true);
    if (!lesson || !isActive(lesson)) return;
    expect(lesson.track).toBe(track);
    expect(lesson.variants?.map((variant) => variant.key)).toEqual(["arduino", "micropython"]);
    expect(resolveLesson(lesson, "arduino").cmd).toContain("arduino-cli");
    expect(resolveLesson(lesson, "micropython").cmd).toBe("");
    expect(lesson.title).not.toBe(track === "wifi" ? "Wi-Fi to the cloud" : "Bluetooth LE touch");
  });

  it("keeps Arduino and MicroPython variants through the three C5 intro lessons", async () => {
    const lessons = await trackLessonsQuery("intro", "es").queryFn!({} as never);
    for (const id of ["00", "01", "02"]) {
      const lesson = lessons.find((entry) => entry.id === id);
      expect(lesson && isActive(lesson)).toBe(true);
      if (!lesson || !isActive(lesson)) continue;
      expect(lesson.variants?.map((variant) => variant.key)).toEqual(["arduino", "micropython"]);
      expect(resolveLesson(lesson, "arduino").cmd).toContain("arduino-cli");
      expect(resolveLesson(lesson, "micropython").cmd).toBe("");
    }
    const setup = lessons.find((entry) => entry.id === "00");
    if (!setup || !isActive(setup)) return;
    const micropython = resolveLesson(setup, "micropython");
    expect(micropython.steps.join(" ")).toContain("0x2000");
    expect(micropython.steps.join(" ")).toContain("Firmware y consola");
    expect(micropython.steps.join(" ")).toContain("ESP32_GENERIC_C5");
  });

  it("uses unique lesson ids across tracks", () => {
    const ids = TRACKS.flatMap((t) => t.lessonIds);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
