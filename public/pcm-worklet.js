/* global AudioWorkletProcessor, registerProcessor */

// This runs on the audio rendering thread. Web Serial fills the queue on the page thread.
const PCM_RATE = 48_000;
const START_SAMPLES = Math.round(PCM_RATE * 0.12);
const MAX_START_SAMPLES = Math.round(PCM_RATE * 0.3);
const MAX_QUEUE_SAMPLES = Math.round(PCM_RATE * 0.4);
const REBUFFER_STEP = Math.round(PCM_RATE * 0.04);
const FADE_SAMPLES = Math.round(PCM_RATE * 0.003);

class PulsarPcmQueue extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    this.head = 0;
    this.queued = 0;
    this.target = START_SAMPLES;
    this.playing = false;
    this.fadeIn = 0;
    this.lastOutput = 0;
    this.crossfadeFrom = 0;
    this.crossfade = FADE_SAMPLES;
    this.port.onmessage = (event) => {
      if (event.data?.type === "pcm" && event.data.samples instanceof Int16Array) {
        this.push(event.data.samples);
      }
    };
  }

  push(samples) {
    if (!samples.length) return;
    this.pending.push(samples);
    this.queued += samples.length;
    let dropped = false;
    while (this.queued > MAX_QUEUE_SAMPLES && this.pending.length > 1) {
      const first = this.pending.shift();
      this.queued -= first.length - this.head;
      this.head = 0;
      dropped = true;
    }
    if (dropped) {
      this.crossfadeFrom = this.lastOutput;
      this.crossfade = 0;
      this.port.postMessage({ type: "rebuffer" });
    }
  }

  pop() {
    const first = this.pending[0];
    const sample = first[this.head];
    this.head += 1;
    this.queued -= 1;
    if (this.head === first.length) {
      this.pending.shift();
      this.head = 0;
    }
    return sample / 32768;
  }

  process(_inputs, outputs) {
    const channel = outputs[0]?.[0];
    if (!channel) return true;
    if (!this.playing && this.queued >= this.target) {
      this.playing = true;
      this.fadeIn = 0;
    }
    for (let i = 0; i < channel.length; i++) {
      if (!this.playing) {
        channel[i] = 0;
        continue;
      }
      if (!this.queued) {
        this.playing = false;
        this.target = Math.min(MAX_START_SAMPLES, this.target + REBUFFER_STEP);
        this.port.postMessage({ type: "rebuffer" });
        channel[i] = 0;
        continue;
      }
      let value = this.pop();
      this.fadeIn = Math.min(FADE_SAMPLES, this.fadeIn + 1);
      value *= Math.min(this.fadeIn, this.queued + 1, FADE_SAMPLES) / FADE_SAMPLES;
      if (this.crossfade < FADE_SAMPLES) {
        this.crossfade += 1;
        const mix = this.crossfade / FADE_SAMPLES;
        value = this.crossfadeFrom * (1 - mix) + value * mix;
      }
      channel[i] = value;
      this.lastOutput = value;
    }
    return true;
  }
}

registerProcessor("pulsar-pcm-queue", PulsarPcmQueue);
