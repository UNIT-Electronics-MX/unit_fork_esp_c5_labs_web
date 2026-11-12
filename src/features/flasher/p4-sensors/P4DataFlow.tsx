import { useTranslation } from "react-i18next";
import { P4_SENSORS } from "./p4-insights";
import type { P4Sample } from "./p4-protocol";
import styles from "./P4DataFlow.module.css";

export type P4Feed = "waiting" | "live" | "stale";

interface P4DataFlowProps {
  sample: P4Sample | null;
  feed: P4Feed;
  lines: number;
  lost: number;
  rate: number;
}

/** A file name, the same in every language. */
const STREAM_SCRIPT = "p4_sensor_stream.py";

const hex = (address: number) => `0x${address.toString(16).toUpperCase().padStart(2, "0")}`;

/**
 * Where each reading travels: five sensors share the I²C bus, the C5 packs them into one line, USB
 * carries it to this page. A pulse runs along the path for every line, so a stall shows where.
 */
export function P4DataFlow({ sample, feed, lines, lost, rate }: P4DataFlowProps) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  const answered = sample ? P4_SENSORS.filter((sensor) => (sample.mask & sensor.bit) !== 0).length : 0;
  const flowing = feed === "live";
  // A new key per line restarts the pulse animation.
  const pulse = flowing && sample ? <span key={sample.sequence} className={styles.pulse} aria-hidden="true" /> : null;

  return (
    <ol className={styles.flow} aria-label={t("flasher.p4Sensors.flow.title")} data-feed={feed}>
      <li className={styles.step}>
        <span className={styles.name}>{t("flasher.p4Sensors.flow.sensors")}</span>
        <span className={styles.dots}>
          {P4_SENSORS.map((sensor) => {
            const state = !sample ? "idle" : (sample.mask & sensor.bit) !== 0 ? "ok" : "missing";
            return (
              <span
                key={sensor.key}
                className={styles.dot}
                data-state={state}
                title={`${sensor.chip} · ${hex(sensor.address)} · ${t(`flasher.p4Sensors.flow.sensorState.${state}`)}`}
              >
                <span className={styles.visuallyHidden}>{`${sensor.chip} ${t(`flasher.p4Sensors.flow.sensorState.${state}`)}`}</span>
              </span>
            );
          })}
        </span>
      </li>
      <li className={styles.link}>{pulse}</li>
      <li className={styles.step}>
        <span className={styles.name}>{t("flasher.p4Sensors.flow.bus")}</span>
        <span className={styles.value}>{t("flasher.p4Sensors.flow.answered", { count: answered })}</span>
        <small className={styles.detail}>{t("flasher.p4Sensors.flow.busPins")}</small>
      </li>
      <li className={styles.link}>{pulse}</li>
      <li className={styles.step}>
        <span className={styles.name}>{t("flasher.p4Sensors.flow.chip")}</span>
        <span className={styles.value}>{sample ? `#${number.format(sample.sequence)}` : "–"}</span>
        <small className={styles.detail}>{STREAM_SCRIPT}</small>
      </li>
      <li className={styles.link}>{pulse}</li>
      <li className={styles.step}>
        <span className={styles.name}>{t("flasher.p4Sensors.flow.usb")}</span>
        <span className={styles.value}>{t("flasher.p4Sensors.flow.rate", { rate: number.format(rate) })}</span>
        <small className={styles.detail} data-warn={lost > 0 || undefined}>{t("flasher.p4Sensors.flow.lost", { count: lost })}</small>
      </li>
      <li className={styles.link}>{pulse}</li>
      <li className={styles.step}>
        <span className={styles.name}>{t("flasher.p4Sensors.flow.page")}</span>
        <span className={styles.value} data-feed={feed}>{t(`flasher.p4Sensors.flow.feed.${feed}`)}</span>
        <small className={styles.detail}>{t("flasher.p4Sensors.flow.lines", { count: lines })}</small>
      </li>
    </ol>
  );
}
