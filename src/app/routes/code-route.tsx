import { Suspense, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { findTrack } from "@/content/tracks";
import { CodeReader, ReaderSkeleton } from "@/features/code/reader/CodeReader";
import { ArduinoSketchEditor } from "@/features/code/ArduinoSketchEditor";
import { LessonCodeGuide } from "@/features/code/LessonCodeGuide";
import { envOfCommand } from "@/features/code/queries";
import { useLabCode } from "@/features/code/use-lab-code";
import { MicroPythonWorkbench } from "@/features/flasher/MicroPythonWorkbench";
import { SerialTerminal, type SerialTerminalHandle } from "@/features/flasher/SerialTerminal";
import { LabSourceLink } from "@/features/lesson/LabSourceLink";
import { LessonTabs } from "@/features/lesson/LessonTabs";
import { VariantSwitch } from "@/features/lesson/VariantSwitch";
import { LessonStepper } from "@/features/navigation/LessonStepper";
import { TrackNav } from "@/features/navigation/TrackNav";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import styles from "./code-route.module.css";
import { useRouteLesson } from "./lesson-route";
import blinkSource from "../../../sketches/pulsar-c5/p1-blink/p1-blink.ino?raw";
import helloSource from "../../../sketches/pulsar-c5/intro-hello/intro-hello.ino?raw";
import ledSource from "../../../sketches/pulsar-c5/intro-led/intro-led.ino?raw";
import rgbSource from "../../../sketches/pulsar-c5/p2-neopixel/p2-neopixel.ino?raw";
import analogSource from "../../../sketches/pulsar-c5/p3-analog/p3-analog.ino?raw";
import sensorsSource from "../../../sketches/pulsar-c5/p4-i2c-scan/p4-i2c-scan.ino?raw";
import microsdSource from "../../../sketches/pulsar-c5/p5-microsd/p5-microsd.ino?raw";
import uartSource from "../../../sketches/pulsar-c5/p6-uart/p6-uart.ino?raw";
import oledLightSource from "../../../sketches/pulsar-c5/d2-oled-light/d2-oled-light.ino?raw";
import oledOnlySource from "../../../sketches/pulsar-c5/o1-oled/o1-oled.ino?raw";

// "/lessons/:lessonId/code": an editable workspace for C5 sketches and a guided reader for older labs.
// The code screen loads only when a lesson opens it.

function LabReader({ env, lessonHref }: { env: string; lessonHref: string }) {
  return <CodeReader lab={useLabCode(env)} lessonHref={lessonHref} />;
}

const ignoreActive = () => undefined;

const ARDUINO_SKETCHES: Readonly<Record<string, { filename: string; source: string }>> = {
  "01": { filename: "intro-hello.ino", source: helloSource },
  "02": { filename: "intro-led.ino", source: ledSource },
  P1: { filename: "p1-blink.ino", source: blinkSource },
  P2: { filename: "p2-neopixel.ino", source: rgbSource },
  P3: { filename: "p3-analog.ino", source: analogSource },
  P4: { filename: "p4-i2c-scan.ino", source: sensorsSource },
  P5: { filename: "p5-microsd.ino", source: microsdSource },
  P6: { filename: "p6-uart.ino", source: uartSource },
  D2: { filename: "d2-oled-light.ino", source: oledLightSource },
  O1: { filename: "o1-oled.ino", source: oledOnlySource },
};

function ArduinoLessonWorkspace({ lessonId, filename, source }: { lessonId: string; filename: string; source: string }) {
  const terminalRef = useRef<SerialTerminalHandle>(null);
  const [connected, setConnected] = useState(false);
  return (
    <div className={styles.workspace}>
      <ArduinoSketchEditor filename={filename} source={source} />
      <SerialTerminal
        ref={terminalRef}
        blocked={false}
        onActiveChange={ignoreActive}
        onConnectedChange={setConnected}
        flashHint={false}
        sidecar
      />
      <LessonCodeGuide
        lessonId={lessonId}
        variant="arduino"
        connected={connected}
        onCommand={(command) => terminalRef.current?.sendCommand(command) ?? Promise.reject(new Error("Serial console unavailable."))}
      />
    </div>
  );
}

export function Component() {
  const { lesson, lessons, trackId, chooseVariant } = useRouteLesson();
  const env = envOfCommand(lesson.cmd);
  const isIntro = lesson.track === "intro";
  const hasWorkspace = isIntro || lesson.track === "pulsar" || lesson.id === "D2" || lesson.id === "O1";
  const arduinoSketch = ARDUINO_SKETCHES[lesson.id];
  const nextId = lessons[lessons.findIndex((entry) => entry.id === lesson.id) + 1]?.id ?? (lesson.id === "02" ? "P1" : undefined);
  const { t } = useTranslation();
  const lessonHref = `/lessons/${lesson.id}${lesson.variantKey ? `?variant=${encodeURIComponent(lesson.variantKey)}` : ""}`;
  return (
    <>
      <title>{t("titles.code", { id: lesson.id, title: lesson.title })}</title>
      {/* The same way around the labs as on the lab page, but every pad opens that lab's code. */}
      <TrackNav activeTrack={trackId} view="code" />
      <LessonStepper
        lessons={lessons}
        currentId={lesson.id}
        color={findTrack(trackId)?.color ?? "--copper"}
        view="code"
        variantKey={lesson.variantKey}
      />
      <LessonTabs lesson={lesson} current="code" hideOnScroll={!hasWorkspace} />
      <div className={styles.bar}>
        <p className={styles.heading}>
          <span className={styles.id}>{lesson.id}</span> {lesson.heading}
        </p>
        <div className={styles.actions}>
          {lesson.variants && !hasWorkspace ? (
            <VariantSwitch
              variants={lesson.variants}
              current={lesson.variantKey}
              onChange={chooseVariant}
              compact
            />
          ) : null}
          <LabSourceLink cmd={lesson.cmd} />
        </div>
      </div>
      {hasWorkspace ? (
        <section className={styles.setup} aria-label={t("codeRoute.setup.title")}>
          {lesson.variantKey === "micropython" ? (
            <MicroPythonWorkbench key={lesson.id} lessonId={lesson.id} />
          ) : arduinoSketch ? (
            <ArduinoLessonWorkspace key={lesson.id} lessonId={lesson.id} {...arduinoSketch} />
          ) : (
            <p className={styles.none}>{t("codeRoute.none")}</p>
          )}
          <nav className={styles.footer} aria-label={t("codeRoute.setup.actions")}>
            <Link to={lessonHref}>{t("codeRoute.setup.back")}</Link>
            {lesson.variantKey === "micropython" && lesson.id !== "00" ? <Link to="/flash?profile=micropython">{t("codeRoute.setup.flashFirmware")}</Link> : null}
            {nextId ? <Link to={`/lessons/${nextId}${hasWorkspace && lesson.variantKey ? `?variant=${encodeURIComponent(lesson.variantKey)}` : ""}`}>{t("codeRoute.setup.nextLesson", { id: nextId })}</Link> : null}
          </nav>
        </section>
      ) : env ? (
        <ErrorBoundary name={`code ${env}`} resetKey={env}>
          <Suspense fallback={<ReaderSkeleton />}>
            <LabReader key={env} env={env} lessonHref={lessonHref} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <p className={styles.none}>
          {t("codeRoute.none")}
        </p>
      )}
    </>
  );
}
