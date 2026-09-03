export type ComposeMode = "artist" | "song" | "semantic" | "blend";

export type ScaleName = "minor" | "major" | "dorian" | "mixolydian" | "pentatonic" | "harmonicMinor";

export type DrumPattern = "fourOnFloor" | "halfTime" | "breakbeat" | "boomBap" | "sparse" | "shaker";

export type BassStyle = "sub" | "reese" | "off";
export type PadStyle = "warm" | "air" | "none";
export type LeadStyle = "pluck" | "bell" | "none";

export interface ScoreRecipe {
  id: string;
  title: string;
  bpm: number;
  key: string;
  scale: ScaleName;
  mood: string;
  energy: number;
  density: number;
  swing: number;
  brightness: number;
  progression: number[];
  drumPattern: DrumPattern;
  bassStyle: BassStyle;
  padStyle: PadStyle;
  leadStyle: LeadStyle;
  arp: boolean;
  styles: string[];
  rationale: string;
  stemIds?: string[];
}

export type StemKind = "kick" | "snare" | "hats" | "bass" | "pad" | "arp" | "lead";

export interface Stem {
  id: string;
  name: string;
  kind: StemKind;
  contributor: string;
  added: string;
  styles: string[];
  bpmHint: [number, number];
  steps?: number[];
  motif?: number[];
  voicing?: BassStyle | PadStyle | LeadStyle | "open" | "closed";
}

export interface TrainingWeights {
  energy: number;
  density: number;
  brightness: number;
  swing: number;
  genreBias: Record<string, number>;
}
