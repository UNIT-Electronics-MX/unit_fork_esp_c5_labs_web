import { useTranslation } from "react-i18next";
import type { PinUse } from "@/domain/lesson";
import { isGpio, PULSAR_HEADER, pulsarAvoidReason, pulsarSilk } from "@/domain/pulsar";
import styles from "./PadDetail.module.css";

/** What the pinout says about one header position: name, GPIO, use, lesson role and any caution. */
export function PadDetail({ index, uses }: { index: number; uses: readonly PinUse[] }) {
  const { t } = useTranslation();
  const pad = PULSAR_HEADER[index];
  if (!pad) return null;
  const why = pulsarAvoidReason(pad.pin);
  return (
    <div className={styles.detail}>
      <h2>{pulsarSilk(pad)} <span>{isGpio(pad.pin) ? `GPIO${pad.pin}` : pad.pin}</span></h2>
      <p>{t(`board.pulsar.use.${pad.use}`)}</p>
      <p className={styles.position}>{t("board.explorer.position", { number: index + 1, label: pad.label })}</p>
      {uses.length ? <p className={styles.inLesson}>{t("board.explorer.usedAs", { roles: uses.map((item) => item.role).join(" · ") })}</p> : null}
      {why ? <p className={styles.why}>{t(`board.explorer.avoidWhy.${why}`)}</p> : null}
    </div>
  );
}
