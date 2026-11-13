import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { LineSplitter } from "../imu-cube/imu-protocol";
import { serialConnection, useSerialConnection } from "../serial-connection";
import frame from "../MicroPythonWorkbench.module.css";
import styles from "./AudioPlayerDialog.module.css";
import { BUNDLED_TRACKS, type BundledTrack } from "./bundled-tracks";
import { DecodeError, decodeToMono } from "./decode-audio";
import { clock, overview, streamKilobytes } from "./pcm-convert";
import { SAMPLE_RATES, type SampleRate } from "./play-protocol";
import { SerialPcmStreamer, StreamError } from "./serial-pcm-streamer";

const BINS = 160;
const QUALITY: Readonly<Record<SampleRate, "voice" | "standard" | "high">> = { 16000: "voice", 22050: "standard", 32000: "high" };

const reasonOf = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

interface Clip {
  readonly name: string;
  readonly pcm: Int16Array;
}

/** Choose a WAV or MP3, convert it in the browser and play it on the board's ES8311 speaker over serial. */
export function AudioPlayerDialog({ onClose, onConnect }: { onClose: () => void; onConnect: () => void }) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetchRef = useRef<AbortController | null>(null);
  const streamerRef = useRef<SerialPcmStreamer | null>(null);
  const requestRef = useRef(0);
  const { state, operation, rawMode } = useSerialConnection();
  const connected = state === "connected";
  const [file, setFile] = useState<File | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [rate, setRate] = useState<SampleRate>(22_050);
  const [normalize, setNormalize] = useState(true);
  const [volume, setVolume] = useState(70);
  const [clip, setClip] = useState<Clip | null>(null);
  const [converting, setConverting] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const canPlay = connected && ready && !!clip && !converting && !operation && !rawMode && !playing;
  const peaks = useMemo(() => (clip ? overview(clip.pcm, BINS) : null), [clip]);
  const total = clip ? clip.pcm.length / rate : 0;

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
      if (text.includes(">>> ")) setReady(false);
      for (const line of lines.push(text)) if (line === "PLAYER,READY") setReady(true);
    });
  }, []);

  useEffect(() => serialConnection.subscribe(() => {
    if (serialConnection.getSnapshot().state !== "connected") setReady(false);
  }), []);

  useEffect(() => () => {
    requestRef.current++;
    fetchRef.current?.abort();
    abortRef.current?.abort();
  }, []);

  /** Decodes and resamples; a newer request makes any older one still running irrelevant. */
  async function convert(source: File, nextRate: SampleRate, nextNormalize: boolean) {
    const id = ++requestRef.current;
    setConverting(true);
    setError("");
    try {
      const pcm = await decodeToMono(source, nextRate, nextNormalize);
      if (id !== requestRef.current) return;
      setClip({ name: source.name, pcm });
      setPlayed(0);
    } catch (cause) {
      if (id !== requestRef.current) return;
      setClip(null);
      setError(t(cause instanceof DecodeError ? `flasher.audioPlayer.errors.${cause.reason}` : "flasher.audioPlayer.errors.unreadable"));
    } finally {
      if (id === requestRef.current) setConverting(false);
    }
  }

  function choose(next: File | undefined) {
    if (!next || playing) return;
    fetchRef.current?.abort();
    setSelectedTrack(null);
    setFile(next);
    void convert(next, rate, normalize);
  }

  async function chooseBundled(track: BundledTrack) {
    if (playing) return;
    fetchRef.current?.abort();
    const controller = new AbortController();
    fetchRef.current = controller;
    const id = ++requestRef.current;
    setSelectedTrack(track.id);
    setFile(null);
    setClip(null);
    setConverting(true);
    setError("");
    try {
      const response = await fetch(track.url, { signal: controller.signal });
      if (!response.ok) throw new Error("Track unavailable");
      const blob = await response.blob();
      if (id !== requestRef.current) return;
      const bundled = new File([blob], t(`flasher.audioPlayer.tracks.${track.id}.title`), { type: "audio/mpeg" });
      setFile(bundled);
      await convert(bundled, rate, normalize);
    } catch {
      if (id !== requestRef.current) return;
      setConverting(false);
      setError(t("flasher.audioPlayer.errors.bundledUnavailable"));
    } finally {
      if (fetchRef.current === controller) fetchRef.current = null;
    }
  }

  function chooseRate(next: SampleRate) {
    setRate(next);
    if (file) void convert(file, next, normalize);
  }

  function chooseNormalize(next: boolean) {
    setNormalize(next);
    if (file) void convert(file, rate, next);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    choose(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }

  async function play() {
    if (!clip || !canPlay) return;
    const abort = new AbortController();
    abortRef.current = abort;
    const streamer = new SerialPcmStreamer({ sendBytes: (bytes) => serialConnection.sendBytes(bytes) });
    streamerRef.current = streamer;
    setError("");
    setPlayed(0);
    setPlaying(true);
    try {
      serialConnection.startRaw(streamer.receive);
      await streamer.play(clip.pcm, rate, { volume, signal: abort.signal, onProgress: setPlayed });
    } catch (cause) {
      setError(cause instanceof StreamError ? t(`flasher.audioPlayer.errors.${cause.reason}`) : reasonOf(cause));
    } finally {
      streamerRef.current = null;
      abortRef.current = null;
      serialConnection.endRaw();
      setPlaying(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function changeVolume(next: number) {
    setVolume(next);
    if (playing) {
      const streamer = streamerRef.current;
      void streamer?.setVolume(next).catch(() => {
        if (streamerRef.current === streamer) setError(t("flasher.audioPlayer.errors.volumeFailed"));
      });
    }
  }

  async function close() {
    fetchRef.current?.abort();
    abortRef.current?.abort();
    onClose();
  }

  const statusKey = !connected ? "connectFirst" : playing ? "playing" : ready ? "ready" : "waiting";
  const progress = clip?.pcm.length ? Math.min(1, played / clip.pcm.length) : 0;

  return (
    <dialog ref={dialogRef} className={frame.viewerDialog} aria-labelledby="audio-player-title"
      onCancel={(event) => { event.preventDefault(); void close(); }}>
      <header className={frame.viewerDialogHead}>
        <div>
          <h2 id="audio-player-title">{t("flasher.audioPlayer.title")}</h2>
          <span data-connected={connected}>{t(`flasher.serial.state.${state}`)}</span>
        </div>
        <div className={frame.viewerDialogActions}>
          {!connected ? <button type="button" onClick={onConnect} disabled={state === "connecting" || state === "disconnecting"}>{t("flasher.serial.connect")}</button> : null}
          <button type="button" className={frame.viewerDialogClose} onClick={() => void close()}>{t("flasher.audioPlayer.backToCode")}</button>
        </div>
      </header>
      <div className={frame.viewerDialogBody}>
        <div className={styles.player}>
          <section className={styles.stage} data-playing={playing} aria-label={t("flasher.audioPlayer.stage")}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)} onDrop={onDrop} data-dragging={dragging || undefined}>
            <div className={styles.stageTop}>
              <span className={styles.eyebrow}>ES8311 · I²S OUT</span>
              <span className={styles.signal} data-live={playing}>{playing ? t("flasher.audioPlayer.sounding") : t("flasher.audioPlayer.silent")}</span>
            </div>
            {clip ? (
              <>
                <h3 className={styles.title}>{clip.name}</h3>
                <p className={styles.time}><strong>{clock(played / rate)}</strong> / {clock(total)}</p>
                <div className={styles.scope} role="progressbar" aria-label={t("flasher.audioPlayer.progress")}
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                  <svg viewBox={`0 0 ${BINS} 60`} preserveAspectRatio="none" aria-hidden="true">
                    {peaks ? Array.from(peaks, (peak, i) => {
                      const height = Math.max(1.5, peak * 56);
                      return <rect key={i} x={i + 0.15} y={30 - height / 2} width="0.7" height={height} data-past={i / BINS < progress || undefined} />;
                    }) : null}
                  </svg>
                  <span className={styles.head} style={{ insetInlineStart: `${progress * 100}%` }} />
                </div>
              </>
            ) : (
              <label className={styles.drop}>
                <input type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac" onChange={onPick} disabled={playing} />
                <strong>{converting ? t("flasher.audioPlayer.converting") : t("flasher.audioPlayer.dropHint")}</strong>
                <span>{t("flasher.audioPlayer.formats")}</span>
              </label>
            )}
            <p className={styles.hint}>{t("flasher.audioPlayer.streamNote", { kb: streamKilobytes(rate) })}</p>
          </section>

          <div className={styles.controls}>
            <p className={styles.status} role="status">{t(`flasher.audioPlayer.status.${statusKey}`)}</p>
            <section className={styles.library} aria-labelledby="audio-player-library-title">
              <div className={styles.libraryHead}>
                <h3 id="audio-player-library-title">{t("flasher.audioPlayer.bundledTitle")}</h3>
                <p>{t("flasher.audioPlayer.bundledHint")}</p>
              </div>
              <div className={styles.trackList}>
                {BUNDLED_TRACKS.map((track) => <button key={track.id} type="button" disabled={playing}
                  aria-pressed={selectedTrack === track.id} onClick={() => void chooseBundled(track)}>
                  <span className={styles.trackIcon} aria-hidden="true">♫</span>
                  <span className={styles.trackText}><strong>{t(`flasher.audioPlayer.tracks.${track.id}.title`)}</strong>
                    <small>{t(`flasher.audioPlayer.tracks.${track.id}.style`)}</small></span>
                  <span className={styles.trackDuration}>{clock(track.seconds)}</span>
                </button>)}
              </div>
            </section>
            <div className={styles.transport}>
              <button type="button" className={styles.play} disabled={!canPlay} onClick={() => void play()}>{t("flasher.audioPlayer.play")}</button>
              <button type="button" disabled={!playing} onClick={stop}>{t("flasher.audioPlayer.stop")}</button>
              <label className={styles.choose}>
                <input type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac" onChange={onPick} disabled={playing} />
                {t(clip ? "flasher.audioPlayer.another" : "flasher.audioPlayer.choose")}
              </label>
            </div>
            {converting && clip ? <p className={styles.busy}>{t("flasher.audioPlayer.converting")}</p> : null}
            <div className={styles.settings}>
              <label>
                <span>{t("flasher.audioPlayer.volume")} <output>{volume}%</output></span>
                <input type="range" min="0" max="100" step="1" value={volume} aria-label={t("flasher.audioPlayer.volume")} onChange={(event) => changeVolume(Number(event.target.value))} />
              </label>
              <fieldset className={styles.quality} disabled={playing || converting}>
                <legend>{t("flasher.audioPlayer.quality")}</legend>
                {SAMPLE_RATES.map((choice) => (
                  <button key={choice} type="button" aria-pressed={rate === choice} onClick={() => chooseRate(choice)}>
                    {t(`flasher.audioPlayer.qualities.${QUALITY[choice]}`)}
                  </button>
                ))}
              </fieldset>
              <label className={styles.check}>
                <input type="checkbox" checked={normalize} disabled={playing || converting} onChange={(event) => chooseNormalize(event.target.checked)} />
                <span>{t("flasher.audioPlayer.normalize")}</span>
              </label>
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </div>
        </div>
      </div>
      <p className={styles.footer}>{t("flasher.audioPlayer.wiring")}</p>
    </dialog>
  );
}
