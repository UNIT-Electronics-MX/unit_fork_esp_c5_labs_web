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
  return { port, written, receive: (text: string) => input.enqueue(new TextEncoder().encode(text)) };
}

describe("SerialConnection", () => {
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
});
