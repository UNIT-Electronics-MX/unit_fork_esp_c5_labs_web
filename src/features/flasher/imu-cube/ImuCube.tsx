import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Button, ButtonRow } from "@/ui/Button";
import { StageBox } from "@/ui/stage3d/StageBox";
import { useStage3d } from "@/ui/stage3d/use-stage";
import { serialConnection } from "../serial-connection";
import { buildImuCubeScene, imuCubeStage, type ImuCubeScene } from "./imu-cube-scene";
import { eulerToQuaternion, LineSplitter, parseImuLine, RateMeter, type ImuCommand } from "./imu-protocol";
import styles from "./ImuCube.module.css";

type Feed = "waiting" | "live" | "stale";
type Notice = "" | "calibrated" | "zeroed";

/** No line for this long means the script stopped. */
const STALE_MS = 1500;

const canCommand = () => serialConnection.connected && !serialConnection.getSnapshot().operation;

/**
 * A 3D cube that follows bmi270_cube.py: it listens to the app's serial connection, turns with each
 * IMU line and sends the script's one-letter commands back (the same protocol a Processing sketch uses).
 */
export function ImuCube({ focused = false }: { focused?: boolean }) {
  const { t } = useTranslation();
  const sceneRef = useRef<ImuCubeScene | null>(null);
  const rollRef = useRef<HTMLElement>(null);
  const pitchRef = useRef<HTMLElement>(null);
  const yawRef = useRef<HTMLElement>(null);
  const rateRef = useRef<HTMLElement>(null);
  const [feed, setFeed] = useState<Feed>("waiting");
  const [notice, setNotice] = useState<Notice>("");
  const [sendError, setSendError] = useState("");
  const ready = useSyncExternalStore(serialConnection.subscribe, canCommand, canCommand);
  const stage = useStage3d(imuCubeStage, (T, S) => {
    sceneRef.current = buildImuCubeScene(T, S);
  });

  useEffect(() => {
    const lines = new LineSplitter();
    const meter = new RateMeter();
    let lastSample = 0;
    // Readouts are written straight into nodes React leaves empty: 50 lines a second need no render.
    const write = (node: HTMLElement | null, text: string) => {
      if (node) node.textContent = text;
    };
    const unsubscribe = serialConnection.subscribeText((text) => {
      for (const line of lines.push(text)) {
        const message = parseImuLine(line);
        if (!message) continue;
        if (message.kind === "ack") {
          setNotice(message.command === "c" ? "calibrated" : "zeroed");
          continue;
        }
        lastSample = performance.now();
        meter.add(lastSample);
        sceneRef.current?.setTarget(eulerToQuaternion(message.roll, message.pitch, message.yaw));
        write(rollRef.current, `${message.roll.toFixed(1)}°`);
        write(pitchRef.current, `${message.pitch.toFixed(1)}°`);
        write(yawRef.current, `${message.yaw.toFixed(1)}°`);
        setFeed("live");
      }
    });
    const watch = window.setInterval(() => {
      const now = performance.now();
      write(rateRef.current, meter.rate(now).toFixed(0));
      if (lastSample && now - lastSample > STALE_MS) setFeed("stale");
    }, 500);
    return () => {
      unsubscribe();
      window.clearInterval(watch);
    };
  }, []);

  async function send(command: ImuCommand) {
    setSendError("");
    setNotice("");
    try {
      await serialConnection.send(command, "none");
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className={styles.cube} aria-labelledby={focused ? "imu-viewer-title" : "imu-cube-title"} data-focused={focused || undefined}>
      {focused ? null : <header className={styles.head}>
        <h2 id="imu-cube-title">{t("flasher.imuCube.title")}</h2>
        <p>{t("flasher.imuCube.intro")}</p>
      </header>}
      <StageBox
        {...stage}
        label={t("flasher.imuCube.label")}
        fallback={t("flasher.imuCube.fallback")}
        className={styles.stage}
      />
      <dl className={styles.readouts}>
        <div>
          <dt>{t("flasher.imuCube.roll")}</dt>
          <dd ref={rollRef} />
        </div>
        <div>
          <dt>{t("flasher.imuCube.pitch")}</dt>
          <dd ref={pitchRef} />
        </div>
        <div>
          <dt>{t("flasher.imuCube.yaw")}</dt>
          <dd ref={yawRef} />
        </div>
        <div>
          <dt>{t(focused ? "flasher.imuCube.rateShort" : "flasher.imuCube.rate")}</dt>
          <dd ref={rateRef} />
        </div>
      </dl>
      <ButtonRow>
        <Button disabled={!ready} onClick={() => void send("c")}>
          {t(focused ? "flasher.imuCube.calibrateShort" : "flasher.imuCube.calibrate")}
        </Button>
        <Button disabled={!ready} onClick={() => void send("z")}>
          {t(focused ? "flasher.imuCube.zeroYawShort" : "flasher.imuCube.zeroYaw")}
        </Button>
      </ButtonRow>
      <p className={styles.status} role="status" data-feed={feed}>
        <span className={styles.feed}>{t(`flasher.imuCube.feed.${feed}`)}</span>
        {notice ? <span className={styles.notice}>{t(`flasher.imuCube.${notice}`)}</span> : null}
      </p>
      {sendError ? (
        <p className={styles.error} role="alert">{t("flasher.imuCube.sendFailed", { detail: sendError })}</p>
      ) : null}
    </section>
  );
}
