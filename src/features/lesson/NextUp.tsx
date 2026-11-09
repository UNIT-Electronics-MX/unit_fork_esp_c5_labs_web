import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { lessonPart, TRACK_PART } from "@/content/icons";
import { TRACKS } from "@/content/tracks";
import type { LessonEntry, TrackId } from "@/domain/lesson";
import { neighbours } from "@/domain/progress";
import { useTrackText } from "@/features/navigation/use-track-text";
import { goToSection } from "@/lib/active-section";
import { Icon } from "@/ui/Icon";
import { PartIcon } from "@/ui/parts/PartIcon";
import styles from "./NextUp.module.css";

/** The end of a long page: where to go next (the next lesson, or the next theme), or back up. */
export function NextUp({
  lessons,
  currentId,
  trackId,
  variantKey,
}: {
  lessons: readonly LessonEntry[];
  currentId: string;
  trackId: TrackId;
  variantKey?: string;
}) {
  const { t } = useTranslation("lesson");
  const trackText = useTrackText();
  const { prev, next } = neighbours(lessons, currentId);
  const variantSearch = (target: LessonEntry | undefined) => variantKey && target?.kind === "lesson"
    && target.variants?.some((variant) => variant.key === variantKey)
    ? `?variant=${encodeURIComponent(variantKey)}` : "";
  const at = TRACKS.findIndex((t) => t.id === trackId);
  const nextTrack = TRACKS.slice(at + 1).find((t) => !t.planned);

  return (
    <nav className={styles.next} aria-label={t("next.label")}>
      {next ? (
        <Link to={`/lessons/${next.id}${variantSearch(next)}`} className={styles.primary}>
          <PartIcon name={lessonPart(next.id, next.track)} size={64} className={styles.part} />
          <span className={styles.kicker}>{t("next.lesson")}</span>
          <span className={styles.title}>
            <b>{next.id}</b> {next.title}
          </span>
          <Icon name="arrow" size={22} />
        </Link>
      ) : nextTrack ? (
        <Link
          to={currentId === "02" ? "/lessons/P1" : `/tracks/${nextTrack.id}`}
          className={styles.primary}
          style={{ "--track": `var(${nextTrack.color})` } as CSSProperties}
        >
          <PartIcon name={TRACK_PART[nextTrack.id]} size={64} className={styles.part} />
          <span className={styles.kicker}>{t("next.theme")}</span>
          <span className={styles.title}>{trackText(nextTrack).title}</span>
          <Icon name="arrow" size={22} />
        </Link>
      ) : (
        <Link to="/" className={styles.primary}>
          <span className={styles.kicker}>{t("next.last")}</span>
          <span className={styles.title}>{t("next.map")}</span>
          <Icon name="grid" size={22} />
        </Link>
      )}
      <div className={styles.minor}>
        {prev ? (
          <Link to={`/lessons/${prev.id}${variantSearch(prev)}`}>
            <Icon name="back" size={15} /> {prev.id} {prev.title}
          </Link>
        ) : (
          <Link to="/">
            <Icon name="grid" size={15} /> {t("next.allLabs")}
          </Link>
        )}
        <button type="button" onClick={() => goToSection("sec-goal")}>
          <Icon name="up" size={15} /> {t("next.top")}
        </button>
      </div>
    </nav>
  );
}
