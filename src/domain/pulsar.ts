// The UNIT PULSAR ESP32-C5 header (Product Reference v0.1.0, hardware V1.2.3, §4.1): 30
// positions in the published numbering order, 1–15 down one edge (side "L") and 16–30 down the
// other ("R"). The single source for the Pulsar pinout table and the lesson pin card.
import type { PinSide, PinUse } from "./lesson";

/** What a position is mainly for; its text lives in the "common" catalogue (board.pulsar.use). */
export type PulsarUse =
  | "sck"
  | "v3"
  | "en"
  | "vbat"
  | "qwiicSda"
  | "analogMtck"
  | "analogMtdo"
  | "sensorSda"
  | "sensorScl"
  | "qwiicScl"
  | "rgbOut"
  | "vusb"
  | "gnd"
  | "vin"
  | "uartTx"
  | "uartRx"
  | "reset"
  | "rgbData"
  | "boot"
  | "io"
  | "sdCs"
  | "usbDm"
  | "usbDp"
  | "spiSs"
  | "spiMosi"
  | "spiMiso";

export interface PulsarPosition {
  /** Silkscreen label, a symbol rather than text: "A2 / D16". */
  readonly label: string;
  /** GPIO number as lessons write it ("27"), or the rail name ("3V3", "GND") for non-GPIO pins. */
  readonly pin: string;
  readonly use: PulsarUse;
  /** Function printed in a box beside the pad on the reference pinout ("SCK", "USB D+"): a symbol. */
  readonly fn?: string;
}

export const PULSAR_HEADER: readonly PulsarPosition[] = [
  { label: "D13 / SCK / LED", fn: "SCK", pin: "27", use: "sck" },
  { label: "3V3", pin: "3V3", use: "v3" },
  { label: "EN", pin: "EN", use: "en" },
  { label: "VBAT", pin: "VBAT", use: "vbat" },
  { label: "A1 / D15", fn: "A1", pin: "1", use: "qwiicSda" },
  { label: "A2 / D16", fn: "A2", pin: "4", use: "analogMtck" },
  { label: "A3 / D17", fn: "A3", pin: "5", use: "analogMtdo" },
  { label: "SDA / D18", fn: "SDA", pin: "2", use: "sensorSda" },
  { label: "SCL / D19", fn: "SCL", pin: "3", use: "sensorScl" },
  { label: "A6 / D21", fn: "A6", pin: "6", use: "qwiicScl" },
  { label: "RGB / NEOPIXEL DOUT", fn: "NEO OUT", pin: "DOUT", use: "rgbOut" },
  { label: "VUSB", pin: "VUSB", use: "vusb" },
  { label: "GND", pin: "GND", use: "gnd" },
  { label: "GND", pin: "GND", use: "gnd" },
  { label: "VIN", pin: "VIN", use: "vin" },
  { label: "TX0 / D1", fn: "TX", pin: "11", use: "uartTx" },
  { label: "RX0 / D0", fn: "RX", pin: "12", use: "uartRx" },
  { label: "RST", pin: "RST", use: "reset" },
  { label: "GND", pin: "GND", use: "gnd" },
  { label: "D2 / RGB", fn: "NEO IN", pin: "0", use: "rgbData" },
  { label: "D3 / BOOT", fn: "BOOT", pin: "28", use: "boot" },
  { label: "D4", pin: "9", use: "io" },
  { label: "D5", pin: "23", use: "sdCs" },
  { label: "D6", pin: "24", use: "io" },
  { label: "D7", pin: "25", use: "io" },
  { label: "D8", fn: "USB D−", pin: "13", use: "usbDm" },
  { label: "D9", fn: "USB D+", pin: "14", use: "usbDp" },
  { label: "D10 / SS", fn: "SS", pin: "10", use: "spiSs" },
  { label: "D11 / MOSI", fn: "MOSI", pin: "7", use: "spiMosi" },
  { label: "D12 / MISO", fn: "MISO", pin: "26", use: "spiMiso" },
];

/** The silkscreen name printed beside a pad: the label's first part ("A2 / D16" → "A2"). */
export const pulsarSilk = (p: PulsarPosition) => p.label.split(" / ")[0] ?? p.label;

/** The reference pinout's colour classes: free GPIO, the reasons to be careful, rails and ground. */
export type PulsarPadClass = "safe" | "strapping" | "bus" | "control" | "neopixel" | "power" | "gnd";

/** Why a pad is best left alone: each reason has its own explanation in the interface. */
export type PulsarAvoidReason = "strapping" | "usb" | "uart" | "control";

const RAILS = new Set(["3V3", "VBAT", "VUSB", "VIN"]);
/** The on-board NeoPixel chain: its data in (D2, GPIO0) and the header's DOUT. */
const NEOPIXEL = new Set(["0", "DOUT"]);
/** Strapping pins (GPIO 2, 3, 7, 25–28), native USB, UART0 and the control pins. */
const AVOID: ReadonlyMap<string, PulsarAvoidReason> = new Map([
  ...["2", "3", "7", "25", "26", "27", "28"].map((pin) => [pin, "strapping"] as const),
  ["13", "usb"],
  ["14", "usb"],
  ["11", "uart"],
  ["12", "uart"],
  ["EN", "control"],
  ["RST", "control"],
]);

/** How a pad is coloured, as on the reference pinout. */
export function pulsarPadClass(pin: string): PulsarPadClass {
  if (RAILS.has(pin)) return "power";
  if (pin === "GND") return "gnd";
  if (NEOPIXEL.has(pin)) return "neopixel";
  const reason = AVOID.get(pin);
  if (reason === "usb" || reason === "uart") return "bus";
  return reason ?? "safe";
}

/** Why a pad needs care before wiring, or null when it is free to use. */
export const pulsarAvoidReason = (pin: string): PulsarAvoidReason | null => AVOID.get(pin) ?? null;

/**
 * Where a position sits in the top-view drawing (USB-C at the top): the left edge runs 1–15
 * downwards, the right edge 16–30 upwards, so position 30 (D12) faces position 1 (D13).
 */
export const pulsarRow = (position: number): { side: PinSide; row: number } =>
  position < PULSAR_EDGE
    ? { side: "L", row: position }
    : { side: "R", row: 2 * PULSAR_EDGE - 1 - position };

/** Rails named differently on the ESP32-S3 DevKitC that the older lessons were written for. */
const RAIL_ALIAS: Readonly<Record<string, string>> = { "5V": "VUSB" };

/** Positions per edge: 1–15 on side "L", 16–30 on side "R". */
export const PULSAR_EDGE = 15;

/** The edge a 0-based header position sits on. */
export const pulsarSide = (position: number): PinSide => (position < PULSAR_EDGE ? "L" : "R");

/** Is this a GPIO number rather than a rail or control pin? */
export const isGpio = (pin: string) => /^\d+$/.test(pin);

/**
 * The 0-based header position of a pin a lesson uses: its `idx` when that position carries the
 * pin, else the pin's first appearance. -1 when the pin is not on the header.
 */
export function pulsarPosition(use: PinUse): number {
  const pin = RAIL_ALIAS[use.pin] ?? use.pin;
  if (use.idx !== undefined && PULSAR_HEADER[use.idx]?.pin === pin) return use.idx;
  return PULSAR_HEADER.findIndex((p) => p.pin === pin);
}

/** The lesson pins that have no place on the Pulsar C5 header (ESP32-S3-only GPIOs). */
export const pulsarMissing = (pins: readonly PinUse[]): readonly PinUse[] =>
  pins.filter((p) => pulsarPosition(p) < 0);

/** Each used header position with the lesson pins on it, in header order. */
export function pulsarUsage(pins: readonly PinUse[]): ReadonlyMap<number, readonly PinUse[]> {
  const used = new Map<number, PinUse[]>();
  for (const pin of pins) {
    const at = pulsarPosition(pin);
    if (at < 0) continue;
    used.set(at, [...(used.get(at) ?? []), pin]);
  }
  return new Map([...used].sort(([a], [b]) => a - b));
}
