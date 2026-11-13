import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LessonCodeGuide } from "@/features/code/LessonCodeGuide";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { FirmwareFlasher } from "./FirmwareFlasher";
import { isSoundLabMode, lessonExamples, showsImuCube, soundLabMode, type SoundLabMode } from "./lesson-examples";
import { MicroPythonEditor } from "./MicroPythonEditor";
import { SerialTerminal, type SerialTerminalHandle } from "./SerialTerminal";
import { serialConnection, useSerialConnection } from "./serial-connection";
import styles from "./MicroPythonWorkbench.module.css";

// Load viewers only when their controls are opened.
const ImuCube = lazy(() => import("./imu-cube/ImuCube").then((module) => ({ default: module.ImuCube })));
const P4SensorViewer = lazy(() => import("./p4-sensors/P4SensorViewer").then((module) => ({ default: module.P4SensorViewer })));
const ToneLabDialog = lazy(() => import("./tone-lab/ToneLabDialog").then((module) => ({ default: module.ToneLabDialog })));
const AudioPlayerDialog = lazy(() => import("./audio-player/AudioPlayerDialog").then((module) => ({ default: module.AudioPlayerDialog })));
const SoundLabDialog = lazy(() => import("./sound-lab/SoundLabDialog").then((module) => ({ default: module.SoundLabDialog })));

/** One Web Serial connection shared by the Python editor and its live REPL. */
export function MicroPythonWorkbench({ lessonId }: { lessonId: string }) {
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [connected, setConnected] = useState(false);
  const [terminalActive, setTerminalActive] = useState(false);
  const [serialOperation, setSerialOperation] = useState(false);
  const [flashWorking, setFlashWorking] = useState(false);
  const [serialError, setSerialError] = useState("");
  const [activeViewer, setActiveViewer] = useState<"imu" | "p4" | "tone" | "player" | SoundLabMode | null>(null);
  const exampleIds = lessonExamples(lessonId);
  const multiExample = exampleIds.length > 3;
  // Larger lessons show the guide before the scripts; smaller ones keep it after the editor.
  const guide = exampleIds.length || lessonId === "00" ? (
    <LessonCodeGuide
      lessonId={lessonId}
      variant="micropython"
      connected={connected && !flashWorking}
      onCommand={(command) => terminalRef.current?.runPython(command) ?? Promise.reject(new Error("Serial console unavailable."))}
    />
  ) : null;
  return (
    <div className={styles.workbench} data-multi-example={multiExample || undefined}>
      {lessonId === "00" ? <FirmwareFlasher
        terminalRef={terminalRef}
        terminalActive={terminalActive}
        terminalConnected={connected}
        serialOperation={serialOperation}
        onWorkingChange={setFlashWorking}
        microPythonSetup
        embedded
      /> : null}
      {lessonId === "00" || multiExample ? guide : null}
      {lessonId !== "00" ? <MicroPythonEditor
        initialId={exampleIds[0] ?? "gpio"}
        lessonExampleIds={exampleIds}
        terminalRef={terminalRef}
        connected={connected}
        connectionError={serialError}
        toolbarAtTop
        docked={false}
        onOpenImuCube={showsImuCube(lessonId) ? () => setActiveViewer("imu") : undefined}
        onOpenP4Sensors={lessonId === "P4" ? () => setActiveViewer("p4") : undefined}
        onOpenToneLab={lessonId === "S0B" ? () => setActiveViewer("tone") : undefined}
        onOpenAudioPlayer={lessonId === "S0B" ? () => setActiveViewer("player") : undefined}
        onOpenSoundLab={soundLabMode(exampleIds[0] ?? "") ? (exampleId) => setActiveViewer(soundLabMode(exampleId)) : undefined}
        onRun={(exampleId) => {
          if (exampleId === "imu-bmi270-cube") setActiveViewer("imu");
          if (exampleId === "p4-sensor-stream") setActiveViewer("p4");
          if (exampleId === "es8311-tone-lab") setActiveViewer("tone");
          if (exampleId === "es8311-play-serial") setActiveViewer("player");
          const soundMode = soundLabMode(exampleId);
          if (soundMode) setActiveViewer(soundMode);
        }}
      /> : null}
      <SerialTerminal
        ref={terminalRef}
        blocked={flashWorking}
        onActiveChange={setTerminalActive}
        onConnectedChange={setConnected}
        onOperationChange={setSerialOperation}
        onErrorChange={setSerialError}
        flashHint={lessonId !== "00"}
        docked={lessonId !== "00"}
        initialEnding="cr"
        sidecar={lessonId !== "00"}
        stopPythonOnConnect
      />
      {activeViewer === "tone" ? (
        <Suspense fallback={null}><ToneLabDialog onClose={() => setActiveViewer(null)} onConnect={() => void terminalRef.current?.connect()} /></Suspense>
      ) : activeViewer === "player" ? (
        <Suspense fallback={null}><AudioPlayerDialog onClose={() => setActiveViewer(null)} onConnect={() => void terminalRef.current?.connect()} /></Suspense>
      ) : activeViewer && isSoundLabMode(activeViewer) ? (
        <Suspense fallback={null}><SoundLabDialog key={activeViewer} mode={activeViewer} onClose={() => setActiveViewer(null)} onConnect={() => void terminalRef.current?.connect()} /></Suspense>
      ) : activeViewer ? (
        <SensorViewerDialog viewer={activeViewer} onClose={() => setActiveViewer(null)} onConnect={() => void terminalRef.current?.connect()} />
      ) : null}
      {lessonId === "00" || multiExample ? null : guide}
    </div>
  );
}

/** Keeps live sensor readings and useful serial messages inside one viewport. */
function SensorViewerDialog({ viewer, onClose, onConnect }: { viewer: "imu" | "p4"; onClose: () => void; onConnect: () => void }) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { output, state, operation } = useSerialConnection();
  const [controlError, setControlError] = useState("");
  const connected = state === "connected";
  const label = viewer === "imu" ? "flasher.imuCube" : "flasher.p4Sensors";
  const titleId = viewer === "imu" ? "imu-viewer-title" : "p4-viewer-title";
  const messages = output.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith(viewer === "imu" ? "IMU," : "P4,")).slice(-4).join("\n");

  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  async function stop() {
    setControlError("");
    try {
      await serialConnection.stopPython();
    } catch (cause) {
      setControlError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.viewerDialog}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <header className={styles.viewerDialogHead}>
        <div>
          <h2 id={titleId}>{t(`${label}.title`)}</h2>
          <span data-connected={connected}>{t(`flasher.serial.state.${state}`)}</span>
        </div>
        <div className={styles.viewerDialogActions}>
          {!connected ? <button type="button" disabled={state === "connecting" || state === "disconnecting"} onClick={onConnect}>{t("flasher.serial.connect")}</button> : null}
          <button type="button" disabled={!connected || operation} onClick={() => void stop()}>{t("flasher.examples.stop")}</button>
          <button type="button" className={styles.viewerDialogClose} onClick={onClose}>{t(`${label}.backToCode`)}</button>
        </div>
      </header>
      <div className={styles.viewerDialogBody}>
        <ErrorBoundary name={viewer === "imu" ? "IMU cube viewer" : "P4 sensor viewer"} resetKey={viewer}>
          <Suspense fallback={<p role="status">{t(`${label}.loading`)}</p>}>
            {viewer === "imu" ? <ImuCube focused /> : <P4SensorViewer />}
          </Suspense>
        </ErrorBoundary>
      </div>
      <div className={styles.viewerDialogLog}>
        <span>{t(`${label}.boardMessages`)}</span>
        <pre aria-live="off">{messages || t(`${label}.noBoardMessages`)}</pre>
        {controlError ? <p role="alert">{controlError}</p> : null}
      </div>
    </dialog>
  );
}
