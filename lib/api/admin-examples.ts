// Examples for the super-admin console and the test harness (API spec A11); mock mode serves them.
import type { z } from "zod";
import type * as A from "./admin-schemas";
import { accessCode, ids, joinUrl } from "./examples";

export const adminIds = {
  noe: "6a0f6c1e-1b2d-4c3e-8f4a-5b6c7d8e9f01",
  testAna: "8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e02",
  testBruno: "9d2e3f4a-5b6c-4d7e-9f8a-0b1c2d3e4f03",
  testEvent: "a3e4f5a6-b7c8-4d9e-8f0a-1b2c3d4e5f04",
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

export const attendees: z.input<typeof A.AdminAttendeeList> = {
  attendees: [
    { user: testAna, checkedInAt: "2026-10-29T17:02:31.000Z", addedByAdmin: true, points: 50, connections: 1 },
    { user: testBruno, checkedInAt: "2026-10-29T17:05:00.000Z", addedByAdmin: false, points: 50, connections: 1 },
  ],
  counts: { ...testEvent.counts, testUsers: 13 },
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
