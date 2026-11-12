import type { z } from "zod";
import { Card } from "../api/schemas";
import {
  BODIES, DEFAULT_BUILDER, HAIR_COLOR_OPTIONS, HAIR_OPTIONS,
  lookFromBuilder, SHIRT_OPTIONS, SKIN_OPTIONS,
} from "../monito/look";
import { slugify } from "../slug";
import type { Topic } from "../topics";

export const DEMO_PEOPLE_COUNT = 150;
export const DemoPerson = Card.required({
  avatar: true, avatarMode: true, headline: true, company: true,
  city: true, interests: true, links: true,
});
export type DemoPerson = z.infer<typeof DemoPerson>;

// Invented identities and organizations; no photos or links to real accounts.
const FIRST_NAMES = [
  "Alina", "Braulio", "Celia", "Darío", "Elisa", "Fabián", "Gala", "Hugo", "Inés", "Jacobo",
  "Kiara", "León", "Mara", "Nicolás", "Olivia", "Pablo", "Quetzali", "Rafael", "Selene", "Tomás",
  "Úrsula", "Violeta", "Waldo", "Xóchitl", "Yahir", "Zaira", "Amira", "Berenice", "Cosme", "Dalia",
] as const;
const LAST_NAMES = ["Altamar", "Delvalle", "Monteluz", "Rioluna", "Serranova"] as const;
const CITIES = ["Guadalajara", "Ciudad de México", "Monterrey", "Mérida", "Querétaro", "Bogotá"] as const;
const ROLES = [
  { headline: "Product designer", company: "Taller Nube Clara", interests: ["Design", "Accessibility", "Product"] },
  { headline: "Frontend engineer", company: "Órbita de Papel", interests: ["React", "TypeScript", "Web Performance"] },
  { headline: "Community organizer", company: "Trama del Sur", interests: ["Community", "Open Source", "Jobs"] },
  { headline: "Founder", company: "Semilla Lunar", interests: ["Startups", "AI Products", "Product"] },
  { headline: "Data engineer", company: "Faro de Cobre", interests: ["Data", "Databases", "APIs"] },
  { headline: "ML researcher", company: "Laboratorio Brisa Azul", interests: ["Machine Learning", "LLMs", "Agents"] },
] as const satisfies readonly { headline: string; company: string; interests: readonly Topic[] }[];

function personAt(index: number): DemoPerson {
  const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(index / FIRST_NAMES.length)]}`;
  const role = ROLES[index % ROLES.length] ?? ROLES[0];
  const avatar = lookFromBuilder({
    ...DEFAULT_BUILDER,
    body: BODIES[(index + Math.floor(index / 120)) % BODIES.length] ?? "other",
    skin: SKIN_OPTIONS[index % SKIN_OPTIONS.length]?.hex ?? DEFAULT_BUILDER.skin,
    shirt: SHIRT_OPTIONS[Math.floor(index / 5) % SHIRT_OPTIONS.length]?.hex ?? DEFAULT_BUILDER.shirt,
    hair: HAIR_OPTIONS[Math.floor(index / 30) % HAIR_OPTIONS.length] ?? DEFAULT_BUILDER.hair,
    hairColor: HAIR_COLOR_OPTIONS[index % HAIR_COLOR_OPTIONS.length]?.hex ?? DEFAULT_BUILDER.hairColor,
    extras: { cap: index % 7 === 0, glasses: index % 4 === 0, beard: index % 11 === 0 },
  });
  return {
    id: `de000001-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
    name, handle: slugify(name), photoUrl: null, avatar, avatarMode: "monito",
    headline: role.headline, company: role.company, city: CITIES[index % CITIES.length] ?? "Guadalajara",
    interests: [...role.interests], links: {},
  };
}

export function demoCast(): DemoPerson[] {
  return Array.from({ length: DEMO_PEOPLE_COUNT }, (_, index) => personAt(index));
}
