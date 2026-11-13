import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { SoundLabMode } from "../lesson-examples";
import { dbfsToPercent, PeakHold } from "../i2s-audio/level-meter";
import { LineSplitter } from "../imu-cube/imu-protocol";
import { serialConnection, useSerialConnection } from "../serial-connection";
import { parseSoundLine, type SoundMessage } from "./sound-protocol";
import styles from "./SoundLabDialog.module.css";

const BANDS = ["125", "250", "500", "750", "1k", "1.5k", "2.5k", "4k"];
const EFFECTS = ["normal", "robot", "echo", "chipmunk", "giant"] as const;

const meter = dbfsToPercent;
/** A peak this close to 0 dBFS means the signal is clipping. */
const CLIP_DB = -0.5;
/** Modes that print telemetry continuously: silence for this long means the script has stopped. */
const STALE_MS = 3000;
const CONTINUOUS: ReadonlySet<SoundLabMode> = new Set<SoundLabMode>(["loudness", "spectrum"]);
/** How often the clock ticks: fast for the timed phases, slow for stale checks, never when nothing depends on it. */
const tickMs = (mode: SoundLabMode): number => mode === "recorder" || mode === "voice_fx" ? 100 : CONTINUOUS.has(mode) ? 500 : 0;

export function SoundLabDialog({ mode, onClose, onConnect }: { mode: SoundLabMode; onClose: () => void; onConnect: () => void }) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { state, operation, rawMode } = useSerialConnection();
  const [messages, setMessages] = useState<SoundMessage[]>([]);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [phaseAt, setPhaseAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [controlError, setControlError] = useState("");
  const [stopped, setStopped] = useState(false);
  const [commandPending, setCommandPending] = useState(false);
  const [held, setHeld] = useState(-Infinity);
  const [peakHold] = useState(() => new PeakHold());
  const pending = useRef<Promise<void>>(Promise.resolve());
  const connected = state === "connected";
  const modeMessages = messages.filter((message) => message.mode === mode);
  const phase = modeMessages.findLast((message) => message.phase !== "level" && message.phase !== "sensitivity")?.phase ?? "waiting";
  const elapsed = phaseAt === null ? 0 : Math.max(0, now - phaseAt);
  const silenceElapsed = lastAt === null ? 0 : Math.max(0, now - lastAt);
  const running = connected && modeMessages.length > 0 && !stopped;
  const stale = running && CONTINUOUS.has(mode) && silenceElapsed > STALE_MS;
  const canCommand = running && !operation && !rawMode && !commandPending;

  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => { if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }); };
  }, []);

  useEffect(() => {
    const splitter = new LineSplitter();
    const accept = (text: string) => {
      const lines = splitter.push(text);
      const parsed = lines.map(parseSoundLine).filter((item): item is SoundMessage => item !== null && item.mode === mode);
      if (parsed.length) {
        setMessages((current) => [...current, ...parsed].slice(-80));
        const at = performance.now();
        setLastAt(at);
        setNow(at);
        setStopped(false);
        for (const item of parsed) {
          if (item.phase === "record" || item.phase === "play" || item.phase === "start") setPhaseAt(at);
          if (item.mode === "loudness" && item.phase === "sample") setHeld(peakHold.update(item.peak, at));
          if (item.phase === "error") setControlError(t("flasher.soundLab.commandError", { code: item.code }));
          if (["record", "play", "cleared", "start", "abort", "end", "error"].includes(item.phase)) setCommandPending(false);
        }
      }
      const lastPrompt = lines.findLastIndex((line) => line.includes(">>> "));
      const lastTelemetry = lines.findLastIndex((line) => parseSoundLine(line)?.mode === mode);
      if (lastPrompt > lastTelemetry || (text.includes(">>> ") && parsed.length === 0)) setStopped(true);
    };
    // The first READY message can arrive before Run resolves and opens the dialog.
    const recent = serialConnection.getSnapshot().output.split(/\r?\n/).slice(-120).join("\n");
    accept(recent + "\n");
    return serialConnection.subscribeText(accept);
  }, [mode, peakHold, t]);

  const sendCommand = useCallback((command: string) => {
    setControlError("");
    if (/^(?:REC|PLAY|CLEAR|START|STOP)(?:\s|$)/.test(command)) setCommandPending(true);
    pending.current = pending.current.catch(() => undefined).then(() => serialConnection.send(command, "lf"));
    void pending.current.catch((cause: unknown) => {
      setControlError(cause instanceof Error ? cause.message : String(cause));
      setCommandPending(false);
    });
  }, []);

  useEffect(() => {
    const every = tickMs(mode);
    if (!every) return;
    const timer = window.setInterval(() => setNow(performance.now()), every);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (!commandPending) return;
    const timer = window.setTimeout(() => {
      setCommandPending(false);
      setControlError(t("flasher.soundLab.noReply"));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [commandPending, t]);

  async function stop() {
    setControlError("");
    try { await serialConnection.stopPython(); setStopped(true); setCommandPending(false); }
    catch (cause) { setControlError(cause instanceof Error ? cause.message : String(cause)); }
  }

  const status = !connected ? t("flasher.soundLab.disconnected")
    : stopped ? t("flasher.soundLab.stopped")
    : !running ? t("flasher.soundLab.waiting")
    : stale ? t("flasher.soundLab.stale") : t("flasher.soundLab.receiving");

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="sound-lab-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>ES8311 / {t("flasher.soundLab.live")}</span>
        <h2 id="sound-lab-title">{t(`flasher.soundLab.modes.${mode}`)}</h2>
      </div>
      <div className={styles.actions}>
        {!connected && <button type="button" disabled={state === "connecting" || state === "disconnecting"} onClick={onConnect}>{t("flasher.serial.connect")}</button>}
        <button type="button" disabled={!connected || !!operation} onClick={() => void stop()}>{t("flasher.examples.stop")}</button>
        <button type="button" className={styles.close} onClick={onClose}>{t("flasher.soundLab.backToCode")}</button>
      </div>
    </header>
    <div className={styles.content}>
      <div className={styles.status} data-active={running && !stale} data-stale={stale || undefined} role="status"><span aria-hidden="true" />{status}</div>
      {mode === "loudness" && <Loudness messages={modeMessages} held={held} />}
      {mode === "clap" && <Clap messages={modeMessages} canCommand={canCommand} send={sendCommand} />}
      {mode === "recorder" && <Recorder messages={modeMessages} phase={phase} elapsed={elapsed} canCommand={canCommand} send={sendCommand} />}
      {mode === "spectrum" && <Spectrum messages={modeMessages} />}
      {mode === "game" && <Game messages={modeMessages} canCommand={canCommand} send={sendCommand} />}
      {mode === "voice_fx" && <VoiceFx messages={modeMessages} phase={phase} elapsed={elapsed} canCommand={canCommand} send={sendCommand} />}
      <p className={styles.hint}>{t(`flasher.soundLab.hints.${mode}`)}</p>
      {controlError && <p role="alert" className={styles.error}>{controlError}</p>}
    </div>
  </dialog>;
}

function Loudness({ messages, held }: { messages: SoundMessage[]; held: number }) {
  const { t } = useTranslation();
  const samples = messages.filter((m): m is Extract<SoundMessage, { mode: "loudness"; phase: "sample" }> => m.mode === "loudness" && m.phase === "sample");
  const latest = samples.at(-1);
  const history = samples.slice(-48);
  const clipping = latest !== undefined && latest.peak >= CLIP_DB;
  return <div className={styles.levelGrid}>
    {(["rms", "peak"] as const).map((kind) => <div className={styles.levelCard} key={kind}>
      <span>{t(`flasher.soundLab.${kind}`)}{kind === "peak" ? <em className={styles.clip} data-on={clipping}>{t("flasher.soundLab.clipping")}</em> : null}</span>
      <strong>{latest ? latest[kind].toFixed(1) : "—"}<small> {t("flasher.soundLab.dbfs")}</small></strong>
      <div className={styles.meter} role="meter" aria-label={t(`flasher.soundLab.${kind}`)} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={latest ? Math.max(-60, latest[kind]) : -60}>
        <i style={{ width: `${latest ? meter(latest[kind]) : 0}%` }} />
        {kind === "peak" && Number.isFinite(held) ? <b className={styles.hold} title={t("flasher.soundLab.peakHold", { db: held.toFixed(1) })} style={{ insetInlineStart: `${meter(held)}%` }} /> : null}
      </div>
    </div>)}
    <div className={styles.history} aria-label={t("flasher.soundLab.history")}>
      <div className={styles.historyHead}><strong>{t("flasher.soundLab.history")}</strong><span>{t("flasher.soundLab.range")}</span></div>
      <div className={styles.historyBars}>{history.map((sample, index) => <span key={index} title={`RMS ${sample.rms.toFixed(1)} dBFS · ${t("flasher.soundLab.peak")} ${sample.peak.toFixed(1)} dBFS`}
        style={{ height: `${Math.max(2, meter(sample.rms))}%`, "--peak": `${Math.max(2, meter(sample.peak))}%` } as CSSProperties} data-clip={sample.peak >= CLIP_DB || undefined} />)}</div>
    </div>
  </div>;
}

function Clap({ messages, canCommand, send }: { messages: SoundMessage[]; canCommand: boolean; send: (command: string) => void }) {
  const { t } = useTranslation();
  const [sensitivity, setSensitivity] = useState(65);
  const events = messages.filter((m): m is Extract<SoundMessage, { mode: "clap"; phase: "toggle" }> => m.mode === "clap" && m.phase === "toggle");
  const latest = events.at(-1);
  const level = messages.findLast((m): m is Extract<SoundMessage, { mode: "clap"; phase: "level" }> => m.mode === "clap" && m.phase === "level");
  const sensitivityAck = messages.findLast((m): m is Extract<SoundMessage, { mode: "clap"; phase: "sensitivity" }> => m.mode === "clap" && m.phase === "sensitivity");

  useEffect(() => {
    if (!canCommand || sensitivityAck?.value === sensitivity) return;
    const timer = window.setTimeout(() => send(`SENS ${sensitivity}`), 180);
    return () => window.clearTimeout(timer);
  }, [canCommand, send, sensitivity, sensitivityAck?.value]);

  return <div className={styles.clapPanel}>
    <div className={styles.switch} data-on={latest?.on ?? false} role="img" aria-label={latest ? t(latest.on ? "flasher.soundLab.on" : "flasher.soundLab.off") : t("flasher.soundLab.waitingClap")}><span aria-hidden="true" /><strong>{latest ? t(latest.on ? "flasher.soundLab.on" : "flasher.soundLab.off") : "—"}</strong></div>
    <div className={styles.clapDetails}>
      <div className={styles.clapCount}><span>{t("flasher.soundLab.claps")}</span><strong>{latest?.count ?? 0}</strong><small>{t("flasher.soundLab.virtualSwitch")}</small></div>
      <label className={styles.slider}><span>{t("flasher.soundLab.sensitivity")} <b>{sensitivity}%</b></span>
        <input type="range" min="0" max="100" step="1" value={sensitivity} aria-label={t("flasher.soundLab.sensitivity")} disabled={!canCommand} onChange={(event) => setSensitivity(Number(event.target.value))} />
      </label>
      <div className={styles.clapMeter}>
        <span>{t("flasher.soundLab.micPeak")} {level ? `${level.peak.toFixed(1)} dBFS` : "—"}</span>
        <div className={styles.meter} role="meter" aria-label={t("flasher.soundLab.micPeak")} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={level ? Math.max(-60, level.peak) : -60}><i style={{ width: `${level ? meter(level.peak) : 0}%` }} /></div>
        <small>{t("flasher.soundLab.threshold")}: {level ? `${level.threshold.toFixed(1)} dBFS` : "—"}</small>
      </div>
    </div>
  </div>;
}

function Recorder({ messages, phase, elapsed, canCommand, send }: { messages: SoundMessage[]; phase: string; elapsed: number; canCommand: boolean; send: (command: string) => void }) {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(65);
  const plays = messages.filter((m): m is Extract<SoundMessage, { mode: "recorder"; phase: "play" }> => m.mode === "recorder" && m.phase === "play");
  let samples = 0;
  for (const message of messages) if (message.mode === "recorder") {
    if (message.phase === "record" || message.phase === "cleared") samples = 0;
    if (message.phase === "saved") samples = message.samples;
  }
  const level = messages.findLast((m): m is Extract<SoundMessage, { mode: "recorder"; phase: "level" }> => m.mode === "recorder" && m.phase === "level");
  const active = phase === "record" || phase === "play";
  return <div className={styles.recorderDeck}>
    <div className={styles.tape} data-moving={active} data-recording={phase === "record"}>
      <div className={styles.reels} aria-hidden="true"><span /><span /></div>
      <div className={styles.tapeLabel}><span>{t("flasher.soundLab.tape")}</span><strong>{phase === "record" ? t("flasher.soundLab.recording") : phase === "play" ? t("flasher.soundLab.playing") : samples ? t("flasher.soundLab.clipReady") : t("flasher.soundLab.noClip")}</strong></div>
    </div>
    <div className={styles.progress} role="progressbar" aria-label={t("flasher.soundLab.phaseProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={active ? Math.min(100, Math.round(elapsed / 20)) : 0}><span style={{ width: `${active ? Math.min(100, elapsed / 20) : 0}%` }} /></div>
    <div className={styles.transport}>
      <button type="button" className={styles.recordButton} disabled={!canCommand || active} onClick={() => send("REC")}>{t("flasher.soundLab.record")}</button>
      <button type="button" disabled={!canCommand || active || !samples} onClick={() => send(`PLAY ${volume}`)}>{t("flasher.soundLab.playClip")}</button>
      <button type="button" disabled={!canCommand || active || !samples} onClick={() => send("CLEAR")}>{t("flasher.soundLab.deleteClip")}</button>
    </div>
    <div className={styles.deckBottom}>
      <div className={styles.clapMeter}><span>{t("flasher.soundLab.recordLevel")}</span><div className={styles.meter} role="meter" aria-label={t("flasher.soundLab.recordLevel")} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={phase === "record" && level ? Math.max(-60, level.rms) : -60}><i style={{ width: `${phase === "record" && level ? meter(level.rms) : 0}%` }} /></div></div>
      <label className={styles.slider}><span>{t("flasher.soundLab.speakerVolume")} <b>{volume}%</b></span><input type="range" min="0" max="100" value={volume} aria-label={t("flasher.soundLab.speakerVolume")} disabled={active} onChange={(event) => setVolume(Number(event.target.value))} /></label>
    </div>
    <div className={styles.stats}><span>{t("flasher.soundLab.clips")}: <b>{plays.length}</b></span><span>{t("flasher.soundLab.samples")}: <b>{samples || "—"}</b></span></div>
  </div>;
}

function Spectrum({ messages }: { messages: SoundMessage[] }) {
  const { t } = useTranslation();
  const sample = messages.findLast((m): m is Extract<SoundMessage, { mode: "spectrum"; phase: "sample" }> => m.mode === "spectrum" && m.phase === "sample");
  const level = messages.findLast((m): m is Extract<SoundMessage, { mode: "spectrum"; phase: "level" }> => m.mode === "spectrum" && m.phase === "level");
  const bars = sample?.bars ?? Array(8).fill(0) as number[];
  return <div className={styles.spectrumPanel}>
    <div className={styles.spectrumSignal}>
      <span>{t("flasher.soundLab.micPeak")}: <b>{level ? level.peak.toFixed(1) : "—"} {t("flasher.soundLab.dbfs")}</b></span>
      <div className={styles.meter} role="meter" aria-label={t("flasher.soundLab.micPeak")} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={level ? Math.max(-60, level.peak) : -60}><i style={{ width: `${level ? meter(level.peak) : 0}%` }} /></div>
      <small>{t("flasher.soundLab.rms")}: {level ? level.rms.toFixed(1) : "—"} {t("flasher.soundLab.dbfs")}</small>
    </div>
    {level && level.peak <= -88 && <p className={styles.spectrumWarning}>{t("flasher.soundLab.noMicSignal")}</p>}
    <div className={styles.spectrum} aria-label={t("flasher.soundLab.spectrum")}>{bars.map((value, index) => <div className={styles.band} key={index}>
      <div role="meter" aria-label={`${BANDS[index]} Hz`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value}><span style={{ height: `${Math.max(1, value * 10)}%` }} /></div>
      <strong>{BANDS[index]}</strong><small>{value}/10</small>
    </div>)}</div>
  </div>;
}

function Game({ messages, canCommand, send }: { messages: SoundMessage[]; canCommand: boolean; send: (command: string) => void }) {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState(10);
  const [cueWindow, setCueWindow] = useState(900);
  const [sensitivity, setSensitivity] = useState(65);
  const [soundCue, setSoundCue] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);
  const allEvents = messages.filter((m): m is Extract<SoundMessage, { mode: "game" }> => m.mode === "game");
  const lastStart = allEvents.findLastIndex((event) => event.phase === "start");
  const events = lastStart < 0 ? allEvents : allEvents.slice(lastStart);
  const latest = events.findLast((event) => event.phase !== "ready");
  const configuration = events.find((event): event is Extract<SoundMessage, { mode: "game"; phase: "start" }> => event.phase === "start");
  const total = configuration?.rounds ?? rounds;
  const active = latest?.phase === "start" || latest?.phase === "go" || latest?.phase === "hit" || latest?.phase === "miss";
  const results = new Map<number, "hit" | "miss">();
  for (const event of events) if ((event.phase === "hit" || event.phase === "miss") && "round" in event) results.set(event.round, event.phase);
  const round = latest && "round" in latest ? latest.round : latest?.phase === "end" ? total : 0;
  const lastScore = events.findLast((event) => "score" in event);
  const score = lastScore && "score" in lastScore ? lastScore.score ?? 0 : 0;
  const cue = latest?.phase === "go" ? latest : null;

  useEffect(() => {
    if (!cue || !soundCue || !audioRef.current) return;
    const context = audioRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.11);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  }, [cue, soundCue]);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  function start() {
    if (soundCue && typeof window.AudioContext === "function") {
      try {
        audioRef.current ??= new window.AudioContext();
        void audioRef.current.resume();
      } catch { /* Visual cues still work if browser audio is unavailable. */ }
    }
    send(`START ${rounds} ${cueWindow} ${sensitivity}`);
  }

  return <div className={styles.game}>
    <div className={styles.gameHero}><span>{t("flasher.soundLab.round")} {round}/{total}</span><strong data-go={latest?.phase === "go"}>{latest?.phase === "go" ? t("flasher.soundLab.go") : latest?.phase === "end" ? t("flasher.soundLab.finished") : latest?.phase === "abort" ? t("flasher.soundLab.aborted") : latest?.phase === "hit" ? t("flasher.soundLab.hit") : latest?.phase === "miss" ? t("flasher.soundLab.miss") : t("flasher.soundLab.readyToPlay")}</strong><span>{t("flasher.soundLab.score")}: {score}</span></div>
    <div className={styles.rounds} aria-label={t("flasher.soundLab.rounds")}>{Array.from({ length: total }, (_, index) => <span key={index} data-result={results.get(index + 1) ?? "pending"} title={`${index + 1}: ${results.get(index + 1) ?? "—"}`}>{index + 1}</span>)}</div>
    <div className={styles.gameOptions}>
      <label>{t("flasher.soundLab.difficulty")}<select value={cueWindow} disabled={active} onChange={(event) => setCueWindow(Number(event.target.value))}><option value="1200">{t("flasher.soundLab.easy")}</option><option value="900">{t("flasher.soundLab.normal")}</option><option value="600">{t("flasher.soundLab.hard")}</option></select></label>
      <label>{t("flasher.soundLab.gameRounds")}<select value={rounds} disabled={active} onChange={(event) => setRounds(Number(event.target.value))}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></label>
      <label>{t("flasher.soundLab.sensitivity")} <b>{sensitivity}%</b><input type="range" min="0" max="100" value={sensitivity} aria-label={t("flasher.soundLab.sensitivity")} disabled={active} onChange={(event) => setSensitivity(Number(event.target.value))} /></label>
      <label className={styles.check}><input type="checkbox" checked={soundCue} onChange={(event) => setSoundCue(event.target.checked)} />{t("flasher.soundLab.browserCue")}</label>
    </div>
    <div className={styles.transport}><button type="button" disabled={!canCommand || active} onClick={start}>{latest?.phase === "end" || latest?.phase === "abort" ? t("flasher.soundLab.playAgain") : t("flasher.soundLab.startGame")}</button><button type="button" disabled={!canCommand || !active} onClick={() => send("STOP")}>{t("flasher.soundLab.stopGame")}</button></div>
  </div>;
}

function VoiceFx({ messages, phase, elapsed, canCommand, send }: { messages: SoundMessage[]; phase: string; elapsed: number; canCommand: boolean; send: (command: string) => void }) {
  const { t } = useTranslation();
  const [effect, setEffect] = useState<(typeof EFFECTS)[number]>("echo");
  const [echo, setEcho] = useState(40);
  const [toneFilter, setToneFilter] = useState<"none" | "low" | "high">("none");
  const [volume, setVolume] = useState(65);
  const plays = messages.filter((m): m is Extract<SoundMessage, { mode: "voice_fx"; phase: "play" }> => m.mode === "voice_fx" && m.phase === "play");
  const latest = plays.at(-1);
  let samples = 0;
  for (const message of messages) if (message.mode === "voice_fx") {
    if (message.phase === "record" || message.phase === "cleared") samples = 0;
    if (message.phase === "saved") samples = message.samples;
  }
  const level = messages.findLast((m): m is Extract<SoundMessage, { mode: "voice_fx"; phase: "level" }> => m.mode === "voice_fx" && m.phase === "level");
  const active = phase === "record" || phase === "play";
  const duration = latest?.effect === "chipmunk" ? 1333 : latest?.effect === "giant" ? 2857 : 2000;
  return <div className={styles.effects}>
    <div className={styles.fxHero}><span>{t("flasher.soundLab.voiceClip")}</span><strong>{phase === "record" ? t("flasher.soundLab.recording") : phase === "play" && latest ? t(`flasher.soundLab.effects.${latest.effect}`) : samples ? t("flasher.soundLab.clipReady") : t("flasher.soundLab.noClip")}</strong><span>{phase === "play" ? t("flasher.soundLab.playing") : t("flasher.soundLab.capture")}</span></div>
    <div className={styles.progress} role="progressbar" aria-label={t("flasher.soundLab.phaseProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={active ? Math.min(100, Math.round(elapsed * 100 / (phase === "record" ? 2000 : duration))) : 0}><span style={{ width: `${active ? Math.min(100, elapsed * 100 / (phase === "record" ? 2000 : duration)) : 0}%` }} /></div>
    <div className={styles.clapMeter}><span>{t("flasher.soundLab.recordLevel")}</span><div className={styles.meter} role="meter" aria-label={t("flasher.soundLab.recordLevel")} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={phase === "record" && level ? Math.max(-60, level.rms) : -60}><i style={{ width: `${phase === "record" && level ? meter(level.rms) : 0}%` }} /></div></div>
    <div className={styles.effectList} role="group" aria-label={t("flasher.soundLab.chooseEffect")}>{EFFECTS.map((choice) => <button type="button" key={choice} aria-pressed={effect === choice} onClick={() => { setEffect(choice); if (choice === "normal") setEcho(0); else if (choice === "echo" && echo === 0) setEcho(40); }} disabled={active}><span>{String(EFFECTS.indexOf(choice) + 1).padStart(2, "0")}</span><strong>{t(`flasher.soundLab.effects.${choice}`)}</strong></button>)}</div>
    <div className={styles.fxSettings}>
      <label className={styles.slider}><span>{t("flasher.soundLab.echoAmount")} <b>{echo}%</b></span><input type="range" min="0" max="80" value={echo} aria-label={t("flasher.soundLab.echoAmount")} disabled={active} onChange={(event) => setEcho(Number(event.target.value))} /></label>
      <label>{t("flasher.soundLab.filter")}<select value={toneFilter} disabled={active} onChange={(event) => setToneFilter(event.target.value as "none" | "low" | "high")}><option value="none">{t("flasher.soundLab.filters.none")}</option><option value="low">{t("flasher.soundLab.filters.low")}</option><option value="high">{t("flasher.soundLab.filters.high")}</option></select></label>
      <label className={styles.slider}><span>{t("flasher.soundLab.speakerVolume")} <b>{volume}%</b></span><input type="range" min="0" max="100" value={volume} aria-label={t("flasher.soundLab.speakerVolume")} disabled={active} onChange={(event) => setVolume(Number(event.target.value))} /></label>
    </div>
    <div className={styles.transport}><button type="button" className={styles.recordButton} disabled={!canCommand || active} onClick={() => send("REC")}>{t("flasher.soundLab.record")}</button><button type="button" disabled={!canCommand || active || !samples} onClick={() => send(`PLAY ${effect} ${echo} ${toneFilter} ${volume}`)}>{t("flasher.soundLab.playEffect")}</button><button type="button" disabled={!canCommand || active || !samples} onClick={() => send("CLEAR")}>{t("flasher.soundLab.deleteClip")}</button></div>
  </div>;
}
