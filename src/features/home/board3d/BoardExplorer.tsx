import { useTranslation } from "react-i18next";
import styles from "./BoardExplorer.module.css";

/** The manufacturing-layer model of the Pulsar C5, isolated so its interactive CSS and
 * controls do not interfere with the React app. */
export function BoardExplorer() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage?.startsWith("es") ? "es" : "en";
  const src = `${import.meta.env.BASE_URL}pulsar-c5-3d-web/pulsar-c5-3d.html?embed=1&lang=${lang}`;

  return <iframe className={styles.explorer} src={src} title="Pulsar C5 3D" loading="lazy" />;
}
