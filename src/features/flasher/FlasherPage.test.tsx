import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { FlasherPage } from "./FlasherPage";

vi.mock("./FirmwareFlasher", () => ({
  FirmwareFlasher: ({ microPythonSetup }: { microPythonSetup: boolean }) => <span>{microPythonSetup ? "MicroPython firmware" : "Generic firmware"}</span>,
}));
vi.mock("./MicroPythonEditor", () => ({
  MicroPythonEditor: () => <input aria-label="Code draft" defaultValue="keep this draft" />,
}));
vi.mock("./SerialTerminal", () => ({ SerialTerminal: () => <span>Serial terminal</span> }));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderPage(url: string) {
  const result = render(<MemoryRouter initialEntries={[url]}><FlasherPage /><Location /></MemoryRouter>);
  const editor = result.container.querySelector("#flash-editor-view");
  const firmware = result.container.querySelector("#flash-firmware-view");
  return { ...result, editor, firmware };
}

describe("Flash page workspace", () => {
  it("opens the editor first and keeps the draft and terminal mounted while switching views", () => {
    const { editor, firmware } = renderPage("/flash");
    expect(editor?.hasAttribute("hidden")).toBe(false);
    expect(firmware?.hasAttribute("hidden")).toBe(true);

    fireEvent.change(screen.getByRole("textbox", { name: "Code draft" }), { target: { value: "my changes" } });
    fireEvent.click(screen.getByRole("button", { name: "Flash firmware" }));
    expect(editor?.hasAttribute("hidden")).toBe(true);
    expect(firmware?.hasAttribute("hidden")).toBe(false);
    expect(screen.getByText("Serial terminal", { selector: "span" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Code editor" }));
    expect((screen.getByRole("textbox", { name: "Code draft" }) as HTMLInputElement).value).toBe("my changes");
  });

  it("opens firmware from the MicroPython setup link and preserves its profile when switching", () => {
    const { editor, firmware } = renderPage("/flash?profile=micropython");
    expect(editor?.hasAttribute("hidden")).toBe(true);
    expect(firmware?.hasAttribute("hidden")).toBe(false);
    expect(screen.getByText("MicroPython firmware")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Code editor" }));
    expect(screen.getByTestId("location").textContent).toContain("profile=micropython");
    expect(editor?.hasAttribute("hidden")).toBe(false);
  });
});
