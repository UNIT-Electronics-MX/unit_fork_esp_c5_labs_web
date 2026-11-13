/** Full MicroPython images served from public, with their required flash offsets. */
export const bundledFirmware = {
  pulsar: {
    filename: "MicroPython-PulsarC5-v1.30.0-preview.288.gc85c2cbb80.dirty-0x0.bin",
    bytes: 2041408,
    sha256: "807da02c44723cca078c349ccf8b0d0516d690e0abe1f737087ddef19fbb1ae7",
    address: 0x0000,
    source: null,
  },
  generic: {
    filename: "ESP32_GENERIC_C5-20260824-v1.29.0.bin",
    bytes: 1965104,
    sha256: "24a9d43e2b97b191507b6c23ce6825f79a1b6e3292e51ffe4de2d5240bdc77d0",
    address: 0x2000,
    source: "https://micropython.org/download/ESP32_GENERIC_C5/",
  },
  sparkfun: {
    filename: "SPARKFUN_THINGPLUS_ESP32C5-20260824-v1.29.0.bin",
    bytes: 1985200,
    sha256: "0aa1768cc8f42a0b0ac0df02372a3bd9ad89c34bcd0a71cda1665f2aafbeaea6",
    address: 0x2000,
    source: "https://micropython.org/download/SPARKFUN_THINGPLUS_ESP32C5/",
  },
} as const;

export type BundledFirmwareKey = keyof typeof bundledFirmware;

export function bundledFirmwareUrl(filename: string): string {
  return new URL(`${import.meta.env.BASE_URL}${filename}`, document.baseURI).href;
}

/** Verify the served binary before touching flash, including when a service worker is stale. */
export async function loadBundledFirmware(key: BundledFirmwareKey): Promise<Uint8Array> {
  const firmware = bundledFirmware[key];
  const response = await fetch(bundledFirmwareUrl(firmware.filename));
  if (!response.ok) throw new Error("bundledFirmwareUnavailable");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== firmware.bytes) throw new Error("bundledFirmwareInvalid");
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== firmware.sha256) throw new Error("bundledFirmwareInvalid");
  return bytes;
}
