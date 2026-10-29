// Registry of every API route (API spec §5, summaries contract). The OpenAPI document, mock mode and
// the route handlers all read these specs, so a route's contract lives in exactly one place.
import * as X from "./examples";
import { E } from "./errors";
import { NoBody, route, type AnyRouteSpec } from "./route-spec";
import * as S from "./schemas";

const WITH_USER = [E.unauthorized] as const;

export const authLinkedin = route({
  id: "authLinkedin",
  method: "get",
  path: "/auth/linkedin",
  summary: "Start LinkedIn sign-in",
  description: "Redirects to LinkedIn (Supabase `linkedin_oidc`). `next` must be a same-site path.",
  tags: ["auth"],
  auth: "public",
  query: S.NextQuery,
  success: { status: 302, description: "Redirect to LinkedIn.", redirect: "/auth/callback?code=mock&next=/me" },
  errors: [],
});

export const authCallback = route({
  id: "authCallback",
  method: "get",
  path: "/auth/callback",
  summary: "Finish sign-in",
  description:
    "Exchanges the code for a session, creates the user (unique handle) or syncs name and photo unless edited (M14), then redirects to `next` or `/me`. Failure redirects to `/?error=signin`.",
  tags: ["auth"],
  auth: "public",
  query: S.CallbackQuery,
  success: { status: 302, description: "Redirect to `next`, `/me`, or `/?error=signin`.", redirect: "/me" },
  errors: [],
});

export const authEmail = route({
  id: "authEmail",
  method: "post",
  path: "/api/auth/email",
  summary: "Send an email sign-in link",
  description:
    "Emails a one-time link (Supabase magic link) that creates the account or signs in, then lands on `/auth/callback` like LinkedIn. `next` must be a same-site path.",
  tags: ["auth"],
  auth: "public",
  body: S.EmailSignInBody,
  bodyExample: { email: "luis@example.com", next: "/onboarding/profile" },
  success: { status: 204, description: "Link sent.", schema: NoBody },
  errors: [E.invalidInput, E.internal],
});

export const signOut = route({
  id: "signOut",
  method: "post",
  path: "/api/auth/signout",
  summary: "Sign out",
  tags: ["auth"],
  auth: "user",
  success: { status: 204, description: "Signed out.", schema: NoBody },
  errors: WITH_USER,
});

export const getMe = route({
  id: "getMe",
  method: "get",
  path: "/api/me",
  summary: "My profile",
  tags: ["profile"],
  auth: "user",
  success: {
    status: 200,
    description: "The signed-in person.",
    schema: S.Me,
    example: X.me,
    examples: { empty: { summary: "First night, no connections yet", value: X.meEmpty } },
  },
  errors: WITH_USER,
});

export const patchMe = route({
  id: "patchMe",
  method: "patch",
  path: "/api/me",
  summary: "Edit my profile",
  description: "Setting `name` or `photoUrl` stops LinkedIn from overwriting it (M14). `interestIds` replaces the list.",
  tags: ["profile"],
  auth: "user",
  body: S.PatchMeBody,
  bodyExample: { headline: "Cofounder", company: "Kuali", city: "Guadalajara, Jalisco", links: { instagram: "@diego.rmz" } },
  success: { status: 200, description: "The updated profile.", schema: S.Me, example: X.me },
  errors: [E.invalidInput, E.unauthorized],
});

export const patchVisibility = route({
  id: "patchVisibility",
  method: "patch",
  path: "/api/me/visibility",
  summary: "Change who sees each field",
  description: "Shallow merge; links are set one by one (M12). Name and photo are always public; email is never shown.",
  tags: ["profile"],
  auth: "user",
  body: S.PatchVisibilityBody,
  bodyExample: { company: "connections", links: { x: "hidden" } },
  success: { status: 200, description: "The full visibility settings.", schema: S.VisibilitySettings, example: X.me.visibility },
  errors: [E.invalidInput, E.unauthorized],
});

export const listInterests = route({
  id: "listInterests",
  method: "get",
  path: "/api/interests",
  summary: "All interests",
  tags: ["profile"],
  auth: "public",
  success: { status: 200, description: "The global interest list (M15).", schema: S.InterestList, example: X.interests },
  errors: [],
});

export const getUser = route({
  id: "getUser",
  method: "get",
  path: "/api/users/{handle}",
  summary: "A person's card (personal QR)",
  description: "The card is filtered for you (visibility, API spec §6). `connection` is your relation at their current event.",
  tags: ["profile"],
  auth: "user",
  params: S.HandleParams,
  success: {
    status: 200,
    description: "The card as you may see it.",
    schema: S.UserProfile,
    example: X.valeriaProfile,
    examples: { stranger: { summary: "No connection yet", value: { card: X.valeriaPublic } } },
  },
  errors: [E.unauthorized, E.userNotFound],
});

export const createEvent = route({
  id: "createEvent",
  method: "post",
  path: "/api/admin/events",
  summary: "Create an event (admins)",
  tags: ["events"],
  auth: "admin",
  body: S.CreateEventBody,
  bodyExample: { name: X.event.name, slug: X.event.slug, startsAt: X.event.startsAt, endsAt: X.event.endsAt },
  success: {
    status: 201,
    description: "Created, with the access code and the join URL to print in the event QR (M19).",
    schema: S.CreatedEvent,
    example: { event: { ...X.event, id: X.ids.event, accessCode: X.accessCode, joinUrl: X.joinUrl } },
  },
  errors: [E.invalidInput, E.unauthorized, E.notAdmin, E.slugTaken],
});

export const rotateEventCode = route({
  id: "rotateEventCode",
  method: "post",
  path: "/api/admin/events/{slug}/rotate-code",
  summary: "Rotate an event's access code (admins)",
  description: "Issues a new code; the old QR, door and live links stop working at once (A10). Check-ins are kept.",
  tags: ["events"],
  auth: "admin",
  params: S.SlugParams,
  success: {
    status: 200,
    description: "The new code and join URL.",
    schema: S.RotatedCode,
    example: { slug: X.founders.slug, accessCode: "w3nq8r5tzc", joinUrl: "https://compa.lol/e/w3nq8r5tzc" },
  },
  errors: [E.unauthorized, E.notAdmin, E.eventNotFound],
});

const CODE_GATED = "Public, but only with the access code from the event QR (A10). A malformed, unknown or rotated code returns the same 404.";

export const getEvent = route({
  id: "getEvent",
  method: "get",
  path: "/api/e/{code}",
  summary: "Event door (event QR)",
  description: `${CODE_GATED} Name, window and the two counters the door shows.`,
  tags: ["events"],
  auth: "public",
  params: S.EventCodeParams,
  success: { status: 200, description: "The event.", schema: S.EventDoor, example: X.eventDoor },
  errors: [E.eventNotFound],
});

export const checkIn = route({
  id: "checkIn",
  method: "post",
  path: "/api/e/{code}/check-in",
  summary: "Check in to an event (event QR)",
  description: "Repeat-safe. `screenConsent: true` records that the person saw the big-screen notice (M13). Unknown code: 404 (A10).",
  tags: ["events"],
  auth: "user",
  params: S.EventCodeParams,
  body: S.CheckInBody,
  bodyExample: { screenConsent: true },
  success: {
    status: 201,
    description: "Checked in.",
    alsoStatus: { status: 200, description: "Already checked in." },
    schema: S.CheckIn,
    example: { event: X.foundersDoor, checkedInAt: "2026-10-29T17:02:31.000Z", alreadyCheckedIn: false },
  },
  errors: [E.invalidInput, E.unauthorized, E.eventNotFound, E.eventNotRunning],
});

export const createConnection = route({
  id: "createConnection",
  method: "post",
  path: "/api/connections",
  summary: "Request a connection (scan a personal QR)",
  description:
    "Checks you in to the person's current event if needed (A1, needs `screenConsent: true`), then creates a pending request. If the pair already has a connection at that event, returns it with 200.",
  tags: ["connections"],
  auth: "user",
  body: S.CreateConnectionBody,
  bodyExample: { toHandle: "valeria-ochoa", knew: true, screenConsent: true, topics: ["Levantar capital", "Proptech"] },
  success: {
    status: 201,
    description: "Request sent.",
    alsoStatus: { status: 200, description: "The pair already has a connection at this event." },
    schema: S.ConnectionRequest,
    example: { connectionId: X.ids.connection, status: "pending", event: X.founders, to: X.valeriaPublic },
  },
  errors: [E.invalidInput, E.unauthorized, E.userNotFound, E.selfConnection, E.notAtEvent, E.consentRequired],
});

export const listConnections = route({
  id: "listConnections",
  method: "get",
  path: "/api/connections",
  summary: "My connections, grouped by person",
  description: "`incoming` holds requests waiting for your answer (A7). Your sent requests never show `declined` (§7.4).",
  tags: ["connections"],
  auth: "user",
  success: { status: 200, description: "Requests and history.", schema: S.ConnectionList, example: X.connectionList },
  errors: WITH_USER,
});

export const setKnew = route({
  id: "setKnew",
  method: "patch",
  path: "/api/connections/{id}/knew",
  summary: "Requester: we already knew each other",
  tags: ["connections"],
  auth: "user",
  params: S.IdParams,
  body: S.KnewBody,
  bodyExample: { knew: true },
  success: { status: 200, description: "Saved.", schema: S.KnewResult, example: { connectionId: X.ids.connection, knew: true } },
  errors: [E.invalidInput, E.unauthorized, E.forbidden, E.connectionNotFound, E.notPending],
});

export const acceptConnection = route({
  id: "acceptConnection",
  method: "post",
  path: "/api/connections/{id}/accept",
  summary: "Addressee: accept a request",
  description:
    "`reconnection` (+20) when the pair connected at an earlier event or either person ticked `knew`; otherwise `new` (+50), to both (design handoff points table).",
  tags: ["connections"],
  auth: "user",
  params: S.IdParams,
  body: S.AcceptBody,
  bodyExample: { knew: false },
  success: {
    status: 200,
    description: "Connected.",
    schema: S.Accepted,
    example: { connectionId: X.ids.connection, kind: "new", points: 50, from: X.valeriaConnected },
    examples: {
      reconnection: {
        summary: "They met at an earlier event",
        value: { connectionId: X.ids.connection, kind: "reconnection", points: 20, from: X.valeriaConnected },
      },
    },
  },
  errors: [E.invalidInput, E.unauthorized, E.forbidden, E.connectionNotFound, E.notPending, E.eventEnded],
});

export const declineConnection = route({
  id: "declineConnection",
  method: "post",
  path: "/api/connections/{id}/decline",
  summary: "Addressee: decline a request (silent)",
  tags: ["connections"],
  auth: "user",
  params: S.IdParams,
  success: { status: 204, description: "Declined. The requester keeps seeing pending until the event ends.", schema: NoBody },
  errors: [E.unauthorized, E.forbidden, E.connectionNotFound, E.notPending, E.eventEnded],
});

export const liveSnapshot = route({
  id: "liveSnapshot",
  method: "get",
  path: "/api/e/{code}/live",
  summary: "Big screen snapshot",
  description: `${CODE_GATED} Accepted connections only; cached for at most 1 s (A6).`,
  tags: ["live"],
  auth: "public",
  params: S.EventCodeParams,
  success: { status: 200, description: "Snapshot.", schema: S.LiveSnapshot, example: X.liveSnapshot },
  errors: [E.eventNotFound],
});

export const livePerson = route({
  id: "livePerson",
  method: "get",
  path: "/api/e/{code}/live/people/{userId}",
  summary: "Big screen person card",
  description: `${CODE_GATED} Public fields only; the viewer is anonymous (A5).`,
  tags: ["live"],
  auth: "public",
  params: S.LivePersonParams,
  success: {
    status: 200,
    description: "Card with event points, connection count and rank.",
    schema: S.LivePersonCard,
    example: { card: X.valeriaPublic, points: 1980, connections: 24, rank: 1 },
  },
  errors: [E.eventNotFound, E.attendeeNotFound],
});

export const leaderboard = route({
  id: "leaderboard",
  method: "get",
  path: "/api/e/{code}/leaderboard",
  summary: "Event leaderboard",
  description: `${CODE_GATED} Ordered by points, then connections, then earliest check-in.`,
  tags: ["live"],
  auth: "public",
  params: S.EventCodeParams,
  query: S.LeaderboardQuery,
  success: {
    status: 200,
    description: "Ranked rows, plus `me` when signed in (V2Ranking).",
    schema: S.Leaderboard,
    example: X.leaderboard,
    examples: { lifetime: { summary: "scope=lifetime: all events", value: X.leaderboardLifetime } },
  },
  errors: [E.invalidInput, E.eventNotFound],
});

export const transcribe = route({
  id: "transcribe",
  method: "post",
  path: "/api/transcribe",
  summary: "Transcribe a voice note (Spanish)",
  description: "`multipart/form-data` with one `audio` file. The audio stays in memory and is never stored.",
  tags: ["summaries"],
  auth: "user",
  body: S.TranscribeBody,
  bodyKind: "multipart",
  success: {
    status: 200,
    description: "The transcript.",
    schema: S.Transcript,
    example: { text: "Hablé con Mateo sobre cómo migrar el panel de Vue a React y quedamos en compartir el repo." },
  },
  errors: [E.invalidAudio, E.unauthorized, E.transcriptionFailed],
});

export const draftSummary = route({
  id: "draftSummary",
  method: "post",
  path: "/api/interactions/draft",
  summary: "Draft a summary of a conversation",
  description: "Only members of an accepted connection. `fallback: true` means the AI failed and the summary is your own text.",
  tags: ["summaries"],
  auth: "user",
  body: S.DraftBody,
  bodyExample: { connectionId: X.ids.connection, text: "Valeria está cerrando su serie A y quiere que la presente con Andrea." },
  success: {
    status: 201,
    description: "A new editable draft.",
    schema: S.Draft,
    example: X.draft,
    examples: {
      fallback: {
        summary: "The AI failed; the text is kept verbatim",
        value: { ...X.draft, summary: "Valeria está cerrando su serie A y quiere que la presente con Andrea.", topics: [], nextSteps: [], fallback: true },
      },
      notSubstantive: {
        summary: "The note does not describe a conversation",
        value: { ...X.draft, summary: "", topics: [], nextSteps: [], substantive: false },
      },
    },
  },
  errors: [E.invalidInput, E.unauthorized, E.notFound, E.connectionNotAccepted, E.summaryFailed],
});

export const approveSummary = route({
  id: "approveSummary",
  method: "post",
  path: "/api/interactions/{id}/approve",
  summary: "Approve a summary (+15 to the author)",
  description: "Only the draft's author. One approved summary per connection; replay returns 409 (M18).",
  tags: ["summaries"],
  auth: "user",
  params: S.IdParams,
  body: S.ApproveBody,
  bodyExample: X.approveBody,
  success: {
    status: 200,
    description: "Approved.",
    schema: S.Approved,
    example: {
      interaction: {
        id: X.ids.interaction,
        connectionId: X.ids.connection,
        ...X.approveBody,
        points: 15,
        approvedAt: "2026-10-29T18:20:00.000Z",
      },
      pointsAwarded: 15,
    },
  },
  errors: [E.invalidInput, E.unauthorized, E.notAuthor, E.notFound, E.notSubstantive, E.alreadyApproved],
});

export const getConnection = route({
  id: "getConnection",
  method: "get",
  path: "/api/connections/{id}",
  summary: "One connection as I see it",
  description: "Points breakdown, topics and the voice-note summary (V2Confirmacion, V2Solicitud, V2NotaVoz). Members only.",
  tags: ["connections"],
  auth: "user",
  params: S.IdParams,
  success: {
    status: 200,
    description: "The connection.",
    schema: S.ConnectionDetail,
    example: X.connectionDetail,
    examples: { incoming: { summary: "A pending request someone sent me", value: X.incomingDetail } },
  },
  errors: [E.unauthorized, E.connectionNotFound],
});

export const listBadges = route({
  id: "listBadges",
  method: "get",
  path: "/api/badges",
  summary: "My badges",
  description: "The 20 badges with earned date or progress; secret ones carry no progress (V2Insignias).",
  tags: ["profile"],
  auth: "user",
  success: { status: 200, description: "Catalog with my status.", schema: S.BadgeList, example: X.badgeList },
  errors: WITH_USER,
});

export const myInvites = route({
  id: "myInvites",
  method: "get",
  path: "/api/invites/me",
  summary: "My invite link and invitees",
  tags: ["profile"],
  auth: "user",
  success: { status: 200, description: "Code, link and progress to the golden cap.", schema: S.Invites, example: X.invites },
  errors: WITH_USER,
});

export const claimInvite = route({
  id: "claimInvite",
  method: "post",
  path: "/api/invites/{code}/claim",
  summary: "Join through a friend's invite",
  description: "Called once after sign-in; the inviter earns +100 and you +50 when your first connection is accepted.",
  tags: ["profile"],
  auth: "user",
  params: S.CodeParams,
  success: { status: 200, description: "Linked to the inviter.", schema: S.ClaimedInvite, example: { code: X.invites.code, inviter: X.diego } },
  errors: [E.unauthorized, E.notFound],
});

export const ROUTES: readonly AnyRouteSpec[] = [
  authLinkedin,
  authCallback,
  authEmail,
  signOut,
  getMe,
  patchMe,
  patchVisibility,
  listInterests,
  getUser,
  createEvent,
  rotateEventCode,
  getEvent,
  checkIn,
  createConnection,
  listConnections,
  setKnew,
  acceptConnection,
  declineConnection,
  liveSnapshot,
  livePerson,
  leaderboard,
  transcribe,
  draftSummary,
  approveSummary,
  getConnection,
  listBadges,
  myInvites,
  claimInvite,
];
