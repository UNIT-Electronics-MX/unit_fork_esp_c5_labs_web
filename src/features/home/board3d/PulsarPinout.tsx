import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { isGpio, PULSAR_HEADER } from "@/domain/pulsar";
import { BoardPinout } from "@/features/board/BoardPinout";
import { PadLegend } from "@/features/board/PadLegend";
import { PULSAR_SOURCE as SOURCE } from "@/features/board/pulsar-assets";
import styles from "./PulsarPinout.module.css";

export function PulsarPinout({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { t } = useTranslation();

  return (
    <details className={styles.pinout} open={defaultOpen}>
      <summary>{t("board.pulsar.summary")}</summary>
      <p className={styles.note}>
        {t("board.pulsar.note")}
      </p>
      <div className={styles.content}>
        <figure className={styles.diagram}>
          {/* Drawn from the same header data as the interactive pinout, so the two always agree. */}
          <BoardPinout pins={[]} usb={false} boot={false} detailed reference />
          <PadLegend className={styles.legend} />
          <figcaption>
            <Link to="/pinout">{t("board.pulsar.open")}</Link>
          </figcaption>
        </figure>
        <div className={styles.scroll}>
          <table>
            <thead>
              <tr>
                <th scope="col">{t("board.pulsar.position")}</th>
                <th scope="col">{t("board.pulsar.label")}</th>
                <th scope="col">{t("board.pulsar.gpio")}</th>
                <th scope="col">{t("board.pulsar.mainUse")}</th>
              </tr>
            </thead>
            <tbody>
              {PULSAR_HEADER.map((p, i) => (
                <tr key={i}>
                  <th scope="row">{i + 1}</th>
                  <td>{p.label}</td>
                  <td>{isGpio(p.pin) ? p.pin : "—"}</td>
                  <td>{t(`board.pulsar.use.${p.use}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className={styles.source}>
        <a href={SOURCE} target="_blank" rel="noreferrer">
          {t("board.pulsar.source")}
        </a>
      </p>
    </details>
  );
}
