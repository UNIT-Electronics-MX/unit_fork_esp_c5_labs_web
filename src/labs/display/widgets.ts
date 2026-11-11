import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Every widget the display lessons reference, each in its own chunk.
export const displayWidgets = {
  wiringExamples: lazyWidget(() => import("./wiring/WiringExamples"), "WiringExamples"),
  st7735Wiring: lazyWidget(() => import("./wiring/St7735Wiring"), "St7735Wiring"),
} as const satisfies WidgetMap;
