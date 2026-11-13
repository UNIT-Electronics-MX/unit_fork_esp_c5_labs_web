import { describe, expect, it, vi } from "vitest";
import { SerialConnection } from "./serial-connection";
import type { TerminalPort } from "./serial-session";

function fakePort() {
  let input!: ReadableStreamDefaultController<Uint8Array>;
  const written: string[] = [];
  const port: TerminalPort = {
    readable: new ReadableStream<Uint8Array>({ start(controller) { input = controller; } }),
    writable: new WritableStream<Uint8Array>({ write(chunk) { written.push(new TextDecoder().decode(chunk)); } }),
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  return {
    port, written,
    receive: (text: string) => input.enqueue(new TextEncoder().encode(text)),
    receiveBytes: (bytes: Uint8Array) => input.enqueue(bytes),
  };
}

describe("SerialConnection", () => {
  it("keeps raw audio out of terminal output and blocks normal commands", async () => {
    const connection = new SerialConnection();
    const { port, written, receiveBytes } = fakePort();
    await connection.connect(async () => port);
    const chunks: Uint8Array[] = [];
    connection.startRaw((chunk) => chunks.push(chunk));
    receiveBytes(new Uint8Array([65, 85, 0, 255]));
    await vi.waitFor(() => expect(chunks).toHaveLength(1));
    expect(connection.getSnapshot().output).toBe("");
    await expect(connection.send("status")).rejects.toThrow("busy");
    await connection.sendRawCommand("R");
    expect(written).toEqual(["R"]);
    await connection.disconnect();
    expect(connection.getSnapshot().rawMode).toBe(false);
  });

  it("sends exact binary bytes in raw mode and leaves it without interrupting the script", async () => {
    const connection = new SerialConnection();
    const sent: number[][] = [];
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const port: TerminalPort = {
      readable: new ReadableStream<Uint8Array>({ start(controller) { input = controller; } }),
      writable: new WritableStream<Uint8Array>({ write(chunk) { sent.push(Array.from(chunk)); } }),
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    await connection.connect(async () => port);
    await expect(connection.sendBytes(new Uint8Array([1]))).rejects.toThrow("busy");
    const received: number[][] = [];
    connection.startRaw((chunk) => received.push(Array.from(chunk)));
    await connection.sendBytes(new Uint8Array([0, 200, 255, 10, 13]));
    expect(sent).toEqual([[0, 200, 255, 10, 13]]);

    connection.endRaw();
    expect(connection.getSnapshot().rawMode).toBe(false);
    expect(sent).toEqual([[0, 200, 255, 10, 13]]);
    input.enqueue(new TextEncoder().encode("PLAYER,READY\n"));
    await vi.waitFor(() => expect(connection.getSnapshot().output).toContain("PLAYER,READY"));
    expect(received).toEqual([]);
    await connection.disconnect();
  });

  it("stays connected and keeps its output while no view is subscribed", async () => {
    const connection = new SerialConnection();
    const { port, receive } = fakePort();
    const unsubscribe = connection.subscribe(() => undefined);
    expect(await connection.connect(async () => port)).toBe(true);
    unsubscribe();
    receive("hello");
    await vi.waitFor(() => expect(connection.getSnapshot().output).toBe("hello"));
    expect(connection.getSnapshot().state).toBe("connected");
    expect(port.close).not.toHaveBeenCalled();

    expect(await connection.connect(async () => port)).toBe(true);
    expect(port.open).toHaveBeenCalledTimes(1);
    expect(await connection.disconnect()).toBe(true);
    expect(connection.getSnapshot().state).toBe("disconnected");
    expect(port.close).toHaveBeenCalledTimes(1);
  });

  it("returns to ready when the port picker is cancelled", async () => {
    const connection = new SerialConnection();
    const cancelled = Object.assign(new Error("No port selected"), { name: "NotFoundError" });
    expect(await connection.connect(() => Promise.reject(cancelled))).toBe(false);
    expect(connection.getSnapshot().state).toBe("ready");
  });

  it("sends commands only while connected and hands its port to the flasher", async () => {
    const connection = new SerialConnection();
    await expect(connection.send("status")).rejects.toThrow();
    const { port, written } = fakePort();
    await connection.connect(async () => port);
    await connection.send("status", "cr");
    expect(written).toEqual(["status\r"]);
    expect(await connection.takePort()).toBe(port);
    expect(connection.getSnapshot().state).toBe("disconnected");
  });

  it("streams the board's text to text listeners without the app's own echoes", async () => {
    const connection = new SerialConnection();
    const { port, receive } = fakePort();
    const chunks: string[] = [];
    const unsubscribe = connection.subscribeText((text) => chunks.push(text));
    await connection.connect(async () => port);
    receive("IMU,1,2,3\n");
    await vi.waitFor(() => expect(chunks).toEqual(["IMU,1,2,3\n"]));
    await connection.send("z", "none");
    expect(chunks).toEqual(["IMU,1,2,3\n"]);
    expect(connection.getSnapshot().output).toContain("› z");
    unsubscribe();
    receive("ACK,z\n");
    await vi.waitFor(() => expect(connection.getSnapshot().output).toContain("ACK,z"));
    expect(chunks).toHaveLength(1);
  });

  it("delivers IMU chunks immediately while batching terminal output", async () => {
    const connection = new SerialConnection();
    const { port, receive } = fakePort();
    const chunks: string[] = [];
    const unsubscribe = connection.subscribeText((text) => chunks.push(text));
    await connection.connect(async () => port);
    vi.useFakeTimers();
    try {
      receive("IMU,1\n");
      receive("IMU,2\n");
      for (let i = 0; i < 8 && chunks.length < 2; i++) await Promise.resolve();
      expect(chunks).toEqual(["IMU,1\n", "IMU,2\n"]);
      expect(connection.getSnapshot().output).toBe("");
      await vi.advanceTimersByTimeAsync(100);
      expect(connection.getSnapshot().output).toBe("IMU,1\nIMU,2\n");
      connection.clearOutput();
      expect(connection.getSnapshot().output).toBe("");
    } finally {
      vi.useRealTimers();
      unsubscribe();
      await connection.disconnect();
    }
  });
});
