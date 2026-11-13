import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WireCaption } from "@/labs/display/wiring/parts";
import { useMediaQuery } from "@/lib/media";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import {
  BOARD,
  BOARD_PADS,
  COMPACT_VIEWBOX,
  MODULE,
  MODULE_PINS,
  PAD_X,
  PIN_X,
  VIEWBOX,
  modeFromView,
  padById,
  pinY,
  usedPads,
  wirePath,
  wiresFor,
  type CodecMode,
  type PadGroup,
  type SoundPart,
} from "./sound-wiring";
import styles from "./SoundWiring.module.css";

const MODES: readonly CodecMode[] = ["both", "capture", "playback"];
const GROUP_TITLE: Readonly<Record<PadGroup, string>> = { qwiic: "QWIIC", j20: "J20", d6: "D6" };
const PART_NAME: Readonly<Record<SoundPart, string>> = { ics43434: "ICS-43434", es8311: "ES8311" };
const BOARD_NAME = "PULSAR C5";
/** Same breakpoint as the stage's CSS: below it the drawing is cropped to fit a phone. */
const PHONE = "(max-width: 600px)";

/** The frame each connector group gets on the board, from its first to its last pad. */
function groupBox(group: PadGroup) {
  const ys = BOARD_PADS.filter((pad) => pad.group === group).map((pad) => pad.y);
  const top = Math.min(...ys) - 14;
  return { top, height: Math.max(...ys) + 14 - top };
}

/** The microphone on J2 and the speaker on the amplifier output, beside the codec. */
function CodecPeripherals({ mode }: { mode: CodecMode }) {
  const { t } = useTranslation("labs-sound");
  const right = MODULE.x + MODULE.width;
  const micOn = mode !== "playback";
  const speakerOn = mode !== "capture";
  return (
    <g>
      <g className={micOn ? styles.peripheral : styles.peripheralOff}>
        <path d={`M ${right} 120 H ${right + 34}`} className={styles.lead} />
        <rect x={right + 34} y={98} width={26} height={44} rx={13} className={styles.mic} />
        <path d={`M ${right + 47} 142 V 158`} className={styles.lead} />
        <text x={right + 47} y={180} textAnchor="middle" className={styles.periphLabel}>{t("wiring.mic")}</text>
      </g>
      <g className={speakerOn ? styles.peripheral : styles.peripheralOff}>
        <path d={`M ${right} 300 H ${right + 30}`} className={styles.lead} />
        <path d={`M ${right + 30} 288 h 10 l 18 -16 v 56 l -18 -16 h -10 z`} className={styles.speaker} />
        <text x={right + 44} y={352} textAnchor="middle" className={styles.periphLabel}>{t("wiring.speaker")}</text>
      </g>
    </g>
  );
}

/** One connection diagram, stepped wire by wire like the ST7735 walkthrough. */
function SoundWiring({ part, initialMode }: { part: SoundPart; initialMode: CodecMode }) {
  const { t } = useTranslation("labs-sound");
  const [mode, setMode] = useState<CodecMode>(initialMode);
  const wires = wiresFor(part, mode);
  const count = wires.length;
  // 0 is the overview with every wire; 1..count walks them one at a time.
  const [step, setStep] = useState(0);
  const shown = step === 0 ? count : Math.min(step, count);
  const current = step === 0 ? undefined : wires[shown - 1];
  const used = usedPads(part, mode);
  const placedPins = new Set(wires.slice(0, shown).map((wire) => wire.pin));
  const placedPads = new Set(wires.slice(0, shown).map((wire) => wire.pad));
  const currentPad = current ? padById(current.pad) : undefined;
  const codec = part === "es8311";
  const phone = useMediaQuery(PHONE);

  function pickMode(next: CodecMode) {
    setMode(next);
    setStep(0);
  }

  return (
    <div className={styles.wiring}>
      {codec ? (
        <div className={styles.modes} role="group" aria-label={t("wiring.modes.label")}>
          {MODES.map((value) => (
            <Button key={value} pressed={mode === value} onClick={() => pickMode(value)}>
              {t(`wiring.modes.${value}`)}
            </Button>
          ))}
        </div>
      ) : null}
      <div className={styles.controls} role="group" aria-label={t("wiring.controls")}>
        <Button onClick={() => setStep(1)} disabled={step === 1}>{t("wiring.start")}</Button>
        <Button onClick={() => setStep(step - 1)} disabled={step <= 1}>{t("wiring.prev")}</Button>
        <Button onClick={() => setStep(step + 1)} disabled={step === 0 || step >= count}>{t("wiring.next")}</Button>
        <Button onClick={() => setStep(0)} disabled={step === 0}>{t("wiring.all")}</Button>
        <span className={styles.count} aria-live="polite">{t("wiring.count", { step: shown, count })}</span>
      </div>
      <p className={styles.scrollHint}>{t("wiring.scrollHint")}</p>
      <div className={styles.stage} dir="ltr">
        <svg viewBox={phone ? COMPACT_VIEWBOX : VIEWBOX} role="img"
          aria-label={t(codec ? "wiring.aria.es8311" : "wiring.aria.ics43434", { count })}>
          <rect x={BOARD.x} y={BOARD.y} width={BOARD.width} height={BOARD.height} rx={14} className={styles.board} />
          <text x={BOARD.x + 18} y={BOARD.y + 24} className={styles.boardName}>{BOARD_NAME}</text>
          <rect x={BOARD.x + 26} y={BOARD.y + 120} width={62} height={62} rx={6} className={styles.chip} />
          <text x={BOARD.x + 57} y={BOARD.y + 155} textAnchor="middle" className={styles.chipText}>{"C5"}</text>
          <rect x={BOARD.x + 16} y={BOARD.y + BOARD.height - 46} width={58} height={30} rx={8} className={styles.usb} />
          <text x={BOARD.x + 45} y={BOARD.y + BOARD.height - 26} textAnchor="middle" className={styles.usbText}>{"USB-C"}</text>

          {(["qwiic", "j20", "d6"] as const).map((group) => {
            const box = groupBox(group);
            const active = BOARD_PADS.some((pad) => pad.group === group && used.has(pad.id));
            return (
              <g key={group} className={active ? undefined : styles.dim}>
                <rect x={PAD_X - 92} y={box.top} width={84} height={box.height} rx={6} className={styles.connector} />
                <text x={PAD_X - 92} y={box.top - 6} className={styles.groupTitle}>{GROUP_TITLE[group]}</text>
              </g>
            );
          })}
          {BOARD_PADS.map((pad) => {
            const on = placedPads.has(pad.id);
            return (
              <g key={pad.id} className={used.has(pad.id) ? undefined : styles.dim}>
                <text x={PAD_X - 84} y={pad.y + 4} className={styles.padLabel}>{pad.label}</text>
                <text x={PAD_X - 14} y={pad.y + 4} textAnchor="end" className={on ? styles.netOn : styles.net}>{pad.net}</text>
                <circle cx={PAD_X} cy={pad.y} r={on ? 6 : 4.5} className={on ? styles.padOn : styles.pad} />
              </g>
            );
          })}

          {wires.slice(0, shown).map((wire) => (
            <path key={wire.id} d={wirePath(part, wire)} className={styles.wire}
              stroke={`var(${wire.color})`} data-current={wire === current || undefined} />
          ))}

          <rect x={MODULE.x} y={MODULE.y} width={MODULE.width} height={MODULE.height} rx={12} className={styles.module} />
          <text x={MODULE.x + MODULE.width / 2} y={MODULE.y + 24} textAnchor="middle" className={styles.moduleName}>{PART_NAME[part]}</text>
          {codec ? (
            <rect x={MODULE.x + 64} y={MODULE.y + 150} width={56} height={56} rx={5} className={styles.chip} />
          ) : (
            <circle cx={MODULE.x + 94} cy={MODULE.y + 176} r={16} className={styles.port} />
          )}
          {MODULE_PINS[part].map((pin) => {
            const y = pinY(part, pin);
            const needed = wires.some((wire) => wire.pin === pin);
            const on = placedPins.has(pin);
            return (
              <g key={pin} className={needed ? undefined : styles.dim}>
                <circle cx={PIN_X} cy={y} r={on ? 6 : 4.5} className={on ? styles.padOn : styles.pad} />
                <text x={PIN_X + 12} y={y + 4} className={on ? styles.pinOn : styles.pin}>{pin}</text>
              </g>
            );
          })}
          {codec ? <CodecPeripherals mode={mode} /> : null}
        </svg>
      </div>
      <WireCaption color={current?.color ?? "--sound"} title={current && currentPad
        ? t("wiring.wireTitle", { number: shown, from: `${GROUP_TITLE[currentPad.group]} ${currentPad.label} · ${currentPad.net}`, to: current.pin })
        : t("wiring.allTitle", { count })}>
        {current ? t(`wiring.notes.${current.id}`) : t(codec ? `wiring.allText.${mode}` : "wiring.allText.ics43434")}
      </WireCaption>
      <p className={styles.footnote}>{t("wiring.simplified")}</p>
    </div>
  );
}

/** S0: the ICS-43434 on J20. */
export function SoundMicWiring(_: WidgetProps) {
  return <SoundWiring part="ics43434" initialMode="both" />;
}

/** S1–S8: the ES8311 codec; the panel's `view` opens capture (1), playback (2) or both (0). */
export function SoundCodecWiring({ panel }: WidgetProps) {
  const mode = modeFromView(panel?.view);
  return <SoundWiring key={mode} part="es8311" initialMode={mode} />;
}
