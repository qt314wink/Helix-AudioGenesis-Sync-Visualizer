export interface VizTheme {
  id: string;
  name: string;
  low: [number, number, number];
  mid: [number, number, number];
  high: [number, number, number];
  glow: [number, number, number];
  bg: [number, number, number];
}

export const VIZ_THEMES: VizTheme[] = [
  {
    id: "porcelain",
    name: "Porcelain",
    low: [200, 204, 212],
    mid: [232, 232, 236],
    high: [250, 250, 252],
    glow: [180, 186, 196],
    bg: [7, 7, 8],
  },
  {
    id: "ember",
    name: "Ember",
    low: [168, 82, 58],
    mid: [214, 140, 96],
    high: [240, 210, 186],
    glow: [196, 92, 62],
    bg: [10, 7, 6],
  },
  {
    id: "ice",
    name: "Ice",
    low: [86, 130, 150],
    mid: [150, 186, 202],
    high: [226, 238, 242],
    glow: [110, 164, 186],
    bg: [6, 8, 10],
  },
  {
    id: "moss",
    name: "Moss",
    low: [74, 110, 88],
    mid: [140, 168, 142],
    high: [214, 226, 210],
    glow: [92, 138, 108],
    bg: [6, 8, 7],
  },
  {
    id: "nocturne",
    name: "Nocturne",
    low: [72, 84, 108],
    mid: [148, 156, 178],
    high: [226, 228, 236],
    glow: [96, 112, 150],
    bg: [6, 6, 10],
  },
];

export function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function rgb(c: [number, number, number], a = 1): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
