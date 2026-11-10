import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { recordBrowserBenchAction } from "@/features/bench/browser-log";
import { splitReplOutput } from "./repl-output";
import { serialConnection, useSerialConnection } from "./serial-connection";
import { REPL_INTERRUPT_FAILED, type LineEnding, type TerminalPort } from "./serial-session";
import styles from "./SerialTerminal.module.css";

type SerialNavigator = Navigator & { serial?: { requestPort(): Promise<TerminalPort> } };
const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600] as const;

export interface SerialTerminalHandle {
  connect(): Promise<void>;
  disconnect(): Promise<boolean>;
  takePortForFlashing(): Promise<TerminalPort | null>;
  runPython(code: string): Promise<void>;
  savePython(filename: string, code: string): Promise<void>;
  stopPython(): Promise<void>;
  sendCommand(command: string, ending?: LineEnding): Promise<void>;
}

/** A view of the app's one serial connection: unmounting it leaves the board connected. */
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
  const { state, output, baudRate, operation, error: connectionError } = useSerialConnection();
  const [ending, setEnding] = useState<LineEnding>(initialEnding);
  const [command, setCommand] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef<HTMLPreElement>(null);
  const serial = (navigator as SerialNavigator).serial;
  const supported = window.isSecureContext !== false && Boolean(serial);
  const connected = state === "connected";
  const active = state === "connecting" || state === "connected" || state === "disconnecting";
  const error = sendError || (connectionError ? describeError(connectionError) : "");

  function describeError(detail: string): string {
    if (detail === "noReadable") return t("flasher.serial.noReadable");
    if (detail === "notWritable") return t("flasher.serial.notWritable");
    if (detail === REPL_INTERRUPT_FAILED) return t("flasher.serial.replInterruptFailed");
    return detail;
  }

  // The parent mirrors the shared connection, also when this view mounts onto an open one.
  useEffect(() => onActiveChange(active), [active, onActiveChange]);
  useEffect(() => onConnectedChange(connected), [connected, onConnectedChange]);
  useEffect(() => onOperationChange?.(operation), [operation, onOperationChange]);
  const reportedError = connectionError ? describeError(connectionError) : "";
  useEffect(() => onErrorChange?.(reportedError), [reportedError, onErrorChange]);

  useEffect(() => {
    if (autoScroll && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output, autoScroll]);

  useImperativeHandle(ref, () => ({
    connect,
    disconnect: () => serialConnection.disconnect(),
    takePortForFlashing: () => serialConnection.takePort(),
    runPython: (code) => serialConnection.runPython(code, t("flasher.serial.running")),
    savePython: (filename, code) => serialConnection.savePython(filename, code),
    stopPython: () => serialConnection.stopPython(),
    sendCommand,
  }));

  async function connect() {
    if (!serial || blocked) return;
    setSendError("");
    try {
      // requestPort is the store's first call, inside this click's user activation.
      if (await serialConnection.connect(() => serial.requestPort(), stopPythonOnConnect)) {
        recordBrowserBenchAction({
          types: ["observe"], title: "Serial console connected", where: "Browser serial",
          why: "Opened the board's serial port.", result: `Connected at ${serialConnection.getSnapshot().baudRate} baud.`,
        });
      }
    } catch {
      recordBrowserBenchAction({
        types: ["failed"], title: "Serial connection failed", where: "Browser serial",
        why: "The board's serial port could not be opened.", result: "Check the terminal for details.",
      });
    }
  }

  async function sendCommand(text: string, lineEnding: LineEnding = "lf") {
    if (sending) throw new Error("Serial console is busy.");
    setSending(true);
    try {
      await serialConnection.send(text, lineEnding);
      recordBrowserBenchAction({
        types: ["read"], title: "Serial command sent", where: "Browser serial",
        why: "Sent a command to the connected board.", result: "Command sent; its text and output were not saved here.",
      });
    } catch (cause) {
      recordBrowserBenchAction({
        types: ["failed"], title: "Serial command failed", where: "Browser serial",
        why: "A command could not be sent to the board.", result: "Check the terminal for details.",
      });
      throw cause;
    } finally {
      setSending(false);
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!command.trim()) return;
    setSendError("");
    try {
      await sendCommand(command, ending);
      setCommand("");
    } catch (cause) {
      setSendError(describeError(cause instanceof Error ? cause.message : String(cause)));
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
          <select value={baudRate} disabled={active || blocked} onChange={(event) => serialConnection.setBaudRate(Number(event.target.value))}>
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
          <button type="button" onClick={() => void serialConnection.disconnect()}>{t("flasher.serial.disconnect")}</button>
        ) : (
          <button type="button" disabled={!supported || blocked || active} onClick={() => void connect()}>
            {t("flasher.serial.connect")}
          </button>
        ) : null}
        <button type="button" disabled={!output} onClick={() => serialConnection.clearOutput()}>{t("flasher.serial.clear")}</button>
      </div>

      {blocked ? <p className={styles.note}>{t("flasher.serial.waitFlash")}</p> : null}
      {connected && flashHint ? <p className={styles.note}>{t("flasher.serial.disconnectToFlash")}</p> : null}
      {!supported ? <p className={styles.error}>{t("flasher.unsupported")}</p> : null}
      {error ? <p className={styles.error} role="alert">{t("flasher.serial.error", { detail: error })}</p> : null}

      <pre className={styles.output} ref={outputRef} role="log" aria-label={t("flasher.serial.output")} aria-live="off">
        {output
          ? splitReplOutput(output).map((segment, index) => (
            <span key={index} className={styles.segment} data-tone={segment.tone}>{segment.text}</span>
          ))
          : t("flasher.serial.empty")}
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
