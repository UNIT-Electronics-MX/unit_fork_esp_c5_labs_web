import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { LineSplitter } from "../imu-cube/imu-protocol";
import { serialConnection, useSerialConnection } from "../serial-connection";
import frame from "../MicroPythonWorkbench.module.css";
import styles from "./ToneLabDialog.module.css";
import {
  cycleWidth, hzToSlider, keyboard, keyForShortcut, MAX_HZ, MAX_LEVEL, MIN_HZ, nearestNote, OCTAVES, type Octave, overloaded, parseLoad, type BoardLoad,
  SLIDER_STEPS, sliderToHz, toneCommand, type Wave, WHITE_KEYS, wavePath, WAVES,
} from "./tone-math";

/** Browser controls for the board's es8311_tone_lab.py serial command loop. */
export function ToneLabDialog({ onClose, onConnect }: { onClose: () => void; onConnect: () => void }) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const { state, operation, rawMode } = useSerialConnection();
  const connected = state === "connected";
  const [ready, setReady] = useState(false);
  const [frequency, setFrequency] = useState(440);
  const [wave, setWave] = useState<Wave>("sine");
  const [level, setLevel] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [activeNote, setActiveNote] = useState("");
  const [octave, setOctave] = useState<Octave>(4);
  const held = useRef<string[]>([]);
  const [error, setError] = useState("");
  const [load, setLoad] = useState<BoardLoad | null>(null);
  const canPlay = connected && ready && !operation && !rawMode;

  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const lines = new LineSplitter(128);
    return serialConnection.subscribeText((text) => {
      if (text.includes(">>> ")) {
        setReady(false);
        setPlaying(false);
      }
      for (const line of lines.push(text)) {
        if (line === "TONE,READY" || line.startsWith("TONE,PLAY,")) setReady(true);
        const reported = parseLoad(line);
        if (reported) setLoad(reported);
        if (line.startsWith("TONE,ERROR,")) setError(t("flasher.toneLab.boardError", { code: line.slice(11) }));
      }
    });
  }, [t]);

  useEffect(() => serialConnection.subscribe(() => {
    if (serialConnection.getSnapshot().state !== "connected") {
      setReady(false);
      setPlaying(false);
      setLoad(null);
    }
  }), []);

  function send(command: string) {
    setError("");
    pending.current = pending.current.catch(() => undefined).then(() => serialConnection.send(command, "lf"));
    void pending.current.catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPlaying(false);
    });
  }

  function play(nextFrequency = frequency, nextWave = wave, nextLevel = level, note = "") {
    if (!canPlay) return;
    setFrequency(nextFrequency);
    setPlaying(true);
    setActiveNote(note);
    send(toneCommand(nextFrequency, nextWave, nextLevel));
  }

  function stop() {
    if (!playing) return;
    setPlaying(false);
    setActiveNote("");
    if (connected) send("STOP");
  }

  const keys = keyboard(octave);
  const nearest = nearestNote(frequency);
  const live = playing && canPlay;

  function shortcutTarget(event: KeyboardEvent<HTMLElement>): string | null {
    if (event.ctrlKey || event.metaKey || event.altKey) return null;
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type !== "range") return null;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return null;
    return keyForShortcut(octave, event.key) ? event.key.toLowerCase() : null;
  }

  /** The computer keyboard plays like a piano; releasing one of several held keys falls back to the one still down. */
  function pressShortcut(event: KeyboardEvent<HTMLElement>) {
    const shortcut = shortcutTarget(event);
    const key = shortcut ? keyForShortcut(octave, shortcut) : undefined;
    if (!shortcut || !key || event.repeat) return;
    event.preventDefault();
    held.current = [...held.current.filter((entry) => entry !== shortcut), shortcut];
    play(key.hz, wave, level, key.name);
  }

  function releaseShortcut(event: KeyboardEvent<HTMLElement>) {
    const shortcut = shortcutTarget(event);
    if (!shortcut) return;
    held.current = held.current.filter((entry) => entry !== shortcut);
    const next = held.current[held.current.length - 1];
    const key = next ? keyForShortcut(octave, next) : undefined;
    if (key) play(key.hz, wave, level, key.name);
    else stop();
  }

  async function close() {
    if (playing && connected) {
      await pending.current.catch(() => undefined);
      try { await serialConnection.send("STOP", "lf"); } catch { /* The terminal reports disconnection. */ }
    }
    onClose();
  }

  async function stopScript() {
    setError("");
    await pending.current.catch(() => undefined);
    try {
      await serialConnection.stopPython();
      setReady(false);
      setPlaying(false);
      setActiveNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <dialog ref={dialogRef} className={frame.viewerDialog} aria-labelledby="tone-lab-title"
      onKeyDown={pressShortcut} onKeyUp={releaseShortcut}
      onCancel={(event) => { event.preventDefault(); void close(); }}>
      <header className={frame.viewerDialogHead}>
        <div>
          <h2 id="tone-lab-title">{t("flasher.toneLab.title")}</h2>
          <span data-connected={connected}>{t(`flasher.serial.state.${state}`)}</span>
        </div>
        <div className={frame.viewerDialogActions}>
          {!connected ? <button type="button" onClick={onConnect} disabled={state === "connecting" || state === "disconnecting"}>{t("flasher.serial.connect")}</button> : null}
          <button type="button" onClick={() => void stopScript()} disabled={!connected || operation}>{t("flasher.examples.stop")}</button>
          <button type="button" className={frame.viewerDialogClose} onClick={() => void close()}>{t("flasher.toneLab.backToCode")}</button>
        </div>
      </header>
      <div className={frame.viewerDialogBody}>
        <div className={styles.lab}>
          <div className={styles.stage} data-live={live}>
            <div className={styles.stageTop}>
              <span className={styles.eyebrow}>ES8311 · I²S OUT</span>
              <span className={styles.signal} data-live={live}>{live ? t("flasher.toneLab.sounding") : t("flasher.toneLab.silent")}</span>
            </div>
            <div className={styles.readout}>
              <strong>{frequency}<small> Hz</small></strong>
              <span>{activeNote || t("flasher.toneLab.tuning", { note: nearest.name, cents: `${nearest.cents > 0 ? "+" : ""}${nearest.cents}` })}</span>
            </div>
            <div className={styles.tuner} aria-hidden="true" data-on={live && !activeNote}>
              <span style={{ insetInlineStart: `${50 + nearest.cents}%` }} />
            </div>
            <svg viewBox="0 0 600 120" role="img" aria-label={t("flasher.toneLab.wavePreview")} preserveAspectRatio="none"
              style={{ "--shift": `${cycleWidth(frequency)}px`, "--period": `${(1.5 - 1.2 * hzToSlider(frequency) / SLIDER_STEPS).toFixed(2)}s` } as CSSProperties}>
              <path className={styles.axis} d="M0 60 H600" />
              <path className={styles.wave} d={wavePath(wave, frequency, level)} />
            </svg>
            <div className={styles.meter} role="meter" aria-label={t("flasher.toneLab.levelMeter")} aria-valuemin={0} aria-valuemax={MAX_LEVEL} aria-valuenow={level}>
              <span style={{ transform: `scaleX(${level / MAX_LEVEL})` }} />
            </div>
            <p>{t("flasher.toneLab.outputHint")}</p>
          </div>

          <div className={styles.controls}>
            <p className={styles.status} role="status">{!connected ? t("flasher.toneLab.connectFirst") : ready ? t("flasher.toneLab.ready") : t("flasher.toneLab.waiting")}</p>
            {load && ready ? (
              <p className={styles.load} data-warn={overloaded(load)}>
                {overloaded(load)
                  ? t("flasher.toneLab.loadHigh", { used: (load.usedUs / 1000).toFixed(1), budget: (load.budgetUs / 1000).toFixed(1) })
                  : t("flasher.toneLab.loadOk", { used: (load.usedUs / 1000).toFixed(1), budget: (load.budgetUs / 1000).toFixed(1) })}
              </p>
            ) : null}
            <div className={styles.settings}>
              <label>
                <span>{t("flasher.toneLab.frequency")} <output>{frequency} Hz</output></span>
                <input type="range" min="0" max={SLIDER_STEPS} step="1" value={hzToSlider(frequency)}
                  aria-valuemin={MIN_HZ} aria-valuemax={MAX_HZ} aria-valuenow={frequency} aria-valuetext={`${frequency} Hz, ${nearest.name}`}
                  onChange={(event) => { const hz = sliderToHz(Number(event.target.value)); setFrequency(hz); setActiveNote(""); if (playing) play(hz, wave, level); }} />
              </label>
              <label>
                <span>{t("flasher.toneLab.level")} <output>{level}%</output></span>
                <input type="range" min="0" max={MAX_LEVEL} step="1" value={level}
                  onChange={(event) => { const next = Number(event.target.value); setLevel(next); if (playing) play(frequency, wave, next, activeNote); }} />
              </label>
            </div>
            <fieldset className={styles.waves}>
              <legend>{t("flasher.toneLab.waveform")}</legend>
              {WAVES.map((choice) => <button key={choice} type="button" aria-pressed={wave === choice}
                onClick={() => { setWave(choice); if (playing) play(frequency, choice, level, activeNote); }}>
                {t(`flasher.toneLab.waves.${choice}`)}
              </button>)}
            </fieldset>
            <div className={styles.transport}>
              <button type="button" className={styles.play} disabled={!canPlay} onClick={() => play()}>{t("flasher.toneLab.play")}</button>
              <button type="button" disabled={!connected || !playing} onClick={stop}>{t("flasher.toneLab.stopTone")}</button>
            </div>
            <div className={styles.noteHead}>
              <h3>{t("flasher.toneLab.notes")}</h3>
              <div className={styles.octaves} role="group" aria-label={t("flasher.toneLab.octave")}>
                <button type="button" aria-label={t("flasher.toneLab.octaveDown")} disabled={octave === OCTAVES[0]}
                  onClick={() => setOctave((current) => Math.max(OCTAVES[0], current - 1) as Octave)}>−</button>
                <output>{t("flasher.toneLab.octaveValue", { octave })}</output>
                <button type="button" aria-label={t("flasher.toneLab.octaveUp")} disabled={octave === OCTAVES[OCTAVES.length - 1]}
                  onClick={() => setOctave((current) => Math.min(OCTAVES[OCTAVES.length - 1] ?? 5, current + 1) as Octave)}>+</button>
              </div>
            </div>
            <p className={styles.noteHint}>{t("flasher.toneLab.noteHint")}</p>
            <div className={styles.keyboard} dir="ltr">
              {keys.map((note) => <button key={note.name} type="button" disabled={!canPlay}
                className={note.sharp ? styles.sharp : styles.natural}
                style={{ "--slot": note.slot, "--white": WHITE_KEYS } as CSSProperties}
                data-active={playing && activeNote === note.name || undefined}
                onPointerDown={() => play(note.hz, wave, level, note.name)}
                onPointerUp={stop}
                onPointerCancel={stop}
                onPointerLeave={stop}
                onKeyDown={(event) => { if (!event.repeat && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); play(note.hz, wave, level, note.name); } }}
                onKeyUp={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); stop(); } }}
                onClick={() => setFrequency(note.hz)}
                aria-keyshortcuts={note.shortcut.toUpperCase()}
                aria-label={`${note.name}, ${note.hz} Hz`}>
                <span>{note.name}</span><small>{note.hz}</small><kbd>{note.shortcut.toUpperCase()}</kbd>
              </button>)}
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </div>
        </div>
      </div>
      <p className={styles.footer}>{t("flasher.toneLab.wiring")}</p>
    </dialog>
  );
}
