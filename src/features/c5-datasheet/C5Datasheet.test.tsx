import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const LOAD = { timeout: 8000 };

async function openApp(hash: string) {
  window.location.hash = hash;
  await (await import("@/i18n/i18n")).initI18n();
  const { App } = await import("@/app/App");
  render(<App />);
}

describe("ESP32-C5 datasheet routes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
  });

  it("opens the C5 overview with the complete board viewer and chip facts", async () => {
    await openApp("#/datasheet?lang=en");
    expect(await screen.findByRole("heading", { level: 1, name: "Inside the ESP32-C5HR8" }, LOAD)).toBeTruthy();
    expect(screen.getByTitle("Pulsar C5 3D")).toBeTruthy();
    expect(screen.getByText("240 MHz")).toBeTruthy();
    expect(screen.getByText("8 MiB", { selector: "strong" })).toBeTruthy();
    expect(within(screen.getByRole("main")).queryByText(/ESP32-S3/)).toBeNull();
  });

  it("shows the board's C5 GPIO map with D2/RGB on GPIO0", async () => {
    await openApp("#/datasheet/pins?lang=en");
    expect(await screen.findByRole("heading", { level: 1, name: "Pulsar C5 pins and power" }, LOAD)).toBeTruthy();
    expect(screen.getByText("D2 / RGB")).toBeTruthy();
    expect(screen.getByText(/D2\/RGB is GPIO0, the data line of the on-board RGB LED/)).toBeTruthy();
    // The reference pinout is drawn from the header data, with each pad's function and the Qwiic pins.
    const pinout = screen.getByRole("img", { name: /^UNIT Pulsar C5 pinout/ });
    expect(within(pinout).getByText("USB D+")).toBeTruthy();
    expect(within(pinout).getByText("NEO IN")).toBeTruthy();
    expect(within(pinout).getAllByText("GP6").length).toBe(2);
    expect(screen.getByText(/GPIO26, GPIO27 and GPIO28 are strapping pins/)).toBeTruthy();
  });

  it.each(["00", "01", "02"])("shows the C5 pinout in introduction lesson %s", async (lessonId) => {
    await openApp(`#/lessons/${lessonId}?lang=en`);
    const pinout = await screen.findByRole("img", { name: /UNIT Pulsar C5 pinout/ }, LOAD);
    expect(pinout.tagName.toLowerCase()).toBe("svg");
    expect(screen.getByRole("link", { name: "Open full-size diagram" }).getAttribute("href"))
      .toContain(`lesson=${lessonId}`);
    expect(screen.queryByText(/wiring and firmware in these lessons have not yet been adapted/)).toBeNull();
  });

  it("links C5 peripherals to the bundled official PDF", async () => {
    await openApp("#/datasheet/blocks?lang=en");
    expect(await screen.findByRole("heading", { level: 1, name: "ESP32-C5 peripheral atlas" }, LOAD)).toBeTruthy();
    const adc = screen.getByRole("heading", { name: "12-bit ADC" }).closest("article");
    expect(adc).toBeTruthy();
    expect(within(adc!).getByRole("link", { name: "PDF p. 63" }).getAttribute("href"))
      .toContain("esp32-c5_datasheet_en.pdf#page=63");
  });

  it("explains the two RISC-V CPUs and separates flash from PSRAM", async () => {
    await openApp("#/datasheet/inside?lang=en");
    expect(await screen.findByRole("heading", { level: 1, name: "RISC-V, memory and clocks" }, LOAD)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Main RISC-V CPU · up to 240 MHz" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Low-power RISC-V CPU · up to 48 MHz" })).toBeTruthy();
    expect(screen.getByText(/separate from the ESP32-C5HR8's 8 MiB in-package PSRAM/)).toBeTruthy();
  });

  it("provides the bundled datasheet and source PDF", async () => {
    await openApp("#/datasheet/read?lang=en");
    expect(await screen.findByRole("heading", { level: 1, name: "ESP32-C5 datasheet" }, LOAD)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open bundled PDF" }).getAttribute("href"))
      .toContain("esp32-c5_datasheet_en.pdf");
    expect(screen.getByTitle("ESP32-C5 Series Datasheet PDF viewer")).toBeTruthy();
  });
});
