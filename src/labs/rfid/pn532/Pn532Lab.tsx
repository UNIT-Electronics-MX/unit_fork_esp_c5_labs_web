import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WidgetProps } from "@/widgets/types";
import styles from "./Pn532Lab.module.css";

const EVENTS: Readonly<Record<string, number>> = {
  R1: 4, R2: 4, R3: 4, R4: 4, R5: 4, R6: 4, R7: 5, R8: 4,
};
const SCENARIO_KEYS = {
  R1: "pn532.scenarios.R1", R2: "pn532.scenarios.R2",
  R3: "pn532.scenarios.R3", R4: "pn532.scenarios.R4",
  R5: "pn532.scenarios.R5", R6: "pn532.scenarios.R6",
  R7: "pn532.scenarios.R7", R8: "pn532.scenarios.R8",
} as const;

/** One event at a time from the PN532 MicroPython example, with no board required. */
export function Pn532Lab({ lesson }: WidgetProps) {
  const { t } = useTranslation("labs-rfid");
  const [event, setEvent] = useState(0);
  const id = lesson.id in EVENTS ? lesson.id : "R1";
  const count = EVENTS[id] ?? 4;
  const active = event > 0 && id !== "R1";
  const scenarioKey = SCENARIO_KEYS[id as keyof typeof SCENARIO_KEYS] ?? SCENARIO_KEYS.R1;
  const lines = t(scenarioKey, { returnObjects: true });
  return (
    <div className={styles.root}>
      <p className={styles.caption}>{t("pn532.caption")}</p>
      <div className={styles.scene}>
        <div className={styles.board} aria-label={t("pn532.boardLabel")}>
          <span className={styles.chip}>PN532</span>
          <span className={styles.antenna} aria-hidden="true" />
          <span className={styles.pin}>{t("pn532.bus")}</span>
        </div>
        <div className={styles.link} aria-hidden="true">
          <span>3V3</span><span>GND</span><span>SDA</span><span>SCL</span>
        </div>
        <div className={styles.host}>{t("pn532.host")}</div>
        {active ? <div className={styles.tag}>{t("pn532.tag")}</div> : null}
      </div>
      <div className={styles.log} role="status" aria-live="polite" dir="ltr">
        <span className={styles.prompt}>&gt;</span> {lines[event]}
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={() => setEvent((value) => Math.min(value + 1, count - 1))} disabled={event >= count - 1}>
          {t("pn532.next")}
        </button>
        <button type="button" onClick={() => setEvent(0)} disabled={event === 0}>
          {t("pn532.reset")}
        </button>
        <span>{t("pn532.progress", { current: event + 1, total: count })}</span>
      </div>
    </div>
  );
}
