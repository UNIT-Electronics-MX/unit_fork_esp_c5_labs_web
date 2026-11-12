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
    variants: [
      { key: "arduino", label: "Arduino", short: "Wire scan and chip ID sketch" },
      {
        key: "micropython", label: "MicroPython", short: "QWIIC ID check and motion readings",
        goal: "Identify a BMI270 on QWIIC, then use its driver to read acceleration and angular velocity with MicroPython.",
        learn: ["QWIIC connector", "machine.I2C", "readfrom_mem()", "acceleration and gyroscope"],
        cmd: "",
        steps: [
          "Unplug USB and connect the BMI270 with a QWIIC cable, or with jumpers to the header pins in the table.",
          "Reconnect USB, open <b>Code</b>, connect the serial REPL and run <code>bmi270_id.py</code>.",
          "The terminal prints <code>found 0x68</code> (or <code>0x69</code>), then <code>chip ID 0x24 (BMI270)</code>.",
          "Install <code>bmi270.py</code> from the code workspace, select <code>bmi270_motion.py</code> and run it. Move the sensor to change the acceleration and gyroscope readings.",
          "Run <code>bmi270_cube.py</code>: the <b>IMU cube</b> opens in a full-window viewer. Use <b>View cube</b> to reopen it. Lay the sensor still and press <b>Calibrate</b>; the same serial lines drive the Processing sketch <code>sketches/processing/imu_cube</code>.",
        ],
        note: "The ID check uses <code>readfrom_mem()</code> directly; only the motion example needs <code>bmi270.py</code>. The QWIIC connector has no pull-ups on the Pulsar C5, so the sensor board must carry them.",
      },
    ],
    panels: [
      {
        title: "How the sensor is wired",
        widget: "wiringExamples",
        view: 2,
      },
    ],
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
      "Unplug USB and move any older ST7735 CS wire from A1/GPIO1 to D4/GPIO9. Then connect the OLED and TEMT6000 DDP in parallel or chain them with QWIIC cables; the TFT may remain connected.",
      "Run the command. The monitor confirms a TEMT6000 with ID <code>0x0102</code> at <code>0x20</code>.",
      "Cover the sensor, then shine a light on it: the graph drops and climbs.",
    ],
    note: "The TFT uses SPI on GPIO27/GPIO7 with CS on D4/GPIO9. The OLED and TEMT6000 DDP use I²C SDA on GPIO1 and SCL on GPIO6, so both buses can stay wired. An older TFT hookup with CS on A1/GPIO1 must be moved to D4 before using QWIIC. The reading is a relative 12-bit level, not lux.",
    variants: [
      { key: "arduino", label: "Arduino", short: "SSD1306 and DevLabDDP sketch" },
      {
        key: "micropython", label: "MicroPython", short: "OLED graph over I²C",
        goal: "Read the TEMT6000 DDP over QWIIC and plot its recent light readings on an SSD1306 OLED with MicroPython.",
        learn: ["shared I²C bus", "DDP commands", "frame buffers", "ring buffers", "steady sampling"],
        cmd: "",
        steps: [
          "Stop the TFT script and unplug USB. Move its CS wire from A1/GPIO1 to D4/GPIO9 if it uses the older hookup; the TFT can stay connected. Then connect the OLED and TEMT6000 DDP to QWIIC with 3V3 and GND as shown.",
          "Open <b>Code</b>, connect the serial REPL and select <b>Install ssd1306.py</b>. This saves the display driver on the board.",
          "Run <code>oled_light.py</code>. The terminal identifies the TEMT6000 as <code>0x0102</code>, and the OLED draws its readings.",
          "Cover the sensor, then shine a light on it. The graph should change; press <b>Stop</b> when finished.",
        ],
        note: "This D2 graph needs the I²C TEMT6000 DDP sensor at 0x20; an analog-only TEMT6000 with SIG/OUT will not appear in an I²C scan. The OLED should appear at 0x3C. To turn on the OLED alone, use O1. The sensor reports a relative 12-bit value, not lux. Install <code>ssd1306.py</code> once from the code workspace before running.",
      },
    ],
    panels: [
      {
        title: "How the screen is wired",
        widget: "wiringExamples",
        view: 3,
      },
    ],
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
    adcMap: true,
    steps: [
      "Unplug USB and wire the sensor as in the table.",
      "Run the command and open the Serial Plotter.",
      "Pinch the sensor: the raw line jumps, the filtered line follows smoothly.",
    ],
    note: "TMP235: Vout = 500 mV + 10 mV/°C, so 750 mV is 25 °C. <code>analogReadMilliVolts()</code> already applies the chip's factory ADC calibration.",
    variants: [
      { key: "arduino", label: "Arduino", short: "Calibrated ADC and filter sketch" },
      {
        key: "micropython", label: "MicroPython", short: "Calibrated ADC and filter script",
        goal: "Read a TMP235 analog temperature sensor on A2 with MicroPython, convert millivolts to °C and smooth the result with a simple filter.",
        learn: ["sensor transfer functions", "read_uv()", "exponential filter", "noise"],
        cmd: "",
        steps: [
          "Unplug USB and wire the sensor as in the table.",
          "Reconnect USB, open <b>Code</b>, connect the serial REPL and run <code>tmp235_temperature.py</code>.",
          "Pinch the sensor: the raw column jumps, the filtered column follows smoothly. Press <b>Stop</b> when finished.",
        ],
        note: "TMP235: Vout = 500 mV + 10 mV/°C, so 750 mV is 25 °C. <code>read_uv()</code> applies the chip's factory ADC calibration, like <code>analogReadMilliVolts()</code> in Arduino.",
      },
    ],
    panels: [],
  },
] as const satisfies readonly LessonEntry[];
