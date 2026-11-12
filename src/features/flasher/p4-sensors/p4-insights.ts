// What the P4 readings mean, as pure functions: altitude from pressure, a heading from the raw
// magnetic vector, a light level, an honest battery state and the health of the serial flow.
// The drone scene, the cards and the flow strip all read from here.
import type { P4Sample } from "./p4-protocol";

const unit = (value: number) => Math.min(1, Math.max(0, value));

/** Metres above the first pressure reading (international barometric formula). */
export function relativeAltitude(hpa: number, baselineHpa: number): number {
  if (hpa <= 0 || baselineHpa <= 0) return 0;
  return 44330 * (1 - (hpa / baselineHpa) ** 0.1903);
}

/**
 * Degrees 0–360 of the raw magnetic vector in the board's plane. The MMC5603 is not calibrated
 * here, so this is a relative heading: it turns when the board turns or a magnet comes near.
 */
export function headingDegrees([x, y]: readonly [number, number, number]): number | null {
  if (x === 0 && y === 0) return null;
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

export type LightLevel = "dark" | "dim" | "indoor" | "bright" | "sun";

export function lightLevel(lux: number): LightLevel {
  if (lux < 5) return "dark";
  if (lux < 50) return "dim";
  if (lux < 500) return "indoor";
  if (lux < 5000) return "bright";
  return "sun";
}

/** 0 (night) to 1 (sunlight) on a log scale, so a room and a window both move it. */
export const lightAmount = (lux: number) => unit(Math.log10(1 + Math.max(0, lux)) / 4);

/** VCNL4040 proximity counts (12-bit by default) to 0 (nothing) – 1 (touching), on a log scale. */
export const proximityAmount = (counts: number) => unit(Math.log10(1 + Math.max(0, counts) / 10) / Math.log10(1 + 4095 / 10));

/** A rough single-cell LiPo charge from its resting voltage (3.3 V empty, 4.2 V full). */
export function chargeFromVoltage(volts: number): number {
  const curve: ReadonlyArray<readonly [number, number]> = [
    [3.3, 0], [3.6, 10], [3.7, 30], [3.75, 45], [3.8, 55], [3.9, 70], [4.0, 82], [4.1, 92], [4.2, 100],
  ];
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (!first || !last) return 0;
  if (volts <= first[0]) return 0;
  if (volts >= last[0]) return 100;
  for (let i = 1; i < curve.length; i++) {
    const [v1, c1] = curve[i] ?? last;
    const [v0, c0] = curve[i - 1] ?? first;
    if (volts <= v1) return c0 + ((volts - v0) / (v1 - v0)) * (c1 - c0);
  }
  return 100;
}

/**
 * ok: the gauge's percentage is believable. overRange: it reads above 100 %, which the MAX17048
 * does with no cell on the charger or before it has learnt a newly connected cell: trust the
 * voltage instead. noCell: the voltage is too low for any LiPo. low: under 15 %.
 */
export type BatteryState = "ok" | "low" | "overRange" | "noCell";

export interface BatteryReading {
  readonly state: BatteryState;
  /** The charge to show, 0–100: the gauge's when believable, else the voltage estimate. */
  readonly percent: number;
  /** What the gauge reported, unclamped. */
  readonly gauge: number;
  readonly fromVoltage: number;
}

export function assessBattery(volts: number, gauge: number): BatteryReading {
  const fromVoltage = chargeFromVoltage(volts);
  if (volts < 2.5) return { state: "noCell", percent: 0, gauge, fromVoltage };
  if (gauge > 100.5 || gauge < 0) return { state: "overRange", percent: fromVoltage, gauge, fromVoltage };
  return { state: gauge < 15 ? "low" : "ok", percent: gauge, gauge, fromVoltage };
}

/** The angle equal to `to` (radians) that is closest to `from`, so a turn takes the short way round. */
export function shortestTurn(from: number, to: number): number {
  const full = Math.PI * 2;
  const delta = ((((to - from + Math.PI) % full) + full) % full) - Math.PI;
  return from + delta;
}

/** Normalised controls for the drone; null leaves that part of the drone idle. */
export interface DroneControls {
  /** Metres above where the stream started (pressure), clamped to ±2 m. */
  readonly altitude: number | null;
  readonly heading: number | null;
  readonly light: number | null;
  readonly proximity: number | null;
  readonly battery: BatteryReading | null;
  /** 0 cold (10 °C) – 1 hot (40 °C) */
  readonly warmth: number | null;
  /** 0–1 relative humidity */
  readonly humidity: number | null;
}

export function droneControls(sample: P4Sample, baselineHpa: number | null): DroneControls {
  const altitude = sample.pressure && baselineHpa
    ? Math.max(-2, Math.min(2, relativeAltitude(sample.pressure.hpa, baselineHpa)))
    : null;
  return {
    altitude,
    heading: sample.magnetic ? headingDegrees(sample.magnetic) : null,
    light: sample.light ? lightAmount(sample.light.lux) : null,
    proximity: sample.light ? proximityAmount(sample.light.proximity) : null,
    battery: sample.battery ? assessBattery(sample.battery.volts, sample.battery.charge) : null,
    warmth: sample.climate ? unit((sample.climate.temperature - 10) / 30) : null,
    humidity: sample.climate ? unit(sample.climate.humidity / 100) : null,
  };
}

/** Counts lines and the ones lost on the way (gaps in the board's sequence number). */
export class FlowTracker {
  #last: number | null = null;
  lines = 0;
  lost = 0;

  add(sequence: number) {
    // A lower number means the script restarted: start counting again from it.
    if (this.#last !== null && sequence > this.#last + 1) this.lost += sequence - this.#last - 1;
    this.#last = sequence;
    this.lines += 1;
  }
}

/** The five sensors in bus order, with the mask bit the stream sets when each one answered. */
export const P4_SENSORS = [
  { key: "climate", chip: "FHT40", address: 0x44, bit: 1 },
  { key: "pressure", chip: "LPS22HB", address: 0x5c, bit: 2 },
  { key: "light", chip: "VCNL4040", address: 0x60, bit: 4 },
  { key: "battery", chip: "MAX17048", address: 0x36, bit: 8 },
  { key: "magnetic", chip: "MMC5603", address: 0x30, bit: 16 },
] as const;

export type P4SensorKey = (typeof P4_SENSORS)[number]["key"];
