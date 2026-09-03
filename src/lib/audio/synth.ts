import {
  DRUM_PATTERNS,
  KEY_ROOT,
  SCALES,
  STEMS,
  hashString,
  makeRng,
  midiToFreq,
  degreeToMidi,
} from "./stems";
import type { ScoreRecipe, Stem } from "./types";

const LOOKAHEAD = 0.12;
const SCHEDULE_AHEAD = 0.25;

export class HelixSynth {
  private ctx: AudioContext;
  private dest: AudioNode;
  private noise: AudioBuffer;
  private timer: number | null = null;
  private nextNote = 0;
  private step = 0;
  private bar = 0;
  playing = false;
  recipe: ScoreRecipe | null = null;
  private rng = makeRng(1);
  private kickSteps: number[] = [];
  private snareSteps: number[] = [];
  private hatSteps: number[] = [];
  private bassMotif: number[] = [];
  private leadMotif: number[] = [];
  private arpMotif: number[] = [];
  private leadBus: GainNode;
  private drumBus: GainNode;
  private padGain: GainNode;
  private padOsc: OscillatorNode[] = [];

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.leadBus = ctx.createGain();
    this.drumBus = ctx.createGain();
    this.padGain = ctx.createGain();
    this.leadBus.gain.value = 0.22;
    this.drumBus.gain.value = 0.85;
    this.padGain.gain.value = 0;
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.27;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const delayMix = ctx.createGain();
    delayMix.gain.value = 0.28;
    this.leadBus.connect(dest);
    this.leadBus.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayMix);
    delayMix.connect(dest);
    this.drumBus.connect(dest);
    this.padGain.connect(dest);
  }

  start(recipe: ScoreRecipe) {
    this.stopPads();
    this.recipe = recipe;
    this.rng = makeRng(hashString(recipe.id + recipe.title));
    this.hydratePatterns(recipe);
    this.step = 0;
    this.bar = 0;
    this.nextNote = this.ctx.currentTime + 0.06;
    this.playing = true;
    this.startPads(recipe);
    this.armTimer();
    this.scheduler();
  }

  pause() {
    this.playing = false;
    this.disarm();
    this.fadePads(0.001, 0.08);
  }

  resume() {
    if (!this.recipe) return;
    this.playing = true;
    this.nextNote = this.ctx.currentTime + 0.05;
    this.fadePads(this.padLevel(), 0.12);
    this.armTimer();
    this.scheduler();
  }

  stop() {
    this.playing = false;
    this.disarm();
    this.stopPads();
  }

  private armTimer() {
    this.disarm();
    this.timer = window.setInterval(() => this.scheduler(), 25);
  }

  private disarm() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private hydratePatterns(recipe: ScoreRecipe) {
    const base = DRUM_PATTERNS[recipe.drumPattern];
    this.kickSteps = base.kick.slice();
    this.snareSteps = base.snare.slice();
    this.hatSteps = base.hats.slice();
    this.bassMotif = [0, 0, 7, 0, 3, 0, 5, 0];
    this.leadMotif = [0, 2, 4, 2, 7, 4, 5, 0];
    this.arpMotif = [0, 2, 4, 7, 4, 2, 0, 4];
    for (const id of recipe.stemIds ?? []) {
      const stem = STEMS.find((s) => s.id === id);
      if (!stem) continue;
      this.applyStem(stem);
    }
  }

  private applyStem(stem: Stem) {
    if (stem.kind === "kick" && stem.steps) this.kickSteps = stem.steps;
    if (stem.kind === "snare" && stem.steps) this.snareSteps = stem.steps;
    if (stem.kind === "hats" && stem.steps) this.hatSteps = stem.steps;
    if (stem.kind === "bass" && stem.motif) this.bassMotif = stem.motif;
    if (stem.kind === "lead" && stem.motif) this.leadMotif = stem.motif;
    if (stem.kind === "arp" && stem.motif) this.arpMotif = stem.motif;
  }

  private stepDuration() {
    const bpm = this.recipe?.bpm ?? 90;
    const swing = this.recipe?.swing ?? 0;
    const sixteenth = 60 / bpm / 4;
    const odd = this.step % 2 === 1;
    return sixteenth * (odd ? 1 + swing : 1 - swing);
  }

  private scheduler() {
    if (!this.playing || !this.recipe) return;
    const horizon = this.ctx.currentTime + SCHEDULE_AHEAD;
    while (this.nextNote < horizon) {
      this.scheduleStep(this.step, this.nextNote);
      this.nextNote += this.stepDuration();
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar += 1;
    }
    void LOOKAHEAD;
  }

  private scheduleStep(step: number, time: number) {
    const r = this.recipe!;
    const density = r.density;
    if (this.kickSteps[step]) this.kick(time, 0.7 + r.energy * 0.4);
    if (this.snareSteps[step] && density > 0.18) this.snare(time, 0.45 + r.energy * 0.25);
    if (this.hatSteps[step] && density > 0.12) {
      const open = step % 8 === 7 && density > 0.55;
      this.hat(time, open ? 0.18 : 0.08 + density * 0.08, open);
    }
    if (r.bassStyle !== "off" && (step % 2 === 0 || density > 0.6)) {
      const deg = this.bassMotif[Math.floor(step / 2) % this.bassMotif.length] ?? 0;
      this.bass(time, deg, r);
    }
    if (r.leadStyle !== "none" && step % 2 === 0 && this.rng() < 0.35 + density * 0.4) {
      this.lead(time, r);
    }
    if (r.arp && density > 0.22) this.arp(time, r, step);
  }

  private chordRootDegree() {
    const r = this.recipe!;
    const idx = Math.floor(this.bar / 2) % r.progression.length;
    return r.progression[idx] ?? 0;
  }

  private kick(time: number, gain: number) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(148, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.14);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.38);
    osc.connect(g);
    g.connect(this.drumBus);
    osc.start(time);
    osc.stop(time + 0.4);
    this.click(time, 0.18);
  }

  private click(time: number, gain: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "highpass";
    bp.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.drumBus);
    src.start(time);
    src.stop(time + 0.04);
  }

  private snare(time: number, gain: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.drumBus);
    src.start(time);
    src.stop(time + 0.18);
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, time);
    og.gain.setValueAtTime(gain * 0.35, time);
    og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(og);
    og.connect(this.drumBus);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private hat(time: number, gain: number, open: boolean) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7800;
    const g = this.ctx.createGain();
    const dur = open ? 0.18 : 0.035;
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.drumBus);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  private bass(time: number, motifDeg: number, r: ScoreRecipe) {
    const scale = SCALES[r.scale];
    const root = KEY_ROOT[r.key] ?? 57;
    const chord = this.chordRootDegree();
    const midi = degreeToMidi(root, scale, chord + motifDeg, -2);
    const freq = midiToFreq(midi);
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = r.bassStyle === "reese" ? "sawtooth" : "sine";
    sub.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    sub.frequency.setValueAtTime(freq / 2, time);
    if (r.bassStyle === "reese") osc.detune.value = -8;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140 + r.brightness * 900, time);
    filter.frequency.exponentialRampToValueAtTime(80 + r.brightness * 280, time + 0.18);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.42, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(g);
    g.connect(this.dest);
    osc.start(time);
    sub.start(time);
    osc.stop(time + 0.32);
    sub.stop(time + 0.32);
  }

  private lead(time: number, r: ScoreRecipe) {
    const scale = SCALES[r.scale];
    const root = KEY_ROOT[r.key] ?? 57;
    const chord = this.chordRootDegree();
    const idx = Math.floor(this.rng() * this.leadMotif.length);
    const deg = (this.leadMotif[idx] ?? 0) + chord;
    const midi = degreeToMidi(root, scale, deg, 1);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = r.leadStyle === "bell" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(midiToFreq(midi), time);
    const peak = 0.12 + r.brightness * 0.1;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, time + (r.leadStyle === "bell" ? 0.55 : 0.22));
    osc.connect(g);
    g.connect(this.leadBus);
    osc.start(time);
    osc.stop(time + 0.6);
  }

  private arp(time: number, r: ScoreRecipe, step: number) {
    const scale = SCALES[r.scale];
    const root = KEY_ROOT[r.key] ?? 57;
    const chord = this.chordRootDegree();
    const deg = (this.arpMotif[step % this.arpMotif.length] ?? 0) + chord;
    const midi = degreeToMidi(root, scale, deg, 1);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(midiToFreq(midi), time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.07, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(g);
    g.connect(this.leadBus);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private padLevel() {
    const r = this.recipe;
    if (!r || r.padStyle === "none") return 0.001;
    return r.padStyle === "air" ? 0.07 : 0.1;
  }

  private startPads(r: ScoreRecipe) {
    if (r.padStyle === "none") return;
    const scale = SCALES[r.scale];
    const root = KEY_ROOT[r.key] ?? 57;
    const degrees = [0, 2, 4];
    const now = this.ctx.currentTime;
    this.padOsc = [];
    for (let i = 0; i < degrees.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      const midi = degreeToMidi(root, scale, (r.progression[0] ?? 0) + degrees[i]!, 0);
      osc.frequency.value = midiToFreq(midi);
      osc.detune.value = (i - 1) * 6;
      osc.connect(this.padGain);
      osc.start(now);
      this.padOsc.push(osc);
    }
    this.padGain.gain.cancelScheduledValues(now);
    this.padGain.gain.setValueAtTime(0.001, now);
    this.padGain.gain.exponentialRampToValueAtTime(this.padLevel(), now + 1.2);
  }

  private fadePads(level: number, dur: number) {
    const now = this.ctx.currentTime;
    this.padGain.gain.cancelScheduledValues(now);
    this.padGain.gain.setTargetAtTime(Math.max(0.001, level), now, dur);
  }

  private stopPads() {
    const now = this.ctx.currentTime;
    this.padGain.gain.cancelScheduledValues(now);
    this.padGain.gain.setTargetAtTime(0.001, now, 0.08);
    for (const osc of this.padOsc) {
      try {
        osc.stop(now + 0.2);
      } catch {
        /* already stopped */
      }
    }
    this.padOsc = [];
  }
}
