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
      .filter(isActive)
      .flatMap((lesson) => [undefined, ...(lesson.variants ?? []).map((variant) => variant.key)]
        .filter((key) => boardOfLesson(lesson.id, key) === "pulsar-c5")
        .flatMap((key) => resolveLesson(lesson, key).pins.map((p) => ({ id: `${lesson.id}.${key ?? ""}`, p }))))
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
    expect(boardOfLesson("B1", "arduino")).toBe("devkitc-s3");
    expect(boardOfLesson("B8", "micropython")).toBe("pulsar-c5");
    expect(boardOfLesson("W1", "micropython")).toBe("pulsar-c5");
    expect(boardOfLesson("W3", "arduino")).toBe("devkitc-s3");
    expect(boardOfLesson("W2", "micropython")).toBe("pulsar-c5");
    expect(boardOfLesson("W2", "lan")).toBe("devkitc-s3");
    expect(boardOfLesson("R1")).toBe("pulsar-c5");
    expect(boardOfLesson("nope")).toBe("devkitc-s3");
  });

  it("teaches R1–R8 with PN532 I2C on the Pulsar C5", async () => {
    const lessons = (await trackLessonsQuery("rfid", "en").queryFn!({} as never)).filter(isActive);
    expect(lessons).toHaveLength(8);
    for (const lesson of lessons) {
      expect(boardOfLesson(lesson.id)).toBe("pulsar-c5");
      expect(lesson.cmd).toBe("");
      expect(lesson.preview?.widget).toBe("pn532Lab");
      expect(lesson.wiring?.rows.map((row) => row[0])).toEqual(["VCC", "GND", "SDA", "SCL"]);
      expect(lesson.steps?.join(" ")).toContain(`rfid_${lesson.id.toLowerCase()}_pn532.py`);
    }
  });

  it("runs B1-B8 as MicroPython scripts on the C5 without the S3 screen", async () => {
    const lessons = (await trackLessonsQuery("ble", "es").queryFn!({} as never)).filter(isActive);
    const ported = lessons.filter((lesson) => /^B[1-8]$/.test(lesson.id));
    expect(ported).toHaveLength(8);
    for (const lesson of ported) {
      const arduino = resolveLesson(lesson, "arduino");
      const micropython = resolveLesson(lesson, "micropython");
      expect(arduino.cmd).toContain(`ble-lab-${lesson.id.toLowerCase()}`);
      expect(arduino.panels.some((panel) => panel.widget === "bleScreens")).toBe(true);
      expect(micropython.cmd).toBe("");
      expect(micropython.commands).toEqual([]);
      expect(micropython.panels.some((panel) => panel.widget === "bleScreens")).toBe(false);
      expect(micropython.preview).toBeUndefined();
      expect(micropython.steps.join(" ")).toContain(`ble_${lesson.id.toLowerCase()}_`);
    }
  });

  it("runs W1 and basic W3 as MicroPython scripts on the C5 without the S3 screen", async () => {
    const lessons = (await trackLessonsQuery("wifi", "es").queryFn!({} as never)).filter(isActive);
    for (const [id, script, screen] of [["W1", "wifi_w1_scan.py", "wifi"], ["W3", "wifi_w3_basic.py", "weather"]] as const) {
      const lesson = lessons.find((entry) => entry.id === id);
      if (!lesson) throw new Error(`${id} is missing`);
      const arduino = resolveLesson(lesson, "arduino");
      const micropython = resolveLesson(lesson, "micropython");
      expect(arduino.cmd).toContain(`wifi-lab-${id.toLowerCase()}`);
      expect(arduino.preview?.widget).toBe(screen);
      expect(micropython.cmd).toBe("");
      expect(micropython.commands).toEqual([]);
      expect(micropython.preview).toBeUndefined();
      expect(micropython.steps.join(" ")).toContain(script);
      if (id === "W1") expect(micropython.steps[0]).toContain("wifi_kit.py");
    }
  });

  it("offers basic W2 beside its advanced script and two S3 variations", async () => {
    const lessons = (await trackLessonsQuery("wifi", "es").queryFn!({} as never)).filter(isActive);
    const w2 = lessons.find((entry) => entry.id === "W2");
    if (!w2) throw new Error("W2 is missing");
    expect(w2.variants?.map((variant) => variant.key)).toEqual(["lan", "remote", "micropython"]);
    const micropython = resolveLesson(w2, "micropython");
    expect(micropython.cmd).toBe("");
    expect(micropython.preview).toBeUndefined();
    expect(micropython.panels.map((panel) => panel.widget)).toEqual(["st7735Wiring", "webConcepts"]);
    expect(micropython.steps.join(" ")).toContain("wifi_w2_display.py");
    expect(micropython.steps.join(" ")).toContain("wifi_w2_basic.py");
    expect(micropython.steps.join(" ")).toContain("wifi_w2_phone.py");
    expect(resolveLesson(w2, "lan").preview?.widget).toBe("phone");
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
