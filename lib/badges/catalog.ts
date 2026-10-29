// The 20 badges of design/compa-v2/componentes/Insignia.dc.html (shapes, colors and icons copied as is).
// Badge ids are the design contract (README "Insignias") and are stored in `user_badges.badge_id`.

export const BADGE_IDS = [
  "apreton",
  "madrugador",
  "cierre",
  "iman",
  "maraton",
  "tresdetres",
  "puente",
  "duo",
  "ff2026",
  "og",
  "rey",
  "speaker",
  "noctambulo",
  "cazatalentos",
  "conector100",
  "trotamundos",
  "curioso",
  "memoria",
  "quinientos",
  "cuatro",
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export const BADGE_CATEGORIES = ["person", "pair", "event", "secret", "progress", "community", "streak"] as const;
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];

type Shape = "shield" | "rings" | "ticket" | "star" | "hexagon" | "circle";

export const SHAPES: Record<Shape, string> = {
  shield: "M60 8 L104 24 V66 C104 96 84 116 60 124 C36 116 16 96 16 66 V24 Z",
  rings: "M44 22 A40 40 0 1 0 44 102 A40 40 0 1 0 44 22 Z M76 22 A40 40 0 1 0 76 102 A40 40 0 1 0 76 22 Z",
  ticket:
    "M22 18 H98 A10 10 0 0 1 108 28 V52 A10 10 0 0 0 108 72 V96 A10 10 0 0 1 98 106 H22 A10 10 0 0 1 12 96 V72 A10 10 0 0 0 12 52 V28 A10 10 0 0 1 22 18 Z",
  star: "M60 6 L71 36 L100 24 L86 50 L114 62 L86 74 L100 100 L71 88 L60 118 L49 88 L20 100 L34 74 L6 62 L34 50 L20 24 L49 36 Z",
  hexagon: "M60 8 L106 34 V90 L60 116 L14 90 V34 Z",
  circle: "M60 8 A54 54 0 1 1 59.9 8 Z",
};

export type CategoryStyle = { shape: Shape; fill: string; ribbon: string };

export const CATEGORY_STYLE: Record<BadgeCategory, CategoryStyle> = {
  person: { shape: "shield", fill: "#6BE4A3", ribbon: "#FFD93D" },
  pair: { shape: "rings", fill: "#FF8FAB", ribbon: "#6CC4FF" },
  event: { shape: "ticket", fill: "#6CC4FF", ribbon: "#FFD93D" },
  secret: { shape: "star", fill: "#FFD93D", ribbon: "#FF6B4A" },
  progress: { shape: "hexagon", fill: "#D5DCE6", ribbon: "#FFD93D" },
  community: { shape: "circle", fill: "#FF6B4A", ribbon: "#FFD93D" },
  streak: { shape: "circle", fill: "#FF6B4A", ribbon: "#FFD93D" },
};

const SKIN = "#F5C9A3";
const WHITE = "#FFFFFF";
const SUN = "#FFD93D";
const CORAL = "#FF6B4A";
const SKY = "#6CC4FF";
const INK = "#1E1B2E";

// Icon strokes a, b, c (with optional fills) and a stroke-less filled shape d; `text` is drawn on top.
export type BadgeIcon = {
  a?: string;
  fa?: string;
  b?: string;
  fb?: string;
  c?: string;
  fc?: string;
  d?: string;
  fd?: string;
  text?: { value: string; x: number; y: number; size: number };
};

export type Badge = {
  id: BadgeId;
  name: string;
  shortName: string;
  category: BadgeCategory;
  icon: BadgeIcon;
};

const badge = (id: BadgeId, name: string, shortName: string, category: BadgeCategory, icon: BadgeIcon): Badge => ({
  id,
  name,
  shortName,
  category,
  icon,
});

export const BADGES: Record<BadgeId, Badge> = {
  apreton: badge("apreton", "Primer apretón", "PRIMER APRETÓN", "person", {
    a: "M6 30 L17 19 L29 23 L39 17 L50 30",
    fa: SKIN,
    b: "M6 30 L17 41 L27 47 L37 45 L50 30",
    fb: SKIN,
    c: "M29 23 L22 32 L28 37 L35 31",
  }),
  madrugador: badge("madrugador", "Madrugador", "MADRUGADOR", "person", {
    a: "M4 42 H52",
    b: "M14 42 A14 14 0 0 1 42 42 Z",
    fb: SUN,
    c: "M28 14 V6 M12 22 L6 16 M44 22 L50 16",
  }),
  cierre: badge("cierre", "Cierre", "CIERRE", "person", {
    a: "M30 6 A20 20 0 1 0 50 36 A16 16 0 0 1 30 6 Z",
    fa: SUN,
    d: "M43 8 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z",
    fd: WHITE,
  }),
  iman: badge("iman", "Imán", "IMÁN", "person", {
    a: "M14 10 V30 A14 14 0 0 0 42 30 V10",
    b: "M9 6 H19 V18 H9 Z M37 6 H47 V18 H37 Z",
    fb: WHITE,
    c: "M22 46 V52 M34 46 V52 M28 48 V54",
  }),
  maraton: badge("maraton", "Maratón", "MARATÓN", "person", { a: "M32 4 L12 32 H28 L24 52 L44 22 H30 Z", fa: SUN }),
  tresdetres: badge("tresdetres", "Tres de tres", "TRES DE TRES", "pair", {
    a: "M20 24 A12 12 0 1 0 20.1 24 Z",
    b: "M36 24 A12 12 0 1 0 36.1 24 Z",
    d: "M16 44 h6 v6 h-6z M25 44 h6 v6 h-6z M34 44 h6 v6 h-6z",
    fd: INK,
  }),
  puente: badge("puente", "Puente", "PUENTE", "pair", {
    a: "M6 42 A22 22 0 0 1 50 42",
    b: "M2 42 H54 M8 42 V52 M48 42 V52 M28 42 V52",
    d: "M10 36 a5 5 0 1 0 0.1 0z M46 36 a5 5 0 1 0 0.1 0z",
    fd: SKIN,
  }),
  duo: badge("duo", "Dúo dinámico", "DÚO DINÁMICO", "pair", {
    a: "M10 8 L18 46 L4 46 Z",
    fa: CORAL,
    b: "M46 8 L52 46 L38 46 Z",
    fb: SKY,
    c: "M18 14 H38",
  }),
  ff2026: badge("ff2026", "Founders Fest 2026", "FOUNDERS FEST", "event", {
    a: "M8 14 H48 V46 H8 Z",
    fa: WHITE,
    b: "M8 24 H48 M18 10 V18 M38 10 V18",
    text: { value: "2026", x: 28, y: 41, size: 15 },
  }),
  og: badge("og", "OG", "OG · EL PRIMERO", "event", {
    a: "M14 10 C4 22 6 40 18 50",
    b: "M42 10 C52 22 50 40 38 50",
    c: "M10 22 l6 -2 M8 32 l6 0 M12 42 l6 2 M46 22 l-6 -2 M48 32 l-6 0 M44 42 l-6 2",
    text: { value: "1", x: 28, y: 42, size: 34 },
  }),
  rey: badge("rey", "Rey del reencuentro", "REY REENCUENTRO", "secret", {
    a: "M8 38 V14 L20 24 L28 8 L36 24 L48 14 V38 Z",
    fa: SUN,
    b: "M8 38 H48 V44 H8 Z",
    fb: CORAL,
    c: "M14 52 H26 M22 48 L26 52 L22 56 M42 52 H30 M34 48 L30 52 L34 56",
  }),
  speaker: badge("speaker", "Con el speaker", "CON EL SPEAKER", "secret", {
    a: "M20 4 H36 V28 A8 8 0 0 1 20 28 Z",
    fa: CORAL,
    b: "M12 24 A16 16 0 0 0 44 24",
    c: "M28 40 V50 M18 50 H38",
  }),
  noctambulo: badge("noctambulo", "Noctámbulo", "NOCTÁMBULO", "secret", {
    a: "M28 10 A18 20 0 1 0 28.1 10 Z",
    fa: "#3A3F6B",
    b: "M12 10 L18 20 M44 10 L38 20",
    c: "M28 30 L24 36 L32 36 Z",
    fc: SUN,
    d: "M15 22 a6 6 0 1 0 0.1 0z M29 22 a6 6 0 1 0 0.1 0z",
    fd: WHITE,
  }),
  cazatalentos: badge("cazatalentos", "Cazatalentos", "CAZATALENTOS", "secret", {
    a: "M8 22 A16 16 0 1 0 8.1 22 Z",
    fa: WHITE,
    b: "M36 34 L50 48",
    c: "M24 12 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z",
    fc: SUN,
  }),
  conector100: badge("conector100", "Conector 100", "CONECTOR 100", "progress", {
    a: "M8 44 H48",
    text: { value: "100", x: 28, y: 36, size: 24 },
  }),
  trotamundos: badge("trotamundos", "Trotamundos", "TROTAMUNDOS", "progress", {
    a: "M28 52 C28 52 10 32 10 22 A18 18 0 0 1 46 22 C46 32 28 52 28 52 Z",
    fa: CORAL,
    d: "M22 22 a6 6 0 1 0 0.1 0z",
    fd: WHITE,
  }),
  curioso: badge("curioso", "Curioso", "CURIOSO", "progress", {
    a: "M6 28 A22 22 0 1 0 6.1 28 Z",
    fa: WHITE,
    b: "M28 8 L34 28 L28 48 L22 28 Z",
    fb: CORAL,
    d: "M25 28 a3 3 0 1 0 0.1 0z",
    fd: INK,
  }),
  memoria: badge("memoria", "Memoria de elefante", "MEMORIA", "progress", {
    a: "M30 10 A16 16 0 1 0 30.1 10 Z",
    fa: "#B9C7E6",
    b: "M14 16 A10 10 0 1 0 14.1 16 Z",
    fb: "#D5DCE6",
    c: "M42 30 C52 34 50 48 42 52",
    d: "M32 20 a3 3 0 1 0 0.1 0z",
    fd: INK,
  }),
  quinientos: badge("quinientos", "500 en la noche", "500 EN LA NOCHE", "community", {
    a: "M28 6 V16 M44 10 L38 18 M50 26 H40 M44 42 L38 34 M12 10 L18 18 M6 26 H16 M12 42 L18 34",
    b: "M28 36 V46",
    text: { value: "500", x: 28, y: 32, size: 17 },
  }),
  cuatro: badge("cuatro", "Cuatro trimestres", "4 TRIMESTRES", "streak", {
    a: "M28 2 C20 16 8 22 10 36 A18 18 0 0 0 46 36 C48 22 36 16 28 2 Z",
    fa: CORAL,
    b: "M28 22 C24 30 18 32 19 40 A9 9 0 0 0 37 40 C38 32 32 30 28 22 Z",
    fb: SUN,
    text: { value: "4", x: 28, y: 46, size: 14 },
  }),
};

export const BADGE_LIST: Badge[] = BADGE_IDS.map((id) => BADGES[id]);

export const isSecret = (id: BadgeId): boolean => BADGES[id].category === "secret";
