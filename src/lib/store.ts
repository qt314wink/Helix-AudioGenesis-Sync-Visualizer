import { create } from "zustand";
import type { ComposeMode, ScoreRecipe } from "./audio/types";
import type { VizMode } from "./visualizer/renderer";

export type SourceMode = "mic" | "file" | "generate" | "sync";
export type PanelId = null | "source" | "generate" | "sync" | "forge" | "look";

interface HelixStore {
  entered: boolean;
  hudVisible: boolean;
  isPlaying: boolean;
  source: SourceMode;
  vizMode: VizMode;
  themeId: string;
  sensitivity: number;
  smoothness: number;
  volume: number;
  panel: PanelId;
  fullscreen: boolean;
  composeMode: ComposeMode;
  nowPlaying: { title: string; meta: string } | null;
  recipe: ScoreRecipe | null;
  fileName: string | null;
  videoName: string | null;
  syncOffset: number;
  generating: boolean;
  generateError: string | null;
  selectedStems: string[];
  set: (partial: Partial<HelixStore>) => void;
}

export const useHelix = create<HelixStore>((set) => ({
  entered: false,
  hudVisible: true,
  isPlaying: false,
  source: "generate",
  vizMode: "circular",
  themeId: "porcelain",
  sensitivity: 1.05,
  smoothness: 0.22,
  volume: 0.85,
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
  selectedStems: ["harbor-kick", "low-tide-sub", "night-market-pad"],
  set: (partial) => set(partial),
}));
