import type { PulsarPadClass } from "@/domain/pulsar";

/** The pad colour classes in legend order, as on the reference pinout. */
export const PAD_CLASSES: readonly PulsarPadClass[] = ["safe", "strapping", "bus", "control", "neopixel", "power", "gnd"];

/** Each class's colour: the pad fill on every pinout drawing and its dot in legends and tables. */
export const PAD_COLOUR: Readonly<Record<PulsarPadClass, string>> = {
  safe: "var(--pad)",
  strapping: "var(--danger)",
  bus: "var(--part-blue)",
  control: "var(--part-pink)",
  neopixel: "var(--part-purple)",
  power: "var(--power)",
  gnd: "var(--gnd)",
};

/** The `board.legend.*` key that names each class. */
export const PAD_LEGEND_KEY = {
  safe: "safe",
  strapping: "strapping",
  bus: "bus",
  control: "control",
  neopixel: "neopixel",
  power: "power",
  gnd: "ground",
} as const satisfies Record<PulsarPadClass, string>;
