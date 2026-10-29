// The nine sample people of design/compa-v2/componentes/Avatar.dc.html, used by mock mode and the gallery.
import { withDefaults, type MonitoLook } from "./look";

export type SamplePerson = { initials: string; name: string; bg: string; look: MonitoLook };

export const SAMPLE_PEOPLE = {
  DR: { initials: "DR", name: "Diego Ramírez", bg: "#FF8FAB", look: withDefaults({ outfit: "event", shirt: "#6CC4FF", accent: "#FFD93D" }) },
  VO: { initials: "VO", name: "Valeria Ochoa", bg: "#6CC4FF", look: withDefaults({ skin: "#E0A97F", hair: "long", hairColor: "#2A2438", shirt: "#6CC4FF" }) },
  RP: { initials: "RP", name: "Rodrigo Peña", bg: "#FFD93D", look: withDefaults({ skin: "#BF8360", hair: "shaved", hairColor: "#2A2438", face: "mustache", shirt: "#FFD93D" }) },
  ST: { initials: "ST", name: "Sofía Treviño", bg: "#6BE4A3", look: withDefaults({ skin: "#FFE0C7", hair: "bun", hairColor: "#D9664F", shirt: "#FF8FAB" }) },
  XS: { initials: "XS", name: "Ximena Salcedo", bg: "#FF8FAB", look: withDefaults({ skin: "#94603F", hair: "curly", hairColor: "#2A2438", shirt: "#FF6B4A", pants: "#2E2B40" }) },
  CI: { initials: "CI", name: "Carlos Ibarra", bg: "#6CC4FF", look: withDefaults({ skin: "#6B4129", hair: "spiky", hairColor: "#E8B44A", shirt: "#FFFFFF", outfit: "compa" }) },
  PN: { initials: "PN", name: "Paola Núñez", bg: "#FFD93D", look: withDefaults({ hair: "bangs", hairColor: "#2A2438", face: "glasses", shirt: "#FFD93D" }) },
  AM: { initials: "AM", name: "Andrea Mireles", bg: "#6BE4A3", look: withDefaults({ skin: "#E0A97F", hair: "long", hairColor: "#9A6232", shirt: "#6BE4A3", outfit: "stripes" }) },
  MG: { initials: "MG", name: "Mauricio Garza", bg: "#FF8FAB", look: withDefaults({ skin: "#BF8360", hairColor: "#2A2438", hat: "cap", hatColor: "#6CC4FF", shirt: "#FF8FAB" }) },
} as const satisfies Record<string, SamplePerson>;

export type SampleId = keyof typeof SAMPLE_PEOPLE;
export const SAMPLE_IDS = Object.keys(SAMPLE_PEOPLE) as SampleId[];

// Avatar circle colors rotate through the four accents; a person without a stored color gets one by name.
const CIRCLE_COLORS = ["#FF8FAB", "#6CC4FF", "#FFD93D", "#6BE4A3"] as const;

export function circleColorFor(name: string): string {
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return CIRCLE_COLORS[sum % CIRCLE_COLORS.length] as string;
}
