import aurora from "./tracks/aurora.mp3?url";
import circuitoAzul from "./tracks/circuito-azul.mp3?url";
import pulsoSolar from "./tracks/pulso-solar.mp3?url";

/** Original short instrumentals shipped with the site; no file upload is needed. */
export const BUNDLED_TRACKS = [
  { id: "pulsoSolar", url: pulsoSolar, seconds: 16 },
  { id: "circuitoAzul", url: circuitoAzul, seconds: 19 },
  { id: "aurora", url: aurora, seconds: 21 },
] as const;

export type BundledTrack = (typeof BUNDLED_TRACKS)[number];
