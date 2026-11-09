import { useSyncExternalStore } from "react";
import * as z from "zod/mini";
import { createPersistentStore } from "@/lib/storage";
import { LOG_TYPES, type LogEntry, type LogType } from "./schema";

const KEY = "pulsar-c5-browser-bench-log";
const MAX_ENTRIES = 100;

const BrowserEntrySchema = z.object({
  id: z.string(),
  types: z.array(z.enum(LOG_TYPES)),
  title: z.string(),
  where: z.string(),
  why: z.string(),
  result: z.string(),
});
type BrowserEntry = z.infer<typeof BrowserEntrySchema>;
type NewBrowserEntry = Pick<LogEntry, "title" | "where" | "why" | "result"> & { types: readonly LogType[] };

const raw = createPersistentStore<unknown>(KEY, []);
let lastRaw: unknown;
let lastEntries: readonly BrowserEntry[] = [];

function read(): readonly BrowserEntry[] {
  const value = raw.get();
  if (value !== lastRaw) {
    lastRaw = value;
    const parsed = z.array(BrowserEntrySchema).safeParse(value);
    lastEntries = parsed.success ? parsed.data.slice(-MAX_ENTRIES) : [];
  }
  return lastEntries;
}

/** Browser actions only. Commands, script text and serial output are never stored here. */
export function recordBrowserBenchAction(action: NewBrowserEntry): void {
  raw.set(() => [...read(), {
    ...action,
    types: [...action.types],
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  }].slice(-MAX_ENTRIES));
}

export const useBrowserBenchEntries = (): readonly BrowserEntry[] =>
  useSyncExternalStore(raw.subscribe, read, read);
