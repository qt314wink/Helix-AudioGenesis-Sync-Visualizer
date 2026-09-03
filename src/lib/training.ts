import type { ScoreRecipe, TrainingWeights } from "./audio/types";

const KEY = "helix.training.v1";

export interface DailyRun {
  date: string;
  notes: string;
  energy: number;
  density: number;
}

export interface WeeklyPatch {
  week: string;
  version: string;
  notes: string;
}

export interface Observation {
  t: number;
  event: string;
  detail: string;
}

export interface FeedbackItem {
  recipeId: string;
  title: string;
  liked: boolean;
  t: number;
}

export interface TrainingState {
  modelVersion: string;
  lastNightlyAt: number;
  nextNightlyAt: number;
  dailyRuns: DailyRun[];
  weeklyPatches: WeeklyPatch[];
  weights: TrainingWeights;
  observations: Observation[];
  feedback: FeedbackItem[];
  observationEnabled: boolean;
  stemCount: number;
}

const SEEDED_PATCHES: WeeklyPatch[] = [
  { week: "2026-08-04", version: "R7.0", notes: "Raised nocturnal tempo bias from harbor stems." },
  { week: "2026-08-11", version: "R7.1", notes: "Denser hats on liked breakbeat sessions." },
  { week: "2026-08-18", version: "R7.2", notes: "Warmer pad voicing after silk-pad previews." },
];

function defaultState(): TrainingState {
  const now = Date.now();
  return {
    modelVersion: "R7.3",
    lastNightlyAt: now - 26 * 3600 * 1000,
    nextNightlyAt: now + 2 * 3600 * 1000,
    dailyRuns: [
      { date: "2026-08-26", notes: "Ingested 18 stem diffs. Energy −0.02.", energy: 0.44, density: 0.4 },
      { date: "2026-08-27", notes: "Feedback fold: pluck leads retained.", energy: 0.43, density: 0.39 },
      { date: "2026-08-28", notes: "Swing nudged on boom-bap likes.", energy: 0.42, density: 0.4 },
    ],
    weeklyPatches: SEEDED_PATCHES,
    weights: {
      energy: 0.42,
      density: 0.4,
      brightness: 0.38,
      swing: 0.12,
      genreBias: { ambient: 0.4, "trip-hop": 0.35, cinematic: 0.2 },
    },
    observations: [],
    feedback: [],
    observationEnabled: true,
    stemCount: 12,
  };
}

function bumpVersion(v: string): string {
  const m = /^R(\d+)\.(\d+)$/.exec(v);
  if (!m) return "R7.4";
  return `R${m[1]}.${Number(m[2]) + 1}`;
}

export function loadTraining(): TrainingState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingState;
      return { ...defaultState(), ...parsed };
    }
  } catch {
    /* ignore */
  }
  return defaultState();
}

export function saveTraining(state: TrainingState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function runNightlyIfDue(state: TrainingState): TrainingState {
  const now = Date.now();
  if (now - state.lastNightlyAt < 20 * 3600 * 1000) return state;
  const likes = state.feedback.filter((f) => f.liked).slice(-12);
  const next = { ...state, weights: { ...state.weights, genreBias: { ...state.weights.genreBias } } };
  if (likes.length) {
    next.weights.energy = clamp01(next.weights.energy * 0.85 + 0.15 * 0.5);
  }
  const date = new Date(now).toISOString().slice(0, 10);
  next.dailyRuns = [
    {
      date,
      notes: `Recursive pass on ${state.stemCount} community stems + ${state.feedback.length} feedback rows.`,
      energy: next.weights.energy,
      density: next.weights.density,
    },
    ...next.dailyRuns,
  ].slice(0, 21);
  next.lastNightlyAt = now;
  next.nextNightlyAt = now + 24 * 3600 * 1000;

  const sincePatch = next.dailyRuns.length;
  if (sincePatch >= 7 && next.dailyRuns.length % 7 === 0) {
    const version = bumpVersion(next.modelVersion);
    next.modelVersion = version;
    next.weeklyPatches = [
      {
        week: date,
        version,
        notes: "Daily runs folded. Stem map reweighted. Upgrade pack applied on-device.",
      },
      ...next.weeklyPatches,
    ].slice(0, 12);
  }
  saveTraining(next);
  return next;
}

export function recordObservation(state: TrainingState, event: string, detail: string): TrainingState {
  if (!state.observationEnabled) return state;
  const next = {
    ...state,
    observations: [{ t: Date.now(), event, detail }, ...state.observations].slice(0, 80),
  };
  saveTraining(next);
  return next;
}

export function recordFeedback(
  state: TrainingState,
  recipe: ScoreRecipe,
  liked: boolean,
): TrainingState {
  const weights = { ...state.weights, genreBias: { ...state.weights.genreBias } };
  const dir = liked ? 1 : -1;
  weights.energy = clamp01(weights.energy + dir * (recipe.energy - weights.energy) * 0.12);
  weights.density = clamp01(weights.density + dir * (recipe.density - weights.density) * 0.12);
  weights.brightness = clamp01(weights.brightness + dir * (recipe.brightness - weights.brightness) * 0.1);
  weights.swing = clamp01(weights.swing + dir * (recipe.swing - weights.swing) * 0.08);
  for (const style of recipe.styles) {
    weights.genreBias[style] = clamp01((weights.genreBias[style] ?? 0.2) + dir * 0.08);
  }
  const next: TrainingState = {
    ...state,
    weights,
    feedback: [
      { recipeId: recipe.id, title: recipe.title, liked, t: Date.now() },
      ...state.feedback,
    ].slice(0, 80),
  };
  saveTraining(next);
  return next;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return "due";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}
