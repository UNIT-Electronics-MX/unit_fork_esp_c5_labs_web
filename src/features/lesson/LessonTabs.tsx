import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { findTrack } from "@/content/tracks";
import { followsCodePlatform, type ResolvedLesson } from "@/domain/lesson";
import { lessonExamples } from "@/features/flasher/lesson-examples";
import { useAllProgress } from "@/features/code/code-progress";
import { envOfCommand, firmwareIndexQuery } from "@/features/code/queries";
import { useScrollChrome } from "@/lib/use-scroll-chrome";
import { Icon } from "@/ui/Icon";
import styles from "./LessonTabs.module.css";

// Once the dock sticks (its slot reaches the top gap) it shrinks to one button for the other view;
// on pages that ask for it, it then slides away while you read down and returns on scrolling up.
const STICK_TOP = 8;

/**
 * The lesson's dock, sticky while you scroll: two ways into a lesson (do it on the bench, or read
 * the code that runs on the board; same lesson, same variant), then whatever the page adds
 * (the lab page puts its section nav here). At the top both ways show with a line about each;
 * once you scroll, only the other one stays, small. A thin line along its bottom shows how far you
 * read.
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

  const env = envOfCommand(lesson.cmd);
  const { data: index } = useQuery({ ...firmwareIndexQuery(), enabled: !!env });
  const progress = useAllProgress();
  const sharedLanguage = followsCodePlatform(lesson);
  // A lesson with only MicroPython examples, or W2's MicroPython variant next to its S3 ones.
  const pythonOnly = lessonExamples(lesson.id).length > 0
    && (!lesson.variants?.length || lesson.variantKey === "micropython");
  if (!env && !sharedLanguage && !pythonOnly) return null;
  const files = env ? index?.envs.find((e) => e.env === env)?.files ?? [] : [];
  const own = files.filter((f) => f.role === "lab");
  const lines = own.reduce((n, f) => n + f.lines, 0);
  const read = env ? progress[env]?.stops.length ?? 0 : 0;
  const variant = params.get("variant");
  const consoleSetup = lesson.id === "00" && lesson.variantKey === "micropython";
  const arduinoSetup = lesson.id === "00" && lesson.variantKey === "arduino";
  const search = variant ? `?variant=${encodeURIComponent(variant)}` : "";
  const firstSketchSearch = new URLSearchParams(params);
  firstSketchSearch.set("variant", "arduino");
  const codeHref = arduinoSetup
    ? `/lessons/01/code?${firstSketchSearch}`
    : `/lessons/${lesson.id}/code${search}`;
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
      <nav className={styles.tabs} aria-label={t("tabs.label")}>
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
            {read ? (
              <span className={styles.badge}>{t("tabs.stopsRead", { count: read })}</span>
            ) : null}
          </span>
          <span className={styles.sub}>
            {own.length
              ? t("tabs.codeSub", { count: own.length, lines })
              : consoleSetup
                ? t("tabs.consoleSub")
              : lesson.id === "00"
                ? t("tabs.codeSubSetup")
                : (sharedLanguage && lesson.variantKey === "micropython") || pythonOnly
                ? t("tabs.codeSubMicroPython")
                : sharedLanguage
                ? t("tabs.codeSubArduino")
                : t("tabs.codeSubEmpty")}
          </span>
        </Link>
      </nav>
      {children}
      <span className={styles.progress} aria-hidden="true" />
    </div>
    </div>
  );
}
