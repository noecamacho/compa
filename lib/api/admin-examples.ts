// Examples for the super-admin console and the test harness (API spec A11); mock mode serves them.
import type { z } from "zod";
import type * as A from "./admin-schemas";
import { accessCode, ids, joinUrl } from "./examples";

export const adminIds = {
  noe: "6a0f6c1e-1b2d-4c3e-8f4a-5b6c7d8e9f01",
  testAna: "8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e02",
  testBruno: "9d2e3f4a-5b6c-4d7e-9f8a-0b1c2d3e4f03",
  testEvent: "a3e4f5a6-b7c8-4d9e-8f0a-1b2c3d4e5f04",
  testCodexAdmin: "b4f5a6b7-c8d9-4e0f-9a1b-2c3d4e5f6a05",
  mariaJose: "c5a6b7c8-d9e0-4f1a-8b2c-3d4e5f6a7b06",
  diegoR: "d6b7c8d9-e0f1-4a2b-9c3d-4e5f6a7b8c07",
  testCamila: "e7c8d9e0-f1a2-4b3c-8d4e-5f6a7b8c9d08",
  testDaniel: "f8d9e0f1-a2b3-4c4d-9e5f-6a7b8c9d0e09",
  testElena: "09e0f1a2-b3c4-4d5e-8f6a-7b8c9d0e1f10",
  testFer: "1af1a2b3-c4d5-4e6f-9a7b-8c9d0e1f2a11",
  agentesCdmx: "2b02b3c4-d5e6-4f7a-8b8c-9d0e1f2a3b12",
  demoDayMerida: "3c13c4d5-e6f7-4a8b-9c9d-0e1f2a3b4c13",
  hackathonGdl: "4d24d5e6-f7a8-4b9c-8d0e-1f2a3b4c5d14",
  mixerCdmx: "5e35e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e15",
  meetupZapopan: "6f46f7a8-b9c0-4d1e-8f2a-3b4c5d6e7f16",
  encuentro: "7a57a8b9-c0d1-4e2f-9a3b-4c5d6e7f8a17",
} as const;

export const noe: z.input<typeof A.AdminUser> = {
  id: adminIds.noe,
  handle: "noe-camacho",
  name: "Noe Camacho",
  photoUrl: null,
  headline: "Captain",
  company: "COMPA",
  city: "Guadalajara",
  email: "noe@example.com",
  role: "super_admin",
  isTest: false,
  createdAt: "2026-10-28T20:00:00.000Z",
};

export const testAna: z.input<typeof A.AdminUser> = {
  id: adminIds.testAna,
  handle: "ana-garza-k3p9",
  name: "Ana Garza",
  photoUrl: null,
  headline: "Cofounder & CEO",
  company: "Rutea",
  city: "Monterrey, Nuevo León",
  email: "ana-garza-k3p9@test.compa.lol",
  role: "user",
  isTest: true,
  createdAt: "2026-10-29T15:00:00.000Z",
};

const testBruno: z.input<typeof A.AdminUser> = {
  ...testAna,
  id: adminIds.testBruno,
  handle: "bruno-vega-7tq2",
  name: "Bruno Vega",
  headline: "Staff Engineer",
  company: "Codex Labs",
  email: "bruno-vega-7tq2@test.compa.lol",
};

export const counts = { attendees: 340, connections: 218, pending: 12, organizers: 2 };

export const adminEvent: z.input<typeof A.AdminEvent> = {
  id: ids.event,
  slug: "founders-fest",
  name: "Founders Fest GDL",
  accessCode,
  joinUrl,
  startsAt: "2026-10-29T16:00:00.000Z",
  endsAt: "2026-10-30T04:00:00.000Z",
  isRunning: true,
  status: "live",
  isTest: false,
  description: "Founders, operators and investors from Guadalajara, one night.",
  venueName: "Casa Jalisco",
  address: "Av. Chapultepec 480",
  city: "Guadalajara",
  country: "México",
  websiteUrl: "https://foundersfest.example.com",
  timezone: "America/Mexico_City",
  schedule: [
    { date: "2026-10-29", start: "10:00", end: "22:00" },
    { date: "2026-10-29", start: "18:00", end: "18:45", title: "Keynote" },
  ],
  createdAt: "2026-10-20T12:00:00.000Z",
  counts,
};

export const testEvent: z.input<typeof A.AdminEvent> = {
  ...adminEvent,
  id: adminIds.testEvent,
  slug: "codex-conf-2026",
  name: "Codex Conf 2026",
  accessCode: "c0dexc0nf26",
  joinUrl: "https://compa.lol/e/c0dexc0nf26",
  isTest: true,
  description: "The shared test event for real-mode tests. Test people only.",
  venueName: "The test lab",
  schedule: [],
  counts: { attendees: 13, connections: 4, pending: 2, organizers: 1 },
};

// ---- Varied events for the console list (admin spec §7.1): every phase, a test event, a long multi-day one ----

const event = (id: string, slug: string, code: string, fields: Partial<z.input<typeof A.AdminEvent>>): z.input<typeof A.AdminEvent> => ({
  ...adminEvent,
  id,
  slug,
  accessCode: code,
  joinUrl: `https://compa.lol/e/${code}`,
  isRunning: false,
  description: null,
  websiteUrl: null,
  schedule: [],
  ...fields,
});

// Upcoming: live, starts in two weeks.
export const upcomingEvent = event(adminIds.agentesCdmx, "noche-de-agentes-cdmx", "n8chagnt5x", {
  name: "Noche de Agentes CDMX",
  startsAt: "2026-11-14T00:00:00.000Z",
  endsAt: "2026-11-14T05:00:00.000Z",
  venueName: "Foro Reforma",
  address: "Paseo de la Reforma 250, Juárez",
  city: "Ciudad de México",
  createdAt: "2026-10-25T18:30:00.000Z",
  counts: { attendees: 0, connections: 0, pending: 0, organizers: 1 },
});

export const draftEvent = event(adminIds.demoDayMerida, "demo-day-merida", "d3m0mrd7kq", {
  name: "Demo Day Mérida",
  status: "draft",
  startsAt: "2026-12-05T22:00:00.000Z",
  endsAt: "2026-12-06T03:00:00.000Z",
  venueName: "Centro de Convenciones Siglo XXI",
  address: "Calle 60 Norte 299",
  city: "Mérida",
  timezone: "America/Merida",
  createdAt: "2026-10-28T09:15:00.000Z",
  counts: { attendees: 0, connections: 0, pending: 0, organizers: 0 },
});

// Ended by the clock: still `live`, but the window closed (phase "ended").
export const endedByTimeEvent = event(adminIds.hackathonGdl, "hackathon-tapatio", "h4ckt4p8wz", {
  name: "Hackathon Tapatío",
  startsAt: "2026-10-18T15:00:00.000Z",
  endsAt: "2026-10-19T03:00:00.000Z",
  venueName: "Palacio de la Cultura y la Comunicación",
  city: "Zapopan",
  createdAt: "2026-10-01T16:00:00.000Z",
  counts: { attendees: 128, connections: 96, pending: 9, organizers: 3 },
});

export const endedEvent = event(adminIds.mixerCdmx, "startup-mixer-roma", "m6x3rr0m4p", {
  name: "Startup Mixer Roma",
  status: "ended",
  startsAt: "2026-10-10T00:30:00.000Z",
  endsAt: "2026-10-10T04:00:00.000Z",
  venueName: "Casa Lamm",
  address: "Álvaro Obregón 99, Roma Norte",
  city: "Ciudad de México",
  createdAt: "2026-09-20T12:00:00.000Z",
  counts: { attendees: 74, connections: 51, pending: 0, organizers: 2 },
});

export const archivedEvent = event(adminIds.meetupZapopan, "meetup-zapopan-2025", "z4p8p4nm2t", {
  name: "Meetup Zapopan 2025",
  status: "archived",
  startsAt: "2025-11-20T00:00:00.000Z",
  endsAt: "2025-11-20T04:00:00.000Z",
  venueName: "Andares Coworking",
  city: "Zapopan",
  createdAt: "2025-11-01T12:00:00.000Z",
  counts: { attendees: 41, connections: 23, pending: 0, organizers: 1 },
});

// 119 characters and three days, for clamping and multi-day formatting.
export const longEvent = event(adminIds.encuentro, "encuentro-fundadores-occidente", "3ncu3ntr0g", {
  name: "Encuentro de Fundadoras, Fundadores e Inversionistas de Tecnología del Occidente de México: edición Guadalajara, 3 días",
  startsAt: "2026-10-28T15:00:00.000Z",
  endsAt: "2026-10-31T02:00:00.000Z",
  isRunning: true,
  venueName: "Expo Guadalajara, Salón Jalisco y explanada norte",
  address: "Av. Mariano Otero 1499, Verde Valle",
  city: "Guadalajara",
  createdAt: "2026-09-30T17:45:00.000Z",
  counts: { attendees: 1112, connections: 854, pending: 41, organizers: 6 },
});

// Newest start first, as the list sorts by default.
export const adminEvents = [upcomingEvent, draftEvent, longEvent, adminEvent, testEvent, endedByTimeEvent, endedEvent, archivedEvent];

// ---- People ----

const testCodexAdmin: z.input<typeof A.AdminUser> = {
  ...testAna,
  id: adminIds.testCodexAdmin,
  handle: "codex-test-admin",
  name: "Codex Test Admin",
  headline: "Test super admin",
  company: "COMPA",
  city: "Guadalajara",
  email: "codex-test-admin@test.compa.lol",
  role: "super_admin",
  createdAt: "2026-10-28T22:00:00.000Z",
};

const mariaJose: z.input<typeof A.AdminUser> = {
  id: adminIds.mariaJose,
  handle: "maria-jose-hernandez-villasenor",
  name: "María José Hernández Villaseñor",
  photoUrl: null,
  headline: "Directora de Innovación Abierta",
  company: "Grupo Industrial de Occidente",
  city: "Zapopan, Jalisco",
  email: "maria.jose.hernandez.villasenor@grupo-industrial-occidente.com.mx",
  role: "user",
  isTest: false,
  createdAt: "2026-10-29T16:41:00.000Z",
};

const diegoR: z.input<typeof A.AdminUser> = {
  ...mariaJose,
  id: adminIds.diegoR,
  handle: "diego-ramirez",
  name: "Diego Ramírez",
  headline: "Founder",
  company: "Nopal Pay",
  city: "Ciudad de México",
  email: "diego@nopalpay.mx",
  createdAt: "2026-10-27T03:12:00.000Z",
};

export const adminUsers = [diegoR, mariaJose, noe, testAna, testBruno, testCodexAdmin];

// ---- Attendees of the test event ----

const testPerson = (id: string, handle: string, name: string, headline: string, company: string): z.input<typeof A.AdminUser> => ({
  ...testAna,
  id,
  handle,
  name,
  headline,
  company,
  email: `${handle}@test.compa.lol`,
});

const testCamila = testPerson(adminIds.testCamila, "camila-ortiz-m4x8", "Camila Ortiz", "Product Designer", "Diseño Tapatío");
const testDaniel = testPerson(adminIds.testDaniel, "daniel-soto-p2r7", "Daniel Soto", "Partner", "Jaguar Ventures");
const testElena = testPerson(adminIds.testElena, "elena-ruiz-q9w3", "Elena Ruiz", "ML Engineer", "Agentes MX");
const testFer = testPerson(adminIds.testFer, "fernanda-de-la-cruz-z5t1", "Fernanda de la Cruz Montenegro", "Head of Growth", "Mercado Bonito");

export const attendees: z.input<typeof A.AdminAttendeeList> = {
  attendees: [
    { user: testAna, checkedInAt: "2026-10-29T17:02:31.000Z", addedByAdmin: true, points: 50, connections: 1 },
    { user: testBruno, checkedInAt: "2026-10-29T17:05:00.000Z", addedByAdmin: false, points: 50, connections: 1 },
    { user: testFer, checkedInAt: "2026-10-29T16:58:12.000Z", addedByAdmin: false, points: 210, connections: 3 },
    { user: testElena, checkedInAt: "2026-10-29T16:44:05.000Z", addedByAdmin: false, points: 120, connections: 2 },
    { user: testDaniel, checkedInAt: "2026-10-29T16:31:47.000Z", addedByAdmin: true, points: 0, connections: 0 },
    { user: testCamila, checkedInAt: "2026-10-29T16:20:00.000Z", addedByAdmin: false, points: 70, connections: 1 },
  ],
  total: 6,
  counts: { ...testEvent.counts, attendees: 6, testUsers: 6 },
};

export const stats: z.input<typeof A.AdminStats> = {
  events: { running: 3, upcoming: 1, draft: 1, ended: 2, archived: 1, test: 1 },
  people: { total: 1284, test: 13, superAdmins: 3, joinedLast24h: 212 },
  checkIns: { total: 1695, last24h: 356 },
  connections: { accepted: 1246, pending: 52 },
  asOf: "2026-10-29T20:00:00.000Z",
};

export const organizer: z.input<typeof A.Organizer> = { user: noe, role: "owner", createdAt: "2026-10-29T15:00:00.000Z" };

export const testUser: z.input<typeof A.TestUser> = {
  ...testAna,
  interests: ["Startups", "Product"],
  links: { linkedin: "https://www.linkedin.com/in/ana-garza-k3p9" },
  avatarMode: "monito",
  currentEvent: { code: "c0dexc0nf26", name: "Codex Conf 2026" },
};

export const testSession: z.input<typeof A.TestSession> = {
  user: { id: testAna.id, handle: testAna.handle, name: testAna.name },
  expiresAt: "2026-10-29T18:00:00.000Z",
};
