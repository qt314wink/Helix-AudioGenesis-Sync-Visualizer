import { lerpColor, rgb, type VizTheme } from "./themes";

export type VizMode = "bars" | "circular" | "radial" | "wave" | "bloom";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  band: number;
}

export class HelixRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private smoothed: Float32Array;
  private particles: Particle[] = [];
  private rotation = 0;
  private reduced = false;
  hasVideo = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas unsupported");
    this.ctx = ctx;
    this.smoothed = new Float32Array(96);
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

  draw(
    freq: Uint8Array,
    time: Uint8Array,
    mode: VizMode,
    theme: VizTheme,
    sensitivity: number,
    smoothness: number,
    dt: number,
  ) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const n = this.smoothed.length;
    const lerp = 1 - Math.max(0.04, Math.min(0.5, smoothness));
    for (let i = 0; i < n; i++) {
      const src = Math.min(freq.length - 1, Math.floor(Math.pow(i / n, 1.35) * freq.length));
      const v = ((freq[src] ?? 0) / 255) * sensitivity;
      this.smoothed[i] = this.smoothed[i]! + (v - this.smoothed[i]!) * lerp;
    }
    if (!this.reduced) this.rotation += dt * 0.08;

    const g = this.ctx;
    g.clearRect(0, 0, w, h);
    if (!this.hasVideo) {
      g.fillStyle = rgb(theme.bg, 1);
      g.fillRect(0, 0, w, h);
      const wash = g.createRadialGradient(w * 0.5, h * 0.48, 20, w * 0.5, h * 0.48, Math.max(w, h) * 0.62);
      wash.addColorStop(0, rgb(theme.glow, 0.07));
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

  private bandColor(t: number, theme: VizTheme, a = 1) {
    const c =
      t < 0.5
        ? lerpColor(theme.low, theme.mid, t * 2)
        : lerpColor(theme.mid, theme.high, (t - 0.5) * 2);
    return rgb(c, a);
  }

  private bars(w: number, h: number, theme: VizTheme) {
    const g = this.ctx;
    const n = this.smoothed.length;
    const gap = 3;
    const barW = Math.max(2, (w * 0.72) / n - gap);
    const originX = (w - n * (barW + gap)) / 2;
    const base = h * 0.62;
    const maxH = h * 0.42;
    for (let i = 0; i < n; i++) {
      const mag = Math.max(0.02, this.smoothed[i]!);
      const bh = mag * maxH;
      const x = originX + i * (barW + gap);
      g.fillStyle = this.bandColor(i / n, theme, 0.95);
      roundRect(g, x, base - bh, barW, bh, Math.min(4, barW / 2));
      g.fill();
      g.fillStyle = this.bandColor(i / n, theme, 0.18);
      roundRect(g, x, base + 6, barW, bh * 0.35, Math.min(4, barW / 2));
      g.fill();
    }
  }

  private circular(w: number, h: number, theme: VizTheme) {
    const g = this.ctx;
    const n = this.smoothed.length;
    const cx = w * 0.5;
    const cy = h * 0.48;
    const bass = avg(this.smoothed, 0, 8);
    const radius = Math.min(w, h) * (0.16 + bass * 0.05);
    g.beginPath();
    g.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
    g.fillStyle = rgb(theme.glow, 0.08 + bass * 0.12);
    g.fill();
    g.beginPath();
    g.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
    g.strokeStyle = rgb(theme.high, 0.55);
    g.lineWidth = 1.25;
    g.stroke();

    const inner = radius;
    const reach = Math.min(w, h) * 0.28;
    g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const mag = Math.max(0.04, this.smoothed[i]!);
      const a = t * Math.PI * 2 - Math.PI / 2 + this.rotation;
      const outer = inner + mag * reach;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      g.beginPath();
      g.moveTo(cx + cos * inner, cy + sin * inner);
      g.lineTo(cx + cos * outer, cy + sin * outer);
      g.strokeStyle = this.bandColor(t, theme, 0.92);
      g.lineWidth = Math.max(2, (Math.PI * 2 * inner) / n * 0.55);
      g.stroke();
    }
  }

  private radial(w: number, h: number, theme: VizTheme) {
    const g = this.ctx;
    const cx = w * 0.5;
    const cy = h * 0.48;
    const rings = 5;
    const maxR = Math.min(w, h) * 0.38;
    for (let r = 0; r < rings; r++) {
      const start = Math.floor((r / rings) * this.smoothed.length);
      const end = Math.floor(((r + 1) / rings) * this.smoothed.length);
      const mag = avg(this.smoothed, start, end);
      const rad = maxR * ((r + 1) / rings) * (0.72 + mag * 0.4);
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.strokeStyle = this.bandColor(r / (rings - 1), theme, 0.25 + mag * 0.55);
      g.lineWidth = 2 + mag * 10;
      g.stroke();
    }
  }

  private wave(w: number, h: number, time: Uint8Array, theme: VizTheme, sensitivity: number) {
    const g = this.ctx;
    const mid = h * 0.5;
    const amp = h * 0.22 * sensitivity;
    g.beginPath();
    const step = Math.max(1, Math.floor(time.length / Math.floor(w)));
    for (let x = 0, i = 0; x <= w; x++, i += step) {
      const sample = ((time[Math.min(i, time.length - 1)] ?? 128) - 128) / 128;
      const y = mid + sample * amp;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokeStyle = rgb(theme.mid, 0.9);
    g.lineWidth = 1.75;
    g.stroke();
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    const fill = g.createLinearGradient(0, mid - amp, 0, h);
    fill.addColorStop(0, rgb(theme.glow, 0.22));
    fill.addColorStop(1, rgb(theme.bg, 0));
    g.fillStyle = fill;
    g.fill();
  }

  private bloom(w: number, h: number, theme: VizTheme, dt: number) {
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
        x: w * 0.5,
        y: h * 0.48,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        size: 1.2 + energy * 4,
        band: Math.random(),
      });
    }
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
    g.beginPath();
    g.arc(w * 0.5, h * 0.48, 10 + bass * 36, 0, Math.PI * 2);
    g.fillStyle = rgb(theme.glow, 0.18 + bass * 0.35);
    g.fill();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.55;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      g.beginPath();
      g.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      g.fillStyle = this.bandColor(p.band, theme, p.life * 0.7);
      g.fill();
    }
  }
}

function avg(arr: Float32Array, start: number, end: number) {
  let s = 0;
  const a = Math.max(0, start);
  const b = Math.min(arr.length, end);
  if (b <= a) return 0;
  for (let i = a; i < b; i++) s += arr[i]!;
  return s / (b - a);
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export function fillIdleSpectrum(freq: Uint8Array, time: Uint8Array, t: number) {
  for (let i = 0; i < freq.length; i++) {
    const n = i / freq.length;
    const envelope = Math.exp(-n * 2.2);
    const wave =
      0.55 +
      0.45 * Math.sin(t * 0.55 + n * 8.2) * Math.sin(t * 0.19 + n * 2.4);
    const shimmer = 0.35 + 0.65 * Math.sin(t * 1.05 + i * 0.035);
    freq[i] = Math.floor((22 + 110 * wave * shimmer) * envelope);
  }
  for (let i = 0; i < time.length; i++) {
    time[i] = 128 + Math.sin(t * 1.8 + i * 0.038) * 16 + Math.sin(t * 0.4 + i * 0.01) * 8;
  }
}
