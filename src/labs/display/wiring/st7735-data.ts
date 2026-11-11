import { FLIPPED_PADS } from "./pulsar-flipped";

export const ST7735_WIRES = [
  { display: "GND", board: "GND", position: 12, color: "--w-gnd" },
  { display: "VCC", board: "3V3", position: 1, color: "--w-vcc" },
  { display: "SCL", board: "D13 / GPIO27", position: 0, color: "--w-scl" },
  { display: "SDA", board: "D11 / GPIO7", position: 28, color: "--w-sda" },
  { display: "CS", board: "D4 / GPIO9", position: 21, color: "--w-cs" },
  { display: "DC", board: "A2 / GPIO4", position: 5, color: "--w-dc" },
  { display: "RES", board: "A3 / GPIO5", position: 6, color: "--w-res" },
  { display: "BLK", board: "3V3", position: 1, color: "--w-blk" },
] as const;

export const ST7735_CONNECTIONS = ST7735_WIRES.map((wire, index) => ({
  ...wire,
  displayY: 160 + 37 * index,
  pad: FLIPPED_PADS[wire.position],
}));
