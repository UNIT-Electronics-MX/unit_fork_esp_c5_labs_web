import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { ResolvedLesson } from "@/domain/lesson";
import { pulsarMissing } from "@/domain/pulsar";
import { useLocaleInfo } from "@/i18n/use-locale";
import { BoardPinout } from "./BoardPinout";
import { LegendDot, PadLegend } from "./PadLegend";
import styles from "./BoardCard.module.css";

const BETWEEN = ["unplug", "rewire", "check", "flash"] as const;

/** The left column: live Pulsar C5 pinout, legend and the between-lessons routine. */
export function BoardCard({ lesson }: { lesson: ResolvedLesson | null }) {
  const { t } = useTranslation();
  const { tag } = useLocaleInfo();
  // Lessons written for the ESP32-S3 may name GPIOs the Pulsar C5 header does not have.
  const missing = pulsarMissing(lesson?.pins ?? []);
  const gpio = (pin: string) => (/^\d+$/.test(pin) ? `GPIO ${pin}` : pin);
  const pinoutParams = new URLSearchParams();
  if (lesson) {
    pinoutParams.set("lesson", lesson.id);
    if (lesson.variantKey) pinoutParams.set("variant", lesson.variantKey);
  }
  const pinoutHref = `/pinout${pinoutParams.size ? `?${pinoutParams}` : ""}`;
  return (
    <section id="sec-board" tabIndex={-1} className={styles.card} aria-label={t("board.label")}>
      <BoardPinout
        pins={lesson?.pins ?? []}
        usb={Boolean(lesson?.usb || lesson?.preview)}
        boot={Boolean(lesson?.boot)}
      />
      {missing.length ? (
        <p className={styles.missing}>
          {t("board.pulsar.missing", {
            pins: new Intl.ListFormat(tag, { type: "unit" }).format(
              missing.map((p) => `${gpio(p.pin)} (${p.role})`),
            ),
          })}
        </p>
      ) : null}
      <PadLegend
        className={styles.legend}
        before={<LegendDot colour="var(--copper)">{t("board.legend.used")}</LegendDot>}
        after={
          <>
            <LegendDot colour="var(--w-btn)">{t("board.legend.button")}</LegendDot>
            <LegendDot colour="var(--rfid)">{t("board.legend.rfid")}</LegendDot>
          </>
        }
      />
      <p className={styles.strapping}>
        {t("board.pulsar.strapping")}{" "}
        <Link to={pinoutHref}>{t("board.pulsar.open")}</Link>
      </p>
      <details className={styles.between} open>
        <summary>{t("board.between.title")}</summary>
        <ol>
          <li>
            <Trans t={t} i18nKey="board.between.close" components={{ code: <code /> }} />
          </li>
          {BETWEEN.map((step) => (
            <li key={step}>{t(`board.between.${step}`)}</li>
          ))}
        </ol>
        <p>
          <Trans t={t} i18nKey="board.between.warning" components={{ code: <code /> }} />
        </p>
      </details>
    </section>
  );
}
