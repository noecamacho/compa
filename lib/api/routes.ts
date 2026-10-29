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
  summary: "Finish LinkedIn sign-in",
  description:
    "Exchanges the code for a session, creates the user (unique handle) or syncs name and photo unless edited (M14), then redirects to `next` or `/me`. Failure redirects to `/?error=linkedin`.",
  tags: ["auth"],
  auth: "public",
  query: S.CallbackQuery,
  success: { status: 302, description: "Redirect to `next`, `/me`, or `/?error=linkedin`.", redirect: "/me" },
  errors: [],
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
  success: { status: 200, description: "The signed-in person.", schema: S.Me, example: X.me },
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
  bodyExample: { headline: "CTO en Tramita", links: { github: "@luciafdz" }, interestIds: [29, 39] },
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
    example: { card: X.mateoConnected, connection: { status: "accepted", kind: "reconnection", eventSlug: X.founders.slug } },
    examples: { stranger: { summary: "No connection yet", value: { card: X.mateoPublic } } },
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
  success: { status: 201, description: "Created.", schema: S.CreatedEvent, example: { event: { ...X.event, id: X.ids.event } } },
  errors: [E.invalidInput, E.unauthorized, E.notAdmin, E.slugTaken],
});

export const getEvent = route({
  id: "getEvent",
  method: "get",
  path: "/api/events/{slug}",
  summary: "Event join page",
  tags: ["events"],
  auth: "public",
  params: S.SlugParams,
  success: { status: 200, description: "The event.", schema: S.Event, example: X.event },
  errors: [E.eventNotFound],
});

export const checkIn = route({
  id: "checkIn",
  method: "post",
  path: "/api/events/{slug}/check-in",
  summary: "Check in to an event (event QR)",
  description: "Repeat-safe. `screenConsent: true` records that the person saw the big-screen notice (M13).",
  tags: ["events"],
  auth: "user",
  params: S.SlugParams,
  body: S.CheckInBody,
  bodyExample: { screenConsent: true },
  success: {
    status: 201,
    description: "Checked in.",
    alsoStatus: { status: 200, description: "Already checked in." },
    schema: S.CheckIn,
    example: { event: X.founders, checkedInAt: "2026-10-29T17:02:31.000Z", alreadyCheckedIn: false },
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
  bodyExample: { toHandle: "mateo-garcia", knew: false, screenConsent: true },
  success: {
    status: 201,
    description: "Request sent.",
    alsoStatus: { status: 200, description: "The pair already has a connection at this event." },
    schema: S.ConnectionRequest,
    example: { connectionId: X.ids.connection, status: "pending", event: X.founders, to: X.mateoPublic },
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
    "`reconnection` (+10) when the pair connected at an earlier event or either person ticked `knew`; otherwise `new` (+20), to both (M3, M4).",
  tags: ["connections"],
  auth: "user",
  params: S.IdParams,
  body: S.AcceptBody,
  bodyExample: { knew: false },
  success: {
    status: 200,
    description: "Connected.",
    schema: S.Accepted,
    example: { connectionId: X.ids.connection, kind: "new", points: 20, from: X.mateoConnected },
    examples: {
      reconnection: {
        summary: "They met at an earlier event",
        value: { connectionId: X.ids.connection, kind: "reconnection", points: 10, from: X.mateoConnected },
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
  path: "/api/events/{slug}/live",
  summary: "Big screen snapshot",
  description: "Public (A6). Accepted connections only; cached for at most 1 s.",
  tags: ["live"],
  auth: "public",
  params: S.SlugParams,
  success: { status: 200, description: "Snapshot.", schema: S.LiveSnapshot, example: X.liveSnapshot },
  errors: [E.eventNotFound],
});

export const livePerson = route({
  id: "livePerson",
  method: "get",
  path: "/api/events/{slug}/live/people/{userId}",
  summary: "Big screen person card",
  description: "Public fields only; the viewer is anonymous (A5).",
  tags: ["live"],
  auth: "public",
  params: S.LivePersonParams,
  success: {
    status: 200,
    description: "Card with event points, connection count and rank.",
    schema: S.LivePersonCard,
    example: { card: X.mateoPublic, points: 30, connections: 2, rank: 2 },
  },
  errors: [E.eventNotFound, E.attendeeNotFound],
});

export const leaderboard = route({
  id: "leaderboard",
  method: "get",
  path: "/api/events/{slug}/leaderboard",
  summary: "Event leaderboard",
  description: "Ordered by points, then connections, then earliest check-in.",
  tags: ["live"],
  auth: "public",
  params: S.SlugParams,
  query: S.LeaderboardQuery,
  success: { status: 200, description: "Ranked rows.", schema: S.Leaderboard, example: X.leaderboard },
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
  bodyExample: { connectionId: X.ids.connection, text: "Hablamos de pasar el panel de Vue a React, me pasa su repo de Next." },
  success: {
    status: 201,
    description: "A new editable draft.",
    schema: S.Draft,
    example: X.draft,
    examples: {
      fallback: {
        summary: "The AI failed; the text is kept verbatim",
        value: { ...X.draft, summary: "Hablamos de pasar el panel de Vue a React, me pasa su repo de Next.", topics: [], nextSteps: [], fallback: true },
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
  summary: "Approve a summary (+25 to both)",
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
        points: 25,
        approvedAt: "2026-10-29T18:20:00.000Z",
      },
    },
  },
  errors: [E.invalidInput, E.unauthorized, E.notAuthor, E.notFound, E.notSubstantive, E.alreadyApproved],
});

export const ROUTES: readonly AnyRouteSpec[] = [
  authLinkedin,
  authCallback,
  signOut,
  getMe,
  patchMe,
  patchVisibility,
  listInterests,
  getUser,
  createEvent,
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
];
