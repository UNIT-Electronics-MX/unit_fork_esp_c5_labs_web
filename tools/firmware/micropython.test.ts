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
