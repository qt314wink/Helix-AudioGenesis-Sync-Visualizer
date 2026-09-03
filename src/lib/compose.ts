import { createServerFn } from "@tanstack/react-start";
import type { ComposeMode, ScoreRecipe, TrainingWeights } from "./audio/types";
import { DEMO_RECIPE, hashString, makeRng, recipeFromStems } from "./audio/stems";

export interface ComposeInput {
  mode: ComposeMode;
  prompt: string;
  blendWith?: string;
  blend?: number;
  stemIds?: string[];
  weights?: TrainingWeights;
}

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALES = ["minor", "major", "dorian", "mixolydian", "pentatonic", "harmonicMinor"] as const;
const DRUMS = ["fourOnFloor", "halfTime", "breakbeat", "boomBap", "sparse", "shaker"] as const;
const PROGS = [
  [0, 5, 2, 6],
  [0, 3, 4, 0],
  [0, 6, 5, 4],
  [0, 4, 5, 3],
  [5, 0, 2, 6],
  [0, 2, 4, 5],
];

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function titleCase(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalize(raw: Partial<ScoreRecipe>, input: ComposeInput): ScoreRecipe {
  const id = `gen-${hashString(`${input.mode}:${input.prompt}:${input.blendWith ?? ""}:${Date.now()}`).toString(16)}`;
  const scale = SCALES.includes(raw.scale as (typeof SCALES)[number])
    ? (raw.scale as ScoreRecipe["scale"])
    : "minor";
  const drumPattern = DRUMS.includes(raw.drumPattern as (typeof DRUMS)[number])
    ? (raw.drumPattern as ScoreRecipe["drumPattern"])
    : "halfTime";
  const key = KEYS.includes(String(raw.key)) ? String(raw.key) : "A";
  const progression = Array.isArray(raw.progression) && raw.progression.length
    ? raw.progression.map((n) => Number(n) || 0).slice(0, 8)
    : [0, 5, 2, 6];
  const styles = Array.isArray(raw.styles) ? raw.styles.map(String).slice(0, 4) : ["ambient"];
  const stemPatch = recipeFromStems(input.stemIds ?? [], String(raw.title ?? input.prompt));
  return {
    title: String(raw.title ?? input.prompt).slice(0, 64) || "Untitled climate",
    bpm: clamp(Number(raw.bpm) || 90, 60, 170),
    key,
    scale,
    mood: String(raw.mood ?? "unhurried").slice(0, 80),
    energy: clamp(Number(raw.energy) || 0.45, 0, 1),
    density: clamp(Number(raw.density) || 0.4, 0, 1),
    swing: clamp(Number(raw.swing) || 0.1, 0, 0.4),
    brightness: clamp(Number(raw.brightness) || 0.4, 0, 1),
    progression,
    drumPattern,
    bassStyle: raw.bassStyle === "reese" || raw.bassStyle === "off" ? raw.bassStyle : "sub",
    padStyle: raw.padStyle === "air" || raw.padStyle === "none" ? raw.padStyle : "warm",
    leadStyle: raw.leadStyle === "bell" || raw.leadStyle === "none" ? raw.leadStyle : "pluck",
    arp: Boolean(raw.arp),
    styles,
    rationale: String(raw.rationale ?? "").slice(0, 180),
    stemIds: input.stemIds,
    ...stemPatch,
    id,
  };
}

function localCompose(input: ComposeInput): ScoreRecipe {
  const seed = hashString(`${input.mode}:${input.prompt.toLowerCase()}:${input.blendWith ?? ""}`);
  const rng = makeRng(seed);
  const text = `${input.prompt} ${input.blendWith ?? ""}`.toLowerCase();
  const base: ScoreRecipe = {
    ...DEMO_RECIPE,
    key: KEYS[Math.floor(rng() * KEYS.length)]!,
    scale: SCALES[Math.floor(rng() * SCALES.length)]!,
    progression: PROGS[Math.floor(rng() * PROGS.length)]!.slice(),
    bpm: 72 + Math.floor(rng() * 56),
    energy: 0.28 + rng() * 0.5,
    density: 0.25 + rng() * 0.5,
    swing: rng() * 0.18,
    brightness: 0.25 + rng() * 0.5,
    stemIds: input.stemIds,
  };

  if (/radiohead|obel|slowdive|grouper|slow|night|rain|fog|harbor|nocturne|tide/.test(text)) {
    Object.assign(base, {
      bpm: 72 + Math.floor(rng() * 14),
      scale: "minor",
      drumPattern: "sparse",
      energy: 0.28,
      density: 0.32,
      padStyle: "warm",
      bassStyle: "sub",
      leadStyle: "pluck",
      styles: ["ambient", "trip-hop"],
    });
  } else if (/daft|house|disco|dance/.test(text)) {
    Object.assign(base, {
      bpm: 118 + Math.floor(rng() * 8),
      scale: "major",
      drumPattern: "fourOnFloor",
      energy: 0.74,
      density: 0.62,
      arp: true,
      bassStyle: "sub",
      leadStyle: "bell",
      styles: ["house", "disco"],
    });
  } else if (/hip.?hop|boom|nujabes|lo-?fi|dilla|attic/.test(text)) {
    Object.assign(base, {
      bpm: 86 + Math.floor(rng() * 12),
      drumPattern: "boomBap",
      swing: 0.18,
      bassStyle: "sub",
      padStyle: "warm",
      leadStyle: "pluck",
      styles: ["boom-bap", "lo-fi"],
    });
  } else if (/aphex|idm|glitch|break|autechre/.test(text)) {
    Object.assign(base, {
      bpm: 132 + Math.floor(rng() * 16),
      drumPattern: "breakbeat",
      density: 0.72,
      energy: 0.66,
      leadStyle: "bell",
      padStyle: "air",
      styles: ["idm", "breakbeat"],
    });
  } else if (/techno|warehouse|berghain|modular/.test(text)) {
    Object.assign(base, {
      bpm: 126 + Math.floor(rng() * 8),
      drumPattern: "fourOnFloor",
      bassStyle: "reese",
      padStyle: "none",
      leadStyle: "none",
      arp: rng() > 0.4,
      energy: 0.7,
      styles: ["techno", "minimal"],
    });
  } else if (/folk|acoustic|chamber|bon iver|sufjan/.test(text)) {
    Object.assign(base, {
      bpm: 78 + Math.floor(rng() * 16),
      leadStyle: "pluck",
      drumPattern: "sparse",
      padStyle: "air",
      scale: "dorian",
      styles: ["chamber", "folk-electronic"],
    });
  } else if (/synthwave|neon|night drive|outrun/.test(text)) {
    Object.assign(base, {
      bpm: 100 + Math.floor(rng() * 16),
      drumPattern: "fourOnFloor",
      arp: true,
      padStyle: "air",
      leadStyle: "bell",
      scale: "minor",
      styles: ["synthwave"],
    });
  } else if (/dub|reggae|echo/.test(text)) {
    Object.assign(base, {
      bpm: 76 + Math.floor(rng() * 10),
      drumPattern: "halfTime",
      bassStyle: "sub",
      swing: 0.08,
      styles: ["dub", "ambient"],
    });
  } else if (/jazz|modal|coltrane|kamasi/.test(text)) {
    Object.assign(base, {
      bpm: 92 + Math.floor(rng() * 20),
      scale: "dorian",
      drumPattern: "boomBap",
      swing: 0.16,
      leadStyle: "bell",
      styles: ["modal", "jazz"],
    });
  }

  if (input.weights) {
    base.energy = clamp((base.energy + input.weights.energy) / 2, 0, 1);
    base.density = clamp((base.density + input.weights.density) / 2, 0, 1);
    base.brightness = clamp((base.brightness + input.weights.brightness) / 2, 0, 1);
    base.swing = clamp((base.swing + input.weights.swing) / 2, 0, 0.4);
  }

  if (input.mode === "blend" && input.blendWith) {
    const mix = input.blend ?? 0.5;
    base.styles = [input.prompt, input.blendWith]
      .map((s) => s.split(/[,/]/)[0]!.trim())
      .filter(Boolean)
      .slice(0, 3);
    base.bpm = Math.round(base.bpm * (1 - mix) + (90 + mix * 50) * mix);
    base.energy = clamp(base.energy * (1 - mix * 0.3) + mix * 0.65, 0, 1);
    base.title = `${titleCase(input.prompt)} × ${titleCase(input.blendWith)}`;
  } else if (input.mode === "semantic") {
    base.title = titleCase(input.prompt) || "Untitled climate";
  } else {
    base.title = `After ${titleCase(input.prompt)}`;
  }

  base.mood = input.prompt.slice(0, 80);
  base.rationale = "Composed from the community stem map and on-device trainer weights. Original climate — not a cover.";
  return normalize(base, input);
}

export const composeScore = createServerFn({ method: "POST" })
  .validator((data: ComposeInput) => {
    if (!data || typeof data.prompt !== "string" || data.prompt.trim().length < 1) {
      throw new Error("Describe an artist, song, or climate.");
    }
    return {
      ...data,
      prompt: data.prompt.trim().slice(0, 400),
      blendWith: data.blendWith?.trim().slice(0, 400),
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: true as const, recipe: localCompose(data), source: "stems" as const };
    }

    const weights = data.weights;
    const system = `You write ORIGINAL instrumental scores as JSON for Helix, a visualizer/studio.
Never copy melodies, lyrics, or titles of existing songs. Capture climate, palette, and rhythm only.
Return ONLY JSON with keys:
title, bpm (60-170), key (C,C#,D,Eb,E,F,F#,G,Ab,A,Bb,B),
scale (minor|major|dorian|mixolydian|pentatonic|harmonicMinor),
mood (short), energy, density, swing (0-0.4), brightness (0-1),
progression (array of 4 scale-degree integers 0-6),
drumPattern (fourOnFloor|halfTime|breakbeat|boomBap|sparse|shaker),
bassStyle (sub|reese|off), padStyle (warm|air|none), leadStyle (pluck|bell|none),
arp (boolean), styles (1-3 short tags), rationale (one sentence).`;

    const user = [
      `Mode: ${data.mode}`,
      data.mode === "artist" ? `Artist climate to echo (do not imitate a recording): ${data.prompt}` : null,
      data.mode === "song" ? `Song climate to echo (original score, not a cover): ${data.prompt}` : null,
      data.mode === "semantic" ? `Scene / semantic: ${data.prompt}` : null,
      data.mode === "blend"
        ? `Blend styles: "${data.prompt}" with "${data.blendWith ?? ""}" at mix ${data.blend ?? 0.5}`
        : null,
      weights
        ? `Trainer weights (on-device recursive model): energy ${weights.energy.toFixed(2)}, density ${weights.density.toFixed(2)}, brightness ${weights.brightness.toFixed(2)}, swing ${weights.swing.toFixed(2)}, genreBias ${JSON.stringify(weights.genreBias)}`
        : null,
      data.stemIds?.length ? `Prefer community stems: ${data.stemIds.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.85,
          max_tokens: 700,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        return { ok: true as const, recipe: localCompose(data), source: "stems" as const };
      }
      const body = (await res.json()) as { choices: { message: { content: string } }[] };
      const text = body.choices[0]?.message.content ?? "";
      const parsed = extractJson(text) as Partial<ScoreRecipe>;
      return { ok: true as const, recipe: normalize(parsed, data), source: "helix-r" as const };
    } catch {
      return { ok: true as const, recipe: localCompose(data), source: "stems" as const };
    }
  });
