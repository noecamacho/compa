// Mock profile generator for real-mode test users (docs/testing/real-mode.md). Pure and seedable, so a seed gives
// the same people every run. The output is a full profile: no field is left for a LinkedIn sign-in to fill.
import { lookFromBuilder, randomBuilder, type MonitoLook } from "../monito/look";
import type { LinkKey, Links, Visibility } from "../profile-fields";
import { slugify } from "../slug";
import { TOPICS } from "../topics";

export const TEST_PRESETS = ["random", "founder", "engineer", "designer", "investor"] as const;
export type TestPreset = (typeof TEST_PRESETS)[number];
type Flavor = Exclude<TestPreset, "random">;

export const TEST_EMAIL_DOMAIN = "test.compa.lol";

export type GeneratedProfile = {
  name: string;
  handle: string;
  headline: string;
  company: string;
  city: string;
  interests: string[];
  links: Links;
  visibility: { headline: Visibility; company: Visibility; interests: Visibility; links: Record<LinkKey, Visibility> };
  avatar: MonitoLook;
  avatarMode: "monito";
};

const FIRST_NAMES = ["Ana", "Bruno", "Camila", "Diego", "Elena", "Fer", "Gael", "Hilda", "Iker", "Julia", "Kenji", "Lucía", "Mateo", "Nadia", "Omar", "Paula", "Quique", "Renata", "Santi", "Tania", "Uriel", "Valeria", "Wendy", "Ximena", "Yael", "Zoe"];
const LAST_NAMES = ["Arriaga", "Beltrán", "Cortés", "Duarte", "Estrada", "Flores", "Garza", "Hidalgo", "Ibarra", "Juárez", "Lara", "Montes", "Navarro", "Ortega", "Peña", "Quiroga", "Ríos", "Salinas", "Treviño", "Urrutia", "Vega", "Zamora"];
const CITIES = ["Guadalajara, Jalisco", "Ciudad de México", "Monterrey, Nuevo León", "Querétaro", "Mérida, Yucatán", "Puebla", "Madrid", "Bogotá", "San Francisco"];

const FLAVORS: Record<Flavor, { headlines: string[]; companies: string[]; topics: string[] }> = {
  founder: {
    headlines: ["Cofounder & CEO", "Founder", "Cofounder & COO", "Solo founder"],
    companies: ["Kuali", "Pagalo", "Rutea", "Nido", "Volta", "Tlali"],
    topics: ["Startups", "Product", "AI Products", "Community"],
  },
  engineer: {
    headlines: ["Staff Engineer", "CTO", "Frontend Engineer", "Platform Engineer", "ML Engineer"],
    companies: ["Codex Labs", "Bitso", "Clip", "Konfío", "Kavak"],
    topics: ["React", "TypeScript", "Agents", "LLMs", "Architecture", "Databases", "APIs"],
  },
  designer: {
    headlines: ["Product Designer", "Design Lead", "UX Researcher", "Brand Designer"],
    companies: ["Estudio Norte", "Pixel & Maíz", "Rappi", "Platzi"],
    topics: ["Design", "Product", "Accessibility", "CSS", "Community"],
  },
  investor: {
    headlines: ["Partner", "Principal", "Angel investor", "Scout"],
    companies: ["Dalus Capital", "Angel Ventures", "ALLVP", "500 LatAm"],
    topics: ["Startups", "AI Products", "Data"],
  },
};

const FLAVOR_KEYS = Object.keys(FLAVORS) as Flavor[];
const KNOWN_TOPICS = new Set<string>(TOPICS);

export type Random = () => number;

// mulberry32: tiny, fast and good enough for test fixtures; never for secrets.
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(list: readonly T[], random: Random): T => list[Math.floor(random() * list.length)] as T;

function pickSome<T>(list: readonly T[], count: number, random: Random): T[] {
  const pool = [...list];
  const chosen: T[] = [];
  while (chosen.length < count && pool.length) chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0] as T);
  return chosen;
}

const PUBLIC_LINKS: Record<LinkKey, Visibility> = { linkedin: "public", github: "connections", x: "connections", instagram: "connections", whatsapp: "hidden", web: "public" };

export function generateProfile(preset: TestPreset, random: Random): GeneratedProfile {
  const flavor = preset === "random" ? pick(FLAVOR_KEYS, random) : preset;
  const { headlines, companies, topics } = FLAVORS[flavor];
  const name = `${pick(FIRST_NAMES, random)} ${pick(LAST_NAMES, random)}`;
  const tag = Math.floor(random() * 36 ** 4).toString(36).padStart(4, "0");
  const handle = `${slugify(name).slice(0, 22)}-${tag}`;
  return {
    name,
    handle,
    headline: pick(headlines, random),
    company: pick(companies, random),
    city: pick(CITIES, random),
    interests: pickSome(topics.filter((topic) => KNOWN_TOPICS.has(topic)), 2 + Math.floor(random() * 2), random),
    links: { linkedin: `https://www.linkedin.com/in/${handle}`, github: `https://github.com/${handle}`, web: `https://${handle}.example.com` },
    visibility: { headline: "public", company: "public", interests: "public", links: PUBLIC_LINKS },
    avatar: lookFromBuilder(randomBuilder(random)),
    avatarMode: "monito",
  };
}

export const testEmailFor = (handle: string): string => `${handle}@${TEST_EMAIL_DOMAIN}`;

// The synthetic stand-in for LinkedIn's `sub` (users.linkedin_sub is unique and required).
export const testSubFor = (authUserId: string): string => `test:${authUserId}`;
