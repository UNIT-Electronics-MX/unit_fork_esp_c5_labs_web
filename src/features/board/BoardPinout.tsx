import { useTranslation } from "react-i18next";
import type { PinUse } from "@/domain/lesson";
import {
  isGpio,
  PULSAR_HEADER,
  pulsarPadClass,
  type PulsarPadClass,
  pulsarRow,
  pulsarSilk,
  pulsarUsage,
} from "@/domain/pulsar";
import { useLocaleInfo } from "@/i18n/use-locale";
import { useRgbState } from "./board-signals";
import { roleFill } from "./pin-colour";
import styles from "./BoardPinout.module.css";

// Geometry of the UNIT Pulsar C5, top view with USB-C up, from its Gerbers (header holes at
// 1.27 and 16.51 mm, 2.54 mm pitch), at 8 px per mm. Ported from public/pulsar-c5-pinout.
const S = 8;
const BX = 178;
const BY = 18;
const BW = 17.78 * S;
const BH = 43.18 * S;
const VBW = BX * 2 + BW;
const VBH = BY + BH + 18;
const TAG_H = 15;
const TAG_CHAR_W = 6.2; // IBM Plex Mono, 10px semibold

const mx = (mm: number) => BX + mm * S;
const my = (mm: number) => BY + mm * S;
const rowY = (row: number) => my(3.81 + 2.54 * row);

const PAD_FILL: Record<PulsarPadClass, string> = {
  safe: "var(--pad)",
  avoid: "var(--danger)",
  power: "var(--power)",
  gnd: "var(--gnd)",
};

/** Outlines of the parts on the board, from its pick-and-place file: [x, y, w, h] in mm. */
const PARTS = [
  [12.9, 11.26, 3, 3],
  [12.66, 16.09, 2, 2],
  [7.79, 13.39, 2, 2],
  [6.46, 16.41, 4, 2],
  [4.39, 10.66, 0.8, 0.8],
  [4.06, 8.95, 1.5, 1.5],
  [4.77, 25.8, 3, 4],
  [10.31, 36.36, 1.6, 1.2],
] as const;

/** Silkscreen marking, a part name rather than text. */
const SD_SILK = "microSD";

const HOLES = [
  [1.27, 1.27],
  [16.51, 1.27],
  [1.27, 41.91],
  [16.51, 41.91],
] as const;

interface BoardPinoutProps {
  pins: readonly PinUse[];
  /** The USB-C port is in use (serial monitor). */
  usb: boolean;
  /** The BOOT button is part of the lesson. */
  boot: boolean;
  selectedPosition?: number | null;
  onSelectPosition?: (position: number) => void;
  onHoverPosition?: (position: number | null) => void;
}

/** The UNIT Pulsar C5 as a live pinout: header pads a lesson uses are tagged with their role. */
export function BoardPinout({ pins, usb, boot, selectedPosition, onSelectPosition, onHoverPosition }: BoardPinoutProps) {
  const { t } = useTranslation();
  const { tag } = useLocaleInfo();
  const usage = pulsarUsage(pins);
  const uses = new Intl.ListFormat(tag, { type: "unit" }).format(
    [...usage].flatMap(([at, on]) =>
      on.map((p) => t("board.pinout.use", { role: p.role, pin: padName(at) })),
    ),
  );

  return (
    <svg
      className={styles.board}
      viewBox={`0 0 ${VBW} ${VBH}`}
      // The board has a physical left and right: it never mirrors.
      direction="ltr"
      role={onSelectPosition ? "group" : "img"}
      aria-labelledby="board-title board-desc"
    >
      <title id="board-title">{t("board.pinout.title")}</title>
      <desc id="board-desc">
        {usage.size ? t("board.pinout.uses", { uses }) : t("board.pinout.none")}
      </desc>
      <Board usb={usb} boot={boot} />
      {PULSAR_HEADER.map((pad, at) => {
        const on = usage.get(at);
        const { side, row } = pulsarRow(at);
        const left = side === "L";
        const y = rowY(row);
        const silk = pulsarSilk(pad);
        const nameX = left ? BX - 7 : BX + BW + 7;
        const gpioX = left ? BX - 40 : BX + BW + 40;
        const anchor = left ? "end" : "start";
        const active = selectedPosition === at;
        return (
          <g
            key={at}
            className={onSelectPosition ? styles.interactive : undefined}
            data-pin-index={at}
            data-active={active || undefined}
            role={onSelectPosition ? "button" : undefined}
            tabIndex={onSelectPosition ? 0 : undefined}
            aria-label={onSelectPosition ? padName(at) : undefined}
            aria-pressed={onSelectPosition ? active : undefined}
            onClick={onSelectPosition ? () => onSelectPosition(at) : undefined}
            onMouseEnter={onHoverPosition ? () => onHoverPosition(at) : undefined}
            onMouseLeave={onHoverPosition ? () => onHoverPosition(null) : undefined}
            onFocus={onHoverPosition ? () => onHoverPosition(at) : undefined}
            onBlur={onHoverPosition ? () => onHoverPosition(null) : undefined}
            onKeyDown={onSelectPosition ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectPosition(at);
              }
            } : undefined}
          >
            <title>{padName(at)}</title>
            <text
              x={nameX}
              y={y + 3.5}
              textAnchor={anchor}
              className={`${styles.pinLabel} ${on ? styles.used : ""}`}
            >
              {silk}
            </text>
            {isGpio(pad.pin) ? (
              <text x={gpioX} y={y + 3.2} textAnchor={anchor} className={styles.gpio}>
                {`GP${pad.pin}`}
              </text>
            ) : null}
            {on ? (
              <RoleTag left={left} y={y} edge={isGpio(pad.pin) ? gpioX : nameX} uses={on} />
            ) : null}
            <circle
              cx={left ? mx(1.27) : mx(16.51)}
              cy={y}
              r={on ? 6 : 4.4}
              fill={PAD_FILL[pulsarPadClass(pad.pin)]}
              stroke={active || on ? "var(--copper)" : "var(--pcb)"}
              strokeWidth={active ? 4 : on ? 3 : 1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** "A2 · GPIO 4": how a header position is named in text. */
function padName(at: number) {
  const pad = PULSAR_HEADER[at];
  if (!pad) return "";
  return isGpio(pad.pin) ? `${pulsarSilk(pad)} · GPIO ${pad.pin}` : pulsarSilk(pad);
}

function RoleTag({
  left,
  y,
  edge,
  uses,
}: {
  left: boolean;
  y: number;
  /** Where the pad's printed labels end, away from the board. */
  edge: number;
  uses: readonly PinUse[];
}) {
  const label = uses.map((u) => u.role).join(" · ");
  const fill = roleFill(uses[0]?.kind);
  const room = left ? edge - 30 - 6 : VBW - 6 - (edge + 30);
  const w = Math.min(room, Math.max(52, label.length * TAG_CHAR_W + 12));
  const gx = left ? 6 : VBW - 6 - w;
  const x1 = left ? gx + w + 3 : edge + 30;
  const x2 = left ? edge - 30 : gx - 3;
  return (
    <g>
      <rect x={gx} y={y - TAG_H / 2} width={w} height={TAG_H} rx={3} fill={fill} />
      {x2 > x1 ? (
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={fill} strokeWidth={1.2} strokeDasharray="2 2" />
      ) : null}
      <text x={gx + w / 2} y={y + 3.5} textAnchor="middle" className={styles.role}>
        {label}
      </text>
    </g>
  );
}

/** The board itself: outline, USB-C, buttons, parts, chip, antenna, RGB LED and QWIIC. */
function Board({ usb, boot }: { usb: boolean; boot: boolean }) {
  return (
    <g>
      <rect
        x={BX}
        y={BY}
        width={BW}
        height={BH}
        rx={1.1 * S}
        fill="var(--pcb)"
        stroke="var(--pcb-edge)"
        strokeWidth={1.5}
      />
      {/* USB-C: lights up when the lesson talks over serial */}
      <rect
        x={mx(4.42)}
        y={my(-1.1)}
        width={8.94 * S}
        height={7.3 * S}
        rx={1.6 * S}
        fill={usb ? "var(--copper)" : "var(--metal)"}
        stroke="var(--metal-dark)"
        strokeWidth={0.8}
      />
      <rect
        x={mx(5.6)}
        y={my(-0.5)}
        width={6.6 * S}
        height={1.6 * S}
        rx={0.8 * S}
        fill="var(--pcb)"
        opacity={0.55}
      />
      <text x={mx(8.89)} y={my(5.3)} textAnchor="middle" className={styles.port}>
        USB-C
      </text>
      {(["BOOT", "RST"] as const).map((name) => {
        const x = name === "BOOT" ? 3.18 : 14.66;
        const lit = name === "BOOT" && boot;
        return (
          <g key={name}>
            <rect
              x={mx(x - 0.8)}
              y={my(2.65)}
              width={1.6 * S}
              height={2.6 * S}
              rx={2}
              className={styles.part}
            />
            <circle
              cx={mx(x)}
              cy={my(3.95)}
              r={(lit ? 0.7 : 0.45) * S}
              fill={lit ? "var(--copper)" : "var(--metal)"}
            />
            <text x={mx(x)} y={my(6.6)} textAnchor="middle" className={styles.silk}>
              {name}
            </text>
          </g>
        );
      })}
      {PARTS.map(([x, y, w, h]) => (
        <rect
          key={`${x}-${y}`}
          x={mx(x - w / 2)}
          y={my(y - h / 2)}
          width={w * S}
          height={h * S}
          rx={1}
          className={styles.part}
        />
      ))}
      <rect
        x={mx(3.3)}
        y={my(17.95)}
        width={11.2 * S}
        height={5.5 * S}
        rx={2}
        className={styles.outline}
      />
      <text x={mx(8.9)} y={my(21)} textAnchor="middle" className={styles.silk}>
        {SD_SILK}
      </text>
      <rect
        x={mx(7.57)}
        y={my(27.23)}
        width={6 * S}
        height={6 * S}
        rx={2}
        className={styles.part}
      />
      <text x={mx(10.57)} y={my(30)} textAnchor="middle" className={styles.silk}>
        ESP32-C5
      </text>
      <text x={mx(10.57)} y={my(31.3)} textAnchor="middle" className={styles.silk}>
        HR8
      </text>
      <rect
        x={mx(3.11)}
        y={my(36.36)}
        width={1.6 * S}
        height={0.8 * S}
        rx={1}
        className={styles.part}
      />
      <circle cx={mx(5.33)} cy={my(40.88)} r={1.25 * S} className={styles.part} />
      <circle cx={mx(5.33)} cy={my(40.88)} r={0.45 * S} fill="var(--metal)" />
      <text x={mx(5.33)} y={my(38.9)} textAnchor="middle" className={styles.silk}>
        U.FL
      </text>
      <RgbLed cx={mx(14.56)} cy={my(37.1)} />
      <text x={mx(14.56)} y={my(35.6)} textAnchor="middle" className={styles.silk}>
        RGB
      </text>
      <rect
        x={mx(8.56)}
        y={my(38.4)}
        width={6 * S}
        height={4.2 * S}
        rx={2}
        fill="var(--part-orange)"
      />
      <text x={mx(11.56)} y={my(40.9)} textAnchor="middle" className={styles.qwiic}>
        QWIIC
      </text>
      {HOLES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={mx(x)} cy={my(y)} r={0.85 * S} fill="var(--surface)" />
      ))}
    </g>
  );
}

/** The on-board WS2812: simulators drive it through board signals. */
function RgbLed({ cx, cy }: { cx: number; cy: number }) {
  const rgb = useRgbState();
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5 * (rgb?.scale ?? 1)}
      fill={rgb?.color ?? "var(--card-white)"}
      stroke="var(--pcb-edge)"
      strokeWidth={1.5}
      style={rgb?.glow ? { filter: `drop-shadow(0 0 6px ${rgb.color})` } : undefined}
    />
  );
}
