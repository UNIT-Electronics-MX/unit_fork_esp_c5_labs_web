import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { FirmwareFlasher } from "./FirmwareFlasher";
import { MicroPythonEditor } from "./MicroPythonEditor";
import { SerialTerminal, type SerialTerminalHandle } from "./SerialTerminal";
import workbenchStyles from "./MicroPythonWorkbench.module.css";
import styles from "./FlasherPage.module.css";

export function FlasherPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const microPythonSetup = searchParams.get("profile") === "micropython";
  const requestedView = searchParams.get("view");
  const view = requestedView === "editor" || requestedView === "firmware"
    ? requestedView : microPythonSetup ? "firmware" : "editor";
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [terminalActive, setTerminalActive] = useState(false);
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [serialOperation, setSerialOperation] = useState(false);
  const [flashWorking, setFlashWorking] = useState(false);

  function selectView(nextView: "editor" | "firmware") {
    if (nextView === view) return;
    setSearchParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set("view", nextView);
      return updated;
    }, { preventScrollReset: true });
  }

  return <div className={styles.page}>
    <nav className={styles.viewSwitcher} aria-label={t("flasher.views.label")}>
      <button type="button" aria-pressed={view === "editor"} aria-controls="flash-editor-view" disabled={flashWorking} onClick={() => selectView("editor")}>{t("flasher.views.editor")}</button>
      <button type="button" aria-pressed={view === "firmware"} aria-controls="flash-firmware-view" onClick={() => selectView("firmware")}>{t("flasher.views.firmware")}</button>
    </nav>
    <div id="flash-editor-view" className={styles.viewPanel} hidden={view !== "editor"}>
      <div className={workbenchStyles.workbench}>
        <MicroPythonEditor terminalRef={terminalRef} connected={terminalConnected} blocked={flashWorking} />
        <SerialTerminal ref={terminalRef} blocked={flashWorking} onActiveChange={setTerminalActive} onConnectedChange={setTerminalConnected} onOperationChange={setSerialOperation} sidecar />
      </div>
    </div>
    <div id="flash-firmware-view" className={styles.viewPanel} hidden={view !== "firmware"}>
      <FirmwareFlasher
        key={microPythonSetup ? "micropython" : "generic"}
        terminalRef={terminalRef}
        terminalActive={terminalActive}
        terminalConnected={terminalConnected}
        serialOperation={serialOperation}
        onWorkingChange={setFlashWorking}
        microPythonSetup={microPythonSetup}
      />
    </div>
  </div>;
}
