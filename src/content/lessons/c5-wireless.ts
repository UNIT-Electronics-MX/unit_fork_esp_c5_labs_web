// Pulsar C5 wireless examples, displayed in the Wi-Fi and Bluetooth LE tracks.
// Ported from Labs 4–5 of the ESP32-C6 course. Pins use the Pulsar header.
import type { LessonEntry } from "@/domain/lesson";
import { arduinoCmd, PULSAR_STATUS } from "./arduino";

const c5WirelessLessons = [
  {
    kind: "lesson",
    id: "I1",
    track: "wifi",
    title: "Wi-Fi to the cloud",
    status: PULSAR_STATUS,
    heading: "Publish readings to ThingSpeak",
    goal: "Join your Wi-Fi network, 2.4 GHz or 5 GHz, and post temperature and humidity from a DHT11 to a ThingSpeak channel every 20 seconds.",
    learn: ["station mode", "dual-band Wi-Fi", "HTTP GET", "API keys", "rate limits"],
    pins: [
      { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
      { pin: "4", idx: 5, role: "DATA", side: "L" },
      { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
    ],
    cmd: arduinoCmd("i1-wifi-http"),
    wiring: {
      rows: [
        ["A2 (GPIO4)", "DHT11 KY-015 S / DATA", ""],
        ["3V3", "DHT11 VCC", ""],
        ["GND", "DHT11 GND", ""],
      ],
    },
    steps: [
      "Create a free ThingSpeak channel with two fields and copy its <b>Write API Key</b>.",
      "Install <code>DHT sensor library</code> from the Library Manager.",
      "Put your network name, password and key into the three constants at the top of the sketch.",
      "Unplug USB, wire the DHT11, plug in and run the command.",
      "The monitor prints the IP, channel and band, then <code>HTTP 200</code> every 20 seconds. Watch the channel's charts fill.",
    ],
    note: "Unlike the C6, the C5 also joins <b>5 GHz</b> networks: channel 36 and up. Never commit a sketch with your real password or key.",
    variants: [
      { key: "arduino", label: "Arduino", short: "Sketch and serial monitor" },
      {
        key: "micropython", label: "MicroPython", short: "Script, dht and requests",
        goal: "Join your Wi-Fi network, 2.4 GHz or 5 GHz, from MicroPython and post the DHT11's temperature and humidity to ThingSpeak every 20 seconds.",
        learn: ["network.WLAN", "dual-band Wi-Fi", "dht module", "HTTP GET with requests"],
        cmd: "",
        steps: [
          "Create a free ThingSpeak channel with two fields and copy its <b>Write API Key</b>.",
          "Unplug USB, wire the DHT11 and plug in again. Open <b>Code</b> and connect the serial REPL.",
          "In <code>thingspeak_dht.py</code>, put your network name, password and key into the three constants at the top.",
          "Press <b>Run on board</b>. The terminal prints the IP, channel and band, then <code>HTTP 200</code> every 20 seconds. Press <b>Stop</b> when you are done.",
        ],
        note: "MicroPython's <code>dht</code> and <code>requests</code> modules come with the ESP32-C5 firmware: nothing to install. Never save or share the script with your real password or key.",
      },
    ],
    panels: [],
  },
  {
    kind: "lesson",
    id: "I2",
    track: "ble",
    title: "Bluetooth LE touch",
    status: PULSAR_STATUS,
    heading: "Notify a phone when you touch a pad",
    goal: "Turn the Pulsar C5 into a Bluetooth LE peripheral with one service and one characteristic that notifies <code>touched</code> or <code>released</code> from a TTP223B touch pad.",
    learn: ["GATT server", "services & characteristics", "notifications", "advertising"],
    pins: [
      { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
      { pin: "5", idx: 6, role: "TOUCH", side: "L" },
      { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
    ],
    cmd: arduinoCmd("i2-ble-touch"),
    wiring: {
      rows: [
        ["A3 (GPIO5)", "TTP223B OUT", "HIGH while touched"],
        ["3V3", "TTP223B VCC", ""],
        ["GND", "TTP223B GND", ""],
      ],
    },
    steps: [
      "Unplug USB, wire the touch pad, plug in and run the command.",
      "On your phone, open nRF Connect or LightBlue and connect to <code>PulsarC5-BLE</code>.",
      "Open the service and subscribe to the characteristic's notifications.",
      "Touch the pad: the phone shows <code>touched</code>, then <code>released</code>.",
    ],
    note: "The C6 version notified four times a second whether or not anything changed; this one notifies only on a change, which keeps the radio quiet.",
    variants: [
      { key: "arduino", label: "Arduino", short: "Sketch and serial monitor" },
      {
        key: "micropython", label: "MicroPython", short: "GATT server with bluetooth",
        goal: "Turn the Pulsar C5 into a Bluetooth LE peripheral from MicroPython: one service, one characteristic, and a notification each time the TTP223B touch pad changes.",
        learn: ["bluetooth.BLE", "GATT services", "notifications", "advertising payloads"],
        cmd: "",
        steps: [
          "Unplug USB, wire the touch pad and plug in again. Open <b>Code</b> and connect the serial REPL.",
          "Run <code>ble_touch.py</code>. The terminal prints <code>Advertising as PulsarC5-BLE</code>.",
          "On your phone, open nRF Connect or LightBlue, connect to <code>PulsarC5-BLE</code> and subscribe to the characteristic's notifications.",
          "Touch the pad: the phone and the terminal show <code>touched</code>, then <code>released</code>. Press <b>Stop</b> to switch the radio off.",
        ],
        note: "The service and characteristic UUIDs match the Arduino sketch, so the phone sees the same device whichever language you use. After a disconnect the script advertises again by itself.",
      },
    ],
    panels: [],
  },
] as const satisfies readonly LessonEntry[];

export const c5WifiLesson = c5WirelessLessons[0];
export const c5BleLesson = c5WirelessLessons[1];
