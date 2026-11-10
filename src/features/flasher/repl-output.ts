// Splits raw serial/REPL output into tinted runs, Thonny-style: REPL prompts, ordinary text and
// errors (MicroPython tracebacks, ESP-IDF error logs, panics). The text itself is never changed.

export type OutputTone = "text" | "prompt" | "error";

export interface OutputSegment {
  readonly text: string;
  readonly tone: OutputTone;
}

// The friendly REPL's prompt, its continuation prompt and the "script started" marker.
const PROMPT = /^(?:>>>|\.\.\.|▶)(?: |$)/;
const TRACEBACK_START = /^Traceback \(most recent call last\):/;
// An exception line on its own, e.g. "SyntaxError: invalid syntax" or "OSError: [Errno 2] ENOENT".
const EXCEPTION_LINE = /^[A-Za-z_][\w.]*(?:Error|Exception)(?::|$)/;
// ESP-IDF logs at error level ("E (1234) tag: ..."); a leading ANSI colour code is skipped first.
const IDF_ERROR = /^E \(\d+\)/;
const PANIC = /^(?:Guru Meditation Error|abort\(\) was called)/;
const ESC = "\u001b";

/** Splits `output` into consecutive segments; joining every segment's text gives `output` back. */
export function splitReplOutput(output: string): readonly OutputSegment[] {
  const segments: OutputSegment[] = [];
  const push = (text: string, tone: OutputTone) => {
    if (!text) return;
    const last = segments.at(-1);
    if (last && last.tone === tone) segments[segments.length - 1] = { text: last.text + text, tone };
    else segments.push({ text, tone });
  };
  let inTraceback = false;

  for (const line of output.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const content = line.replace(/\r?\n$/, "").replace(/\r/g, "");
    if (inTraceback) {
      // Frames are indented; the first unindented line is the exception and closes the traceback.
      if (content !== "" && !/^\s/.test(content)) inTraceback = false;
      push(line, "error");
    } else if (TRACEBACK_START.test(content)) {
      inTraceback = true;
      push(line, "error");
    } else if (EXCEPTION_LINE.test(content) || IDF_ERROR.test(withoutColourPrefix(content)) || PANIC.test(content)) {
      push(line, "error");
    } else {
      // Only the prompt marker is tinted; what follows it (the echoed command) stays ordinary text.
      const prompt = PROMPT.exec(line)?.[0] ?? "";
      push(prompt, "prompt");
      push(line.slice(prompt.length), "text");
    }
  }
  return segments;
}

/** Drops one leading ANSI SGR sequence ("ESC[0;31m"), which ESP-IDF puts before coloured logs. */
function withoutColourPrefix(line: string): string {
  if (!line.startsWith(`${ESC}[`)) return line;
  const end = line.indexOf("m");
  return end === -1 ? line : line.slice(end + 1);
}
