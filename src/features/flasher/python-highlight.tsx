import type { ReactNode } from "react";
import styles from "./MicroPythonEditor.module.css";

const KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
  "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while",
  "with", "yield",
]);
const CONSTANTS = new Set(["True", "False", "None"]);
const BUILTINS = new Set(["print", "range", "len", "int", "str", "float", "open", "list", "dict", "set", "tuple", "enumerate", "bytes"]);
const TOKENS = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?|#[^\n]*|@[A-Za-z_][\w.]*|\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?)\b|\b[A-Za-z_]\w*\b)/g;

/** Decorative colouring only. The textarea remains the single editable source of truth. */
export function highlightPython(source: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of source.matchAll(TOKENS)) {
    const value = match[0];
    const start = match.index;
    if (start > last) parts.push(source.slice(last, start));
    let className = "";
    if (value.startsWith("#")) className = styles.comment ?? "";
    else if (value.startsWith("\"") || value.startsWith("'")) className = styles.string ?? "";
    else if (value.startsWith("@")) className = styles.decorator ?? "";
    else if (/^\d/.test(value)) className = styles.number ?? "";
    else if (KEYWORDS.has(value)) className = styles.keyword ?? "";
    else if (CONSTANTS.has(value)) className = styles.constant ?? "";
    else if (BUILTINS.has(value)) className = styles.builtin ?? "";
    parts.push(className ? <span className={className} key={start}>{value}</span> : value);
    last = start + value.length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return parts;
}
