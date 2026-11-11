import { pulsarSilk } from "@/domain/pulsar";
import { BH, BW, BX, BY, LABELS_END, mx, my, S } from "./example-layout";
import { flip, SD_PADS } from "./pulsar-flipped";
import styles from "./examples.module.css";

const TAG_W = 46;
const TAG_H = 16;
const CALLOUT = { x: 730, y: 230, w: 160, h: 128 };
/** Markings, not text: the card's logo and the bus name. */
const CARD_MARK = "microSD";
const BUS_MARK = "microSD · SPI";

/** Example 2: a card in the on-board slot, and the four header pads its SPI lines share. */
export function SdCardExample() {
  const slot = flip(8.9, 20.7);
  const { x, y, w, h } = CALLOUT;
  return (
    <g>
      {/* The card, pushed into the slot from the QWIIC end in this view. */}
      <rect x={mx(slot.x - 5.2)} y={my(slot.y - 2.75 - 9.5)} width={10.4 * S} height={10.2 * S} rx={3} className={styles.card} />
      <rect x={mx(slot.x + 0.6)} y={my(slot.y - 2.75 - 9.5)} width={4.6 * S} height={10.2 * S} rx={3} className={styles.cardLabel} />
      <text
        x={mx(slot.x + 2.9)}
        y={my(slot.y - 7.5)}
        textAnchor="middle"
        transform={`rotate(90 ${mx(slot.x + 2.9)} ${my(slot.y - 7.5)})`}
        className={styles.cardText}
      >
        {CARD_MARK}
      </text>
      {SD_PADS.map(({ signal, pad }) => {
        const left = pad.edge === "left";
        const py = my(pad.at.y);
        const labelEnd = left ? BX - LABELS_END : BX + BW + LABELS_END;
        const tagX = left ? labelEnd - 18 - TAG_W : labelEnd + 18;
        return (
          <g key={signal}>
            <circle cx={mx(pad.at.x)} cy={py} r={9} className={styles.ring} />
            <line x1={left ? tagX + TAG_W : labelEnd} y1={py} x2={left ? labelEnd : tagX} y2={py} className={styles.lead} />
            <rect x={tagX} y={py - TAG_H / 2} width={TAG_W} height={TAG_H} rx={3} className={styles.tag} />
            <text x={tagX + TAG_W / 2} y={py + 4} textAnchor="middle" className={styles.tagText}>{signal}</text>
          </g>
        );
      })}
      <rect x={x} y={y} width={w} height={h} rx={8} className={styles.callout} />
      <text x={x + 14} y={y + 22} className={styles.calloutTitle}>{BUS_MARK}</text>
      {SD_PADS.map(({ signal, pad }, i) => {
        const ry = y + 48 + i * 22;
        return (
          <g key={signal}>
            <rect x={x + 14} y={ry - 11} width={42} height={15} rx={2.5} className={styles.tag} />
            <text x={x + 35} y={ry} textAnchor="middle" className={styles.tagText}>{signal}</text>
            <text x={x + 66} y={ry} className={styles.calloutKey}>{pulsarSilk(pad.pad)}</text>
            <text x={x + 102} y={ry} className={styles.calloutValue}>{`GPIO${pad.pad.pin}`}</text>
          </g>
        );
      })}
      <text x={BX + BW / 2} y={BY + BH + 24} textAnchor="middle" className={styles.caption}>PULSAR C5</text>
    </g>
  );
}
