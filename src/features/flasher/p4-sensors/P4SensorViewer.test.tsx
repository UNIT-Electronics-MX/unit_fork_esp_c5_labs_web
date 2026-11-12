import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { P4SensorViewer } from "./P4SensorViewer";

const stream = vi.hoisted(() => {
  const listeners = new Set<(text: string) => void>();
  return {
    listeners,
    send(text: string) { for (const listener of listeners) listener(text); },
  };
});

vi.mock("../serial-connection", () => ({
  serialConnection: {
    subscribeText(listener: (text: string) => void) {
      stream.listeners.add(listener);
      return () => stream.listeners.delete(listener);
    },
  },
}));
vi.mock("@/ui/stage3d/use-stage", () => ({ useStage3d: () => ({ status: "ready" }) }));
vi.mock("@/ui/stage3d/StageBox", () => ({ StageBox: () => <div>3D scene</div> }));

afterEach(() => stream.listeners.clear());

describe("P4SensorViewer", () => {
  it("updates the cards and the flow from serial chunks and shows missing readings when mask drops", () => {
    render(<P4SensorViewer />);
    expect(screen.getByText(/Waiting for P4 lines/)).toBeTruthy();

    act(() => {
      stream.send("P4,0,31,28.62,45.59,786.56,30.89,466.55,47,4.202,107.5,-2311,1494,-971\r");
      stream.send("\n");
    });
    expect(screen.getByText("5/5 answer")).toBeTruthy();
    expect(screen.getByText("28.6 °C")).toBeTruthy();
    expect(screen.getByText("466.6 lux")).toBeTruthy();
    expect(screen.getByText(/^Indoor/)).toBeTruthy();
    expect(screen.getByText("Altitude 0.00 m")).toBeTruthy();
    expect(screen.getByText("147°")).toBeTruthy();
    // The gauge reads 107.5 %: the card shows the voltage estimate and says why.
    expect(screen.getByText("≈100 %")).toBeTruthy();
    expect(screen.getByText("4.20 V · gauge 108 %, using voltage")).toBeTruthy();
    expect(screen.getByText(/The battery gauge reads 108 %/)).toBeTruthy();

    act(() => stream.send("P4_WARN,LPS22HB read: OSError(5)\nP4,3,5,28.57,45.76,-,-,230.75,48,-,-,-,-,-\n"));
    expect(screen.getByText("2/5 answer")).toBeTruthy();
    expect(screen.getByText("2 lines lost")).toBeTruthy();
    expect(screen.getAllByText("No reading")).toHaveLength(3);
    expect(screen.getByRole("alert").textContent).toContain("LPS22HB read");

    act(() => stream.send("P4,4,31,28.62,45.59,786.46,30.89,466.55,47,3.9,68,-2311,1494,-971\n"));
    expect(screen.getByText("5/5 answer")).toBeTruthy();
    expect(screen.getByText("68 %")).toBeTruthy();
    expect(screen.getByText(/Altitude \+1\.0\d m/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    act(() => screen.getByRole("button", { name: "Zero the altitude here" }).click());
    expect(screen.getByText("Altitude 0.00 m")).toBeTruthy();
  });
});
