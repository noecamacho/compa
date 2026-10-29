// Example data for the OpenAPI document and for mock mode (one source of truth).
// The cast and numbers are the ones in the V2 design mocks (design/compa-v2/pantallas): Diego at Founders Fest GDL.
import type { z } from "zod";
import { SAMPLE_PEOPLE } from "../monito/sample-people";
import type * as S from "./schemas";

export const ids = {
  diego: "3f6c2a1e-8b4d-4c2a-9e1f-2a7b5c9d0e11",
  valeria: "7a1d4e2b-5c3f-4b6a-8d9e-0f1a2b3c4d22",
  rodrigo: "c2e9f0a1-3b4c-4d5e-8f60-718293a4b533",
  sofia: "9b2c1d0e-4f5a-4b6c-8d7e-1f2a3b4c5d66",
  ximena: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c77",
  carlos: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d88",
  paola: "c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e99",
  andrea: "d4e5f6a7-b8c9-4d0e-9f2a-3b4c5d6e7f00",
  event: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a55",
  connection: "0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a",
  connection2: "1e0d9c8b-7a6f-4e5d-9c2b-1a0f9e8d7c6b",
  connection3: "2f1e0d9c-8b7a-4f6e-ad3c-2b1a0f9e8d7c",
  interaction: "5b8f2c1e-3a4d-4e6f-9b0a-1c2d3e4f5a6b",
} as const;

export const founders = { slug: "founders-fest", name: "Founders Fest GDL" } as const;
// Example access code (M19); real codes come from lib/access-code.ts and are never documented.
export const accessCode = "k7m2p9xq4t";
export const foundersDoor = { code: accessCode, name: founders.name } as const;
export const joinUrl = `https://compa.lol/e/${accessCode}`;
const meetup = { slug: "gdl-founders-septiembre", name: "Founders Meetup Septiembre" } as const;

const TONIGHT = "2026-10-29T18:15:00.000Z";

type Card = z.input<typeof S.Card>;

const card = (id: string, who: keyof typeof SAMPLE_PEOPLE, handle: string, headline: string, company: string, city: string, interests: string[]): Card => ({
  id,
  handle,
  name: SAMPLE_PEOPLE[who].name,
  photoUrl: null,
  avatar: SAMPLE_PEOPLE[who].look,
  headline,
  company,
  city,
  interests,
});

export const diego = card(ids.diego, "DR", "diego-ramirez", "Cofounder", "Kuali", "Guadalajara, Jalisco", ["Startups", "Product", "AI Products"]);
export const valeriaPublic = card(ids.valeria, "VO", "valeria-ochoa", "CTO", "Tlali", "Monterrey", ["Startups", "Architecture", "Agents"]);
export const valeriaConnected: Card = {
  ...valeriaPublic,
  links: { linkedin: "https://www.linkedin.com/in/valeria-ochoa", instagram: "https://www.instagram.com/valeria.ochoa", whatsapp: "https://wa.me/528112345678" },
};
export const rodrigo = card(ids.rodrigo, "RP", "rodrigo-pena", "CEO", "Pagalo", "Guadalajara", ["Startups", "APIs"]);
export const sofia = card(ids.sofia, "ST", "sofia-trevino", "Head of Product", "Nido", "Ciudad de México", ["Product", "AI Products"]);
export const ximena = card(ids.ximena, "XS", "ximena-salcedo", "CMO", "Rutea", "Guadalajara", ["Product", "Community"]);
export const carlos = card(ids.carlos, "CI", "carlos-ibarra", "Founder", "Volta", "Querétaro", ["Startups", "Mobile"]);
export const paola = card(ids.paola, "PN", "paola-nunez", "Investor", "Dalus Capital", "Monterrey", ["Startups", "Data"]);
export const andrea = card(ids.andrea, "AM", "andrea-mireles", "Partner", "Angel Ventures", "Guadalajara", ["Startups"]);

export const me: z.input<typeof S.Me> = {
  ...diego,
  links: { linkedin: "https://www.linkedin.com/in/diegoramirez", instagram: "https://www.instagram.com/diego.rmz" },
  email: "diego@kuali.mx",
  visibility: {
    headline: "public",
    company: "public",
    interests: "public",
    links: { linkedin: "connections", github: "connections", x: "hidden", instagram: "connections", whatsapp: "hidden", web: "connections" },
  },
  nameEdited: false,
  photoEdited: false,
  isAdmin: false,
  currentEvent: foundersDoor,
  stats: { newConnections: 42, reconnections: 16, events: 7 },
  scores: { event: { rank: 6, points: 1265 }, lifetime: { rank: 14, points: 5110 } },
  badges: ["apreton", "tresdetres", "ff2026", "madrugador", "og"],
};

// First night: no connections yet (V2InicioVacio).
export const meEmpty: z.input<typeof S.Me> = {
  ...me,
  stats: { newConnections: 0, reconnections: 0, events: 1 },
  scores: { event: { rank: null, points: 0 }, lifetime: { rank: null, points: 0 } },
  badges: [],
};

export const event: z.input<typeof S.Event> = {
  ...founders,
  startsAt: "2026-10-29T16:00:00.000Z",
  endsAt: "2026-10-30T04:00:00.000Z",
  isRunning: true,
};

export const eventDoor: z.input<typeof S.EventDoor> = {
  code: accessCode,
  name: founders.name,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  isRunning: true,
  phase: "running",
  counters: { checkedIn: 340, connections: 218 },
};

export const interests: z.input<typeof S.InterestList> = [
  { id: 1, slug: "react", name: "React" },
  { id: 2, slug: "next-js", name: "Next.js" },
  { id: 29, slug: "agents", name: "Agents" },
  { id: 39, slug: "startups", name: "Startups" },
];

export const valeriaProfile: z.input<typeof S.UserProfile> = {
  card: valeriaConnected,
  connection: { status: "accepted", kind: "reconnection", eventSlug: founders.slug },
  scores: { event: { rank: 1, points: 1980 }, lifetime: { rank: 2, points: 8870 } },
  stats: { newConnections: 42, reconnections: 16, events: 7 },
  badges: ["rey", "tresdetres", "speaker", "maraton", "ff2026"],
  relationship: { reconnections: 3, eventsTogether: 3, mutual: [rodrigo, sofia, ximena] },
  lastInteraction: { connectionId: ids.connection, title: "Serie A", topics: ["Levantar capital", "Proptech"], at: TONIGHT },
};

const meeting = (connectionId: string, kind: "new" | "reconnection", at: string, direction: "sent" | "received" = "sent"): z.input<typeof S.Meeting> => ({
  connectionId,
  event: founders,
  status: "accepted",
  direction,
  kind,
  points: kind === "new" ? 50 : 20,
  at,
});

const history = (person: Card, type: z.input<typeof S.PersonType>, topics: string[], meetings: z.input<typeof S.Meeting>[]): z.input<typeof S.PersonHistory> => ({
  person,
  meetings,
  lastMetAt: meetings[0]?.at ?? TONIGHT,
  totalPoints: meetings.reduce((sum, m) => sum + (m.points ?? 0), 0),
  type,
  topics,
});

export const connectionList: z.input<typeof S.ConnectionList> = {
  incoming: [{ connectionId: ids.connection3, from: paola, event: founders, createdAt: "2026-10-29T18:42:10.000Z" }],
  people: [
    history(valeriaConnected, "reconnection", ["Levantar capital", "Proptech"], [
      meeting(ids.connection, "reconnection", TONIGHT),
      { ...meeting(ids.connection2, "new", "2026-09-18T19:30:00.000Z", "received"), event: meetup },
    ]),
    history(rodrigo, "new", ["Fintech", "Ventas B2B"], [meeting("3a2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d", "new", "2026-10-29T17:50:00.000Z")]),
    history(sofia, "new", ["Producto", "IA"], [meeting("4b3c2d1e-0f9a-4b8c-9d7e-6f5a4b3c2d1e", "new", "2026-10-29T17:20:00.000Z", "received")]),
    history(ximena, "friend", ["Marketing", "Go to market"], [meeting("5c4d3e2f-1a0b-4c9d-8e8f-7a6b5c4d3e2f", "reconnection", "2026-10-29T17:05:00.000Z")]),
    history(carlos, "reconnection", ["Levantar capital", "Hardware"], [meeting("6d5e4f3a-2b1c-4d0e-9f9a-8b7c6d5e4f3a", "reconnection", "2026-10-29T16:40:00.000Z")]),
  ],
  totals: { points: 1265, connections: 6, people: 5 },
};

export const connectionDetail: z.input<typeof S.ConnectionDetail> = {
  connectionId: ids.connection,
  status: "accepted",
  kind: "reconnection",
  direction: "sent",
  event: founders,
  other: valeriaConnected,
  topics: ["Levantar capital", "Proptech"],
  points: { kind: 20, topics: 0, note: 15, total: 35 },
  interaction: {
    id: ids.interaction,
    title: "Valeria levanta serie A y quiere conocer inversionistas de proptech",
    summary:
      "Valeria está cerrando su serie A con un fondo de Monterrey y busca founders de proptech para el portafolio. Le contaste de Kuali y le interesó el modelo de cobro por obra. Quiere que la presentes con Andrea para hablar de inversión. Quedaron de verse la próxima semana en Guadalajara y te va a mandar el deck antes.",
    bullets: [
      "Está cerrando una serie A de 3 millones para Tlali.",
      "Le interesa que la presentes con Andrea Mireles.",
      "Quedaron de verse la próxima semana.",
    ],
    topics: ["Levantar capital", "Proptech", "Serie A"],
    pendingAction: "Presentar a Valeria con Andrea",
    durationSec: 38,
    approvedAt: null,
  },
  at: TONIGHT,
};

// What the scanned person sees (V2Solicitud): Diego asked, nothing accepted yet.
export const incomingDetail: z.input<typeof S.ConnectionDetail> = {
  connectionId: ids.connection3,
  status: "pending",
  direction: "received",
  event: founders,
  other: { ...diego, interests: ["Levantar capital", "Proptech", "Contratar"] },
  topics: [],
  points: { kind: 0, topics: 0, note: 0, total: 0 },
  interaction: null,
  at: "2026-10-29T18:42:10.000Z",
};

export const liveSnapshot: z.input<typeof S.LiveSnapshot> = {
  event: { ...foundersDoor, isRunning: true },
  people: [
    { id: ids.valeria, name: valeriaPublic.name, photoUrl: null, points: 1980 },
    { id: ids.rodrigo, name: rodrigo.name, photoUrl: null, points: 1720 },
    { id: ids.sofia, name: sofia.name, photoUrl: null, points: 1540 },
    { id: ids.paola, name: paola.name, photoUrl: null, points: 1410 },
    { id: ids.ximena, name: ximena.name, photoUrl: null, points: 1300 },
    { id: ids.diego, name: diego.name, photoUrl: null, points: 1265 },
    { id: ids.carlos, name: carlos.name, photoUrl: null, points: 980 },
  ],
  connections: [
    { id: ids.connection, a: ids.valeria, b: ids.rodrigo, kind: "new", at: "2026-10-29T18:44:00.000Z" },
    { id: ids.connection2, a: ids.sofia, b: ids.paola, kind: "new", at: "2026-10-29T18:43:00.000Z" },
    { id: ids.connection3, a: ids.ximena, b: ids.carlos, kind: "reconnection", at: "2026-10-29T18:41:00.000Z" },
  ],
  counters: { checkedIn: 340, connections: 218, newCount: 160, reconnections: 58 },
  generatedAt: "2026-10-29T18:45:00.000Z",
};

const row = (rank: number, person: Card, points: number, connections: number): z.input<typeof S.LeaderboardRow> => ({
  rank,
  userId: person.id,
  handle: person.handle,
  name: person.name,
  photoUrl: null,
  points,
  connections,
});

export const leaderboard: z.input<typeof S.Leaderboard> = {
  rows: [row(1, valeriaPublic, 1980, 24), row(2, rodrigo, 1720, 20), row(3, sofia, 1540, 18), row(4, paola, 1410, 16), row(5, ximena, 1300, 15), row(6, diego, 1265, 15), row(7, carlos, 980, 11)],
  me: { rank: 6, points: 1265, above: row(5, ximena, 1300, 15), gap: 35, tip: "Una conexión nueva (+50) y la pasas." },
};

export const leaderboardLifetime: z.input<typeof S.Leaderboard> = {
  rows: [row(1, rodrigo, 9410, 120), row(2, valeriaPublic, 8870, 104), row(3, carlos, 7920, 96), row(13, paola, 5350, 60), row(14, diego, 5110, 58)],
  me: { rank: 14, points: 5110, above: row(13, paola, 5350, 60), gap: 240, tip: "Un evento más con 5 conexiones y la pasas." },
};

const earned = (id: z.input<typeof S.BadgeId>, earnedNote: string): z.input<typeof S.BadgeStatus> => ({ id, earnedAt: TONIGHT, earnedNote, progress: null });
const pending = (id: z.input<typeof S.BadgeId>, current: number, total: number, label: string): z.input<typeof S.BadgeStatus> => ({
  id,
  earnedAt: null,
  earnedNote: null,
  progress: { current, total, label },
});
const secret = (id: z.input<typeof S.BadgeId>): z.input<typeof S.BadgeStatus> => ({ id, earnedAt: null, earnedNote: null, progress: null });

export const badgeList: z.input<typeof S.BadgeList> = {
  badges: [
    earned("apreton", "Tu primera conexión"),
    earned("tresdetres", "Con Valeria"),
    earned("ff2026", "28 oct 2026"),
    earned("madrugador", "Hoy, 17:04"),
    earned("og", "De los primeros 100"),
    pending("iman", 7, 10, "te escanearon"),
    pending("maraton", 9, 15, "en una noche"),
    pending("puente", 2, 3, "presentaciones"),
    pending("cuatro", 3, 4, "eventos seguidos"),
    pending("cierre", 0, 1, "Conecta al final del evento"),
    pending("duo", 1, 3, "eventos con alguien"),
    pending("conector100", 42, 100, "conexiones"),
    pending("trotamundos", 2, 4, "ciudades"),
    pending("curioso", 2, 10, "temas distintos"),
    pending("memoria", 6, 20, "notas de voz"),
    pending("quinientos", 218, 500, "del evento"),
    secret("rey"),
    secret("speaker"),
    secret("noctambulo"),
    secret("cazatalentos"),
  ],
  earned: 5,
  total: 20,
};

export const invites: z.input<typeof S.Invites> = {
  code: "diego-r",
  url: "https://compa.lol/i/diego-r",
  invitees: [{ person: andrea, firstConnectionAt: "2026-10-29T17:30:00.000Z", points: 100 }],
  target: 3,
  goldenCap: false,
};

export const draft: z.input<typeof S.Draft> = {
  interactionId: ids.interaction,
  summary: "Valeria está cerrando su serie A con un fondo de Monterrey y busca founders de proptech. Quiere que Diego la presente con Andrea para hablar de inversión.",
  topics: ["Startups", "Product"],
  nextSteps: ["Presentar a Valeria con Andrea", "Verse la próxima semana en Guadalajara"],
  substantive: true,
  fallback: false,
  title: "Valeria levanta serie A y quiere conocer inversionistas de proptech",
  pendingAction: "Presentar a Valeria con Andrea",
};

export const approveBody: z.input<typeof S.ApproveBody> = {
  summary: draft.summary,
  topics: draft.topics,
  nextSteps: draft.nextSteps,
  title: draft.title,
  pendingAction: draft.pendingAction,
};
