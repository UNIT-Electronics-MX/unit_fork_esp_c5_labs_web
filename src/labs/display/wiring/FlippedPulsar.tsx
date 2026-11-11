import type { ReactNode } from "react";
import { isGpio, pulsarSilk } from "@/domain/pulsar";
import { BH, BW, BX, BY, GPIO_OUT, mx, my, NAME_OUT, QWIIC_PORT, S } from "./example-layout";
import { FLIPPED_PADS, flip } from "./pulsar-flipped";
import styles from "./examples.module.css";

/** A part on the board, given in the board's own frame (USB edge at y = 0): centre and size in mm. */
function Part({ x, y, w, h, className, rx = 1 }: { x: number; y: number; w: number; h: number; className: string | undefined; rx?: number }) {
  const c = flip(x, y);
  return <rect x={mx(c.x - w / 2)} y={my(c.y - h / 2)} width={w * S} height={h * S} rx={rx} className={className} />;
}

const SMALL_PARTS = [
  [12.9, 11.26, 3, 3],
  [12.66, 16.09, 2, 2],
  [7.79, 13.39, 2, 2],
  [6.46, 16.41, 4, 2],
  [4.06, 8.95, 1.5, 1.5],
  [4.77, 25.8, 3, 4],
  [10.31, 36.36, 1.6, 1.2],
] as const;

const HOLES = [
  [1.27, 1.27],
  [16.51, 1.27],
  [1.27, 41.91],
  [16.51, 41.91],
] as const;

/** The Pulsar C5 turned 180° (USB-C down, QWIIC up), with every header pad named outside it. */
export function FlippedPulsar({ marked, children }: { marked: ReadonlySet<number>; children?: ReactNode }) {
  const qwiic = QWIIC_PORT;
  const usb = flip(8.89, 2.55);
  const chip = flip(10.57, 30.23);
  return (
    <g>
      <rect x={BX} y={BY} width={BW} height={BH} rx={1.1 * S} className={styles.board} />
      <rect x={mx(usb.x - 4.47)} y={my(usb.y - 3.65)} width={8.94 * S} height={7.3 * S} rx={1.6 * S} className={styles.metal} />
      <Part x={3.18} y={3.95} w={1.6} h={2.6} className={styles.part} />
      <Part x={14.66} y={3.95} w={1.6} h={2.6} className={styles.part} />
      {SMALL_PARTS.map(([x, y, w, h]) => <Part key={`${x}-${y}`} x={x} y={y} w={w} h={h} className={styles.part} />)}
      <Part x={10.57} y={30.23} w={6} h={6} className={styles.part} rx={2} />
      <text x={mx(chip.x)} y={my(chip.y) + 2} textAnchor="middle" className={styles.chip}>ESP32-C5</text>
      <Part x={8.9} y={20.7} w={11.2} h={5.5} className={styles.slot} rx={2} />
      <rect x={mx(qwiic.x - 3)} y={my(qwiic.y - 2.1)} width={6 * S} height={4.2 * S} rx={2} className={styles.qwiicPort} />
      <text x={mx(qwiic.x)} y={my(qwiic.y) + 3} textAnchor="middle" className={styles.qwiicText}>QWIIC</text>
      {HOLES.map(([x, y]) => {
        const c = flip(x, y);
        return <circle key={`${x}-${y}`} cx={mx(c.x)} cy={my(c.y)} r={0.85 * S} className={styles.hole} />;
      })}
      {children}
      {FLIPPED_PADS.map(({ position, pad, at, edge }) => {
        const x = mx(at.x);
        const y = my(at.y);
        const left = edge === "left";
        const out = (distance: number) => (left ? BX - distance : BX + BW + distance);
        const on = marked.has(position);
        return (
          <g key={position}>
            <circle cx={x} cy={y} r={on ? 5.2 : 4} className={on ? styles.padOn : styles.pad} />
            <text x={out(NAME_OUT)} y={y + 3.5} textAnchor={left ? "end" : "start"} className={on ? styles.nameOn : styles.name}>
              {pulsarSilk(pad)}
            </text>
            {isGpio(pad.pin) ? (
              <text x={out(GPIO_OUT)} y={y + 3.2} textAnchor={left ? "end" : "start"} className={styles.gpio}>{`GP${pad.pin}`}</text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
