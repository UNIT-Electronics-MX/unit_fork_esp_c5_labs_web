import { useTranslation } from "react-i18next";
import styles from "./PulsarPinout.module.css";

// UNIT PULSAR ESP32-C5 Product Reference v0.1.0, schematic V1.2.3, chapter 4.1.
// Positions are in the published numbering order. D2 is marked because the PCB artwork
// and schematic disagree on its GPIO; the physical connection has not been verified.
const PINS = [
  ["D13 / SCK / LED", "27", "SPI SCK · microSD · LED"],
  ["3V3", "—", "3.3 V"],
  ["EN", "—", "Regulator enable"],
  ["VBAT", "—", "Battery rail"],
  ["A1 / D15", "1", "QWIIC SDA"],
  ["A2 / D16", "4", "Analog / MTCK"],
  ["A3 / D17", "5", "Analog / MTDO"],
  ["SDA / D18", "2", "Sensor I²C SDA"],
  ["SCL / D19", "3", "Sensor I²C SCL"],
  ["A6 / D21", "6", "QWIIC SCL"],
  ["NEOPIXEL DOUT", "—", "RGB chain output"],
  ["VBUS", "—", "USB power"],
  ["GND", "—", "Ground"],
  ["GND", "—", "Ground"],
  ["VIN", "—", "Power input"],
  ["TX0 / D1", "11", "UART0 TX"],
  ["RX0 / D0", "12", "UART0 RX"],
  ["RST", "—", "Reset"],
  ["GND", "—", "Ground"],
  ["D2 / RGB", "0*", "WS2812 data"],
  ["D3 / BOOT", "28", "BOOT button"],
  ["D4", "9", "Digital I/O"],
  ["D5", "23", "microSD CS"],
  ["D6", "24", "Digital I/O"],
  ["D7", "25", "Digital I/O"],
  ["D8", "13", "USB D−"],
  ["D9", "14", "USB D+"],
  ["D10 / SS", "10", "SPI SS"],
  ["D11 / MOSI", "7", "SPI MOSI"],
  ["D12 / MISO", "26", "SPI MISO"],
] as const;

const USE_ES: Record<string, string> = {
  "SPI SCK · microSD · LED": "SPI SCK · microSD · LED",
  "3.3 V": "3,3 V",
  "Regulator enable": "Habilitación del regulador",
  "Battery rail": "Alimentación de batería",
  "QWIIC SDA": "QWIIC SDA",
  "Analog / MTCK": "Analógico / MTCK",
  "Analog / MTDO": "Analógico / MTDO",
  "Sensor I²C SDA": "I²C de sensores SDA",
  "Sensor I²C SCL": "I²C de sensores SCL",
  "QWIIC SCL": "QWIIC SCL",
  "RGB chain output": "Salida de cadena RGB",
  "USB power": "Alimentación USB",
  Ground: "Tierra",
  "Power input": "Entrada de alimentación",
  "UART0 TX": "UART0 TX",
  "UART0 RX": "UART0 RX",
  Reset: "Reinicio",
  "WS2812 data": "Datos WS2812",
  "BOOT button": "Botón BOOT",
  "Digital I/O": "Entrada/salida digital",
  "microSD CS": "microSD CS",
  "USB D−": "USB D−",
  "USB D+": "USB D+",
  "SPI SS": "SPI SS",
  "SPI MOSI": "SPI MOSI",
  "SPI MISO": "SPI MISO",
};

const SOURCE = "https://github.com/UNIT-Electronics-MX/unit_pulsar_esp32_c5/blob/main/tools/product-reference/chapters/04-connectors-pinouts.md";

export function PulsarPinout() {
  const { i18n } = useTranslation();
  const es = i18n.resolvedLanguage?.startsWith("es");

  return (
    <details className={styles.pinout}>
      <summary>{es ? "Pinout de Pulsar C5 · 30 posiciones" : "Pulsar C5 pinout · 30 positions"}</summary>
      <p className={styles.note}>
        {es
          ? "Mapa documentado para la revisión V1.2.3. *D2/RGB figura como GPIO0 en el esquema, pero como GPIO8 en la ilustración del pinout; comprueba la placa antes de usarlo."
          : "Documented map for revision V1.2.3. *The schematic maps D2/RGB to GPIO0, but the pinout artwork labels it GPIO8; verify the board before using it."}
      </p>
      <div className={styles.scroll}>
        <table>
          <thead>
            <tr>
              <th scope="col">{es ? "Posición" : "Position"}</th>
              <th scope="col">{es ? "Etiqueta" : "Label"}</th>
              <th scope="col">GPIO</th>
              <th scope="col">{es ? "Uso principal" : "Main use"}</th>
            </tr>
          </thead>
          <tbody>
            {PINS.map(([label, gpio, use], i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                <td>{label}</td>
                <td>{gpio}</td>
                <td>{es ? USE_ES[use] : use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.source}>
        <a href={SOURCE} target="_blank" rel="noreferrer">
          {es ? "Fuente: referencia oficial de UNIT Electronics" : "Source: official UNIT Electronics reference"}
        </a>
      </p>
    </details>
  );
}
