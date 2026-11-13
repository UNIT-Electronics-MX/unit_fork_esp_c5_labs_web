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
  MicroPythonEditor: ({ onRun, onOpenImuCube, onOpenP4Sensors, onOpenToneLab, onOpenAudioPlayer, onOpenSoundLab }: { onRun: (id: string) => void; onOpenImuCube?: () => void; onOpenP4Sensors?: () => void; onOpenToneLab?: () => void; onOpenAudioPlayer?: () => void; onOpenSoundLab?: (id: string) => void }) => (
    <>
      <button type="button" onClick={() => onRun("imu-bmi270-cube")}>Run cube</button>
      <button type="button" onClick={onOpenImuCube}>View cube</button>
      <button type="button" onClick={() => onRun("p4-sensor-stream")}>Run sensors</button>
      <button type="button" onClick={onOpenP4Sensors}>View sensors</button>
      <button type="button" onClick={() => onRun("es8311-tone-lab")}>Run tones</button>
      <button type="button" onClick={onOpenToneLab}>View tones</button>
      <button type="button" onClick={() => onRun("es8311-play-serial")}>Run player</button>
      <button type="button" onClick={onOpenAudioPlayer}>View player</button>
      <button type="button" onClick={() => onRun("es8311-sound-spectrum")}>Run spectrum</button>
      <button type="button" onClick={() => onOpenSoundLab?.("es8311-sound-spectrum")}>View spectrum</button>
    </>
  ),
}));
vi.mock("./imu-cube/ImuCube", () => ({ ImuCube: () => <div>Live cube</div> }));
vi.mock("./p4-sensors/P4SensorViewer", () => ({ P4SensorViewer: () => <div>Live sensors</div> }));
vi.mock("./tone-lab/ToneLabDialog", () => ({ ToneLabDialog: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Tone lab"><button type="button" onClick={onClose}>Close tones</button></div> }));
vi.mock("./audio-player/AudioPlayerDialog", () => ({ AudioPlayerDialog: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Audio player"><button type="button" onClick={onClose}>Close player</button></div> }));
vi.mock("./sound-lab/SoundLabDialog", () => ({ SoundLabDialog: ({ mode, onClose }: { mode: string; onClose: () => void }) => <div role="dialog" aria-label={`Sound ${mode}`}><button type="button" onClick={onClose}>Close sound</button></div> }));

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

describe("MicroPythonWorkbench tone lab", () => {
  it("opens after running the tone script in the speaker practice and can be reopened", async () => {
    render(<MicroPythonWorkbench lessonId="S7" />);
    fireEvent.click(screen.getByRole("button", { name: "Run tones" }));
    expect(await screen.findByRole("dialog", { name: "Tone lab" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close tones" }));
    expect(screen.queryByRole("dialog", { name: "Tone lab" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View tones" }));
    expect(await screen.findByRole("dialog", { name: "Tone lab" })).toBeTruthy();
  });

  it("opens the player from the speaker practice", async () => {
    render(<MicroPythonWorkbench lessonId="S7" />);
    fireEvent.click(screen.getByRole("button", { name: "Run player" }));
    expect(await screen.findByRole("dialog", { name: "Audio player" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close player" }));
    fireEvent.click(screen.getByRole("button", { name: "View player" }));
    expect(await screen.findByRole("dialog", { name: "Audio player" })).toBeTruthy();
  });
});

describe("MicroPythonWorkbench sound lab", () => {
  it("opens the spectrum panel after running and lets the learner reopen it", async () => {
    render(<MicroPythonWorkbench lessonId="S5" />);
    fireEvent.click(screen.getByRole("button", { name: "Run spectrum" }));
    expect(await screen.findByRole("dialog", { name: "Sound spectrum" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close sound" }));
    expect(screen.queryByRole("dialog", { name: "Sound spectrum" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View spectrum" }));
    expect(await screen.findByRole("dialog", { name: "Sound spectrum" })).toBeTruthy();
  });
});
