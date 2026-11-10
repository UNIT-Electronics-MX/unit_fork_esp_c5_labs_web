import { describe, expect, it, vi } from "vitest";
import { REPL_INTERRUPT_FAILED, SerialSession, validPythonFilename } from "./serial-session";

describe("SerialSession", () => {
  it("accepts Python filenames without allowing paths", () => {
    expect(validPythonFilename("external_led.py")).toBe(true);
    expect(validPythonFilename("main.py")).toBe(true);
    expect(validPythonFilename("../main.py")).toBe(false);
    expect(validPythonFilename("folder/main.py")).toBe(false);
  });
  it("decodes split UTF-8 output, sends a line ending and releases both streams", async () => {
    const received: Uint8Array[] = [];
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const writable = new WritableStream<Uint8Array>({ write(chunk) { received.push(chunk); } });
    const close = vi.fn(async () => {
      expect(readable.locked).toBe(false);
      expect(writable.locked).toBe(false);
    });
    const open = vi.fn(async () => undefined);
    const output: string[] = [];
    const onClose = vi.fn();
    const session = new SerialSession({ readable, writable, open, close }, (text) => output.push(text), onClose);

    await session.open(115200);
    const encoded = new TextEncoder().encode("café");
    input.enqueue(encoded.slice(0, 4));
    input.enqueue(encoded.slice(4));
    await vi.waitFor(() => expect(output.join("")).toBe("café"));
    await session.send("status", "crlf");
    expect(new TextDecoder().decode(received[0])).toBe("status\r\n");
    expect(await session.close()).toBe(true);
    expect(open).toHaveBeenCalledWith({ baudRate: 115200 });
    expect(close).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("waits for a pending write before releasing the port", async () => {
    let releaseWrite!: () => void;
    const writeGate = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const readable = new ReadableStream<Uint8Array>();
    const writable = new WritableStream<Uint8Array>({ write: () => writeGate });
    const close = vi.fn(async () => {
      expect(readable.locked).toBe(false);
      expect(writable.locked).toBe(false);
    });
    const session = new SerialSession({ readable, writable, open: async () => undefined, close }, () => undefined, () => undefined);
    await session.open(115200);

    const sending = session.send("status", "lf");
    await vi.waitFor(() => expect(writable.locked).toBe(true));
    const closing = session.close();
    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();
    releaseWrite();
    await sending;
    expect(await closing).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("reports a failed port close so flashing can stop", async () => {
    const reason = new Error("port still open");
    const close = vi.fn(async () => { throw reason; });
    const onClose = vi.fn();
    const session = new SerialSession({
      readable: new ReadableStream<Uint8Array>(),
      writable: new WritableStream<Uint8Array>(),
      open: async () => undefined,
      close,
    }, () => undefined, onClose);
    await session.open(115200);

    expect(await session.close()).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledExactlyOnceWith(reason);
  });

  it("runs indented Python in paste mode and saves UTF-8 bytes over one serial port", async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const writes: string[] = [];
    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const writable = new WritableStream<Uint8Array>({ write(chunk) {
      const text = new TextDecoder().decode(chunk);
      writes.push(text);
      if (text.includes("\x03")) input.enqueue(encoder.encode(">>> "));
      else if (text === "\x05") input.enqueue(encoder.encode("paste mode\r\n=== "));
      else if (text.endsWith("\r")) input.enqueue(encoder.encode(writes.includes("\x05") && !writes.includes("\x04") ? "=== " : ">>> "));
      else if (text === "\x04") input.enqueue(encoder.encode("done\r\n>>> "));
    } });
    const session = new SerialSession({ readable, writable, open: async () => undefined, close: async () => undefined }, () => undefined, () => undefined);
    await session.open(115200);
    await session.runPython("for n in range(2):\n    print(n)\n");
    expect(writes[0]).toBe("\x03\x03\r");
    expect(writes).toContain("for n in range(2):\r");
    expect(writes).toContain("    print(n)\r");
    expect(writes).toContain("\x04");
    await session.savePython("hello.py", "print('café')\n");
    expect(writes).toContain('f=open("hello.py",\'wb\')\r');
    const byteCommands = writes.filter((write) => write.startsWith("f.write(bytes("));
    expect(byteCommands.length).toBeGreaterThan(0);
    expect(byteCommands.join(" ")).toContain("195,169");
    await session.savePython("hello.py", "print(2)\n");
    expect(writes.filter((write) => write === 'f=open("hello.py",\'wb\')\r')).toHaveLength(2);
    await session.stopPython();
    expect(writes.at(-1)).toBe("\x03\x03\r");
    expect(await session.close()).toBe(true);
  });

  it("pastes a script whose echoed lines name an exception", async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const writes: string[] = [];
    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const writable = new WritableStream<Uint8Array>({ write(chunk) {
      const text = new TextDecoder().decode(chunk);
      writes.push(text);
      if (text.includes("\x03")) input.enqueue(encoder.encode(">>> "));
      else if (text === "\x05") input.enqueue(encoder.encode("paste mode; Ctrl-C to cancel, Ctrl-D to finish\r\n=== "));
      // Like the board, paste mode echoes every line before its next prompt.
      else if (text.endsWith("\r")) input.enqueue(encoder.encode(`${text.slice(0, -1)}\r\n=== `));
    } });
    const session = new SerialSession({ readable, writable, open: async () => undefined, close: async () => undefined }, () => undefined, () => undefined);
    await session.open(115200);
    await session.runPython("try:\n    n = int('x')\nexcept ValueError:\n    n = -1\nexcept OSError:\n    n = -2\n");
    expect(writes).toContain("    n = -2\r");
    expect(writes.at(-1)).toBe("\x04");
  });

  it("keeps the paste-mode upload out of the terminal but shows the script's output", async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const shown: string[] = [];
    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const writable = new WritableStream<Uint8Array>({ write(chunk) {
      const text = new TextDecoder().decode(chunk);
      if (text.includes("\x03")) input.enqueue(encoder.encode(">>> "));
      else if (text === "\x05") input.enqueue(encoder.encode("paste mode; Ctrl-C to cancel, Ctrl-D to finish\r\n=== "));
      else if (text.endsWith("\r")) input.enqueue(encoder.encode(`${text.slice(0, -1)}\r\n=== `));
      else if (text === "\x04") input.enqueue(encoder.encode("\r\nhi\r\n>>> "));
    } });
    const session = new SerialSession({ readable, writable, open: async () => undefined, close: async () => undefined }, (text) => shown.push(text), () => undefined);
    await session.open(115200);

    await session.runPython("print('hi')\n");
    await vi.waitFor(() => expect(shown.join("")).toContain("hi\r\n>>> "));
    expect(shown.join("")).toBe("\r\nhi\r\n>>> ");
    await session.close();
  });

  it("confirms the REPL prompt before reporting that a program stopped", async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    let wrote!: () => void;
    const writeObserved = new Promise<void>((resolve) => { wrote = resolve; });
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const writable = new WritableStream<Uint8Array>({ write() { wrote(); } });
    const session = new SerialSession({ readable, writable, open: async () => undefined, close: async () => undefined }, () => undefined, () => undefined);
    await session.open(115200);

    let stopped = false;
    const stopping = session.stopPython().then(() => { stopped = true; });
    await writeObserved;
    input.enqueue(new TextEncoder().encode("script output\r\n"));
    await Promise.resolve();
    expect(stopped).toBe(false);
    input.enqueue(new TextEncoder().encode(">>> "));
    await stopping;
    expect(stopped).toBe(true);
    await session.close();
  });

  it("keeps the port open when Ctrl+C returns a KeyboardInterrupt traceback and a prompt", async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const output: string[] = [];
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const writable = new WritableStream<Uint8Array>({ write(chunk) {
      if (new TextDecoder().decode(chunk) === "\x03\x03\r") {
        input.enqueue(new TextEncoder().encode("Traceback (most recent call last):\r\n  File \"<stdin>\", line 17, in <module>\r\nKeyboardInterrupt: \r\n>>> >>> "));
      }
    } });
    const close = vi.fn(async () => undefined);
    const session = new SerialSession({ readable, writable, open: async () => undefined, close }, (text) => output.push(text), () => undefined);
    await session.open(115200);

    await expect(session.stopPython()).resolves.toBeUndefined();
    expect(output.join("")).toContain("KeyboardInterrupt");
    expect(close).not.toHaveBeenCalled();
    await session.close();
  });

  it("reports an error when Ctrl+C cannot return to the MicroPython prompt", async () => {
    vi.useFakeTimers();
    try {
      let wrote!: () => void;
      const writeObserved = new Promise<void>((resolve) => { wrote = resolve; });
      const readable = new ReadableStream<Uint8Array>();
      const writable = new WritableStream<Uint8Array>({ write() { wrote(); } });
      const session = new SerialSession({ readable, writable, open: async () => undefined, close: async () => undefined }, () => undefined, () => undefined);
      await session.open(115200);

      const failure = expect(session.stopPython()).rejects.toThrow(REPL_INTERRUPT_FAILED);
      await writeObserved;
      await vi.advanceTimersByTimeAsync(5000);
      await failure;
      await session.close();
    } finally {
      vi.useRealTimers();
    }
  });
});
