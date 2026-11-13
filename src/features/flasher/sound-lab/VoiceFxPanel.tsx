import { useState } from "react";
import { useTranslation } from "react-i18next";
import { dbfsToPercent } from "../i2s-audio/level-meter";
import type { SoundMessage } from "./sound-protocol";
import {
  EFFECT_INFO,
  VOICE_EFFECTS,
  VOICE_FILTERS,
  cutoffToSlider,
  formatHz,
  playCommand,
  playMs,
  responseCurve,
  sliderToCutoff,
  type VoiceEffect,
  type VoiceFilter,
} from "./voice-fx";
import shared from "./SoundLabDialog.module.css";
import styles from "./VoiceFxPanel.module.css";

const RECORD_MS = 2000;
type FxMessage = Extract<SoundMessage, { mode: "voice_fx" }>;

// The response drawing: a log frequency axis 60 Hz..8 kHz, gain 0 to -36 dB.
const W = 320;
const H = 120;
const PAD = { left: 30, right: 8, top: 10, bottom: 22 } as const;
const FLOOR_DB = -36;
const xOf = (frequency: number) => PAD.left + ((W - PAD.left - PAD.right) * Math.log(frequency / 60)) / Math.log(8000 / 60);
const yOf = (db: number) => PAD.top + ((H - PAD.top - PAD.bottom) * Math.min(0, Math.max(FLOOR_DB, db))) / FLOOR_DB;
const GRID_HZ = [100, 300, 1000, 3000] as const;
const GRID_DB = [0, -12, -24, -36] as const;

/** The filter's gain across frequency, recomputed from the same maths the board uses. */
function ResponseCurve({ filter, cutoff }: { filter: VoiceFilter; cutoff: number }) {
  const { t, i18n } = useTranslation();
  const points = responseCurve(filter, cutoff, 72);
  const line = points.map((p, i) => `${i ? "L" : "M"} ${xOf(p.frequency).toFixed(1)} ${yOf(p.db).toFixed(1)}`).join(" ");
  const area = `${line} L ${xOf(8000)} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`;
  return (
    <svg className={styles.curve} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={t("flasher.soundLab.fx.responseLabel", { filter: t(`flasher.soundLab.fx.filters.${filter}.name`), cutoff: formatHz(cutoff, i18n.language) })}>
      {GRID_DB.map((db) => (
        <g key={db}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yOf(db)} y2={yOf(db)} className={styles.grid} />
          <text x={PAD.left - 4} y={yOf(db) + 3} textAnchor="end" className={styles.axis}>{db}</text>
        </g>
      ))}
      {GRID_HZ.map((hz) => (
        <g key={hz}>
          <line x1={xOf(hz)} x2={xOf(hz)} y1={PAD.top} y2={H - PAD.bottom} className={styles.grid} />
          <text x={xOf(hz)} y={H - 6} textAnchor="middle" className={styles.axis}>{formatHz(hz, i18n.language)}</text>
        </g>
      ))}
      <path d={area} className={styles.area} />
      <path d={line} className={styles.line} />
      {filter !== "none" ? <line x1={xOf(cutoff)} x2={xOf(cutoff)} y1={PAD.top} y2={H - PAD.bottom} className={styles.cutoff} /> : null}
    </svg>
  );
}

/** What the board is doing, from the last voice-effects message. */
function deck(messages: readonly SoundMessage[]) {
  let samples = 0;
  let last: FxMessage | undefined;
  let level: Extract<FxMessage, { phase: "level" }> | undefined;
  for (const message of messages) {
    if (message.mode !== "voice_fx") continue;
    if (message.phase === "level") { level = message; continue; }
    if (message.phase === "record" || message.phase === "cleared") samples = 0;
    if (message.phase === "saved") samples = message.samples;
    last = message;
  }
  return { samples, last, level };
}

export function VoiceFxPanel({ messages, phase, elapsed, canCommand, send }: {
  messages: SoundMessage[]; phase: string; elapsed: number; canCommand: boolean; send: (command: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [effect, setEffect] = useState<VoiceEffect>("robot");
  const [amount, setAmount] = useState(50);
  const [filter, setFilter] = useState<VoiceFilter>("none");
  const [cutoff, setCutoff] = useState(1200);
  const [volume, setVolume] = useState(65);
  const { samples, last, level } = deck(messages);
  const recording = phase === "record";
  const rendering = phase === "render";
  const playing = phase === "play";
  const busy = recording || rendering || playing;
  const info = EFFECT_INFO[effect];
  const total = recording ? RECORD_MS : last?.phase === "play" ? playMs(last.samples) : 0;
  const progress = total ? Math.min(100, (elapsed * 100) / total) : 0;
  const shownEffect = (rendering || playing) && last && "effect" in last ? last.effect : undefined;
  const title = recording ? t("flasher.soundLab.recording")
    : shownEffect ? t(`flasher.soundLab.fx.effects.${shownEffect}.name`)
    : samples ? t("flasher.soundLab.clipReady") : t("flasher.soundLab.noClip");
  const caption = recording ? t("flasher.soundLab.capture")
    : rendering ? t("flasher.soundLab.fx.rendering")
    : playing ? t("flasher.soundLab.playing")
    : samples ? t("flasher.soundLab.fx.readyHint") : t("flasher.soundLab.fx.recordHint");

  return (
    <div className={styles.panel}>
      <div className={styles.hero} data-phase={phase}>
        <span>{t("flasher.soundLab.voiceClip")}</span>
        <strong>{title}</strong>
        <small>{caption}</small>
        <div className={shared.progress} role="progressbar" aria-label={t("flasher.soundLab.phaseProgress")}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={rendering ? undefined : Math.round(progress)}
          aria-busy={rendering || undefined} data-indeterminate={rendering || undefined}>
          <span style={{ width: `${rendering ? 100 : progress}%` }} />
        </div>
        <div className={shared.clapMeter}>
          <span>{t("flasher.soundLab.recordLevel")}</span>
          <div className={shared.meter} role="meter" aria-label={t("flasher.soundLab.recordLevel")} aria-valuemin={-60} aria-valuemax={0}
            aria-valuenow={recording && level ? Math.max(-60, level.rms) : -60}>
            <i style={{ width: `${recording && level ? dbfsToPercent(level.rms) : 0}%` }} />
          </div>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="fx-effects">
        <h3 id="fx-effects">{t("flasher.soundLab.fx.effectSection")}</h3>
        <div className={styles.effects} role="group" aria-labelledby="fx-effects">
          {VOICE_EFFECTS.map((choice) => (
            <button type="button" key={choice} aria-pressed={effect === choice} disabled={busy} onClick={() => setEffect(choice)}>
              <strong>{t(`flasher.soundLab.fx.effects.${choice}.name`)}</strong>
              <span>{t(`flasher.soundLab.fx.techniques.${EFFECT_INFO[choice].technique}`)}</span>
            </button>
          ))}
        </div>
        <p className={styles.explain}>{t(`flasher.soundLab.fx.effects.${effect}.hint`)}</p>
        <label className={shared.slider} data-off={!info.adjustable || undefined}>
          <span>{info.adjustable ? t(`flasher.soundLab.fx.effects.${effect}.amount`) : t("flasher.soundLab.fx.noAmount")} <b>{info.adjustable ? `${amount}%` : "—"}</b></span>
          <input type="range" min="0" max="100" value={amount} disabled={busy || !info.adjustable}
            aria-label={t("flasher.soundLab.fx.intensity")} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
      </section>

      <section className={styles.section} aria-labelledby="fx-filter">
        <h3 id="fx-filter">{t("flasher.soundLab.fx.filterSection")}</h3>
        <div className={styles.filterGrid}>
          <div className={styles.filterControls}>
            <div className={styles.segments} role="group" aria-labelledby="fx-filter">
              {VOICE_FILTERS.map((choice) => (
                <button type="button" key={choice} aria-pressed={filter === choice} disabled={busy} onClick={() => setFilter(choice)}>
                  {t(`flasher.soundLab.fx.filters.${choice}.name`)}
                </button>
              ))}
            </div>
            <p className={styles.explain}>{t(`flasher.soundLab.fx.filters.${filter}.hint`)}</p>
            <label className={shared.slider} data-off={filter === "none" || undefined}>
              <span>{t(filter === "band" ? "flasher.soundLab.fx.center" : "flasher.soundLab.fx.cutoff")} <b>{formatHz(cutoff, i18n.language)}</b></span>
              <input type="range" min="0" max="100" value={cutoffToSlider(cutoff)} disabled={busy || filter === "none"}
                aria-label={t("flasher.soundLab.fx.cutoff")} aria-valuetext={formatHz(cutoff, i18n.language)}
                onChange={(event) => setCutoff(sliderToCutoff(Number(event.target.value)))} />
            </label>
          </div>
          <ResponseCurve filter={filter} cutoff={cutoff} />
        </div>
      </section>

      <label className={shared.slider}>
        <span>{t("flasher.soundLab.speakerVolume")} <b>{volume}%</b></span>
        <input type="range" min="0" max="100" value={volume} disabled={busy}
          aria-label={t("flasher.soundLab.speakerVolume")} onChange={(event) => setVolume(Number(event.target.value))} />
      </label>

      <div className={shared.transport}>
        <button type="button" className={shared.recordButton} disabled={!canCommand || busy} onClick={() => send("REC")}>{t("flasher.soundLab.record")}</button>
        <button type="button" disabled={!canCommand || busy || !samples}
          onClick={() => send(playCommand({ effect, amount, filter, cutoff, volume }))}>{t("flasher.soundLab.playEffect")}</button>
        <button type="button" disabled={!canCommand || busy || !samples} onClick={() => send("CLEAR")}>{t("flasher.soundLab.deleteClip")}</button>
      </div>
    </div>
  );
}
