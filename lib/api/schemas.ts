// Every request, response and error shape of the COMPA API, defined once (API spec §4–§5).
// Types are inferred from these schemas; lib/api/routes.ts wires them into the OpenAPI document.
import "zod-openapi";
import { z } from "zod";
import { AVATAR_MODES } from "../avatar-mode";
import { BADGE_IDS } from "../badges/catalog";
import { MonitoLook } from "../monito/look";
import { LOCALES } from "../i18n";
import { LINK_KEYS, VISIBILITY_LEVELS } from "../profile-fields";
import { USER_ROLES } from "../roles";
import { TOPICS } from "../topics";

const uuid = z.uuid();
const isoDate = z.iso.datetime({ offset: true });
const handle = z.string().regex(/^[a-z0-9-]{2,32}$/);
const eventSlug = z.string().regex(/^[a-z0-9-]{2,48}$/);
// The secret in the event QR (M19, lib/access-code.ts).
const accessCode = z.string().regex(/^[a-z0-9]{8,32}$/).meta({ description: "Event access code from the event QR (`/e/<code>`)." });

export const Visibility = z.enum(VISIBILITY_LEVELS).meta({ id: "Visibility" });
export const LinkKey = z.enum(LINK_KEYS).meta({ id: "LinkKey" });
export const Links = z.partialRecord(LinkKey, z.string()).meta({ id: "Links" });
export const ConnectionKind = z.enum(["new", "reconnection"]).meta({ id: "ConnectionKind" });
// "declined" is only ever shown to the addressee (API spec §7.4).
export const ConnectionStatusForMe = z
  .enum(["pending", "accepted", "expired", "declined"])
  .meta({ id: "ConnectionStatusForMe" });

export const VisibilitySettings = z
  .object({
    headline: Visibility,
    company: Visibility,
    interests: Visibility,
    links: z.object({
      linkedin: Visibility,
      github: Visibility,
      x: Visibility,
      instagram: Visibility,
      whatsapp: Visibility,
      web: Visibility,
    }),
  })
  .meta({ id: "VisibilitySettings" });

export const EventRef = z.object({ slug: eventSlug, name: z.string() }).meta({ id: "EventRef" });
export { accessCode as AccessCodeSchema, eventSlug as EventSlugSchema, handle as HandleSchema, isoDate as IsoDateSchema };
// What a checked-in attendee needs to reach their event's public routes (A10).
export const CurrentEvent = z.object({ code: accessCode, name: z.string() }).meta({ id: "CurrentEvent" });

export const Avatar = MonitoLook.meta({ id: "MonitoLook", description: "The person's pixel-art monito (design/compa-v2/README.md)." });
export const BadgeId = z.enum(BADGE_IDS).meta({ id: "BadgeId" });
export const AvatarMode = z
  .enum(AVATAR_MODES)
  .meta({ id: "AvatarMode", description: "Which picture to show; always `monito` when there is no photo." });

// Fields the V2 screens read; optional until the handlers fill them (design handoff, follow-up PR).
export const Card = z
  .object({
    id: uuid,
    handle,
    name: z.string(),
    photoUrl: z.string().nullable(),
    avatar: Avatar.optional(),
    avatarMode: AvatarMode.optional(),
    headline: z.string().optional(),
    company: z.string().optional(),
    city: z.string().optional(),
    interests: z.array(z.string()).optional(),
    links: Links.optional(),
  })
  .meta({ id: "Card", description: "Another person as the viewer may see them (visibility filter, API spec §6)." });

export const Standing = z
  .object({ rank: z.int().nullable(), points: z.int() })
  .meta({ id: "Standing", description: "Points and position; rank is null when the person has no points yet." });

export const Scores = z.object({ event: Standing, lifetime: Standing }).meta({ id: "Scores" });

export const ProfileStats = z
  .object({ newConnections: z.int(), reconnections: z.int(), events: z.int() })
  .meta({ id: "ProfileStats" });

export const UserRole = z
  .enum(USER_ROLES)
  .meta({ id: "UserRole", description: "`super_admin` opens /admin and /api/admin/* (A11); everyone else gets 404 there." });

export const Me = Card.extend({
  email: z.string().nullable(),
  visibility: VisibilitySettings,
  nameEdited: z.boolean(),
  photoEdited: z.boolean(),
  isAdmin: z.boolean().meta({ description: "Deprecated: `role === \"super_admin\"`." }),
  role: UserRole,
  isTest: z.boolean().meta({ description: "A synthetic real-mode test user (docs/testing/real-mode.md)." }),
  currentEvent: CurrentEvent.nullable().meta({ description: "The event you are checked in to right now (A2), or null." }),
  stats: ProfileStats.optional(),
  scores: Scores.optional(),
  badges: z.array(BadgeId).optional().meta({ description: "Earned badges, most recent first." }),
}).meta({ id: "Me" });

// Search by name on the connect screen ("¿No sale el QR? Busca por nombre").
export const PeopleSearchQuery = z.object({ q: z.string().trim().min(2).max(80).meta({ description: "Part of a name, accents ignored." }) });
export const PeopleSearch = z.object({ people: z.array(Card) }).meta({ id: "PeopleSearch", description: "People at your event whose name matches, by name." });

export const Interest = z.object({ id: z.int(), slug: z.string(), name: z.string() }).meta({ id: "Interest" });
export const InterestList = z.array(Interest);

export const Relationship = z
  .object({ reconnections: z.int(), eventsTogether: z.int(), mutual: z.array(Card) })
  .meta({ id: "Relationship", description: "The viewer and this person: how often they met and whom they both know." });

export const LastInteraction = z
  .object({ connectionId: uuid, title: z.string(), topics: z.array(z.string()), at: isoDate })
  .meta({ id: "LastInteraction" });

export const UserProfile = z
  .object({
    card: Card,
    connection: z
      .object({ status: ConnectionStatusForMe, kind: ConnectionKind.optional(), eventSlug })
      .optional()
      .meta({ description: "Your relation with this person at their current event, if any." }),
    scores: Scores.optional(),
    stats: ProfileStats.optional(),
    badges: z.array(BadgeId).optional(),
    relationship: Relationship.optional(),
    lastInteraction: LastInteraction.nullable().optional(),
  })
  .meta({ id: "UserProfile" });

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const PatchMeBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    photoUrl: z.url().max(500).nullable().optional(),
    headline: optionalText(120),
    company: optionalText(80),
    city: optionalText(80),
    avatar: Avatar.optional(),
    avatarMode: AvatarMode.optional(),
    links: z
      .partialRecord(LinkKey, z.string().trim().max(200))
      .optional()
      .meta({ description: "A handle (`@user`), for WhatsApp a phone number with country code, or a URL of that network; an empty string removes the link. A value that fails these rules returns 400." }),
    interestIds: z.array(z.int().positive()).max(10).optional(),
  })
  .meta({ id: "PatchMeBody" });

export const PatchVisibilityBody = z
  .object({
    headline: Visibility.optional(),
    company: Visibility.optional(),
    interests: Visibility.optional(),
    links: z.partialRecord(LinkKey, Visibility).optional(),
  })
  .meta({ id: "PatchVisibilityBody" });

export const Event = z
  .object({ slug: eventSlug, name: z.string(), startsAt: isoDate, endsAt: isoDate, isRunning: z.boolean() })
  .meta({ id: "Event" });

export const CreateEventFields = z.object({ name: z.string().trim().min(1).max(120), slug: eventSlug, startsAt: isoDate, endsAt: isoDate });

export const CreateEventBody = CreateEventFields
  .refine((body) => Date.parse(body.endsAt) > Date.parse(body.startsAt), {
    path: ["endsAt"],
    message: "endsAt must be after startsAt",
  })
  .meta({ id: "CreateEventBody" });

export const EventAccess = z
  .object({ accessCode, joinUrl: z.url().meta({ description: "What the event QR encodes: `<site>/e/<accessCode>`." }) })
  .meta({ id: "EventAccess" });

export const CreatedEvent = z.object({ event: Event.extend({ id: uuid }).extend(EventAccess.shape) }).meta({ id: "CreatedEvent" });

export const RotatedCode = EventAccess.extend({ slug: eventSlug }).meta({ id: "RotatedCode" });

// The event door (/e/<code>): no slug, nothing beyond what the projected screen already shows.
export const EventDoor = z
  .object({
    code: accessCode,
    name: z.string(),
    startsAt: isoDate,
    endsAt: isoDate,
    isRunning: z.boolean(),
    phase: z.enum(["upcoming", "running", "ended"]).meta({ description: "Where now falls in the event window." }),
    counters: z.object({ checkedIn: z.int(), connections: z.int() }),
  })
  .meta({ id: "EventDoor" });

export const CheckInBody = z.object({ screenConsent: z.literal(true) }).meta({ id: "CheckInBody" });
export const CheckIn = z
  .object({ event: CurrentEvent, checkedInAt: isoDate, alreadyCheckedIn: z.boolean() })
  .meta({ id: "CheckIn" });

const Topic = z.enum(TOPICS);

export const CreateConnectionBody = z
  .object({
    toHandle: handle,
    knew: z.boolean().optional(),
    screenConsent: z.literal(true).optional(),
    // Free labels from the chips on the register screen; the summary vocabulary (lib/topics.ts) is a separate list.
    topics: z.array(z.string().trim().min(1).max(40)).max(3).optional().meta({ description: "What they talked about, picked by the scanner (+5)." }),
  })
  .meta({ id: "CreateConnectionBody" });

export const ConnectionRequest = z
  .object({ connectionId: uuid, status: ConnectionStatusForMe, event: EventRef, to: Card })
  .meta({ id: "ConnectionRequest" });

export const KnewBody = z.object({ knew: z.boolean() }).meta({ id: "KnewBody" });
export const KnewResult = z.object({ connectionId: uuid, knew: z.boolean() }).meta({ id: "KnewResult" });

export const AcceptBody = z.object({ knew: z.boolean().optional() }).meta({ id: "AcceptBody" });
export const Accepted = z
  .object({ connectionId: uuid, kind: ConnectionKind, points: z.int(), from: Card })
  .meta({ id: "Accepted" });

export const IncomingRequest = z
  .object({ connectionId: uuid, from: Card, event: EventRef, createdAt: isoDate })
  .meta({ id: "IncomingRequest" });

export const Meeting = z
  .object({
    connectionId: uuid,
    event: EventRef,
    status: ConnectionStatusForMe,
    direction: z.enum(["sent", "received"]),
    kind: ConnectionKind.optional(),
    points: z.int().optional(),
    at: isoDate,
  })
  .meta({ id: "Meeting" });

// "friend" is derived: three or more reconnections with the same person (V2Conexiones filter).
export const PersonType = z.enum(["new", "reconnection", "friend"]).meta({ id: "PersonType" });

export const PersonHistory = z
  .object({
    person: Card,
    meetings: z.array(Meeting),
    lastMetAt: isoDate,
    totalPoints: z.int(),
    type: PersonType.optional(),
    topics: z.array(z.string()).optional(),
  })
  .meta({ id: "PersonHistory" });

export const PointsBreakdown = z
  .object({ kind: z.int(), topics: z.int(), note: z.int(), total: z.int() })
  .meta({ id: "PointsBreakdown" });

export const InteractionSummary = z
  .object({
    id: uuid,
    title: z.string(),
    summary: z.string(),
    bullets: z.array(z.string()),
    topics: z.array(z.string()),
    pendingAction: z.string().nullable(),
    durationSec: z.int().nullable(),
    approvedAt: isoDate.nullable(),
  })
  .meta({ id: "InteractionSummary" });

export const ConnectionDetail = z
  .object({
    connectionId: uuid,
    status: ConnectionStatusForMe,
    kind: ConnectionKind.optional(),
    direction: z.enum(["sent", "received"]),
    event: EventRef,
    other: Card,
    topics: z.array(z.string()),
    points: PointsBreakdown,
    interaction: InteractionSummary.nullable(),
    at: isoDate,
  })
  .meta({ id: "ConnectionDetail" });

export const BadgeProgress = z.object({ current: z.int(), total: z.int(), label: z.string() }).meta({ id: "BadgeProgress" });

export const BadgeStatus = z
  .object({
    id: BadgeId,
    earnedAt: isoDate.nullable(),
    earnedNote: z.string().nullable().meta({ description: "How it was earned, e.g. 'Con Valeria'." }),
    progress: BadgeProgress.nullable(),
  })
  .meta({ id: "BadgeStatus" });

export const BadgeList = z.object({ badges: z.array(BadgeStatus), earned: z.int(), total: z.int() }).meta({ id: "BadgeList" });

export const Invitee = z
  .object({ person: Card, firstConnectionAt: isoDate.nullable(), points: z.int() })
  .meta({ id: "Invitee" });

export const Invites = z
  .object({ code: z.string(), url: z.url(), invitees: z.array(Invitee), target: z.int(), goldenCap: z.boolean() })
  .meta({ id: "Invites" });

export const ClaimedInvite = z.object({ code: z.string(), inviter: Card }).meta({ id: "ClaimedInvite" });

export const ConnectionList = z
  .object({
    incoming: z.array(IncomingRequest),
    people: z.array(PersonHistory),
    totals: z.object({ points: z.int(), connections: z.int(), people: z.int() }),
  })
  .meta({ id: "ConnectionList" });

export const Notification = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("request"), createdAt: isoDate, unseen: z.boolean(), connectionId: uuid, person: Card, eventName: z.string() }),
  z.object({ id: z.string(), kind: z.literal("accepted"), createdAt: isoDate, unseen: z.boolean(), connectionId: uuid, person: Card, eventName: z.string() }),
  z.object({ id: z.string(), kind: z.literal("invitee_connected"), createdAt: isoDate, unseen: z.boolean(), person: Card }),
  z.object({ id: z.string(), kind: z.literal("badge_earned"), createdAt: isoDate, unseen: z.boolean(), badgeId: BadgeId, badgeName: z.string() }),
]).meta({ id: "Notification" });

export const Notifications = z
  .object({ notifications: z.array(Notification), unseenCount: z.int() })
  .meta({ id: "Notifications" });
export const NotificationsSeenBody = z.object({ seenThrough: isoDate }).meta({ id: "NotificationsSeenBody" });

// The browser's PushSubscription.toJSON() (W3C Push API); the endpoint must belong to a browser push service.
const pushKey = z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+=*$/);
export const PushSubscriptionBody = z
  .object({
    endpoint: z.url().max(2048),
    keys: z.object({ p256dh: pushKey, auth: pushKey }),
    locale: z.enum(LOCALES).optional().meta({ description: "Language of the pushed text; defaults to English." }),
  })
  .meta({ id: "PushSubscriptionBody" });
export const PushUnsubscribeBody = z.object({ endpoint: z.url().max(2048) }).meta({ id: "PushUnsubscribeBody" });

// `connections` is the person's accepted count at the event; the `connections` list below holds only the most recent links.
const LivePerson = z.object({ id: uuid, name: z.string(), photoUrl: z.string().nullable(), points: z.int(), connections: z.int() });
const LiveConnection = z.object({ id: uuid, a: uuid, b: uuid, kind: ConnectionKind, at: isoDate });

export const LiveSnapshot = z
  .object({
    event: z.object({ code: accessCode, name: z.string(), isRunning: z.boolean() }),
    people: z.array(LivePerson),
    connections: z.array(LiveConnection),
    counters: z.object({
      checkedIn: z.int(),
      connections: z.int(),
      newCount: z.int(),
      reconnections: z.int(),
    }),
    generatedAt: isoDate,
  })
  .meta({ id: "LiveSnapshot" });

export const LivePersonCard = z
  .object({ card: Card, points: z.int(), connections: z.int(), rank: z.int() })
  .meta({ id: "LivePersonCard" });

export const LeaderboardRow = z
  .object({
    rank: z.int(),
    userId: uuid,
    handle,
    name: z.string(),
    photoUrl: z.string().nullable(),
    points: z.int(),
    connections: z.int(),
  })
  .meta({ id: "LeaderboardRow" });
export const LeaderboardMe = z
  .object({
    rank: z.int().nullable(),
    points: z.int(),
    above: LeaderboardRow.nullable(),
    gap: z.int().meta({ description: "Points needed to pass the row above; 0 when first." }),
    tip: z.string().nullable(),
  })
  .meta({ id: "LeaderboardMe" });
export const Leaderboard = z.object({ rows: z.array(LeaderboardRow), me: LeaderboardMe.optional() }).meta({ id: "Leaderboard" });
export const LeaderboardScope = z.enum(["event", "lifetime"]).meta({ id: "LeaderboardScope" });
export const LeaderboardQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  scope: LeaderboardScope.default("event"),
});

export const TranscribeBody = z
  .object({ audio: z.string().meta({ format: "binary", description: "webm, mp4, m4a, mpeg or wav; up to 15 MB" }) })
  .meta({ id: "TranscribeBody" });
export const Transcript = z.object({ text: z.string() }).meta({ id: "Transcript" });

export const DraftBody = z
  .object({ connectionId: uuid, text: z.string().trim().min(1).max(4000) })
  .meta({ id: "DraftBody" });
export const Draft = z
  .object({
    interactionId: uuid,
    summary: z.string(),
    topics: z.array(Topic).max(4),
    nextSteps: z.array(z.string()).max(3),
    substantive: z.boolean(),
    fallback: z.boolean(),
    title: z.string().optional().meta({ description: "One-line title (V2NotaVoz)." }),
    pendingAction: z.string().nullable().optional().meta({ description: "A follow-up the AI detected, e.g. an introduction to make." }),
  })
  .meta({ id: "Draft" });

export const ApproveBody = z
  .object({
    summary: z.string().trim().min(1).max(1200),
    topics: z.array(Topic).max(4),
    nextSteps: z.array(z.string().trim().min(1).max(200)).max(3),
    title: z.string().trim().max(120).optional(),
    pendingAction: z.string().trim().max(200).nullable().optional(),
  })
  .meta({ id: "ApproveBody" });
export const Approved = z
  .object({
    interaction: z.object({
      id: uuid,
      connectionId: uuid,
      summary: z.string(),
      topics: z.array(Topic),
      nextSteps: z.array(z.string()),
      points: z.int(),
      approvedAt: isoDate,
    }),
    pointsAwarded: z.int(),
  })
  .meta({ id: "Approved" });

export const SlugParams = z.object({ slug: eventSlug });
export const HandleParams = z.object({ handle });
export const IdParams = z.object({ id: uuid });
// Any string reaches the handler, so a malformed code gets the same 404 as an unknown one (A10).
const codeParam = z.string().min(1).max(64).meta({ description: "Event access code from the event QR." });
export const EventCodeParams = z.object({ code: codeParam });
export const LivePersonParams = z.object({ code: codeParam, userId: uuid });
export const CodeParams = z.object({ code: z.string().regex(/^[a-z0-9-]{2,40}$/) });
export const NextQuery = z.object({
  next: z.string().optional().meta({ description: "Relative path to return to, e.g. `/u/luis` or `/e/k7m2p9xq4t/join`." }),
});
export const EmailSignInBody = NextQuery.extend({
  email: z.email().max(254).meta({ description: "Where the one-time sign-in link goes." }),
});
export const CallbackQuery = NextQuery.extend({ code: z.string().optional(), error: z.string().optional() });

export const ErrorFields = z.record(z.string(), z.array(z.string()));

export type CardT = z.infer<typeof Card>;
export type MeT = z.infer<typeof Me>;
export type UserProfileT = z.infer<typeof UserProfile>;
export type ConnectionListT = z.infer<typeof ConnectionList>;
export type NotificationT = z.infer<typeof Notification>;
export type NotificationsT = z.infer<typeof Notifications>;
export type PushSubscriptionBodyT = z.infer<typeof PushSubscriptionBody>;
export type PersonHistoryT = z.infer<typeof PersonHistory>;
export type ConnectionDetailT = z.infer<typeof ConnectionDetail>;
export type LeaderboardT = z.infer<typeof Leaderboard>;
export type LeaderboardScopeT = z.infer<typeof LeaderboardScope>;
export type BadgeListT = z.infer<typeof BadgeList>;
export type BadgeStatusT = z.infer<typeof BadgeStatus>;
export type InvitesT = z.infer<typeof Invites>;
export type LiveSnapshotT = z.infer<typeof LiveSnapshot>;
export type LivePersonCardT = z.infer<typeof LivePersonCard>;
export type EventDoorT = z.infer<typeof EventDoor>;
export type DraftT = z.infer<typeof Draft>;
export type VisibilitySettingsT = z.infer<typeof VisibilitySettings>;
export type ConnectionStatusForMeT = z.infer<typeof ConnectionStatusForMe>;
export type ConnectionKindT = z.infer<typeof ConnectionKind>;
export type AvatarModeT = z.infer<typeof AvatarMode>;
