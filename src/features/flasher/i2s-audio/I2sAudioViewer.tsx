import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { serialConnection, useSerialConnection } from "../serial-connection";
import { AudioScope } from "./AudioScope";
import { HudDial } from "./HudDial";
import { CLIP_LEVEL, dbfsToPercent, PeakHold, peakDbfs, SampleRing } from "./level-meter";
import { PcmPlayer } from "./pcm-player";
import { PcmProtocol, pcmLevel } from "./pcm-protocol";
import styles from "./I2sAudioViewer.module.css";

type Feed = "idle" | "waiting" | "live" | "silent" | "stale";
const GAIN_STEPS = [1, 2, 4, 8, 16] as const;
/** Readouts repaint this often; the scope draws on its own frame loop. */
const PAINT_MS = 100;
/** The clip badge stays lit this long after the last clipped frame. */
const CLIP_SHOW_MS = 1500;

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

/** The microphone's binary USB stream, listened to in the browser. */
export function I2sAudioViewer() {
  const { t } = useTranslation();
  const { state, rawMode } = useSerialConnection();
  const [feed, setFeed] = useState<Feed>("idle");
  const [peak, setPeak] = useState(0);
  const [dbfs, setDbfs] = useState(-120);
  const [hold, setHold] = useState(-Infinity);
  const [clipped, setClipped] = useState(false);
  const [resyncs, setResyncs] = useState(0);
  const [rebuffers, setRebuffers] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gainStep, setGainStep] = useState(0);
  const [error, setError] = useState("");
  const [ring] = useState(() => new SampleRing());
  const [peakHold] = useState(() => new PeakHold());
  const playerRef = useRef<PcmPlayer | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastSignalRef = useRef(0);
  const lastClipRef = useRef(-Infinity);
  const lastPaintRef = useRef(0);
  const readyRef = useRef(false);
  const stoppingRef = useRef(false);

  function clearWatch() {
    if (retryRef.current) clearInterval(retryRef.current);
    retryRef.current = null;
  }

  function resetReadouts() {
    ring.clear();
    peakHold.reset();
    setPeak(0);
    setDbfs(-120);
    setHold(-Infinity);
    setClipped(false);
    setResyncs(0);
    setRebuffers(0);
    setSeconds(0);
  }

  async function stop() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    clearWatch();
    try {
      if (serialConnection.getSnapshot().rawMode) await serialConnection.stopRawPython();
    } catch (cause) {
      setError(message(cause));
    } finally {
      const player = playerRef.current;
      playerRef.current = null;
      if (player) await player.stop();
      setFeed("idle");
      stoppingRef.current = false;
    }
  }

  function requestStream() {
    void serialConnection.sendRawCommand("R").catch((cause: unknown) => setError(message(cause)));
  }

  async function start() {
    setError("");
    resetReadouts();
    const player = new PcmPlayer();
    try {
      // A user click creates and resumes AudioContext before any serial awaits.
      player.setGain(GAIN_STEPS[gainStep] ?? 1);
      await player.start();
      const parser = new PcmProtocol();
      serialConnection.startRaw((chunk) => {
        const packet = parser.push(chunk);
        if (packet.ready) readyRef.current = true;
        if (packet.resyncs) setResyncs((count) => count + packet.resyncs);
        for (const frame of packet.frames) {
          if (player.enqueue(frame)) setRebuffers((count) => count + 1);
          ring.push(frame);
          const now = performance.now();
          const level = pcmLevel(frame);
          lastFrameRef.current = now;
          if (level.signal) lastSignalRef.current = now;
          if (level.peak >= CLIP_LEVEL) lastClipRef.current = now;
          const held = peakHold.update(peakDbfs(level.peak), now);
          if (now - lastPaintRef.current >= PAINT_MS) {
            setPeak(level.peak);
            setDbfs(level.dbfs);
            setHold(held);
            setClipped(now - lastClipRef.current < CLIP_SHOW_MS);
            setFeed(now - lastSignalRef.current < 1000 ? "live" : "silent");
            lastPaintRef.current = now;
          }
        }
      });
      playerRef.current = player;
      readyRef.current = false;
      startedRef.current = performance.now();
      lastFrameRef.current = startedRef.current;
      lastSignalRef.current = 0;
      lastClipRef.current = -Infinity;
      setFeed("waiting");
      await serialConnection.sendRawCommand("R");
      retryRef.current = setInterval(() => {
        const now = performance.now();
        setSeconds(Math.floor((now - startedRef.current) / 1000));
        if (!serialConnection.connected) {
          clearWatch();
          setFeed("stale");
          return;
        }
        if (now - lastFrameRef.current > 1500) {
          setFeed("stale");
          requestStream();
        } else if (!readyRef.current) {
          requestStream();
        }
      }, 500);
    } catch (cause) {
      setError(message(cause));
      if (serialConnection.getSnapshot().rawMode) await stop();
      else await player.stop();
    }
  }

  function chooseGain(step: number) {
    setGainStep(step);
    playerRef.current?.setGain(GAIN_STEPS[step] ?? 1);
  }

  useEffect(() => () => {
    clearWatch();
    if (serialConnection.getSnapshot().rawMode) void serialConnection.stopRawPython().catch(() => {});
    void playerRef.current?.stop();
    playerRef.current = null;
  }, []);

  const listening = rawMode;
  const connected = state === "connected";
  const level = dbfsToPercent(dbfs);
  const holdAt = dbfsToPercent(hold);
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <section className={styles.viewer} aria-label={t("flasher.i2sAudio.title")}>
      <p className={styles.intro}>{t("flasher.i2sAudio.intro")}</p>
      {!connected && !listening ? <p className={styles.hint}>{t("flasher.i2sAudio.connectFirst")}</p> : null}

      <div className={styles.hud} data-feed={feed} data-listening={listening}>
        <header className={styles.hudBar}>
          <p className={styles.feed} role="status">
            <span className={styles.dot} aria-hidden="true" />
            {t(`flasher.i2sAudio.feed.${feed}`)}
          </p>
          <span className={styles.clip} data-on={clipped}>{t("flasher.i2sAudio.clip")}</span>
        </header>

        <div className={styles.hudMain}>
          <dl className={`${styles.readouts} ${styles.readoutsStart}`}>
            <div><dt>{t("flasher.i2sAudio.peak")}</dt><dd>{peak}</dd></div>
            <div><dt>{t("flasher.i2sAudio.lost")}</dt><dd>{resyncs + rebuffers}</dd></div>
          </dl>
          <HudDial ring={ring} active={listening} level={level} hold={holdAt} label={t("flasher.i2sAudio.scope")}>
            <div
              className={styles.dialValue}
              role="meter"
              aria-label={t("flasher.i2sAudio.level")}
              aria-valuemin={-60}
              aria-valuemax={0}
              aria-valuenow={Math.max(-60, Math.round(dbfs))}
              aria-valuetext={t("flasher.i2sAudio.levelValue", { db: dbfs.toFixed(1) })}
            >
              <span className={styles.dialNumber}>{dbfs <= -120 ? "–" : dbfs.toFixed(1)}</span>
              <span className={styles.dialUnit}>{t("flasher.i2sAudio.unit")}</span>
            </div>
          </HudDial>
          <dl className={`${styles.readouts} ${styles.readoutsEnd}`}>
            <div><dt>{t("flasher.i2sAudio.elapsed")}</dt><dd>{elapsed}</dd></div>
            <div><dt>{t("flasher.i2sAudio.gain")}</dt><dd>{t("flasher.i2sAudio.gainStep", { factor: GAIN_STEPS[gainStep] ?? 1 })}</dd></div>
          </dl>
        </div>

        <AudioScope ring={ring} active={listening} label={t("flasher.i2sAudio.scope")} />

        <div className={styles.hudControls}>
          <button
            className={styles.primary}
            type="button"
            data-listening={listening}
            disabled={!listening && !connected}
            onClick={() => void (listening ? stop() : start())}
          >
            {listening ? t("flasher.i2sAudio.stop") : t("flasher.i2sAudio.listen")}
          </button>
          <fieldset className={styles.gain}>
            <legend>{t("flasher.i2sAudio.gain")}</legend>
            <div className={styles.gainSteps}>
              {GAIN_STEPS.map((factor, step) => (
                <button
                  key={factor}
                  type="button"
                  aria-pressed={step === gainStep}
                  aria-label={t("flasher.i2sAudio.gainValue", { factor, db: Math.round(20 * Math.log10(factor)) })}
                  onClick={() => chooseGain(step)}
                >
                  {t("flasher.i2sAudio.gainStep", { factor })}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <p className={styles.note}>{t("flasher.i2sAudio.gainNote")}</p>
      <p className={styles.note}>{t("flasher.i2sAudio.gapBreakdown", { packets: resyncs, playback: rebuffers })}</p>
      <p className={styles.note}>{t("flasher.i2sAudio.gapNote")}</p>
      <p className={styles.note}>{t("flasher.i2sAudio.signalNote")}</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
