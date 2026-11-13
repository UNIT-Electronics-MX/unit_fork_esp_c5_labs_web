import { describe, expect, it } from "vitest";
import { matchesQuery } from "./search";

describe("matchesQuery", () => {
  it("matches everything on an empty query", () => {
    expect(matchesQuery("  ", ["anything"])).toBe(true);
  });

  it("ignores case, accents and separators", () => {
    expect(matchesQuery("ecran", ["Écran TFT 1,9″"])).toBe(true);
    expect(matchesQuery("es 8311", ["ES8311 audio codec"])).toBe(true);
    expect(matchesQuery("ics-43434", ["ICS43434 digital mic"])).toBe(true);
  });

  it("needs every word to appear in one of the texts", () => {
    expect(matchesQuery("mic i2s", ["ICS-43434 mic", "i2s"])).toBe(true);
    expect(matchesQuery("mic speaker", ["ICS-43434 mic"])).toBe(false);
  });
});
