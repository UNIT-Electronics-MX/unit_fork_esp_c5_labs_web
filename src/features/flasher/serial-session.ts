/** Web Serial streams used by the terminal. Kept separate from esptool's transport. */
export interface TerminalPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

export type LineEnding = "none" | "lf" | "cr" | "crlf";

export const validPythonFilename = (name: string): boolean =>
  /^[A-Za-z_][A-Za-z0-9_-]{0,63}\.py$/i.test(name);

export const REPL_INTERRUPT_FAILED = "replInterruptFailed";
const REPL_TIMEOUT = "MicroPython REPL did not answer. Check the firmware and serial port.";

const ENDINGS: Record<LineEnding, string> = {
  none: "",
  lf: "\n",
  cr: "\r",
  crlf: "\r\n",
};

interface PromptWaiter {
  marker: string;
  start: number;
  resolve: (text: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class SerialSession {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private readTask: Promise<void> | null = null;
  private writeTasks = new Set<Promise<void>>();
  private finishTask: Promise<boolean> | null = null;
  private stopped = false;
  private opened = false;
  private readonly port: TerminalPort;
  private readonly onText: (text: string) => void;
  private readonly onClose: (error?: unknown) => void;
  private received = "";
  private promptWaiters = new Set<PromptWaiter>();

  constructor(
    port: TerminalPort,
    onText: (text: string) => void,
    onClose: (error?: unknown) => void,
  ) {
    this.port = port;
    this.onText = onText;
    this.onClose = onClose;
  }

  async open(baudRate: number): Promise<void> {
    await this.port.open({ baudRate });
    this.opened = true;
    if (!this.port.readable) {
      await this.finish(new Error("noReadable"));
      throw new Error("noReadable");
    }
    this.readTask = this.read();
  }

  private async read(): Promise<void> {
    const decoder = new TextDecoder();
    let error: unknown;
    try {
      while (!this.stopped && this.port.readable) {
        const stream = this.port.readable;
        const reader = stream.getReader();
        let readError: unknown;
        this.reader = reader;
        try {
          while (!this.stopped) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) this.receive(decoder.decode(value, { stream: true }));
          }
        } catch (cause) {
          readError = cause;
        } finally {
          reader.releaseLock();
          if (this.reader === reader) this.reader = null;
        }
        // Web Serial may replace the stream after a recoverable read error.
        if (readError && !this.stopped && this.port.readable && this.port.readable !== stream) continue;
        if (readError) error = readError;
        // A clean end means the device has closed. Avoid a tight loop on that stream.
        break;
      }
      const tail = decoder.decode();
      if (tail && !this.stopped) this.receive(tail);
    } finally {
      await this.finish(error);
    }
  }

  private receive(text: string) {
    this.received += text;
    this.onText(text);
    for (const waiter of this.promptWaiters) {
      if (!this.received.slice(waiter.start).includes(waiter.marker)) continue;
      clearTimeout(waiter.timeout);
      this.promptWaiters.delete(waiter);
      waiter.resolve(this.received.slice(waiter.start));
    }
    if (this.received.length > 200_000 && !this.promptWaiters.size) this.received = this.received.slice(-10_000);
  }

  private async expectAfter(marker: string, write: () => Promise<void>, timeoutMs = 5000, checkErrors = true): Promise<string> {
    const start = this.received.length;
    let waiter!: PromptWaiter;
    const prompt = new Promise<string>((resolve, reject) => {
      waiter = {
        marker, start, resolve, reject,
        timeout: setTimeout(() => {
          this.promptWaiters.delete(waiter);
          reject(new Error(REPL_TIMEOUT));
        }, timeoutMs),
      };
      this.promptWaiters.add(waiter);
    });
    try {
      await write();
      const answer = await prompt;
      if (checkErrors && /Traceback \(most recent call last\)|(?:OSError|SyntaxError|ValueError):/.test(answer))
        throw new Error(answer.trim());
      return answer;
    } catch (error) {
      clearTimeout(waiter.timeout);
      this.promptWaiters.delete(waiter);
      throw error;
    }
  }

  private async friendlyPrompt(): Promise<void> {
    try {
      // KeyboardInterrupt is expected when Ctrl+C stops a running script.
      await this.expectAfter(">>> ", () => this.send("\x03\x03\r", "none"), 5000, false);
    } catch (cause) {
      if (cause instanceof Error && cause.message === REPL_TIMEOUT) throw new Error(REPL_INTERRUPT_FAILED, { cause });
      throw cause;
    }
  }

  /** Run a complete script via MicroPython's paste mode, preserving indentation. */
  async runPython(code: string): Promise<void> {
    await this.stopPython();
    await this.expectAfter("=== ", () => this.send("\x05", "none"));
    const lines = code.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
    for (const line of lines) await this.expectAfter("=== ", () => this.send(`${line}\r`, "none"));
    await this.send("\x04", "none");
  }

  /** Save a script in small REPL writes so Web Serial cannot overrun the interpreter's input. */
  async savePython(filename: string, code: string): Promise<void> {
    if (!validPythonFilename(filename)) throw new Error("Invalid Python filename");
    await this.stopPython();
    await this.expectAfter(">>> ", () => this.send(`f=open(${JSON.stringify(filename)},'wb')\r`, "none"));
    const bytes = new TextEncoder().encode(code);
    for (let at = 0; at < bytes.length; at += 32) {
      const chunk = bytes.subarray(at, at + 32);
      await this.expectAfter(">>> ", () => this.send(`f.write(bytes((${[...chunk].join(",")})))\r`, "none"));
    }
    await this.expectAfter(">>> ", () => this.send("f.close()\r", "none"));
  }

  async stopPython(): Promise<void> {
    await this.friendlyPrompt();
  }

  async send(text: string, ending: LineEnding): Promise<void> {
    const writable = this.port.writable;
    if (this.stopped || !this.opened || !writable) throw new Error("notWritable");
    const task = (async () => {
      const writer = writable.getWriter();
      try {
        await writer.write(new TextEncoder().encode(text + ENDINGS[ending]));
      } finally {
        writer.releaseLock();
      }
    })();
    this.writeTasks.add(task);
    try {
      await task;
    } finally {
      this.writeTasks.delete(task);
    }
  }

  /** Returns whether the browser confirmed that the port was closed. */
  async close(): Promise<boolean> {
    if (!this.stopped) {
      this.stopped = true;
      try {
        await this.reader?.cancel();
      } catch {
        // A disconnected reader may already be closed.
      }
    }
    if (this.readTask) await this.readTask;
    return this.finish();
  }

  private finish(error?: unknown): Promise<boolean> {
    if (this.finishTask) return this.finishTask;
    this.stopped = true;
    for (const waiter of this.promptWaiters) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error("Serial port closed"));
    }
    this.promptWaiters.clear();
    this.finishTask = (async () => {
      let closed = true;
      try {
        await Promise.allSettled(this.writeTasks);
        if (this.opened) await this.port.close();
      } catch (closeError) {
        closed = false;
        error ??= closeError;
      } finally {
        this.opened = false;
        this.onClose(error);
      }
      return closed;
    })();
    return this.finishTask;
  }
}
