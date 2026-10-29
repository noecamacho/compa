// Every request, response and error shape of the COMPA API, defined once (API spec §4–§5).
// Types are inferred from these schemas; lib/api/routes.ts wires them into the OpenAPI document.
import "zod-openapi";
import { z } from "zod";
import { LINK_KEYS, VISIBILITY_LEVELS } from "../profile-fields";
import { TOPICS } from "../topics";

const uuid = z.uuid();
const isoDate = z.iso.datetime({ offset: true });
const handle = z.string().regex(/^[a-z0-9-]{2,32}$/);
const eventSlug = z.string().regex(/^[a-z0-9-]{2,48}$/);

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
      web: Visibility,
    }),
  })
  .meta({ id: "VisibilitySettings" });

export const EventRef = z.object({ slug: eventSlug, name: z.string() }).meta({ id: "EventRef" });

export const Card = z
  .object({
    id: uuid,
    handle,
    name: z.string(),
    photoUrl: z.string().nullable(),
    headline: z.string().optional(),
    company: z.string().optional(),
    interests: z.array(z.string()).optional(),
    links: Links.optional(),
  })
  .meta({ id: "Card", description: "Another person as the viewer may see them (visibility filter, API spec §6)." });

export const Me = Card.extend({
  email: z.string().nullable(),
  visibility: VisibilitySettings,
  nameEdited: z.boolean(),
  photoEdited: z.boolean(),
  isAdmin: z.boolean(),
  currentEvent: EventRef.nullable(),
}).meta({ id: "Me" });

export const Interest = z.object({ id: z.int(), slug: z.string(), name: z.string() }).meta({ id: "Interest" });
export const InterestList = z.array(Interest);

export const UserProfile = z
  .object({
    card: Card,
    connection: z
      .object({ status: ConnectionStatusForMe, kind: ConnectionKind.optional(), eventSlug })
      .optional()
      .meta({ description: "Your relation with this person at their current event, if any." }),
  })
  .meta({ id: "UserProfile" });

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const PatchMeBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    photoUrl: z.url().max(500).nullable().optional(),
    headline: optionalText(120),
    company: optionalText(80),
    links: z
      .partialRecord(LinkKey, z.string().trim().max(200))
      .optional()
      .meta({ description: "`@user` or a URL; an empty string removes the link." }),
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

export const CreateEventBody = z
  .object({ name: z.string().trim().min(1).max(120), slug: eventSlug, startsAt: isoDate, endsAt: isoDate })
  .refine((body) => Date.parse(body.endsAt) > Date.parse(body.startsAt), {
    path: ["endsAt"],
    message: "endsAt must be after startsAt",
  })
  .meta({ id: "CreateEventBody" });

export const CreatedEvent = z.object({ event: Event.extend({ id: uuid }) }).meta({ id: "CreatedEvent" });

export const CheckInBody = z.object({ screenConsent: z.literal(true) }).meta({ id: "CheckInBody" });
export const CheckIn = z
  .object({ event: EventRef, checkedInAt: isoDate, alreadyCheckedIn: z.boolean() })
  .meta({ id: "CheckIn" });

export const CreateConnectionBody = z
  .object({
    toHandle: handle,
    knew: z.boolean().optional(),
    screenConsent: z.literal(true).optional(),
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

export const PersonHistory = z
  .object({ person: Card, meetings: z.array(Meeting), lastMetAt: isoDate, totalPoints: z.int() })
  .meta({ id: "PersonHistory" });

export const ConnectionList = z
  .object({
    incoming: z.array(IncomingRequest),
    people: z.array(PersonHistory),
    totals: z.object({ points: z.int(), connections: z.int(), people: z.int() }),
  })
  .meta({ id: "ConnectionList" });

const LivePerson = z.object({ id: uuid, name: z.string(), photoUrl: z.string().nullable(), points: z.int() });
const LiveConnection = z.object({ id: uuid, a: uuid, b: uuid, kind: ConnectionKind, at: isoDate });

export const LiveSnapshot = z
  .object({
    event: z.object({ slug: eventSlug, name: z.string(), isRunning: z.boolean() }),
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
    name: z.string(),
    photoUrl: z.string().nullable(),
    points: z.int(),
    connections: z.int(),
  })
  .meta({ id: "LeaderboardRow" });
export const Leaderboard = z.object({ rows: z.array(LeaderboardRow) }).meta({ id: "Leaderboard" });
export const LeaderboardQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) });

export const TranscribeBody = z
  .object({ audio: z.string().meta({ format: "binary", description: "webm, mp4, m4a, mpeg or wav; up to 15 MB" }) })
  .meta({ id: "TranscribeBody" });
export const Transcript = z.object({ text: z.string() }).meta({ id: "Transcript" });

const Topic = z.enum(TOPICS);

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
  })
  .meta({ id: "Draft" });

export const ApproveBody = z
  .object({
    summary: z.string().trim().min(1).max(1200),
    topics: z.array(Topic).max(4),
    nextSteps: z.array(z.string().trim().min(1).max(200)).max(3),
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
  })
  .meta({ id: "Approved" });

export const SlugParams = z.object({ slug: eventSlug });
export const HandleParams = z.object({ handle });
export const IdParams = z.object({ id: uuid });
export const LivePersonParams = z.object({ slug: eventSlug, userId: uuid });
export const NextQuery = z.object({
  next: z.string().optional().meta({ description: "Relative path to return to, e.g. `/u/luis` or `/e/founders-fest`." }),
});
export const CallbackQuery = NextQuery.extend({ code: z.string().optional(), error: z.string().optional() });

export const ErrorFields = z.record(z.string(), z.array(z.string()));

export type CardT = z.infer<typeof Card>;
export type MeT = z.infer<typeof Me>;
export type ConnectionStatusForMeT = z.infer<typeof ConnectionStatusForMe>;
export type ConnectionKindT = z.infer<typeof ConnectionKind>;
