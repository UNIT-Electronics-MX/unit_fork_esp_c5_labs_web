import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectMicroPython } from "./micropython";

describe("collectMicroPython BMI270", () => {
  it("bundles the motion example and its installable driver with the D1 ID check", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-bmi270-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "bmi270_id.py"), "print('ID 0x24')\n");
      writeFileSync(join(dir, "manifest.json"), JSON.stringify({
        board: "UNIT Pulsar ESP32-C5",
        examples: [{
          id: "imu-bmi270", title: "BMI270 ID", titleEn: "BMI270 ID", file: "bmi270_id.py",
          description: "Chip ID", descriptionEn: "Chip ID", requires: [], requiresEn: [],
        }],
        libraries: [],
      }));

      const bundled = collectMicroPython(root);
      const motion = bundled?.examples.find((example) => example.id === "imu-bmi270-motion");
      const driver = bundled?.libraries.find((library) => library.id === "bmi270");
      expect(motion?.file).toBe("bmi270_motion.py");
      expect(motion?.code).toContain("from bmi270 import BMI270");
      expect(driver?.file).toBe("bmi270.py");
      expect(driver?.examples).toContain("imu-bmi270-motion");
      expect(driver?.code).toContain("class BMI270:");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("collectMicroPython ST7735", () => {
  it("uses both scripts and the driver from the firmware checkout without replacing their code", () => {
    const root = mkdtempSync(join(tmpdir(), "c5-st7735-"));
    const dir = join(root, "examples", "micropython", "pulsar-c5");
    try {
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "libraries"));
      writeFileSync(join(dir, "st7735_display.py"), "from st7735 import TFT\nprint('firmware display')\n");
      writeFileSync(join(dir, "st7735_showcase.py"), "from st7735 import TFT, TFTColor\nprint('firmware showcase')\n");
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
        ],
        libraries: [],
      }));

      const bundled = collectMicroPython(root);
      const display = bundled?.examples.find((example) => example.id === "st7735-display");
      const showcase = bundled?.examples.find((example) => example.id === "st7735-showcase");
      const driver = bundled?.libraries.find((library) => library.id === "st7735");
      expect(display?.code).toContain("print('firmware display')");
      expect(showcase?.code).toContain("print('firmware showcase')");
      expect(driver?.examples).toEqual(["st7735-display", "st7735-showcase"]);
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
