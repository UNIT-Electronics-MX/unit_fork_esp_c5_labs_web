import { describe, expect, it } from "vitest";
import { splitReplOutput } from "./repl-output";

const tones = (output: string) => splitReplOutput(output).map((s) => [s.text, s.tone]);

describe("splitReplOutput", () => {
  it("tints prompts, ordinary text and a whole traceback, keeping the text intact", () => {
    const output = ">>> x\r\nTraceback (most recent call last):\r\n  File \"<stdin>\", line 1, in <module>\r\nNameError: name 'x' isn't defined\r\n>>> ";
    expect(tones(output)).toEqual([
      [">>> ", "prompt"],
      ["x\r\n", "text"],
      ["Traceback (most recent call last):\r\n  File \"<stdin>\", line 1, in <module>\r\nNameError: name 'x' isn't defined\r\n", "error"],
      [">>> ", "prompt"],
    ]);
    expect(splitReplOutput(output).map((s) => s.text).join("")).toBe(output);
  });

  it("tints continuation prompts, a bare prompt and the run marker", () => {
    expect(tones("... pass\n>>>")).toEqual([["... ", "prompt"], ["pass\n", "text"], [">>>", "prompt"]]);
    expect(tones("▶ Running\n")).toEqual([["▶ ", "prompt"], ["Running\n", "text"]]);
  });

  it("marks standalone exceptions, ESP-IDF error logs and panics", () => {
    const output = "ok\nSyntaxError: invalid syntax\nI (12) boot: fine\n\x1b[0;31mE (34) wifi: failed\x1b[0m\nGuru Meditation Error: Core 0 panic'ed\n";
    expect(tones(output)).toEqual([
      ["ok\n", "text"],
      ["SyntaxError: invalid syntax\n", "error"],
      ["I (12) boot: fine\n", "text"],
      ["\x1b[0;31mE (34) wifi: failed\x1b[0m\nGuru Meditation Error: Core 0 panic'ed\n", "error"],
    ]);
  });

  it("does not flag ordinary text that mentions an error or arrows", () => {
    expect(tones("no Error here\nprint('Error')\n>>>x\n")).toEqual([["no Error here\nprint('Error')\n>>>x\n", "text"]]);
  });

  it("returns nothing for empty output", () => {
    expect(splitReplOutput("")).toEqual([]);
  });
});
