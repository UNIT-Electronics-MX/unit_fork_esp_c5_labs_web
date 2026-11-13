import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundLabDialog } from "./SoundLabDialog";

const channel = vi.hoisted(() => ({ listener: null as ((text: string) => void) | null, sent: [] as string[] }));
vi.mock("../serial-connection", () => ({
  serialConnection: {
    getSnapshot: () => ({ output: "" }),
    subscribeText: (listener: (text: string) => void) => { channel.listener = listener; return () => { channel.listener = null; }; },
    stopPython: vi.fn(async () => undefined),
    send: vi.fn(async (text: string) => { channel.sent.push(text); }),
  },
  useSerialConnection: () => ({ state: "connected", operation: false }),
}));

function send(text: string) { act(() => channel.listener?.(text)); }
const controls = { onClose: vi.fn(), onConnect: vi.fn() };

beforeEach(() => { channel.listener = null; channel.sent = []; });
afterEach(() => { vi.useRealTimers(); });

describe("sound exercise web views", () => {
  it("shows live RMS, peak and a history bar", () => {
    render(<SoundLabDialog mode="loudness" {...controls} />);
    send("LEVEL,-25.5,-7.2\n");
    expect(screen.getByText("-25.5")).toBeTruthy();
    expect(screen.getByText("-7.2")).toBeTruthy();
    expect(screen.getByRole("meter", { name: "RMS level" }).getAttribute("aria-valuenow")).toBe("-25.5");
  });

  it("updates the clap switch and count", () => {
    render(<SoundLabDialog mode="clap" {...controls} />);
    send("CLAP,1,ON\n");
    expect(screen.getByRole("img", { name: "ON" })).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("shows the clap threshold and sends adjusted sensitivity", async () => {
    render(<SoundLabDialog mode="clap" {...controls} />);
    send("CLAP,READY\nCLAP,SENS,65\nCLAP,LEVEL,-25.0,-31.0\n");
    expect(screen.getByRole("meter", { name: "Microphone peak" }).getAttribute("aria-valuenow")).toBe("-25");
    fireEvent.change(screen.getByRole("slider", { name: "Sensitivity" }), { target: { value: "85" } });
    await vi.waitFor(() => expect(channel.sent).toContain("SENS 85"));
  });

  it("records on command, keeps the clip and plays it on command", async () => {
    render(<SoundLabDialog mode="recorder" {...controls} />);
    send("RECORDER,READY\n");
    fireEvent.click(screen.getByRole("button", { name: "● Record" }));
    expect(screen.getByRole("button", { name: "● Record" }).hasAttribute("disabled")).toBe(true);
    await vi.waitFor(() => expect(channel.sent).toContain("REC"));
    send("RECORDER,START\nRECORDER,LEVEL,-25.0,-10.0\nRECORDER,SAVED,32000\n");
    expect(screen.getByText("32000")).toBeTruthy();
    expect(screen.getByText("Recording ready")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "▶ Play" }));
    await vi.waitFor(() => expect(channel.sent).toContain("PLAY 65"));
    send("RECORDER,PLAY,32000\nRECORDER,DONE\n");
    expect(screen.getByText("Clips played:")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete clip" }));
    await vi.waitFor(() => expect(channel.sent).toContain("CLEAR"));
  });

  it("renders eight spectrum bands from board data", () => {
    render(<SoundLabDialog mode="spectrum" {...controls} />);
    send("SPECTRUM,LEVEL,-45.2,-31.7\nSPECTRUM,#||###||||##|\n");
    expect(screen.getAllByRole("meter")).toHaveLength(9);
    expect(screen.getByRole("meter", { name: "Microphone peak" }).getAttribute("aria-valuenow")).toBe("-31.7");
    expect(screen.getByRole("meter", { name: "250 Hz" }).getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByRole("meter", { name: "500 Hz" }).getAttribute("aria-valuenow")).toBe("3");
  });

  it("explains empty spectrum bands when the codec input has no signal", () => {
    render(<SoundLabDialog mode="spectrum" {...controls} />);
    send("SPECTRUM,LEVEL,-90.3,-90.3\nSPECTRUM,|||||||\n");
    expect(screen.getByText(/No microphone signal detected/)).toBeTruthy();
  });

  it("starts a configurable game and keeps score across GO cues", async () => {
    render(<SoundLabDialog mode="game" {...controls} />);
    send("GAME,READY\n");
    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "1200" } });
    fireEvent.change(screen.getByLabelText("Rounds"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    await vi.waitFor(() => expect(channel.sent).toContain("START 5 1200 65"));
    send("GAME,START,5,1200,65\nGAME,GO,1\nGAME,HIT,1,1\nGAME,GO,2\n");
    expect(screen.getByText("Score: 1")).toBeTruthy();
    expect(screen.getByText("Round 2/5")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop round" }));
    await vi.waitFor(() => expect(channel.sent).toContain("STOP"));
  });

  it("sends the chosen echo and filter for a saved voice take", async () => {
    render(<SoundLabDialog mode="voice_fx" {...controls} />);
    send("FX,READY\n");
    fireEvent.click(screen.getByRole("button", { name: "● Record" }));
    await vi.waitFor(() => expect(channel.sent).toContain("REC"));
    send("FX,RECORD\nFX,SAVED,32000\n");
    fireEvent.click(screen.getByRole("button", { name: /Robot/ }));
    fireEvent.change(screen.getByRole("slider", { name: "Echo amount" }), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "low" } });
    fireEvent.click(screen.getByRole("button", { name: "▶ Play effect" }));
    await vi.waitFor(() => expect(channel.sent).toContain("PLAY robot 55 low 65"));
  });

  it("disables recorder controls when the board returns to the REPL", () => {
    render(<SoundLabDialog mode="recorder" {...controls} />);
    send("RECORDER,READY\n");
    expect(screen.getByRole("button", { name: "● Record" }).hasAttribute("disabled")).toBe(false);
    send("KeyboardInterrupt\n>>> \n");
    expect(screen.getByText("Program stopped")).toBeTruthy();
    expect(screen.getByRole("button", { name: "● Record" }).hasAttribute("disabled")).toBe(true);
  });

  it("holds the loudest peak, flags clipping and recovers", () => {
    render(<SoundLabDialog mode="loudness" {...controls} />);
    send("LEVEL,-30.0,-12.0\n");
    expect(screen.getByText("Clipping").getAttribute("data-on")).toBe("false");
    expect(screen.getByTitle("Peak hold -12.0 dBFS")).toBeTruthy();
    send("LEVEL,-8.0,-0.2\n");
    expect(screen.getByText("Clipping").getAttribute("data-on")).toBe("true");
    expect(screen.getByTitle("Peak hold -0.2 dBFS")).toBeTruthy();
    send("LEVEL,-40.0,-20.0\n");
    expect(screen.getByText("Clipping").getAttribute("data-on")).toBe("false");
    expect(screen.getByTitle("Peak hold -0.2 dBFS")).toBeTruthy(); // the marker holds before it falls
  });

  it("says so when a continuous feed goes quiet because the script stopped", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    render(<SoundLabDialog mode="loudness" {...controls} />);
    send("LEVEL,-30.0,-12.0\n");
    expect(screen.getByText("Board data received")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("status").textContent).toContain("Is the script still running?");
    send("LEVEL,-31.0,-13.0\n");
    expect(screen.getByText("Board data received")).toBeTruthy();
  });

  it("does not call an event-driven exercise stale while it waits for a clap", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    render(<SoundLabDialog mode="clap" {...controls} />);
    send("CLAP,1,ON\n");
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByText("Board data received")).toBeTruthy();
  });

  it("translates the game cue and the clap switch states instead of hard-coding them", () => {
    render(<SoundLabDialog mode="game" {...controls} />);
    send("GAME,GO,1\n");
    expect(screen.getByText("GO!")).toBeTruthy();
    expect(screen.queryByText("¡GO!")).toBeNull();
  });
});
