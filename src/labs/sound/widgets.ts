import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Sound lessons use the J20 microphone and the ES8311 codec wiring diagrams.
export const soundWidgets = {
  soundMicWiring: lazyWidget(() => import("./panels/wiring/SoundWiring"), "SoundMicWiring"),
  soundCodecWiring: lazyWidget(() => import("./panels/wiring/SoundWiring"), "SoundCodecWiring"),
} as const satisfies WidgetMap;
