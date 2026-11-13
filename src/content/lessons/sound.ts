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
    panels: [],
  },
  {
    kind: "lesson",
    id: "S0B",
    track: "sound",
    title: "I²S ES8311 codec",
    status: "MicroPython",
    heading: "Capture and play sound with the ES8311",
    goal: "Connect the ES8311 codec to the board. Its ADC captures sound from an analog microphone, while its DAC and amplifier play sound through a speaker. Use the MicroPython examples in Code to try both directions independently.",
    goalLine: "Hear the codec microphone in the browser, then play a melody and interactive tones through its speaker.",
    goalCheck: [
      "The capture script prints a changing peak level when you speak into the analog microphone.",
      "The browser receives the codec's PCM stream and plays your voice.",
      "The melody script plays notes through the speaker connected to the ES8311 module.",
      "The tone lab changes pitch, waveform and level while the ES8311 plays through the speaker.",
      "The music player changes codec volume while an included song is playing.",
    ],
    learn: ["I²S input and output", "I²C codec control", "ADC and DAC", "PCM capture and speaker playback", "Frequency and waveform"],
    // J20 and Qwiic are separate connectors; edge-pad highlights would suggest the wrong hookup.
    pins: [],
    usb: true,
    cmd: "",
    wiring: {
      title: "Connect the ES8311 once for capture and playback",
      head: ["Board · mode", "ES8311 module", "Signal"],
      rows: [
        ["Both · J20 GPIO27", "BCLK", "I²S bit clock"],
        ["Both · J20 GPIO7", "WS", "I²S left/right word clock"],
        ["Both · J20 GPIO10", "MCLK", "Codec master clock (256 × sample rate)"],
        ["Both · J20 3V3", "3V3", "3.3 V power"],
        ["Both · J20 GND", "GND", "Common ground"],
        ["Both · Qwiic GPIO1", "SDA", "I²C data"],
        ["Both · Qwiic GPIO6", "SCL", "I²C clock"],
        ["Capture · D6 GPIO24", "DOUT", "Microphone audio from the codec to the C5"],
        ["Playback · J20 GPIO26", "DIN", "Speaker audio from the C5 to the codec"],
      ],
    },
    steps: [
      "Install the included MicroPython preview firmware at <code>0x0000</code> from <b>Flash firmware</b>. It includes <code>machine.I2S</code>.",
      "Unplug USB. Wire the <b>Both</b>, <b>Capture</b> and <b>Playback</b> rows above. DOUT goes to the exposed D6/GPIO24 pad, outside J20. Connect an analog microphone to the codec's J2 input and a speaker to its amplifier output, then reconnect USB.",
      "Open <b>Code</b>, connect the serial console and use <b>Install es8311.py</b> to save the codec driver on the board.",
      "Run <code>es8311_mic_capture.py</code> and speak near the microphone. Watch the frames per second and peak level in the console; use <code>es8311_mic_diagnose.py</code> if the input stays silent.",
      "Stop the capture script and run <code>es8311_mic_usb_audio.py</code>. Press <b>Listen</b> in the audio dialog to hear the microphone in the browser. Adjust <b>Listening gain</b> if needed, then press <b>Stop listening</b>.",
      "Stop the streaming script and run <code>es8311_melody.py</code> to hear the speaker. The capture and playback scripts use the same BCLK, WS and MCLK wires, so you can leave the codec connected.",
      "Stop the melody, select <code>es8311_tone_lab.py</code> and run it. The tone panel opens automatically. Hold a note or press <b>Play tone</b>; change frequency, waveform and level, then press <b>Silence</b>. You can reopen the panel with <b>Open tone lab</b>.",
      "Stop the tone lab, select <code>es8311_play_serial.py</code> and run it. In the audio player, choose one of the three included songs or open your own WAV or MP3, pick a quality and press <b>Play on the board</b>. Raise or lower <b>Volume</b> while the song plays. The browser converts the song to mono and streams it over USB. Use <b>Voice</b> or <b>Standard</b> for the smoothest sound.",
    ],
    note: "Capture uses DOUT on D6/GPIO24 and playback uses DIN on J20/GPIO26. Both share BCLK/GPIO27, WS/GPIO7 and MCLK/GPIO10. The C5 has one I²S peripheral, so run capture or playback one at a time without changing the wires. The ES8311 also needs I²C for configuration. Avoid using the microSD card while J20 carries I²S audio, because the shared GPIOs can cause interference.",
    panels: [],
  },
  ...codecSoundLessons,
] as const satisfies readonly LessonEntry[];
