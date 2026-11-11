import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PartIcon } from "@/ui/parts/PartIcon";
import { CHIP_PART_NAMES } from "@/ui/parts/chip-registry";
import { ChipPartIcon } from "@/ui/parts/ChipPartIcon";
import { PART_NAMES } from "@/ui/parts/registry";
import styles from "./PartsPage.module.css";

/** The parts library at a glance: every illustration, its name in code and what it shows. */
export function PartsPage() {
  const { t } = useTranslation("parts");
  return (
    <section className={styles.page} aria-labelledby="parts-title">
      <header>
        <h2 id="parts-title">{t("page.title")}</h2>
        <p>
          <Trans
            t={t}
            i18nKey="page.intro"
            values={{ example: '<PartIcon name="led" size={64} />' }}
            components={{ code: <code /> }}
          />
        </p>
      </header>
      <ul className={styles.grid}>
        {PART_NAMES.map((name) => (
          <li key={name}>
            <PartIcon name={name} size={96} />
            <code>{name}</code>
            <span>{t(`names.${name}`)}</span>
          </li>
        ))}
        {CHIP_PART_NAMES.map((name) => (
          <li key={name}>
            <ChipPartIcon name={name} size={96} />
            <code>{name}</code>
            <span>{t(`names.${name}`)}</span>
          </li>
        ))}
      </ul>
      <section className={styles.references} aria-labelledby="fritzing-references-title">
        <div className={styles.referenceHead}>
          <h3 id="fritzing-references-title">{t("references.title")}</h3>
          <p>{t("references.intro")}</p>
        </div>
        <div className={styles.referenceGrid}>
          <article className={styles.reference}>
            <div className={styles.referenceImage}>
              <img src={`${import.meta.env.BASE_URL}assets/fritzing/potentiometer_rotary_16mm.svg`} alt={t("references.potImageAlt")} />
            </div>
            <div className={styles.referenceText}>
              <h4>{t("references.potTitle")}</h4>
              <p>{t("references.potDescription")}</p>
              <Link to="/lessons/P3">{t("references.potLesson")}</Link>
              <a href="https://github.com/fritzing/fritzing-parts/blob/develop/svg/core/breadboard/potentiometer_rotary_16mm_5_breadboard.svg" target="_blank" rel="noreferrer">{t("references.fritzingSource")}</a>
            </div>
          </article>
        </div>
        <p className={styles.referenceLicense}>{t("references.license")} <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a></p>
      </section>
    </section>
  );
}
