import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { BoardExplorer } from "@/features/home/board3d/BoardExplorer";
import { PulsarPinout } from "@/features/home/board3d/PulsarPinout";
import {
  C5_BLOCK_GROUPS,
  C5_CHAPTERS,
  C5_HARDWARE_URL,
  C5_MEMORY,
  C5_METRICS,
  C5_OFFICIAL_URL,
  C5_PDF_URL,
  C5_SECTIONS,
  pdfPage,
  sectionForPath,
} from "./data";
import styles from "./C5Datasheet.module.css";

export function C5Datasheet() {
  const { t } = useTranslation("c5");
  const { pathname } = useLocation();
  const section = sectionForPath(pathname);

  return (
    <div className={styles.page}>
      <title>{t("title", { page: t(`nav.${section}`) })}</title>
      <header className={styles.header}>
        <p className={styles.kicker}>{t("kicker")}</p>
        <h1>{t(`headings.${section}`)}</h1>
        <p>{t(`intros.${section}`)}</p>
      </header>

      <nav className={styles.nav} aria-label={t("nav.label")}>
        {C5_SECTIONS.map((item) => (
          <Link key={item.id} to={item.path} aria-current={section === item.id ? "page" : undefined}>
            {t(`nav.${item.id}`)}
          </Link>
        ))}
      </nav>

      {section === "overview" && (
        <div className={styles.content}>
          <section aria-labelledby="c5-at-glance">
            <div className={styles.sectionHead}>
              <h2 id="c5-at-glance">{t("overview.atGlance")}</h2>
              <SourceLink page={2} />
            </div>
            <div className={styles.metrics}>
              {C5_METRICS.map((item) => (
                <div className={styles.metric} key={item.id}>
                  <strong>{item.value}</strong>
                  <span>{t(`metrics.${item.id}`)}</span>
                  <SourceLink page={item.page} />
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="c5-board">
            <div className={styles.sectionHead}>
              <div>
                <h2 id="c5-board">{t("overview.boardTitle")}</h2>
                <p>{t("overview.boardText")}</p>
              </div>
              <a href={C5_HARDWARE_URL} target="_blank" rel="noreferrer">{t("source.hardware")}</a>
            </div>
            <BoardExplorer />
          </section>

          <section className={styles.callout} aria-labelledby="c5-chip-board">
            <h2 id="c5-chip-board">{t("overview.chipBoardTitle")}</h2>
            <p>{t("overview.chipBoardText")}</p>
            <div className={styles.actions}>
              <Link to="/datasheet/inside">{t("overview.exploreInside")}</Link>
              <Link to="/datasheet/pins">{t("overview.explorePins")}</Link>
            </div>
          </section>
        </div>
      )}

      {section === "inside" && (
        <div className={styles.content}>
          <section className={styles.twoColumns} aria-label={t("inside.coresLabel")}>
            <article className={styles.card}>
              <p className={styles.eyebrow}>{t("inside.hpEyebrow")}</p>
              <h2>{t("inside.hpTitle")}</h2>
              <p>{t("inside.hpText")}</p>
              <SourceLink page={38} />
            </article>
            <article className={styles.card}>
              <p className={styles.eyebrow}>{t("inside.lpEyebrow")}</p>
              <h2>{t("inside.lpTitle")}</h2>
              <p>{t("inside.lpText")}</p>
              <SourceLink page={39} />
            </article>
          </section>
          <section aria-labelledby="c5-memory">
            <div className={styles.sectionHead}>
              <h2 id="c5-memory">{t("inside.memoryTitle")}</h2>
              <SourceLink page={41} />
            </div>
            <div className={styles.memory}>
              {C5_MEMORY.map((item) => (
                <div className={styles.card} key={item.id}>
                  <strong>{item.value}</strong>
                  <h3>{t(`memory.${item.id}.title`)}</h3>
                  <p>{t(`memory.${item.id}.text`)}</p>
                  <SourceLink page={item.page} />
                </div>
              ))}
            </div>
          </section>
          <section className={styles.callout}>
            <h2>{t("inside.flashTitle")}</h2>
            <p>{t("inside.flashText")}</p>
            <a href={C5_HARDWARE_URL} target="_blank" rel="noreferrer">{t("source.hardware")}</a>
          </section>
        </div>
      )}

      {section === "pins" && (
        <div className={styles.content}>
          <div className={styles.callout}>
            <h2>{t("pins.twoMapsTitle")}</h2>
            <p>{t("pins.twoMapsText")}</p>
            <div className={styles.actions}>
              <SourceLink page={16} />
              <SourceLink page={33} />
            </div>
          </div>
          <PulsarPinout defaultOpen />
          <p className={styles.note}>{t("pins.bootNote")}</p>
        </div>
      )}

      {section === "blocks" && (
        <div className={styles.content}>
          {C5_BLOCK_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`c5-${group.id}`}>
              <div className={styles.sectionHead}>
                <h2 id={`c5-${group.id}`}>{t(`groups.${group.id}`)}</h2>
              </div>
              <div className={styles.blockGrid}>
                {group.blocks.map((block) => (
                  <article id={block.id} className={styles.card} key={block.id}>
                    <h3>{t(`blocks.${block.id}.title`)}</h3>
                    <p>{t(`blocks.${block.id}.text`)}</p>
                    <SourceLink page={block.page} />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {section === "read" && (
        <div className={styles.content}>
          <div className={styles.actions}>
            <a className={styles.primaryLink} href={C5_PDF_URL} target="_blank" rel="noreferrer">{t("read.openLocal")}</a>
            <a href={C5_OFFICIAL_URL} target="_blank" rel="noreferrer">{t("read.openOfficial")}</a>
          </div>
          <section aria-labelledby="c5-chapters">
            <h2 id="c5-chapters">{t("read.contents")}</h2>
            <div className={styles.chapters}>
              {C5_CHAPTERS.map((item) => (
                <a key={item.id} href={pdfPage(item.page)} target="_blank" rel="noreferrer">
                  <span>{t(`chapters.${item.id}`)}</span>
                  <span>{t("source.page", { page: item.page })}</span>
                </a>
              ))}
            </div>
          </section>
          <iframe className={styles.pdf} src={C5_PDF_URL} title={t("read.viewer")} loading="lazy" />
        </div>
      )}
    </div>
  );
}

function SourceLink({ page }: { page: number }) {
  const { t } = useTranslation("c5");
  return <a className={styles.source} href={pdfPage(page)} target="_blank" rel="noreferrer">{t("source.page", { page })}</a>;
}
