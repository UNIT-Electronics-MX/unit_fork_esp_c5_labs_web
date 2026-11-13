import { useEffect, useRef } from "react";
import { definePalette } from "@/lib/palette";
import { waveformColumns, type SampleRing } from "./level-meter";
import styles from "./I2sAudioViewer.module.css";

const palette = definePalette({ wave: "--hud-cyan", glow: "--hud-glow", axis: "--hud-cyan-line", grid: "--scope-grid" });
/** With reduced motion the scope still updates, but a few times a second instead of every frame. */
const CALM_MS = 250;

/** A live strip of the latest PCM samples, drawn while `active`. */
export function AudioScope({ ring, active, label }: { ring: SampleRing; active: boolean; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let frame = 0;
    let drawnAt = 0;

    const draw = (now: number) => {
      if (active) frame = requestAnimationFrame(draw);
      if (calm && active && now - drawnAt < CALM_MS) return;
      drawnAt = now;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const colours = palette();
      const middle = height / 2;
      context.clearRect(0, 0, width, height);
      context.fillStyle = colours.grid;
      for (let x = 0; x < width; x += Math.round(24 * ratio)) context.fillRect(x, 0, ratio, height);
      context.fillStyle = colours.axis;
      context.fillRect(0, Math.floor(middle), width, Math.max(1, Math.round(ratio)));
      const { min, max } = waveformColumns(ring.snapshot(), width);
      context.fillStyle = colours.wave;
      context.shadowColor = colours.glow;
      context.shadowBlur = active ? 8 * ratio : 0;
      context.globalAlpha = active ? 1 : 0.4;
      for (let x = 0; x < width; x++) {
        const top = middle - (max[x] ?? 0) * middle;
        const bottom = middle - (min[x] ?? 0) * middle;
        context.fillRect(x, top, 1, Math.max(ratio, bottom - top));
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, ring]);

  return <canvas ref={canvasRef} className={styles.scope} role="img" aria-label={label} />;
}
