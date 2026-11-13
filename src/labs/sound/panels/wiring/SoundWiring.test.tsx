import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveLesson, type ActiveLesson } from "@/domain/lesson";
import { i18n } from "@/i18n/i18n";
import { SoundCodecWiring, SoundMicWiring } from "./SoundWiring";

const lesson = resolveLesson({
  kind: "lesson", id: "S2", track: "sound", title: "Loudness", status: "MicroPython", heading: "",
} satisfies ActiveLesson);

// Lab catalogues load on demand; load this one before rendering.
beforeAll(async () => {
  await i18n.loadNamespaces("labs-sound");
});

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("SoundWiring", () => {
  it("opens a capture exercise on capture, without the speaker data line", () => {
    render(<SoundCodecWiring lesson={lesson} panel={{ title: "", widget: "soundCodecWiring", view: 1 }} />);
    expect(screen.getByRole("button", { name: "Capture" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("8 / 8 wires")).toBeTruthy();
    expect(screen.getByText("All 8 wires")).toBeTruthy();
  });

  it("walks the wires ground first and explains the last one too", () => {
    render(<SoundCodecWiring lesson={lesson} panel={{ title: "", widget: "soundCodecWiring", view: 2 }} />);
    click("Step by step");
    expect(screen.getByText("Wire 1: J20 6 · GND → GND")).toBeTruthy();
    for (let i = 0; i < 7; i += 1) click("Next");
    expect(screen.getByText("Wire 8: J20 3 · GPIO26 → DIN")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
    click("All wires");
    expect(screen.getByText("All 8 wires")).toBeTruthy();
  });

  it("switching mode returns to the overview of that mode", () => {
    render(<SoundCodecWiring lesson={lesson} panel={{ title: "", widget: "soundCodecWiring", view: 1 }} />);
    click("Step by step");
    click("Capture + playback");
    expect(screen.getByText("All 9 wires")).toBeTruthy();
  });

  it("draws the ICS-43434 with six wires and no codec modes", () => {
    render(<SoundMicWiring lesson={lesson} />);
    expect(screen.getByText("6 / 6 wires")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Capture" })).toBeNull();
  });
});
