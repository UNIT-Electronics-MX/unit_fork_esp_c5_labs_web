import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { findTrack } from "@/content/tracks";
import { neighbours } from "@/domain/progress";
import { MicroPythonWorkbench } from "@/features/flasher/MicroPythonWorkbench";
import { LessonTabs } from "@/features/lesson/LessonTabs";
import { LessonStepper } from "@/features/navigation/LessonStepper";
import { TrackNav } from "@/features/navigation/TrackNav";
import styles from "./code-route.module.css";
import { useRouteLesson } from "./lesson-route";

/** The executable MicroPython examples attached to one exercise. */
export function Component() {
  const { lesson, lessons, trackId } = useRouteLesson();
  const { t } = useTranslation();
  const nextId = neighbours(lessons, lesson.id).next?.id;
  const lessonHref = `/lessons/${lesson.id}${lesson.variantKey ? `?variant=${encodeURIComponent(lesson.variantKey)}` : ""}`;

  return (
    <>
      <title>{t("titles.code", { id: lesson.id, title: lesson.title })}</title>
      <TrackNav activeTrack={trackId} />
      <LessonStepper
        lessons={lessons}
        currentId={lesson.id}
        color={findTrack(trackId)?.color ?? "--copper"}
        view="code"
        variantKey={lesson.variantKey}
      />
      <LessonTabs lesson={lesson} current="code" />
      <div className={styles.bar}>
        <p className={styles.heading}>
          <span className={styles.id}>{lesson.id}</span> {lesson.heading}
        </p>
      </div>
      <section className={styles.setup} aria-label={t("codeRoute.setup.title")}>
        <MicroPythonWorkbench key={lesson.id} lessonId={lesson.id} />
        <nav className={styles.footer} aria-label={t("codeRoute.setup.actions")}>
          <Link to={lessonHref}>{t("codeRoute.setup.back")}</Link>
          {lesson.id !== "00" ? <Link to="/flash?profile=micropython">{t("codeRoute.setup.flashFirmware")}</Link> : null}
          {nextId ? <Link to={`/lessons/${nextId}`}>{t("codeRoute.setup.nextLesson", { id: nextId })}</Link> : null}
        </nav>
      </section>
    </>
  );
}
