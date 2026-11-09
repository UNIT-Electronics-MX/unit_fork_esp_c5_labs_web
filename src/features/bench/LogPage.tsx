import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { useLocaleInfo } from "@/i18n/use-locale";
import { CopyCommand } from "@/ui/CopyCommand";
import { Panel } from "@/ui/Panel";
import { BenchOverview } from "./BenchOverview";
import { useBrowserBenchEntries } from "./browser-log";
import { benchLogQuery, benchStatusQuery } from "./queries";
import { LOG_TYPES, type LogEntry } from "./schema";
import styles from "./LogPage.module.css";

const FILTERS = ["all", ...LOG_TYPES] as const;
type Filter = (typeof FILTERS)[number];
const isFilter = (v: string | null): v is Filter => FILTERS.includes(v as Filter);

/** Entry numbers as on the bench: two digits, in the reader's numerals. */
function useEntryNumber() {
  const { tag } = useLocaleInfo();
  const format = new Intl.NumberFormat(tag, { minimumIntegerDigits: 2, useGrouping: false });
  return (n: number) => format.format(n);
}

/** Published records and actions performed in this browser, filterable by type. */
export function LogPage() {
  const { data: publishedEntries } = useSuspenseQuery(benchLogQuery());
  const { data: status } = useSuspenseQuery(benchStatusQuery());
  const browserEntries = useBrowserBenchEntries();
  const [params, setParams] = useSearchParams();
  const { t } = useTranslation("bench");
  const raw = params.get("type");
  const filter: Filter = isFilter(raw) ? raw : "all";
  const nextNumber = publishedEntries.reduce((max, entry) => Math.max(max, entry.n), 0);
  const entries: LogEntry[] = [
    ...publishedEntries,
    ...browserEntries.map((entry, index) => ({ ...entry, n: nextNumber + index + 1 })),
  ];
  const shown = filter === "all" ? entries : entries.filter((e) => e.types.includes(filter));

  return (
    <>
      <BenchOverview />
      <section className={styles.log} aria-labelledby="log-title">
        <div className={styles.head}>
          <div>
            <h2 id="log-title">{t("log.title")}</h2>
            <p>{t("log.intro")}</p>
          </div>
          <div className={styles.filters} role="group" aria-label={t("log.filter")}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setParams((current) => {
                  const next = new URLSearchParams(current);
                  if (f === "all") next.delete("type");
                  else next.set("type", f);
                  return next;
                }, { preventScrollReset: true, replace: true })}
              >
                {t(`types.${f}`)}{" "}
                <span>
                  {f === "all" ? entries.length : entries.filter((e) => e.types.includes(f)).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {shown.length ? <Timeline entries={shown} /> : (
          <p className={styles.empty} role="status">
            {entries.length ? t("log.noMatches", { type: t(`types.${filter}`) }) : t("log.empty")}
          </p>
        )}

        <ol className={styles.entries}>
          {shown.map((e) => (
            <LogItem key={e.n} entry={e} />
          ))}
        </ol>

        <div className={styles.facts}>
          {status.facts.map((table) => (
            <Panel key={table.title} title={table.title}>
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {table.head.map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.join("|")}>
                        {row.map((cell, i) => (
                          <td key={i} data-label={table.head[i]} className={table.mono.includes(i) ? styles.mono : undefined}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note ? <p className={styles.note}>{table.note}</p> : null}
            </Panel>
          ))}
        </div>
      </section>
    </>
  );
}

const primaryType = (e: LogEntry): "flash" | "failed" | "other" =>
  e.types.includes("failed") ? "failed" : e.types.includes("flash") ? "flash" : "other";

/**
 * The whole log at a glance, oldest first: one cell per entry. Only two things stand out:
 * flashes (copper) and failures (red, also marked ✕), so it reads without a colour key.
 */
function Timeline({ entries }: { entries: readonly LogEntry[] }) {
  const { t } = useTranslation("bench");
  const { tag } = useLocaleInfo();
  const number = useEntryNumber();
  const list = new Intl.ListFormat(tag, { type: "unit" });
  const other = list.format((["install", "build", "read", "reset", "observe"] as const).map((type) => t(`types.${type}`)));
  return (
    <nav className={styles.timeline} aria-label={t("log.timeline")}>
      <ol>
        {entries.map((e) => {
          const kind = primaryType(e);
          const label = t("log.entryLabel", {
            n: number(e.n),
            types: list.format(e.types.map((type) => t(`types.${type}`))),
            title: e.title,
          });
          return (
            <li key={e.n} data-kind={kind}>
              <button
                type="button"
                onClick={() =>
                  document.getElementById(`entry-${e.n}`)?.scrollIntoView({ block: "start" })
                }
                title={label}
                aria-label={label}
              >
                {kind === "failed" ? "✕" : ""}
              </button>
            </li>
          );
        })}
      </ol>
      <p className={styles.timelineKey}>
        <span data-kind="flash" aria-hidden="true" /> {t("types.flash")}
        <span data-kind="failed" aria-hidden="true" /> {t("types.failed")}
        <span data-kind="other" aria-hidden="true" /> {other}
      </p>
    </nav>
  );
}

function LogItem({ entry: e }: { entry: LogEntry }) {
  const flash = e.types.includes("flash");
  const { t } = useTranslation("bench");
  const number = useEntryNumber();
  return (
    <li id={`entry-${e.n}`} className={flash ? styles.isFlash : undefined}>
      <span className={styles.num}>{number(e.n)}</span>
      <div className={styles.body}>
        <div className={styles.top}>
          {e.types.map((type) => (
            <span key={type} className={styles.pill} data-type={type}>
              {t(`types.${type}`)}
            </span>
          ))}
          <span className={styles.title}>{e.title}</span>
          <span className={styles.where}>{e.where}</span>
        </div>
        <p className={styles.why}>{e.why}</p>
        {e.cmd ? <CopyCommand command={e.cmd} compact /> : null}
        {e.out ? (
          <details className={styles.out} open={flash}>
            <summary>{t("log.response")}</summary>
            <pre>{e.out}</pre>
          </details>
        ) : null}
        <p className={styles.result}>
          <b>{t("log.result")}</b>
          {e.result}
        </p>
      </div>
    </li>
  );
}
