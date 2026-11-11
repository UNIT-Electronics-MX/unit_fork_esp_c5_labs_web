import { useTranslation } from "react-i18next";
import { BH, BW, BX, BY, mx, my, QWIIC_PORT } from "./example-layout";
import { type CableEnd, jumperPath, STRANDS, strandPath } from "./qwiic-cable";
import {
  BMI,
  BMI_PORT,
  Bmi270Module,
  Hub,
  HUB_LEFT_PORT,
  HUB_RIGHT_PORT,
  OledModule,
  Temt6000Module,
  TEMT_PORT,
} from "./qwiic-parts";
import styles from "./examples.module.css";

const CALLOUT = { x: 704, y: 150, w: 186, h: 132 };
const BUS_MARK = "QWIIC · I²C";
const BOARD_MARK = "PULSAR C5";

/** The four coloured strands, each with a darker edge so it reads over any part. */
function Strands({ path }: { path: (k: number) => string }) {
  return (
    <g>
      {STRANDS.map((s, k) => <path key={`edge-${s.signal}`} d={path(k)} className={styles.strandShade} />)}
      {STRANDS.map((s, k) => <path key={s.signal} d={path(k)} className={styles.strand} style={{ stroke: `var(${s.colour})` }} />)}
    </g>
  );
}

/** The cable from the board, the table of what each strand carries, and the board's name. */
function QwiicCable({ end }: { end: CableEnd }) {
  const { t } = useTranslation("labs-display");
  const { x, y, w, h } = CALLOUT;
  return (
    <g>
      <Strands path={(k) => strandPath(k, end)} />
      <text x={8} y={470} transform="rotate(-90 8 470)" className={styles.caption}>{t("examples.cable")}</text>
      <rect x={x} y={y} width={w} height={h} rx={8} className={styles.callout} />
      <text x={x + 14} y={y + 22} className={styles.calloutTitle}>{BUS_MARK}</text>
      {STRANDS.map((s, i) => {
        const ry = y + 48 + i * 22;
        return (
          <g key={s.signal}>
            <rect x={x + 14} y={ry - 7} width={20} height={6} rx={3} style={{ fill: `var(${s.colour})` }} />
            <text x={x + 42} y={ry} className={styles.calloutKey}>{s.signal}</text>
            <text x={x + 80} y={ry} className={styles.calloutValue}>{s.level}</text>
            <text x={x + 138} y={ry} className={styles.calloutValue}>{`→ ${s.pin}`}</text>
          </g>
        );
      })}
      {/* From the port, over the board's top edge (clear of the pad names) into the table. */}
      <path className={styles.lead} d={`M${mx(QWIIC_PORT.x + 3) + 4} ${my(QWIIC_PORT.y)} H${mx(QWIIC_PORT.x + 5)} V${BY - 14} H${x - 14} V${y + 60} H${x}`} />
      <text x={BX + BW / 2} y={BY + BH + 24} textAnchor="middle" className={styles.caption}>{BOARD_MARK}</text>
    </g>
  );
}

/** O1: QWIIC cable, UNIT's QWIIC Bus hub, and the SSD1306 OLED on the hub's pins. */
export function OledExample() {
  return (
    <g>
      <Hub />
      <OledModule screen="text" />
      <QwiicCable end={{ into: "side", ...HUB_LEFT_PORT }} />
    </g>
  );
}

/** D2: the same hub and OLED, plus the TEMT6000 on a short cable from the hub's other port. */
export function OledLightExample() {
  return (
    <g>
      <Hub />
      <OledModule screen="graph" />
      <Temt6000Module />
      <Strands path={(k) => jumperPath(k, HUB_RIGHT_PORT, TEMT_PORT)} />
      <QwiicCable end={{ into: "side", ...HUB_LEFT_PORT }} />
    </g>
  );
}

/** D1: the QWIIC cable straight into the BMI270 breakout's connector, from below. */
export function ImuExample() {
  return (
    <g>
      <Bmi270Module />
      <QwiicCable end={{ into: "below", x: BMI_PORT.x, y: BMI_PORT.y, floor: BMI.y + BMI.h + 70 }} />
    </g>
  );
}
