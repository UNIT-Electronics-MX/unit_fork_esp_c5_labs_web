// Lessons of the "intro" track. Strings may carry the inline markup RichText understands:
// <b>, <i>, <code> and <span class="snd-parts|need|opt">.
import type { LessonEntry } from "@/domain/lesson";
import { ARDUINO_SETUP_CMD, arduinoCmd, PULSAR_STATUS } from "./arduino";

export const introLessons = [
  {
    kind: "lesson",
    id: "00",
    track: "intro",
    title: "Setup",
    status: "setup guide for Pulsar C5",
    heading: "Connect and find the Pulsar C5",
    goal: "Choose Arduino or MicroPython and find the Pulsar C5's USB serial port before opening your first example.",
    learn: ["Arduino or MicroPython", "USB-C data cable", "serial port", "download mode"],
    pins: [],
    usb: true,
    cmd: ARDUINO_SETUP_CMD,
    steps: [
      "Connect a <b>data</b> USB-C cable to the Pulsar C5 and look for a new serial port (<code>/dev/ttyACM…</code>, <code>/dev/cu.usbmodem…</code> or <code>COM…</code>).",
      "In Arduino IDE, add <code>https://espressif.github.io/arduino-esp32/package_esp32_index.json</code> to Additional boards manager URLs, install <b>esp32 by Espressif Systems</b> version <b>3.3</b> or later, and select <b>ESP32C5 Dev Module</b>.",
      "Enable <b>USB CDC On Boot</b> and <b>PSRAM</b>, set flash to <b>8 MB</b>, and run the command above if you use arduino-cli.",
      "Open lesson <b>01 Hello</b> when the port is ready.",
    ],
    note: "If upload fails, hold BOOT, tap RST, release BOOT and try again. Continue with lesson 01, then build your first circuit in 02.",
    variants: [
      {
        key: "arduino",
        label: "Arduino",
        short: "Board core and first sketch",
      },
      {
        key: "micropython",
        label: "MicroPython",
        short: "Firmware and serial REPL",
        goal: "Find the Pulsar C5's USB serial port, install the official ESP32-C5 MicroPython firmware and check its REPL before opening the first script in lesson 01.",
        learn: ["MicroPython firmware", "USB-C data cable", "serial REPL", "download mode"],
        cmd: "",
        steps: [
          "Connect a <b>data</b> USB-C cable to the Pulsar C5 and find its new serial port (<code>/dev/ttyACM…</code>, <code>/dev/cu.usbmodem…</code> or <code>COM…</code>).",
          "Open <b>Firmware & console</b> for this lesson. The <b>ESP32_GENERIC_C5</b> <code>.bin</code> is preselected for Pulsar C5. The selector also includes a <b>SparkFun Thing Plus ESP32-C5</b> image for that board, or you can choose your own full <code>.bin</code>.",
          "At <code>0x2000</code>, keep <b>Erase entire flash</b> selected for a clean install and press <b>Erase and flash firmware</b>. If the console is connected, it will release its port automatically.",
          "After the board resets, reconnect the console below at <code>115200</code> baud and send the REPL test. The first full script is in lesson 01.",
        ],
        note: "Erasing the entire flash removes old firmware, saved <code>.py</code> scripts and board data. A <code>.bin</code> installs MicroPython; a <code>.py</code> is a script. Confirm the REPL works before lesson 01.",
      },
    ],
    panels: [],
  },
  {
    kind: "lesson",
    id: "01",
    track: "intro",
    title: "Hello",
    status: PULSAR_STATUS,
    heading: "Meet the Pulsar C5",
    goal: "Upload your first Arduino sketch. It prints the chip identity and cycles the on-board RGB LED through a rainbow.",
    learn: ["setup() and loop()", "Serial logging", "chip information", "WS2812 RGB LED"],
    pins: [
      {
        pin: "0",
        role: "RGB",
        side: "R",
        idx: 19,
      },
    ],
    cmd: arduinoCmd("intro-hello"),
    steps: [
      "Nothing to wire. Keep the USB-C data cable connected.",
      "Open <b>Code</b> to edit or download the sketch, then upload it with Arduino IDE or run the command above after replacing <code>PORT</code>.",
      "Open the serial monitor at <code>115200</code> baud and read the chip and flash information.",
      "Watch the on-board RGB LED cycle through colours.",
      "Close the monitor before uploading another sketch.",
    ],
    note: "The on-board RGB LED is a WS2812 on GPIO0, the D2/RGB pad, so the sketch sets RGB_PIN to 0.",
    variants: [
      { key: "arduino", label: "Arduino", short: "Sketch and serial monitor" },
      {
        key: "micropython", label: "MicroPython", short: "RGB script and serial REPL",
        goal: "Run a MicroPython script from the browser editor and watch the Pulsar C5's RGB LED cycle through colours.",
        learn: ["NeoPixel", "Python loops", "serial REPL", "interrupting a script"],
        cmd: "",
        steps: [
          "Install MicroPython in lesson 00, then open <b>Code</b> and connect its serial console at <code>115200</code> baud.",
          "Open <code>rgb_led.py</code> in the editor and check the RGB pin number before running it.",
          "Press <b>Run on board</b> and watch the RGB LED cycle through colours.",
          "Press <b>Stop</b> to return to the <code>&gt;&gt;&gt;</code> prompt, then try a Python command in the serial console.",
        ],
        note: "The RGB LED's data line is GPIO0 (D2/RGB): keep RGB_PIN at 0 in the editor.",
      },
    ],
    panels: [],
  },
  {
    kind: "lesson",
    id: "02",
    track: "intro",
    title: "First circuit",
    status: PULSAR_STATUS,
    heading: "An LED on the breadboard",
    goal: "Build an LED circuit on GPIO9 and control it from the Arduino serial monitor while the Pulsar C5 runs.",
    learn: ["breadboard rows", "resistors", "PWM brightness", "state machines"],
    pins: [
      {
        pin: "9",
        role: "LED +",
        side: "R",
        idx: 21,
      },
      {
        pin: "GND",
        idx: 18,
        role: "LED −",
        side: "R",
        kind: "gnd",
      },
    ],
    cmd: arduinoCmd("intro-led"),
    wiring: {
      rows: [
        ["GPIO 9 (D4)", "resistor 220–330 Ω", "first leg"],
        ["resistor", "LED long leg (+)", "other leg, same row"],
        ["LED short leg (−)", "GND", "blue rail or GND pin"],
      ],
    },
    steps: [
      "Unplug USB before wiring. Seat the board across the breadboard's centre gap.",
      "Wire GPIO9 (D4) → resistor → LED long leg. LED short leg → GND.",
      "Plug back in, open <b>Code</b> to get the Arduino sketch and upload it. The LED starts breathing.",
      "Type <code>blink 200</code>, <code>sos</code>, <code>level 30</code>, <code>on</code>, <code>off</code>.",
    ],
    note: "Use a 220–330 Ω resistor in series with the LED. Disconnect USB before changing wires.",
    variants: [
      { key: "arduino", label: "Arduino", short: "Sketch and serial commands" },
      {
        key: "micropython", label: "MicroPython", short: "LED script and serial REPL",
        goal: "Wire an LED to GPIO9 and run a MicroPython breathing LED script directly from the browser.",
        learn: ["breadboard rows", "resistors", "PWM duty", "Python loops"],
        cmd: "",
        steps: [
          "Disconnect USB, then wire GPIO9 (D4) → 220–330 Ω resistor → LED long leg; connect the short leg to GND.",
          "Reconnect USB, open <b>Code</b> and connect its serial console at <code>115200</code> baud.",
          "Open <code>external_led.py</code> in the editor and press <b>Run on board</b>.",
          "Watch the LED breathe. Press <b>Stop</b> to return to the REPL and edit the PWM duty or timing.",
        ],
        note: "Keep the series resistor in the circuit. Use the editor's Save to board action to keep the script on the device.",
      },
    ],
    panels: [],
  },
] as const satisfies readonly LessonEntry[];
