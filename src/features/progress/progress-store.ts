import type { Ticks } from "@/domain/progress";
import { createPersistentStore, useStore } from "@/lib/storage";

// Your progress lives in this browser only (like the original guide): ticked steps, the lesson
// you were on, and the variant you picked per lesson. Keys match the single-file guide.
const ticks = createPersistentStore<Ticks>("esp-ticks", {});
const lastLesson = createPersistentStore<string | null>("esp-lesson", null);
const variants = createPersistentStore<Readonly<Record<string, string>>>("esp-variants", {});
export type CodePlatform = "arduino" | "micropython";
export const isCodePlatform = (value: string | null): value is CodePlatform =>
  value === "arduino" || value === "micropython";
/** The platform a new visitor starts on, until they pick one. */
export const DEFAULT_CODE_PLATFORM: CodePlatform = "micropython";
const lastOpened = lastLesson.get();
const previousPlatform = (lastOpened ? variants.get()[lastOpened] : undefined)
  ?? variants.get()["00"] ?? variants.get()["01"] ?? variants.get()["02"] ?? DEFAULT_CODE_PLATFORM;
const codePlatform = createPersistentStore<string>("esp-code-platform", isCodePlatform(previousPlatform) ? previousPlatform : DEFAULT_CODE_PLATFORM);

export const progress = {
  ticks,
  lastLesson,
  variants,
  codePlatform,
  setTick(key: string, done: boolean) {
    ticks.set((prev) => ({ ...prev, [key]: done }));
  },
  setVariant(lessonId: string, key: string) {
    variants.set((prev) => ({ ...prev, [lessonId]: key }));
  },
  setCodePlatform(key: CodePlatform) {
    codePlatform.set(key);
  },
};

export const useTicks = () => useStore(ticks);
export const useVariants = () => useStore(variants);
export const useCodePlatform = (): CodePlatform => {
  const value = useStore(codePlatform);
  return isCodePlatform(value) ? value : DEFAULT_CODE_PLATFORM;
};
