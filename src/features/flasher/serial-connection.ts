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
  /** The serial reader is carrying binary PCM instead of terminal text. */
  readonly rawMode: boolean;
  /** Why the last connection failed or closed, as a raw message or error key. */
  readonly error: string;
}

const MAX_OUTPUT = 100_000;
const STREAM_OUTPUT_INTERVAL_MS = 100;
const BUSY = "Serial console is busy.";
const NOT_CONNECTED = "Connect the serial console first.";

export class SerialConnection {
  private snapshot: SerialSnapshot = { state: "ready", output: "", baudRate: 115200, operation: false, rawMode: false, error: "" };
  private readonly listeners = new Set<() => void>();
  private readonly textListeners = new Set<(text: string) => void>();
  private pendingOutput = "";
  private outputTimer: ReturnType<typeof setTimeout> | null = null;
  private session: SerialSession | null = null;
  private port: TerminalPort | null = null;
  private sending = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SerialSnapshot => this.snapshot;

  /**
   * Text exactly as the board sends it, chunk by chunk, for live sensor views.
   * The app's own notices and command echoes are not included.
   */
  subscribeText = (listener: (text: string) => void): (() => void) => {
    this.textListeners.add(listener);
    return () => this.textListeners.delete(listener);
  };

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
    this.flushOutput();
    if (text) this.set({ output: (this.snapshot.output + text).slice(-MAX_OUTPUT) });
  }

  private flushOutput = () => {
    if (this.outputTimer !== null) clearTimeout(this.outputTimer);
    this.outputTimer = null;
    const text = this.pendingOutput;
    this.pendingOutput = "";
    if (text) this.set({ output: (this.snapshot.output + text).slice(-MAX_OUTPUT) });
  };

  private receive(text: string) {
    for (const listener of this.textListeners) listener(text);
    if (!this.textListeners.size) {
      this.append(text);
      return;
    }
    // Keep live sensor feeds immediate while updating the long terminal log at most 10 times/s.
    this.pendingOutput = (this.pendingOutput + text).slice(-MAX_OUTPUT);
    if (this.outputTimer === null) this.outputTimer = setTimeout(this.flushOutput, STREAM_OUTPUT_INTERVAL_MS);
  }

  clearOutput() {
    if (this.outputTimer !== null) clearTimeout(this.outputTimer);
    this.outputTimer = null;
    this.pendingOutput = "";
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
      session = new SerialSession(port, (text) => this.receive(text), (cause) => this.closed(session, cause));
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
    this.flushOutput();
    this.session = null;
    this.port = null;
    this.set({
      state: cause ? "error" : "disconnected",
      operation: false,
      rawMode: false,
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
    if (this.snapshot.operation || this.snapshot.rawMode) throw new Error("Serial console is busy.");
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
    if (this.snapshot.rawMode) return this.stopRawPython();
    return this.require().stopPython();
  }

  startRaw(receiver: (chunk: Uint8Array) => void): void {
    const session = this.require();
    if (this.snapshot.operation || this.snapshot.rawMode || this.sending) throw new Error(BUSY);
    session.startRaw(receiver);
    this.set({ rawMode: true });
  }

  /** Send one protocol byte without echoing it into the terminal. */
  async sendRawCommand(command: "R" | "S"): Promise<void> {
    if (!this.snapshot.rawMode) throw new Error(BUSY);
    await this.require().send(command, "none");
  }

  /** Send protocol bytes (not text) while a binary stream is active. */
  async sendBytes(bytes: Uint8Array): Promise<void> {
    if (!this.snapshot.rawMode) throw new Error(BUSY);
    await this.require().sendBytes(bytes);
  }

  /** Stop treating incoming bytes as binary without interrupting the board's script. */
  endRaw(): void {
    if (!this.snapshot.rawMode) return;
    this.session?.endRaw();
    this.set({ rawMode: false });
  }

  async stopRawPython(): Promise<void> {
    if (!this.snapshot.rawMode) return;
    try {
      await this.require().stopRawPython();
    } catch (cause) {
      // After a missing prompt, the board may still be sending PCM. Do not decode it as REPL text.
      await this.disconnect();
      throw cause;
    } finally {
      this.set({ rawMode: false });
    }
  }

  async send(text: string, ending: LineEnding = "lf"): Promise<void> {
    const session = this.require();
    if (this.sending || this.snapshot.operation || this.snapshot.rawMode) throw new Error(BUSY);
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
