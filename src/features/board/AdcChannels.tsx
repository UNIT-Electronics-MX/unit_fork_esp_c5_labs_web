import { useTranslation } from "react-i18next";
import { PULSAR_ADC, pulsarSilk } from "@/domain/pulsar";
import styles from "./AdcChannels.module.css";

/** Where the six ADC1 channels sit on the header, and which are free for an analog sensor. */
export function AdcChannels() {
  const { t } = useTranslation();
  return (
    <figure className={styles.channels}>
      <figcaption>{t("board.adc.title")}</figcaption>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("board.adc.channel")}</th>
            <th scope="col">{t("board.adc.pad")}</th>
            <th scope="col">{t("board.adc.state")}</th>
          </tr>
        </thead>
        <tbody>
          {PULSAR_ADC.map(({ position, pad, channel, state }) => (
            <tr key={position} data-state={state}>
              <th scope="row"><code>{`ADC1_CH${channel}`}</code></th>
              <td>
                {pulsarSilk(pad)} <span className={styles.gpio}>{`GPIO${pad.pin}`}</span>
                <span className={styles.position}>{t("board.adc.position", { number: position + 1 })}</span>
              </td>
              <td>{t(`board.adc.states.${state}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.note}>{t("board.adc.note")}</p>
    </figure>
  );
}
