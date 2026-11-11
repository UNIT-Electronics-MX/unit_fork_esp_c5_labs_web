import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/Button";
import type { WidgetProps } from "@/widgets/types";
import { BH, BX, BY } from "./example-layout";
import { FlippedPulsar } from "./FlippedPulsar";
import { WireCaption } from "./parts";
import { FLIPPED_PADS, SD_PADS } from "./pulsar-flipped";
import { ImuExample, OledExample, OledLightExample } from "./QwiicExamples";
import { SdCardExample } from "./SdCardExample";
import styles from "./examples.module.css";

/** `panel.view` in the lessons: 0 OLED (O1), 1 microSD (P5), 2 IMU (D1), 3 OLED and light (D2). */
const BY_VIEW = ["oled", "sd", "imu", "light"] as const;
type Example = (typeof BY_VIEW)[number];
/** The order of the buttons: the QWIIC parts first, then the board's own microSD. */
const TABS: readonly Example[] = ["oled", "light", "imu", "sd"];

/** A1 and A6 carry the same SDA and SCL as the QWIIC port. */
const QWIIC_ON_HEADER: ReadonlySet<number> = new Set(
  FLIPPED_PADS.filter((p) => p.pad.use === "qwiicSda" || p.pad.use === "qwiicScl").map((p) => p.position),
);
const SD_ON_HEADER: ReadonlySet<number> = new Set(SD_PADS.map((line) => line.pad.position));

const QWIIC_FRAME = "0 20 900 560";
/** Each example frames only what it draws, so the board stays as large as it can. */
const VIEWBOX: Record<Example, string> = {
  oled: QWIIC_FRAME,
  light: QWIIC_FRAME,
  imu: QWIIC_FRAME,
  sd: `${BX - 210} ${BY - 20} ${900 - (BX - 210)} ${BH + 70}`,
};

function Parts({ example }: { example: Example }) {
  switch (example) {
    case "oled":
      return <OledExample />;
    case "light":
      return <OledLightExample />;
    case "imu":
      return <ImuExample />;
    case "sd":
      return null;
  }
}

/**
 * How the Pulsar C5's own buses reach a part: QWIIC (I²C) to an OLED, a light sensor or an IMU,
 * and the board's SPI pads to its microSD slot. A lesson opens on its own part; the others are a
 * click away, as examples.
 */
export function WiringExamples({ panel }: WidgetProps) {
  const { t } = useTranslation("labs-display");
  const [example, setExample] = useState<Example>(BY_VIEW[panel?.view ?? 0] ?? "oled");
  return (
    <div className={styles.examples}>
      <div className={styles.bar} role="group" aria-label={t("examples.label")}>
        {TABS.map((key) => (
          <Button key={key} pressed={example === key} onClick={() => setExample(key)}>
            {t(`examples.${key}.tab`)}
          </Button>
        ))}
      </div>
      <div className={styles.stage} dir="ltr">
        <svg viewBox={VIEWBOX[example]} role="img" aria-label={t(`examples.${example}.aria`)}>
          <FlippedPulsar marked={example === "sd" ? SD_ON_HEADER : QWIIC_ON_HEADER}>
            {example === "sd" ? <SdCardExample /> : null}
          </FlippedPulsar>
          <Parts example={example} />
        </svg>
      </div>
      <WireCaption color={example === "sd" ? "--copper" : "--w-sda"} title={t(`examples.${example}.title`)}>
        {t(`examples.${example}.text`)}
      </WireCaption>
    </div>
  );
}
