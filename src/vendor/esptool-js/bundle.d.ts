/** Public subset used by the browser flasher. Runtime: Espressif esptool-js 0.6.1 bundle.js. */
export class Transport {
  constructor(device: SerialPortLike);
  disconnect(): Promise<void>;
}

export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

export class ESPLoader {
  chip?: { CHIP_NAME: string };
  constructor(options: {
    transport: Transport;
    baudrate: number;
    terminal: { clean(): void; write(data: string): void; writeLine(data: string): void };
  });
  main(mode?: "default_reset"): Promise<string>;
  eraseFlash(): Promise<void>;
  writeFlash(options: {
    fileArray: { data: Uint8Array; address: number }[];
    flashMode: "keep";
    flashFreq: "keep";
    flashSize: "keep";
    eraseAll: boolean;
    compress: boolean;
    reportProgress?: (fileIndex: number, written: number, total: number) => void;
  }): Promise<void>;
  after(mode?: "hard_reset"): Promise<void>;
}
