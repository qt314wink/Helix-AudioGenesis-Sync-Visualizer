import type { ScoreRecipe } from "./types";
import { HelixSynth } from "./synth";

export type EngineSource = "idle" | "mic" | "file" | "generate" | "sync";

export class HelixEngine {
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  private sourceGain: GainNode;
  private tap: GainNode;
  private current: AudioNode | null = null;
  private stream: MediaStream | null = null;
  private mediaEl: HTMLMediaElement | null = null;
  private mediaNode: MediaElementAudioSourceNode | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private videoNode: MediaElementAudioSourceNode | null = null;
  synth: HelixSynth;
  source: EngineSource = "idle";
  syncOffset = 0;
  freq = new Uint8Array(1024);
  time = new Uint8Array(2048);

  constructor() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this.sourceGain = this.ctx.createGain();
    this.sourceGain.gain.value = 1;
    this.tap = this.ctx.createGain();
    this.tap.gain.value = 0;
    this.sourceGain.connect(this.analyser);
    this.sourceGain.connect(this.master);
    this.analyser.connect(this.tap);
    this.tap.connect(this.ctx.destination);
    this.master.connect(this.ctx.destination);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.time = new Uint8Array(this.analyser.fftSize);
    this.synth = new HelixSynth(this.ctx, this.sourceGain);
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setVolume(v: number) {
    const g = Math.max(0, Math.min(1, v));
    this.master.gain.setTargetAtTime(g * g, this.ctx.currentTime, 0.03);
  }

  sample() {
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.time);
    return { freq: this.freq, time: this.time };
  }

  private disconnectCurrent() {
    this.synth.stop();
    if (this.current) {
      try {
        this.current.disconnect();
      } catch {
        /* noop */
      }
      this.current = null;
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    try {
      this.mediaEl?.pause();
    } catch {
      /* noop */
    }
    try {
      this.videoEl?.pause();
    } catch {
      /* noop */
    }
  }

  async startMic() {
    await this.resume();
    this.disconnectCurrent();
    this.source = "mic";
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const node = this.ctx.createMediaStreamSource(this.stream);
    node.connect(this.analyser);
    this.current = node;
  }

  connectFile(el: HTMLAudioElement) {
    void this.resume();
    this.disconnectCurrent();
    this.source = "file";
    this.mediaEl = el;
    this.videoEl = null;
    if (!this.mediaNode || this.mediaNode.mediaElement !== el) {
      this.mediaNode = this.ctx.createMediaElementSource(el);
    }
    this.mediaNode.connect(this.sourceGain);
    this.current = this.mediaNode;
  }

  attachVideo(el: HTMLVideoElement | null) {
    this.videoEl = el;
  }

  connectSync(audio: HTMLAudioElement | null, video: HTMLVideoElement | null, useVideoAudio: boolean) {
    this.disconnectCurrent();
    this.source = "sync";
    this.videoEl = video;
    this.mediaEl = audio;
    if (audio) {
      if (!this.mediaNode || this.mediaNode.mediaElement !== audio) {
        this.mediaNode = this.ctx.createMediaElementSource(audio);
      }
      this.mediaNode.connect(this.sourceGain);
      this.current = this.mediaNode;
      if (video) video.muted = true;
    } else if (video && useVideoAudio) {
      video.muted = false;
      if (!this.videoNode || this.videoNode.mediaElement !== video) {
        this.videoNode = this.ctx.createMediaElementSource(video);
      }
      this.videoNode.connect(this.sourceGain);
      this.current = this.videoNode;
    }
  }

  playRecipe(recipe: ScoreRecipe) {
    void this.resume();
    this.disconnectCurrent();
    this.source = "generate";
    this.synth.start(recipe);
    this.current = null;
  }

  previewStemRecipe(recipe: ScoreRecipe) {
    this.playRecipe(recipe);
  }

  playMedia() {
    void this.resume();
    if (this.synth.recipe && this.source === "generate") {
      this.synth.resume();
      return;
    }
    void this.mediaEl?.play();
    void this.videoEl?.play();
  }

  pauseMedia() {
    if (this.source === "generate") {
      this.synth.pause();
      return;
    }
    this.mediaEl?.pause();
    this.videoEl?.pause();
  }

  get mediaCurrentTime() {
    return this.mediaEl?.currentTime ?? this.videoEl?.currentTime ?? 0;
  }

  get mediaDuration() {
    const d = this.mediaEl?.duration ?? this.videoEl?.duration ?? 0;
    return Number.isFinite(d) ? d : 0;
  }

  seek(t: number) {
    if (this.mediaEl) this.mediaEl.currentTime = t;
    if (this.videoEl) this.videoEl.currentTime = Math.max(0, t + this.syncOffset);
  }

  syncClock() {
    if (this.source !== "sync" || !this.videoEl) return;
    const audioTime = this.mediaEl?.currentTime ?? this.videoEl.currentTime;
    const target = Math.max(0, audioTime + this.syncOffset);
    if (Math.abs(this.videoEl.currentTime - target) > 0.09) {
      this.videoEl.currentTime = target;
    }
  }

  stopAll() {
    this.disconnectCurrent();
    this.source = "idle";
  }
}

let singleton: HelixEngine | null = null;

export function getEngine(): HelixEngine | null {
  return singleton;
}

export function createEngine(): HelixEngine {
  if (!singleton) singleton = new HelixEngine();
  return singleton;
}
