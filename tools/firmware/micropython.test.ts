import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectMicroPython } from "./micropython";

describe("collectMicroPython BMI270", () => {
  it("reads the motion, cube and driver from the firmware checkout", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-bmi270-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "libraries"));
      writeFileSync(join(dir, "bmi270_id.py"), "print('ID 0x24')\n");
      writeFileSync(join(dir, "bmi270_motion.py"), "from bmi270 import BMI270\nprint('firmware motion')\n");
      writeFileSync(join(dir, "bmi270_cube.py"), "print('firmware cube')\n");
      writeFileSync(join(dir, "libraries", "bmi270.py"), "class BMI270:\n    pass\n");
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({
        board: "UNIT Pulsar ESP32-C5", examples: [
          { id: "imu-bmi270", title: "BMI270 ID", titleEn: "BMI270 ID", file: "bmi270_id.py",
            description: "Chip ID", descriptionEn: "Chip ID", requires: [], requiresEn: [] },
          { id: "imu-bmi270-motion", title: "Motion", titleEn: "Motion", file: "bmi270_motion.py",
            description: "Motion", descriptionEn: "Motion", requires: [], requiresEn: [] },
          { id: "imu-bmi270-cube", title: "Cube", titleEn: "Cube", file: "bmi270_cube.py",
            description: "Cube", descriptionEn: "Cube", requires: [], requiresEn: [] },
        ],
        libraries: [{ id: "bmi270", file: "bmi270.py", source: "https://github.com/example/bmi270.py",
          license: "MIT", examples: ["imu-bmi270-motion", "imu-bmi270-cube"] }],
      }));

      const bundled = collectMicroPython(root);
      const motion = bundled?.examples.find((example) => example.id === "imu-bmi270-motion");
      const driver = bundled?.libraries.find((library) => library.id === "bmi270");
      expect(motion?.file).toBe("bmi270_motion.py");
      expect(motion?.code).toBe("from bmi270 import BMI270\nprint('firmware motion')\n");
      expect(driver?.file).toBe("bmi270.py");
      expect(driver?.examples).toContain("imu-bmi270-motion");
      const cube = bundled?.examples.find((example) => example.id === "imu-bmi270-cube");
      expect(cube?.code).toBe("print('firmware cube')\n");
      expect(driver?.examples).toContain("imu-bmi270-cube");
      expect(driver?.code).toBe("class BMI270:\n    pass\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("collectMicroPython ST7735", () => {
  it("bundles the display scripts and links the ST7735 driver to W2", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-st7735-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "libraries"));
      writeFileSync(join(dir, "st7735_display.py"), "from st7735 import TFT\nprint('firmware display')\n");
      writeFileSync(join(dir, "st7735_showcase.py"), "from st7735 import TFT, TFTColor\nprint('firmware showcase')\n");
      writeFileSync(join(dir, "wifi_w2_display.py"), "import st7735\nprint('W2 signal display')\n");
      writeFileSync(join(dir, "libraries", "st7735.py"), "def TFTColor(r, g, b): return 0\nclass TFT: pass\n");
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({
        board: "UNIT Pulsar ESP32-C5",
        examples: [
          {
            id: "st7735-display", title: "ST7735", titleEn: "ST7735", file: "st7735_display.py",
            description: "TFT", descriptionEn: "TFT", requires: [], requiresEn: [],
          },
          {
            id: "st7735-showcase", title: "Showcase", titleEn: "Showcase", file: "st7735_showcase.py",
            description: "Scenes", descriptionEn: "Scenes", requires: [], requiresEn: [],
          },
          {
            id: "wifi-w2-display", title: "W2 TFT", titleEn: "W2 TFT", file: "wifi_w2_display.py",
            description: "Signal", descriptionEn: "Signal", requires: [], requiresEn: [],
          },
        ],
        libraries: [],
      }));

      const bundled = collectMicroPython(root);
      const display = bundled?.examples.find((example) => example.id === "st7735-display");
      const showcase = bundled?.examples.find((example) => example.id === "st7735-showcase");
      const w2 = bundled?.examples.find((example) => example.id === "wifi-w2-display");
      const driver = bundled?.libraries.find((library) => library.id === "st7735");
      expect(display?.code).toContain("print('firmware display')");
      expect(showcase?.code).toContain("print('firmware showcase')");
      expect(w2?.code).toContain("print('W2 signal display')");
      expect(driver?.examples).toEqual(["st7735-display", "st7735-showcase", "wifi-w2-display"]);
      expect(driver?.code).toContain("def TFTColor(");
      expect(driver?.license).toBe("Not specified");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("collectMicroPython ES8311", () => {
  const manifest = (license: string) => JSON.stringify({
    board: "UNIT Pulsar ESP32-C5",
    examples: [{ id: "es8311-mic-usb-audio", title: "Codec", titleEn: "Codec", file: "es8311_mic_usb_audio.py",
      description: "Codec", descriptionEn: "Codec", requires: [], requiresEn: [] }],
    libraries: [{ id: "es8311", file: "es8311.py", source: "https://github.com/example/es8311.py",
      license, examples: ["es8311-mic-usb-audio"] }],
  });

  function collect(license: string) {
    const root = mkdtempSync(join(tmpdir(), "c5-es8311-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(join(dir, "libraries"), { recursive: true });
      writeFileSync(join(dir, "es8311_mic_usb_audio.py"), "import es8311\n");
      writeFileSync(join(dir, "libraries", "es8311.py"), "class ES8311Audio: pass\n");
      writeFileSync(join(dir, "manifest.json"), manifest(license));
      return collectMicroPython(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("bundles the GPL-3.0 codec driver with its licence", () => {
    expect(collect("GPL-3.0")?.libraries[0]?.license).toBe("GPL-3.0");
  });

  it("still rejects other non-MIT licences for the codec driver", () => {
    expect(() => collect("Proprietary")).toThrow("invalid MicroPython library");
  });

  it("routes every codec capture example to D6/GPIO24 with the playback clocks", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-es8311-capture-pins-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    const captures = ["capture", "diagnose", "usb_audio", "serial_pcm"];
    try {
      mkdirSync(dir, { recursive: true });
      const examples = captures.map((kind) => {
        const file = `es8311_mic_${kind}.py`;
        writeFileSync(join(dir, file), [
          "BCLK_PIN = 27       # J20 SCK",
          "WS_PIN = 26        # J20 WS",
          "DOUT_PIN = 7       # J20 SD",
          "MCLK_PIN = -1      # no MCLK wire",
          "print(DOUT_PIN)",
          "",
        ].join("\n"));
        return {
          id: `es8311-mic-${kind.replaceAll("_", "-")}`,
          title: kind, titleEn: kind, file, description: kind, descriptionEn: kind,
          requires: ["ES8311 en J20: BCLK GPIO27, WS GPIO26, DOUT GPIO7"],
          requiresEn: ["ES8311 on J20: BCLK GPIO27, WS GPIO26, DOUT GPIO7"],
        };
      });
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({ board: "UNIT Pulsar ESP32-C5", examples }));

      const bundled = collectMicroPython(root);
      expect(bundled?.examples).toHaveLength(4);
      for (const example of bundled?.examples ?? []) {
        expect(example.code).toMatch(/^BCLK_PIN = 27\b/m);
        expect(example.code).toMatch(/^WS_PIN = 7\b/m);
        expect(example.code).toMatch(/^DOUT_PIN = 24\b/m);
        expect(example.code).toMatch(/^MCLK_PIN = 10\b/m);
        expect(example.code).toContain("print(DOUT_PIN)");
        expect(example.requires).toContain("ES8311: BCLK J20 GPIO27, WS J20 GPIO7, MCLK J20 GPIO10, DOUT D6/GPIO24; I²C QWIIC GPIO1/6");
        expect(example.requiresEn).toContain("ES8311: BCLK J20 GPIO27, WS J20 GPIO7, MCLK J20 GPIO10, DOUT D6/GPIO24; I²C QWIIC GPIO1/6");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("preserves the playback script's pins and corrects only its manifest wiring text", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-es8311-playback-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(dir, { recursive: true });
      const source = [
        "  J20: SCLK/BCLK -> GPIO27, LRCK/WS -> GPIO7, SDIN -> GPIO26, MCLK -> GPIO10",
        "WS_PIN = 7          # word clock",
        "DIN_PIN = 26        # speaker data",
        "MCLK_PIN = 10       # master clock",
        "",
      ].join("\n");
      writeFileSync(join(dir, "es8311_melody.py"), source);
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({
        board: "UNIT Pulsar ESP32-C5",
        examples: [{ id: "es8311-melody", title: "Melody", titleEn: "Melody", file: "es8311_melody.py",
          description: "Playback", descriptionEn: "Playback",
          requires: ["ES8311 en J20: BCLK GPIO27, WS GPIO26, DOUT GPIO7, DIN GPIO10; I²C en QWIIC GPIO1/6"],
          requiresEn: ["ES8311 on J20: BCLK GPIO27, WS GPIO26, DOUT GPIO7, DIN GPIO10; I²C on QWIIC GPIO1/6"] }],
      }));
      const playback = collectMicroPython(root)?.examples[0];
      expect(playback?.code).toBe(source);
      expect(playback?.requires).toContain("ES8311 en J20: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C en QWIIC GPIO1/6");
      expect(playback?.requiresEn).toContain("ES8311 on J20: BCLK GPIO27, WS GPIO7, DIN GPIO26, MCLK GPIO10; I²C on QWIIC GPIO1/6");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("packages six codec sound labs with separate modes and the ES8311 driver", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-es8311-sound-labs-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(join(dir, "libraries"), { recursive: true });
      writeFileSync(join(dir, "es8311_mic_capture.py"), "print('capture')\n");
      writeFileSync(join(dir, "libraries", "es8311.py"), "class ES8311Audio: pass\n");
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({
        board: "UNIT Pulsar ESP32-C5",
        examples: [{ id: "es8311-mic-capture", title: "Mic", titleEn: "Mic", file: "es8311_mic_capture.py",
          description: "Capture", descriptionEn: "Capture", requires: [], requiresEn: [] }],
        libraries: [{ id: "es8311", file: "es8311.py", source: "https://github.com/example/es8311.py",
          license: "GPL-3.0", examples: ["es8311-mic-capture"] }],
      }));
      const bundled = collectMicroPython(root);
      for (const mode of ["loudness", "clap", "recorder", "spectrum", "game", "voice_fx"]) {
        const id = `es8311-sound-${mode.replaceAll("_", "-")}`;
        const example = bundled?.examples.find((item) => item.id === id);
        expect(example?.file).toBe(`es8311_sound_${mode}.py`);
        expect(example?.code).toContain(`MODE = "${mode}"`);
        expect(example?.code).toContain("DOUT_PIN = 24");
        expect(example?.code).toContain("WS_PIN = 7");
        expect(bundled?.libraries[0]?.examples).toContain(id);
      }
      expect(bundled?.examples.find((item) => item.id === "es8311-sound-recorder")?.requires)
        .toContain("DIN en J20/GPIO26 y altavoz conectado");
      expect(bundled?.examples.find((item) => item.id === "es8311-sound-loudness")?.requires)
        .not.toContain("DIN en J20/GPIO26 y altavoz conectado");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("bundles the interactive tone script and links its codec driver", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-es8311-tones-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(join(dir, "libraries"), { recursive: true });
      writeFileSync(join(dir, "es8311_melody.py"), "print('melody')\n");
      writeFileSync(join(dir, "libraries", "es8311.py"), "class ES8311Audio: pass\n");
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({
        board: "UNIT Pulsar ESP32-C5",
        examples: [{ id: "es8311-melody", title: "Melodía", titleEn: "Melody", file: "es8311_melody.py",
          description: "Reproducción", descriptionEn: "Playback", requires: [], requiresEn: [] }],
        libraries: [{ id: "es8311", file: "es8311.py", source: "https://github.com/example/es8311.py",
          license: "GPL-3.0", examples: ["es8311-melody"] }],
      }));
      const bundled = collectMicroPython(root);
      const tones = bundled?.examples.find((example) => example.id === "es8311-tone-lab");
      expect(tones?.file).toBe("es8311_tone_lab.py");
      expect(tones?.code).toContain("WS_PIN = 7");
      expect(tones?.code).toContain("DIN_PIN = 26");
      expect(tones?.code).toContain("MCLK_PIN = 10");
      expect(tones?.code).toContain("TONE,READY");
      expect(bundled?.libraries.find((library) => library.id === "es8311")?.examples).toContain("es8311-tone-lab");
      const player = bundled?.examples.find((example) => example.id === "es8311-play-serial");
      expect(player?.file).toBe("es8311_play_serial.py");
      expect(player?.code).toContain("PLAYER,READY");
      expect(player?.code).toContain("DIN_PIN = 26");
      expect(bundled?.libraries.find((library) => library.id === "es8311")?.examples).toContain("es8311-play-serial");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("collectMicroPython UART loopback", () => {
  it("keeps the generic C5 UART0 REPL pins out of the loopback example", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-uart-loopback-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "uart_loopback.py"), "UART(1, tx=Pin(11), rx=Pin(12))\n");
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({
        board: "UNIT Pulsar ESP32-C5",
        examples: [{
          id: "uart-loopback", title: "UART", titleEn: "UART", file: "uart_loopback.py",
          description: "TX0/RX0", descriptionEn: "TX0/RX0",
          requires: ["GPIO11/GPIO12"], requiresEn: ["GPIO11/GPIO12"],
        }],
      }));

      const example = collectMicroPython(root)?.examples[0];
      expect(example?.code).toContain("tx=Pin(4), rx=Pin(5)");
      expect(example?.code).not.toContain("tx=Pin(11), rx=Pin(12)");
      expect(example?.requires).toContain("Un puente entre A2 (GPIO4) y A3 (GPIO5)");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
