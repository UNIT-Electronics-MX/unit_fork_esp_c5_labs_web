import { useEffect, useRef, useState, type KeyboardEvent, type RefObject, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import * as z from "zod/mini";
import { recordBrowserBenchAction } from "@/features/bench/browser-log";
import { env } from "@/config/env";
import { fetchJson } from "@/lib/http";
import type { SerialTerminalHandle } from "./SerialTerminal";
import { REPL_INTERRUPT_FAILED, validPythonFilename } from "./serial-session";
import { EditorActionIcon } from "./EditorActionIcon";
import { pickExamples } from "./lesson-examples";
import { highlightPython } from "./python-highlight";
import styles from "./MicroPythonEditor.module.css";

const ExamplesSchema = z.object({
  board: z.string(),
  libraries: z.optional(z.array(z.object({
    id: z.string(),
    file: z.string(),
    source: z.string(),
    license: z.string(),
    examples: z.array(z.string()),
    code: z.string(),
  }))),
  examples: z.array(z.object({
    id: z.string(),
    title: z.string(),
    titleEn: z.string(),
    file: z.string(),
    description: z.string(),
    descriptionEn: z.string(),
    requires: z.array(z.string()),
    requiresEn: z.array(z.string()),
    code: z.string(),
  })),
});
type Examples = z.infer<typeof ExamplesSchema>;
const DRAFTS_KEY = "pulsar-c5-micropython-drafts";
const FILENAMES_KEY = "pulsar-c5-micropython-filenames";
const PY_EXTENSION = ".py";
const PY_MARK = "py";
const PYTHON_LABEL = "MicroPython";

function cursorLocation(code: string, offset: number) {
  const before = code.slice(0, offset);
  const lineStart = before.lastIndexOf("\n") + 1;
  return { line: before.split("\n").length, column: offset - lineStart + 1 };
}

function savedStrings(key: string): Record<string, string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    return Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

export function MicroPythonEditor({
  initialId = "gpio",
  terminalRef,
  connected = false,
  connectionError = "",
  toolbarAtTop = false,
  docked = false,
  blocked = false,
  lessonExampleIds = [],
}: {
  initialId?: string;
  terminalRef?: RefObject<SerialTerminalHandle | null>;
  connected?: boolean;
  connectionError?: string;
  toolbarAtTop?: boolean;
  docked?: boolean;
  blocked?: boolean;
  /** In a lesson: only these examples, with a file list for larger sets. */
  lessonExampleIds?: readonly string[];
}) {
  const { t, i18n } = useTranslation();
  const spanish = i18n.resolvedLanguage?.startsWith("es") ?? false;
  const [data, setData] = useState<Examples | null>(null);
  const [selectedId, setSelectedId] = useState(initialId);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => savedStrings(DRAFTS_KEY));
  const [filenames, setFilenames] = useState<Record<string, string>>(() => savedStrings(FILENAMES_KEY));
  const [error, setError] = useState(false);
  const [operation, setOperation] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedFile, setLoadedFile] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const sourceRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const serialSupported = typeof navigator !== "undefined" && typeof window !== "undefined"
    && window.isSecureContext !== false && "serial" in navigator;

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL(`${env.firmwareUrl}micropython.json`, document.baseURI).href;
    void fetchJson(url, ExamplesSchema, controller.signal).then((examples) => {
      setData(examples);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* Storage may be unavailable. */ }
  }, [drafts]);

  useEffect(() => {
    try { localStorage.setItem(FILENAMES_KEY, JSON.stringify(filenames)); } catch { /* Storage may be unavailable. */ }
  }, [filenames]);

  const inLesson = lessonExampleIds.length > 0;
  const visibleExamples = data && inLesson ? pickExamples(data.examples, lessonExampleIds) : data?.examples;
  const selected = visibleExamples?.find((example) => example.id === selectedId) ?? visibleExamples?.[0];
  const showLessonExplorer = inLesson && (visibleExamples?.length ?? 0) > 3;
  const requiredLibraries = selected ? data?.libraries?.filter((library) => library.examples.includes(selected.id)) ?? [] : [];
  const code = selected ? drafts[selected.id] ?? selected.code : "";
  const edited = selected ? code !== selected.code : false;
  const tftDraft = selected && (selected.id === "st7735-display" || selected.id === "st7735-showcase") && edited;
  const outputName = selected ? filenames[selected.id] || selected.file : "script.py";
  const customLoaded = loadedFile || (selected ? Boolean(filenames[selected.id] && filenames[selected.id] !== selected.file) : false);
  const lineCount = code.split("\n").length;

  function describeSerialError(cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return detail === REPL_INTERRUPT_FAILED ? t("flasher.serial.replInterruptFailed") : detail;
  }

  function selectExample(id: string) {
    setSelectedId(id);
    setLoadedFile(false);
    setNotice("");
    resetViewport();
  }

  function resetViewport() {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
      textareaRef.current.scrollLeft = 0;
      textareaRef.current.setSelectionRange(0, 0);
    }
    if (sourceRef.current) {
      sourceRef.current.scrollTop = 0;
      sourceRef.current.scrollLeft = 0;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = 0;
    setCursor({ line: 1, column: 1 });
  }

  function syncScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (sourceRef.current) {
      sourceRef.current.scrollTop = event.currentTarget.scrollTop;
      sourceRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
  }

  function updateCursor(element: HTMLTextAreaElement) {
    setCursor(cursorLocation(element.value, element.selectionStart));
  }

  function editWithIndent(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!selected) return;
    const element = event.currentTarget;
    if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const start = element.selectionStart;
      const end = element.selectionEnd;
      const replacement = "    ";
      setDrafts((current) => ({ ...current, [selected.id]: code.slice(0, start) + replacement + code.slice(end) }));
      window.requestAnimationFrame(() => {
        element.setSelectionRange(start + replacement.length, start + replacement.length);
        updateCursor(element);
      });
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (connected && !operation && !blocked) void boardAction("run");
      else if (!connected) setNotice(t("flasher.examples.connectFirst"));
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (connected && !operation && !blocked) void boardAction("save");
      else if (!connected) setNotice(t("flasher.examples.connectFirst"));
    }
  }

  function resetExample() {
    if (!selected) return;
    setLoadedFile(false);
    setFilenames((current) => {
      const next = { ...current };
      delete next[selected.id];
      return next;
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[selected.id];
      return next;
    });
    setNotice("");
    resetViewport();
  }

  function download() {
    if (!selected) return;
    const blob = new Blob([code], { type: "text/x-python;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = outputName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openFile(file: File | undefined) {
    if (!file || !selected) return;
    if (!validPythonFilename(file.name)) {
      setNotice(t("flasher.examples.invalidName"));
      return;
    }
    try {
      const content = (await file.text()).replace(/\r\n?/g, "\n");
      setDrafts((current) => ({ ...current, [selected.id]: content }));
      setFilenames((current) => ({ ...current, [selected.id]: file.name }));
      setLoadedFile(true);
      resetViewport();
      setNotice(t("flasher.examples.fileLoaded", { file: file.name }));
    } catch (cause) {
      setNotice(t("flasher.examples.serialError", { detail: cause instanceof Error ? cause.message : String(cause) }));
    }
  }

  async function boardAction(action: "run" | "save" | "stop") {
    if (!selected || !terminalRef?.current) return;
    if (action === "stop") {
      try {
        await terminalRef.current.stopPython();
        setNotice(t("flasher.examples.stopDone"));
        recordBrowserBenchAction({
          types: ["observe"], title: "MicroPython script interrupted", where: "Browser editor",
          why: "Sent Ctrl-C to the board's REPL.", result: "Interrupt sent.",
        });
      } catch (cause) {
        setNotice(t("flasher.examples.serialError", { detail: describeSerialError(cause) }));
        recordBrowserBenchAction({
          types: ["failed"], title: "MicroPython interrupt failed", where: "Browser editor",
          why: "The running script could not be interrupted.", result: "Check the terminal for details.",
        });
      }
      return;
    }
    if (operation || blocked) return;
    if (action === "save" && !validPythonFilename(outputName)) {
      setNotice(t("flasher.examples.invalidName"));
      return;
    }
    setOperation(action);
    setNotice("");
    try {
      if (action === "run") await terminalRef.current.runPython(code);
      else await terminalRef.current.savePython(outputName, code);
      setNotice(t(`flasher.examples.${action}Done`, { file: outputName }));
      recordBrowserBenchAction(action === "run" ? {
        types: ["observe"], title: "MicroPython script run", where: "Browser editor",
        why: "Sent a script to the board's REPL.", result: "Script sent; its source and output were not saved here.",
      } : {
        types: ["install"], title: "MicroPython script saved", where: "Browser editor",
        why: "Saved a script on the board over serial.", result: "File saved; its source was not saved in the bench log.",
      });
    } catch (cause) {
      setNotice(t("flasher.examples.serialError", { detail: describeSerialError(cause) }));
      recordBrowserBenchAction({
        types: ["failed"], title: "MicroPython action failed", where: "Browser editor",
        why: "A script action did not complete.", result: "Check the editor and terminal for details.",
      });
    } finally {
      setOperation("");
    }
  }

  async function installLibrary(library: NonNullable<Examples["libraries"]>[number]) {
    if (!terminalRef?.current || !connected || operation || blocked) return;
    setOperation("library");
    setNotice("");
    try {
      await terminalRef.current.savePython(library.file, library.code);
      setNotice(t("flasher.examples.libraryInstalled", { file: library.file }));
      recordBrowserBenchAction({
        types: ["install"], title: "MicroPython library installed", where: "Browser editor",
        why: "Saved a UNIT driver on the board.", result: `${library.file} saved on the board.`,
      });
    } catch (cause) {
      setNotice(t("flasher.examples.serialError", { detail: describeSerialError(cause) }));
    } finally {
      setOperation("");
    }
  }

  const toolbar = selected ? (
    <div className={styles.toolbar} role="toolbar" aria-label={t("flasher.examples.actions")}>
      <div className={styles.toolGroup}>
        {terminalRef ? (
          <>
            {!connected ? (
              <button className={styles.connect} type="button" disabled={!serialSupported || blocked} onClick={() => { setNotice(""); void terminalRef.current?.connect(); }}><EditorActionIcon name="plug" />{t("flasher.examples.connect")}</button>
            ) : (
              <button type="button" onClick={() => { setNotice(""); void terminalRef.current?.disconnect(); }}><EditorActionIcon name="plug" />{t("flasher.serial.disconnect")}</button>
            )}
            <span className={styles.toolDivider} aria-hidden="true" />
            <button className={styles.run} type="button" disabled={!connected || !!operation || blocked} title="Ctrl+Enter" onClick={() => void boardAction("run")}><EditorActionIcon name="play" />{t("flasher.examples.run")}</button>
            <button className={styles.stop} type="button" disabled={!connected || blocked} onClick={() => void boardAction("stop")}><EditorActionIcon name="stop" />{t("flasher.examples.stop")}</button>
            <button type="button" disabled={!connected || !!operation || blocked} title="Ctrl+S" onClick={() => void boardAction("save")}><EditorActionIcon name="save" />{t("flasher.examples.save")}</button>
            {requiredLibraries.map((library) => <button key={library.id} type="button" disabled={!connected || !!operation || blocked} onClick={() => void installLibrary(library)}><EditorActionIcon name="save" />{t("flasher.examples.installLibrary", { file: library.file })}</button>)}
          </>
        ) : null}
      </div>
      <div className={styles.toolGroup}>
        {inLesson ? (
          <label className={styles.openFile}>
            <EditorActionIcon name="folder" />{t("flasher.examples.openFile")}
            <input type="file" accept=".py,text/x-python" aria-label={t("flasher.examples.openFile")} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void openFile(file);
            }} />
          </label>
        ) : null}
        <button type="button" onClick={download}><EditorActionIcon name="download" />{t("flasher.examples.download")}</button>
        <button type="button" disabled={!edited && !loadedFile && !filenames[selected.id]} onClick={resetExample}><EditorActionIcon name="reset" />{t("flasher.examples.reset")}</button>
      </div>
    </div>
  ) : null;

  const intro = (
    <div className={styles.introduction}>
      <div>
        <p className={styles.eyebrow}>PULSAR C5 / MICROPYTHON</p>
        <h2 id="micropython-title">{t("flasher.examples.title")}</h2>
        <p>{t("flasher.examples.intro")}</p>
      </div>
      <span className={styles.languageBadge}>{PY_EXTENSION}</span>
    </div>
  );

  // In a lesson the workspace comes first; its description, needs and help follow it.
  const details = selected ? (
    <div className={styles.underbar}>
      {!customLoaded ? <p className={styles.description}>{spanish ? selected.description : selected.descriptionEn}</p> : null}
      {!customLoaded && (spanish ? selected.requires : selected.requiresEn).length ? (
        <p className={styles.requirements}>{t("flasher.examples.requires", { items: (spanish ? selected.requires : selected.requiresEn).join(" · ") })}</p>
      ) : null}
      {requiredLibraries.map((library) => <p key={library.id} className={styles.libraryHint}>{t("flasher.examples.libraryHint", { file: library.file })} <a href={library.source} target="_blank" rel="noreferrer">{t("flasher.examples.librarySource", { license: library.license === "Not specified" ? t("flasher.examples.licenseUnspecified") : library.license })}</a></p>)}
      {terminalRef && !connected ? <p>{t("flasher.examples.connectFirst")}</p> : null}
      {terminalRef && !serialSupported ? <p className={styles.error}>{t("flasher.unsupported")}</p> : null}
      {!toolbarAtTop && (operation || notice) ? <p role="status">{operation ? t("flasher.examples.working") : notice}</p> : null}
      <details className={styles.help}>
        <summary>{t("flasher.examples.help")}</summary>
        <p>{t("flasher.examples.shortcuts")}</p>
        <p>{t("flasher.examples.saveHint")}</p>
        <p>{t("flasher.examples.firmwareHint")} <a href="https://micropython.org/download/ESP32_GENERIC_C5/" target="_blank" rel="noopener noreferrer">{t("flasher.examples.firmwareLink")}</a></p>
      </details>
    </div>
  ) : null;

  return (
    <section
      className={styles.editor}
      data-docked={docked}
      data-lesson={inLesson}
      data-lesson-navigation={showLessonExplorer || undefined}
      aria-label={inLesson ? t("flasher.examples.workspace") : undefined}
      aria-labelledby={inLesson ? undefined : "micropython-title"}
    >
      {toolbarAtTop && toolbar ? (
        <div className={styles.lessonActions}>
          {toolbar}
          {connectionError ? <p className={styles.actionError} role="alert">{t("flasher.serial.error", { detail: connectionError })}</p> : null}
          {operation || notice ? <p className={styles.actionNotice} role="status">{operation ? t("flasher.examples.working") : notice}</p> : null}
        </div>
      ) : null}
      {inLesson ? null : intro}
      {error ? (
        <div className={styles.underbar}>
          <p className={styles.error} role="alert">{t("flasher.examples.unavailable")}</p>
          {terminalRef && !connected ? <button type="button" disabled={!serialSupported || blocked} onClick={() => void terminalRef.current?.connect()}>{t("flasher.examples.connect")}</button> : null}
          {terminalRef && connected ? <button type="button" onClick={() => void terminalRef.current?.disconnect()}>{t("flasher.serial.disconnect")}</button> : null}
        </div>
      ) : null}
      {!data && !error ? <p role="status">{t("flasher.examples.loading")}</p> : null}
      {data && selected ? (
        <>
          {inLesson ? null : details}
          {tftDraft ? <p className={styles.draftWarning} role="status">
            {t("flasher.examples.tftDraft")}
            <button type="button" onClick={resetExample}>{t("flasher.examples.reset")}</button>
          </p> : null}
          <div className={styles.ide}>
            <div className={styles.windowBar}>
              <div className={styles.windowIdentity}>
                <span className={styles.windowMark} aria-hidden="true">&gt;_</span>
                <strong>{t("flasher.examples.workspace")}</strong>
                <span className={styles.windowPath}>{t("flasher.examples.workspacePath")}</span>
              </div>
              <span className={styles.connection} data-connected={connected}>
                <span aria-hidden="true" />
                {connected ? t("flasher.serial.state.connected") : t("flasher.serial.state.disconnected")}
              </span>
            </div>
            {!toolbarAtTop ? toolbar : null}
            <div className={styles.body} data-focused={inLesson && !showLessonExplorer}>
              {!inLesson || showLessonExplorer ? <aside className={styles.explorer} aria-label={t("flasher.examples.choose")}>
                <div className={styles.explorerHeading}>
                  <EditorActionIcon name="folder" />{t("flasher.examples.choose")}
                  {showLessonExplorer ? <span className={styles.exampleProgress}>{(visibleExamples?.findIndex((example) => example.id === selected.id) ?? 0) + 1} / {visibleExamples?.length}</span> : null}
                </div>
                <div className={styles.exampleList}>
                  {visibleExamples?.map((example) => (
                    <button
                      className={styles.example}
                      type="button"
                      key={example.id}
                      data-active={selected.id === example.id}
                      aria-current={selected.id === example.id ? "true" : undefined}
                      onClick={() => selectExample(example.id)}
                    >
                      <span className={styles.pyFile} aria-hidden="true">{PY_MARK}</span>
                      <span>{spanish ? example.title : example.titleEn}<small>{filenames[example.id] || example.file}</small></span>
                      {drafts[example.id] !== undefined && drafts[example.id] !== example.code ? <span className={styles.dirty} aria-label={t("flasher.examples.modified")} /> : null}
                    </button>
                  ))}
                </div>
                {!inLesson ? <label className={styles.openFile}>
                  <EditorActionIcon name="folder" />{t("flasher.examples.openFile")}
                  <input type="file" accept=".py,text/x-python" aria-label={t("flasher.examples.openFile")} onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void openFile(file);
                  }} />
                </label> : null}
              </aside> : null}
              <div className={styles.mainPane}>
                <div className={styles.tabBar}>
                  {inLesson && !showLessonExplorer && visibleExamples && visibleExamples.length > 1 ? (
                    <div className={styles.tabs} role="group" aria-label={t("flasher.examples.choose")}>
                      {visibleExamples.map((example) => {
                        const active = example.id === selected.id;
                        const dirty = active ? edited : drafts[example.id] !== undefined && drafts[example.id] !== example.code;
                        return (
                          <button key={example.id} type="button" className={styles.activeTab} data-active={active} aria-current={active ? "true" : undefined} title={spanish ? example.title : example.titleEn} onClick={() => selectExample(example.id)}>
                            <span className={styles.pyFile} aria-hidden="true">{PY_MARK}</span><span>{active ? outputName : filenames[example.id] || example.file}</span>{dirty ? <span className={styles.dirty} aria-label={t("flasher.examples.modified")} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.activeTab}><span className={styles.pyFile} aria-hidden="true">{PY_MARK}</span><span>{outputName}</span>{edited ? <span className={styles.dirty} aria-label={t("flasher.examples.modified")} /> : null}</div>
                  )}
                  <span className={styles.tabHint}>{PYTHON_LABEL}</span>
                </div>
                <div className={styles.fileInfo}>
                  <label htmlFor="micropython-filename">{t("flasher.examples.filename")}</label>
                  <input id="micropython-filename" type="text" value={outputName} spellCheck={false} onChange={(event) => setFilenames((current) => ({ ...current, [selected.id]: event.target.value }))} />
                </div>
                <div className={styles.codeViewport}>
                  <div className={styles.gutter} ref={gutterRef} aria-hidden="true">
                    {Array.from({ length: lineCount }, (_, index) => <div key={index} data-current={cursor.line === index + 1}>{index + 1}</div>)}
                  </div>
                  <div className={styles.sourceArea}>
                    <pre className={styles.highlight} ref={sourceRef} aria-hidden="true">{highlightPython(code)}{"\n"}</pre>
                    <textarea
                      data-lesson-code={inLesson ? true : undefined}
                      id="micropython-code"
                      ref={textareaRef}
                      className={styles.code}
                      aria-label={t("flasher.examples.codeLabel", { file: outputName })}
                      value={code}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      wrap="off"
                      onChange={(event) => {
                        setDrafts((current) => ({ ...current, [selected.id]: event.target.value }));
                        updateCursor(event.currentTarget);
                      }}
                      onSelect={(event) => updateCursor(event.currentTarget)}
                      onScroll={syncScroll}
                      onKeyDown={editWithIndent}
                    />
                  </div>
                </div>
                <div className={styles.statusBar}>
                  <span>{t("flasher.examples.position", { line: cursor.line, column: cursor.column })}</span>
                  <span>{lineCount} {t("flasher.examples.lines")}</span>
                  <span>UTF-8</span>
                  <span>{PYTHON_LABEL}</span>
                </div>
              </div>
            </div>
          </div>
          {inLesson ? details : null}
        </>
      ) : null}
    </section>
  );
}
