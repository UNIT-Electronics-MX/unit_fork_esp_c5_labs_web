import { PCM_RATE } from "./pcm-protocol";

const PROCESSOR_NAME = "pulsar-pcm-queue";

/** Feeds the audio rendering thread from Web Serial without scheduling each PCM packet. */
export class PcmPlayer {
  private context: AudioContext | null = null;
  private outputGain: GainNode | null = null;
  private node: AudioWorkletNode | null = null;
  private gain = 1;
  private readonly onRebuffer: () => void;
  private readonly onError: () => void;

  constructor(onRebuffer: () => void = () => {}, onError: () => void = () => {}) {
    this.onRebuffer = onRebuffer;
    this.onError = onError;
  }

  async start(): Promise<void> {
    // Web Serial is available only in secure contexts, as is AudioWorklet.
    const context = new AudioContext({ sampleRate: PCM_RATE, latencyHint: "playback" });
    this.context = context;
    const moduleUrl = new URL(`${import.meta.env.BASE_URL}pcm-worklet.js`, document.baseURI);
    // Resume during the click gesture; the module can finish loading afterward.
    await Promise.all([context.resume(), context.audioWorklet.addModule(moduleUrl.href)]);
    if (this.context !== context) return;
    const node = new AudioWorkletNode(context, PROCESSOR_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    const gain = context.createGain();
    gain.gain.value = this.gain;
    node.port.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "rebuffer") this.onRebuffer();
    };
    node.onprocessorerror = () => this.onError();
    node.connect(gain);
    gain.connect(context.destination);
    this.node = node;
    this.outputGain = gain;
  }

  /** Adjust only browser monitoring volume; incoming PCM and dBFS stay untouched. */
  setGain(factor: number): void {
    if (!Number.isFinite(factor) || factor < 1 || factor > 16) return;
    this.gain = factor;
    if (this.context && this.outputGain) {
      this.outputGain.gain.setTargetAtTime(factor, this.context.currentTime, 0.01);
    }
  }

  enqueue(samples: Int16Array): void {
    if (!this.node || !samples.length) return;
    // Structured cloning keeps the original frame available to the scope and meter.
    this.node.port.postMessage({ type: "pcm", samples });
  }

  async stop(): Promise<void> {
    const node = this.node;
    this.node = null;
    if (node) {
      node.port.onmessage = null;
      node.onprocessorerror = null;
      node.port.close();
      node.disconnect();
    }
    this.outputGain?.disconnect();
    this.outputGain = null;
    const context = this.context;
    this.context = null;
    if (context) await context.close();
  }
}
