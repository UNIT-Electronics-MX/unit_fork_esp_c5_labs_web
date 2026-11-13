import { useEffect, useRef, type ReactNode } from "react";
import { definePalette } from "@/lib/palette";
import { DIAL_START, DIAL_SWEEP, dialAngle, dialSegments, ringRadii, type Band } from "./hud-geometry";
import { waveformColumns, type SampleRing } from "./level-meter";
import styles from "./I2sAudioViewer.module.css";

const palette = definePalette({
  cyan: "--hud-cyan",
  line: "--hud-cyan-line",
  soft: "--hud-cyan-soft",
  glow: "--hud-glow",
  track: "--scope-dim",
  grid: "--scope-grid",
  ink: "--scope-ink",
  amber: "--scope-amber",
  coral: "--scope-coral",
});
const SPOKES = 180;
/** Radians per millisecond of the slow outer and inner ring turns. */
const SPIN = 0.00012;
const CALM_MS = 250;

interface DialProps {
  ring: SampleRing;
  active: boolean;
  /** Meter percent of the level and of the held peak. */
  level: number;
  hold: number;
  label: string;
  children: ReactNode;
}

/** The circular level dial: tick rings, a 270° level arc and the waveform wrapped round the centre. */
export function HudDial({ ring, active, level, hold, label, children }: DialProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef({ level, hold });

  useEffect(() => {
    levelsRef.current = { level, hold };
  }, [level, hold]);

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
      const side = Math.max(1, Math.round(canvas.clientWidth * ratio));
      if (canvas.width !== side || canvas.height !== side) {
        canvas.width = side;
        canvas.height = side;
      }
      const c = palette();
      const centre = side / 2;
      const outer = side / 2 - 6 * ratio;
      const spin = active && !calm ? now * SPIN : 0;
      const bandColour: Record<Band, string> = { ok: c.cyan, warn: c.amber, hot: c.coral };
      context.clearRect(0, 0, side, side);
      context.lineCap = "butt";

      // Outer tick ring, turning slowly while listening.
      for (let i = 0; i < 72; i++) {
        const angle = spin + (i / 72) * Math.PI * 2;
        const long = i % 6 === 0;
        const inner = outer - (long ? 10 : 5) * ratio;
        context.strokeStyle = long ? c.cyan : c.line;
        context.lineWidth = (long ? 2 : 1) * ratio;
        context.beginPath();
        context.moveTo(centre + Math.cos(angle) * inner, centre + Math.sin(angle) * inner);
        context.lineTo(centre + Math.cos(angle) * outer, centre + Math.sin(angle) * outer);
        context.stroke();
      }

      // Level arc: dim track, then the lit bands with a glow.
      const arc = outer - 22 * ratio;
      const width = 9 * ratio;
      context.lineWidth = width;
      context.strokeStyle = c.track;
      context.beginPath();
      context.arc(centre, centre, arc, DIAL_START, DIAL_START + DIAL_SWEEP);
      context.stroke();
      context.shadowColor = c.glow;
      context.shadowBlur = 14 * ratio;
      for (const segment of dialSegments(levelsRef.current.level)) {
        context.strokeStyle = bandColour[segment.band];
        context.beginPath();
        context.arc(centre, centre, arc, segment.from, segment.to);
        context.stroke();
      }
      context.shadowBlur = 0;

      // Held peak: a bright notch across the arc.
      if (levelsRef.current.hold > 0) {
        const angle = dialAngle(levelsRef.current.hold);
        context.strokeStyle = c.ink;
        context.lineWidth = 2 * ratio;
        context.beginPath();
        context.moveTo(centre + Math.cos(angle) * (arc - width), centre + Math.sin(angle) * (arc - width));
        context.lineTo(centre + Math.cos(angle) * (arc + width), centre + Math.sin(angle) * (arc + width));
        context.stroke();
      }

      // Dashed inner ring, turning the other way.
      const dashed = outer * 0.5;
      context.setLineDash([4 * ratio, 6 * ratio]);
      context.lineDashOffset = -spin * dashed;
      context.strokeStyle = c.line;
      context.lineWidth = ratio;
      context.beginPath();
      context.arc(centre, centre, dashed, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);

      // The waveform wrapped round the centre.
      const radii = ringRadii(waveformColumns(ring.snapshot(), SPOKES), outer * 0.56, outer * 0.2);
      context.beginPath();
      for (let i = 0; i <= SPOKES; i++) {
        const radius = radii[i % SPOKES] ?? 0;
        const angle = -Math.PI / 2 + (i / SPOKES) * Math.PI * 2;
        const x = centre + Math.cos(angle) * radius;
        const y = centre + Math.sin(angle) * radius;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.fillStyle = c.soft;
      context.fill();
      context.strokeStyle = active ? c.cyan : c.line;
      context.lineWidth = 1.5 * ratio;
      context.shadowColor = c.glow;
      context.shadowBlur = active ? 10 * ratio : 0;
      context.stroke();
      context.shadowBlur = 0;
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, ring]);

  return (
    <div className={styles.dial}>
      <canvas ref={canvasRef} className={styles.dialCanvas} role="img" aria-label={label} />
      <div className={styles.dialCore}>{children}</div>
    </div>
  );
}
