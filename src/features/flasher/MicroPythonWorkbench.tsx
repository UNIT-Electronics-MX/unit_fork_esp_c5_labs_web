import { useRef, useState } from "react";
import { LessonCodeGuide } from "@/features/code/LessonCodeGuide";
import { FirmwareFlasher } from "./FirmwareFlasher";
import { lessonExamples } from "./lesson-examples";
import { MicroPythonEditor } from "./MicroPythonEditor";
import { SerialTerminal, type SerialTerminalHandle } from "./SerialTerminal";
import styles from "./MicroPythonWorkbench.module.css";

/** One Web Serial connection shared by the Python editor and its live REPL. */
export function MicroPythonWorkbench({ lessonId }: { lessonId: string }) {
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [connected, setConnected] = useState(false);
  const [terminalActive, setTerminalActive] = useState(false);
  const [serialOperation, setSerialOperation] = useState(false);
  const [flashWorking, setFlashWorking] = useState(false);
  const [serialError, setSerialError] = useState("");
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
      {lessonId === "00" || multiExample ? null : guide}
    </div>
  );
}
