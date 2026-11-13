import { PCM_RATE } from "./pcm-protocol";

interface ScheduledSource {
  readonly source: AudioBufferSourceNode;
  readonly envelope: GainNode;
  readonly startsAt: number;
  readonly fadeAt: number;
  readonly endsAt: number;
}

const INITIAL_LEAD = 0.12;
const MAX_BUFFER_LEAD = 0.3;
const REBUFFER_STEP = 0.04;
const MIN_LEAD = 0.02;
const MAX_LEAD = 0.55;
const EDGE_FADE = 0.003;

/** Schedules short PCM frames on Web Audio and bounds queued playback latency. */
export class PcmPlayer {
  private context: AudioContext | null = null;
  private outputGain: GainNode | null = null;
  private gain = 1;
  private nextAt = 0;
  private bufferLead = INITIAL_LEAD;
  private hasFrames = false;
  private tail: ScheduledSource | null = null;
  private readonly playing = new Set<ScheduledSource>();

  async start(): Promise<void> {
    this.context = new AudioContext();
    this.outputGain = this.context.createGain();
    this.outputGain.gain.value = this.gain;
    this.outputGain.connect(this.context.destination);
    await this.context.resume();
    this.bufferLead = INITIAL_LEAD;
    this.nextAt = this.context.currentTime + this.bufferLead;
    this.hasFrames = false;
    this.tail = null;
  }

  /** Adjust only browser monitoring volume; incoming PCM and dBFS stay untouched. */
  setGain(factor: number): void {
    if (!Number.isFinite(factor) || factor < 1 || factor > 16) return;
    this.gain = factor;
    if (this.context && this.outputGain) {
      this.outputGain.gain.setTargetAtTime(factor, this.context.currentTime, 0.01);
    }
  }

  /** Returns true when late or backed-up frames required playback to rebuffer. */
  enqueue(samples: Int16Array): boolean {
    const context = this.context;
    if (!context || !this.outputGain || context.state !== "running" || !samples.length) return false;
    const now = context.currentTime;
    const lead = this.nextAt - now;
    const rebuffered = this.hasFrames && (lead < MIN_LEAD || lead > MAX_LEAD);
    if (lead < MIN_LEAD || lead > MAX_LEAD) {
      if (lead > MAX_LEAD) this.dropQueued(now);
      if (rebuffered) this.bufferLead = Math.min(MAX_BUFFER_LEAD, this.bufferLead + REBUFFER_STEP);
      // Let a playing block finish naturally; stopping it mid-sample makes an audible click.
      this.nextAt = now + this.bufferLead;
      this.tail = null;
    }
    const startsAt = this.nextAt;
    const duration = samples.length / PCM_RATE;
    const endsAt = startsAt + duration;
    const fade = Math.min(EDGE_FADE, duration / 3);
    const fadeAt = endsAt - fade;
    const buffer = context.createBuffer(1, samples.length, PCM_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = (samples[i] ?? 0) / 32768;
    const source = context.createBufferSource();
    const envelope = context.createGain();
    const continuous = this.tail && Math.abs(this.tail.endsAt - startsAt) < 0.0001 && now < this.tail.fadeAt;
    if (continuous && this.tail) {
      this.tail.envelope.gain.cancelScheduledValues(this.tail.fadeAt);
      this.tail.envelope.gain.setValueAtTime(1, this.tail.fadeAt);
      envelope.gain.setValueAtTime(1, startsAt);
    } else {
      envelope.gain.setValueAtTime(0, startsAt);
      envelope.gain.linearRampToValueAtTime(1, startsAt + fade);
    }
    // If no next frame arrives, fade to silence rather than ending at an arbitrary sample.
    envelope.gain.setValueAtTime(1, fadeAt);
    envelope.gain.linearRampToValueAtTime(0, endsAt);
    source.buffer = buffer;
    source.connect(envelope);
    envelope.connect(this.outputGain);
    const scheduled: ScheduledSource = { source, envelope, startsAt, fadeAt, endsAt };
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      this.playing.delete(scheduled);
      if (this.tail === scheduled) this.tail = null;
    };
    this.playing.add(scheduled);
    source.start(startsAt);
    this.tail = scheduled;
    this.nextAt = endsAt;
    this.hasFrames = true;
    return rebuffered;
  }

  async stop(): Promise<void> {
    this.clearSources();
    const context = this.context;
    this.context = null;
    this.outputGain?.disconnect();
    this.outputGain = null;
    this.tail = null;
    this.hasFrames = false;
    if (context) await context.close();
  }

  private dropQueued(now: number): void {
    for (const scheduled of this.playing) {
      if (scheduled.startsAt <= now) continue;
      scheduled.source.onended = null;
      try { scheduled.source.stop(); } catch { /* A finished source is already stopped. */ }
      scheduled.source.disconnect();
      scheduled.envelope.disconnect();
      this.playing.delete(scheduled);
    }
  }

  private clearSources(): void {
    for (const scheduled of this.playing) {
      scheduled.source.onended = null;
      try { scheduled.source.stop(); } catch { /* A finished source is already stopped. */ }
      scheduled.source.disconnect();
      scheduled.envelope.disconnect();
    }
    this.playing.clear();
  }
}
