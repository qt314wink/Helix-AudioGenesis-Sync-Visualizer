import { i as __toESM } from "../_runtime.mjs";
import { o as require_jsx_runtime, r as Slot, s as require_react } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as STEMS, c as makeRng, i as SCALES, l as midiToFreq, n as DRUM_PATTERNS, o as degreeToMidi, r as KEY_ROOT, s as hashString, t as DEMO_RECIPE, u as recipeFromStems } from "./stems-CA5-kz3a.mjs";
import { _ as Aperture, a as ThumbsUp, c as Play, d as Orbit, f as Minimize, g as AudioLines, h as CircleDashed, l as Pause, m as Maximize, n as Waves, o as ThumbsDown, p as Mic, r as Upload, s as Repeat, t as X, u as Palette } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Dh-PUHO6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[opacity,transform,background-color,color,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:opacity-90 active:not-disabled:scale-[0.96]",
			secondary: "bg-surface-2 text-fg border border-border hover:border-border-strong active:not-disabled:scale-[0.96]",
			ghost: "bg-transparent text-fg hover:bg-surface-2 active:not-disabled:scale-[0.96]",
			subtle: "bg-transparent text-muted hover:text-fg hover:bg-surface-2"
		},
		size: {
			sm: "h-9 px-3 text-sm",
			md: "h-11 px-4 text-sm",
			lg: "h-12 px-5 text-base",
			icon: "size-11",
			"icon-sm": "size-9"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...!asChild ? { type: "button" } : {},
		...props
	});
}
function Slider({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
		className: cn("relative flex h-11 w-full touch-none items-center select-none", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
			className: "relative h-1 w-full grow overflow-hidden rounded-full bg-surface-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-accent" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block size-4 rounded-full border border-border-strong bg-fg shadow-none transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" })]
	});
}
var SCHEDULE_AHEAD = .25;
var HelixSynth = class {
	ctx;
	dest;
	noise;
	timer = null;
	nextNote = 0;
	step = 0;
	bar = 0;
	playing = false;
	recipe = null;
	rng = makeRng(1);
	kickSteps = [];
	snareSteps = [];
	hatSteps = [];
	bassMotif = [];
	leadMotif = [];
	arpMotif = [];
	leadBus;
	drumBus;
	padGain;
	padOsc = [];
	constructor(ctx, dest) {
		this.ctx = ctx;
		this.dest = dest;
		this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = this.noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		this.leadBus = ctx.createGain();
		this.drumBus = ctx.createGain();
		this.padGain = ctx.createGain();
		this.leadBus.gain.value = .22;
		this.drumBus.gain.value = .85;
		this.padGain.gain.value = 0;
		const delay = ctx.createDelay(.6);
		delay.delayTime.value = .27;
		const feedback = ctx.createGain();
		feedback.gain.value = .22;
		const delayMix = ctx.createGain();
		delayMix.gain.value = .28;
		this.leadBus.connect(dest);
		this.leadBus.connect(delay);
		delay.connect(feedback);
		feedback.connect(delay);
		delay.connect(delayMix);
		delayMix.connect(dest);
		this.drumBus.connect(dest);
		this.padGain.connect(dest);
	}
	start(recipe) {
		this.stopPads();
		this.recipe = recipe;
		this.rng = makeRng(hashString(recipe.id + recipe.title));
		this.hydratePatterns(recipe);
		this.step = 0;
		this.bar = 0;
		this.nextNote = this.ctx.currentTime + .06;
		this.playing = true;
		this.startPads(recipe);
		this.armTimer();
		this.scheduler();
	}
	pause() {
		this.playing = false;
		this.disarm();
		this.fadePads(.001, .08);
	}
	resume() {
		if (!this.recipe) return;
		this.playing = true;
		this.nextNote = this.ctx.currentTime + .05;
		this.fadePads(this.padLevel(), .12);
		this.armTimer();
		this.scheduler();
	}
	stop() {
		this.playing = false;
		this.disarm();
		this.stopPads();
	}
	armTimer() {
		this.disarm();
		this.timer = window.setInterval(() => this.scheduler(), 25);
	}
	disarm() {
		if (this.timer != null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
	hydratePatterns(recipe) {
		const base = DRUM_PATTERNS[recipe.drumPattern];
		this.kickSteps = base.kick.slice();
		this.snareSteps = base.snare.slice();
		this.hatSteps = base.hats.slice();
		this.bassMotif = [
			0,
			0,
			7,
			0,
			3,
			0,
			5,
			0
		];
		this.leadMotif = [
			0,
			2,
			4,
			2,
			7,
			4,
			5,
			0
		];
		this.arpMotif = [
			0,
			2,
			4,
			7,
			4,
			2,
			0,
			4
		];
		for (const id of recipe.stemIds ?? []) {
			const stem = STEMS.find((s) => s.id === id);
			if (!stem) continue;
			this.applyStem(stem);
		}
	}
	applyStem(stem) {
		if (stem.kind === "kick" && stem.steps) this.kickSteps = stem.steps;
		if (stem.kind === "snare" && stem.steps) this.snareSteps = stem.steps;
		if (stem.kind === "hats" && stem.steps) this.hatSteps = stem.steps;
		if (stem.kind === "bass" && stem.motif) this.bassMotif = stem.motif;
		if (stem.kind === "lead" && stem.motif) this.leadMotif = stem.motif;
		if (stem.kind === "arp" && stem.motif) this.arpMotif = stem.motif;
	}
	stepDuration() {
		const bpm = this.recipe?.bpm ?? 90;
		const swing = this.recipe?.swing ?? 0;
		return 60 / bpm / 4 * (this.step % 2 === 1 ? 1 + swing : 1 - swing);
	}
	scheduler() {
		if (!this.playing || !this.recipe) return;
		const horizon = this.ctx.currentTime + SCHEDULE_AHEAD;
		while (this.nextNote < horizon) {
			this.scheduleStep(this.step, this.nextNote);
			this.nextNote += this.stepDuration();
			this.step = (this.step + 1) % 16;
			if (this.step === 0) this.bar += 1;
		}
	}
	scheduleStep(step, time) {
		const r = this.recipe;
		const density = r.density;
		if (this.kickSteps[step]) this.kick(time, .7 + r.energy * .4);
		if (this.snareSteps[step] && density > .18) this.snare(time, .45 + r.energy * .25);
		if (this.hatSteps[step] && density > .12) {
			const open = step % 8 === 7 && density > .55;
			this.hat(time, open ? .18 : .08 + density * .08, open);
		}
		if (r.bassStyle !== "off" && (step % 2 === 0 || density > .6)) {
			const deg = this.bassMotif[Math.floor(step / 2) % this.bassMotif.length] ?? 0;
			this.bass(time, deg, r);
		}
		if (r.leadStyle !== "none" && step % 2 === 0 && this.rng() < .35 + density * .4) this.lead(time, r);
		if (r.arp && density > .22) this.arp(time, r, step);
	}
	chordRootDegree() {
		const r = this.recipe;
		const idx = Math.floor(this.bar / 2) % r.progression.length;
		return r.progression[idx] ?? 0;
	}
	kick(time, gain) {
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(148, time);
		osc.frequency.exponentialRampToValueAtTime(36, time + .14);
		g.gain.setValueAtTime(gain, time);
		g.gain.exponentialRampToValueAtTime(.001, time + .38);
		osc.connect(g);
		g.connect(this.drumBus);
		osc.start(time);
		osc.stop(time + .4);
		this.click(time, .18);
	}
	click(time, gain) {
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		const bp = this.ctx.createBiquadFilter();
		bp.type = "highpass";
		bp.frequency.value = 1800;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(gain, time);
		g.gain.exponentialRampToValueAtTime(.001, time + .03);
		src.connect(bp);
		bp.connect(g);
		g.connect(this.drumBus);
		src.start(time);
		src.stop(time + .04);
	}
	snare(time, gain) {
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		const bp = this.ctx.createBiquadFilter();
		bp.type = "bandpass";
		bp.frequency.value = 1800;
		bp.Q.value = .9;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(gain, time);
		g.gain.exponentialRampToValueAtTime(.001, time + .16);
		src.connect(bp);
		bp.connect(g);
		g.connect(this.drumBus);
		src.start(time);
		src.stop(time + .18);
		const osc = this.ctx.createOscillator();
		const og = this.ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(180, time);
		og.gain.setValueAtTime(gain * .35, time);
		og.gain.exponentialRampToValueAtTime(.001, time + .1);
		osc.connect(og);
		og.connect(this.drumBus);
		osc.start(time);
		osc.stop(time + .12);
	}
	hat(time, gain, open) {
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		const hp = this.ctx.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 7800;
		const g = this.ctx.createGain();
		const dur = open ? .18 : .035;
		g.gain.setValueAtTime(gain, time);
		g.gain.exponentialRampToValueAtTime(.001, time + dur);
		src.connect(hp);
		hp.connect(g);
		g.connect(this.drumBus);
		src.start(time);
		src.stop(time + dur + .02);
	}
	bass(time, motifDeg, r) {
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
		filter.frequency.exponentialRampToValueAtTime(80 + r.brightness * 280, time + .18);
		g.gain.setValueAtTime(1e-4, time);
		g.gain.exponentialRampToValueAtTime(.42, time + .02);
		g.gain.exponentialRampToValueAtTime(.001, time + .28);
		osc.connect(filter);
		sub.connect(filter);
		filter.connect(g);
		g.connect(this.dest);
		osc.start(time);
		sub.start(time);
		osc.stop(time + .32);
		sub.stop(time + .32);
	}
	lead(time, r) {
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
		const peak = .12 + r.brightness * .1;
		g.gain.setValueAtTime(1e-4, time);
		g.gain.exponentialRampToValueAtTime(peak, time + .01);
		g.gain.exponentialRampToValueAtTime(.001, time + (r.leadStyle === "bell" ? .55 : .22));
		osc.connect(g);
		g.connect(this.leadBus);
		osc.start(time);
		osc.stop(time + .6);
	}
	arp(time, r, step) {
		const scale = SCALES[r.scale];
		const root = KEY_ROOT[r.key] ?? 57;
		const chord = this.chordRootDegree();
		const deg = (this.arpMotif[step % this.arpMotif.length] ?? 0) + chord;
		const midi = degreeToMidi(root, scale, deg, 1);
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = "square";
		osc.frequency.setValueAtTime(midiToFreq(midi), time);
		g.gain.setValueAtTime(1e-4, time);
		g.gain.exponentialRampToValueAtTime(.07, time + .008);
		g.gain.exponentialRampToValueAtTime(.001, time + .09);
		osc.connect(g);
		g.connect(this.leadBus);
		osc.start(time);
		osc.stop(time + .12);
	}
	padLevel() {
		const r = this.recipe;
		if (!r || r.padStyle === "none") return .001;
		return r.padStyle === "air" ? .07 : .1;
	}
	startPads(r) {
		if (r.padStyle === "none") return;
		const scale = SCALES[r.scale];
		const root = KEY_ROOT[r.key] ?? 57;
		const degrees = [
			0,
			2,
			4
		];
		const now = this.ctx.currentTime;
		this.padOsc = [];
		for (let i = 0; i < degrees.length; i++) {
			const osc = this.ctx.createOscillator();
			osc.type = "sine";
			const midi = degreeToMidi(root, scale, (r.progression[0] ?? 0) + degrees[i], 0);
			osc.frequency.value = midiToFreq(midi);
			osc.detune.value = (i - 1) * 6;
			osc.connect(this.padGain);
			osc.start(now);
			this.padOsc.push(osc);
		}
		this.padGain.gain.cancelScheduledValues(now);
		this.padGain.gain.setValueAtTime(.001, now);
		this.padGain.gain.exponentialRampToValueAtTime(this.padLevel(), now + 1.2);
	}
	fadePads(level, dur) {
		const now = this.ctx.currentTime;
		this.padGain.gain.cancelScheduledValues(now);
		this.padGain.gain.setTargetAtTime(Math.max(.001, level), now, dur);
	}
	stopPads() {
		const now = this.ctx.currentTime;
		this.padGain.gain.cancelScheduledValues(now);
		this.padGain.gain.setTargetAtTime(.001, now, .08);
		for (const osc of this.padOsc) try {
			osc.stop(now + .2);
		} catch {}
		this.padOsc = [];
	}
};
var HelixEngine = class {
	ctx;
	master;
	analyser;
	sourceGain;
	tap;
	current = null;
	stream = null;
	mediaEl = null;
	mediaNode = null;
	videoEl = null;
	videoNode = null;
	synth;
	source = "idle";
	syncOffset = 0;
	freq = /* @__PURE__ */ new Uint8Array(1024);
	time = /* @__PURE__ */ new Uint8Array(2048);
	constructor() {
		const Ctx = window.AudioContext || window.webkitAudioContext;
		this.ctx = new Ctx({ latencyHint: "interactive" });
		this.master = this.ctx.createGain();
		this.master.gain.value = .85;
		this.analyser = this.ctx.createAnalyser();
		this.analyser.fftSize = 2048;
		this.analyser.smoothingTimeConstant = .78;
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
	setVolume(v) {
		const g = Math.max(0, Math.min(1, v));
		this.master.gain.setTargetAtTime(g * g, this.ctx.currentTime, .03);
	}
	sample() {
		this.analyser.getByteFrequencyData(this.freq);
		this.analyser.getByteTimeDomainData(this.time);
		return {
			freq: this.freq,
			time: this.time
		};
	}
	disconnectCurrent() {
		this.synth.stop();
		if (this.current) {
			try {
				this.current.disconnect();
			} catch {}
			this.current = null;
		}
		if (this.stream) {
			for (const t of this.stream.getTracks()) t.stop();
			this.stream = null;
		}
		try {
			this.mediaEl?.pause();
		} catch {}
		try {
			this.videoEl?.pause();
		} catch {}
	}
	async startMic() {
		await this.resume();
		this.disconnectCurrent();
		this.source = "mic";
		this.stream = await navigator.mediaDevices.getUserMedia({ audio: {
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false
		} });
		const node = this.ctx.createMediaStreamSource(this.stream);
		node.connect(this.analyser);
		this.current = node;
	}
	connectFile(el) {
		this.resume();
		this.disconnectCurrent();
		this.source = "file";
		this.mediaEl = el;
		this.videoEl = null;
		if (!this.mediaNode || this.mediaNode.mediaElement !== el) this.mediaNode = this.ctx.createMediaElementSource(el);
		this.mediaNode.connect(this.sourceGain);
		this.current = this.mediaNode;
	}
	attachVideo(el) {
		this.videoEl = el;
	}
	connectSync(audio, video, useVideoAudio) {
		this.disconnectCurrent();
		this.source = "sync";
		this.videoEl = video;
		this.mediaEl = audio;
		if (audio) {
			if (!this.mediaNode || this.mediaNode.mediaElement !== audio) this.mediaNode = this.ctx.createMediaElementSource(audio);
			this.mediaNode.connect(this.sourceGain);
			this.current = this.mediaNode;
			if (video) video.muted = true;
		} else if (video && useVideoAudio) {
			video.muted = false;
			if (!this.videoNode || this.videoNode.mediaElement !== video) this.videoNode = this.ctx.createMediaElementSource(video);
			this.videoNode.connect(this.sourceGain);
			this.current = this.videoNode;
		}
	}
	playRecipe(recipe) {
		this.resume();
		this.disconnectCurrent();
		this.source = "generate";
		this.synth.start(recipe);
		this.current = null;
	}
	previewStemRecipe(recipe) {
		this.playRecipe(recipe);
	}
	playMedia() {
		this.resume();
		if (this.synth.recipe && this.source === "generate") {
			this.synth.resume();
			return;
		}
		this.mediaEl?.play();
		this.videoEl?.play();
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
	seek(t) {
		if (this.mediaEl) this.mediaEl.currentTime = t;
		if (this.videoEl) this.videoEl.currentTime = Math.max(0, t + this.syncOffset);
	}
	syncClock() {
		if (this.source !== "sync" || !this.videoEl) return;
		const audioTime = this.mediaEl?.currentTime ?? this.videoEl.currentTime;
		const target = Math.max(0, audioTime + this.syncOffset);
		if (Math.abs(this.videoEl.currentTime - target) > .09) this.videoEl.currentTime = target;
	}
	stopAll() {
		this.disconnectCurrent();
		this.source = "idle";
	}
};
var singleton = null;
function getEngine() {
	return singleton;
}
function createEngine() {
	if (!singleton) singleton = new HelixEngine();
	return singleton;
}
var useHelix = create((set) => ({
	entered: false,
	hudVisible: true,
	isPlaying: false,
	source: "generate",
	vizMode: "circular",
	themeId: "porcelain",
	sensitivity: 1.05,
	smoothness: .22,
	volume: .85,
	panel: null,
	fullscreen: false,
	composeMode: "semantic",
	nowPlaying: null,
	recipe: null,
	fileName: null,
	videoName: null,
	syncOffset: 0,
	generating: false,
	generateError: null,
	selectedStems: [
		"harbor-kick",
		"low-tide-sub",
		"night-market-pad"
	],
	set: (partial) => set(partial)
}));
var MODES = [
	{
		id: "bars",
		label: "Bars",
		icon: AudioLines
	},
	{
		id: "circular",
		label: "Circular",
		icon: CircleDashed
	},
	{
		id: "radial",
		label: "Radial",
		icon: Aperture
	},
	{
		id: "wave",
		label: "Wave",
		icon: Waves
	},
	{
		id: "bloom",
		label: "Bloom",
		icon: Orbit
	}
];
function TopChrome({ modelVersion, onFullscreen, onLook }) {
	const { hudVisible, nowPlaying, fullscreen, panel } = useHelix();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: cn("pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4 pt-4 sm:px-6 sm:pt-5", "transition-opacity duration-fast ease-out", hudVisible || panel !== null || !nowPlaying ? "opacity-100" : "opacity-0"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-xl italic leading-none text-fg",
				children: "Helix"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-xs text-muted tabular-nums",
				children: modelVersion
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto flex items-center gap-2",
			children: [
				nowPlaying && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hidden max-w-xs rounded-lg border border-border bg-surface/90 px-3 py-2 sm:block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-sm font-medium text-fg",
						children: nowPlaying.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate font-mono text-xs text-muted",
						children: nowPlaying.meta
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					"aria-label": "Look",
					onClick: onLook,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Palette, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					"aria-label": fullscreen ? "Exit fullscreen" : "Enter fullscreen",
					onClick: onFullscreen,
					children: fullscreen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize, { className: "size-5" })
				})
			]
		})]
	});
}
function Dock({ onPlay, onPanel, onSource }) {
	const { hudVisible, isPlaying, source, vizMode, sensitivity, panel, nowPlaying, set } = useHelix();
	const show = hudVisible || panel !== null || !isPlaying;
	const showSeek = source === "file" || source === "sync";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5", "transition-opacity duration-fast ease-out", show ? "opacity-100" : "opacity-0"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-border bg-surface/92 p-2 shadow-[var(--shadow-panel)] sm:px-3 sm:py-2",
			children: [
				showSeek && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaProgress, {}),
				nowPlaying && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate px-2 text-xs text-muted sm:hidden",
					children: nowPlaying.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon",
									"aria-label": isPlaying ? "Pause" : "Play",
									onClick: onPlay,
									children: isPlaying ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconToggle, {
									active: source === "mic",
									label: "Microphone",
									onClick: () => onSource("mic"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconToggle, {
									active: source === "file",
									label: "Upload track",
									onClick: () => onPanel("source"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconToggle, {
									active: panel === "generate" || source === "generate",
									label: "Generate",
									onClick: () => onPanel("generate"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AudioLines, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconToggle, {
									active: panel === "sync" || source === "sync",
									label: "Video sync",
									onClick: () => onPanel("sync"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waves, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconToggle, {
									active: panel === "forge",
									label: "Forge trainer",
									onClick: () => onPanel("forge"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat, { className: "size-4" })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hidden h-8 w-px bg-border sm:block" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-1 items-center gap-1 overflow-x-auto",
							children: MODES.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": m.label,
								"aria-pressed": vizMode === m.id,
								onClick: () => set({ vizMode: m.id }),
								className: cn("inline-flex size-11 items-center justify-center rounded-md text-muted transition-colors duration-quick", vizMode === m.id ? "bg-surface-2 text-fg" : "hover:text-fg"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(m.icon, { className: "size-4" })
							}, m.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex min-w-0 flex-1 items-center gap-3 px-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden text-xs text-muted sm:inline",
								children: "Sense"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
								min: .3,
								max: 2.4,
								step: .02,
								value: [sensitivity],
								onValueChange: (v) => set({ sensitivity: v[0] ?? 1 }),
								"aria-label": "Sensitivity"
							})]
						})
					]
				})
			]
		})
	});
}
function fmtTime(s) {
	if (!Number.isFinite(s) || s < 0) return "0:00";
	return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}
function MediaProgress() {
	const [t, setT] = (0, import_react.useState)(0);
	const [d, setD] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => {
			const engine = getEngine();
			if (!engine) return;
			setT(engine.mediaCurrentTime);
			setD(engine.mediaDuration);
		}, 200);
		return () => window.clearInterval(id);
	}, []);
	if (d <= 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3 px-2 pt-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-10 font-mono text-xs text-muted tabular-nums",
				children: fmtTime(t)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: 0,
				max: d,
				step: .05,
				value: [Math.min(t, d)],
				onValueChange: (v) => getEngine()?.seek(v[0] ?? 0),
				"aria-label": "Seek"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-10 text-right font-mono text-xs text-muted tabular-nums",
				children: fmtTime(d)
			})
		]
	});
}
function IconToggle({ active, label, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		"aria-pressed": active,
		onClick,
		className: cn("inline-flex size-11 items-center justify-center rounded-md transition-colors duration-quick", active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg hover:bg-surface-2"),
		children
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg", "placeholder:text-subtle", "transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50", "disabled:opacity-40", className),
		...props
	});
}
var KEY = "helix.training.v1";
var SEEDED_PATCHES = [
	{
		week: "2026-08-04",
		version: "R7.0",
		notes: "Raised nocturnal tempo bias from harbor stems."
	},
	{
		week: "2026-08-11",
		version: "R7.1",
		notes: "Denser hats on liked breakbeat sessions."
	},
	{
		week: "2026-08-18",
		version: "R7.2",
		notes: "Warmer pad voicing after silk-pad previews."
	}
];
function defaultState() {
	const now = Date.now();
	return {
		modelVersion: "R7.3",
		lastNightlyAt: now - 936e5,
		nextNightlyAt: now + 72e5,
		dailyRuns: [
			{
				date: "2026-08-26",
				notes: "Ingested 18 stem diffs. Energy −0.02.",
				energy: .44,
				density: .4
			},
			{
				date: "2026-08-27",
				notes: "Feedback fold: pluck leads retained.",
				energy: .43,
				density: .39
			},
			{
				date: "2026-08-28",
				notes: "Swing nudged on boom-bap likes.",
				energy: .42,
				density: .4
			}
		],
		weeklyPatches: SEEDED_PATCHES,
		weights: {
			energy: .42,
			density: .4,
			brightness: .38,
			swing: .12,
			genreBias: {
				ambient: .4,
				"trip-hop": .35,
				cinematic: .2
			}
		},
		observations: [],
		feedback: [],
		observationEnabled: true,
		stemCount: 12
	};
}
function bumpVersion(v) {
	const m = /^R(\d+)\.(\d+)$/.exec(v);
	if (!m) return "R7.4";
	return `R${m[1]}.${Number(m[2]) + 1}`;
}
function loadTraining() {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				...defaultState(),
				...parsed
			};
		}
	} catch {}
	return defaultState();
}
function saveTraining(state) {
	localStorage.setItem(KEY, JSON.stringify(state));
}
function runNightlyIfDue(state) {
	const now = Date.now();
	if (now - state.lastNightlyAt < 72e6) return state;
	const likes = state.feedback.filter((f) => f.liked).slice(-12);
	const next = {
		...state,
		weights: {
			...state.weights,
			genreBias: { ...state.weights.genreBias }
		}
	};
	if (likes.length) next.weights.energy = clamp01(next.weights.energy * .85 + .075);
	const date = new Date(now).toISOString().slice(0, 10);
	next.dailyRuns = [{
		date,
		notes: `Recursive pass on ${state.stemCount} community stems + ${state.feedback.length} feedback rows.`,
		energy: next.weights.energy,
		density: next.weights.density
	}, ...next.dailyRuns].slice(0, 21);
	next.lastNightlyAt = now;
	next.nextNightlyAt = now + 864e5;
	if (next.dailyRuns.length >= 7 && next.dailyRuns.length % 7 === 0) {
		const version = bumpVersion(next.modelVersion);
		next.modelVersion = version;
		next.weeklyPatches = [{
			week: date,
			version,
			notes: "Daily runs folded. Stem map reweighted. Upgrade pack applied on-device."
		}, ...next.weeklyPatches].slice(0, 12);
	}
	saveTraining(next);
	return next;
}
function recordObservation(state, event, detail) {
	if (!state.observationEnabled) return state;
	const next = {
		...state,
		observations: [{
			t: Date.now(),
			event,
			detail
		}, ...state.observations].slice(0, 80)
	};
	saveTraining(next);
	return next;
}
function recordFeedback(state, recipe, liked) {
	const weights = {
		...state.weights,
		genreBias: { ...state.weights.genreBias }
	};
	const dir = liked ? 1 : -1;
	weights.energy = clamp01(weights.energy + dir * (recipe.energy - weights.energy) * .12);
	weights.density = clamp01(weights.density + dir * (recipe.density - weights.density) * .12);
	weights.brightness = clamp01(weights.brightness + dir * (recipe.brightness - weights.brightness) * .1);
	weights.swing = clamp01(weights.swing + dir * (recipe.swing - weights.swing) * .08);
	for (const style of recipe.styles) weights.genreBias[style] = clamp01((weights.genreBias[style] ?? .2) + dir * .08);
	const next = {
		...state,
		weights,
		feedback: [{
			recipeId: recipe.id,
			title: recipe.title,
			liked,
			t: Date.now()
		}, ...state.feedback].slice(0, 80)
	};
	saveTraining(next);
	return next;
}
function clamp01(n) {
	return Math.max(0, Math.min(1, n));
}
function formatCountdown(ms) {
	if (ms <= 0) return "due";
	return `${Math.floor(ms / 36e5)}h ${Math.floor(ms % 36e5 / 6e4)}m`;
}
var VIZ_THEMES = [
	{
		id: "porcelain",
		name: "Porcelain",
		low: [
			200,
			204,
			212
		],
		mid: [
			232,
			232,
			236
		],
		high: [
			250,
			250,
			252
		],
		glow: [
			180,
			186,
			196
		],
		bg: [
			7,
			7,
			8
		]
	},
	{
		id: "ember",
		name: "Ember",
		low: [
			168,
			82,
			58
		],
		mid: [
			214,
			140,
			96
		],
		high: [
			240,
			210,
			186
		],
		glow: [
			196,
			92,
			62
		],
		bg: [
			10,
			7,
			6
		]
	},
	{
		id: "ice",
		name: "Ice",
		low: [
			86,
			130,
			150
		],
		mid: [
			150,
			186,
			202
		],
		high: [
			226,
			238,
			242
		],
		glow: [
			110,
			164,
			186
		],
		bg: [
			6,
			8,
			10
		]
	},
	{
		id: "moss",
		name: "Moss",
		low: [
			74,
			110,
			88
		],
		mid: [
			140,
			168,
			142
		],
		high: [
			214,
			226,
			210
		],
		glow: [
			92,
			138,
			108
		],
		bg: [
			6,
			8,
			7
		]
	},
	{
		id: "nocturne",
		name: "Nocturne",
		low: [
			72,
			84,
			108
		],
		mid: [
			148,
			156,
			178
		],
		high: [
			226,
			228,
			236
		],
		glow: [
			96,
			112,
			150
		],
		bg: [
			6,
			6,
			10
		]
	}
];
function lerpColor(a, b, t) {
	return [
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t
	];
}
function rgb(c, a = 1) {
	return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
function FloatingPanel({ title, onClose, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "absolute inset-x-3 bottom-28 z-20 max-h-[min(62dvh,560px)] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:inset-x-auto sm:right-5 sm:bottom-28 sm:top-20 sm:max-h-none sm:w-[400px] sm:p-5",
		role: "dialog",
		"aria-label": title,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl italic text-fg",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon-sm",
				"aria-label": "Close",
				onClick: onClose,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
			})]
		}), children]
	});
}
function SourcePanel({ onPickAudio }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Drop a track onto the stage, or choose a file. Play and pause from the dock. Sensitivity shapes how hard the picture leans on the signal."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2 text-sm text-muted hover:text-fg",
			children: ["Choose audio", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "file",
				accept: "audio/*",
				className: "sr-only",
				onChange: (e) => {
					const f = e.target.files?.[0];
					if (f) onPickAudio(f);
				}
			})]
		})]
	});
}
function GeneratePanel({ onGenerate, onFeedback }) {
	const { composeMode, generating, generateError, recipe, selectedStems, set } = useHelix();
	const [prompt, setPrompt] = (0, import_react.useState)("Rain on a closed harbor at 2am");
	const [blendWith, setBlendWith] = (0, import_react.useState)("dusty boom-bap");
	const [blend, setBlend] = (0, import_react.useState)(.45);
	const modes = [
		{
			id: "semantic",
			label: "Semantic"
		},
		{
			id: "artist",
			label: "Artist"
		},
		{
			id: "song",
			label: "Song"
		},
		{
			id: "blend",
			label: "Blend"
		}
	];
	const placeholder = composeMode === "artist" ? "Agnes Obel, early Massive Attack" : composeMode === "song" ? "A climate, not a cover — e.g. midnight highway" : composeMode === "blend" ? "First climate" : "Fog, sodium lamps, a slow pulse";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Helix writes an original score from artist climate, song climate, semantic scene, or a blend. It never copies a recording."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1 rounded-lg bg-surface-2 p-1",
				children: modes.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => set({ composeMode: m.id }),
					className: cn("h-9 flex-1 rounded-md text-xs font-medium transition-colors duration-150", composeMode === m.id ? "bg-surface text-fg" : "text-muted hover:text-fg"),
					children: m.label
				}, m.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: prompt,
				onChange: (e) => setPrompt(e.target.value),
				placeholder,
				"aria-label": "Compose prompt"
			}),
			composeMode === "blend" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: blendWith,
				onChange: (e) => setBlendWith(e.target.value),
				placeholder: "Second climate",
				"aria-label": "Blend with"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-1 flex justify-between text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Toward first" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Toward second" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: 0,
				max: 1,
				step: .01,
				value: [blend],
				onValueChange: (v) => setBlend(v[0] ?? .5)
			})] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-xs font-medium text-muted",
				children: "Stem influence"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1.5",
				children: STEMS.map((stem) => {
					const on = selectedStems.includes(stem.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => set({ selectedStems: on ? selectedStems.filter((id) => id !== stem.id) : [...selectedStems, stem.id] }),
						className: cn("h-8 rounded-full border px-3 text-xs transition-colors duration-150", on ? "border-accent bg-accent text-accent-fg" : "border-border text-muted hover:text-fg"),
						children: stem.name
					}, stem.id);
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				disabled: generating || prompt.trim().length < 2,
				onClick: () => onGenerate(composeMode, prompt, composeMode === "blend" ? blendWith : void 0, composeMode === "blend" ? blend : void 0),
				children: generating ? "Composing…" : "Compose score"
			}),
			generateError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-danger",
				children: generateError
			}),
			recipe && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecipeCard, {
				recipe,
				onFeedback
			}, recipe.id)
		]
	});
}
function RecipeCard({ recipe, onFeedback }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-surface-2 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium text-fg",
				children: recipe.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 font-mono text-xs text-muted tabular-nums",
				children: [
					recipe.bpm,
					" BPM · ",
					recipe.key,
					" ",
					recipe.scale,
					" · ",
					recipe.styles.join(" / ")
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: recipe.rationale
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "secondary",
					size: "sm",
					onClick: () => onFeedback(true),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThumbsUp, { className: "size-3.5" }), " Keep"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => onFeedback(false),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThumbsDown, { className: "size-3.5" }), " Discard climate"]
				})]
			})
		]
	});
}
function SyncPanel({ onPickVideo, onPickTrack }) {
	const { videoName, fileName, syncOffset, set } = useHelix();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Picture and sound, locked. Upload a video and a separate track, then slide the offset until the cut hits the downbeat. If you only bring video, Helix reads its soundtrack."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSlot, {
				label: "Video",
				name: videoName,
				accept: "video/*",
				onPick: onPickVideo
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSlot, {
				label: "Track",
				name: fileName,
				accept: "audio/*",
				onPick: onPickTrack
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-1 flex justify-between text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Video offset" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono tabular-nums",
					children: [
						syncOffset > 0 ? "+" : "",
						syncOffset.toFixed(2),
						"s"
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: -2.5,
				max: 2.5,
				step: .01,
				value: [syncOffset],
				onValueChange: (v) => set({ syncOffset: v[0] ?? 0 }),
				"aria-label": "Video offset"
			})] })
		]
	});
}
function FileSlot({ label, name, accept, onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-3 text-sm hover:border-border-strong",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "max-w-[60%] truncate text-fg",
				children: name ?? "Choose file"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "file",
				accept,
				className: "sr-only",
				onChange: (e) => {
					const f = e.target.files?.[0];
					if (f) onPick(f);
				}
			})
		]
	});
}
function LookPanel() {
	const { themeId, smoothness, volume, set } = useHelix();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Color of the picture. Chrome stays quiet."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2",
				children: VIZ_THEMES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => set({ themeId: t.id }),
					className: cn("flex h-12 items-center gap-2 rounded-lg border px-3 text-sm", themeId === t.id ? "border-accent text-fg" : "border-border text-muted"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "size-4 rounded-full",
						style: { background: `rgb(${t.mid.join(",")})` }
					}), t.name]
				}, t.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-xs text-muted",
				children: "Smoothness"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: .08,
				max: .45,
				step: .01,
				value: [smoothness],
				onValueChange: (v) => set({ smoothness: v[0] ?? .22 })
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-xs text-muted",
				children: "Volume"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: 0,
				max: 1,
				step: .01,
				value: [volume],
				onValueChange: (v) => set({ volume: v[0] ?? .85 })
			})] })
		]
	});
}
function ForgePanel({ training, onToggleObserve, onPreviewStem }) {
	const until = (0, import_react.useMemo)(() => formatCountdown(training.nextNightlyAt - Date.now()), [training.nextNightlyAt]);
	const latestDaily = training.dailyRuns[0];
	const latestPatch = training.weeklyPatches[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Helix-R trains on community stems and your listening. Nightly recursive passes ingest observations and feedback. Daily runs fold into a weekly patch — an upgrade pack applied on-device."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid grid-cols-2 gap-3 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Model",
						value: training.modelVersion
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Stems",
						value: String(training.stemCount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Nightly",
						value: until
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Feedback",
						value: String(training.feedback.length)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-xs font-medium text-muted",
				children: "Latest daily"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-fg",
				children: latestDaily?.notes
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-xs font-medium text-muted",
				children: "Weekly patch"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-fg",
				children: [
					latestPatch?.version,
					" · ",
					latestPatch?.notes
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center justify-between gap-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "Observe interactions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "switch",
					"aria-checked": training.observationEnabled,
					onClick: onToggleObserve,
					className: cn("h-7 w-11 rounded-full transition-colors duration-150", training.observationEnabled ? "bg-accent" : "bg-surface-2"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("block size-5 translate-x-1 rounded-full bg-fg transition-transform duration-150", training.observationEnabled && "translate-x-5") })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-xs font-medium text-muted",
				children: "Community stems"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-1",
				children: STEMS.map((stem) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onPreviewStem(stem.id),
					className: "flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-surface-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-fg",
						children: stem.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-xs text-muted",
						children: [
							stem.contributor,
							" · ",
							stem.kind
						]
					})]
				}) }, stem.id))
			})] }),
			training.observations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-xs font-medium text-muted",
				children: "Recent ingestion"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-1",
				children: training.observations.slice(0, 5).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex justify-between gap-2 text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: o.event }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: o.detail
					})]
				}, o.t))
			})] })
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg bg-surface-2 px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "font-mono text-sm text-fg tabular-nums",
			children: value
		})]
	});
}
function StartGate({ onEnter }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,var(--color-bg)_100%)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative flex max-w-xl flex-col items-center gap-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-[0.22em] text-muted uppercase",
					children: "Visualizer · Studio · Trainer"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl leading-tight tracking-[-0.03em] italic text-fg",
					children: "Helix"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "max-w-md text-base text-muted",
					children: "Listen through a microphone, a file, or a generated score. Overlay a video and lock it to the track. Community stems train on-device, nightly, into weekly patches."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "lg",
					onClick: onEnter,
					className: "min-w-40 rounded-lg",
					children: "Enter"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-subtle tabular-nums",
					children: "R7.3 · on-device"
				})
			]
		})]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var composeScore = createServerFn({ method: "POST" }).validator((data) => {
	if (!data || typeof data.prompt !== "string" || data.prompt.trim().length < 1) throw new Error("Describe an artist, song, or climate.");
	return {
		...data,
		prompt: data.prompt.trim().slice(0, 400),
		blendWith: data.blendWith?.trim().slice(0, 400)
	};
}).handler(createSsrRpc("2bfe7f353761f5948d05592f804ce20dbf2a9057a746f9658f8e1528491b896e"));
var HelixRenderer = class {
	canvas;
	ctx;
	smoothed;
	particles = [];
	rotation = 0;
	reduced = false;
	hasVideo = false;
	constructor(canvas) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d", { alpha: true });
		if (!ctx) throw new Error("Canvas unsupported");
		this.ctx = ctx;
		this.smoothed = /* @__PURE__ */ new Float32Array(96);
		this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}
	resize() {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		this.canvas.width = Math.max(1, Math.floor(w * dpr));
		this.canvas.height = Math.max(1, Math.floor(h * dpr));
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	draw(freq, time, mode, theme, sensitivity, smoothness, dt) {
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		const n = this.smoothed.length;
		const lerp = 1 - Math.max(.04, Math.min(.5, smoothness));
		for (let i = 0; i < n; i++) {
			const v = (freq[Math.min(freq.length - 1, Math.floor(Math.pow(i / n, 1.35) * freq.length))] ?? 0) / 255 * sensitivity;
			this.smoothed[i] = this.smoothed[i] + (v - this.smoothed[i]) * lerp;
		}
		if (!this.reduced) this.rotation += dt * .08;
		const g = this.ctx;
		g.clearRect(0, 0, w, h);
		if (!this.hasVideo) {
			g.fillStyle = rgb(theme.bg, 1);
			g.fillRect(0, 0, w, h);
			const wash = g.createRadialGradient(w * .5, h * .48, 20, w * .5, h * .48, Math.max(w, h) * .62);
			wash.addColorStop(0, rgb(theme.glow, .07));
			wash.addColorStop(1, rgb(theme.bg, 0));
			g.fillStyle = wash;
			g.fillRect(0, 0, w, h);
		}
		g.save();
		if (this.hasVideo) g.globalCompositeOperation = "screen";
		if (mode === "bars") this.bars(w, h, theme);
		else if (mode === "circular") this.circular(w, h, theme);
		else if (mode === "radial") this.radial(w, h, theme);
		else if (mode === "wave") this.wave(w, h, time, theme, sensitivity);
		else this.bloom(w, h, theme, dt);
		g.restore();
	}
	bandColor(t, theme, a = 1) {
		return rgb(t < .5 ? lerpColor(theme.low, theme.mid, t * 2) : lerpColor(theme.mid, theme.high, (t - .5) * 2), a);
	}
	bars(w, h, theme) {
		const g = this.ctx;
		const n = this.smoothed.length;
		const gap = 3;
		const barW = Math.max(2, w * .72 / n - gap);
		const originX = (w - n * (barW + gap)) / 2;
		const base = h * .62;
		const maxH = h * .42;
		for (let i = 0; i < n; i++) {
			const bh = Math.max(.02, this.smoothed[i]) * maxH;
			const x = originX + i * (barW + gap);
			g.fillStyle = this.bandColor(i / n, theme, .95);
			roundRect(g, x, base - bh, barW, bh, Math.min(4, barW / 2));
			g.fill();
			g.fillStyle = this.bandColor(i / n, theme, .18);
			roundRect(g, x, base + 6, barW, bh * .35, Math.min(4, barW / 2));
			g.fill();
		}
	}
	circular(w, h, theme) {
		const g = this.ctx;
		const n = this.smoothed.length;
		const cx = w * .5;
		const cy = h * .48;
		const bass = avg(this.smoothed, 0, 8);
		const radius = Math.min(w, h) * (.16 + bass * .05);
		g.beginPath();
		g.arc(cx, cy, radius * .72, 0, Math.PI * 2);
		g.fillStyle = rgb(theme.glow, .08 + bass * .12);
		g.fill();
		g.beginPath();
		g.arc(cx, cy, radius * .4, 0, Math.PI * 2);
		g.strokeStyle = rgb(theme.high, .55);
		g.lineWidth = 1.25;
		g.stroke();
		const inner = radius;
		const reach = Math.min(w, h) * .28;
		g.lineCap = "round";
		for (let i = 0; i < n; i++) {
			const t = i / n;
			const mag = Math.max(.04, this.smoothed[i]);
			const a = t * Math.PI * 2 - Math.PI / 2 + this.rotation;
			const outer = inner + mag * reach;
			const cos = Math.cos(a);
			const sin = Math.sin(a);
			g.beginPath();
			g.moveTo(cx + cos * inner, cy + sin * inner);
			g.lineTo(cx + cos * outer, cy + sin * outer);
			g.strokeStyle = this.bandColor(t, theme, .92);
			g.lineWidth = Math.max(2, Math.PI * 2 * inner / n * .55);
			g.stroke();
		}
	}
	radial(w, h, theme) {
		const g = this.ctx;
		const cx = w * .5;
		const cy = h * .48;
		const rings = 5;
		const maxR = Math.min(w, h) * .38;
		for (let r = 0; r < rings; r++) {
			const start = Math.floor(r / rings * this.smoothed.length);
			const end = Math.floor((r + 1) / rings * this.smoothed.length);
			const mag = avg(this.smoothed, start, end);
			const rad = maxR * ((r + 1) / rings) * (.72 + mag * .4);
			g.beginPath();
			g.arc(cx, cy, rad, 0, Math.PI * 2);
			g.strokeStyle = this.bandColor(r / 4, theme, .25 + mag * .55);
			g.lineWidth = 2 + mag * 10;
			g.stroke();
		}
	}
	wave(w, h, time, theme, sensitivity) {
		const g = this.ctx;
		const mid = h * .5;
		const amp = h * .22 * sensitivity;
		g.beginPath();
		const step = Math.max(1, Math.floor(time.length / Math.floor(w)));
		for (let x = 0, i = 0; x <= w; x++, i += step) {
			const y = mid + ((time[Math.min(i, time.length - 1)] ?? 128) - 128) / 128 * amp;
			if (x === 0) g.moveTo(x, y);
			else g.lineTo(x, y);
		}
		g.strokeStyle = rgb(theme.mid, .9);
		g.lineWidth = 1.75;
		g.stroke();
		g.lineTo(w, h);
		g.lineTo(0, h);
		g.closePath();
		const fill = g.createLinearGradient(0, mid - amp, 0, h);
		fill.addColorStop(0, rgb(theme.glow, .22));
		fill.addColorStop(1, rgb(theme.bg, 0));
		g.fillStyle = fill;
		g.fill();
	}
	bloom(w, h, theme, dt) {
		const g = this.ctx;
		const bass = avg(this.smoothed, 0, 10);
		const mid = avg(this.smoothed, 16, 40);
		const high = avg(this.smoothed, 50, 90);
		const energy = (bass + mid + high) / 3;
		const spawn = this.reduced ? 0 : Math.floor(energy * 14);
		for (let i = 0; i < spawn; i++) {
			const ang = Math.random() * Math.PI * 2;
			const spd = 18 + energy * 140;
			this.particles.push({
				x: w * .5,
				y: h * .48,
				vx: Math.cos(ang) * spd,
				vy: Math.sin(ang) * spd,
				life: 1,
				size: 1.2 + energy * 4,
				band: Math.random()
			});
		}
		if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
		g.beginPath();
		g.arc(w * .5, h * .48, 10 + bass * 36, 0, Math.PI * 2);
		g.fillStyle = rgb(theme.glow, .18 + bass * .35);
		g.fill();
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt * .55;
			if (p.life <= 0) {
				this.particles.splice(i, 1);
				continue;
			}
			g.beginPath();
			g.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
			g.fillStyle = this.bandColor(p.band, theme, p.life * .7);
			g.fill();
		}
	}
};
function avg(arr, start, end) {
	let s = 0;
	const a = Math.max(0, start);
	const b = Math.min(arr.length, end);
	if (b <= a) return 0;
	for (let i = a; i < b; i++) s += arr[i];
	return s / (b - a);
}
function roundRect(g, x, y, w, h, r) {
	const rr = Math.min(r, w / 2, h / 2);
	g.beginPath();
	g.moveTo(x + rr, y);
	g.arcTo(x + w, y, x + w, y + h, rr);
	g.arcTo(x + w, y + h, x, y + h, rr);
	g.arcTo(x, y + h, x, y, rr);
	g.arcTo(x, y, x + w, y, rr);
	g.closePath();
}
function fillIdleSpectrum(freq, time, t) {
	for (let i = 0; i < freq.length; i++) {
		const n = i / freq.length;
		const envelope = Math.exp(-n * 2.2);
		const wave = .55 + .45 * Math.sin(t * .55 + n * 8.2) * Math.sin(t * .19 + n * 2.4);
		const shimmer = .35 + .65 * Math.sin(t * 1.05 + i * .035);
		freq[i] = Math.floor((22 + 110 * wave * shimmer) * envelope);
	}
	for (let i = 0; i < time.length; i++) time[i] = 128 + Math.sin(t * 1.8 + i * .038) * 16 + Math.sin(t * .4 + i * .01) * 8;
}
var PREFS_KEY = "helix.prefs.v1";
var VIZ_MODE_KEYS = [
	"bars",
	"circular",
	"radial",
	"wave",
	"bloom"
];
function HelixApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const audioRef = (0, import_react.useRef)(null);
	const videoRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const audioUrl = (0, import_react.useRef)(null);
	const videoUrl = (0, import_react.useRef)(null);
	const stageRef = (0, import_react.useRef)(null);
	const [training, setTraining] = (0, import_react.useState)(null);
	const [notice, setNotice] = (0, import_react.useState)(null);
	const [dragging, setDragging] = (0, import_react.useState)(false);
	const { entered, isPlaying, source, panel, volume, syncOffset, videoName, hudVisible, set } = useHelix();
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(PREFS_KEY);
			if (!raw) return;
			const p = JSON.parse(raw);
			const patch = {};
			if (p.vizMode && VIZ_MODE_KEYS.includes(p.vizMode)) patch.vizMode = p.vizMode;
			if (p.themeId && VIZ_THEMES.some((t) => t.id === p.themeId)) patch.themeId = p.themeId;
			if (typeof p.sensitivity === "number") patch.sensitivity = p.sensitivity;
			if (typeof p.smoothness === "number") patch.smoothness = p.smoothness;
			if (typeof p.volume === "number") patch.volume = p.volume;
			if (Object.keys(patch).length) set(patch);
		} catch {}
		setTraining(runNightlyIfDue(loadTraining()));
	}, [set]);
	(0, import_react.useEffect)(() => {
		if (!entered) return;
		return useHelix.subscribe((s) => {
			try {
				localStorage.setItem(PREFS_KEY, JSON.stringify({
					vizMode: s.vizMode,
					themeId: s.themeId,
					sensitivity: s.sensitivity,
					smoothness: s.smoothness,
					volume: s.volume
				}));
			} catch {}
		});
	}, [entered]);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const renderer = new HelixRenderer(canvas);
		renderer.resize();
		const onResize = () => renderer.resize();
		const ro = new ResizeObserver(() => renderer.resize());
		ro.observe(canvas);
		window.addEventListener("resize", onResize);
		let raf = 0;
		let last = performance.now();
		const idleFreq = /* @__PURE__ */ new Uint8Array(1024);
		const idleTime = /* @__PURE__ */ new Uint8Array(2048);
		const loop = (now) => {
			const dt = Math.min(.05, (now - last) / 1e3);
			last = now;
			const s = useHelix.getState();
			const theme = VIZ_THEMES.find((t) => t.id === s.themeId) ?? VIZ_THEMES[0];
			const engine = engineRef.current;
			let freq;
			let time;
			if (engine && s.entered) {
				const sample = engine.sample();
				freq = sample.freq;
				time = sample.time;
				engine.syncClock();
			} else {
				fillIdleSpectrum(idleFreq, idleTime, now / 1e3);
				freq = idleFreq;
				time = idleTime;
			}
			renderer.hasVideo = Boolean(s.videoName) && (s.source === "sync" || Boolean(videoRef.current?.src));
			renderer.draw(freq, time, s.vizMode, theme, s.sensitivity, s.smoothness, dt);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", onResize);
			ro.disconnect();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		getEngine()?.setVolume(volume);
	}, [volume]);
	(0, import_react.useEffect)(() => {
		const engine = getEngine();
		if (engine) engine.syncOffset = syncOffset;
	}, [syncOffset]);
	(0, import_react.useEffect)(() => {
		if (!entered) return;
		let hide = 0;
		const bump = () => {
			set({ hudVisible: true });
			window.clearTimeout(hide);
			hide = window.setTimeout(() => {
				if (!useHelix.getState().panel) set({ hudVisible: false });
			}, 2800);
		};
		window.addEventListener("mousemove", bump, { passive: true });
		window.addEventListener("touchstart", bump, { passive: true });
		bump();
		return () => {
			window.removeEventListener("mousemove", bump);
			window.removeEventListener("touchstart", bump);
			window.clearTimeout(hide);
		};
	}, [entered, set]);
	const observe = (0, import_react.useCallback)((event, detail) => {
		setTraining((prev) => {
			if (!prev) return prev;
			return recordObservation(prev, event, detail);
		});
	}, []);
	const flash = (0, import_react.useCallback)((msg) => {
		setNotice(msg);
		window.setTimeout(() => setNotice(null), 3200);
	}, []);
	const ensureEngine = (0, import_react.useCallback)(async () => {
		if (!engineRef.current) engineRef.current = createEngine();
		await engineRef.current.resume();
		engineRef.current.setVolume(useHelix.getState().volume);
		return engineRef.current;
	}, []);
	const playRecipe = (0, import_react.useCallback)(async (next, metaExtra) => {
		(await ensureEngine()).playRecipe(next);
		set({
			entered: true,
			isPlaying: true,
			source: "generate",
			recipe: next,
			nowPlaying: {
				title: next.title,
				meta: `${next.bpm} BPM · ${next.key} ${next.scale}${metaExtra ? ` · ${metaExtra}` : ""}`
			}
		});
	}, [ensureEngine, set]);
	const enter = (0, import_react.useCallback)(async () => {
		await playRecipe(DEMO_RECIPE, DEMO_RECIPE.styles.join(" / "));
		observe("enter", "session");
	}, [observe, playRecipe]);
	const togglePlay = (0, import_react.useCallback)(async () => {
		const engine = await ensureEngine();
		if (useHelix.getState().isPlaying) {
			engine.pauseMedia();
			set({ isPlaying: false });
			return;
		}
		engine.playMedia();
		set({
			isPlaying: true,
			entered: true
		});
	}, [ensureEngine, set]);
	const startMic = (0, import_react.useCallback)(async () => {
		try {
			await (await ensureEngine()).startMic();
			set({
				entered: true,
				isPlaying: true,
				source: "mic",
				panel: null,
				nowPlaying: {
					title: "Microphone",
					meta: "Live input"
				}
			});
			observe("source", "mic");
		} catch {
			flash("Microphone needs permission in this browser.");
		}
	}, [
		ensureEngine,
		flash,
		observe,
		set
	]);
	const assignAudio = (0, import_react.useCallback)((file) => {
		const el = audioRef.current;
		if (!el) return;
		if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
		const url = URL.createObjectURL(file);
		audioUrl.current = url;
		el.src = url;
		el.load();
		set({ fileName: file.name });
		return el;
	}, [set]);
	const assignVideo = (0, import_react.useCallback)((file) => {
		const el = videoRef.current;
		if (!el) return;
		if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
		const url = URL.createObjectURL(file);
		videoUrl.current = url;
		el.src = url;
		el.load();
		set({ videoName: file.name });
		return el;
	}, [set]);
	const playFile = (0, import_react.useCallback)(async (file) => {
		const el = assignAudio(file);
		if (!el) return;
		(await ensureEngine()).connectFile(el);
		try {
			await el.play();
		} catch {}
		set({
			entered: true,
			isPlaying: true,
			source: "file",
			panel: null,
			nowPlaying: {
				title: file.name.replace(/\.[^.]+$/, ""),
				meta: "Uploaded track"
			}
		});
		observe("source", "file");
	}, [
		assignAudio,
		ensureEngine,
		observe,
		set
	]);
	const applySync = (0, import_react.useCallback)(async () => {
		const audio = audioRef.current;
		const video = videoRef.current;
		const s = useHelix.getState();
		const hasAudio = Boolean(s.fileName && audio?.src);
		const hasVideo = Boolean(s.videoName && video?.src);
		if (!hasAudio && !hasVideo) {
			flash("Add a video, a track, or both.");
			return;
		}
		const engine = await ensureEngine();
		engine.syncOffset = s.syncOffset;
		engine.connectSync(hasAudio ? audio : null, hasVideo ? video : null, !hasAudio);
		engine.playMedia();
		const title = s.videoName?.replace(/\.[^.]+$/, "") ?? s.fileName ?? "Sync";
		set({
			entered: true,
			isPlaying: true,
			source: "sync",
			nowPlaying: {
				title,
				meta: hasAudio && hasVideo ? "Picture locked to track" : hasVideo ? "Video soundtrack" : "Track only"
			}
		});
		observe("source", "sync");
	}, [
		ensureEngine,
		flash,
		observe,
		set
	]);
	const pickVideo = (0, import_react.useCallback)(async (file) => {
		const el = assignVideo(file);
		set({ panel: "sync" });
		if (!el) return;
		if (el.readyState >= 2) applySync();
		else el.addEventListener("loadeddata", () => void applySync(), { once: true });
	}, [
		applySync,
		assignVideo,
		set
	]);
	const pickSyncTrack = (0, import_react.useCallback)(async (file) => {
		const el = assignAudio(file);
		if (!el) return;
		if (el.readyState >= 2) applySync();
		else el.addEventListener("loadeddata", () => void applySync(), { once: true });
	}, [applySync, assignAudio]);
	const onGenerate = (0, import_react.useCallback)(async (mode, prompt, blendWith, blend) => {
		set({
			generating: true,
			generateError: null,
			panel: "generate"
		});
		try {
			const res = await composeScore({ data: {
				mode,
				prompt,
				blendWith,
				blend,
				stemIds: useHelix.getState().selectedStems,
				weights: training?.weights
			} });
			if (!res.recipe) {
				set({
					generating: false,
					generateError: "Could not compose that climate."
				});
				return;
			}
			await playRecipe(res.recipe, res.recipe.styles.join(" / "));
			set({
				generating: false,
				panel: "generate"
			});
			observe("compose", `${mode}:${res.recipe.title}`);
		} catch (err) {
			set({
				generating: false,
				generateError: err instanceof Error ? err.message : "Could not compose that climate."
			});
		}
	}, [
		observe,
		playRecipe,
		set,
		training?.weights
	]);
	const onFeedback = (0, import_react.useCallback)((liked) => {
		const current = useHelix.getState().recipe;
		if (!current || !training) return;
		const next = recordFeedback(training, current, liked);
		setTraining(next);
		flash(liked ? "Kept. Weights shifted toward this climate." : "Discarded. Trainer will lean away.");
		observe("feedback", liked ? `keep:${current.title}` : `discard:${current.title}`);
	}, [
		flash,
		observe,
		training
	]);
	const onPreviewStem = (0, import_react.useCallback)(async (id) => {
		const stem = STEMS.find((s) => s.id === id);
		if (!stem) return;
		const patch = recipeFromStems([id], stem.name);
		const next = {
			...DEMO_RECIPE,
			...patch,
			id: `stem-${id}`,
			title: stem.name,
			styles: stem.styles,
			stemIds: [id],
			rationale: `Preview of ${stem.name} from ${stem.contributor}.`
		};
		await playRecipe(next, `${stem.contributor} · ${stem.kind}`);
		observe("stem", id);
	}, [observe, playRecipe]);
	const toggleObserve = (0, import_react.useCallback)(() => {
		setTraining((prev) => {
			if (!prev) return prev;
			const next = {
				...prev,
				observationEnabled: !prev.observationEnabled
			};
			saveTraining(next);
			return next;
		});
	}, []);
	const togglePanel = (0, import_react.useCallback)((id) => {
		const open = useHelix.getState().panel === id ? null : id;
		set({
			panel: open,
			hudVisible: true
		});
	}, [set]);
	const toggleFullscreen = (0, import_react.useCallback)(async () => {
		const root = stageRef.current;
		if (!root) return;
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
				set({ fullscreen: false });
			} else {
				await root.requestFullscreen();
				set({ fullscreen: true });
			}
		} catch {
			flash("Fullscreen is not available here.");
		}
	}, [flash, set]);
	(0, import_react.useEffect)(() => {
		const onFs = () => set({ fullscreen: Boolean(document.fullscreenElement) });
		document.addEventListener("fullscreenchange", onFs);
		return () => document.removeEventListener("fullscreenchange", onFs);
	}, [set]);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const target = e.target;
			const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
			if (e.key === "Escape") {
				if (useHelix.getState().panel) set({ panel: null });
				return;
			}
			if (typing) return;
			if (!useHelix.getState().entered) {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					enter();
				}
				return;
			}
			if (e.key === " " || e.code === "Space") {
				e.preventDefault();
				togglePlay();
			} else if (e.key === "f" || e.key === "F") {
				e.preventDefault();
				toggleFullscreen();
			} else if (e.key >= "1" && e.key <= "5") {
				const mode = VIZ_MODE_KEYS[Number(e.key) - 1];
				if (mode) set({ vizMode: mode });
			} else if (e.key === "m" || e.key === "M") startMic();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		enter,
		set,
		startMic,
		toggleFullscreen,
		togglePlay
	]);
	const onDragOver = (e) => {
		e.preventDefault();
		setDragging(true);
	};
	const onDragLeave = () => setDragging(false);
	const onDrop = (e) => {
		e.preventDefault();
		setDragging(false);
		const files = [...e.dataTransfer.files];
		const video = files.find((f) => f.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(f.name));
		const audio = files.find((f) => f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name));
		if (video && audio) {
			assignVideo(video);
			assignAudio(audio);
			set({ panel: "sync" });
			window.setTimeout(() => void applySync(), 80);
		} else if (video) pickVideo(video);
		else if (audio) playFile(audio);
	};
	const showVideo = Boolean(videoName) && source === "sync";
	const panelTitle = panel === "source" ? "Track" : panel === "generate" ? "Compose" : panel === "sync" ? "Picture lock" : panel === "forge" ? "Forge" : panel === "look" ? "Look" : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: stageRef,
		className: cn("relative h-dvh overflow-hidden bg-bg text-fg", entered && !hudVisible && isPlaying && "cursor-none"),
		onDragOver,
		onDragLeave,
		onDrop,
		onClick: (e) => {
			if (!entered) return;
			set({ hudVisible: true });
			if (e.target === e.currentTarget && panel) set({ panel: null });
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref: videoRef,
				className: cn("pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-fast", showVideo ? "opacity-100" : "opacity-0"),
				playsInline: true,
				loop: true,
				preload: "auto",
				"aria-hidden": !showVideo
			}),
			showVideo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 bg-bg/55" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "pointer-events-none absolute inset-0 h-full w-full"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
				ref: audioRef,
				className: "hidden",
				loop: true,
				preload: "auto"
			}),
			dragging && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-accent/40 bg-bg/70",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl italic text-fg",
					children: "Drop a track or video"
				})
			}),
			!entered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StartGate, { onEnter: () => void enter() }),
			entered && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopChrome, {
					modelVersion: training?.modelVersion ?? "R7.3",
					onFullscreen: () => void toggleFullscreen(),
					onLook: () => togglePanel("look")
				}),
				panel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FloatingPanel, {
					title: panelTitle,
					onClose: () => set({ panel: null }),
					children: [
						panel === "source" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourcePanel, { onPickAudio: (f) => void playFile(f) }),
						panel === "generate" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GeneratePanel, {
							onGenerate: (m, p, b, n) => void onGenerate(m, p, b, n),
							onFeedback
						}),
						panel === "sync" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SyncPanel, {
							onPickVideo: (f) => void pickVideo(f),
							onPickTrack: (f) => void pickSyncTrack(f)
						}),
						panel === "look" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LookPanel, {}),
						panel === "forge" && training && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForgePanel, {
							training,
							onToggleObserve: toggleObserve,
							onPreviewStem: (id) => void onPreviewStem(id)
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dock, {
					onPlay: () => void togglePlay(),
					onPanel: togglePanel,
					onSource: (s) => {
						if (s === "mic") startMic();
					}
				})
			] }),
			notice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				role: "status",
				"aria-live": "polite",
				className: "absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg shadow-[var(--shadow-panel)]",
				children: notice
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelixApp, {});
}
//#endregion
export { Home as component };
