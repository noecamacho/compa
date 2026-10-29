// The monito's look: every prop of design/compa-v2/componentes/Monito.dc.html, with English keys.
// Stored as `users.avatar` (jsonb), so it is validated with zod at the boundary.
import { z } from "zod";

export const HAIR_STYLES = ["short", "bangs", "spiky", "long", "bun", "curly", "shaved"] as const;
export const OUTFITS = ["plain", "stripes", "compa", "hoodie", "event", "suit"] as const;
export const HATS = ["none", "cap", "beanie", "crown"] as const;
export const FACES = ["none", "glasses", "sunglasses", "mustache"] as const;
export const EXTRAS = ["none", "badge", "medal", "cape"] as const;
// Hombre / Mujer / Otro on 02b (team decision, beyond the V2 handoff); only "woman" changes the drawing (a skirt).
export const BODIES = ["man", "woman", "other"] as const;
export type Body = (typeof BODIES)[number];

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const MonitoLook = z.object({
  skin: hex,
  hair: z.enum(HAIR_STYLES),
  hairColor: hex,
  outfit: z.enum(OUTFITS),
  shirt: hex,
  pants: hex,
  shoes: hex,
  hat: z.enum(HATS),
  hatColor: hex,
  hatAccent: hex,
  face: z.enum(FACES),
  beard: z.boolean(),
  extra: z.enum(EXTRAS),
  // Optional so looks saved before this option still parse.
  body: z.enum(BODIES).optional(),
  accent: hex.optional(),
  capeColor: hex.optional(),
  lanyardColor: hex.optional(),
});

export type MonitoLook = z.infer<typeof MonitoLook>;

export const DEFAULT_LOOK: MonitoLook = {
  skin: "#F5C9A3",
  hair: "short",
  hairColor: "#5A3825",
  outfit: "plain",
  shirt: "#6BE4A3",
  pants: "#4A6FA5",
  shoes: "#FFFFFF",
  hat: "none",
  hatColor: "#FF6B4A",
  hatAccent: "#FFFFFF",
  face: "none",
  beard: false,
  extra: "none",
};

export const withDefaults = (look: Partial<MonitoLook>): MonitoLook => ({ ...DEFAULT_LOOK, ...look });

// The golden cap for inviting three friends (README "Invitar 3 amigos").
export const GOLDEN_CAP = { hat: "cap", hatColor: "#FFD93D", hatAccent: "#FF6B4A" } as const;

// Options exposed to the user on the monito screen (02b). Everything else is earned later.
export const SKIN_OPTIONS = [
  { key: "very-light", hex: "#FFE0C7" },
  { key: "light", hex: "#F5C9A3" },
  { key: "medium", hex: "#E0A97F" },
  { key: "brown", hex: "#94603F" },
  { key: "dark", hex: "#5C3A21" },
] as const;

export const HAIR_OPTIONS = ["short", "long", "bun", "curly"] as const satisfies readonly MonitoLook["hair"][];

export const HAIR_COLOR_OPTIONS = [
  { key: "black", hex: "#2A2438" },
  { key: "brown", hex: "#5A3825" },
  { key: "red", hex: "#D9664F" },
  { key: "blond", hex: "#E8C170" },
] as const;

export const SHIRT_OPTIONS = [
  { key: "mint", hex: "#6BE4A3" },
  { key: "sky", hex: "#6CC4FF" },
  { key: "gum", hex: "#FF8FAB" },
  { key: "sun", hex: "#FFD93D" },
  { key: "coral", hex: "#FF6B4A" },
  { key: "ink", hex: "#1E1B2E" },
] as const;

export const EXTRA_OPTIONS = ["cap", "glasses", "beard"] as const;
export type ExtraOption = (typeof EXTRA_OPTIONS)[number];

// Picking a body suggests a hair style; every option stays changeable.
export const BODY_HAIR: Record<Body, (typeof HAIR_OPTIONS)[number]> = { man: "short", woman: "long", other: "bun" };

export type BuilderState = {
  body: Body;
  skin: string;
  hair: MonitoLook["hair"];
  hairColor: string;
  shirt: string;
  extras: Record<ExtraOption, boolean>;
};

export const DEFAULT_BUILDER: BuilderState = {
  body: "other",
  skin: DEFAULT_LOOK.skin,
  hair: "short",
  hairColor: DEFAULT_LOOK.hairColor,
  shirt: DEFAULT_LOOK.shirt,
  extras: { cap: false, glasses: false, beard: false },
};

export function lookFromBuilder(state: BuilderState, base: MonitoLook = DEFAULT_LOOK): MonitoLook {
  return {
    ...base,
    body: state.body,
    skin: state.skin,
    hair: state.hair,
    hairColor: state.hairColor,
    shirt: state.shirt,
    hat: state.extras.cap ? "cap" : "none",
    face: state.extras.glasses ? "glasses" : "none",
    beard: state.extras.beard,
  };
}

export function builderFromLook(look: MonitoLook): BuilderState {
  const hair = HAIR_OPTIONS.find((option) => option === look.hair) ?? "short";
  return {
    body: look.body ?? "other",
    skin: look.skin,
    hair,
    hairColor: look.hairColor,
    shirt: look.shirt,
    extras: { cap: look.hat === "cap", glasses: look.face === "glasses", beard: look.beard },
  };
}

const pick = <T>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)] as T;

// Random keeps the chosen body: the dice changes the look, not who you are.
export function randomBuilder(body: Body = "other", random: () => number = Math.random): BuilderState {
  return {
    body,
    skin: pick(SKIN_OPTIONS, random).hex,
    hair: pick(HAIR_OPTIONS, random),
    hairColor: pick(HAIR_COLOR_OPTIONS, random).hex,
    shirt: pick(SHIRT_OPTIONS, random).hex,
    extras: { cap: random() < 0.3, glasses: random() < 0.3, beard: random() < 0.2 },
  };
}
