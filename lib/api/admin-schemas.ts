// Shapes of the super-admin console and the real-mode test harness (API spec A11, data model M20).
import "zod-openapi";
import { z } from "zod";
import { ScheduleEntry as ScheduleEntryRule, Schedule as ScheduleRule, TimeZone } from "../events/schedule";
import { LINK_KEYS, VISIBILITY_LEVELS } from "../profile-fields";
import { EVENT_STATUSES, ORGANIZER_ROLES } from "../roles";
import { TEST_PRESETS } from "../testing/profiles";
import {
  AccessCodeSchema,
  Avatar,
  AvatarMode,
  CreateEventFields,
  CurrentEvent,
  EventSlugSchema,
  HandleSchema,
  IsoDateSchema,
  Links,
  UserRole,
} from "./schemas";

const uuid = z.uuid();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const EventStatus = z
  .enum(EVENT_STATUSES)
  .meta({ id: "EventStatus", description: "`draft` and `archived` close every public route; `ended` closes the window." });
export const OrganizerRole = z.enum(ORGANIZER_ROLES).meta({ id: "OrganizerRole" });
export const ScheduleEntry = ScheduleEntryRule.meta({
  id: "ScheduleEntry",
  description: "A block of one day in the event's time zone: doors (no title) or an agenda item.",
});
export const Schedule = ScheduleRule.meta({ id: "Schedule" });

// Optional details an admin edits (M20). `null` clears a field.
const detailFields = {
  description: optionalText(2000),
  venueName: optionalText(120),
  address: optionalText(200),
  city: optionalText(80),
  country: optionalText(80),
  websiteUrl: z.url({ protocol: /^https?$/ }).max(500).nullable().optional(),
  timezone: TimeZone.optional().meta({ description: "IANA time zone, e.g. `America/Mexico_City`." }),
  schedule: Schedule.optional(),
  status: EventStatus.optional(),
  isTest: z.boolean().optional().meta({ description: "A test event: the only kind test users may join." }),
};

const windowOrder = (body: { startsAt?: string; endsAt?: string }) =>
  !body.startsAt || !body.endsAt || Date.parse(body.endsAt) > Date.parse(body.startsAt);
const WINDOW_ERROR = { path: ["endsAt"], message: "endsAt must be after startsAt" };

// The original four fields stay required, so existing callers of POST /api/admin/events keep working.
export const AdminCreateEventBody = CreateEventFields.extend(detailFields).refine(windowOrder, WINDOW_ERROR).meta({ id: "AdminCreateEventBody" });

export const PatchEventBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    startsAt: IsoDateSchema.optional(),
    endsAt: IsoDateSchema.optional(),
    ...detailFields,
  })
  .refine(windowOrder, WINDOW_ERROR)
  .meta({ id: "PatchEventBody" });

export const EventCounts = z
  .object({ attendees: z.int(), connections: z.int(), pending: z.int(), organizers: z.int() })
  .meta({ id: "EventCounts" });

export const AdminEvent = z
  .object({
    id: uuid,
    slug: EventSlugSchema,
    name: z.string(),
    accessCode: AccessCodeSchema,
    joinUrl: z.url(),
    startsAt: IsoDateSchema,
    endsAt: IsoDateSchema,
    isRunning: z.boolean(),
    status: EventStatus,
    isTest: z.boolean(),
    description: z.string().nullable(),
    venueName: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    timezone: z.string(),
    schedule: Schedule,
    createdAt: IsoDateSchema,
    counts: EventCounts,
  })
  .meta({ id: "AdminEvent" });

export const AdminEventBody = z.object({ event: AdminEvent }).meta({ id: "AdminEventBody" });
export const AdminEventList = z.object({ events: z.array(AdminEvent) }).meta({ id: "AdminEventList" });

export const AdminEventQuery = z.object({
  status: EventStatus.optional().meta({ description: "Only events in this status." }),
  archived: z.enum(["0", "1"]).default("0").meta({ description: "`1` includes archived events." }),
});

export const AdminUser = z
  .object({
    id: uuid,
    handle: HandleSchema,
    name: z.string(),
    photoUrl: z.string().nullable(),
    headline: z.string().nullable(),
    company: z.string().nullable(),
    city: z.string().nullable(),
    email: z.string().nullable(),
    role: UserRole,
    isTest: z.boolean(),
    createdAt: IsoDateSchema,
  })
  .meta({ id: "AdminUser", description: "A person as a super admin sees them: account fields included, never LinkedIn claims." });

export const AdminUserList = z.object({ users: z.array(AdminUser) }).meta({ id: "AdminUserList" });

export const UserSearchQuery = z.object({
  q: z.string().trim().max(80).optional().meta({ description: "Matches name, handle, email or company (case-insensitive)." }),
  test: z.enum(["include", "exclude", "only"]).default("include"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const AdminAttendee = z
  .object({
    user: AdminUser,
    checkedInAt: IsoDateSchema,
    addedByAdmin: z.boolean().meta({ description: "Checked in by a super admin; consent was admin-assigned." }),
    points: z.int(),
    connections: z.int(),
  })
  .meta({ id: "AdminAttendee" });

export const AdminAttendeeList = z
  .object({ attendees: z.array(AdminAttendee), counts: EventCounts.extend({ testUsers: z.int() }) })
  .meta({ id: "AdminAttendeeList" });

export const AddAttendeeBody = z.object({ userId: uuid }).meta({ id: "AddAttendeeBody" });
export const AddedAttendee = z
  .object({ attendee: AdminAttendee, alreadyCheckedIn: z.boolean() })
  .meta({ id: "AddedAttendee" });

export const Organizer = z.object({ user: AdminUser, role: OrganizerRole, createdAt: IsoDateSchema }).meta({ id: "Organizer" });
export const OrganizerList = z.object({ organizers: z.array(Organizer) }).meta({ id: "OrganizerList" });
export const SetOrganizerBody = z.object({ userId: uuid, role: OrganizerRole.default("organizer") }).meta({ id: "SetOrganizerBody" });
export const OrganizerBody = z.object({ organizer: Organizer }).meta({ id: "OrganizerBody" });

export const EventUserParams = z.object({ slug: EventSlugSchema, userId: uuid });
export const TestUserParams = z.object({ id: uuid });

// ---- Real-mode test harness ----

export const TestPreset = z
  .enum(TEST_PRESETS)
  .meta({ id: "TestPreset", description: "Profile generator flavor; `random` mixes all of them." });

const interestRef = z.string().trim().min(1).max(40).meta({ description: "Interest slug or name, e.g. `agents`." });

export const TestProfileInput = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    handle: HandleSchema.optional(),
    headline: optionalText(120),
    company: optionalText(80),
    city: optionalText(80),
    interests: z.array(interestRef).max(10).optional(),
    links: z.partialRecord(z.enum(LINK_KEYS), z.string().trim().max(200)).optional(),
    visibility: z
      .object({
        headline: z.enum(VISIBILITY_LEVELS).optional(),
        company: z.enum(VISIBILITY_LEVELS).optional(),
        interests: z.enum(VISIBILITY_LEVELS).optional(),
        links: z.partialRecord(z.enum(LINK_KEYS), z.enum(VISIBILITY_LEVELS)).optional(),
      })
      .optional(),
    avatar: Avatar.optional(),
    avatarMode: AvatarMode.optional(),
    photoUrl: z.url().max(500).nullable().optional(),
    role: UserRole.optional().meta({ description: "`super_admin` makes a test admin, limited to test events and test people." }),
  })
  .meta({ id: "TestProfileInput", description: "Every field is optional; the generator fills the rest." });

export const CreateTestUsersBody = z
  .object({
    count: z.int().min(1).max(50).optional().meta({ description: "How many to generate when `users` is absent (default 1)." }),
    preset: TestPreset.default("random"),
    seed: z.int().min(0).optional().meta({ description: "Makes generated profiles repeatable." }),
    users: z.array(TestProfileInput).min(1).max(50).optional(),
    checkInTo: EventSlugSchema.optional().meta({ description: "Slug of a test event to check everyone in to (consent admin-assigned)." }),
  })
  .meta({ id: "CreateTestUsersBody" });

export const TestUser = AdminUser.extend({
  interests: z.array(z.string()),
  links: Links,
  avatarMode: AvatarMode,
  currentEvent: CurrentEvent.nullable(),
}).meta({ id: "TestUser" });

export const TestUserQuery = z.object({
  handlePrefix: z.string().regex(/^[a-z0-9-]{1,32}$/).optional().meta({ description: "Only handles that start with this, e.g. a run id." }),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const TestUserList = z.object({ users: z.array(TestUser) }).meta({ id: "TestUserList" });

export const TestSession = z
  .object({
    user: z.object({ id: uuid, handle: HandleSchema, name: z.string() }),
    expiresAt: IsoDateSchema.nullable(),
  })
  .meta({ id: "TestSession", description: "The Supabase session cookies come in `Set-Cookie`; tokens never appear in the body." });

export type AdminEventT = z.infer<typeof AdminEvent>;
export type AdminUserT = z.infer<typeof AdminUser>;
export type AdminAttendeeT = z.infer<typeof AdminAttendee>;
export type OrganizerT = z.infer<typeof Organizer>;
export type TestUserT = z.infer<typeof TestUser>;
export type TestProfileInputT = z.infer<typeof TestProfileInput>;
export type PatchEventBodyT = z.infer<typeof PatchEventBody>;
export type EventStatusT = z.infer<typeof EventStatus>;
