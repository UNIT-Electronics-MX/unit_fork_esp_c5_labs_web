import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { ResolvedLesson } from "@/domain/lesson";
import { pulsarMissing } from "@/domain/pulsar";
import { useLocaleInfo } from "@/i18n/use-locale";
import { BoardPinout } from "./BoardPinout";
import styles from "./BoardCard.module.css";

const LEGEND = [
  ["--copper", "used"],
  ["--pad", "safe"],
  ["--danger", "avoid"],
  ["--power", "power"],
  ["--gnd", "ground"],
  ["--w-btn", "button"],
  ["--rfid", "rfid"],
] as const;

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
      <ul className={styles.legend} aria-label={t("board.legend.label")}>
        {LEGEND.map(([color, key]) => (
          <li key={key}>
            <i style={{ background: `var(${color})` }} aria-hidden="true" />
            {t(`board.legend.${key}`)}
          </li>
        ))}
      </ul>
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
