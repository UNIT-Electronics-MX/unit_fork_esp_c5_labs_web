import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { trackLessonsQuery } from "@/content/queries";
import { trackOfLesson } from "@/content/tracks";
import { isActive, resolveLesson } from "@/domain/lesson";
import type { PinSide } from "@/domain/lesson";
import { isGpio, PULSAR_HEADER, pulsarPadClass, pulsarSide, pulsarSilk, pulsarUsage } from "@/domain/pulsar";
import { useLocale } from "@/i18n/use-locale";
import { BoardPinout } from "./BoardPinout";
import { PAD_COLOUR } from "./pad-classes";
import { padsBySide } from "./pad-directory";
import { PadDetail } from "./PadDetail";
import { PadLegend } from "./PadLegend";
import { PULSAR_SOURCE } from "./pulsar-assets";
import styles from "./PinoutExplorer.module.css";

export function PinoutExplorer({ lessonId, variant, initialPin }: { lessonId: string | null; variant: string | null; initialPin: string | null }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const track = lessonId ? trackOfLesson(lessonId) : undefined;
  const { data: lessons } = useQuery({ ...trackLessonsQuery(track ?? "intro", locale), enabled: Boolean(track) });
  const base = lessons?.find((entry) => entry.id === lessonId);
  const lesson = base && isActive(base) ? resolveLesson(base, variant ?? undefined) : null;
  const usage = pulsarUsage(lesson?.pins ?? []);
  const pinNumber = Number(initialPin);
  const initialIndex =
    initialPin && Number.isInteger(pinNumber) && pinNumber >= 1 && pinNumber <= PULSAR_HEADER.length ? pinNumber - 1 : null;
  const [selected, setSelected] = useState<number | null>(initialIndex);
  // The table shows one edge of the board at a time; picking a pad elsewhere turns to its edge.
  const [side, setSide] = useState<PinSide>(initialIndex === null ? "L" : pulsarSide(initialIndex));
  const selectPad = (index: number) => {
    setSelected(index);
    setSide(pulsarSide(index));
  };
  const [hovered, setHovered] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const active = hovered ?? selected;
  const uses = active === null ? [] : usage.get(active) ?? [];
  const needle = search.trim().toLocaleLowerCase(locale);
  const visible = PULSAR_HEADER.map((position, index) => ({ position, index })).filter(({ position, index }) =>
    !needle || [
      String(index + 1),
      position.label,
      isGpio(position.pin) ? `GPIO${position.pin}` : position.pin,
      t(`board.pulsar.use.${position.use}`),
    ].some((value) => value.toLocaleLowerCase(locale).includes(needle)),
  );
  // A search looks along both edges; otherwise only the chosen edge is listed.
  const groups = padsBySide(visible.map(({ index }) => index)).filter((group) => needle || group.side === side);
  const lessonHref = lesson ? `/lessons/${lesson.id}${lesson.variantKey ? `?variant=${encodeURIComponent(lesson.variantKey)}` : ""}` : null;

  return (
    <div className={styles.page}>
      <title>{t("board.explorer.pageTitle")}</title>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t("board.explorer.eyebrow")}</p>
          <h1>{t("board.explorer.title")}</h1>
          <p>{t("board.explorer.intro")}</p>
        </div>
        {lessonHref ? <Link to={lessonHref}>{t("board.explorer.back", { id: lesson?.id })}</Link> : null}
      </header>

      {lesson ? (
        <section className={styles.lesson} aria-label={t("board.explorer.lessonPins")}>
          <div>
            <strong>{t("board.explorer.lessonTitle", { id: lesson.id, title: lesson.title })}</strong>
            <span>{t("board.explorer.lessonHint")}</span>
          </div>
          <div className={styles.lessonPins}>
            {[...usage].map(([index, roles]) => (
              <button type="button" key={index} aria-pressed={active === index} onClick={() => selectPad(index)}>
                {pulsarSilk(PULSAR_HEADER[index]!)} · {roles.map((role) => role.role).join(" / ")}
              </button>
            ))}
            {!usage.size ? <span>{t("board.explorer.noLessonPins")}</span> : null}
          </div>
        </section>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.diagram} aria-label={t("board.explorer.diagram")}>
          <BoardPinout
            pins={lesson?.pins ?? []}
            usb={Boolean(lesson?.usb)}
            boot={Boolean(lesson?.boot)}
            selectedPosition={active}
            onSelectPosition={selectPad}
            onHoverPosition={setHovered}
            detailed
          />
          <p className={styles.help}>{t("board.explorer.help")}</p>
        </section>

        <div className={styles.side}>
          <section className={styles.detail}>
            <p className={styles.eyebrow}>{t("board.explorer.detail")}</p>
            {/* Every pad's detail sits hidden in the same cell, so the panel always has the height of
                the longest one and moving between pads never shifts the table below. */}
            <div className={styles.detailStack}>
              <div className={styles.sizer} aria-hidden="true">
                {PULSAR_HEADER.map((_, index) => <PadDetail key={index} index={index} uses={usage.get(index) ?? []} />)}
                <p>{t("board.explorer.choose")}</p>
              </div>
              <div aria-live="polite">
                {active !== null ? <PadDetail index={active} uses={uses} /> : <p className={styles.choose}>{t("board.explorer.choose")}</p>}
              </div>
            </div>
          </section>

          <section className={styles.directory} aria-label={t("board.explorer.directory")}>
            <div className={styles.directoryHead}>
              <h2>{t("board.explorer.directory")}</h2>
              <label>
                <span className="visually-hidden">{t("board.explorer.search")}</span>
                <input type="search" value={search} placeholder={t("board.explorer.search")} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
            <PadLegend className={styles.legend} />
            {!needle ? (
              <div className={styles.sides} role="group" aria-label={t("board.explorer.sides")}>
                {(["L", "R"] as const).map((edge) => (
                  <button key={edge} type="button" aria-pressed={side === edge} onClick={() => setSide(edge)}>
                    {t(edge === "L" ? "board.explorer.tabLeft" : "board.explorer.tabRight")}
                  </button>
                ))}
              </div>
            ) : null}
            <div className={styles.tableScroll}>
              <table>
                <thead><tr>
                  <th scope="col">{t("board.pulsar.position")}</th>
                  <th scope="col">{t("board.pulsar.label")}</th>
                  <th scope="col">{t("board.pulsar.gpio")}</th>
                  <th scope="col">{t("board.pulsar.mainUse")}</th>
                </tr></thead>
                {groups.map(({ side: edge, positions }) => (
                  <tbody key={edge}>
                    <tr className={styles.sideRow}>
                      <th scope="colgroup" colSpan={4}>{t(edge === "L" ? "board.explorer.sideLeft" : "board.explorer.sideRight")}</th>
                    </tr>
                    {positions.map((index) => {
                      const position = PULSAR_HEADER[index];
                      if (!position) return null;
                      return (
                        <tr key={index} data-active={active === index || undefined} data-used={usage.has(index) || undefined} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
                          <th scope="row"><button type="button" aria-label={t("board.explorer.select", { number: index + 1, label: position.label })} aria-pressed={active === index} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onClick={() => selectPad(index)}>{index + 1}</button></th>
                          <td>
                            <i className={styles.dot} style={{ background: PAD_COLOUR[pulsarPadClass(position.pin)] }} aria-hidden="true" />
                            {position.label}
                          </td>
                          <td>{isGpio(position.pin) ? position.pin : "—"}</td>
                          <td>{t(`board.pulsar.use.${position.use}`)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
              {!visible.length ? <p className={styles.empty}>{t("board.explorer.noResults")}</p> : null}
            </div>
          </section>
          <p className={styles.note}>{t("board.explorer.qwiic")}</p>
          <a className={styles.source} href={PULSAR_SOURCE} target="_blank" rel="noreferrer">{t("board.pulsar.source")}</a>
        </div>
      </div>
    </div>
  );
}
