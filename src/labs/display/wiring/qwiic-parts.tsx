// The QWIIC parts in the wiring examples, drawn from photos of the modules. Pin and part names are
// silkscreen markings, kept in constants: they read the same in every language.
import styles from "./examples.module.css";

export const HUB = { x: 70, y: 150, w: 300, h: 150 };
/** Where a cable plugs into the hub: its left and right JST connectors, first strand. */
export const HUB_LEFT_PORT = { x: HUB.x + 4, y: HUB.y + 100 };
export const HUB_RIGHT_PORT = { x: HUB.x + HUB.w - 4, y: HUB.y + 100 };
export const OLED = { x: 92, y: 352, w: 256, h: 210 };
export const TEMT = { x: 378, y: 344, w: 52, h: 200 };
/** The TEMT6000 board's QWIIC connector: centre and top. */
export const TEMT_PORT = { x: TEMT.x + TEMT.w / 2, y: TEMT.y - 8 };
export const BMI = { x: 140, y: 140, w: 180, h: 270 };
/** The BMI270 board's QWIIC connector: centre and bottom. */
export const BMI_PORT = { x: BMI.x + BMI.w / 2, y: BMI.y + BMI.h + 14 };

const HUB_PINS = ["GND", "3.3V", "SCL", "SDA"] as const;
const OLED_PINS = ["GND", "VCC", "SCL", "SDA"] as const;
const pinX = (i: number) => HUB.x + 112 + i * 25;
const HUB_SILK = { bus: "SDA · SCL · 3.3V · GND", name: "QWIIC BUS", maker: "UNIT ELECTRONICS" } as const;
/** What o1-oled.ino and oled.py print: firmware output, the same in every language. */
const SCREEN_LINES = ["Pulsar C5", "OLED ready"] as const;
const OLED_MARK = "SSD1306 · 0x3C";
/** D2's light graph: the last few seconds of readings, as the sketch plots them. */
const GRAPH = [60, 58, 61, 57, 40, 22, 18, 20, 19, 35, 52, 70, 88, 92, 90, 91, 74, 62, 60, 59];
const TEMT_PINS = ["SCL", "SDA", "VCC", "GND"] as const;
const TEMT_PADS = ["SIG", "GND", "VCC"] as const;
const TEMT_MARK = "TEMT6000";
/** The BMI270 breakout's castellated pads, top to bottom, as printed beside them. */
const BMI_LEFT = ["ASDx", "ASCx", "INT1", "INT2", "OCSB", "OSDO"] as const;
const BMI_RIGHT = ["GND", "VCC", "SDA", "SCL", "SDO", "CS"] as const;
const BMI_MARK = "BMI270";

/** UNIT's QWIIC Bus: three rows of shared headers, a JST port each side and four pins down. */
export function Hub() {
  const { x, y, w, h } = HUB;
  return (
    <g>
      <path
        className={styles.hub}
        d={`M${x + 10} ${y} H${x + w - 10} Q${x + w} ${y} ${x + w} ${y + 10} V${y + h} H${x + 222} V${y + h + 30} H${x + 98} V${y + h} H${x} V${y + 10} Q${x} ${y} ${x + 10} ${y} Z`}
      />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x={x + 38} y={y + 26 + row * 32} width={224} height={22} rx={2} className={styles.header} />
          {Array.from({ length: 8 }, (_, c) => (
            <rect key={c} x={x + 45 + c * 27} y={y + 31 + row * 32} width={11} height={11} rx={1} className={styles.socket} />
          ))}
        </g>
      ))}
      <rect x={x + 2} y={y + 92} width={24} height={34} rx={2} className={styles.jst} />
      <rect x={x + w - 26} y={y + 92} width={24} height={34} rx={2} className={styles.jst} />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" className={styles.silk}>{HUB_SILK.bus}</text>
      <text x={x + w / 2} y={y + 132} textAnchor="middle" className={styles.hubName}>{HUB_SILK.name}</text>
      <text x={x + w / 2} y={y + 143} textAnchor="middle" className={styles.silk}>{HUB_SILK.maker}</text>
      {HUB_PINS.map((pin, i) => (
        <g key={pin}>
          <text x={pinX(i)} y={y + h + 10} textAnchor="middle" className={styles.silk}>{pin}</text>
          <circle cx={pinX(i)} cy={y + h + 20} r={5} className={styles.padMetal} />
        </g>
      ))}
    </g>
  );
}

/** The SSD1306 module plugged into the hub's pins, showing O1's text or D2's light graph. */
export function OledModule({ screen }: { screen: "text" | "graph" }) {
  const { x, y, w, h } = OLED;
  const sx = x + 16;
  const sw = w - 32;
  return (
    <g>
      {OLED_PINS.map((_, i) => <rect key={i} x={pinX(i) - 2.5} y={y - 22} width={5} height={30} className={styles.pin} />)}
      <rect x={x} y={y} width={w} height={h} rx={8} className={styles.oled} />
      {[[x + 13, y + 13], [x + w - 13, y + 13], [x + 13, y + h - 13], [x + w - 13, y + h - 13]].map(([cx = 0, cy = 0]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} className={styles.padMetal} />
      ))}
      {OLED_PINS.map((pin, i) => (
        <text key={pin} x={pinX(i)} y={y + 24} textAnchor="middle" className={styles.oledPin}>{pin}</text>
      ))}
      <rect x={sx} y={y + 36} width={sw} height={136} rx={3} className={styles.screen} />
      {screen === "text"
        ? SCREEN_LINES.map((line, i) => (
            <text key={line} x={x + 36} y={y + 82 + i * 32} className={styles.screenText}>{line}</text>
          ))
        : (
            <polyline
              className={styles.graph}
              points={GRAPH.map((v, i) => `${sx + 12 + (i * (sw - 24)) / (GRAPH.length - 1)},${y + 160 - v * 1.1}`).join(" ")}
            />
          )}
      <text x={x + w / 2} y={y + 196} textAnchor="middle" className={styles.oledName}>{OLED_MARK}</text>
    </g>
  );
}

/** DevLab's TEMT6000 DDP: QWIIC on top, the light sensor and its helper chip, analog pads below. */
export function Temt6000Module() {
  const { x, y, w, h } = TEMT;
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} className={styles.hub} />
      <rect x={cx - 20} y={TEMT_PORT.y} width={40} height={24} rx={2} className={styles.jst} />
      {TEMT_PINS.map((pin, i) => (
        <text
          key={pin}
          x={cx - 13 + i * 8.7}
          y={y + 34}
          transform={`rotate(90 ${cx - 13 + i * 8.7} ${y + 34})`}
          className={styles.tinySilk}
        >
          {pin}
        </text>
      ))}
      <circle cx={cx} cy={y + 84} r={11} className={styles.goldRing} />
      <circle cx={cx} cy={y + 84} r={7} className={styles.hole} />
      <rect x={cx - 11} y={y + 112} width={22} height={18} rx={2} className={styles.socket} />
      <rect x={cx - 12} y={y + 140} width={24} height={9} rx={1.5} className={styles.sensor} />
      <rect x={cx - 3} y={y + 142} width={6} height={5} className={styles.sensorDie} />
      <text x={x + w - 6} y={y + 60} transform={`rotate(90 ${x + w - 6} ${y + 60})`} className={styles.tinySilk}>{TEMT_MARK}</text>
      {TEMT_PADS.map((pad, i) => {
        const px = x + 10 + i * 16;
        return (
          <g key={pad}>
            <circle cx={px} cy={y + h - 6} r={6} className={styles.padMetal} />
            <circle cx={px} cy={y + h - 6} r={2.6} className={styles.hole} />
            <text x={px} y={y + h - 16} textAnchor="middle" className={styles.tinySilk}>{pad}</text>
          </g>
        );
      })}
    </g>
  );
}

/** The BMI270 breakout: six castellated pads each side, the IMU in the middle, QWIIC at the bottom. */
export function Bmi270Module() {
  const { x, y, w, h } = BMI;
  const padY = (i: number) => y + 62 + i * 34;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} className={styles.hub} />
      <circle cx={x + 24} cy={y + 24} r={11} className={styles.hole} />
      <circle cx={x + 24} cy={y + h - 24} r={11} className={styles.hole} />
      {BMI_LEFT.map((pad, i) => (
        <g key={pad}>
          <rect x={x - 4} y={padY(i) - 10} width={22} height={20} rx={4} className={styles.padMetal} />
          <circle cx={x + 6} cy={padY(i)} r={5} className={styles.hole} />
          <text x={x + 26} y={padY(i) + 3} className={styles.silk}>{pad}</text>
        </g>
      ))}
      {BMI_RIGHT.map((pad, i) => (
        <g key={pad}>
          <rect x={x + w - 18} y={padY(i) - 10} width={22} height={20} rx={4} className={styles.padMetal} />
          <circle cx={x + w - 6} cy={padY(i)} r={5} className={styles.hole} />
          <text x={x + w - 26} y={padY(i) + 3} textAnchor="end" className={styles.silk}>{pad}</text>
        </g>
      ))}
      <rect x={x + w / 2 - 20} y={y + 118} width={40} height={40} rx={2} className={styles.socket} />
      <text x={x + w / 2} y={y + 174} textAnchor="middle" className={styles.hubName}>{BMI_MARK}</text>
      <rect x={BMI_PORT.x - 30} y={BMI_PORT.y - 28} width={60} height={28} rx={2} className={styles.jst} />
    </g>
  );
}
