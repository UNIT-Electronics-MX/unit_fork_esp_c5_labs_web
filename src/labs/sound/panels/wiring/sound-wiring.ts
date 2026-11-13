// The wires of the sound exercises, as data: which board pad goes to which module pin, in the
// order to connect them (ground and power first), and where both ends sit in the drawing.
// The drawing is a schematic: board connectors on the left, the module on the right.

export type SoundPart = "ics43434" | "es8311";
/** Which half of the codec an exercise uses: the microphone, the speaker or both. */
export type CodecMode = "both" | "capture" | "playback";
export type PadGroup = "qwiic" | "j20" | "d6";

export interface BoardPad {
  readonly id: string;
  readonly group: PadGroup;
  /** What is printed beside the pad: a J20 pin number or a signal name. */
  readonly label: string;
  /** "GPIO27", "3V3" or "GND": what the pad carries on the C5. */
  readonly net: string;
  readonly y: number;
}

export type WireId =
  | "ics-gnd" | "ics-vsys" | "ics-sck" | "ics-sd" | "ics-ws" | "ics-ch"
  | "es-gnd" | "es-vcc" | "es-sda" | "es-scl" | "es-bclk" | "es-ws" | "es-mclk" | "es-dout" | "es-din";

export interface SoundWire {
  /** Unique; also the key of its note in labs-sound wiring.notes. */
  readonly id: WireId;
  readonly pad: string;
  readonly pin: string;
  /** A wire colour token, e.g. "--w-sda". */
  readonly color: string;
  readonly use: CodecMode;
}

// Drawing units. The board's pads sit on its right edge, the module's pins on its left edge.
export const VIEW = { width: 690, height: 420 } as const;
export const BOARD = { x: 20, y: 36, width: 212, height: 352 } as const;
export const MODULE = { x: 440, y: 36, width: 140, height: 352 } as const;
export const PAD_X = BOARD.x + BOARD.width;
export const PIN_X = MODULE.x;

/** The full drawing, and a phone crop that keeps the connectors, wires and module. */
export const VIEWBOX = `0 0 ${VIEW.width} ${VIEW.height}`;
const COMPACT_LEFT = PAD_X - 100;
export const COMPACT_VIEWBOX = `${COMPACT_LEFT} 60 ${VIEW.width - COMPACT_LEFT} ${VIEW.height - 80}`;
const PIN_TOP = 78;
const PIN_BOTTOM = 346;

const qwiic = (label: string, net: string, y: number): BoardPad => ({ id: `qwiic-${label}`, group: "qwiic", label, net, y });
const j20 = (n: number, net: string): BoardPad => ({ id: `j20-${n}`, group: "j20", label: String(n), net, y: 202 + (n - 1) * 22 });

/** Every pad the diagram draws, top to bottom; unused ones are drawn dimmed. */
export const BOARD_PADS: readonly BoardPad[] = [
  qwiic("GND", "GND", 96),
  qwiic("3V3", "3V3", 114),
  qwiic("SDA", "GPIO1", 132),
  qwiic("SCL", "GPIO6", 150),
  j20(1, "GPIO27"),
  j20(2, "GPIO7"),
  j20(3, "GPIO26"),
  j20(4, "GPIO10"),
  j20(5, "3V3"),
  j20(6, "GND"),
  { id: "d6", group: "d6", label: "D6", net: "GPIO24", y: 358 },
];

/**
 * The module's pins top to bottom. The order follows the board's pads so wires do not cross;
 * the real module prints the same names in its own order.
 */
export const MODULE_PINS: Readonly<Record<SoundPart, readonly string[]>> = {
  ics43434: ["SCK", "SD", "WS", "CH", "VSYS", "GND"],
  es8311: ["SDA", "SCL", "BCLK", "WS", "DIN", "MCLK", "3V3", "GND", "DOUT"],
};

const WIRES: Readonly<Record<SoundPart, readonly SoundWire[]>> = {
  ics43434: [
    { id: "ics-gnd", pad: "j20-6", pin: "GND", color: "--w-gnd", use: "both" },
    { id: "ics-vsys", pad: "j20-5", pin: "VSYS", color: "--w-vcc", use: "both" },
    { id: "ics-sck", pad: "j20-1", pin: "SCK", color: "--w-res", use: "both" },
    { id: "ics-sd", pad: "j20-2", pin: "SD", color: "--w-btn", use: "both" },
    { id: "ics-ws", pad: "j20-3", pin: "WS", color: "--w-dc", use: "both" },
    { id: "ics-ch", pad: "j20-4", pin: "CH", color: "--w-blk", use: "both" },
  ],
  es8311: [
    { id: "es-gnd", pad: "j20-6", pin: "GND", color: "--w-gnd", use: "both" },
    { id: "es-vcc", pad: "j20-5", pin: "3V3", color: "--w-vcc", use: "both" },
    { id: "es-sda", pad: "qwiic-SDA", pin: "SDA", color: "--w-sda", use: "both" },
    { id: "es-scl", pad: "qwiic-SCL", pin: "SCL", color: "--w-scl", use: "both" },
    { id: "es-bclk", pad: "j20-1", pin: "BCLK", color: "--w-res", use: "both" },
    { id: "es-ws", pad: "j20-2", pin: "WS", color: "--w-dc", use: "both" },
    { id: "es-mclk", pad: "j20-4", pin: "MCLK", color: "--w-cs", use: "both" },
    { id: "es-dout", pad: "d6", pin: "DOUT", color: "--w-btn", use: "capture" },
    { id: "es-din", pad: "j20-3", pin: "DIN", color: "--w-blk", use: "playback" },
  ],
};

const MODES: readonly CodecMode[] = ["both", "capture", "playback"];

/** A panel's `view` picks the mode: 0 both, 1 capture, 2 playback. Anything else means both. */
export const modeFromView = (view: number | undefined): CodecMode => MODES[view ?? 0] ?? "both";

/** The wires an exercise needs, in the order to connect them. */
export function wiresFor(part: SoundPart, mode: CodecMode): readonly SoundWire[] {
  return WIRES[part].filter((wire) => wire.use === "both" || mode === "both" || wire.use === mode);
}

export function padById(id: string): BoardPad | undefined {
  return BOARD_PADS.find((pad) => pad.id === id);
}

/** The y of a module pin, spread evenly between the module's first and last pin rows. */
export function pinY(part: SoundPart, pin: string): number {
  const pins = MODULE_PINS[part];
  const index = pins.indexOf(pin);
  if (index < 0 || pins.length < 2) return (PIN_TOP + PIN_BOTTOM) / 2;
  return PIN_TOP + (index * (PIN_BOTTOM - PIN_TOP)) / (pins.length - 1);
}

/** A smooth S-curve from the board pad to the module pin, or "" if the pad is unknown. */
export function wirePath(part: SoundPart, wire: SoundWire): string {
  const pad = padById(wire.pad);
  if (!pad) return "";
  const to = pinY(part, wire.pin);
  const mid = (PAD_X + PIN_X) / 2;
  return `M ${PAD_X} ${pad.y} C ${mid} ${pad.y}, ${mid} ${to}, ${PIN_X} ${to}`;
}

/** Pads this exercise connects, so the drawing can dim the rest. */
export function usedPads(part: SoundPart, mode: CodecMode): ReadonlySet<string> {
  return new Set(wiresFor(part, mode).map((wire) => wire.pad));
}
