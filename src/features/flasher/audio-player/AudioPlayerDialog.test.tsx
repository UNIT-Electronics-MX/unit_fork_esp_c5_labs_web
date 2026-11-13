import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioPlayerDialog } from "./AudioPlayerDialog";
import { ANSWER } from "./play-protocol";

const board = vi.hoisted(() => {
  const textListeners = new Set<(text: string) => void>();
  const state = { receiver: null as ((chunk: Uint8Array) => void) | null, sent: [] as number[][] };
  return {
    textListeners, state,
    startRaw: vi.fn((receiver: (chunk: Uint8Array) => void) => { state.receiver = receiver; }),
    endRaw: vi.fn(),
    /** Answers like es8311_play_serial.py: accept the rate, confirm each frame, confirm the end. */
    sendBytes: vi.fn(async (bytes: Uint8Array) => {
      state.sent.push(Array.from(bytes));
      const answer = bytes[0] === 0x50 ? 0x06 : bytes[0] === 0x46 ? 0x01 : bytes[0] === 0x45 ? 0x04 : 0; // P F E
      if (answer) setTimeout(() => state.receiver?.(Uint8Array.of(answer)), 0);
    }),
    receiveText(text: string) { for (const listener of textListeners) listener(text); },
  };
});

vi.mock("../serial-connection", () => ({
  serialConnection: {
    startRaw: board.startRaw,
    endRaw: board.endRaw,
    sendBytes: board.sendBytes,
    subscribe: () => () => undefined,
    getSnapshot: () => ({ state: "connected" }),
    subscribeText(listener: (text: string) => void) {
      board.textListeners.add(listener);
      return () => board.textListeners.delete(listener);
    },
  },
  useSerialConnection: () => ({ state: "connected", operation: false, rawMode: false }),
}));

vi.mock("./decode-audio", () => ({
  DecodeError: class DecodeError extends Error { reason = "unreadable" as const; },
  decodeToMono: vi.fn(async () => new Int16Array(1300).fill(1000)),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  board.textListeners.clear();
  board.state.sent = [];
  board.state.receiver = null;
  board.startRaw.mockClear();
  board.endRaw.mockClear();
  board.sendBytes.mockClear();
});

const song = () => new File([new Uint8Array(8)], "song.mp3", { type: "audio/mpeg" });

describe("AudioPlayerDialog", () => {
  it("loads an included song and plays it without choosing a local file", async () => {
    const fetchTrack = vi.fn(async () => ({ ok: true, blob: async () => new Blob([new Uint8Array(8)], { type: "audio/mpeg" }) }));
    vi.stubGlobal("fetch", fetchTrack);
    render(<AudioPlayerDialog onClose={() => undefined} onConnect={() => undefined} />);
    expect(screen.getByText("Music included")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Solar Pulse/ }));
    await screen.findByRole("heading", { name: "Solar Pulse" });
    expect(fetchTrack).toHaveBeenCalledWith(expect.stringContaining("pulso-solar.mp3"), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    act(() => board.receiveText("PLAYER,READY\n"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Play on the board" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Play on the board" }));
    await waitFor(() => expect(board.endRaw).toHaveBeenCalled());
    expect(board.startRaw).toHaveBeenCalledTimes(1);
  });

  it("waits for the board, converts the chosen file and streams it with the board's confirmations", async () => {
    render(<AudioPlayerDialog onClose={() => undefined} onConnect={() => undefined} />);
    const play = screen.getByRole("button", { name: "Play on the board" });
    expect(play.hasAttribute("disabled")).toBe(true);

    const picker = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!picker) throw new Error("file input missing");
    fireEvent.change(picker, { target: { files: [song()] } });
    await screen.findByText("song.mp3");
    expect(play.hasAttribute("disabled")).toBe(true); // converted, but the board has not announced itself

    act(() => board.receiveText("PLAYER,READY\r\n"));
    await waitFor(() => expect(play.hasAttribute("disabled")).toBe(false));
    fireEvent.click(play);

    await waitFor(() => expect(board.endRaw).toHaveBeenCalled());
    expect(board.startRaw).toHaveBeenCalledTimes(1);
    const tags = board.state.sent.map((bytes) => String.fromCharCode(bytes[0] ?? 0)).join("");
    expect(tags).toBe("PVFFFE"); // 1300 samples = 3 frames of 512
    expect(new TextDecoder().decode(Uint8Array.from(board.state.sent[0] ?? []))).toBe("P22050");
    expect(new TextDecoder().decode(Uint8Array.from(board.state.sent[1] ?? []))).toBe("V070");
    expect(ANSWER.chunk).toBe(1);
  });

  it("sends a volume change while the song is playing", async () => {
    render(<AudioPlayerDialog onClose={() => undefined} onConnect={() => undefined} />);
    const picker = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!picker) throw new Error("file input missing");
    fireEvent.change(picker, { target: { files: [song()] } });
    await screen.findByRole("heading", { name: "song.mp3" });
    act(() => board.receiveText("PLAYER,READY\n"));

    fireEvent.click(screen.getByRole("button", { name: "Play on the board" }));
    fireEvent.change(screen.getByRole("slider", { name: /Speaker volume/ }), { target: { value: "30" } });
    await waitFor(() => expect(board.state.sent.some((bytes) => new TextDecoder().decode(Uint8Array.from(bytes)) === "V030")).toBe(true));
    await waitFor(() => expect(board.endRaw).toHaveBeenCalled());
  });

  it("re-converts at the chosen quality", async () => {
    const { decodeToMono } = await import("./decode-audio");
    render(<AudioPlayerDialog onClose={() => undefined} onConnect={() => undefined} />);
    const picker = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!picker) throw new Error("file input missing");
    fireEvent.change(picker, { target: { files: [song()] } });
    await screen.findByText("song.mp3");
    fireEvent.click(screen.getByRole("button", { name: "Voice · 16 kHz" }));
    await waitFor(() => expect(vi.mocked(decodeToMono)).toHaveBeenLastCalledWith(expect.any(File), 16_000, true));
  });
});
