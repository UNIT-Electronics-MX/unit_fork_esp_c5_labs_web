import { describe, expect, it } from "vitest";
import { displayLessons } from "@/content/lessons/display";
import { ST7735_CONNECTIONS } from "./st7735-data";

describe("ST7735 wiring", () => {
  it("uses the physical C5 pads named by the lesson's wiring table", () => {
    const o2 = displayLessons.find((lesson) => lesson.id === "O2");
    const table = o2?.wiring?.rows.map(([display, board]) => `${display}:${board}`).sort();
    expect(ST7735_CONNECTIONS.map(({ display, board }) => `${display}:${board}`).sort()).toEqual(table);
    expect(Object.fromEntries(ST7735_CONNECTIONS.map(({ display, pad }) => [display, pad?.pad.pin]))).toEqual({
      GND: "GND", VCC: "3V3", SCL: "27", SDA: "7", CS: "9", DC: "4", RES: "5", BLK: "3V3",
    });
  });
});
