import { useRef, useState } from "react";
import { LessonCodeGuide } from "@/features/code/LessonCodeGuide";
import { FirmwareFlasher } from "./FirmwareFlasher";
import { MicroPythonEditor } from "./MicroPythonEditor";
import { SerialTerminal, type SerialTerminalHandle } from "./SerialTerminal";
import styles from "./MicroPythonWorkbench.module.css";

const FIRST_EXAMPLE: Readonly<Record<string, string>> = {
  "01": "neopixel",
  "02": "external-led",
  P1: "gpio",
  P2: "rgb-mixer",
  P3: "adc",
  P4: "i2c-scan",
  P5: "microsd",
  P6: "uart-loopback",
  D2: "oled-light",
  O1: "oled",
  I1: "wifi-thingspeak",
  I2: "ble-touch",
};

/** One Web Serial connection shared by the Python editor and its live REPL. */
export function MicroPythonWorkbench({ lessonId }: { lessonId: string }) {
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [connected, setConnected] = useState(false);
  const [terminalActive, setTerminalActive] = useState(false);
  const [serialOperation, setSerialOperation] = useState(false);
  const [flashWorking, setFlashWorking] = useState(false);
  const [serialError, setSerialError] = useState("");
  const focusedExampleId = FIRST_EXAMPLE[lessonId];
  // The code guide follows the workspace in a lesson; on 00 it leads into the console.
  const guide = focusedExampleId || lessonId === "00" ? (
    <LessonCodeGuide
      lessonId={lessonId}
      variant="micropython"
      connected={connected && !flashWorking}
      onCommand={(command) => terminalRef.current?.runPython(command) ?? Promise.reject(new Error("Serial console unavailable."))}
    />
  ) : null;
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
      {lessonId === "00" ? guide : null}
      {lessonId !== "00" ? <MicroPythonEditor
        initialId={FIRST_EXAMPLE[lessonId] ?? "gpio"}
        focusedExampleId={focusedExampleId}
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
      {lessonId === "00" ? null : guide}
    </div>
  );
}
