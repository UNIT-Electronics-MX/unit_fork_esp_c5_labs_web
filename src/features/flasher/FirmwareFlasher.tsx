import { useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { SerialPortLike, Transport } from "@/vendor/esptool-js/bundle.js";
import { recordBrowserBenchAction } from "@/features/bench/browser-log";
import { makeFlashPlan, requireEsp32C5, type FlashImage } from "./flash-plan";
import { bundledFirmware, bundledFirmwareUrl, loadBundledFirmware, type BundledFirmwareKey } from "./bundled-firmware";
import type { SerialTerminalHandle } from "./SerialTerminal";
import styles from "./FlasherPage.module.css";

type SerialNavigator = Navigator & { serial?: { requestPort(): Promise<SerialPortLike> } };
type Phase = "ready" | "connecting" | "erasing" | "writing" | "done" | "error";
const MAX_LOG = 16000;

export function FirmwareFlasher({
  terminalRef,
  terminalActive,
  terminalConnected,
  serialOperation,
  onWorkingChange,
  microPythonSetup = false,
  embedded = false,
}: {
  terminalRef: RefObject<SerialTerminalHandle | null>;
  terminalActive: boolean;
  terminalConnected: boolean;
  serialOperation: boolean;
  onWorkingChange?: (working: boolean) => void;
  microPythonSetup?: boolean;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const [images, setImages] = useState<FlashImage[]>(() => [{ id: 0, file: null, address: microPythonSetup ? "0x2000" : "" }]);
  const [imageSource, setImageSource] = useState<BundledFirmwareKey | "local">("pulsar");
  const [eraseAll, setEraseAll] = useState(microPythonSetup);
  const nextId = useRef(1);
  const busy = useRef(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [progress, setProgress] = useState(0);
  const [chip, setChip] = useState("");
  const [message, setMessage] = useState("");
  const [log, setLog] = useState("");
  const serial = (navigator as SerialNavigator).serial;
  const supported = window.isSecureContext !== false && Boolean(serial);

  function appendLog(line: string) {
    setLog((previous) => (previous + line).slice(-MAX_LOG));
  }

  function patchImage(id: number, patch: Partial<FlashImage>) {
    setImages((current) => current.map((image) => image.id === id ? { ...image, ...patch } : image));
    setPhase("ready");
    setMessage("");
    setProgress(0);
  }

  async function flash() {
    if (busy.current || serialOperation || (terminalActive && !terminalConnected)) return;
    let plan;
    try {
      plan = microPythonSetup && imageSource !== "local" ? [] : makeFlashPlan(images);
    } catch (error) {
      const key = error instanceof Error && error.message === "invalidAddress" ? "invalidAddress"
        : error instanceof Error && error.message === "overlap" ? "overlap"
        : error instanceof Error && error.message === "missingImage" ? "missingImage" : "invalidFile";
      setMessage(t(`flasher.errors.${key}`));
      setPhase("error");
      recordBrowserBenchAction({
        types: ["failed"], title: "Firmware selection failed", where: "Browser flasher",
        why: "The selected image or flash offset could not be used.", result: "Check the form for details.",
      });
      return;
    }
    if (!serial || window.isSecureContext === false) {
      setMessage(t("flasher.unsupported"));
      setPhase("error");
      return;
    }

    busy.current = true;
    onWorkingChange?.(true);
    setPhase("connecting");
    setProgress(0);
    setChip("");
    setMessage("");
    setLog("");
    let port: SerialPortLike | undefined;
    let transport: Transport | undefined;
    let detectedChip = "";
    try {
      if (terminalConnected) {
        // The REPL already owns the selected port. Close its reader, then reuse it.
        port = await terminalRef.current?.takePortForFlashing() ?? undefined;
        if (!port) throw new Error("serialClose");
      } else {
        // requestPort must run in the click's user activation, before any other await.
        port = await serial.requestPort();
        if (await terminalRef.current?.disconnect() === false) throw new Error("serialClose");
      }
      const { ESPLoader, Transport: EspTransport } = await import("@/vendor/esptool-js/bundle.js");
      const fileArray = microPythonSetup && imageSource !== "local"
        ? [{ data: await loadBundledFirmware(imageSource), address: bundledFirmware[imageSource].address }]
        : await Promise.all(plan.map(async ({ file, address }) => ({
          data: new Uint8Array(await file.arrayBuffer()), address,
        })));
      transport = new EspTransport(port);
      const loader = new ESPLoader({
        transport,
        baudrate: 115200,
        terminal: {
          clean() { setLog(""); },
          write(data) { appendLog(data); },
          writeLine(data) { appendLog(`${data}\n`); },
        },
      });
      const detected = await loader.main("default_reset");
      detectedChip = loader.chip?.CHIP_NAME ?? detected;
      setChip(detected);
      requireEsp32C5(detectedChip);
      if (eraseAll) {
        setPhase("erasing");
        await loader.eraseFlash();
      }
      setPhase("writing");
      const totalBytes = fileArray.reduce((sum, image) => sum + image.data.byteLength, 0);
      const completedBefore = fileArray.map((_, index) =>
        fileArray.slice(0, index).reduce((sum, image) => sum + image.data.byteLength, 0),
      );
      await loader.writeFlash({
        fileArray,
        flashMode: "keep",
        flashFreq: "keep",
        flashSize: "keep",
        eraseAll: false,
        compress: true,
        reportProgress(fileIndex, written) {
          setProgress(Math.min(100, Math.round(100 * ((completedBefore[fileIndex] ?? 0) + written) / totalBytes)));
        },
      });
      setProgress(100);
      let resetCompleted = false;
      try {
        await loader.after("hard_reset");
        resetCompleted = true;
        setMessage(t("flasher.success"));
      } catch {
        setMessage(t("flasher.successManualReset"));
      }
      setPhase("done");
      recordBrowserBenchAction({
        types: resetCompleted ? ["install", "flash", "reset"] : ["install", "flash"],
        title: microPythonSetup ? "MicroPython firmware flashed" : "Firmware flashed",
        where: "Browser flasher",
        why: "Wrote firmware to the ESP32-C5 over Web Serial.",
        result: resetCompleted ? "Flash completed and board reset." : "Flash completed; reset the board manually.",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        setMessage(t("flasher.cancelled"));
        setPhase("ready");
      } else if (error instanceof Error && error.message === "wrongChip") {
        setMessage(t("flasher.errors.wrongChip", { chip: detectedChip || t("flasher.unknownChip") }));
        setPhase("error");
      } else if (error instanceof Error && error.message === "serialClose") {
        setMessage(t("flasher.errors.serialClose"));
        setPhase("error");
      } else if (error instanceof Error && (error.message === "bundledFirmwareUnavailable" || error.message === "bundledFirmwareInvalid")) {
        setMessage(t(`flasher.errors.${error.message}`));
        setPhase("error");
      } else {
        const detail = error instanceof Error ? error.message : String(error);
        setMessage(t("flasher.errors.connection", { detail }));
        setPhase("error");
        appendLog(`${detail}\n`);
      }
      if (!(error instanceof Error && error.name === "NotFoundError")) {
        recordBrowserBenchAction({
          types: ["failed"], title: "Firmware flash failed", where: "Browser flasher",
          why: "An attempted ESP32-C5 firmware upload did not complete.",
          result: "Check the connection log for details.",
        });
      }
    } finally {
      try {
        if (transport) await transport.disconnect();
        else if (port) await port.close();
      } catch {
        // The browser may already have released a disconnected port.
      }
      busy.current = false;
      onWorkingChange?.(false);
    }
  }

  const working = phase === "connecting" || phase === "erasing" || phase === "writing";
  const selectedFirmware = imageSource === "local" ? null : bundledFirmware[imageSource];
  return (
    <div className={styles.page} data-console-only={embedded || undefined}>
      {!embedded ? <header className={styles.head}>
        <p className={styles.eyebrow}>{t("flasher.eyebrow")}</p>
        <h1>{t("flasher.title")}</h1>
        <p>{t("flasher.intro")}</p>
      </header> : null}

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="flash-images">
          <h2 id="flash-images">{t("flasher.images")}</h2>
          <p className={styles.help}>{t(microPythonSetup ? "flasher.microPythonImageHelp" : "flasher.imageHelp")}</p>
          {microPythonSetup ? <>
            <label className={styles.sourceSelect}>
              <span>{t("flasher.firmwareSource")}</span>
              <select value={imageSource} disabled={working} onChange={(event) => {
                const source = event.target.value;
                if (source !== "pulsar" && source !== "generic" && source !== "sparkfun" && source !== "local") return;
                setImageSource(source);
                setPhase("ready");
                setMessage("");
                setProgress(0);
              }}>
                <option value="pulsar">{t("flasher.bundledPulsar")}</option>
                <option value="generic">{t("flasher.bundledGeneric")}</option>
                <option value="sparkfun">{t("flasher.bundledSparkfun")}</option>
                <option value="local">{t("flasher.localBinary")}</option>
              </select>
            </label>
            {selectedFirmware ? <p className={styles.bundledFile}>
              <strong>{selectedFirmware.filename}</strong>
              <span>{t("flasher.bundledOffset", { address: `0x${selectedFirmware.address.toString(16).padStart(4, "0")}` })}</span>
              <a href={bundledFirmwareUrl(selectedFirmware.filename)} download>{t("flasher.downloadBundled")}</a>
            </p> : null}
            {imageSource === "sparkfun" ? <p className={styles.otherBoard}>{t("flasher.sparkfunOnly")}</p> : null}
            {selectedFirmware?.source ? <a className={styles.firmwareLink} href={selectedFirmware.source} target="_blank" rel="noopener noreferrer">{t("flasher.microPythonDownload")}</a> : null}
          </> : null}
          {(!microPythonSetup || imageSource === "local") && images.map((image, index) => (
            <div className={styles.imageRow} key={image.id}>
              <label>
                <span>{t("flasher.file", { number: index + 1 })}</span>
                <input
                  type="file"
                  accept=".bin,application/octet-stream"
                  disabled={working}
                  onChange={(event) => patchImage(image.id, { file: event.target.files?.[0] ?? null })}
                />
              </label>
              <label className={styles.address}>
                <span>{t("flasher.address")}</span>
                <input
                  type="text"
                  inputMode="text"
                  spellCheck={false}
                  placeholder={microPythonSetup ? "0x2000" : "0x0"}
                  value={image.address}
                  disabled={working}
                  onChange={(event) => patchImage(image.id, { address: event.target.value })}
                />
              </label>
              {!microPythonSetup && images.length > 1 ? (
                <button
                  className={styles.remove}
                  type="button"
                  disabled={working}
                  onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}
                >{t("flasher.remove")}</button>
              ) : null}
            </div>
          ))}
          {!microPythonSetup ? <button
            className={styles.add}
            type="button"
            disabled={working}
            onClick={() => setImages((current) => [...current, { id: nextId.current++, file: null, address: "" }])}
          >{t("flasher.add")}</button> : null}
          {!microPythonSetup ? <p className={styles.help}>{t("flasher.offsetHelp")}</p> : null}
        </section>

        <section className={styles.panel} aria-labelledby="flash-connection">
          <h2 id="flash-connection">{t("flasher.connection")}</h2>
          <ol className={styles.steps}>
            <li>{t("flasher.stepCable")}</li>
            <li>{t("flasher.stepPort")}</li>
            <li>{t("flasher.stepBoot")}</li>
          </ol>
          <label className={styles.eraseOption}>
            <input type="checkbox" checked={eraseAll} disabled={working} onChange={(event) => setEraseAll(event.target.checked)} />
            <span>{t("flasher.eraseAll")}</span>
          </label>
          <p className={styles.warning}>{t(eraseAll ? "flasher.eraseAllWarning" : "flasher.warning")}</p>
          {!supported ? <p className={styles.error}>{t("flasher.unsupported")}</p> : null}
          <button className={styles.flash} type="button" disabled={!supported || working || serialOperation || (terminalActive && !terminalConnected)} onClick={() => void flash()}>
            {working ? t("flasher.working") : t(eraseAll ? "flasher.eraseAndStart" : "flasher.start")}
          </button>
          <p className={styles.status} role="status" aria-live="polite">
            {message || t(`flasher.phase.${phase}`)}
          </p>
          {chip ? <p className={styles.chip}>{t("flasher.detected", { chip })}</p> : null}
          {phase === "writing" || phase === "done" ? (
            <div className={styles.progress}>
              <progress max={100} value={progress} aria-label={t("flasher.progress")} />
              <span>{progress}%</span>
            </div>
          ) : null}
        </section>
      </div>

      {embedded ? <details className={styles.console}>
        <summary>{t("flasher.log")}</summary>
        <pre role="log" aria-live="off">{log || t("flasher.logEmpty")}</pre>
      </details> : <details className={styles.console} open={phase !== "ready"}>
        <summary>{t("flasher.log")}</summary>
        <pre role="log" aria-live="off">{log || t("flasher.logEmpty")}</pre>
      </details>}
    </div>
  );
}
