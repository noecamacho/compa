// Pixel-art monito, 16×20 cells, ported 1:1 from design/compa-v2/componentes/Monito.dc.html.
// Pure functions: the component only turns the result into <path> elements.
import type { MonitoLook } from "./look";

export const GRID_WIDTH = 16;
export const GRID_HEIGHT = 20;

// One character per layer; the draw order below is the paint order of the original SVG.
export const LAYER_ORDER = "shHtTpbaAlCnkmgGWRLeo".split("") as Layer[];
export type Layer = "s" | "h" | "H" | "t" | "T" | "p" | "b" | "a" | "A" | "l" | "C" | "n" | "k" | "m" | "g" | "G" | "W" | "R" | "L" | "e" | "o";

type Cell = Layer | ".";
type Grid = Cell[][];

const FIXED_FILLS: Partial<Record<Layer, string>> = {
  k: "#FF9DB4",
  m: "#8A2E45",
  g: "#FFD93D",
  G: "#FF6B4A",
  W: "#FFFFFF",
  R: "#FF6B4A",
  L: "#FFFFFF",
  e: "#1E1B2E",
  o: "#1E1B2E",
};

export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  const r = clamp((n >> 16) & 255);
  const g = clamp((n >> 8) & 255);
  const b = clamp(n & 255);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

type Painter = {
  set: (r: number, c: number, ch: Cell) => void;
  row: (r: number, c1: number, c2: number, ch: Cell) => void;
  back: (r: number, c: number, ch: Cell) => void;
  clear: (r1: number, r2: number) => void;
  recolor: (r: number, ch: Cell) => void;
  at: (r: number, c: number) => Cell;
};

function painter(g: Grid): Painter {
  const inside = (r: number, c: number) => r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH;
  const set: Painter["set"] = (r, c, ch) => {
    if (inside(r, c)) (g[r] as Cell[])[c] = ch;
  };
  const row: Painter["row"] = (r, c1, c2, ch) => {
    for (let c = c1; c <= c2; c++) set(r, c, ch);
  };
  const at: Painter["at"] = (r, c) => (g[r] as Cell[])[c] as Cell;
  const back: Painter["back"] = (r, c, ch) => {
    if (inside(r, c) && at(r, c) === ".") set(r, c, ch);
  };
  const clear: Painter["clear"] = (r1, r2) => {
    for (let r = r1; r <= r2; r++) row(r, 0, 15, ".");
  };
  const recolor: Painter["recolor"] = (r, ch) => {
    for (let c = 0; c < GRID_WIDTH; c++) if (at(r, c) === "t") set(r, c, ch);
  };
  return { set, row, back, clear, recolor, at };
}

function paintBody({ set, row }: Painter): void {
  // Head and face
  row(2, 4, 11, "o");
  set(3, 3, "o"); row(3, 4, 11, "s"); set(3, 12, "o");
  for (let r = 4; r <= 8; r++) { set(r, 2, "o"); row(r, 3, 12, "s"); set(r, 13, "o"); }
  set(9, 3, "o"); row(9, 4, 11, "s"); set(9, 12, "o");
  row(10, 4, 11, "o");
  set(6, 5, "e"); set(7, 5, "e"); set(6, 10, "e"); set(7, 10, "e");
  set(8, 4, "k"); set(8, 11, "k"); set(8, 7, "m"); set(8, 8, "m");
  // Body
  set(11, 3, "o"); row(11, 4, 11, "t"); set(11, 12, "o");
  set(12, 2, "o"); row(12, 3, 12, "t"); set(12, 13, "o");
  set(13, 2, "o"); set(13, 3, "t"); set(13, 4, "o"); row(13, 5, 10, "t"); set(13, 11, "o"); set(13, 12, "t"); set(13, 13, "o");
  set(14, 2, "o"); set(14, 3, "s"); set(14, 4, "o"); row(14, 5, 10, "t"); set(14, 11, "o"); set(14, 12, "s"); set(14, 13, "o");
  set(15, 3, "o"); set(15, 4, "o"); row(15, 5, 10, "p"); set(15, 11, "o"); set(15, 12, "o");
  set(16, 4, "o"); row(16, 5, 10, "p"); set(16, 11, "o");
  set(17, 4, "o"); row(17, 5, 6, "p"); row(17, 7, 8, "o"); row(17, 9, 10, "p"); set(17, 11, "o");
  set(18, 3, "o"); row(18, 4, 6, "b"); row(18, 7, 8, "o"); row(18, 9, 11, "b"); set(18, 12, "o");
  row(19, 3, 12, "o");
}

// "woman" flares the pants into a skirt (in the pants color) with bare legs below.
function paintSkirt({ set, row }: Painter, body: MonitoLook["body"]): void {
  if (body !== "woman") return;
  set(16, 3, "o"); row(16, 4, 11, "p"); set(16, 12, "o");
  row(17, 5, 6, "s"); row(17, 9, 10, "s");
}

function paintOutfit({ set, row, recolor }: Painter, outfit: MonitoLook["outfit"]): void {
  if (outfit === "stripes") { recolor(12, "T"); recolor(14, "T"); }
  if (outfit === "compa") { set(12, 7, "T"); set(12, 8, "T"); set(13, 7, "T"); set(13, 8, "T"); }
  if (outfit === "hoodie") { set(12, 6, "W"); set(13, 6, "W"); set(12, 9, "W"); set(13, 9, "W"); row(14, 6, 9, "T"); }
  if (outfit === "event") { recolor(12, "T"); set(13, 7, "W"); set(13, 8, "W"); }
  if (outfit !== "suit") return;
  for (let r = 11; r <= 13; r++) { set(r, 6, "W"); set(r, 7, "R"); set(r, 8, "R"); set(r, 9, "W"); }
  set(14, 7, "R"); set(14, 8, "R");
}

function paintHair(p: Painter, hair: MonitoLook["hair"]): void {
  const { set, row } = p;
  const cap = () => {
    row(1, 4, 11, "o");
    set(2, 3, "o"); row(2, 4, 11, "h"); set(2, 12, "o");
    set(3, 2, "o"); row(3, 3, 12, "h"); set(3, 13, "o");
    row(4, 3, 12, "h");
    set(5, 3, "h"); set(5, 12, "h");
  };
  if (hair === "short") cap();
  if (hair === "bangs") { cap(); set(5, 4, "h"); set(5, 6, "h"); set(5, 7, "h"); set(5, 9, "h"); set(5, 10, "h"); set(5, 11, "h"); }
  if (hair === "spiky") paintSpiky(p);
  if (hair === "long") { cap(); paintLong(p); }
  if (hair === "bun") { cap(); row(0, 6, 9, "o"); set(1, 5, "o"); row(1, 6, 9, "h"); set(1, 10, "o"); set(1, 7, "H"); }
  if (hair === "curly") paintCurly(p);
  if (hair === "shaved") { row(3, 4, 11, "h"); set(4, 3, "h"); set(4, 12, "h"); }
}

function paintSpiky({ set, row }: Painter): void {
  set(0, 5, "o"); set(0, 8, "o"); set(0, 11, "o");
  set(1, 4, "o"); set(1, 5, "h"); set(1, 6, "o"); set(1, 7, "o"); set(1, 8, "h"); set(1, 9, "o"); set(1, 10, "o"); set(1, 11, "h"); set(1, 12, "o");
  set(2, 3, "o"); row(2, 4, 12, "h"); set(2, 13, "o");
  set(3, 2, "o"); row(3, 3, 12, "h"); set(3, 13, "o");
  row(4, 3, 12, "h");
  set(5, 3, "h"); set(5, 12, "h");
  set(2, 6, "H"); set(3, 9, "H");
}

function paintLong({ set, row }: Painter): void {
  set(4, 1, "o"); row(4, 2, 13, "h"); set(4, 14, "o");
  set(5, 1, "o"); row(5, 2, 3, "h"); row(5, 12, 13, "h"); set(5, 14, "o");
  for (let r = 6; r <= 8; r++) { set(r, 1, "o"); set(r, 2, "h"); set(r, 13, "h"); set(r, 14, "o"); }
  for (let r = 9; r <= 10; r++) { set(r, 1, "o"); row(r, 2, 3, "h"); row(r, 12, 13, "h"); set(r, 14, "o"); }
  row(11, 1, 3, "o"); row(11, 12, 14, "o");
  set(3, 7, "H"); set(3, 8, "H");
}

function paintCurly({ set, row }: Painter): void {
  row(0, 4, 11, "o");
  row(1, 2, 3, "o"); row(1, 4, 11, "h"); row(1, 12, 13, "o");
  for (let r = 2; r <= 4; r++) { set(r, 1, "o"); row(r, 2, 13, "h"); set(r, 14, "o"); }
  set(5, 1, "o"); row(5, 2, 4, "h"); row(5, 11, 13, "h"); set(5, 14, "o");
  set(6, 1, "o"); row(6, 2, 3, "h"); row(6, 12, 13, "h"); set(6, 14, "o");
  row(7, 1, 2, "o"); row(7, 13, 14, "o");
  const highlights: [number, number][] = [[1, 6], [1, 10], [2, 3], [2, 8], [2, 12], [3, 5], [3, 10], [4, 2], [4, 7], [4, 13]];
  highlights.forEach(([r, c]) => set(r, c, "H"));
}

function paintHat({ set, row, clear, at }: Painter, hat: MonitoLook["hat"]): void {
  if (hat === "none") return;
  clear(0, 1);
  if (hat === "cap") {
    row(1, 4, 11, "o");
    set(2, 3, "o"); row(2, 4, 11, "a"); set(2, 12, "o");
    set(3, 2, "o"); row(3, 3, 12, "a"); set(3, 13, "o"); set(3, 6, "A"); set(3, 7, "A");
    set(4, 2, "o"); row(4, 3, 14, "a"); set(4, 15, "o");
    row(5, 14, 15, "o");
    if (at(4, 1) === "h") set(4, 1, "o");
  }
  if (hat === "beanie") {
    row(0, 7, 8, "o");
    row(1, 4, 6, "o"); row(1, 7, 8, "A"); row(1, 9, 11, "o");
    set(2, 3, "o"); row(2, 4, 11, "a"); set(2, 12, "o");
    set(3, 2, "o"); row(3, 3, 12, "a"); set(3, 13, "o");
    set(4, 2, "o"); row(4, 3, 12, "A"); set(4, 13, "o");
  }
  if (hat === "crown") {
    set(0, 3, "o"); row(0, 7, 8, "o"); set(0, 12, "o");
    set(1, 2, "o"); set(1, 3, "g"); set(1, 4, "o"); set(1, 6, "o"); row(1, 7, 8, "g"); set(1, 9, "o"); set(1, 11, "o"); set(1, 12, "g"); set(1, 13, "o");
    set(2, 2, "o"); row(2, 3, 12, "g"); set(2, 13, "o"); set(2, 7, "G"); set(2, 8, "G");
    row(3, 2, 13, "o");
  }
}

function paintFace({ set, row }: Painter, face: MonitoLook["face"], beard: boolean): void {
  if (face === "glasses" || face === "sunglasses") {
    set(6, 3, "o"); row(6, 4, 6, "l"); row(6, 7, 8, "o"); row(6, 9, 11, "l"); set(6, 12, "o");
    row(7, 4, 6, "l"); row(7, 9, 11, "l");
    if (face === "glasses") { set(6, 5, "e"); set(7, 5, "e"); set(6, 10, "e"); set(7, 10, "e"); }
    else { set(6, 4, "L"); set(6, 9, "L"); }
  }
  if (face === "mustache") { row(8, 6, 9, "h"); set(9, 6, "h"); set(9, 9, "h"); }
  // The beard combines with glasses.
  if (beard) { row(8, 5, 6, "h"); row(8, 9, 10, "h"); row(9, 4, 11, "h"); set(9, 7, "s"); set(9, 8, "s"); }
}

function paintExtra({ set, row, back }: Painter, extra: MonitoLook["extra"]): void {
  if (extra === "badge") { set(11, 5, "n"); set(11, 10, "n"); set(12, 6, "n"); set(12, 9, "n"); row(13, 6, 9, "W"); row(14, 6, 9, "W"); row(14, 7, 8, "e"); }
  if (extra === "medal") { set(11, 9, "R"); set(12, 9, "g"); set(12, 10, "g"); set(13, 9, "g"); set(13, 10, "g"); }
  if (extra !== "cape") return;
  back(11, 1, "o"); back(11, 2, "C"); back(11, 13, "C"); back(11, 14, "o");
  for (let r = 12; r <= 17; r++) { back(r, 0, "o"); back(r, 1, "C"); back(r, 14, "C"); back(r, 15, "o"); }
  for (let r = 13; r <= 17; r++) { back(r, 2, "C"); back(r, 13, "C"); }
  back(18, 0, "o"); back(18, 1, "o"); back(18, 2, "o"); back(18, 13, "o"); back(18, 14, "o"); back(18, 15, "o");
}

export function grid(look: MonitoLook): Grid {
  const g: Grid = Array.from({ length: GRID_HEIGHT }, () => new Array<Cell>(GRID_WIDTH).fill("."));
  const p = painter(g);
  paintBody(p);
  paintSkirt(p, look.body);
  paintOutfit(p, look.outfit);
  paintHair(p, look.hair);
  paintHat(p, look.hat);
  paintFace(p, look.face, look.beard);
  paintExtra(p, look.extra);
  return g;
}

// One path per layer: horizontal runs of the same cell become 1-unit-tall rectangles.
export function paths(g: Grid): Record<Layer, string> {
  const d = Object.fromEntries(LAYER_ORDER.map((layer) => [layer, ""])) as Record<Layer, string>;
  g.forEach((cells, r) => {
    let c = 0;
    while (c < GRID_WIDTH) {
      const ch = cells[c] as Cell;
      if (ch === ".") { c++; continue; }
      let end = c;
      while (end + 1 < GRID_WIDTH && cells[end + 1] === ch) end++;
      const w = end - c + 1;
      d[ch] += `M${c} ${r}h${w}v1h-${w}z`;
      c = end + 1;
    }
  });
  return d;
}

function outfitAccent(look: MonitoLook): string {
  const accents: Record<MonitoLook["outfit"], string> = {
    stripes: look.shirt === "#FFFFFF" ? "#1E1B2E" : "#FFFFFF",
    compa: look.shirt === "#FFD93D" ? "#FF6B4A" : "#FFD93D",
    hoodie: shade(look.shirt, 0.82),
    event: look.accent ?? "#FFD93D",
    plain: "#FFFFFF",
    suit: "#FFFFFF",
  };
  return accents[look.outfit];
}

export function fills(look: MonitoLook): Record<Layer, string> {
  const dynamic: Partial<Record<Layer, string>> = {
    s: look.skin,
    h: look.hairColor,
    H: look.hairColor === "#2A2438" ? "#4A4360" : shade(look.hairColor, 0.78),
    t: look.shirt,
    T: outfitAccent(look),
    p: look.pants,
    b: look.shoes,
    a: look.hatColor,
    A: look.hatAccent,
    l: look.face === "sunglasses" ? "#2E2B40" : "#DDF1FF",
    C: look.capeColor ?? "#FF6B4A",
    n: look.lanyardColor ?? "#6CC4FF",
  };
  return { ...dynamic, ...FIXED_FILLS } as Record<Layer, string>;
}

export type MonitoLayer = { layer: Layer; d: string; fill: string };

// Only the hat, on an empty grid: the same pixels the monito wears, to draw over a photo (lib/monito/accessories.ts).
function hatGrid(look: MonitoLook): Grid {
  const g: Grid = Array.from({ length: GRID_HEIGHT }, () => new Array<Cell>(GRID_WIDTH).fill("."));
  paintHat(painter(g), look.hat);
  return g;
}

// Layers in paint order, ready for <path d fill />; empty layers are skipped.
export function monitoLayers(look: MonitoLook, only: "all" | "hat" = "all"): MonitoLayer[] {
  const d = paths(only === "hat" ? hatGrid(look) : grid(look));
  const f = fills(look);
  return LAYER_ORDER.filter((layer) => d[layer]).map((layer) => ({ layer, d: d[layer], fill: f[layer] }));
}
