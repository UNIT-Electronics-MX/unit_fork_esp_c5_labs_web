import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StageBox } from "@/ui/stage3d/StageBox";
import { useStage3d } from "@/ui/stage3d/use-stage";
import { LineSplitter, RateMeter } from "../imu-cube/imu-protocol";
import { serialConnection } from "../serial-connection";
import { P4DataFlow, type P4Feed } from "./P4DataFlow";
import { droneControls, FlowTracker, lightLevel, relativeAltitude, type DroneControls } from "./p4-insights";
import { parseP4Line, type P4Sample } from "./p4-protocol";
import { buildP4Scene, p4Stage, type P4Scene } from "./p4-scene";
import styles from "./P4SensorViewer.module.css";

const STALE_MS = 2000;

interface Reading {
  readonly sample: P4Sample;
  readonly controls: DroneControls;
  readonly baseline: number | null;
}

/** The P4 drone, the data flow and one card per sensor, all fed by p4_sensor_stream.py. */
export function P4SensorViewer() {
  const { t, i18n } = useTranslation();
  const [reading, setReading] = useState<Reading | null>(null);
  const [feed, setFeed] = useState<P4Feed>("waiting");
  const [rate, setRate] = useState(0);
  const [flow, setFlow] = useState({ lines: 0, lost: 0 });
  const [warning, setWarning] = useState("");
  const latestRef = useRef<P4Sample | null>(null);
  const baselineRef = useRef<number | null>(null);
  const sceneRef = useRef<P4Scene | null>(null);
  const stage = useStage3d(p4Stage, (T, S) => {
    const scene = buildP4Scene(T, S, { north: t("flasher.p4Sensors.north") });
    sceneRef.current = scene;
    if (latestRef.current) scene.setControls(droneControls(latestRef.current, baselineRef.current));
  });

  /** Recomputes what the drone shows from a sample and hands it to the scene and the cards. */
  function show(sample: P4Sample) {
    if (baselineRef.current === null && sample.pressure) baselineRef.current = sample.pressure.hpa;
    const controls = droneControls(sample, baselineRef.current);
    latestRef.current = sample;
    sceneRef.current?.setControls(controls);
    setReading({ sample, controls, baseline: baselineRef.current });
  }

  const receive = useEffectEvent((sample: P4Sample) => show(sample));

  useEffect(() => {
    const lines = new LineSplitter();
    const meter = new RateMeter();
    const tracker = new FlowTracker();
    let lastSample = 0;
    const unsubscribe = serialConnection.subscribeText((text) => {
      for (const line of lines.push(text)) {
        const parsed = parseP4Line(line);
        if (parsed) {
          lastSample = performance.now();
          meter.add(lastSample);
          tracker.add(parsed.sequence);
          receive(parsed);
          setFlow({ lines: tracker.lines, lost: tracker.lost });
          setFeed("live");
          if (parsed.mask === 31) setWarning("");
        } else if (line.startsWith("P4_WARN,")) {
          setWarning(line.slice(8).trim());
        }
      }
    });
    const watch = window.setInterval(() => {
      const now = performance.now();
      setRate(Math.round(meter.rate(now)));
      if (lastSample && now - lastSample > STALE_MS) setFeed("stale");
    }, 500);
    return () => {
      unsubscribe();
      window.clearInterval(watch);
    };
  }, []);

  function zeroAltitude() {
    const sample = latestRef.current;
    if (!sample?.pressure) return;
    baselineRef.current = sample.pressure.hpa;
    show(sample);
  }

  const format = (value: number, digits: number) => new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(value);
  const signed = (value: number, digits: number) => new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: "exceptZero",
  }).format(value);
  const sample = reading?.sample ?? null;
  const controls = reading?.controls ?? null;
  const battery = controls?.battery ?? null;
  const altitude = sample?.pressure && reading?.baseline ? relativeAltitude(sample.pressure.hpa, reading.baseline) : null;

  const sensors = [
    { key: "climate", name: t("flasher.p4Sensors.climate"), chip: "FHT40 · 0x44", effect: t("flasher.p4Sensors.effects.climate"),
      ready: Boolean(sample?.climate),
      primary: sample?.climate ? `${format(sample.climate.temperature, 1)} °C` : "",
      secondary: sample?.climate ? `${t("flasher.p4Sensors.humidity")} ${format(sample.climate.humidity, 1)} %` : "" },
    { key: "pressure", name: t("flasher.p4Sensors.pressure"), chip: "LPS22HB · 0x5C", effect: t("flasher.p4Sensors.effects.pressure"),
      ready: Boolean(sample?.pressure),
      primary: sample?.pressure ? `${format(sample.pressure.hpa, 2)} hPa` : "",
      secondary: altitude !== null ? t("flasher.p4Sensors.altitude", { value: signed(altitude, 2) }) : "" },
    { key: "light", name: t("flasher.p4Sensors.light"), chip: "VCNL4040 · 0x60", effect: t("flasher.p4Sensors.effects.light"),
      ready: Boolean(sample?.light),
      primary: sample?.light ? `${format(sample.light.lux, 1)} lux` : "",
      secondary: sample?.light
        ? `${t(`flasher.p4Sensors.lightLevel.${lightLevel(sample.light.lux)}`)} · ${t("flasher.p4Sensors.proximity")} ${format(sample.light.proximity, 0)}`
        : "" },
    { key: "battery", name: t("flasher.p4Sensors.battery"), chip: "MAX17048 · 0x36", effect: t("flasher.p4Sensors.effects.battery"),
      ready: Boolean(sample?.battery && battery),
      primary: sample?.battery && battery
        ? battery.state === "noCell" ? t("flasher.p4Sensors.batteryState.noCell")
          : `${battery.state === "overRange" ? "≈" : ""}${format(battery.percent, 0)} %`
        : "",
      secondary: sample?.battery && battery
        ? `${format(sample.battery.volts, 2)} V · ${t(`flasher.p4Sensors.batteryState.${battery.state}`, { gauge: format(battery.gauge, 0) })}`
        : "",
      state: battery?.state },
    { key: "magnetic", name: t("flasher.p4Sensors.magnetic"), chip: "MMC5603 · 0x30", effect: t("flasher.p4Sensors.effects.magnetic"),
      ready: Boolean(sample?.magnetic),
      primary: controls?.heading !== null && controls?.heading !== undefined ? `${format(controls.heading, 0)}°` : "",
      secondary: sample?.magnetic
        ? `X ${format(sample.magnetic[0], 0)} · Y ${format(sample.magnetic[1], 0)} · Z ${format(sample.magnetic[2], 0)}`
        : "" },
  ];

  return (
    <section className={styles.viewer} aria-label={t("flasher.p4Sensors.title")} data-feed={feed}>
      <div className={styles.flowRow}>
        <P4DataFlow sample={sample} feed={feed} lines={flow.lines} lost={flow.lost} rate={rate} />
      </div>
      <div className={styles.visual}>
        <StageBox {...stage} label={t("flasher.p4Sensors.sceneLabel")} fallback={t("flasher.p4Sensors.sceneFallback")} className={styles.stage} />
        <p className={styles.legend}>{t("flasher.p4Sensors.sceneLegend")}</p>
      </div>
      <div className={styles.panel}>
        <div className={styles.status}>
          <p role="status">{t(`flasher.p4Sensors.feed.${feed}`)}</p>
          <button type="button" disabled={!sample?.pressure} onClick={zeroAltitude}>{t("flasher.p4Sensors.zeroAltitude")}</button>
        </div>
        <dl className={styles.cards}>
          {sensors.map((sensor) => (
            <div key={sensor.key} className={styles.card} data-ready={sensor.ready} data-battery={sensor.state}>
              <dt><span>{sensor.name}</span><small className={styles.chip}>{sensor.chip}</small><small className={styles.effect}>{sensor.effect}</small></dt>
              <dd>
                <strong>{sensor.ready ? sensor.primary : t("flasher.p4Sensors.noReading")}</strong>
                {sensor.ready ? <small>{sensor.secondary}</small> : null}
              </dd>
            </div>
          ))}
        </dl>
        {battery?.state === "overRange" ? (
          <p className={styles.note}>{t("flasher.p4Sensors.batteryNote", { gauge: format(battery.gauge, 0) })}</p>
        ) : null}
        {warning ? <p className={styles.warning} role="alert">{warning}</p> : null}
      </div>
    </section>
  );
}
