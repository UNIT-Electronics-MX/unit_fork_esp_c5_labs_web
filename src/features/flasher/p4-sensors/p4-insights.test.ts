import { describe, expect, it } from "vitest";
import { parseP4Line } from "./p4-protocol";
import {
  assessBattery,
  chargeFromVoltage,
  droneControls,
  FlowTracker,
  headingDegrees,
  lightAmount,
  lightLevel,
  proximityAmount,
  relativeAltitude,
  shortestTurn,
} from "./p4-insights";

describe("relativeAltitude", () => {
  it("is zero at the baseline and about 8 m per hPa near sea level", () => {
    expect(relativeAltitude(1013.25, 1013.25)).toBe(0);
    expect(relativeAltitude(1012.25, 1013.25)).toBeCloseTo(8.4, 0);
    expect(relativeAltitude(1014.25, 1013.25)).toBeLessThan(0);
  });
});

describe("headingDegrees", () => {
  it("turns the board-plane vector into 0–360°", () => {
    expect(headingDegrees([100, 0, 5])).toBeCloseTo(0);
    expect(headingDegrees([0, 100, 5])).toBeCloseTo(90);
    expect(headingDegrees([0, -100, 5])).toBeCloseTo(270);
    expect(headingDegrees([0, 0, 50])).toBeNull();
  });
});

describe("light", () => {
  it("names the level and grows on a log scale", () => {
    expect(lightLevel(0)).toBe("dark");
    expect(lightLevel(466)).toBe("indoor");
    expect(lightLevel(20_000)).toBe("sun");
    expect(lightAmount(0)).toBe(0);
    expect(lightAmount(466)).toBeGreaterThan(0.5);
    expect(lightAmount(1e6)).toBe(1);
  });

  it("keeps proximity between 0 and 1", () => {
    expect(proximityAmount(0)).toBe(0);
    expect(proximityAmount(47)).toBeLessThan(0.4);
    expect(proximityAmount(4095)).toBeCloseTo(1);
  });
});

describe("battery", () => {
  it("estimates charge from voltage", () => {
    expect(chargeFromVoltage(3.0)).toBe(0);
    expect(chargeFromVoltage(3.95)).toBeCloseTo(76);
    expect(chargeFromVoltage(4.35)).toBe(100);
  });

  it("trusts the gauge only when its percentage is believable", () => {
    expect(assessBattery(3.9, 68).state).toBe("ok");
    expect(assessBattery(3.6, 9).state).toBe("low");
    const over = assessBattery(4.2, 198.4);
    expect(over.state).toBe("overRange");
    expect(over.percent).toBe(100);
    expect(over.gauge).toBe(198.4);
    expect(assessBattery(0.1, 0).state).toBe("noCell");
  });
});

describe("droneControls", () => {
  it("drives every part of the drone from a full sample", () => {
    const sample = parseP4Line("P4,0,31,28.62,45.59,786.56,30.89,466.55,47,4.202,107.5,-2311,1494,-971");
    expect(sample).not.toBeNull();
    if (!sample) return;
    const controls = droneControls(sample, 786.56);
    expect(controls.altitude).toBe(0);
    expect(controls.heading).toBeGreaterThan(90);
    expect(controls.light).toBeGreaterThan(0);
    expect(controls.battery?.state).toBe("overRange");
    expect(controls.warmth).toBeGreaterThan(0);
    expect(controls.humidity).toBeCloseTo(0.4559);
  });

  it("leaves missing sensors idle", () => {
    const sample = parseP4Line("P4,1,5,28.57,45.76,-,-,230.75,48,-,-,-,-,-");
    if (!sample) throw new Error("sample did not parse");
    const controls = droneControls(sample, null);
    expect(controls.altitude).toBeNull();
    expect(controls.battery).toBeNull();
    expect(controls.heading).toBeNull();
    expect(controls.light).not.toBeNull();
  });
});

describe("FlowTracker", () => {
  it("counts lines and gaps, and restarts with the script", () => {
    const flow = new FlowTracker();
    for (const sequence of [0, 1, 2, 5, 6, 0, 1]) flow.add(sequence);
    expect(flow.lines).toBe(7);
    expect(flow.lost).toBe(2);
  });
});

describe("shortestTurn", () => {
  it("turns across 0° instead of the long way round", () => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    expect(shortestTurn(rad(350), rad(10))).toBeCloseTo(rad(370));
    expect(shortestTurn(rad(10), rad(350))).toBeCloseTo(rad(-10));
    expect(shortestTurn(rad(720), rad(90))).toBeCloseTo(rad(810));
  });
});
