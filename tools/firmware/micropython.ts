import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
    return {
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
  });
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
      || item.license !== "MIT"
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
  return { board: manifest.board, examples, libraries };
}
