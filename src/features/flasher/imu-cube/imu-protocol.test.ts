import { describe, expect, it } from "vitest";
import {
  eulerToQuaternion,
  LineSplitter,
  parseImuLine,
  RateMeter,
  sensorToScene,
  sensorVectorToScene,
  type Quaternion,
} from "./imu-protocol";

/** Rotates v by the unit quaternion q. */
function rotate(q: Quaternion, [x, y, z]: readonly [number, number, number]): [number, number, number] {
  const ix = q.w * x + q.y * z - q.z * y;
  const iy = q.w * y + q.z * x - q.x * z;
  const iz = q.w * z + q.x * y - q.y * x;
  const iw = -q.x * x - q.y * y - q.z * z;
  return [
    ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  ];
}

const close = (actual: readonly number[], expected: readonly number[]) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i] ?? Number.NaN, 6));

describe("parseImuLine", () => {
  it("reads a sample line", () => {
    expect(parseImuLine("IMU,10.5,-3.0,90.0,0.10,0.20,9.81,1.0,2.0,-3.0\r")).toEqual({
      kind: "sample", roll: 10.5, pitch: -3, yaw: 90, accel: [0.1, 0.2, 9.81], gyro: [1, 2, -3],
    });
  });

  it("reads acknowledgements", () => {
    expect(parseImuLine("ACK,c,0.12,-0.40,0.05")).toEqual({ kind: "ack", command: "c" });
    expect(parseImuLine("ACK,z")).toEqual({ kind: "ack", command: "z" });
  });

  it("ignores REPL text, short lines and bad numbers", () => {
    expect(parseImuLine(">>> ")).toBeNull();
    expect(parseImuLine("BMI270 ready at 0x68: keep it still")).toBeNull();
    expect(parseImuLine("IMU,1,2,3")).toBeNull();
    expect(parseImuLine("IMU,1,2,x,0,0,9.8,0,0,0")).toBeNull();
    expect(parseImuLine("IMU,1,,3,0,0,9.8,0,0,0")).toBeNull();
    expect(parseImuLine("ACK,q")).toBeNull();
  });
});

describe("LineSplitter", () => {
  it("joins chunks into whole lines and keeps the unfinished tail", () => {
    const lines = new LineSplitter();
    expect(lines.push("IMU,1,2")).toEqual([]);
    expect(lines.push(",3\r\nACK,z\nIM")).toEqual(["IMU,1,2,3", "ACK,z"]);
    expect(lines.push("U\n")).toEqual(["IMU"]);
  });

  it("drops a runaway line", () => {
    const lines = new LineSplitter(8);
    lines.push("0123456789");
    expect(lines.push("ab\n")).toEqual(["ab"]);
  });
});

describe("orientation", () => {
  it("is the identity at rest", () => {
    const q = eulerToQuaternion(0, 0, 0);
    close([q.x, q.y, q.z, q.w], [0, 0, 0, 1]);
  });

  it("turns the sensor's x axis towards y with positive yaw", () => {
    close(rotate(eulerToQuaternion(0, 0, 90), [1, 0, 0]), [0, 1, 0]);
  });

  it("tips the x axis down with positive pitch and lifts y with positive roll", () => {
    close(rotate(eulerToQuaternion(0, 90, 0), [1, 0, 0]), [0, 0, -1]);
    close(rotate(eulerToQuaternion(90, 0, 0), [0, 1, 0]), [0, 0, 1]);
  });

  it("rotates scene vectors the same way the sensor rotates its own", () => {
    const sensor = eulerToQuaternion(25, -40, 130);
    const scene = sensorToScene(sensor);
    for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.3, -0.5, 0.8]] as const) {
      close(rotate(scene, sensorVectorToScene(v)), sensorVectorToScene(rotate(sensor, v)));
    }
  });

  it("puts sensor z (up when flat) on the scene's y axis", () => {
    close(sensorVectorToScene([0, 0, 1]), [0, 1, 0]);
  });
});

describe("RateMeter", () => {
  it("counts samples per second over its window", () => {
    const meter = new RateMeter(2000);
    for (let t = 0; t <= 1000; t += 40) meter.add(t);
    expect(meter.rate(1000)).toBeCloseTo(25, 5);
    expect(meter.rate(10_000)).toBe(0);
  });
});
