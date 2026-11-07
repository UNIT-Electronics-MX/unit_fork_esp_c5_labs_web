import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "@/ui/Icon";
import styles from "./BoardExplorer.module.css";

type PartId = "usb" | "mcu" | "sensors" | "rgb" | "power" | "storage" | "radio" | "headers";

const PARTS: readonly {
  id: PartId;
  icon: IconName;
  refs: readonly string[];
  side: "left" | "right";
}[] = [
  { id: "usb", icon: "wire", refs: ["J3", "S1", "S2"], side: "left" },
  { id: "mcu", icon: "chip", refs: ["IC1", "IC3"], side: "left" },
  { id: "sensors", icon: "fam-analog", refs: ["A2", "U$36", "U3", "U4"], side: "left" },
  { id: "rgb", icon: "bulb", refs: ["LED1", "BUILTIN2", "CHG"], side: "left" },
  { id: "power", icon: "power", refs: ["IC2", "IC4", "U2"], side: "right" },
  { id: "storage", icon: "fam-memory", refs: ["MICRO_SD-HOLDER", "J20"], side: "right" },
  { id: "radio", icon: "fam-radio", refs: ["U1", "J2"], side: "right" },
  { id: "headers", icon: "pin", refs: ["J1"], side: "right" },
];

function illuminate(frame: HTMLIFrameElement | null, part: PartId | null) {
  const refs = PARTS.find((item) => item.id === part)?.refs ?? [];
  const origin = window.location.origin === "null" ? "*" : window.location.origin;
  frame?.contentWindow?.postMessage({ type: "pulsar-highlight", refs }, origin);
}

/** The manufacturing-layer model with descriptions that illuminate the corresponding parts. */
export function BoardExplorer() {
  const { t, i18n } = useTranslation("home");
  const frame = useRef<HTMLIFrameElement>(null);
  const [picked, setPicked] = useState<PartId | null>(null);
  const [hover, setHover] = useState<PartId | null>(null);
  const lit = hover ?? picked;
  const lang = i18n.resolvedLanguage?.startsWith("es") ? "es" : "en";
  const src = `${import.meta.env.BASE_URL}pulsar-c5-3d-web/pulsar-c5-3d.html?embed=1&lang=${lang}`;

  useEffect(() => illuminate(frame.current, lit), [lit]);

  return (
    <div className={styles.explorer}>
      <iframe
        ref={frame}
        className={styles.view}
        src={src}
        title="Pulsar C5 3D"
        loading="lazy"
        onLoad={() => illuminate(frame.current, lit)}
      />
      <ol className={styles.cards}>
        {PARTS.map((part, i) => (
          <li
            key={part.id}
            className={styles.card}
            data-side={part.side}
            data-on={lit === part.id || undefined}
            style={{ gridRow: (i % 4) + 1 }}
            onPointerEnter={() => setHover(part.id)}
            onPointerLeave={() => setHover(null)}
          >
            <button
              type="button"
              className={styles.head}
              aria-pressed={picked === part.id}
              onClick={() => setPicked((current) => (current === part.id ? null : part.id))}
              onFocus={() => setHover(part.id)}
              onBlur={() => setHover(null)}
            >
              <span className={styles.icon}><Icon name={part.icon} size={28} /></span>
              <span className={styles.title}>
                <span className={styles.num} aria-hidden="true">{i + 1}</span>
                {t(`board.c5Parts.${part.id}.title`)}
              </span>
            </button>
            <p className={styles.text}>{t(`board.c5Parts.${part.id}.text`)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
