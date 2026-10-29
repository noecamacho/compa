// Shapes of the super-admin console and the real-mode test harness (API spec A11, data model M20).
import "zod-openapi";
import { z } from "zod";
import { EVENT_PHASES } from "../admin/event-phase";
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
// Offset pagination shared by the admin lists; the total counts every match, not just this page.
const pageQuery = z.coerce.number().int().min(1).default(1).meta({ description: "1-based page number." });
const pageFields = { total: z.int().meta({ description: "Every match across all pages." }), page: z.int(), pageSize: z.int() };
const sortDir = z.enum(["asc", "desc"]).optional().meta({ description: "Default: `asc` for `name`, `desc` otherwise." });
const testScope = z.enum(["include", "exclude", "only"]).default("include");

export const EventPhase = z
  .enum(EVENT_PHASES)
  .meta({ id: "EventPhase", description: "Derived from status and window: a `live` event is upcoming, running or ended by the clock." });
export const EVENT_SORTS = ["startsAt", "name", "status", "attendees", "connections", "createdAt"] as const;

export const AdminEventList = z
  .object({ events: z.array(AdminEvent), ...pageFields })
  .meta({ id: "AdminEventList" });

export const AdminEventQuery = z.object({
  status: EventStatus.optional().meta({ description: "Only events in this status." }),
  archived: z.enum(["0", "1"]).default("0").meta({ description: "`1` includes archived events." }),
  phase: EventPhase.optional().meta({ description: "Only events in this derived phase; wins over `status` and `archived`." }),
  q: z.string().trim().max(80).optional().meta({ description: "Name, slug, venue or city (case-insensitive), or an exact access code." }),
  test: testScope.meta({ description: "Include, exclude or isolate test events." }),
  sort: z.enum(EVENT_SORTS).default("startsAt").meta({ description: "`status` orders by phase: running, upcoming, draft, ended, archived." }),
  dir: sortDir,
  page: pageQuery,
  pageSize: z.coerce.number().int().min(1).max(200).default(200),
});

const count = z.int().min(0);

export const AdminStats = z
  .object({
    events: z.object({ running: count, upcoming: count, draft: count, ended: count, archived: count, test: count }),
    people: z.object({ total: count, test: count, superAdmins: count, joinedLast24h: count }),
    checkIns: z.object({ total: count, last24h: count }),
    connections: z.object({
      accepted: count,
      pending: count.meta({ description: "Pending requests at events that are not over (ended or archived ones expire on read)." }),
    }),
    asOf: IsoDateSchema,
  })
  .meta({ id: "AdminStats", description: "Console headline numbers. A test admin sees test events and test people only." });

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

export const AdminUserList = z.object({ users: z.array(AdminUser), ...pageFields }).meta({ id: "AdminUserList" });

const personSearch = z.string().trim().max(80).optional().meta({ description: "Matches name, handle, email or company (case-insensitive)." });

export const USER_SORTS = ["name", "createdAt"] as const;

export const UserSearchQuery = z.object({
  q: personSearch,
  test: testScope,
  role: z.enum(["any", "super_admin", "user"]).default("any"),
  sort: z.enum(USER_SORTS).default("name"),
  dir: sortDir,
  page: pageQuery,
  limit: z.coerce.number().int().min(1).max(100).default(25).meta({ description: "Page size." }),
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
  .object({
    attendees: z.array(AdminAttendee),
    total: z.int().meta({ description: "Attendees matching the query, across all pages." }),
    counts: EventCounts.extend({ testUsers: z.int() }).meta({ description: "The whole event, whatever the query." }),
  })
  .meta({ id: "AdminAttendeeList" });

export const ATTENDEE_SORTS = ["checkedInAt", "name", "points", "connections"] as const;

export const AttendeeQuery = z.object({
  q: personSearch,
  source: z.enum(["all", "admin", "self"]).default("all").meta({ description: "`admin`: checked in by a super admin; `self`: through the door." }),
  test: testScope,
  sort: z.enum(ATTENDEE_SORTS).default("checkedInAt"),
  dir: sortDir,
  page: pageQuery,
  pageSize: z.coerce.number().int().min(1).max(1000).default(1000),
});

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
export type AdminEventQueryT = z.infer<typeof AdminEventQuery>;
export type AdminEventListT = z.infer<typeof AdminEventList>;
export type AdminStatsT = z.infer<typeof AdminStats>;
export type UserSearchQueryT = z.infer<typeof UserSearchQuery>;
export type AdminUserListT = z.infer<typeof AdminUserList>;
export type AttendeeQueryT = z.infer<typeof AttendeeQuery>;
export type AdminAttendeeListT = z.infer<typeof AdminAttendeeList>;
