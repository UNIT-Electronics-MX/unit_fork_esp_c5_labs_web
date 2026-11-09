// Lessons of the "sensors" track: external sensors on the Pulsar C5, ported from Labs 1–3 of the
// ESP32-C6 course. Pins use the Pulsar header (src/domain/pulsar.ts).
import type { LessonEntry } from "@/domain/lesson";
import { arduinoCmd, PULSAR_STATUS } from "./arduino";

const QWIIC = [
  { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
  { pin: "1", idx: 4, role: "SDA", side: "L" },
  { pin: "6", idx: 9, role: "SCL", side: "L" },
  { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
] as const;

export const sensorsLessons = [
  {
    kind: "lesson",
    id: "D1",
    track: "sensors",
    title: "IMU on QWIIC",
    status: PULSAR_STATUS,
    heading: "Find a BMI270 on the QWIIC bus",
    goal: "Plug a BMI270 motion sensor into the QWIIC connector, scan the bus and read its chip ID register to prove it is the part you think it is.",
    learn: ["QWIIC connector", "register reads", "repeated start", "chip ID checks"],
    pins: QWIIC,
    cmd: arduinoCmd("d1-bmi270"),
    wiring: {
      rows: [
        ["QWIIC SDA (GPIO1)", "BMI270 SDA", "or header A1"],
        ["QWIIC SCL (GPIO6)", "BMI270 SCL", "or header A6"],
        ["3V3 / GND", "BMI270 VCC / GND", "3.3 V only"],
      ],
    },
    steps: [
      "Unplug USB and connect the BMI270 with a QWIIC cable, or with jumpers to the header pins in the table.",
      "Run the command. The scan prints <code>found 0x68</code> (or <code>0x69</code>).",
      "Check the last line: <code>chip ID 0x24 (BMI270)</code>.",
    ],
    note: "The Pulsar C5 has <b>no pull-ups on QWIIC</b>. Most sensor boards carry their own; with a bare chip, add 4.7 kΩ from SDA and SCL to 3V3. On the C6 this lab used GPIO6/7.",
    panels: [],
  },
  {
    kind: "lesson",
    id: "D2",
    track: "sensors",
    title: "OLED light graph",
    status: PULSAR_STATUS,
    heading: "Two devices on one bus: OLED and light sensor",
    goal: "Put an SSD1306 OLED (<code>0x3C</code>) and a TEMT6000 light sensor (<code>0x20</code>) on the same QWIIC bus, and plot the last six seconds of light on the screen.",
    learn: ["shared I²C bus", "addresses", "frame buffers", "ring buffers", "steady sampling"],
    pins: QWIIC,
    cmd: arduinoCmd("d2-oled-light"),
    wiring: {
      head: ["Pulsar C5", "OLED SSD1306", "TEMT6000 (ATOM)"],
      rows: [
        ["3V3", "VCC", "VCC"],
        ["GND", "GND", "GND"],
        ["QWIIC SDA (GPIO1)", "SDA", "SDA"],
        ["QWIIC SCL (GPIO6)", "SCL", "SCL"],
      ],
    },
    steps: [
      "Install <code>Adafruit SSD1306</code>, <code>Adafruit GFX Library</code> and <code>DevLabDDP</code> from the Library Manager.",
      "Unplug USB and wire both boards in parallel, or chain them with QWIIC cables.",
      "Run the command. The monitor confirms a TEMT6000 with ID <code>0x0102</code> at <code>0x20</code>.",
      "Cover the sensor, then shine a light on it: the graph drops and climbs.",
    ],
    note: "The reading is a relative 12-bit level, not lux: calibrate against a light meter before quoting units.",
    variants: [
      { key: "arduino", label: "Arduino", short: "SSD1306 and DevLabDDP sketch" },
      {
        key: "micropython", label: "MicroPython", short: "OLED graph over I²C",
        goal: "Read the TEMT6000 DDP over QWIIC and plot its recent light readings on an SSD1306 OLED with MicroPython.",
        learn: ["shared I²C bus", "DDP commands", "frame buffers", "ring buffers", "steady sampling"],
        cmd: "",
        steps: [
          "Unplug USB and connect the OLED and TEMT6000 DDP to the QWIIC bus. Use 3V3 and GND as shown.",
          "Open <b>Code</b>, connect the serial REPL and select <b>Install ssd1306.py</b>. This saves the display driver on the board.",
          "Run <code>oled_light.py</code>. The terminal identifies the TEMT6000 as <code>0x0102</code>, and the OLED draws its readings.",
          "Cover the sensor, then shine a light on it. The graph should change; press <b>Stop</b> when finished.",
        ],
        note: "This D2 graph needs a TEMT6000 DDP sensor. To turn on the OLED alone, use Display lesson O1. The sensor reports a relative 12-bit value, not lux. Install <code>ssd1306.py</code> once from the code workspace before running.",
      },
    ],
    panels: [],
  },
  {
    kind: "lesson",
    id: "D3",
    track: "sensors",
    title: "Analog temperature",
    status: PULSAR_STATUS,
    heading: "From millivolts to degrees with a TMP235",
    goal: "Read a TMP235 analog temperature sensor on A2, convert millivolts to °C and smooth the result with a simple filter.",
    learn: ["sensor transfer functions", "calibrated ADC", "exponential filter", "noise"],
    pins: [
      { pin: "3V3", idx: 1, role: "VDD", side: "L", kind: "power" },
      { pin: "4", idx: 5, role: "VOUT", side: "L" },
      { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
    ],
    cmd: arduinoCmd("d3-tmp235"),
    wiring: {
      rows: [
        ["3V3", "TMP235 VDD", ""],
        ["A2 (GPIO4)", "TMP235 VOUT", "was GPIO0 on the C6"],
        ["GND", "TMP235 GND", ""],
      ],
    },
    steps: [
      "Unplug USB and wire the sensor as in the table.",
      "Run the command and open the Serial Plotter.",
      "Pinch the sensor: the raw line jumps, the filtered line follows smoothly.",
    ],
    note: "TMP235: Vout = 500 mV + 10 mV/°C, so 750 mV is 25 °C. <code>analogReadMilliVolts()</code> already applies the chip's factory ADC calibration.",
    panels: [],
  },
] as const satisfies readonly LessonEntry[];
