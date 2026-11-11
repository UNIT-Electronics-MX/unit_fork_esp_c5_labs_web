import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { BX, BW, mx, my } from "./example-layout";
import { FlippedPulsar } from "./FlippedPulsar";
import { WireCaption } from "./parts";
import { ST7735_CONNECTIONS } from "./st7735-data";
import styles from "./st7735.module.css";

const COUNT = ST7735_CONNECTIONS.length;

function pathFor(index: number): string {
  const wire = ST7735_CONNECTIONS[index];
  if (!wire?.pad) return "";
  const x = mx(wire.pad.at.x);
  const y = my(wire.pad.at.y);
  // MOSI and CS are on the far header: route above the board without crossing it.
  if (wire.pad.edge === "left") {
    const over = 90 + index * 11;
    const outside = BX - 20 - index * 8;
    return `M 850 ${wire.displayY} H ${750 + index * 10} V ${over} H ${outside} V ${y} H ${x}`;
  }
  const bend = 735 + (index % 2) * 16;
  return `M 850 ${wire.displayY} H ${bend} V ${y} H ${x}`;
}

/** The eight connections for the 80×160 ST7735, including its optional BLK backlight lead. */
export function St7735Wiring(_: WidgetProps) {
  const { t } = useTranslation("labs-display");
  const [step, setStep] = useState(0);
  const marked = new Set(ST7735_CONNECTIONS.slice(0, step).map((wire) => wire.position));
  const current = ST7735_CONNECTIONS[step - 1];

  return (
    <div className={styles.wiring}>
      <div className={styles.controls} role="group" aria-label={t("st7735.controls")}>
        <Button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>{t("wiring.prev")}</Button>
        <Button onClick={() => setStep((value) => Math.min(COUNT, value + 1))} disabled={step === COUNT}>{t("wiring.next")}</Button>
        <Button onClick={() => setStep(COUNT)} disabled={step === COUNT}>{t("wiring.showAll")}</Button>
        <span className={styles.count} aria-live="polite">{t("wiring.count", { step, count: COUNT })}</span>
      </div>
      <p className={styles.scrollHint}>{t("st7735.scrollHint")}</p>
      <div className={styles.stage} dir="ltr">
        <svg viewBox="370 60 750 450" role="img" aria-label={t("st7735.aria")}>
          <text x="562" y="80" textAnchor="middle" className={styles.heading}>{t("st7735.board")}</text>
          <text x="965" y="80" textAnchor="middle" className={styles.heading}>{t("st7735.display")}</text>
          {ST7735_CONNECTIONS.slice(0, step).map((wire, index) => (
            <path key={wire.display} d={pathFor(index)} className={styles.wire}
              stroke={`var(${wire.color})`} data-active={index === step - 1 && step < COUNT} />
          ))}
          <FlippedPulsar marked={marked} />
          <rect x="850" y="118" width="224" height="330" rx="10" className={styles.module} />
          <rect x="910" y="151" width="145" height="267" rx="5" className={styles.screen} />
          <text x="982" y="285" textAnchor="middle" className={styles.screenText}>ST7735</text>
          <text x="982" y="305" textAnchor="middle" className={styles.size}>80 × 160</text>
          {ST7735_CONNECTIONS.map((wire, index) => (
            <g key={wire.display}>
              <circle cx="850" cy={wire.displayY} r="5" className={index < step ? styles.padOn : styles.pad} />
              <text x="862" y={wire.displayY + 4} className={index < step ? styles.pinOn : styles.pin}>{wire.display}</text>
            </g>
          ))}
          <text x={BX + BW / 2} y="485" textAnchor="middle" className={styles.orientation}>USB ↓</text>
        </svg>
      </div>
      <WireCaption color={current?.color ?? "--line"} title={current
        ? t("st7735.wire", { number: step, display: current.display, board: current.board })
        : t("st7735.start.title")}>
        {current ? t(`st7735.notes.${current.display}`) : t("st7735.start.text")}
      </WireCaption>
    </div>
  );
}
