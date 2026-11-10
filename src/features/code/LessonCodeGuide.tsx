import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./LessonCodeGuide.module.css";

type Variant = "arduino" | "micropython";

const FOCUS: Record<string, string> = {
  "arduino:01": "BRIGHTNESS = 40",
  "arduino:02": "line.startsWith(\"blink \"",
  "arduino:P1": "BOOT_BUTTON = 28",
  "arduino:P2": "rgbLedWrite(RGB_PIN",
  "arduino:P3": "analogReadMilliVolts(POT_PIN)",
  "arduino:P4": "Wire.begin(SDA_PIN",
  "arduino:P5": "SD.begin(CS_PIN",
  "arduino:P6": "Serial1.begin(115200",
  "arduino:D1": "readRegister(address, CHIP_ID_REG",
  "arduino:D2": "DevLabDDP::Master temt6000",
  "arduino:O1": "display.begin(",
  "micropython:01": "BRIGHTNESS = 40",
  "micropython:02": "sleep_ms(12)",
  "micropython:P1": "BOOT_PIN = 28",
  "micropython:P2": "LEVEL = 40",
  "micropython:P3": "adc.read_uv()",
  "micropython:P4": "i2c.scan()",
  "micropython:P5": "SDCard(spi,",
  "micropython:P6": "UART(1,",
  "micropython:D1": "i2c.readfrom_mem(address, CHIP_ID_REG",
  "micropython:D2": "ddp_read(0x60, 2)",
  "micropython:O1": "SSD1306_I2C(WIDTH",
  "arduino:I1": "const char* WIFI_SSID",
  "arduino:I2": "touch->notify()",
  "micropython:I1": "WIFI_SSID = ",
  "micropython:I2": "ble.gatts_notify(connection",
};
const COMMANDS: Record<string, readonly string[]> = {
  "arduino:02": ["blink 200", "blink 800"],
  "arduino:P2": ["rgb 255 80 0", "level 20", "level 100", "off"],
  "arduino:P6": ["hello UART"],
  "micropython:00": ['print("MicroPython OK")'],
};
const GUIDE_KEYS = {
  "arduino:01": ["codeRoute.guide.arduino.01.title", "codeRoute.guide.arduino.01.try", "codeRoute.guide.arduino.01.expect"],
  "arduino:02": ["codeRoute.guide.arduino.02.title", "codeRoute.guide.arduino.02.try", "codeRoute.guide.arduino.02.expect"],
  "arduino:P1": ["codeRoute.guide.arduino.P1.title", "codeRoute.guide.arduino.P1.try", "codeRoute.guide.arduino.P1.expect"],
  "arduino:P2": ["codeRoute.guide.arduino.P2.title", "codeRoute.guide.arduino.P2.try", "codeRoute.guide.arduino.P2.expect"],
  "arduino:P3": ["codeRoute.guide.arduino.P3.title", "codeRoute.guide.arduino.P3.try", "codeRoute.guide.arduino.P3.expect"],
  "arduino:P4": ["codeRoute.guide.arduino.P4.title", "codeRoute.guide.arduino.P4.try", "codeRoute.guide.arduino.P4.expect"],
  "arduino:P5": ["codeRoute.guide.arduino.P5.title", "codeRoute.guide.arduino.P5.try", "codeRoute.guide.arduino.P5.expect"],
  "arduino:P6": ["codeRoute.guide.arduino.P6.title", "codeRoute.guide.arduino.P6.try", "codeRoute.guide.arduino.P6.expect"],
  "arduino:D1": ["codeRoute.guide.arduino.D1.title", "codeRoute.guide.arduino.D1.try", "codeRoute.guide.arduino.D1.expect"],
  "arduino:D2": ["codeRoute.guide.arduino.D2.title", "codeRoute.guide.arduino.D2.try", "codeRoute.guide.arduino.D2.expect"],
  "arduino:O1": ["codeRoute.guide.arduino.O1.title", "codeRoute.guide.arduino.O1.try", "codeRoute.guide.arduino.O1.expect"],
  "micropython:00": ["codeRoute.guide.micropython.00.title", "codeRoute.guide.micropython.00.try", "codeRoute.guide.micropython.00.expect"],
  "micropython:01": ["codeRoute.guide.micropython.01.title", "codeRoute.guide.micropython.01.try", "codeRoute.guide.micropython.01.expect"],
  "micropython:02": ["codeRoute.guide.micropython.02.title", "codeRoute.guide.micropython.02.try", "codeRoute.guide.micropython.02.expect"],
  "micropython:P1": ["codeRoute.guide.micropython.P1.title", "codeRoute.guide.micropython.P1.try", "codeRoute.guide.micropython.P1.expect"],
  "micropython:P2": ["codeRoute.guide.micropython.P2.title", "codeRoute.guide.micropython.P2.try", "codeRoute.guide.micropython.P2.expect"],
  "micropython:P3": ["codeRoute.guide.micropython.P3.title", "codeRoute.guide.micropython.P3.try", "codeRoute.guide.micropython.P3.expect"],
  "micropython:P4": ["codeRoute.guide.micropython.P4.title", "codeRoute.guide.micropython.P4.try", "codeRoute.guide.micropython.P4.expect"],
  "micropython:P5": ["codeRoute.guide.micropython.P5.title", "codeRoute.guide.micropython.P5.try", "codeRoute.guide.micropython.P5.expect"],
  "micropython:P6": ["codeRoute.guide.micropython.P6.title", "codeRoute.guide.micropython.P6.try", "codeRoute.guide.micropython.P6.expect"],
  "micropython:D1": ["codeRoute.guide.micropython.D1.title", "codeRoute.guide.micropython.D1.try", "codeRoute.guide.micropython.D1.expect"],
  "micropython:D2": ["codeRoute.guide.micropython.D2.title", "codeRoute.guide.micropython.D2.try", "codeRoute.guide.micropython.D2.expect"],
  "micropython:O1": ["codeRoute.guide.micropython.O1.title", "codeRoute.guide.micropython.O1.try", "codeRoute.guide.micropython.O1.expect"],
  "arduino:I1": ["codeRoute.guide.arduino.I1.title", "codeRoute.guide.arduino.I1.try", "codeRoute.guide.arduino.I1.expect"],
  "arduino:I2": ["codeRoute.guide.arduino.I2.title", "codeRoute.guide.arduino.I2.try", "codeRoute.guide.arduino.I2.expect"],
  "micropython:I1": ["codeRoute.guide.micropython.I1.title", "codeRoute.guide.micropython.I1.try", "codeRoute.guide.micropython.I1.expect"],
  "micropython:I2": ["codeRoute.guide.micropython.I2.title", "codeRoute.guide.micropython.I2.try", "codeRoute.guide.micropython.I2.expect"],
} as const;

/** A single experiment next to the editable source, separate from the wiring guide. */
export function LessonCodeGuide({
  lessonId,
  variant,
  connected = false,
  onCommand,
}: {
  lessonId: string;
  variant: Variant;
  connected?: boolean;
  onCommand?: (command: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const key = `${variant}:${lessonId}`;
  const guide = GUIDE_KEYS[key as keyof typeof GUIDE_KEYS];
  if (!guide) return null;

  function locate() {
    const editor = document.querySelector<HTMLTextAreaElement>("[data-lesson-code]");
    const token = FOCUS[key];
    if (!editor || !token) {
      setNotice(t("codeRoute.guide.codeUnavailable"));
      return;
    }
    const start = editor.value.indexOf(token);
    if (start < 0) {
      setNotice(t("codeRoute.guide.lineChanged"));
      return;
    }
    editor.focus();
    editor.setSelectionRange(start, start + token.length);
    const line = editor.value.slice(0, start).split("\n").length;
    editor.scrollTop = Math.max(0, (line - 4) * 21);
    setNotice("");
  }

  async function sendCommand(command: string) {
    if (!onCommand || !connected || busy) return;
    setBusy(true);
    setNotice("");
    try {
      await onCommand(command);
    } catch (cause) {
      setNotice(t("codeRoute.guide.commandError", { detail: cause instanceof Error ? cause.message : String(cause) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className={styles.guide} data-workspace-guide aria-label={t("codeRoute.guide.label")}>
      <div className={styles.title}>
        <span>{t("codeRoute.guide.label")}</span>
        <h2>{t(guide[0])}</h2>
      </div>
      <div className={styles.steps}>
        <p><strong>{t("codeRoute.guide.try")}</strong>{t(guide[1])}</p>
        <p><strong>{t("codeRoute.guide.expect")}</strong>{t(guide[2])}</p>
      </div>
      <div className={styles.actions}>
        {FOCUS[key] ? <button type="button" onClick={locate}>{t("codeRoute.guide.locate")}</button> : null}
        {COMMANDS[key]?.map((command) => (
          <button key={command} type="button" disabled={!connected || busy} onClick={() => void sendCommand(command)}>
            <code>{command}</code>
          </button>
        ))}
        {COMMANDS[key]?.length && !connected ? <span>{t("codeRoute.guide.connectFirst")}</span> : null}
      </div>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    </aside>
  );
}
