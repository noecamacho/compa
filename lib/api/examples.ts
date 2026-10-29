// Example data for the OpenAPI document and for mock mode (one source of truth).
// Spanish context: a founders event in Guadalajara. All ids are valid v4 UUIDs.
import type { z } from "zod";
import type * as S from "./schemas";

const photo = (id: string) => `https://media.licdn.com/dms/image/v2/${id}/profile-displayphoto-shrink_200_200/0/1730000000000`;

export const ids = {
  lucia: "3f6c2a1e-8b4d-4c2a-9e1f-2a7b5c9d0e11",
  mateo: "7a1d4e2b-5c3f-4b6a-8d9e-0f1a2b3c4d22",
  sofia: "c2e9f0a1-3b4c-4d5e-8f60-718293a4b533",
  event: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a55",
  connection: "0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a",
  connection2: "1e0d9c8b-7a6f-4e5d-9c2b-1a0f9e8d7c6b",
  connection3: "2f1e0d9c-8b7a-4f6e-ad3c-2b1a0f9e8d7c",
  interaction: "5b8f2c1e-3a4d-4e6f-9b0a-1c2d3e4f5a6b",
} as const;

export const founders = { slug: "founders-fest", name: "Founders Fest Guadalajara 2026" } as const;
const meetup = { slug: "gdl-js-septiembre", name: "GDL JS Septiembre" } as const;

type Card = z.input<typeof S.Card>;

export const lucia: Card = {
  id: ids.lucia,
  handle: "lucia-fernandez",
  name: "Lucía Fernández",
  photoUrl: photo("D4D03AQHlucia"),
  headline: "CTO en Tramita · IA para la administración pública",
  company: "Tramita",
  interests: ["AI Products", "LLMs", "Startups"],
  links: { linkedin: "https://www.linkedin.com/in/lucia-fernandez" },
};

export const mateoPublic: Card = {
  id: ids.mateo,
  handle: "mateo-garcia",
  name: "Mateo García",
  photoUrl: photo("D4D03AQHmateo"),
  headline: "Frontend lead en Cabify",
  company: "Cabify",
  interests: ["React", "Next.js", "Web Performance"],
};

export const mateoConnected: Card = {
  ...mateoPublic,
  links: { linkedin: "https://www.linkedin.com/in/mateo-garcia", github: "https://github.com/mateogarcia" },
};

export const sofia: Card = {
  id: ids.sofia,
  handle: "sofia-martin",
  name: "Sofía Martín",
  photoUrl: null,
  headline: "Fundadora de Huerta Labs",
  interests: ["Startups", "Product"],
};

export const me: z.input<typeof S.Me> = {
  ...lucia,
  links: { linkedin: "https://www.linkedin.com/in/lucia-fernandez", x: "https://x.com/luciafdz" },
  email: "lucia@tramita.es",
  visibility: {
    headline: "public",
    company: "public",
    interests: "public",
    links: { linkedin: "connections", github: "connections", x: "hidden", instagram: "connections", web: "connections" },
  },
  nameEdited: false,
  photoEdited: false,
  isAdmin: false,
  currentEvent: founders,
};

export const event: z.input<typeof S.Event> = {
  ...founders,
  startsAt: "2026-10-29T16:00:00.000Z",
  endsAt: "2026-10-29T22:00:00.000Z",
  isRunning: true,
};

export const interests: z.input<typeof S.InterestList> = [
  { id: 1, slug: "react", name: "React" },
  { id: 2, slug: "next-js", name: "Next.js" },
  { id: 29, slug: "agents", name: "Agents" },
  { id: 39, slug: "startups", name: "Startups" },
];

export const connectionList: z.input<typeof S.ConnectionList> = {
  incoming: [
    { connectionId: ids.connection3, from: sofia, event: founders, createdAt: "2026-10-29T18:42:10.000Z" },
  ],
  people: [
    {
      person: mateoConnected,
      meetings: [
        {
          connectionId: ids.connection,
          event: founders,
          status: "accepted",
          direction: "sent",
          kind: "reconnection",
          points: 10,
          at: "2026-10-29T18:15:00.000Z",
        },
        {
          connectionId: ids.connection2,
          event: meetup,
          status: "accepted",
          direction: "received",
          kind: "new",
          points: 20,
          at: "2026-09-18T19:30:00.000Z",
        },
      ],
      lastMetAt: "2026-10-29T18:15:00.000Z",
      totalPoints: 30,
    },
  ],
  totals: { points: 55, connections: 2, people: 1 },
};

export const liveSnapshot: z.input<typeof S.LiveSnapshot> = {
  event: { ...founders, isRunning: true },
  people: [
    { id: ids.lucia, name: lucia.name, photoUrl: lucia.photoUrl, points: 45 },
    { id: ids.mateo, name: mateoPublic.name, photoUrl: mateoPublic.photoUrl, points: 30 },
    { id: ids.sofia, name: sofia.name, photoUrl: null, points: 20 },
  ],
  connections: [
    { id: ids.connection, a: ids.lucia, b: ids.mateo, kind: "reconnection", at: "2026-10-29T18:15:00.000Z" },
    { id: ids.connection2, a: ids.mateo, b: ids.sofia, kind: "new", at: "2026-10-29T18:31:00.000Z" },
  ],
  counters: { checkedIn: 3, connections: 2, newCount: 1, reconnections: 1 },
  generatedAt: "2026-10-29T18:45:00.000Z",
};

export const leaderboard: z.input<typeof S.Leaderboard> = {
  rows: liveSnapshot.people.map((person, index) => ({
    rank: index + 1,
    userId: person.id,
    name: person.name,
    photoUrl: person.photoUrl,
    points: person.points,
    connections: index === 1 ? 2 : 1,
  })),
};

export const draft: z.input<typeof S.Draft> = {
  interactionId: ids.interaction,
  summary: "Lucía y Mateo hablaron sobre migrar el panel de Tramita de Vue a React. Mateo compartirá su repositorio de ejemplo con Next.js.",
  topics: ["React", "Vue", "Next.js"],
  nextSteps: ["Mateo comparte el repo con Lucía"],
  substantive: true,
  fallback: false,
};

export const approveBody: z.input<typeof S.ApproveBody> = {
  summary: draft.summary,
  topics: draft.topics,
  nextSteps: draft.nextSteps,
};
