import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PAD_CLASSES, PAD_COLOUR, PAD_LEGEND_KEY } from "./pad-classes";
import styles from "./PadLegend.module.css";

/** A legend entry: a coloured dot and its name. */
export function LegendDot({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <li>
      <i className={styles.dot} style={{ background: colour }} aria-hidden="true" />
      {children}
    </li>
  );
}

/** The pad colour classes of the pinout drawings. `before` and `after` add entries around them. */
export function PadLegend({ className, before, after }: { className?: string; before?: ReactNode; after?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <ul className={`${styles.legend} ${className ?? ""}`} aria-label={t("board.legend.label")}>
      {before}
      {PAD_CLASSES.map((pad) => (
        <LegendDot key={pad} colour={PAD_COLOUR[pad]}>{t(`board.legend.${PAD_LEGEND_KEY[pad]}`)}</LegendDot>
      ))}
      {after}
    </ul>
  );
}
