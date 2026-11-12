import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MicroPythonWorkbench } from "./MicroPythonWorkbench";

vi.mock("@/features/code/LessonCodeGuide", () => ({ LessonCodeGuide: () => null }));
vi.mock("./FirmwareFlasher", () => ({ FirmwareFlasher: () => null }));
vi.mock("./SerialTerminal", () => ({ SerialTerminal: () => null }));
vi.mock("./serial-connection", () => ({
  serialConnection: { stopPython: vi.fn(async () => undefined) },
  useSerialConnection: () => ({ output: "", state: "connected", operation: false }),
}));
vi.mock("./MicroPythonEditor", () => ({
  MicroPythonEditor: ({ onRun, onOpenImuCube, onOpenP4Sensors }: { onRun: (id: string) => void; onOpenImuCube?: () => void; onOpenP4Sensors?: () => void }) => (
    <>
      <button type="button" onClick={() => onRun("imu-bmi270-cube")}>Run cube</button>
      <button type="button" onClick={onOpenImuCube}>View cube</button>
      <button type="button" onClick={() => onRun("p4-sensor-stream")}>Run sensors</button>
      <button type="button" onClick={onOpenP4Sensors}>View sensors</button>
    </>
  ),
}));
vi.mock("./imu-cube/ImuCube", () => ({ ImuCube: () => <div>Live cube</div> }));
vi.mock("./p4-sensors/P4SensorViewer", () => ({ P4SensorViewer: () => <div>Live sensors</div> }));

describe("MicroPythonWorkbench IMU viewer", () => {
  it("opens after running the cube and can be reopened without scrolling", async () => {
    render(<MicroPythonWorkbench lessonId="D1" />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Run cube" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(await screen.findByText("Live cube")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to code" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View cube" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});

describe("MicroPythonWorkbench P4 viewer", () => {
  it("opens after running the stream and can be reopened in the browser", async () => {
    render(<MicroPythonWorkbench lessonId="P4" />);
    fireEvent.click(screen.getByRole("button", { name: "Run sensors" }));
    expect(await screen.findByRole("dialog", { name: "P4 on-board sensors" })).toBeTruthy();
    expect(await screen.findByText("Live sensors")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to code" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View sensors" }));
    expect(await screen.findByRole("dialog", { name: "P4 on-board sensors" })).toBeTruthy();
  });
});
