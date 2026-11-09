import { useState, type CSSProperties } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { ResolvedLesson } from "@/domain/lesson";
import { useInterval } from "@/lib/animation";
import { useReducedMotion } from "@/lib/media";
import { Button } from "@/ui/Button";
import { RichText } from "@/ui/RichText";
import { PartIcon } from "@/ui/parts/PartIcon";
import type { PartName } from "@/ui/parts/registry";
import styles from "./PulsarConnections.module.css";

const POT_IMAGE = `${import.meta.env.BASE_URL}assets/fritzing/potentiometer_rotary_16mm.svg`;
const POT_SOURCE = "https://github.com/fritzing/fritzing-parts/blob/develop/svg/core/breadboard/potentiometer_rotary_16mm_5_breadboard.svg";
const LICENSE = "https://creativecommons.org/licenses/by-sa/3.0/";

type Connection = { from: string; to: string; note: string; color: string };
type Translate = TFunction<"lesson">;

/** The firmware pin assignments and P3/P6 wiring tables supply the endpoints. */
function connections(lesson: ResolvedLesson, t: Translate): Connection[] {
  const gpio = (index: number) => `GPIO${lesson.pins[index]?.pin ?? "?"}`;
  switch (lesson.id) {
    case "P1":
      return [
        { from: gpio(0), to: t("connections.target.userLed"), note: t("connections.note.userLed"), color: "--w-vcc" },
        { from: gpio(1), to: t("connections.target.boot"), note: t("connections.note.boot"), color: "--w-btn" },
      ];
    case "P2":
      return [{ from: gpio(0), to: t("connections.target.rgb"), note: t("connections.note.rgb"), color: "--w-sda" }];
    case "P3":
      return (lesson.wiring?.rows ?? []).map(([from, to, note], index) => ({
        from,
        to,
        note: note || t("connections.note.potGround"),
        color: ["--w-vcc", "--copper", "--w-gnd"][index] ?? "--copper",
      }));
    case "P4":
      return [
        { from: `${gpio(0)} · SDA`, to: t("connections.target.sensorBus"), note: t("connections.note.sda"), color: "--w-sda" },
        { from: `${gpio(1)} · SCL`, to: t("connections.target.sensorBus"), note: t("connections.note.scl"), color: "--w-scl" },
      ];
    case "P5":
      return [
        { from: `${gpio(0)} · SCK`, to: t("connections.target.sdClock"), note: t("connections.note.sdClock"), color: "--w-scl" },
        { from: `${gpio(2)} · MOSI`, to: t("connections.target.sdMosi"), note: t("connections.note.sdMosi"), color: "--w-sda" },
        { from: `${gpio(3)} · MISO`, to: t("connections.target.sdMiso"), note: t("connections.note.sdMiso"), color: "--w-dc" },
        { from: `${gpio(1)} · CS`, to: t("connections.target.sdSelect"), note: t("connections.note.sdSelect"), color: "--w-cs" },
      ];
    case "P6": {
      const [from, to] = lesson.wiring?.rows[0] ?? ["TX0 (GPIO11)", "RX0 (GPIO12)"];
      return [{ from, to, note: t("connections.note.uart"), color: "--w-sda" }];
    }
    default:
      return [];
  }
}

const TARGET_ICON: Readonly<Record<string, PartName>> = {
  P1: "led", P2: "rgb-led", P4: "sensor", P5: "memory", P6: "header",
};
const PART_LABEL: Readonly<Record<string, "connections.part.P1" | "connections.part.P2" | "connections.part.P3" | "connections.part.P4" | "connections.part.P5" | "connections.part.P6">> = {
  P1: "connections.part.P1", P2: "connections.part.P2", P3: "connections.part.P3",
  P4: "connections.part.P4", P5: "connections.part.P5", P6: "connections.part.P6",
};

/** A step-by-step connection map, following the TFT lesson's wiring walkthrough. */
export function PulsarConnections({ lesson }: { lesson: ResolvedLesson }) {
  const { t } = useTranslation("lesson");
  const reducedMotion = useReducedMotion();
  const paths = connections(lesson, t);
  const total = paths.length;
  const external = lesson.id === "P3" || lesson.id === "P6";
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useInterval(() => {
    if (step >= total - 1) {
      setStep(total);
      setPlaying(false);
    } else setStep(step + 1);
  }, playing ? (reducedMotion ? 2200 : 1700) : null);

  function show(next: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(total, next)));
  }

  function togglePlay() {
    if (playing) return setPlaying(false);
    if (!total) return;
    if (step === 0 || step === total) setStep(1);
    if (total === 1) return;
    setPlaying(true);
  }

  const pinoutParams = new URLSearchParams({ lesson: lesson.id });
  if (lesson.variantKey) pinoutParams.set("variant", lesson.variantKey);
  const current = step > 0 ? paths[step - 1] : undefined;
  const icon = lesson.id === "P1" && step >= 2 ? "button" : TARGET_ICON[lesson.id];

  return (
    <div className={styles.walkthrough}>
      <div className={styles.controls} role="group" aria-label={t("connections.controls")}>
        <Button onClick={() => show(step - 1)} disabled={step === 0}>{t("connections.prev")}</Button>
        <Button onClick={togglePlay} disabled={!total}>{playing ? t("connections.pause") : t("connections.play")}</Button>
        <Button onClick={() => show(step + 1)} disabled={step === total}>{t("connections.next")}</Button>
        <Button onClick={() => show(total)} disabled={step === total}>{t("connections.showAll")}</Button>
        <span className={styles.count} aria-live="polite">{t("connections.count", { step, total })}</span>
      </div>

      <figure className={styles.figure}>
        <div className={styles.scene}>
          <div className={styles.nodes}>
            <div className={styles.node}>
              <PartIcon name="devkit" size={76} />
              <strong>{t(external ? "connections.pulsarHeader" : "connections.chip")}</strong>
            </div>
            <span className={styles.mode} data-external={external || undefined}>
              {t(external ? "connections.external" : "connections.internal")}
            </span>
            <div className={styles.node}>
              {lesson.id === "P3" ? (
                <div className={styles.potPicture}>
                  <img src={POT_IMAGE} alt="" />
                  {[1, 2, 3].map((number) => <span key={number} style={{ left: `${-18 + number * 34}%` }} aria-hidden="true">{number}</span>)}
                </div>
              ) : icon ? <PartIcon name={icon} size={76} /> : null}
              <strong>{t(PART_LABEL[lesson.id] ?? "connections.part.P1")}</strong>
            </div>
          </div>
          <ol className={styles.paths} aria-label={t("connections.pathList")}>
            {paths.map((path, index) => {
              const placed = index < step;
              return (
                <li key={`${path.from}-${path.to}`} data-placed={placed || undefined} data-current={index === step - 1 || undefined} style={{ "--wire": `var(${path.color})` } as CSSProperties}>
                  <span className={styles.number} aria-hidden="true">{index + 1}</span>
                  <span className={styles.source}><RichText text={path.from} /></span>
                  <span className={styles.trace} aria-hidden="true"><i /></span>
                  <span className={styles.target}><RichText text={path.to} /></span>
                  {placed ? <span className={styles.note}><RichText text={path.note} /></span> : null}
                </li>
              );
            })}
          </ol>
        </div>
        <figcaption className={styles.caption} aria-live="polite">
          <span className={styles.swatch} style={{ background: current ? `var(${current.color})` : "var(--line)" }} aria-hidden="true" />
          <strong>{step === 0 ? t("connections.startTitle") : step === total ? t("connections.doneTitle") : t("connections.stepTitle", { step, from: current?.from, to: current?.to })}</strong>
          <span>{step === 0 ? t(external ? "connections.startExternal" : "connections.startInternal") : step === total ? t(external ? "connections.doneExternal" : "connections.doneInternal") : current?.note}</span>
        </figcaption>
      </figure>
      <div className={styles.links}>
        <Link to={`/pinout?${pinoutParams}`}>{t("wiring.openPinout")}</Link>
        {lesson.id === "P3" ? <a href={POT_SOURCE} target="_blank" rel="noreferrer">{t("wiring.fritzingCredit")}</a> : null}
        {lesson.id === "P3" ? <a href={LICENSE} target="_blank" rel="noreferrer">CC BY-SA 3.0</a> : null}
      </div>
    </div>
  );
}
