// What every MicroPython port of an S3 lab shares: the Pulsar C5 has no screen, so the views
// become serial commands, BOOT is the button and the on-board RGB LED shows the radio.
import type { PinUse } from "@/domain/lesson";

/** The C++ lab of each lesson: its own PlatformIO firmware with a screen, on the S3. */
export const arduinoLab = { key: "arduino", label: "Arduino", short: "PlatformIO lab and screen" } as const;

/** BOOT and the RGB LED: every MicroPython lab uses them, nothing to wire. */
export const C5_PINS = [
  { pin: "28", idx: 20, role: "BOOT", side: "R", kind: "btn" },
  { pin: "0", idx: 19, role: "RGB", side: "R" },
] as const satisfies readonly PinUse[];

/** The fields of a MicroPython variant that runs a script from the workbench: no firmware command. */
export const c5Script = {
  key: "micropython",
  label: "MicroPython",
  pins: C5_PINS,
  usb: true,
  cmd: "",
  commands: [],
} as const;
