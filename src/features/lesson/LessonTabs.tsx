import { useTranslation } from "react-i18next";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { findTrack } from "@/content/tracks";
import type { ResolvedLesson } from "@/domain/lesson";
import { canOpenLessonCode } from "@/features/flasher/lesson-examples";
import { useScrollChrome } from "@/lib/use-scroll-chrome";
import { Icon } from "@/ui/Icon";
import styles from "./LessonTabs.module.css";

// Once the dock sticks (its slot reaches the top gap) it shrinks to one button for the other view;
// on pages that ask for it, it then slides away while you read down and returns on scrolling up.
const STICK_TOP = 8;

/**
 * The lesson's sticky dock links to code only when this exercise has an open MicroPython
 * workspace. The lab page also puts its section navigation here. A thin line along the bottom
 * shows how far the reader has scrolled.
 */
export function LessonTabs({
  lesson,
  current,
  hideOnScroll = false,
  children,
}: {
  lesson: ResolvedLesson;
  current: "lab" | "code";
  /** Slide away while scrolling down, back on scrolling up (for pages that want the room). */
  hideOnScroll?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation("lesson");
  const [params] = useSearchParams();
  const slotRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const { away: stuck, hidden } = useScrollChrome(
    () => (slotRef.current?.getBoundingClientRect().top ?? Infinity) <= STICK_TOP + 0.5,
  );

  // The slot keeps the full dock's height, so the page below never jumps when the dock shrinks.
  useEffect(() => {
    const slot = slotRef.current;
    const dock = dockRef.current;
    if (!slot || !dock) return;
    const keep = new ResizeObserver(() => {
      if (!dock.dataset.compact) slot.style.minBlockSize = `${dock.offsetHeight}px`;
    });
    keep.observe(dock);
    return () => keep.disconnect();
  }, []);

  const codeAvailable = canOpenLessonCode(lesson);
  if (!codeAvailable && !children) return null;
  const variant = params.get("variant");
  const consoleSetup = lesson.id === "00" && lesson.variantKey === "micropython";
  const search = variant ? `?variant=${encodeURIComponent(variant)}` : "";
  const codeHref = `/lessons/${lesson.id}/code${search}`;
  const track = findTrack(lesson.track);
  const style = { "--track": `var(${track?.color ?? "--copper"})` } as CSSProperties;

  return (
    <div ref={slotRef} className={styles.slot}>
    <div
      ref={dockRef}
      className={styles.dock}
      style={style}
      data-view={current}
      data-compact={stuck || undefined}
      data-hidden={(hideOnScroll && hidden) || undefined}
      data-extras={children ? "" : undefined}
    >
      {codeAvailable ? <nav className={styles.tabs} aria-label={t("tabs.label")}>
        <Link
          to={`/lessons/${lesson.id}${search}`}
          viewTransition
          preventScrollReset
          aria-current={current === "lab" ? "page" : undefined}
        >
          <span className={styles.label}>
            <Icon name="wire" size={16} />
            {t("tabs.lab")}
          </span>
          <span className={styles.sub}>{t("tabs.labSub")}</span>
        </Link>
        <Link
          to={codeHref}
          viewTransition
          preventScrollReset
          aria-current={current === "code" ? "page" : undefined}
        >
          <span className={styles.label}>
            <Icon name="code" size={16} />
            {t(consoleSetup ? "tabs.console" : "tabs.code")}{" "}
          </span>
          <span className={styles.sub}>
            {consoleSetup ? t("tabs.consoleSub") : t("tabs.codeSubMicroPython")}
          </span>
        </Link>
      </nav> : null}
      {children}
      <span className={styles.progress} aria-hidden="true" />
    </div>
    </div>
  );
}
