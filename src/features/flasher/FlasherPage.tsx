import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { FirmwareFlasher } from "./FirmwareFlasher";
import { MicroPythonEditor } from "./MicroPythonEditor";
import { SerialTerminal, type SerialTerminalHandle } from "./SerialTerminal";
import workbenchStyles from "./MicroPythonWorkbench.module.css";
import styles from "./FlasherPage.module.css";

export function FlasherPage() {
  const [searchParams] = useSearchParams();
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [terminalActive, setTerminalActive] = useState(false);
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [serialOperation, setSerialOperation] = useState(false);
  const [flashWorking, setFlashWorking] = useState(false);

  return <div className={styles.page}>
    <FirmwareFlasher
      key={searchParams.get("profile") === "micropython" ? "micropython" : "generic"}
      terminalRef={terminalRef}
      terminalActive={terminalActive}
      terminalConnected={terminalConnected}
      serialOperation={serialOperation}
      onWorkingChange={setFlashWorking}
      microPythonSetup={searchParams.get("profile") === "micropython"}
    />
    <div className={workbenchStyles.workbench}>
      <MicroPythonEditor terminalRef={terminalRef} connected={terminalConnected} blocked={flashWorking} docked />
      <SerialTerminal ref={terminalRef} blocked={flashWorking} onActiveChange={setTerminalActive} onConnectedChange={setTerminalConnected} onOperationChange={setSerialOperation} docked />
    </div>
  </div>;
}
