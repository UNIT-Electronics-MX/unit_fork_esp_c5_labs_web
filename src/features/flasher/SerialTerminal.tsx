import { useCallback, useEffect, useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { REPL_INTERRUPT_FAILED, SerialSession, type LineEnding, type TerminalPort } from "./serial-session";
import styles from "./SerialTerminal.module.css";

type SerialNavigator = Navigator & { serial?: { requestPort(): Promise<TerminalPort> } };
type TerminalState = "ready" | "connecting" | "connected" | "disconnecting" | "disconnected" | "error";
const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600] as const;
const MAX_OUTPUT = 100_000;

export interface SerialTerminalHandle {
  connect(): Promise<void>;
  disconnect(): Promise<boolean>;
  takePortForFlashing(): Promise<TerminalPort | null>;
  runPython(code: string): Promise<void>;
  savePython(filename: string, code: string): Promise<void>;
  stopPython(): Promise<void>;
  sendCommand(command: string, ending?: LineEnding): Promise<void>;
}

export function SerialTerminal({
  ref,
  blocked,
  onActiveChange,
  onConnectedChange,
  onErrorChange,
  onOperationChange,
  docked = false,
  flashHint = true,
  initialEnding = "lf",
  sidecar = false,
  stopPythonOnConnect = false,
}: {
  ref?: Ref<SerialTerminalHandle>;
  blocked: boolean;
  onActiveChange: (active: boolean) => void;
  onConnectedChange: (connected: boolean) => void;
  onErrorChange?: (error: string) => void;
  onOperationChange?: (busy: boolean) => void;
  docked?: boolean;
  flashHint?: boolean;
  initialEnding?: LineEnding;
  sidecar?: boolean;
  stopPythonOnConnect?: boolean;
}) {
  const { t } = useTranslation();
  const [baudRate, setBaudRate] = useState(115200);
  const [ending, setEnding] = useState<LineEnding>(initialEnding);
  const [state, setState] = useState<TerminalState>("ready");
  const [output, setOutput] = useState("");
  const [command, setCommand] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [operation, setOperation] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const sessionRef = useRef<SerialSession | null>(null);
  const portRef = useRef<TerminalPort | null>(null);
  const activeRef = useRef(false);
  const operationRef = useRef(false);
  const mountedRef = useRef(true);
  const outputRef = useRef<HTMLPreElement>(null);
  const serial = (navigator as SerialNavigator).serial;
  const supported = window.isSecureContext !== false && Boolean(serial);
  const connected = state === "connected";
  const active = state === "connecting" || state === "connected" || state === "disconnecting";

  function describeError(cause: unknown): string {
    const detail = cause instanceof Error ? cause.message : String(cause);
    if (detail === "noReadable") return t("flasher.serial.noReadable");
    if (detail === "notWritable") return t("flasher.serial.notWritable");
    if (detail === REPL_INTERRUPT_FAILED) return t("flasher.serial.replInterruptFailed");
    return detail;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void sessionRef.current?.close();
      onActiveChange(false);
      onConnectedChange(false);
      onOperationChange?.(false);
    };
  }, [onActiveChange, onConnectedChange, onOperationChange]);

  useEffect(() => {
    if (autoScroll && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output, autoScroll]);

  function appendOutput(text: string) {
    if (mountedRef.current && text) setOutput((previous) => (previous + text).slice(-MAX_OUTPUT));
  }

  const disconnect = useCallback(async (): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session) return true;
    setState("disconnecting");
    try {
      return await session.close();
    } catch (cause) {
      if (mountedRef.current) {
        setState("error");
        setError(cause instanceof Error ? cause.message : String(cause));
      }
      return false;
    }
  }, []);

  async function pythonOperation(task: (session: SerialSession) => Promise<void>): Promise<void> {
    const session = sessionRef.current;
    if (!session || !connected) throw new Error("Connect the serial console first.");
    if (operationRef.current) throw new Error("A MicroPython action is already running.");
    operationRef.current = true;
    setOperation(true);
    onOperationChange?.(true);
    try {
      await task(session);
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setOperation(false);
      onOperationChange?.(false);
    }
  }

  useImperativeHandle(ref, () => ({
    connect,
    disconnect,
    takePortForFlashing: async () => {
      const port = portRef.current;
      if (!port || !sessionRef.current || !await disconnect()) return null;
      portRef.current = null;
      return port;
    },
    runPython: (code) => pythonOperation((session) => session.runPython(code)),
    savePython: (filename, code) => pythonOperation((session) => session.savePython(filename, code)),
    stopPython: async () => {
      const session = sessionRef.current;
      if (!session || !connected) throw new Error("Connect the serial console first.");
      await session.stopPython();
    },
    sendCommand,
  }));

  async function connect() {
    if (!serial || blocked || activeRef.current) return;
    activeRef.current = true;
    onActiveChange(true);
    setState("connecting");
    setError("");
    onErrorChange?.("");
    try {
      // Keep requestPort in the user gesture before any other await.
      const port = await serial.requestPort();
      if (!mountedRef.current) return;
      portRef.current = port;
      const session = new SerialSession(
        port,
        appendOutput,
        (cause) => {
          if (sessionRef.current !== session) return;
          sessionRef.current = null;
          portRef.current = null;
          activeRef.current = false;
          onActiveChange(false);
          onConnectedChange(false);
          if (!mountedRef.current) return;
          setState(cause ? "error" : "disconnected");
          if (cause) {
            const detail = describeError(cause);
            setError(detail);
            onErrorChange?.(detail);
          }
        },
      );
      sessionRef.current = session;
      await session.open(baudRate);
      if (stopPythonOnConnect) await session.stopPython();
      if (sessionRef.current === session && mountedRef.current) {
        setState("connected");
        onConnectedChange(true);
      }
    } catch (cause) {
      if (sessionRef.current) await sessionRef.current.close();
      portRef.current = null;
      activeRef.current = false;
      onActiveChange(false);
      onConnectedChange(false);
      if (!mountedRef.current) return;
      if (cause instanceof Error && cause.name === "NotFoundError") {
        setState("ready");
      } else {
        setState("error");
        const detail = describeError(cause);
        setError(detail);
        onErrorChange?.(detail);
      }
    }
  }

  async function sendCommand(text: string, lineEnding: LineEnding = "lf") {
    const session = sessionRef.current;
    if (!session || !connected) throw new Error("Connect the serial console first.");
    if (sending || operationRef.current) throw new Error("Serial console is busy.");
    setSending(true);
    try {
      await session.send(text, lineEnding);
      appendOutput(`\n› ${text}\n`);
    } finally {
      setSending(false);
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!command.trim()) return;
    try {
      await sendCommand(command, ending);
      setCommand("");
    } catch (cause) {
      setError(describeError(cause));
    }
  }

  return (
    <section className={`${styles.terminal} ${docked ? styles.docked : ""} ${sidecar ? styles.sidecar : ""}`} data-console-only={!sidecar || undefined} aria-labelledby="serial-terminal-title">
      <header className={styles.head}>
        <div>
          <h2 id="serial-terminal-title">{t(docked ? "flasher.serial.dockedTitle" : "flasher.serial.title")}</h2>
          {!docked ? <p>{t("flasher.serial.intro")}</p> : null}
        </div>
        <span className={styles.state} data-state={state} role="status">
          {t(`flasher.serial.state.${state}`)}
        </span>
      </header>

      <div className={styles.toolbar}>
        <label>
          <span>{t("flasher.serial.baudRate")}</span>
          <select value={baudRate} disabled={active || blocked} onChange={(event) => setBaudRate(Number(event.target.value))}>
            {BAUD_RATES.map((rate) => <option key={rate} value={rate}>{rate}</option>)}
          </select>
        </label>
        <label>
          <span>{t("flasher.serial.lineEnding")}</span>
          <select value={ending} onChange={(event) => setEnding(event.target.value as LineEnding)}>
            <option value="none">{t("flasher.serial.ending.none")}</option>
            <option value="lf">{t("flasher.serial.ending.lf")}</option>
            <option value="cr">{t("flasher.serial.ending.cr")}</option>
            <option value="crlf">{t("flasher.serial.ending.crlf")}</option>
          </select>
        </label>
        {!docked ? connected ? (
          <button type="button" onClick={() => void disconnect()}>{t("flasher.serial.disconnect")}</button>
        ) : (
          <button type="button" disabled={!supported || blocked || active} onClick={() => void connect()}>
            {t("flasher.serial.connect")}
          </button>
        ) : null}
        <button type="button" disabled={!output} onClick={() => setOutput("")}>{t("flasher.serial.clear")}</button>
      </div>

      {blocked ? <p className={styles.note}>{t("flasher.serial.waitFlash")}</p> : null}
      {connected && flashHint ? <p className={styles.note}>{t("flasher.serial.disconnectToFlash")}</p> : null}
      {!supported ? <p className={styles.error}>{t("flasher.unsupported")}</p> : null}
      {error ? <p className={styles.error} role="alert">{t("flasher.serial.error", { detail: error })}</p> : null}

      <pre className={styles.output} ref={outputRef} role="log" aria-label={t("flasher.serial.output")} aria-live="off">
        {output || t("flasher.serial.empty")}
      </pre>

      <form className={styles.command} onSubmit={(event) => void send(event)}>
        <label htmlFor="serial-command">{t("flasher.serial.command")}</label>
        <div>
          <textarea
            id="serial-command"
            rows={2}
            value={command}
            disabled={!connected || operation}
            placeholder={t("flasher.serial.placeholder")}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" disabled={!connected || operation || sending || !command.trim()}>{t("flasher.serial.send")}</button>
        </div>
        <p>{t("flasher.serial.sendHint")}</p>
      </form>

      <label className={styles.autoScroll}>
        <input type="checkbox" checked={autoScroll} onChange={(event) => setAutoScroll(event.target.checked)} />
        {t("flasher.serial.autoScroll")}
      </label>
    </section>
  );
}
