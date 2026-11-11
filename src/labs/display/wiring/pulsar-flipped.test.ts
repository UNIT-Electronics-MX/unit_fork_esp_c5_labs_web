import { describe, expect, it } from "vitest";
import { pulsarSilk } from "@/domain/pulsar";
import { BOARD_H_MM, FLIPPED_PADS, SD_PADS } from "./pulsar-flipped";

const find = (silk: string) => FLIPPED_PADS.find((p) => pulsarSilk(p.pad) === silk);

describe("the turned Pulsar C5", () => {
  it("puts D13 and D12, the pads beside USB-C, at the bottom", () => {
    const d13 = find("D13");
    const d12 = find("D12");
    expect(d13?.edge).toBe("right");
    expect(d12?.edge).toBe("left");
    expect(d13?.at.y).toBeCloseTo(BOARD_H_MM - 3.81);
    expect(d12?.at.y).toBeCloseTo(BOARD_H_MM - 3.81);
  });

  it("puts VIN and TX0, the pads beside QWIIC, at the top", () => {
    expect(find("VIN")?.at.y).toBeCloseTo(3.81);
    expect(find("TX0")?.at.y).toBeCloseTo(3.81);
  });

  it("finds the microSD slot's four SPI pads in bus order", () => {
    expect(SD_PADS.map(({ signal, pad }) => [signal, pulsarSilk(pad.pad), pad.pad.pin])).toEqual([
      ["CS", "D5", "23"],
      ["MOSI", "D11", "7"],
      ["MISO", "D12", "26"],
      ["SCK", "D13", "27"],
    ]);
  });
});
