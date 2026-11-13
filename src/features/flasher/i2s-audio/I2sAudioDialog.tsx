import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { I2sAudioViewer } from "./I2sAudioViewer";
import styles from "../MicroPythonWorkbench.module.css";

export function I2sAudioDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={ref} className={styles.viewerDialog} aria-labelledby="i2s-audio-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className={styles.viewerDialogHead}>
        <h2 id="i2s-audio-title">{t("flasher.i2sAudio.title")}</h2>
        <button className={styles.viewerDialogClose} type="button" onClick={onClose}>{t("flasher.i2sAudio.backToCode")}</button>
      </header>
      <div className={styles.viewerDialogBody}>
        <I2sAudioViewer />
      </div>
    </dialog>
  );
}
