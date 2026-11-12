// The IMU cube's serial protocol, shared by bmi270_cube.py, the web cube and the Processing sketch
// (sketches/processing/imu_cube). One line per message:
//   IMU,roll,pitch,yaw,ax,ay,az,gx,gy,gz   angles in degrees, m/s², °/s
//   ACK,c,bx,by,bz                          the gyroscope bias was measured again
//   ACK,z                                   the yaw was set to zero
// Anything else (the REPL, print() from other code) is ignored.

export interface ImuSample {
  readonly kind: "sample";
  /** Degrees, sensor frame: roll about x, pitch about y, yaw about z (Z-Y-X order). */
  readonly roll: number;
  readonly pitch: number;
  readonly yaw: number;
  /** m/s² */
  readonly accel: readonly [number, number, number];
  /** °/s, bias removed */
  readonly gyro: readonly [number, number, number];
}

export interface ImuAck {
  readonly kind: "ack";
  readonly command: ImuCommand;
}

export type ImuMessage = ImuSample | ImuAck;

/** What the page can ask the board: measure the gyroscope bias again, or zero the yaw. */
export type ImuCommand = "c" | "z";

const SAMPLE_FIELDS = 10;

/** Parses one serial line; null when it is not an IMU cube message. */
export function parseImuLine(line: string): ImuMessage | null {
  const fields = line.trim().split(",");
  if (fields[0] === "ACK" && (fields[1] === "c" || fields[1] === "z")) return { kind: "ack", command: fields[1] };
  if (fields[0] !== "IMU" || fields.length !== SAMPLE_FIELDS) return null;
  const values = fields.slice(1).map((field) => (field.trim() === "" ? Number.NaN : Number(field)));
  if (!values.every(Number.isFinite)) return null;
  const [roll = 0, pitch = 0, yaw = 0, ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0] = values;
  return { kind: "sample", roll, pitch, yaw, accel: [ax, ay, az], gyro: [gx, gy, gz] };
}

/** Splits serial text that arrives in arbitrary chunks into whole lines. */
export class LineSplitter {
  #partial = "";
  /** A line longer than this is not a protocol line: drop it instead of growing forever. */
  readonly #maxLine: number;

  constructor(maxLine = 512) {
    this.#maxLine = maxLine;
  }

  push(text: string): string[] {
    const parts = (this.#partial + text).split(/\r?\n|\r/);
    const rest = parts.pop() ?? "";
    this.#partial = rest.length > this.#maxLine ? "" : rest;
    return parts;
  }

  reset() {
    this.#partial = "";
  }
}

export interface Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

const RAD = Math.PI / 180;

/** The rotation yaw (z), then pitch (y), then roll (x), in degrees, as a quaternion in the sensor frame. */
export function eulerToQuaternion(roll: number, pitch: number, yaw: number): Quaternion {
  const cr = Math.cos((roll * RAD) / 2);
  const sr = Math.sin((roll * RAD) / 2);
  const cp = Math.cos((pitch * RAD) / 2);
  const sp = Math.sin((pitch * RAD) / 2);
  const cy = Math.cos((yaw * RAD) / 2);
  const sy = Math.sin((yaw * RAD) / 2);
  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

/**
 * The sensor is right-handed with z up; the 3D scene is right-handed with y up. Sensor x stays x,
 * sensor z becomes scene y and sensor y becomes scene -z, so a rotation's axis moves the same way.
 */
export function sensorToScene(q: Quaternion): Quaternion {
  return { w: q.w, x: q.x, y: q.z, z: -q.y };
}

/** Where a sensor-frame vector points in the scene (same mapping as sensorToScene). */
export function sensorVectorToScene([x, y, z]: readonly [number, number, number]): [number, number, number] {
  return [x, z, -y];
}

/** Samples per second over a sliding window of arrival times (ms). */
export class RateMeter {
  #times: number[] = [];
  readonly #windowMs: number;

  constructor(windowMs = 2000) {
    this.#windowMs = windowMs;
  }

  add(now: number) {
    this.#times.push(now);
    this.#drop(now);
  }

  rate(now: number): number {
    this.#drop(now);
    const first = this.#times[0];
    if (first === undefined || this.#times.length < 2) return 0;
    const span = now - first;
    return span > 0 ? ((this.#times.length - 1) * 1000) / span : 0;
  }

  #drop(now: number) {
    while (this.#times.length && now - (this.#times[0] ?? now) > this.#windowMs) this.#times.shift();
  }
}
