// Lessons of the "iot" track: the Pulsar C5's radios talking to the outside world, ported from
// Labs 4–5 of the ESP32-C6 course. Pins use the Pulsar header (src/domain/pulsar.ts).
import type { LessonEntry } from "@/domain/lesson";
import { arduinoCmd, PULSAR_STATUS } from "./arduino";

export const iotLessons = [
  {
    kind: "lesson",
    id: "I1",
    track: "iot",
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
    panels: [],
  },
  {
    kind: "lesson",
    id: "I2",
    track: "iot",
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
    panels: [],
  },
] as const satisfies readonly LessonEntry[];
