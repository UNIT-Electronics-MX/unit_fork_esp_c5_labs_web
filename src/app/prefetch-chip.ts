import { i18n } from "@/i18n/i18n";

// The C5 reference stays out of the first-page bundle until its link is focused or hovered.
let started = false;

export function prefetchChip(): void {
  if (started) return;
  started = true;
  void import("./routes/c5-datasheet-route");
  void i18n.loadNamespaces("c5");
}
