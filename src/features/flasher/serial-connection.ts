import { useSyncExternalStore } from "react";
import { SerialSession, type LineEnding, type TerminalPort } from "./serial-session";

// One serial connection for the whole app. Terminals are views of it: changing lesson, tab or page
// unmounts a terminal but leaves the board connected, with its output, until the person disconnects,
// the board goes away, or the flasher takes the port.

export type SerialState = "ready" | "connecting" | "connected" | "disconnecting" | "disconnected" | "error";

export interface SerialSnapshot {
  readonly state: SerialState;
  readonly output: string;
  readonly baudRate: number;
  /** A run, save or stop is talking to the REPL. */
  readonly operation: boolean;
  /** Why the last connection failed or closed, as a raw message or error key. */
  readonly error: string;
}

const MAX_OUTPUT = 100_000;
const BUSY = "Serial console is busy.";
const NOT_CONNECTED = "Connect the serial console first.";

export class SerialConnection {
  private snapshot: SerialSnapshot = { state: "ready", output: "", baudRate: 115200, operation: false, error: "" };
  private readonly listeners = new Set<() => void>();
  private session: SerialSession | null = null;
  private port: TerminalPort | null = null;
  private sending = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SerialSnapshot => this.snapshot;

  private set(patch: Partial<SerialSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  get connected(): boolean {
    return this.snapshot.state === "connected";
  }

  get active(): boolean {
    const { state } = this.snapshot;
    return state === "connecting" || state === "connected" || state === "disconnecting";
  }

  setBaudRate(baudRate: number) {
    if (!this.active) this.set({ baudRate });
  }

  append(text: string) {
    if (text) this.set({ output: (this.snapshot.output + text).slice(-MAX_OUTPUT) });
  }

  clearOutput() {
    this.set({ output: "" });
  }

  /**
   * Opens the port that `requestPort` picks. `requestPort` runs first, before any await, so it stays
   * inside the click's user activation. Returns false when the person cancelled the picker.
   */
  async connect(requestPort: () => Promise<TerminalPort>, stopPython = false): Promise<boolean> {
    if (this.active) return this.connected;
    const picking = requestPort();
    this.set({ state: "connecting", error: "" });
    let session: SerialSession | null = null;
    try {
      const port = await picking;
      this.port = port;
      session = new SerialSession(port, (text) => this.append(text), (cause) => this.closed(session, cause));
      this.session = session;
      await session.open(this.snapshot.baudRate);
      if (stopPython) await session.stopPython();
      if (this.session !== session) return false;
      this.set({ state: "connected" });
      return true;
    } catch (cause) {
      if (session) await session.close();
      this.session = null;
      this.port = null;
      if (cause instanceof Error && cause.name === "NotFoundError") {
        this.set({ state: "ready" });
        return false;
      }
      this.set({ state: "error", error: cause instanceof Error ? cause.message : String(cause) });
      throw cause;
    }
  }

  private closed(session: SerialSession | null, cause?: unknown) {
    if (!session || this.session !== session) return;
    this.session = null;
    this.port = null;
    this.set({
      state: cause ? "error" : "disconnected",
      operation: false,
      error: cause ? (cause instanceof Error ? cause.message : String(cause)) : "",
    });
  }

  /** Returns whether the browser confirmed that the port was closed. */
  async disconnect(): Promise<boolean> {
    const session = this.session;
    if (!session) return true;
    this.set({ state: "disconnecting" });
    try {
      return await session.close();
    } catch (cause) {
      this.set({ state: "error", error: cause instanceof Error ? cause.message : String(cause) });
      return false;
    }
  }

  /** Closes the terminal's session and hands its port to the flasher. */
  async takePort(): Promise<TerminalPort | null> {
    const port = this.port;
    if (!port || !this.session || !await this.disconnect()) return null;
    return port;
  }

  private require(): SerialSession {
    if (!this.session || !this.connected) throw new Error(NOT_CONNECTED);
    return this.session;
  }

  private async operate(task: (session: SerialSession) => Promise<void>): Promise<void> {
    const session = this.require();
    if (this.snapshot.operation) throw new Error("A MicroPython action is already running.");
    this.set({ operation: true });
    try {
      await task(session);
    } finally {
      this.set({ operation: false });
    }
  }

  /**
   * Stops whatever runs on the board (Ctrl+C) and runs `code` in its place. The upload itself is
   * not echoed, so `notice` (already translated) is printed to show that the script started.
   */
  runPython(code: string, notice: string): Promise<void> {
    return this.operate((session) => {
      this.append(`\n▶ ${notice}\n`);
      return session.runPython(code);
    });
  }

  savePython(filename: string, code: string): Promise<void> {
    return this.operate((session) => session.savePython(filename, code));
  }

  stopPython(): Promise<void> {
    return this.require().stopPython();
  }

  async send(text: string, ending: LineEnding = "lf"): Promise<void> {
    const session = this.require();
    if (this.sending || this.snapshot.operation) throw new Error(BUSY);
    this.sending = true;
    try {
      await session.send(text, ending);
      this.append(`\n› ${text}\n`);
    } finally {
      this.sending = false;
    }
  }
}

export const serialConnection = new SerialConnection();

export function useSerialConnection(): SerialSnapshot {
  return useSyncExternalStore(serialConnection.subscribe, serialConnection.getSnapshot, serialConnection.getSnapshot);
}
