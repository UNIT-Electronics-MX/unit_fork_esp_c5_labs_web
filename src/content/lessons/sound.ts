// Lessons of the "sound" track. Strings may carry the inline markup RichText understands:
// <b>, <i>, <code> and <span class="snd-parts|need|opt">.
import type { LessonEntry } from "@/domain/lesson";
import { codecSoundLessons } from "./sound-codec";

export const soundLessons = [
  {
    kind: "lesson",
    id: "S0",
    track: "sound",
    title: "I²S microphone",
    status: "MicroPython",
    heading: "Read and hear the ICS-43434 on J20",
    goal: "Connect the ICS-43434 to the six-pin J20 connector. Read its I²S peak in the serial console, then stream PCM over USB Serial/JTAG and listen in the browser. Both MicroPython scripts open in this exercise's Code view.",
    goalLine: "Check the microphone level, then hear the same J20 microphone in the browser.",
    goalCheck: [
      "The console prints <code>Audio peak (24-bit):</code> with a changing value when you speak.",
      "The browser listener receives PCM frames, changes its signal state and plays your voice.",
      "The listening gain changes playback volume while dBFS keeps reporting the original samples.",
    ],
    learn: ["I²S input", "24-bit microphone samples", "PCM over USB Serial/JTAG", "dBFS and listening gain"],
    // J20 is a separate connector; highlighting edge pads here would suggest the wrong hookup.
    pins: [],
    usb: true,
    cmd: "",
    wiring: {
      title: "Connect J20 directly to the ICS-43434 J1 connector",
      head: ["Board J20", "ICS-43434 J1", "Signal"],
      rows: [
        ["Pin 1 · GPIO27", "Pin 1 · SCK", "I²S bit clock"],
        ["Pin 2 · GPIO7", "Pin 2 · SD", "Microphone data"],
        ["Pin 3 · GPIO26", "Pin 3 · WS", "Left/right word clock"],
        ["Pin 4 · GPIO10", "Pin 4 · CH", "Drive low to select the left channel"],
        ["Pin 5 · 3V3", "Pin 5 · VSYS", "3.3 V power"],
        ["Pin 6 · GND", "Pin 6 · GND", "Common ground"],
      ],
    },
    steps: [
      "Install the included MicroPython preview firmware at <code>0x0000</code> from <b>Flash firmware</b>. It includes <code>machine.I2S</code>.",
      "Unplug USB and connect the six J20 pins to the ICS-43434 J1 pins in the same order. Plug USB back in; J20 is not the four-pin Qwiic connector.",
      "Open <b>Code</b>, connect the serial console and run <code>mic_ics43434_j20.py</code>. Speak near the microphone and watch the peak change.",
      "Stop the script, select <code>mic_ics43434_usb_master.py</code> and run it. In the listening dialog, press <b>Listen</b> to hear the microphone in the browser.",
      "Adjust <b>Listening gain</b> if playback is quiet. If it distorts, lower the gain. Press <b>Stop listening</b> before leaving the exercise.",
    ],
    note: "Do not use the microSD card while listening to the J20 I²S microphone: both use GPIO27, GPIO7 and GPIO26. SPI card activity can interfere with I²S and cause audible clicks. The listener detects valid PCM and signal level, not the microphone's electrical identity. A silent or disconnected module may look the same. Listening gain does not change the incoming PCM or dBFS reading.",
    panels: [{ title: "Connect the microphone, wire by wire", widget: "soundMicWiring" }],
  },
  ...codecSoundLessons,
] as const satisfies readonly LessonEntry[];
