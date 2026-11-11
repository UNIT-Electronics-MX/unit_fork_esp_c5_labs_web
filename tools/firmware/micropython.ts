import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Local MicroPython scripts and drivers used to supplement or correct the firmware checkout. */
const OWN_SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "micropython");

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
    return example;
  });
  // Bundle the D1 motion follow-up and its driver alongside the ID check supplied by the firmware checkout.
  const motionExampleId = "imu-bmi270-motion";
  if (seen.has("imu-bmi270") && !seen.has(motionExampleId)) {
    seen.add(motionExampleId);
    examples.push({
      id: motionExampleId,
      title: "QWIIC · movimiento BMI270",
      titleEn: "QWIIC · BMI270 motion",
      file: "bmi270_motion.py",
      description: "Lee aceleración y velocidad angular del BMI270 por QWIIC.",
      descriptionEn: "Read BMI270 acceleration and angular velocity over QWIIC.",
      requires: ["BMI270 en QWIIC", "bmi270.py guardado en la placa"],
      requiresEn: ["BMI270 on QWIIC", "bmi270.py saved on the board"],
      code: readFileSync(join(OWN_SCRIPTS, "bmi270_motion.py"), "utf8"),
    });
  }
  // ST7735 display and showcase scripts come directly from the firmware manifest.
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
      || (item.license !== "MIT" && !(item.id === "st7735" && item.license === "Not specified"))
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
      examples: item.examples as string[],
      code: readFileSync(join(dir, "libraries", item.file), "utf8"),
    };
  });
  if (seen.has(motionExampleId)) {
    const bmi270Examples = ["imu-bmi270", motionExampleId];
    const existing = libraries.findIndex((library) => library.id === "bmi270");
    if (existing >= 0) {
      libraries[existing] = {
        ...libraries[existing],
        examples: [...new Set([...libraries[existing].examples, ...bmi270Examples])],
      };
    } else {
      libraries.push({
        id: "bmi270",
        file: "bmi270.py",
        source: "https://github.com/UNIT-Electronics-MX/unit_devlab_micropython_libraries/blob/main/software/bmi270/bmi270.py",
        license: "MIT",
        examples: bmi270Examples,
        code: readFileSync(join(OWN_SCRIPTS, "bmi270.py"), "utf8"),
      });
    }
  }
  const st7735Examples = ["st7735-display", "st7735-showcase"].filter((id) => seen.has(id));
  const st7735Path = join(dir, "libraries", "st7735.py");
  if (st7735Examples.length && existsSync(st7735Path)) {
    // The firmware checkout has this driver even when its license is not listed
    // in the manifest. Do not describe the upstream boochow driver as MIT.
    const existing = libraries.findIndex((library) => library.id === "st7735");
    if (existing >= 0) {
      libraries[existing] = {
        ...libraries[existing],
        examples: [...new Set([...libraries[existing].examples, ...st7735Examples])],
      };
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
