import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { FirmwareFlasher } from "./FirmwareFlasher";
import { SerialTerminal, type SerialTerminalHandle } from "./SerialTerminal";

/** Firmware loading lives here; runnable scripts live only in their exercises. */
export function FlasherPage() {
  const [searchParams] = useSearchParams();
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [terminalActive, setTerminalActive] = useState(false);
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [serialOperation, setSerialOperation] = useState(false);
  const [flashWorking, setFlashWorking] = useState(false);

  return <>
    <FirmwareFlasher
      terminalRef={terminalRef}
      terminalActive={terminalActive}
      terminalConnected={terminalConnected}
      serialOperation={serialOperation}
      onWorkingChange={setFlashWorking}
      microPythonSetup={searchParams.get("profile") === "micropython"}
    />
    {/* Keep the shared serial session available for port handoff without a second code editor. */}
    <div hidden>
      <SerialTerminal
        ref={terminalRef}
        blocked={flashWorking}
        onActiveChange={setTerminalActive}
        onConnectedChange={setTerminalConnected}
        onOperationChange={setSerialOperation}
        sidecar
      />
    </div>
  </>;
}
