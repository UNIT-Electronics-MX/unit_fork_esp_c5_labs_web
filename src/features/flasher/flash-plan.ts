export interface FlashImage {
  id: number;
  file: File | null;
  address: string;
}

export interface FlashPlanItem {
  file: File;
  address: number;
}

const SECTOR_SIZE = 0x1000;

/** Validate the complete write before opening a port or touching flash. */
export function makeFlashPlan(images: readonly FlashImage[]): FlashPlanItem[] {
  if (images.length === 0) throw new Error("missingImage");
  const plan = images.map(({ file, address }) => {
    if (!file || file.size === 0 || !file.name.toLowerCase().endsWith(".bin")) {
      throw new Error("invalidFile");
    }
    if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(address.trim())) {
      throw new Error("invalidAddress");
    }
    const offset = Number(address.trim());
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % SECTOR_SIZE !== 0) {
      throw new Error("invalidAddress");
    }
    if (!Number.isSafeInteger(offset + file.size)) throw new Error("invalidAddress");
    return { file, address: offset };
  });

  const ordered = [...plan].sort((a, b) => a.address - b.address);
  for (let i = 1; i < ordered.length; i++) {
    const previous = ordered[i - 1]!;
    const next = ordered[i]!;
    if (next.address < Math.ceil((previous.address + previous.file.size) / SECTOR_SIZE) * SECTOR_SIZE) {
      throw new Error("overlap");
    }
  }
  return ordered;
}

export function requireEsp32C5(chipName: string | undefined): void {
  if (chipName !== "ESP32-C5") throw new Error("wrongChip");
}
