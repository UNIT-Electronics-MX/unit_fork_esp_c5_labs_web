// p4_sensor_stream.py sends one line per sample:
// P4,seq,mask,temp,rh,pressure,pressureTemp,lux,proximity,volts,soc,mx,my,mz
// Mask bits: FHT40=1, LPS22HB=2, VCNL4040=4, MAX17048=8, MMC5603=16.

export interface P4Sample {
  readonly sequence: number;
  readonly mask: number;
  readonly climate: { readonly temperature: number; readonly humidity: number } | null;
  readonly pressure: { readonly hpa: number; readonly temperature: number } | null;
  readonly light: { readonly lux: number; readonly proximity: number } | null;
  readonly battery: { readonly volts: number; readonly charge: number } | null;
  /** Raw, uncalibrated MMC5603 counts. */
  readonly magnetic: readonly [number, number, number] | null;
}

const FIELD_COUNT = 14;

/** Ignore REPL text and reject incomplete or inconsistent sensor frames. */
export function parseP4Line(line: string): P4Sample | null {
  const fields = line.trim().split(",");
  if (fields.length !== FIELD_COUNT || fields[0] !== "P4") return null;
  const sequence = Number(fields[1]);
  const mask = Number(fields[2]);
  if (!Number.isSafeInteger(sequence) || sequence < 0 || !Number.isInteger(mask) || mask < 0 || mask > 31) return null;

  const values = fields.slice(3).map((field) => field === "-" ? null : field.trim() === "" ? Number.NaN : Number(field));
  if (values.some((value) => value !== null && !Number.isFinite(value))) return null;
  const has = (bit: number) => (mask & bit) !== 0;
  for (const [bit, indexes] of [[1, [0, 1]], [2, [2, 3]], [4, [4, 5]], [8, [6, 7]], [16, [8, 9, 10]]] as const) {
    if (indexes.some((index) => has(bit) ? values[index] === null : values[index] !== null)) return null;
  }
  const pair = (bit: number, first: number, second: number): readonly [number, number] | null => {
    const a = values[first];
    const b = values[second];
    if (!has(bit)) return null;
    return typeof a === "number" && typeof b === "number" ? [a, b] : null;
  };
  const climate = pair(1, 0, 1);
  const pressure = pair(2, 2, 3);
  const light = pair(4, 4, 5);
  const battery = pair(8, 6, 7);
  const magneticValues = values.slice(8, 11);
  const magnetic = has(16) && magneticValues.every((value): value is number => typeof value === "number")
    ? magneticValues as [number, number, number] : null;
  if ((has(1) && !climate) || (has(2) && !pressure) || (has(4) && !light)
    || (has(8) && !battery) || (has(16) && !magnetic)) return null;
  return {
    sequence, mask,
    climate: climate && { temperature: climate[0], humidity: climate[1] },
    pressure: pressure && { hpa: pressure[0], temperature: pressure[1] },
    light: light && { lux: light[0], proximity: light[1] },
    battery: battery && { volts: battery[0], charge: battery[1] },
    magnetic,
  };
}
