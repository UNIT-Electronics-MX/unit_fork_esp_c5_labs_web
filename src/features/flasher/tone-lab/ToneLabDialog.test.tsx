import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToneLabDialog } from "./ToneLabDialog";

const stream = vi.hoisted(() => {
  const listeners = new Set<(text: string) => void>();
  return {
    listeners,
    send: vi.fn(async (_command: string, _ending: string) => undefined),
    stopPython: vi.fn(async () => undefined),
    receive(text: string) { for (const listener of listeners) listener(text); },
  };
});

vi.mock("../serial-connection", () => ({
  serialConnection: {
    send: stream.send,
    stopPython: stream.stopPython,
    subscribe: () => () => undefined,
    getSnapshot: () => ({ state: "connected" }),
    subscribeText(listener: (text: string) => void) {
      stream.listeners.add(listener);
      return () => stream.listeners.delete(listener);
    },
  },
  useSerialConnection: () => ({ state: "connected", operation: false, rawMode: false }),
}));

afterEach(() => {
  stream.listeners.clear();
  stream.send.mockClear();
  stream.stopPython.mockClear();
});

describe("ToneLabDialog", () => {
  it("waits for the running board program, then sends tones and silence over serial", async () => {
    render(<ToneLabDialog onClose={() => undefined} onConnect={() => undefined} />);
    expect(screen.getByRole("button", { name: "Play tone" }).hasAttribute("disabled")).toBe(true);

    act(() => { stream.receive("TONE,REA"); stream.receive("DY\r\n"); });
    expect(screen.getByText("Board ready. Play a tone or press a key.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play tone" }));
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("T 440 sine 50", "lf"));

    fireEvent.click(screen.getByRole("button", { name: "Silence" }));
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("STOP", "lf"));
  });

  it("changes the waveform and plays a held note at the chosen frequency", async () => {
    render(<ToneLabDialog onClose={() => undefined} onConnect={() => undefined} />);
    act(() => stream.receive("TONE,READY\n"));
    fireEvent.click(screen.getByRole("button", { name: "Triangle" }));
    const note = screen.getByRole("button", { name: "C4, 262 Hz" });
    fireEvent.pointerDown(note);
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("T 262 triangle 50", "lf"));
    fireEvent.pointerUp(note);
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("STOP", "lf"));
  });

  it("plays from the computer keyboard, follows the octave and releases to silence", async () => {
    render(<ToneLabDialog onClose={() => undefined} onConnect={() => undefined} />);
    act(() => stream.receive("TONE,READY\n"));
    const piano = screen.getByRole("button", { name: "A4, 440 Hz" });
    fireEvent.keyDown(piano, { key: "h" });
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("T 440 sine 50", "lf"));
    fireEvent.keyUp(piano, { key: "h" });
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("STOP", "lf"));

    fireEvent.click(screen.getByRole("button", { name: "Octave up" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "C5, 523 Hz" }), { key: "a" });
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("T 523 sine 50", "lf"));
  });

  it("falls back to a key still held when another is released", async () => {
    render(<ToneLabDialog onClose={() => undefined} onConnect={() => undefined} />);
    act(() => stream.receive("TONE,READY\n"));
    const piano = screen.getByRole("button", { name: "C4, 262 Hz" });
    fireEvent.keyDown(piano, { key: "a" });
    fireEvent.keyDown(piano, { key: "s" });
    fireEvent.keyUp(piano, { key: "s" });
    await waitFor(() => expect(stream.send).toHaveBeenLastCalledWith("T 262 sine 50", "lf"));
  });

  it("offers the sawtooth wave and reports the nearest note on the pitch slider", async () => {
    render(<ToneLabDialog onClose={() => undefined} onConnect={() => undefined} />);
    act(() => stream.receive("TONE,READY\n"));
    fireEvent.click(screen.getByRole("button", { name: "Sawtooth" }));
    fireEvent.click(screen.getByRole("button", { name: "Play tone" }));
    await waitFor(() => expect(stream.send).toHaveBeenCalledWith("T 440 saw 50", "lf"));
    expect(screen.getByText("Nearest note A4 · 0 cents")).toBeTruthy();
  });

  it("shows the board's load and warns when a block takes most of its time", () => {
    render(<ToneLabDialog onClose={() => undefined} onConnect={() => undefined} />);
    act(() => stream.receive("TONE,READY\nTONE,LOAD,3200,11609\n"));
    expect(screen.getByText("Board load: 3.2 ms of 11.6 ms per block")).toBeTruthy();
    act(() => stream.receive("TONE,LOAD,10000,11609\n"));
    expect(screen.getByText(/Board too slow: 10.0 ms of 11.6 ms/)).toBeTruthy();
  });
});
