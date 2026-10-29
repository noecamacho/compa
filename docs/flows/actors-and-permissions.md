# Actors, permissions and CRUD

Date: 2026-10-29 · Baseline: `main` @ `617cb93`. In-flight branches are marked **IP**: `landing` (`feat/COMPA-TBD-landing-gated-events`) and `real-mode` (`fix/COMPA-TBD-real-mode-routes`). See [backlog](backlog.md) for the legend.

Sources:

- The auth wrapper `lib/api/define-route.ts` and `lib/server/auth.ts`: `auth: "public" | "user" | "admin"`.
- The route registry `lib/api/routes.ts` and the handlers in `lib/server/*`.
- The session guard `app/(app)/layout.tsx`.
- The data-model spec (M1–M18) and the API spec (A1–A9).
- Production probes of https://compa.lol on 2026-10-29.

Access model:

- RLS is enabled on every table, with no client policies. Every read and write goes through route handlers that connect with the server's database credentials (data model §4.7).
- Authorization therefore lives **only** in the handlers: membership checks such as `requireMember` and `requireAnswerable` in `lib/server/connections.ts`, and `requireUser` and `requireSuperAdmin` (`lib/api/admin-gate.ts`) for identity.
- Super admins are `users.role = 'super_admin'` (M20, API spec A11); every admin route and page answers anyone else with 404. `event_organizers` records organizers per event, with no extra powers yet (OQ #52).

## 1. Actors

| Actor | Who | How identified in code | Entry points |
| --- | --- | --- | --- |
| Anonymous visitor | Anyone on compa.lol without a session | No Supabase session; `hasSession()` false | `/` (landing), public API routes |
| Invite-link visitor | Anonymous or signed in, arriving through a friend's link | `/i/<code>` → `/auth/linkedin?next=/onboarding/profile?invite=<code>` | `/i/<code>` |
| Event-QR visitor | Arrives by scanning the printed event QR | `/e/<code>` (IP landing; 404 on `main`) | `/e/<code>`, `/e/<code>/join` |
| Personal-QR visitor | Opens someone's `/u/<handle>` with the native camera | `/u/<handle>` → `/connect/<handle>` | `/u/<handle>` |
| Signed-in attendee, not checked in | Has a `users` row; no `event_attendees` row in a running event | `requireUser()`; `Me.currentEvent: null` | `/home`, `/me`, `/connect` |
| Checked-in attendee | Has a row in `event_attendees` for a running event | `findCurrentEvent(user, now)` returns the event | All attendee screens |
| Requester | The scanner of a connection | `connections.requester_id = me` | 05, the pending branch of 06 |
| Addressee | The person who was scanned | `connections.addressee_id = me` | 06b `/requests/[id]` |
| Connected peer | A pair with an `accepted` connection at **any** event | `connectedPeers()` (`lib/server/people.ts`); relation `connected` | 08 `/people/[handle]`; links unlock (M12) |
| Super admin | `users.role = 'super_admin'` (M20) | `requireSuperAdmin()`, 404 otherwise | `POST /api/admin/events`; rotate code (IP landing) |
| Projector or big-screen viewer | Anonymous browser on the venue screen | No session; public routes | `/e/<code>/live` (IP landing); on `main` the public `/api/events/{slug}/live*` |
| System jobs or cron | None exist | — | Expiry is computed on read (`statusForViewer`, `lib/connection-status.ts`); no Vercel Cron in `vercel.json` |
| AI service | OpenAI, called from the server only | `lib/ai/openai.ts`; `OPENAI_STT_MODEL`, `OPENAI_TEXT_MODEL` | `POST /api/transcribe`, `POST /api/interactions/draft` |
| Supabase Auth and Realtime | Identity provider (LinkedIn OIDC) and broadcast bus | `lib/server/supabase.ts`, `lib/realtime.ts` (server broadcasts with the service-role key) | `/auth/linkedin`, `/auth/callback` |

## 2. Permission matrix (actor × action)

Legend:

- **✓** allowed and implemented in real mode.
- **✓\*** allowed but only partly built: Mock-only UI, or the API without a UI.
- **IP** in progress on a branch.
- **✗** refused, with the code in parentheses.
- **—** not applicable.
- **M** missing: the action is expected but does not exist.

Column abbreviations:

| Abbreviation | Actor |
| --- | --- |
| Anon | Anonymous visitor |
| Signed | Signed-in attendee, not checked in |
| In | Checked-in attendee |
| Req | Requester (on their connection) |
| Addr | Addressee (on their connection) |
| Peer | Connected peer |
| Admin | Admin or organizer |
| Screen | Projector or big-screen viewer |

| Action | Anon | Signed | In | Req | Addr | Peer | Admin | Screen | Route / source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View landing | ✓ | ✓ (IP "Back to my event") | ✓ | — | — | — | ✓ | — | `/`; T-010 |
| Sign in with LinkedIn | ✓ | — | — | — | — | — | — | — | `/auth/linkedin`, `/auth/callback` |
| Sign out | — | ✓\* (no button) | ✓\* | — | — | — | ✓\* | — | `POST /api/auth/signout`; T-062 |
| Read my profile | ✗ 401 | ✓ | ✓ | — | — | — | ✓ | — | `GET /api/me` |
| Edit my profile | ✗ 401 | ✓ (city, avatar dropped; IP real-mode) | ✓ | — | — | — | ✓ | — | `PATCH /api/me`; T-015 |
| Change my visibility | ✗ 401 | ✓ | ✓ | — | — | — | ✓ | — | `PATCH /api/me/visibility` |
| List interests | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | `GET /api/interests` (public) |
| Read someone's card | ✗ 401 | ✓ public fields | ✓ public fields | ✓ | ✓ | ✓ + connections fields | ✓ public fields (no admin override) | public fields via the live person card | `GET /api/users/{handle}`; `lib/visibility.ts` |
| Search people by name | — | M | M (exact handle only) | — | — | — | M | — | T-034 |
| Create an event | ✗ 404 | ✗ 404 | ✗ 404 | — | — | — | ✓ (`/admin`) | — | `POST /api/admin/events`; T-023 |
| Edit, end early or archive an event | — | — | — | — | — | — | M | — | T-023 |
| Rotate an event access code | — | — | — | — | — | — | IP | — | landing branch; T-022 |
| Open the event door | ✓ (→ sign-in) | IP | IP | — | — | — | IP | — | `/e/<code>`; T-020 |
| Check in (with screen consent) | ✗ 401 | ✓\* (API; no page on `main`) | ✓ (repeat-safe 200) | — | — | — | ✓ | — | `POST /api/events/{slug}/check-in` → `/api/e/{code}/check-in` (IP) |
| Leave an event | — | — | M | — | — | — | M | — | T-026 |
| Show my QR | ✗ (redirect `/`) | ✓ | ✓ | — | — | — | ✓ | — | `/connect` |
| Send a request (scan) | ✗ 401 | ✓ (auto check-in to the target's event; `consent_required`) | ✓ | — | — | ✓ (a reconnection at a new event) | ✓ | — | `POST /api/connections`; ✗ 409 `self_connection`; a target at no event gives a connection outside an event (no points) |
| Set "we knew each other" | — | — | — | ✓\* (no UI) | ✗ 403 | — | ✗ 403 | — | `PATCH /api/connections/{id}/knew`; T-043 |
| Withdraw my pending request | — | — | — | M | — | — | — | — | T-035 |
| Accept or decline | — | — | — | ✗ 403 | ✓ (page loads via a 501 on `main`; IP real-mode) | — | ✗ 403 | — | `POST …/accept`, `…/decline`; ✗ 409 `not_pending`, `event_ended` |
| Read one connection | — | — | — | Mock-only → IP | Mock-only → IP | Mock-only → IP | ✗ 404 (not a member) | — | `GET /api/connections/{id}`; T-030 |
| List my connections | ✗ 401 | ✓ | ✓ | — | — | — | ✓ | — | `GET /api/connections` |
| Transcribe audio | ✗ 401 | ✓ (any audio, no connection needed) | ✓ | ✓ | ✓ | ✓ | ✓ | — | `POST /api/transcribe`; T-052 |
| Draft a summary | — | — | — | ✓ (accepted only) | ✓ (accepted only) | ✓ | ✗ 404 | — | `POST /api/interactions/draft`; ✗ 409 `connection_not_accepted` |
| Approve a summary | — | — | — | ✓ if author | ✓ if author | — | ✗ | — | `POST /api/interactions/{id}/approve`; ✗ 403 `not_author`, 409 `already_approved` / `not_substantive` |
| Edit or delete a summary | — | — | — | M | M | — | M | — | T-053 |
| My badges | ✗ 401 | Mock-only (501) → IP | same | — | — | — | — | — | `GET /api/badges`; T-070 |
| Someone else's badges | — | M | M | — | — | M | — | — | T-064 |
| Event leaderboard | ✓ (public) | ✓ | ✓ | — | — | — | ✓ | ✓ | `GET /api/events/{slug}/leaderboard` (IP: code-gated) |
| All-year leaderboard | ✓ (public, but `scope` is ignored) | same | same | — | — | — | — | — | T-072 (IP) |
| My invite link | ✗ 401 | Mock-only (501) → IP | same | — | — | — | — | — | `GET /api/invites/me`; T-074 |
| Claim an invite | ✗ 401 | ✓\* (route 501 → IP; the UI never calls it) | same | — | — | — | — | — | `POST /api/invites/{code}/claim`; T-075 |
| Notifications list | — | M (bell count only) | M | — | — | — | — | — | T-080 |
| Big-screen snapshot and person card | ✓ (slug is guessable) | ✓ | ✓ | — | — | — | ✓ | ✓ | `/api/events/{slug}/live*` → IP `/api/e/{code}/live*`; T-092 |
| Block or report a person | — | M | M | M | M | M | — | — | T-041, T-042 |
| Moderate (hide or ban) | — | — | — | — | — | — | M | — | T-104 |
| Delete my account | — | M | M | — | — | — | — | — | T-100 |
| Export my data | — | M | M | — | — | — | — | — | T-101 |

## 3. CRUD matrix per entity

Columns: **C**reate, **R**ead, **U**pdate, **D**elete. Each cell gives what exists in the API and the UI today, who may do it, and the gap. "UI ✗" means the API exists but no screen calls it.

| Entity (table) | C | R | U | D | Missing CRUD (ticket) |
| --- | --- | --- | --- | --- | --- |
| **Users** (`users`) | At the first LinkedIn sign-in (`upsertLinkedInUser`). System only | Self: `GET /api/me`. Others: `GET /api/users/{handle}` (any signed-in user, filtered card). Screen: name and photo | Self: `PATCH /api/me`. Sync on re-login (M14). Handle immutable | **None** | Delete account (T-100); export my data (T-101); change handle (T-063); admin ban or hide (T-104); search by name (T-034) |
| **Profile fields and visibility** (`users.headline`, `company`, `city`, `links`, `visibility`) | Defaults at insert (`DEFAULT_VISIBILITY`, migration 0001 adds `whatsapp`) | Self: everything. Others: `toCard` with relation `public`, `connected` or `self` (`lib/visibility.ts`) | `PATCH /api/me`, `PATCH /api/me/visibility` (shallow merge). `city` is dropped on `main` (IP real-mode). Rows created before 0001 lack `whatsapp`, which breaks a strict parse (IP real-mode `withDefaultVisibility`) | Clear a field by sending `""` or `null` | — (covered by T-015, T-016) |
| **Avatar and photo** (`users.photo_url`, `photo_edited`; IP `avatar`, `avatar_mode`) | From the LinkedIn `picture` claim; IP copies it to Storage `avatars` | Public everywhere, including the big screen | `PATCH /api/me { photoUrl }` accepts **any URL** (T-016). No upload UI. Monito look: `PATCH { avatar }` dropped on `main`, IP | M | Upload my own photo (T-016); remove photo or revert to LinkedIn (T-066) |
| **Interests** (`interests`, `user_interests`) | Catalog: seed only (`db/seed.ts`). Mine: `PATCH /api/me { interestIds }`, **UI ✗** | `GET /api/interests` public; on cards per `visibility.interests` | Mine: replace list (API). Catalog: seed upsert | Mine: send `[]` (API) | Edit my interests UI (T-065); admin manage the catalog (T-051, seed for now) |
| **Events** (`events`) | Admin: `POST /api/admin/events` (**UI ✗**) | Public `GET /api/events/{slug}` (IP: `/api/e/{code}`) | **None** | **None** (FK cascade would erase attendees, connections and scores) | Admin list (T-023); edit (T-023); end early (T-023); archive or delete (T-023) |
| **Access codes** (IP `events.access_code`) | IP: at event creation and in the backfill | IP: printed QR, `/e/<code>` | IP: rotate (`POST /api/admin/events/{slug}/rotate-code`) | — | Rotate UI (T-023) |
| **Check-ins** (`event_attendees`) | `POST …/check-in`, or auto on scan (A1). Requires `screenConsent` | Self via `Me.currentEvent`. Public counts and people on the big screen | — (consent timestamp fixed) | **None** | Leave or undo check-in (T-026); withdraw screen consent (T-026); admin attendee list (T-023) |
| **Connections** (`connections`) | Requester: `POST /api/connections` (idempotent: 200 with the existing row) | Members: `GET /api/connections` (grouped); `GET /api/connections/{id}` 501 → IP. Screen: accepted edges | Requester: `PATCH …/knew` (**UI ✗**). Addressee: accept or decline. Expiry derived on read | **None** | Withdraw a pending request (T-035); remove an accepted connection (T-044); set knew from the UI (T-043) |
| **Topics on a connection** (IP `connections.topics`) | Sent in `POST /api/connections`; **dropped** on `main` (IP stores them) | IP: in the connection detail | M | M | Award +5 (T-040); edit topics after sending (T-040, P2 note) |
| **Voice notes and summaries** (`interactions`) | Member of an accepted connection: `POST /api/interactions/draft` (every call inserts a row). Audio is never stored | Via `GET /api/connections/{id}` → 501 on `main` (IP) | Author: approve once (`markApproved`); the edits made on approve are saved | **None** | Edit an approved summary (T-053); delete a summary (T-053); list or resume my drafts (T-054); purge stale drafts (T-057) |
| **Points** (views `event_scores`, `lifetime_scores`) | Derived: connection kind points on accept; `SUMMARY_POINTS` on approve | Leaderboards (public), `ConnectionList.totals` | — (derived) | — | +5 topics (T-040); +15 author-only (T-050); invite +100 / +50 (T-076); admin revoke (T-104) |
| **Badges** (no table; computed on read in IP) | — | `GET /api/badges` 501 → IP | — | — | Others' badges (T-064); "NUEVA" seen state (T-071) |
| **Invites and claims** (IP `invites`, `invite_claims`) | IP: code created on the first `GET /api/invites/me` | IP: `GET /api/invites/me` | M | M | Claim from the UI (T-075); regenerate code (T-078); revoke a fraudulent claim (T-104) |
| **Notifications** (none; derived from `connections`) | — (server broadcasts on Realtime; no client listens) | Bell count from `incoming.length`; the bell is not a link | — | — | List (T-080); mark seen (T-080) |
| **Sessions** (Supabase Auth cookies) | `/auth/callback` | `requireUser()` | Refresh: none, because there is no proxy [Inference] (T-006) | `POST /api/auth/signout` (**UI ✗**) | Sign-out button (T-062); sign out everywhere (T-105) |
| **Blocks and reports** (none) | M | M | M | M | Block or unblock (T-041); report (T-042) |

## 4. Missing CRUD operations

These are the operations that do not exist at all, or exist in the API with no UI ("UI ✗"). IP items are excluded.

| # | Entity | Operation | API | UI | Who should be allowed | Ticket |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Users | Delete my account | ✗ | ✗ | Self | T-100 |
| 2 | Users | Export my data | ✗ | ✗ | Self | T-101 |
| 3 | Users | Change my handle | ✗ | ✗ | Self (OQ #26) | T-063 |
| 4 | Users | Search people by name | ✗ (exact handle only) | partial | Checked-in attendees of the same event (OQ #39) | T-034 |
| 5 | Users | Ban or hide a user | ✗ | ✗ | Admin | T-104 |
| 6 | Photo | Upload my own photo | partial (any URL) | ✗ | Self | T-016 |
| 7 | Photo | Remove photo or revert to LinkedIn | ✗ | ✗ | Self | T-066 |
| 8 | Interests | Edit my interests | ✓ | ✗ | Self | T-065 |
| 9 | Interests | Manage the interest catalog | ✗ (seed) | ✗ | Admin | T-051 |
| 10 | Events | List events | ✓ | ✓ | Admin | T-023 (A11) |
| 11 | Events | Create from a UI | ✓ | ✓ | Admin | T-023 (A11) |
| 12 | Events | Edit name or window | ✓ | ✓ | Admin | T-023 (A11) |
| 13 | Events | End early | ✓ | ✓ | Admin | T-023 (A11) |
| 14 | Events | Archive or delete | ✓ (archive) | ✓ | Admin (soft only) | T-023 (A11) |
| 15 | Check-ins | Leave or undo check-in | ✗ | ✗ | Self | T-026 |
| 16 | Check-ins | Withdraw screen consent | ✗ | ✗ | Self | T-026 |
| 17 | Check-ins | Admin attendee list | ✓ | ✓ | Admin | T-023 (A11) |
| 18 | Connections | Withdraw a pending request | ✗ | ✗ | Requester | T-035 |
| 19 | Connections | Remove an accepted connection | ✗ | ✗ | Either member (OQ #44) | T-044 |
| 20 | Connections | Set "we knew each other" | ✓ | ✗ | Requester while pending | T-043 |
| 21 | Topics | Edit topics after sending | ✗ | ✗ | Requester while pending | T-040 |
| 22 | Summaries | Edit an approved summary | ✗ | ✗ | Author (OQ #49) | T-053 |
| 23 | Summaries | Delete a summary | ✗ | ✗ | Author (OQ #49) | T-053 |
| 24 | Summaries | List or resume my drafts | ✗ | ✗ | Author | T-054 |
| 25 | Points | Revoke or adjust points | ✗ | ✗ | Admin | T-104 |
| 26 | Badges | Read someone else's badges | ✗ | link exists, ignored | Any signed-in user | T-064 |
| 27 | Invites | Regenerate my invite code | ✗ | ✗ | Self | T-078 |
| 28 | Invite claims | Revoke a fraudulent claim | ✗ | ✗ | Admin | T-104 |
| 29 | Notifications | List notifications | ✗ | ✗ (count only) | Self | T-080 |
| 30 | Notifications | Mark as seen | ✗ | ✗ | Self | T-080 |
| 31 | Sessions | Sign out | ✓ | ✗ | Self | T-062 |
| 32 | Sessions | Sign out everywhere | ✗ | ✗ | Self | T-105 |
| 33 | Blocks | Block or unblock a person | ✗ | ✗ | Any signed-in user | T-041 |
| 34 | Reports | Report a person | ✗ | ✗ | Any signed-in user | T-042 |

**Total: 34 missing operations.**

| Kind | Count | Rows |
| --- | --- | --- |
| Missing in both API and UI | 26 | All rows not listed below |
| API exists, no UI calls it | 4 | #8, #11, #20, #31 |
| Partial | 4 | #4 (exact handle only), #6 (any URL, no upload), #9 (seed only), #26 (link exists, page ignores it) |

Not counted here: the items in progress on the branches, which are city and avatar storage, the invites routes, the badges route, code rotation and the connection detail.

Related: [catalog](catalog.md), [backlog](backlog.md), [edge cases and risks](edge-cases-and-risks.md), [data-model spec](../specs/2026-10-29-data-model.md), [API spec](../specs/2026-10-29-api.md).
