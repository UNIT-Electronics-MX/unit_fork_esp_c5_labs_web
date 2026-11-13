import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Local examples that accompany the sibling firmware checkout. */
const OWN_SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "micropython");
const TONE_LAB_ID = "es8311-tone-lab";
const PLAYER_ID = "es8311-play-serial";
const CODEC_CAPTURE_IDS = new Set(["es8311-mic-capture", "es8311-mic-diagnose", "es8311-mic-usb-audio", "es8311-mic-serial-pcm"]);
const SOUND_LAB_MODES = [
  { mode: "loudness", title: "Medidor de volumen", titleEn: "Sound level meter",
    description: "Mide RMS y pico del micrófono del ES8311 en dBFS.", descriptionEn: "Measure ES8311 microphone RMS and peak in dBFS." },
  { mode: "clap", title: "Control con palmadas", titleEn: "Clap control",
    description: "Detecta palmadas y conmuta un interruptor virtual en la consola.", descriptionEn: "Detect claps and toggle a virtual switch in the console." },
  { mode: "recorder", title: "Grabadora", titleEn: "Recorder",
    description: "Graba dos segundos en RAM y los reproduce por el altavoz del códec.", descriptionEn: "Record two seconds in RAM and play them through the codec speaker." },
  { mode: "spectrum", title: "Espectro", titleEn: "Spectrum",
    description: "Muestra ocho bandas de frecuencia del micrófono en la consola.", descriptionEn: "Show eight microphone frequency bands in the console." },
  { mode: "game", title: "Juego de sonido", titleEn: "Sound game",
    description: "Gana puntos al dar palmadas al ritmo de veinte pulsos.", descriptionEn: "Score by clapping on twenty timed beats." },
  { mode: "voice_fx", title: "Efectos de voz", titleEn: "Voice effects",
    description: "Graba voz y reproduce versiones robot, eco, aguda y grave.", descriptionEn: "Record speech and play robot, echo, high and low pitch versions." },
] as const;

/** Route ES8311 DOUT to the exposed D6/GPIO24 pin with the playback clock wiring. */
function codecCaptureCode(code: string): string {
  if (!/^DOUT_PIN\s*=/m.test(code)) return code;
  const pins = [
    ["BCLK_PIN", "27       # J20 GPIO27: ES8311 SCLK/BCLK"],
    ["WS_PIN", "7          # J20 GPIO7: ES8311 LRCK/WS"],
    ["DOUT_PIN", "24       # D6/GPIO24: ES8311 DOUT -> Pulsar C5 I2S input"],
    ["MCLK_PIN", "10       # J20 GPIO10: ES8311 MCLK (256 x fs)"],
  ] as const;
  for (const [name, assignment] of pins) {
    const line = new RegExp(`^${name}\\s*=\\s*-?\\d+[^\\r\\n]*$`, "m");
    if (!line.test(code)) throw new Error(`ES8311 capture example is missing ${name}`);
    code = code.replace(line, `${name} = ${assignment}`);
  }
  return code
    .replace("BCLK/SCLK -> J20 SCK/GPIO27, LRCK/WS -> J20 WS/GPIO26,",
      "BCLK/SCLK -> J20 GPIO27, LRCK/WS -> J20 GPIO7, MCLK -> J20 GPIO10,")
    .replace("DOUT -> J20 SD/GPIO7, DIN -> J20 CH/GPIO10, 3V3 -> J20 3V3, GND -> J20 GND",
      "DOUT -> D6/GPIO24, 3V3 -> J20 3V3, GND -> J20 GND");
}

const CAPTURE_REQUIREMENT_ES = "ES8311: BCLK J20 GPIO27, WS J20 GPIO7, MCLK J20 GPIO10, DOUT D6/GPIO24; I²C QWIIC GPIO1/6";
const CAPTURE_REQUIREMENT_EN = "ES8311: BCLK J20 GPIO27, WS J20 GPIO7, MCLK J20 GPIO10, DOUT D6/GPIO24; I²C QWIIC GPIO1/6";

export interface MicroPythonExample {
  readonly id: string;
  readonly title: string;
  readonly titleEn: string;
  readonly file: string;
  readonly description: string;
  readonly descriptionEn: string;
  readonly requires: readonly string[];
  readonly requiresEn: readonly string[];
  readonly code: string;
}

export interface MicroPythonExamples {
  readonly board: string;
  readonly examples: readonly MicroPythonExample[];
  readonly libraries: readonly MicroPythonLibrary[];
}

export interface MicroPythonLibrary {
  readonly id: string;
  readonly file: string;
  readonly source: string;
  readonly license: string;
  readonly examples: readonly string[];
  readonly code: string;
}

/** Read the editable C5 examples from the sibling firmware checkout. */
export function collectMicroPython(root: string): MicroPythonExamples | null {
  const dir = join(root, "examples", "micropython", "pulsar-c5");
  const index = join(dir, "manifest.json");
  if (!existsSync(index)) return null;
  const manifest: unknown = JSON.parse(readFileSync(index, "utf8"));
  if (!manifest || typeof manifest !== "object" || !("board" in manifest) || typeof manifest.board !== "string"
    || !("examples" in manifest) || !Array.isArray(manifest.examples)) {
    throw new Error(`${index} is not a MicroPython example manifest`);
  }
  const seen = new Set<string>();
  const examples = manifest.examples.map((item: unknown) => {
    if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string"
      || !("title" in item) || typeof item.title !== "string"
      || !("titleEn" in item) || typeof item.titleEn !== "string"
      || !("file" in item) || typeof item.file !== "string"
      || !("description" in item) || typeof item.description !== "string"
      || !("descriptionEn" in item) || typeof item.descriptionEn !== "string"
      || !("requires" in item) || !Array.isArray(item.requires)
      || !item.requires.every((value: unknown) => typeof value === "string")
      || !("requiresEn" in item) || !Array.isArray(item.requiresEn)
      || !item.requiresEn.every((value: unknown) => typeof value === "string")
      || !/^[a-z][a-z0-9-]*$/.test(item.id) || !/^[a-z][a-z0-9_]*\.py$/.test(item.file)
      || seen.has(item.id)) {
      throw new Error(`${index} has an invalid or duplicate example`);
    }
    seen.add(item.id);
    const example = {
      id: item.id,
      title: item.title,
      titleEn: item.titleEn,
      file: item.file,
      description: item.description,
      descriptionEn: item.descriptionEn,
      requires: item.requires as string[],
      requiresEn: item.requiresEn as string[],
      code: readFileSync(join(dir, item.file), "utf8"),
    };
    if (example.id === "uart-loopback") {
      return {
        ...example,
        description: "Envía texto por UART1 con un puente entre A2/GPIO4 y A3/GPIO5.",
        descriptionEn: "Send text over UART1 with a jumper between A2/GPIO4 and A3/GPIO5.",
        requires: ["Un puente entre A2 (GPIO4) y A3 (GPIO5)"],
        requiresEn: ["A jumper between A2 (GPIO4) and A3 (GPIO5)"],
        code: readFileSync(join(OWN_SCRIPTS, "uart_loopback.py"), "utf8"),
      };
    }
    if (CODEC_CAPTURE_IDS.has(example.id)) {
      return {
        ...example,
        code: codecCaptureCode(example.code),
        requires: example.requires.map((requirement) => requirement.startsWith("ES8311 en J20:") ? CAPTURE_REQUIREMENT_ES : requirement),
        requiresEn: example.requiresEn.map((requirement) => requirement.startsWith("ES8311 on J20:") ? CAPTURE_REQUIREMENT_EN : requirement),
      };
    }
    if (example.id === "es8311-melody" || example.id === "es8311-sine-wave") {
      // Keep the playback script verbatim and align only the manifest's outdated requirements.
      return {
        ...example,
        requires: example.requires.map((requirement) => requirement.startsWith("ES8311 en J20:")
          ? "ES8311 en J20: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C en QWIIC GPIO1/6"
          : requirement),
        requiresEn: example.requiresEn.map((requirement) => requirement.startsWith("ES8311 on J20:")
          ? "ES8311 on J20: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C on QWIIC GPIO1/6"
          : requirement),
      };
    }
    return example;
  });
  // The browser tone controller is a local companion to the firmware checkout's codec driver.
  const hasCodecDriver = "libraries" in manifest && Array.isArray(manifest.libraries)
    && manifest.libraries.some((item: unknown) => item && typeof item === "object" && "id" in item && item.id === "es8311");
  if (hasCodecDriver && seen.has("es8311-melody") && !seen.has(TONE_LAB_ID)) {
    examples.push({
      id: TONE_LAB_ID,
      title: "Audio · ES8311 · tonos interactivos",
      titleEn: "Audio · ES8311 · interactive tones",
      file: "es8311_tone_lab.py",
      description: "Toca notas desde el navegador y ajusta frecuencia, forma de onda y volumen en el altavoz del códec.",
      descriptionEn: "Play notes from the browser and adjust frequency, waveform and volume on the codec speaker.",
      requires: ["Firmware Pulsar C5 con machine.I2S", "es8311.py guardado en la placa",
        "ES8311 para reproducción: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C QWIIC GPIO1/6"],
      requiresEn: ["Pulsar C5 firmware with machine.I2S", "es8311.py saved on the board",
        "ES8311 playback: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C QWIIC GPIO1/6"],
      code: readFileSync(join(OWN_SCRIPTS, "es8311_tone_lab.py"), "utf8"),
    });
    seen.add(TONE_LAB_ID);
  }
  if (hasCodecDriver && seen.has("es8311-melody") && !seen.has(PLAYER_ID)) {
    examples.push({
      id: PLAYER_ID,
      title: "Audio · ES8311 · reproducir WAV o MP3 desde la web",
      titleEn: "Audio · ES8311 · play WAV or MP3 from the browser",
      file: "es8311_play_serial.py",
      description: "Elige un archivo de audio en el navegador; se convierte y se envía por USB para sonar en el altavoz del códec.",
      descriptionEn: "Choose an audio file in the browser; it is converted and streamed over USB to play on the codec speaker.",
      requires: ["Firmware Pulsar C5 con machine.I2S", "es8311.py guardado en la placa",
        "ES8311 para reproducción: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C QWIIC GPIO1/6"],
      requiresEn: ["Pulsar C5 firmware with machine.I2S", "es8311.py saved on the board",
        "ES8311 playback: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C QWIIC GPIO1/6"],
      code: readFileSync(join(OWN_SCRIPTS, "es8311_play_serial.py"), "utf8"),
    });
    seen.add(PLAYER_ID);
  }
  if (hasCodecDriver && seen.has("es8311-mic-capture")) {
    const source = readFileSync(join(OWN_SCRIPTS, "es8311_sound_labs.py"), "utf8");
    for (const lab of SOUND_LAB_MODES) {
      const id = `es8311-sound-${lab.mode.replaceAll("_", "-")}`;
      if (seen.has(id)) continue;
      examples.push({
        id,
        title: `Audio · ES8311 · ${lab.title}`,
        titleEn: `Audio · ES8311 · ${lab.titleEn}`,
        file: `es8311_sound_${lab.mode}.py`,
        description: lab.description,
        descriptionEn: lab.descriptionEn,
        requires: ["Firmware con machine.I2S", "es8311.py guardado en la placa", CAPTURE_REQUIREMENT_ES,
          ...(["recorder", "voice_fx"].includes(lab.mode) ? ["DIN en J20/GPIO26 y altavoz conectado"] : [])],
        requiresEn: ["Firmware with machine.I2S", "es8311.py saved on the board", CAPTURE_REQUIREMENT_EN,
          ...(["recorder", "voice_fx"].includes(lab.mode) ? ["DIN on J20/GPIO26 and speaker connected"] : [])],
        code: source.replace(/^MODE = "loudness"$/m, `MODE = "${lab.mode}"`),
      });
      seen.add(id);
    }
  }
  // BMI270 examples and their driver come from the firmware manifest, like the other sensors.
  const seenLibraries = new Set<string>();
  const libraries = ("libraries" in manifest && Array.isArray(manifest.libraries) ? manifest.libraries : []).map((item: unknown) => {
    if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string"
      || !("file" in item) || typeof item.file !== "string"
      || !("source" in item) || typeof item.source !== "string"
      || !("license" in item) || typeof item.license !== "string"
      || !("examples" in item) || !Array.isArray(item.examples)
      || !item.examples.length || !item.examples.every((id: unknown) => typeof id === "string" && seen.has(id))
      || !/^[a-z][a-z0-9-]*$/.test(item.id)
      || !/^[a-z][a-z0-9_]*\.py$/.test(item.file)
      || !/^https:\/\/github\.com\/.+/.test(item.source)
      // MIT by default; two documented exceptions: st7735 has no declared licence, es8311 is GPL-3.0 like its Arduino original.
      || (item.license !== "MIT"
        && !(item.id === "st7735" && item.license === "Not specified")
        && !(item.id === "es8311" && item.license === "GPL-3.0"))
      || seenLibraries.has(item.id)
      || !existsSync(join(dir, "libraries", item.file))) {
      throw new Error(`${index} has an invalid MicroPython library`);
    }
    seenLibraries.add(item.id);
    return {
      id: item.id,
      file: item.file,
      source: item.source,
      license: item.license,
      // Local codec sound labs and browser playback scripts also import this driver.
      examples: item.id === "es8311"
        ? [...new Set([...(item.examples as string[]), ...[TONE_LAB_ID, PLAYER_ID,
          ...SOUND_LAB_MODES.map((lab) => `es8311-sound-${lab.mode.replaceAll("_", "-")}`)].filter((id) => seen.has(id))])]
        : item.examples as string[],
      code: readFileSync(join(dir, "libraries", item.file), "utf8"),
    };
  });
  const st7735Examples = ["st7735-display", "st7735-showcase", "wifi-w2-display"].filter((id) => seen.has(id));
  const st7735Path = join(dir, "libraries", "st7735.py");
  if (st7735Examples.length && existsSync(st7735Path)) {
    // The firmware checkout has this driver even when its license is not listed
    // in the manifest. Do not describe the upstream boochow driver as MIT.
    const existing = libraries.findIndex((library) => library.id === "st7735");
    if (existing >= 0) {
      const library = libraries[existing];
      if (library) {
        libraries[existing] = {
          ...library,
          examples: [...new Set([...library.examples, ...st7735Examples])],
        };
      }
    } else {
      libraries.push({
        id: "st7735",
        file: "st7735.py",
        source: "https://github.com/boochow/MicroPython-ST7735",
        license: "Not specified",
        examples: st7735Examples,
        code: readFileSync(st7735Path, "utf8"),
      });
    }
  }
  return { board: manifest.board, examples, libraries };
}
