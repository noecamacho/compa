// Registry of every API route (API spec §5, summaries contract). The OpenAPI document, mock mode and
// the route handlers all read these specs, so a route's contract lives in exactly one place.
import * as AX from "./admin-examples";
import * as A from "./admin-schemas";
import * as X from "./examples";
import { E } from "./errors";
import { NoBody, route, type AnyRouteSpec } from "./route-spec";
import * as S from "./schemas";

const WITH_USER = [E.unauthorized] as const;
// Admin routes answer 404 to everyone who is not a super admin, signed in or not (A11).
const ADMIN = "Super admins only; anyone else gets 404 `not_found`, so the route cannot be discovered (A11).";
const AUTOMATION = `${ADMIN} Also opens with the \`x-compa-automation\` header (TEST_AUTOMATION_SECRET) for test runners.`;

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
    examples: {
      empty: { summary: "First night, no connections yet", value: X.meEmpty },
      superAdmin: { summary: "A super admin: /admin opens (A11)", value: { ...X.me, isAdmin: true, role: "super_admin" } },
    },
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

export const listAdminEvents = route({
  id: "listAdminEvents",
  method: "get",
  path: "/api/admin/events",
  summary: "All events (super admins)",
  description: `${ADMIN} Newest first; archived events only with \`archived=1\` or \`status=archived\`.`,
  tags: ["admin"],
  auth: "admin",
  query: A.AdminEventQuery,
  success: { status: 200, description: "Events with their counts.", schema: A.AdminEventList, example: { events: [AX.adminEvent, AX.testEvent] } },
  errors: [E.invalidInput, E.notFound],
});

export const createEvent = route({
  id: "createEvent",
  method: "post",
  path: "/api/admin/events",
  summary: "Create an event (super admins)",
  description: `${ADMIN} Only name, slug and window are required; details, schedule, status (default \`live\`) and \`isTest\` are optional.`,
  tags: ["admin", "events"],
  auth: "admin",
  body: A.AdminCreateEventBody,
  bodyExample: { name: X.event.name, slug: X.event.slug, startsAt: X.event.startsAt, endsAt: X.event.endsAt, timezone: "America/Mexico_City", venueName: "Casa Jalisco" },
  success: {
    status: 201,
    description: "Created, with the access code and the join URL to print in the event QR (M19).",
    schema: S.CreatedEvent,
    example: { event: { ...X.event, id: X.ids.event, accessCode: X.accessCode, joinUrl: X.joinUrl } },
  },
  errors: [E.invalidInput, E.notFound, E.slugTaken],
});

export const getAdminEvent = route({
  id: "getAdminEvent",
  method: "get",
  path: "/api/admin/events/{slug}",
  summary: "One event with every detail (super admins)",
  description: ADMIN,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  success: { status: 200, description: "The event.", schema: A.AdminEventBody, example: { event: AX.adminEvent } },
  errors: [E.notFound, E.eventNotFound],
});

export const patchAdminEvent = route({
  id: "patchAdminEvent",
  method: "patch",
  path: "/api/admin/events/{slug}",
  summary: "Edit an event (super admins)",
  description: `${ADMIN} \`null\` clears a detail. The merged window must keep endsAt after startsAt, and schedule days must fall inside it in the event time zone. \`status: ended\` also closes the window now.`,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  body: A.PatchEventBody,
  bodyExample: { venueName: "Casa Jalisco", timezone: "America/Mexico_City", schedule: [{ date: "2026-10-29", start: "10:00", end: "22:00" }] },
  success: { status: 200, description: "The updated event.", schema: A.AdminEventBody, example: { event: AX.adminEvent } },
  errors: [E.invalidInput, E.notFound, E.eventNotFound],
});

export const endAdminEvent = route({
  id: "endAdminEvent",
  method: "post",
  path: "/api/admin/events/{slug}/end",
  summary: "End an event now (super admins)",
  description: `${ADMIN} Sets endsAt to now and status to \`ended\`; pending requests then read as expired.`,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  success: { status: 200, description: "The ended event.", schema: A.AdminEventBody, example: { event: { ...AX.adminEvent, status: "ended", isRunning: false } } },
  errors: [E.notFound, E.eventNotFound],
});

export const archiveAdminEvent = route({
  id: "archiveAdminEvent",
  method: "post",
  path: "/api/admin/events/{slug}/archive",
  summary: "Archive an event (super admins)",
  description: `${ADMIN} Soft delete: the door, live and leaderboard routes return 404; check-ins, connections and points are kept. PATCH \`status\` brings it back.`,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  success: { status: 200, description: "The archived event.", schema: A.AdminEventBody, example: { event: { ...AX.adminEvent, status: "archived", isRunning: false } } },
  errors: [E.notFound, E.eventNotFound],
});

export const rotateEventCode = route({
  id: "rotateEventCode",
  method: "post",
  path: "/api/admin/events/{slug}/rotate-code",
  summary: "Rotate an event's access code (super admins)",
  description: `${ADMIN} Issues a new code; the old QR, door and live links stop working at once (A10). Check-ins are kept.`,
  tags: ["admin", "events"],
  auth: "admin",
  params: S.SlugParams,
  success: {
    status: 200,
    description: "The new code and join URL.",
    schema: S.RotatedCode,
    example: { slug: X.founders.slug, accessCode: "w3nq8r5tzc", joinUrl: "https://compa.lol/e/w3nq8r5tzc" },
  },
  errors: [E.notFound, E.eventNotFound],
});

export const listAttendees = route({
  id: "listAttendees",
  method: "get",
  path: "/api/admin/events/{slug}/attendees",
  summary: "An event's attendees with counts (super admins)",
  description: `${ADMIN} Newest check-in first, test users included and counted apart.`,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  success: { status: 200, description: "Attendees.", schema: A.AdminAttendeeList, example: AX.attendees },
  errors: [E.notFound, E.eventNotFound],
});

export const addAttendee = route({
  id: "addAttendee",
  method: "post",
  path: "/api/admin/events/{slug}/attendees",
  summary: "Check someone in on their behalf (super admins)",
  description: `${ADMIN} Screen consent is recorded as admin-assigned. Repeat-safe. A test user only joins a test event.`,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  body: A.AddAttendeeBody,
  bodyExample: { userId: AX.adminIds.testAna },
  success: {
    status: 201,
    description: "Checked in.",
    alsoStatus: { status: 200, description: "Already checked in." },
    schema: A.AddedAttendee,
    example: { attendee: AX.attendees.attendees[0]!, alreadyCheckedIn: false },
  },
  errors: [E.invalidInput, E.notFound, E.eventNotFound, E.userNotFound, E.testUserNotAllowed],
});

export const removeAttendee = route({
  id: "removeAttendee",
  method: "delete",
  path: "/api/admin/events/{slug}/attendees/{userId}",
  summary: "Remove someone from an event (super admins)",
  description: `${ADMIN} Also removes that person's connections at this event (and the points they carried).`,
  tags: ["admin"],
  auth: "admin",
  params: A.EventUserParams,
  success: { status: 204, description: "Removed.", schema: NoBody },
  errors: [E.notFound, E.eventNotFound, E.userNotFound, E.attendeeNotFound],
});

export const listOrganizers = route({
  id: "listOrganizers",
  method: "get",
  path: "/api/admin/events/{slug}/organizers",
  summary: "An event's organizers (super admins)",
  description: ADMIN,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  success: { status: 200, description: "Organizers, first assigned first.", schema: A.OrganizerList, example: { organizers: [AX.organizer] } },
  errors: [E.notFound, E.eventNotFound],
});

export const setOrganizer = route({
  id: "setOrganizer",
  method: "post",
  path: "/api/admin/events/{slug}/organizers",
  summary: "Assign an organizer (super admins)",
  description: `${ADMIN} Repeat-safe; assigning again changes the role.`,
  tags: ["admin"],
  auth: "admin",
  params: S.SlugParams,
  body: A.SetOrganizerBody,
  bodyExample: { userId: AX.adminIds.noe, role: "owner" },
  success: { status: 200, description: "The organizer.", schema: A.OrganizerBody, example: { organizer: AX.organizer } },
  errors: [E.invalidInput, E.notFound, E.eventNotFound, E.userNotFound],
});

export const removeOrganizer = route({
  id: "removeOrganizer",
  method: "delete",
  path: "/api/admin/events/{slug}/organizers/{userId}",
  summary: "Remove an organizer (super admins)",
  description: ADMIN,
  tags: ["admin"],
  auth: "admin",
  params: A.EventUserParams,
  success: { status: 204, description: "Removed.", schema: NoBody },
  errors: [E.notFound, E.eventNotFound, E.userNotFound],
});

export const searchUsers = route({
  id: "searchUsers",
  method: "get",
  path: "/api/admin/users",
  summary: "Search people (super admins)",
  description: `${ADMIN} By name, handle, email or company; \`test\` includes, excludes or isolates test users.`,
  tags: ["admin"],
  auth: "admin",
  query: A.UserSearchQuery,
  success: { status: 200, description: "Matching people, by name.", schema: A.AdminUserList, example: { users: [AX.noe, AX.testAna] } },
  errors: [E.invalidInput, E.notFound],
});

export const createTestUsers = route({
  id: "createTestUsers",
  method: "post",
  path: "/api/admin/test-users",
  summary: "Create mock test users (super admins, automation)",
  description: `${AUTOMATION} Creates the Supabase auth row (email \`<handle>@test.compa.lol\`, no password) and a full profile, never LinkedIn. Send \`users\` to set fields, or \`count\` + \`preset\` to generate. \`checkInTo\` must be a test event.`,
  tags: ["admin", "testing"],
  auth: "automation",
  body: A.CreateTestUsersBody,
  bodyExample: { count: 3, preset: "random", seed: 42, checkInTo: "codex-conf-2026" },
  success: { status: 201, description: "The created test users.", schema: A.TestUserList, example: { users: [AX.testUser] } },
  errors: [E.invalidInput, E.notFound, E.eventNotFound, E.handleTaken, E.notTestEvent, E.harnessUnavailable],
});

export const listTestUsers = route({
  id: "listTestUsers",
  method: "get",
  path: "/api/admin/test-users",
  summary: "List test users (super admins, automation)",
  description: `${AUTOMATION} Newest first; never returns a real person.`,
  tags: ["admin", "testing"],
  auth: "automation",
  query: A.TestUserQuery,
  success: { status: 200, description: "Test users.", schema: A.TestUserList, example: { users: [AX.testUser] } },
  errors: [E.invalidInput, E.notFound],
});

export const deleteTestUser = route({
  id: "deleteTestUser",
  method: "delete",
  path: "/api/admin/test-users/{id}",
  summary: "Delete a test user (super admins, automation)",
  description: `${AUTOMATION} Removes the auth row and, by cascade, the profile, check-ins, connections, summaries and points. A real person's id reads as unknown.`,
  tags: ["admin", "testing"],
  auth: "automation",
  params: A.TestUserParams,
  success: { status: 204, description: "Deleted.", schema: NoBody },
  errors: [E.notFound, E.testUserNotFound, E.harnessUnavailable],
});

export const createTestSession = route({
  id: "createTestSession",
  method: "post",
  path: "/api/admin/test-users/{id}/session",
  summary: "Sign in as a test user (super admins, automation)",
  description: `${AUTOMATION} Sets the Supabase session cookies for that test user on this response, replacing the caller's session. Refused (404) for anyone not flagged \`is_test\`.`,
  tags: ["admin", "testing"],
  auth: "automation",
  params: A.TestUserParams,
  success: { status: 200, description: "Signed in; cookies in `Set-Cookie`.", schema: A.TestSession, example: AX.testSession },
  errors: [E.notFound, E.testUserNotFound, E.sessionFailed, E.harnessUnavailable],
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
  errors: [E.invalidInput, E.unauthorized, E.eventNotFound, E.eventNotRunning, E.testUserNotAllowed],
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
  errors: [E.invalidInput, E.unauthorized, E.userNotFound, E.selfConnection, E.notAtEvent, E.consentRequired, E.testUserNotAllowed],
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

export const listNotifications = route({
  id: "listNotifications",
  method: "get",
  path: "/api/notifications",
  summary: "My notifications",
  description: "Derived from pending requests, accepted requests, connected invitees and earned badges. Declines are never shown.",
  tags: ["notifications"],
  auth: "user",
  success: { status: 200, description: "Recent notifications and the unseen count.", schema: S.Notifications, example: X.notifications },
  errors: WITH_USER,
});

export const markNotificationsSeen = route({
  id: "markNotificationsSeen",
  method: "post",
  path: "/api/notifications/seen",
  summary: "Mark notifications as seen",
  tags: ["notifications"],
  auth: "user",
  body: S.NotificationsSeenBody,
  bodyExample: X.notificationsSeen,
  success: { status: 204, description: "Notifications are marked as seen.", schema: NoBody },
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
  listAdminEvents,
  createEvent,
  getAdminEvent,
  patchAdminEvent,
  endAdminEvent,
  archiveAdminEvent,
  rotateEventCode,
  listAttendees,
  addAttendee,
  removeAttendee,
  listOrganizers,
  setOrganizer,
  removeOrganizer,
  searchUsers,
  createTestUsers,
  listTestUsers,
  deleteTestUser,
  createTestSession,
  getEvent,
  checkIn,
  createConnection,
  listConnections,
  listNotifications,
  markNotificationsSeen,
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
