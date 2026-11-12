// The Wi-Fi track's MicroPython variants run on the Pulsar C5. W2 and W3 start
// with standalone basics; their earlier, feature-rich scripts remain optional.
import type { LessonVariant } from "@/domain/lesson";
import { arduinoLab, c5Script } from "./c5-script-variant";

const SETUP =
  "Open <b>Code</b>, connect the serial REPL and press <b>Install wifi_kit.py</b> once: every Wi-Fi lab imports it.";

/** W2's C5 variant combines the phone page with a live TFT signal display. */
export const w2MicroPython = {
  ...c5Script,
  label: "MicroPython · Pulsar C5",
  short: "Wi-Fi signal on TFT and LED control from a phone",
  hideWidgets: ["phone"],
  pins: [
    { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
    { pin: "27", idx: 0, role: "SCL / SCK", side: "L" },
    { pin: "9", idx: 21, role: "CS", side: "R" },
    { pin: "4", idx: 5, role: "DC", side: "L" },
    { pin: "5", idx: 6, role: "RES", side: "L" },
    { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
    { pin: "7", idx: 28, role: "SDA / MOSI", side: "R" },
    { pin: "0", idx: 19, role: "RGB", side: "R" },
  ],
  wiring: {
    head: ["ST7735 TFT", "Pulsar C5", "Purpose"],
    rows: [
      ["VCC", "3V3", "3.3 V power"],
      ["GND", "GND", "common ground"],
      ["SCL", "D13 / GPIO27", "SPI clock"],
      ["SDA", "D11 / GPIO7", "SPI data (MOSI)"],
      ["CS", "D4 / GPIO9", "chip select"],
      ["DC", "A2 / GPIO4", "data or command"],
      ["RES", "A3 / GPIO5", "display reset"],
      ["BLK", "3V3", "backlight; leave open if already connected"],
    ],
  },
  panels: [
    { title: "Connect the ST7735 screen", widget: "st7735Wiring" },
    { title: "How the pieces talk", widget: "webConcepts" },
  ],
  goal: "<code>wifi_w2_display.py</code> combines a live Wi-Fi signal display on an 80×160 ST7735 TFT with a local phone page for controlling the on-board RGB LED. The screen shows RSSI in dBm, bars, a 24-second trend and the board's IP. <code>wifi_w2_basic.py</code> works without a TFT; <code>wifi_w2_phone.py</code> adds nearby-network scans and remote control.",
  goalLine: "See live Wi-Fi signal on the TFT while controlling the RGB LED from your phone.",
  goalCheck: [
    "The TFT shows RSSI, bars, a signal history and the board's IP without flicker.",
    "The serial console prints <code>http://&lt;board IP&gt;</code>.",
    "The phone page's colour buttons change the on-board RGB LED and its label on the TFT.",
  ],
  learn: ["network.WLAN", "RSSI in dBm", "SPI", "RGB565 framebuffer", "HTTP GET", "NeoPixel"],
  steps: [
    "Unplug USB and wire the 80×160 ST7735 as in O2, with CS on D4/GPIO9. Its SDA/SCL labels mean SPI data/clock.",
    "Open <b>Code</b>, select <code>wifi_w2_display.py</code> and connect the serial REPL. Install <code>st7735.py</code> if it is not already on the board.",
    "Enter <code>WIFI_SSID</code> and <code>WIFI_PASSWORD</code> in the script, or connect with W1 first and keep Wi-Fi active.",
    "Run the script. <b>Checkpoint 1:</b> the TFT shows RSSI, bars, a live trend and IP, while the console prints the board's <code>http://</code> address.",
    "On a phone connected to the same Wi-Fi, open that address and tap Red, Green, Blue or Off. <b>Checkpoint 2:</b> the on-board LED and TFT colour label change.",
    "Press <b>Stop</b> to close the server. Without a TFT, choose <code>wifi_w2_basic.py</code>. For REST, WebSocket and remote relay, choose <code>wifi_w2_phone.py</code> and install <code>wifi_kit.py</code> first.",
  ],
  note: "The phone page is local and has no login. Do not expose port 80 to the internet. The screen uses the green-tab 80×160 ST7735 offsets from O2; adjust xoffset/yoffset for a different module. Keep your Wi-Fi password out of a shared copy of the script.",
} as const satisfies LessonVariant;

export const wifiVariants = {
  W1: [
    arduinoLab,
    {
      ...c5Script,
      hideWidgets: ["wifi"],
      short: "Scanner script and serial commands",
      goal: "Scan the air and join your network from MicroPython's <code>network</code> module. <code>wifi_w1_scan.py</code> lists every network nearby, <b>2.4 and 5 GHz</b>, then joins yours: you pick it from the scan table and type the password once. It is kept in the chip's NVS, never in the script. A status view shows internet time, the IP address, <code>bench.local</code> and a live signal chart.",
      goalLine: "Find your network in the scan, join it without writing the password in code, and reach the board by name.",
      goalCheck: [
        "The scan table lists networks with signal, channel, <b>band</b> and security, strongest first.",
        "<code>join</code> plus your password on the next line joins it, and the LED turns green.",
        "<code>status</code> shows the IP, <code>bench.local</code> and the time, and <code>ping bench.local</code> from your computer gets answers.",
        "Run the script again: it rejoins by itself, with no password typed.",
      ],
      learn: ["network.WLAN", "dual-band scan", "channels & dBm", "security types", "NVS storage", "internet time (NTP)", "mDNS"],
      steps: [
        SETUP,
        "Run <code>wifi_w1_scan.py</code>. <b>Checkpoint 1:</b> the first scan table, with a band column. The LED is blue while it scans.",
        "Type <code>channels</code>: how crowded each 2.4 GHz channel is, and which 5 GHz channels are in use.",
        "Find your network's number and type <code>join 3</code> (your number), then your password on the next line, or both at once: <code>join 3 yourpassword</code>. The number counts in the last table printed. Not in the table? <code>join Your Network</code>. The script never prints the password.",
        "Not joining? Every 3 s the console says how it is going, and after a failure it says why: <i>wrong password?</i> or <i>network not found</i>. Check the name and password, then <code>join</code> again; <code>forget</code> clears a wrong one.",
        "<b>Checkpoint 2:</b> <code>+ joined</code> and the status view: IP address, <code>bench.local</code>, channel and band. The LED turns green.",
        "Type <code>tz -6</code> (your offset from UTC) for local time, and <code>signal</code> for the last minute as a chart. From your computer, try <code>ping bench.local</code>; from the board, <code>reach</code> tests the router.",
        "Type <code>stop</code> (or press <b>Stop</b>) and run the script again: it rejoins by itself. <code>forget</code> erases the saved network; so does <code>FORGET_SAVED = True</code> at the top of the script, before it tries to join. BOOT: click = next view, double-click = scan now, long press = auto-scan on/off.",
      ],
      note: "The web terminal lists every line you send, including the password: don't share that screen. The network is saved in the NVS namespace <code>mpwifi</code>, apart from the Arduino labs' one. MicroPython has no ICMP ping, so <code>reach</code> times a TCP connection to port 80: a reply or a refusal both mean the host is there.",
    },
  ],
  W3: [
    arduinoLab,
    {
      ...c5Script,
      hideWidgets: ["weather"],
      short: "Current weather over HTTPS",
      goal: "<code>wifi_w3_basic.py</code> fetches current weather from Open-Meteo over HTTPS and prints the temperature, humidity and wind. Set your coordinates in the script; no account or API key is needed. The optional <code>wifi_w3_oracle.py</code> adds forecasts and an AI oracle.",
      goalLine: "Print the current weather for your coordinates in the serial console.",
      goalCheck: [
        "The board joins Wi-Fi and prints its IP address.",
        "The console prints current temperature, humidity and wind for the selected coordinates.",
      ],
      learn: ["network.WLAN", "HTTPS with requests", "JSON", "REST APIs"],
      steps: [
        "Open <b>Code</b>, select <code>wifi_w3_basic.py</code> and connect the serial REPL. This basic script needs no extra library.",
        "Set <code>LATITUDE</code>, <code>LONGITUDE</code> and <code>PLACE</code> for your location.",
        "Enter <code>WIFI_SSID</code> and <code>WIFI_PASSWORD</code>, or connect with W1 first and keep Wi-Fi active.",
        "Run the script. <b>Checkpoint:</b> the console prints temperature, humidity and wind, then the script ends.",
        "For forecasts and the AI oracle, select the optional <code>wifi_w3_oracle.py</code>; install <code>wifi_kit.py</code> and save a network with W1 first.",
      ],
      note: "The basic script makes one weather request each time you run it. MicroPython's HTTPS support may not validate the server certificate on every firmware build. Keep your Wi-Fi password out of a shared copy of the script.",
    },
  ],
} as const satisfies Readonly<Record<string, readonly LessonVariant[]>>;
