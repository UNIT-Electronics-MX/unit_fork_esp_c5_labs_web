// Lessons of the "display" track. Strings may carry the inline markup RichText understands:
// <b>, <i>, <code> and <span class="snd-parts|need|opt">.
import type { LessonEntry } from "@/domain/lesson";
import { arduinoCmd, PULSAR_STATUS } from "./arduino";

export const displayLessons = [
  {
    kind: "lesson",
    id: "O1",
    track: "display",
    title: "OLED on QWIIC",
    status: PULSAR_STATUS,
    heading: "Turn on the SSD1306 OLED",
    goal: "Connect an SSD1306 OLED to the Pulsar C5 and show a message. This first screen experiment uses only the OLED.",
    learn: ["QWIIC connector", "I²C address 0x3C", "128 × 64 pixels", "display text"],
    pins: [
      { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
      { pin: "1", idx: 4, role: "SDA", side: "L" },
      { pin: "6", idx: 9, role: "SCL", side: "L" },
      { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
    ],
    cmd: arduinoCmd("o1-oled"),
    wiring: {
      head: ["Pulsar C5", "SSD1306 OLED", "Purpose"],
      rows: [
        ["3V3", "VCC", "3.3 V power"],
        ["GND", "GND", "common ground"],
        ["QWIIC SDA (GPIO1)", "SDA", "I²C data"],
        ["QWIIC SCL (GPIO6)", "SCL", "I²C clock"],
      ],
    },
    steps: [
      "Unplug USB and connect the SSD1306 OLED to QWIIC, or wire only its four pins as shown.",
      "Install <code>Adafruit SSD1306</code> and <code>Adafruit GFX Library</code> in Arduino IDE.",
      "Open <b>Code</b> to read <code>o1-oled.ino</code>, then upload it. The display shows <code>Pulsar C5</code> and <code>OLED ready</code>.",
    ],
    note: "This example expects a 128 × 64 OLED at I²C address 0x3C. Change the dimensions or address in the code if your module differs. The Pulsar C5 QWIIC connector has no on-board pull-ups; most OLED modules include them.",
    variants: [
      { key: "arduino", label: "Arduino", short: "Show text on the OLED" },
      {
        key: "micropython", label: "MicroPython", short: "Show text over QWIIC",
        learn: ["machine.I2C", "SSD1306_I2C", "I²C address 0x3C", "display text"],
        cmd: "",
        steps: [
          "Unplug USB and connect only the SSD1306 OLED to QWIIC, or wire its four pins as shown.",
          "Open <b>Code</b>, connect the serial REPL and select <b>Install ssd1306.py</b>. This saves the OLED driver on the board.",
          "Run <code>oled.py</code>. The OLED shows <code>Pulsar C5</code> and <code>MicroPython</code>.",
        ],
        note: "No light sensor is needed. This example expects a 128 × 64 SSD1306 at 0x3C. If you have a 128 × 32 display, set HEIGHT to 32 in oled.py.",
      },
    ],
    panels: [
      {
        title: "How the screen is wired",
        widget: "wiringExamples",
        view: 0,
      },
    ],
  },
  {
    kind: "lesson",
    id: "O2",
    track: "display",
    title: "ST7735 TFT",
    status: PULSAR_STATUS,
    heading: "Draw on the 80×160 TFT",
    goal: "Connect the ST7735 to the Pulsar C5 and draw colour bars, text and shapes with MicroPython.",
    learn: ["SPI clock and data", "RGB565 colour", "frame buffer", "TFT pin labels"],
    pins: [
      { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
      { pin: "27", idx: 0, role: "SCL / SCK", side: "L" },
      { pin: "9", idx: 21, role: "CS", side: "R" },
      { pin: "4", idx: 5, role: "DC", side: "L" },
      { pin: "5", idx: 6, role: "RES", side: "L" },
      { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
      { pin: "7", idx: 28, role: "SDA / MOSI", side: "R" },
    ],
    wiring: {
      head: ["ST7735 TFT", "Pulsar C5", "Purpose"],
      rows: [
        ["VCC", "3V3", "3.3 V power"],
        ["GND", "GND", "common ground"],
        ["SCL", "D13 / GPIO27", "SPI clock, not I²C SCL"],
        ["SDA", "D11 / GPIO7", "SPI data (MOSI), not I²C SDA"],
        ["CS", "D4 / GPIO9", "chip select; leaves QWIIC SDA free"],
        ["DC", "A2 / GPIO4", "data or command"],
        ["RES", "A3 / GPIO5", "display reset"],
        ["BLK", "3V3", "backlight always on; leave open if your module already connects it"],
      ],
    },
    panels: [{ title: "Connect the ST7735 wires", widget: "st7735Wiring" }],
    steps: [
      "Unplug USB and wire the 80×160 ST7735 TFT as shown. Its SDA/SCL labels are SPI, not QWIIC.",
      "Open <b>Code</b> and connect the MicroPython REPL. Install <code>st7735.py</code> only if the board does not already have it.",
      "Run <code>st7735_display.py</code>. Look for red, green and blue screens, then text and shapes.",
    ],
    note: "CS uses D4/GPIO9 so A1/GPIO1 stays free for QWIIC SDA. Move any older TFT CS wire from A1 to D4 with USB unplugged. This example uses the green-tab 80×160 ST7735 with column offset 26 and row offset 1; the onboard microSD is kept deselected on GPIO23. If your module differs, adjust xoffset/yoffset in the example.",
  },
  {
    kind: "lesson",
    id: "O3",
    track: "display",
    title: "TFT showcase",
    status: PULSAR_STATUS,
    heading: "Animate the ST7735 screen",
    goal: "Use the same ST7735 wiring to show four animated MicroPython scenes, changing them with the on-board BOOT button.",
    learn: ["animated drawing", "SPI refresh", "button input", "debouncing"],
    pins: [
      { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
      { pin: "27", idx: 0, role: "SCL / SCK", side: "L" },
      { pin: "9", idx: 21, role: "CS", side: "R" },
      { pin: "4", idx: 5, role: "DC", side: "L" },
      { pin: "5", idx: 6, role: "RES", side: "L" },
      { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
      { pin: "28", idx: 20, role: "BOOT", side: "R", kind: "btn" },
      { pin: "7", idx: 28, role: "SDA / MOSI", side: "R" },
    ],
    boot: true,
    panels: [{ title: "Check the ST7735 wiring", widget: "st7735Wiring" }],
    steps: [
      "Keep the ST7735 wired exactly as in O2, with CS on D4/GPIO9. No extra wires are needed.",
      "Open <b>Code</b>, install <code>st7735.py</code> if needed, then run <code>st7735_showcase.py</code>.",
      "Press BOOT to switch between Bars, Orbit, Waves and System. Watch the scene name in the serial terminal.",
      "Press <b>Stop</b> in the editor when you want to return to the REPL.",
    ],
    note: "Press BOOT after startup; holding it during reset enters download mode. The animation uses the TFT's own SPI pins and the on-board button on GPIO28.",
  },
] as const satisfies readonly LessonEntry[];
