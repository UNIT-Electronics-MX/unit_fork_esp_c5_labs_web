import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { highlightPython } from "./python-highlight";

describe("MicroPython editor highlighting", () => {
  it("shows the exact editable source, including comments, strings and newlines", () => {
    const source = "from machine import Pin\nled = Pin(9)  # GPIO9\nprint('señal # lista')\n";
    function plainText(node: ReactNode): string {
      if (typeof node === "string" || typeof node === "number") return String(node);
      if (Array.isArray(node)) return node.map(plainText).join("");
      if (isValidElement<{ children?: ReactNode }>(node)) return plainText(node.props.children);
      return "";
    }
    expect(plainText(highlightPython(source))).toBe(source);
  });
});
