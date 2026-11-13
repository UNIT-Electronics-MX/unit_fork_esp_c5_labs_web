import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { FlasherPage } from "./FlasherPage";

vi.mock("./FirmwareFlasher", () => ({
  FirmwareFlasher: ({ microPythonSetup }: { microPythonSetup: boolean }) =>
    <span>{microPythonSetup ? "MicroPython firmware" : "Generic firmware"}</span>,
}));

describe("Flash page", () => {
  it("shows only firmware loading, even for an old editor link", () => {
    render(<MemoryRouter initialEntries={["/flash?view=editor&example=gpio"]}><FlasherPage /></MemoryRouter>);
    expect(screen.getByText("Generic firmware")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Code draft" })).toBeNull();
  });

  it("keeps the MicroPython firmware profile", () => {
    render(<MemoryRouter initialEntries={["/flash?profile=micropython"]}><FlasherPage /></MemoryRouter>);
    expect(screen.getByText("MicroPython firmware")).toBeTruthy();
  });
});
