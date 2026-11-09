import { useEffect, useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import { tokenize, type TokenKind } from "@/domain/code/tokenize";
import { EditorActionIcon } from "@/features/flasher/EditorActionIcon";
import styles from "@/features/flasher/MicroPythonEditor.module.css";

const DRAFT_PREFIX = "pulsar-c5-arduino-draft:";
const ARDUINO_LABEL = "Arduino";
const INO_EXTENSION = ".ino";

function draftFor(filename: string, fallback: string) {
  try { return localStorage.getItem(DRAFT_PREFIX + filename) ?? fallback; }
  catch { return fallback; }
}

function colour(kind: TokenKind) {
  if (kind === "comment") return styles.comment;
  if (kind === "string" || kind === "char") return styles.string;
  if (kind === "number") return styles.number;
  if (kind === "keyword") return styles.keyword;
  if (kind === "type") return styles.decorator;
  if (kind === "preproc") return styles.builtin;
  if (kind === "constant") return styles.constant;
  if (kind === "function") return styles.builtin;
  return undefined;
}

export function ArduinoSketchEditor({ filename, source }: { filename: string; source: string }) {
  const { t } = useTranslation();
  const [code, setCode] = useState(() => draftFor(filename, source));
  const [notice, setNotice] = useState("");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const highlightRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lines = code.split("\n");
  const tokens = tokenize(code);

  useEffect(() => {
    try {
      if (code === source) localStorage.removeItem(DRAFT_PREFIX + filename);
      else localStorage.setItem(DRAFT_PREFIX + filename, code);
    } catch { /* Storage may be unavailable. */ }
  }, [code, filename, source]);

  function updateCursor(element: HTMLTextAreaElement) {
    const before = element.value.slice(0, element.selectionStart);
    setCursor({ line: before.split("\n").length, column: before.length - before.lastIndexOf("\n") });
  }

  function syncScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = event.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
  }

  function download() {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(t("codeRoute.sketch.downloaded", { file: filename }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setNotice(t("codeRoute.sketch.copied"));
    } catch {
      setNotice(t("codeRoute.sketch.copyFailed"));
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const element = event.currentTarget;
      const start = element.selectionStart;
      const next = code.slice(0, start) + "  " + code.slice(element.selectionEnd);
      setCode(next);
      window.requestAnimationFrame(() => {
        element.setSelectionRange(start + 2, start + 2);
        updateCursor(element);
      });
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      download();
    }
  }

  return (
    <section className={styles.editor} data-lesson="true" aria-label={t("codeRoute.sketch.title")}>
      <div className={styles.introduction}>
        <div>
          <p className={styles.eyebrow}>{t("codeRoute.sketch.eyebrow")}</p>
          <h2>{t("codeRoute.sketch.title")}</h2>
          <p>{t("codeRoute.sketch.intro")}</p>
        </div>
        <span className={styles.languageBadge}>{INO_EXTENSION}</span>
      </div>
      <div className={styles.ide}>
        <div className={styles.windowBar}>
          <div className={styles.windowIdentity}>
            <span className={styles.windowMark} aria-hidden="true">&gt;_</span>
            <strong>{t("flasher.examples.workspace")}</strong>
            <span className={styles.windowPath}>{t("codeRoute.sketch.path")}</span>
          </div>
          <span className={styles.connection}>{t("codeRoute.sketch.local")}</span>
        </div>
        <div className={styles.toolbar} role="toolbar" aria-label={t("codeRoute.sketch.actions")}>
          <div className={styles.toolGroup}>
            <button type="button" onClick={() => void copy()}><EditorActionIcon name="copy" />{t("codeRoute.sketch.copy")}</button>
            <button className={styles.connect} type="button" onClick={download}><EditorActionIcon name="download" />{t("codeRoute.sketch.download")}</button>
            <span className={styles.toolDivider} aria-hidden="true" />
            <button type="button" disabled={code === source} onClick={() => {
              setCode(source);
              setNotice(t("codeRoute.sketch.restored"));
              if (editorRef.current) {
                editorRef.current.scrollTop = 0;
                editorRef.current.scrollLeft = 0;
              }
              if (highlightRef.current) {
                highlightRef.current.scrollTop = 0;
                highlightRef.current.scrollLeft = 0;
              }
              if (gutterRef.current) gutterRef.current.scrollTop = 0;
              setCursor({ line: 1, column: 1 });
            }}><EditorActionIcon name="reset" />{t("codeRoute.sketch.restore")}</button>
          </div>
        </div>
        <div className={styles.mainPane}>
          <div className={styles.tabBar}>
            <div className={styles.activeTab}><span className={styles.inoFile} aria-hidden="true">{INO_EXTENSION}</span><span>{filename}</span>{code !== source ? <span className={styles.dirty} title={t("flasher.examples.modified")} /> : null}</div>
            <span className={styles.tabHint}>{ARDUINO_LABEL}</span>
          </div>
          <div className={styles.fileInfo}>{t("codeRoute.sketch.help")}</div>
          <div className={styles.codeViewport}>
            <div className={styles.gutter} ref={gutterRef} aria-hidden="true">
              {lines.map((_, index) => <div key={index} data-current={cursor.line === index + 1}>{index + 1}</div>)}
            </div>
            <div className={styles.sourceArea}>
              <pre className={styles.highlight} ref={highlightRef} aria-hidden="true">
                {tokens.map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {line.map((token, tokenIndex) => <span className={colour(token.kind)} key={tokenIndex}>{token.text}</span>)}
                    {lineIndex < tokens.length - 1 ? "\n" : null}
                  </span>
                ))}
                {"\n"}
              </pre>
              <textarea
                data-lesson-code
                className={styles.code}
                ref={editorRef}
                value={code}
                aria-label={t("codeRoute.sketch.editLabel", { file: filename })}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                wrap="off"
                onChange={(event) => {
                  setCode(event.target.value);
                  updateCursor(event.currentTarget);
                }}
                onSelect={(event) => updateCursor(event.currentTarget)}
                onScroll={syncScroll}
                onKeyDown={keyDown}
              />
            </div>
          </div>
          <div className={styles.statusBar}>
            <span>{t("flasher.examples.position", { line: cursor.line, column: cursor.column })}</span>
            <span>{lines.length} {t("flasher.examples.lines")}</span>
            <span>UTF-8</span>
            <span>{ARDUINO_LABEL}</span>
          </div>
        </div>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
    </section>
  );
}
