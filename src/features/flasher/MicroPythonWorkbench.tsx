import { useRef, useState } from "react";
import { LessonCodeGuide } from "@/features/code/LessonCodeGuide";
import { FirmwareFlasher } from "./FirmwareFlasher";
import { MicroPythonEditor } from "./MicroPythonEditor";
import { SerialTerminal, type SerialTerminalHandle } from "./SerialTerminal";
import styles from "./MicroPythonWorkbench.module.css";

const FIRST_EXAMPLE: Readonly<Record<string, string>> = {
  "01": "neopixel",
  "02": "external-led",
};

/** One Web Serial connection shared by the Python editor and its live REPL. */
export function MicroPythonWorkbench({ lessonId }: { lessonId: string }) {
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [connected, setConnected] = useState(false);
  const [terminalActive, setTerminalActive] = useState(false);
  const [serialOperation, setSerialOperation] = useState(false);
  const [flashWorking, setFlashWorking] = useState(false);
  const [serialError, setSerialError] = useState("");
  const intro = ["00", "01", "02"].includes(lessonId);
  return (
    <div className={styles.workbench}>
      {lessonId === "00" ? <FirmwareFlasher
        terminalRef={terminalRef}
        terminalActive={terminalActive}
        terminalConnected={connected}
        serialOperation={serialOperation}
        onWorkingChange={setFlashWorking}
        microPythonSetup
        embedded
      /> : null}
      {intro ? <LessonCodeGuide
        lessonId={lessonId}
        variant="micropython"
        connected={connected && !flashWorking}
        onCommand={(command) => terminalRef.current?.runPython(command) ?? Promise.reject(new Error("Serial console unavailable."))}
      /> : null}
      {lessonId !== "00" ? <MicroPythonEditor
        initialId={FIRST_EXAMPLE[lessonId] ?? "gpio"}
        focusedExampleId={intro ? FIRST_EXAMPLE[lessonId] : undefined}
        terminalRef={terminalRef}
        connected={connected}
        connectionError={serialError}
        toolbarAtTop
        docked={false}
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
    </div>
  );
}
