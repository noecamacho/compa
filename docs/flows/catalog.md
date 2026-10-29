# User-flow catalog

Date: 2026-10-29 · Baseline: `main` @ `617cb93`, plus a reading of the two in-flight local branches (see [backlog](backlog.md) legend) · Production probed at https://compa.lol the same day.

## How to read a flow

Each flow has an id `F-xx` and these fields:

- **Actor:** see [actors](actors-and-permissions.md#1-actors).
- **Entry:** the URL, QR or button that starts the flow.
- **Pre:** preconditions.
- **Happy path:** screen → API call → result.
- **Alternates:** other valid paths.
- **Errors:** API error code → UI copy key. Codes come from `lib/api/errors.ts`; copy keys from `lib/copy/es.ts`. *raw msg* means the component shows the API's English `message` (DESIGN.md i18n; fix in T-111).
- **Edge cases**.
- **Status:** per layer, **UI / API / DB**.
  - **Ready:** works in real mode.
  - **Partial:** works, but something the flow needs is dropped or missing.
  - **Mock-only:** renders only in mock mode.
  - **Missing:** not built.
  - **IP:** built on an unmerged branch.
- **E2E coverage:** the spec file the flow's Playwright tests live in, and the scenarios to assert. Captain requirement, 2026-10-29; harness in [T-000](backlog.md#t-000). Specs now exist for every built flow; [E2E coverage status](#e2e-coverage-status) lists them and what is still uncovered.
- **Tickets:** links into the [backlog](backlog.md).

Screen numbers (01–12) are the V2 screens in [DESIGN.md](../../DESIGN.md#screens). "Real mode" means without `API_MODE=mock`.

## Overview

| Id | Flow | UI | API | DB | Tickets |
| --- | --- | --- | --- | --- | --- |
| [F-01](#f-01) | Anonymous visitor opens compa.lol | IP | — | — | T-010 |
| [F-02](#f-02) | Signed-in visitor opens compa.lol | IP | Ready | Ready | T-010, T-025 |
| [F-03](#f-03) | First sign-in with LinkedIn | Partial | Ready | Ready | T-011, T-014 |
| [F-04](#f-04) | LinkedIn cancelled or denied | Partial | Partial | — | T-012 |
| [F-05](#f-05) | LinkedIn invalid scope or user sync failure | Partial | Partial | — | T-012, T-007 |
| [F-06](#f-06) | Returning user signs in | Partial | Ready | Ready | T-014 |
| [F-07](#f-07) | Profile prefill and edit (02) | Partial | Partial | Partial | T-013, T-015, T-065 |
| [F-08](#f-08) | Monito or photo (02b) | Mock-only | Mock-only | Missing | T-015, T-066 |
| [F-09](#f-09) | Invite-link visitor `/i/<code>` | Partial | Mock-only | Missing | T-074, T-075 |
| [F-10](#f-10) | Event-QR visitor `/e/<code>` | IP | IP | IP | T-020, T-011 |
| [F-11](#f-11) | Personal-QR visitor signed out `/u/<handle>` | Partial | Ready | Ready | T-011 |
| [F-12](#f-12) | Check in with screen consent at the door | IP | Ready | Ready | T-020 |
| [F-13](#f-13) | Auto check-in when scanning (A1) | Partial | Ready | Ready | T-021 |
| [F-14](#f-14) | Check-in outside the event window | Partial | Ready | Ready | T-024 |
| [F-15](#f-15) | Invalid or rotated event code | IP | IP | IP | T-020, T-022 |
| [F-16](#f-16) | Show my QR | Ready | Ready | Ready | — |
| [F-17](#f-17) | Scan in the app | Partial | Ready | Ready | T-033 |
| [F-18](#f-18) | Camera denied or unsupported | Partial | — | — | T-033 |
| [F-19](#f-19) | Search by name | Partial | Missing | Ready | T-034 |
| [F-20](#f-20) | Non-COMPA QR or unknown handle | Partial | Ready | — | T-033 |
| [F-21](#f-21) | Self-scan | Partial | Ready | Ready | T-111 |
| [F-22](#f-22) | Target not at an event | Partial | Ready | Ready | T-111, T-025 |
| [F-23](#f-23) | Event ends mid-flow | Partial | Ready | Ready | T-032, T-111 |
| [F-24](#f-24) | Already connected or duplicate scan | Mock-only | Ready | Ready | T-030 |
| [F-25](#f-25) | Simultaneous mutual scans | Missing | Partial | Ready | T-037 |
| [F-26](#f-26) | Reconnection across events | Ready | Ready | Ready | — |
| [F-27](#f-27) | Register kind and topics (05) | Partial | Partial | Missing → IP | T-040, T-051 |
| [F-28](#f-28) | Voice note on 05 (record, fail, too long, mic denied) | Partial | Ready | — | T-054, T-052 |
| [F-29](#f-29) | Send the request → pending screen | Mock-only | Ready → IP detail | Ready | T-030, T-032, T-043 |
| [F-30](#f-30) | Addressee learns about a request | Missing | Ready | Ready | T-031, T-080 |
| [F-31](#f-31) | Accept a request (06b) | Mock-only | Ready | Ready | T-030, T-038 |
| [F-32](#f-32) | Decline silently ("Ahora no") | Mock-only | Ready | Ready | T-030 |
| [F-33](#f-33) | Request expires at event end | Partial | Ready | Ready | T-032 |
| [F-34](#f-34) | Requester withdraws a pending request | Missing | Missing | Missing | T-035 |
| [F-35](#f-35) | Requester ticks "we already knew each other" | Missing | Ready | Ready | T-043 |
| [F-36](#f-36) | Confirmation and networks unlock (06) | Mock-only | Mock-only → IP | Ready | T-030, T-040 |
| [F-37](#f-37) | Draft and approve the voice-note summary (08b) | Mock-only | Ready | Ready | T-030, T-050, T-055 |
| [F-38](#f-38) | Read, edit or delete a saved summary | Mock-only | Missing | Ready | T-030, T-053 |
| [F-39](#f-39) | Connections list, filters and search (07) | Partial | Partial | Ready | T-060, T-061 |
| [F-40](#f-40) | Another person's profile (08) | Partial | Partial | Ready | T-060, T-064 |
| [F-41](#f-41) | My profile (09) | Partial | Partial | Partial | T-060, T-062 |
| [F-42](#f-42) | Edit my profile and network visibility | Partial | Partial | Partial | T-015, T-016, T-065 |
| [F-43](#f-43) | Change my monito | Mock-only | Mock-only → IP | Missing → IP | T-015 |
| [F-44](#f-44) | Badges (10) | Mock-only | Mock-only → IP | — | T-070, T-071, T-064 |
| [F-45](#f-45) | Ranking tonight (11) | Partial | Partial | Ready | T-073, T-025 |
| [F-46](#f-46) | Ranking all year (11) | Mock-only | Partial → IP | Ready | T-072 |
| [F-47](#f-47) | Share my invite (12) | Mock-only | Mock-only → IP | Missing → IP | T-074 |
| [F-48](#f-48) | Invite claim and reward | Missing | Mock-only → IP | Missing | T-075, T-076 |
| [F-49](#f-49) | Bell and notifications | Ready | Ready | Ready | T-031, T-080, T-081 |
| [F-50](#f-50) | Acceptance notice to the requester | Ready | Ready | Ready | T-032, T-081 |
| [F-51](#f-51) | Big screen opens (gated) | IP | IP | IP | T-090, T-092 |
| [F-52](#f-52) | Big screen with an empty event | IP | Ready | Ready | T-090, T-028 |
| [F-53](#f-53) | Big screen with many nodes, for hours | IP | Partial | Ready | T-091, T-093 |
| [F-54](#f-54) | Big screen person card and leaderboard | IP | Ready | Ready | T-090 |
| [F-55](#f-55) | Admin creates an event | Ready | Ready | Ready | T-023 |
| [F-56](#f-56) | Admin rotates the access code | Ready | Ready | Ready | T-022, T-023 |
| [F-57](#f-57) | Admin edits, ends early or archives an event | Ready | Ready | Ready | T-023 |
| [F-58](#f-58) | Admin seed or demo toggle | Missing | Missing | Missing | T-028 |
| [F-59](#f-59) | Admin moderation (hide, ban, reports) | Missing | Missing | Missing | T-104, T-042 |
| [F-60](#f-60) | Admin bootstrap (first admin) | — | Partial | Ready | T-029 |
| [F-61](#f-61) | Sign out | Missing | Ready | — | T-062 |
| [F-62](#f-62) | Session expiry mid-flow | Missing | Partial | — | T-006, T-004 |
| [F-63](#f-63) | Delete my account | Missing | Missing | Partial | T-100 |
| [F-64](#f-64) | Export my data | Missing | Missing | — | T-101 |
| [F-65](#f-65) | Block or report a person | Missing | Missing | Missing | T-041, T-042 |
| [F-66](#f-66) | Offline and slow network | Partial | — | — | T-112, T-004 |
| [F-67](#f-67) | Server 500, 501 or unexpected error | Missing | Partial | — | T-004, T-007 |
| [F-68](#f-68) | Rate limits hit | Partial | Ready | Ready | T-036, T-052 |
| [F-69](#f-69) | Realtime vs polling updates | Missing | Partial | — | T-031, T-081 |
| [F-70](#f-70) | Time zones and the event window display | Partial | Partial | Missing | T-024 |
| [F-71](#f-71) | Overlapping events | Partial | Partial | Ready | T-027 |
| [F-72](#f-72) | Language detection | IP (landing only) | Ready | Ready | T-110, T-111 |
| [F-73](#f-73) | Accessibility and reduced motion | Partial | — | — | T-113 |
| [F-74](#f-74) | Responsive layouts (390, 834, 1440, 1920) | Partial | — | — | T-114, T-090 |

**Counts.** There are 74 flows. On the UI layer:

| UI status | Flows |
| --- | --- |
| Ready | 2 (F-16, F-26) |
| Partial | 30 |
| Mock-only | 12 |
| Missing | 19 |
| IP | 10 |
| No UI layer | 1 (F-60) |

In the overview, a flow that shows a transition such as "Missing → IP" is counted by its `main` status. **E2E coverage:** every flow with a built UI or API has specs (2026-10-29); see [E2E coverage status](#e2e-coverage-status).

---

## E2E coverage status

Updated 2026-10-29 (branch `fm/compa-e2e-coverage`). Specs run at 390, 834 and 1440 in `es` and `en` (plus reduced motion on 390, and `live-1920` for the big screen), in mock mode and in real mode against a local Supabase (never production; LinkedIn never called). WebKit projects run in CI only.

| Section | Flows | Specs |
| --- | --- | --- |
| Onboarding | F-01–F-11, F-42 | `e2e/onboarding/` landing, signin, profile, monito, deep-links, invite-link |
| Account | F-61, F-62 | `e2e/account/session.spec.ts` |
| Events | F-10, F-12, F-14, F-15, F-70, F-71 | `e2e/events/` door, check-in, window |
| Connect | F-13, F-16–F-22, F-24, F-27–F-29 | `e2e/connect/` my-qr, scan, search, register, voice-note |
| Requests | F-23, F-25, F-26, F-30–F-33, F-35, F-36, F-50, F-69 | `e2e/requests/` incoming, pending, accept-decline, mutual |
| Summaries, connections, profiles, home | F-37, F-39–F-43 | `e2e/summaries/note`, `e2e/connections/list`, `e2e/profiles/` me, other, `e2e/home/home` |
| Gamification | F-44–F-48 | `e2e/gamification/` badges, ranking, invites |
| Notifications | F-49 | `e2e/notifications/bell.spec.ts` |
| Big screen | F-51, F-52, F-54 | `e2e/live/big-screen.spec.ts` |
| Admin | F-55–F-57, F-60 | `e2e/admin/` access, api, events, people, test-users |
| API contract | all 46 operations | `e2e/api/` contract-mock, contract-real, real-success, openapi |
| System | F-66–F-68, F-72–F-74 | `e2e/system/` resilience, rate-limits, i18n, a11y, responsive |

Not covered, because the feature is not built: withdraw (F-34), saved-summary edit and delete (F-38), seed toggle and moderation (F-58, F-59), delete, export and block (F-63–F-65), offline banner, security headers, axe scans (not installed), English copy on Spanish-only app screens (T-110, T-111), the 500-node load run (F-53). Not covered for other reasons: clicking a WebGL node on the big screen (no hooks; the board and API snapshot are asserted instead), a real transcription or draft (needs OpenAI), the 300-request and 5-draft caps in real mode (mock only).

Known gaps: `<html lang>` is always `es` (a `test.fixme` in `e2e/system/i18n.spec.ts`), and signed-in `notFound()` pages answer 200 because the loading UI has started streaming, so specs assert the content instead of the status.

## Onboarding

<a id="f-01"></a>
### F-01 · Anonymous visitor opens compa.lol

| Field | Detail |
| --- | --- |
| Actor | Anonymous visitor |
| Entry | `https://compa.lol/` |
| Pre | No session |
| Happy path | `/` → landing (IP: `components/landing/Crowd.tsx`), with no sign-up button. Events are reachable only through an event QR (captain decision). On `main`, `/` shows 01 Bienvenida, with a LinkedIn button and Crear cuenta / Ya tengo cuenta |
| Alternates | Arrives with `?error=signin` → generic sign-in error copy (F-04) |
| Errors | None |
| Edge cases | A visitor who wants to "join" without an event QR has no path. The landing must explain "scan the QR at your event". Search-engine visitors; link previews (OG tags in `app/layout.tsx`, Spanish only) |
| Status | UI **IP** (landing) · API — · DB — |
| E2E coverage | `e2e/onboarding/landing.spec.ts`: renders at 390, 834 and 1440 in es and en; no sign-up CTA; explains the event QR; `?error=…` shows its copy; OG title and description localized |
| Tickets | [T-010](backlog.md#t-010), [T-102](backlog.md#t-102) |

<a id="f-02"></a>
### F-02 · Signed-in visitor opens compa.lol

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee (checked in or not) |
| Entry | `/` |
| Pre | Valid session |
| Happy path | `/` → landing with "Back to my event" (IP) → `GET /api/me` `currentEvent` → `/home` |
| Alternates | No current event → the T-025 destination (Home outside an event). On `main` the signed-in visitor sees 01 again and is not sent onward (gap analysis U1) |
| Errors | `/api/me` 401 with a stale cookie → treat as signed out |
| Edge cases | Users created before migration 0001 fail the strict `VisibilitySettings` parse [Inference] (IP real-mode fixes it with `withDefaultVisibility`) |
| Status | UI **IP** · API Ready · DB Ready |
| E2E coverage | `e2e/onboarding/landing.spec.ts`: `realUser` with a current event sees "Back to my event" → `/home`; without one → the outside-event Home; stale cookie → anonymous landing |
| Tickets | [T-010](backlog.md#t-010), [T-025](backlog.md#t-025) |

<a id="f-03"></a>
### F-03 · First sign-in with LinkedIn

| Field | Detail |
| --- | --- |
| Actor | Anonymous visitor (or an event, invite or personal-QR visitor) |
| Entry | `/auth/linkedin?next=<path>` |
| Pre | LinkedIn app configured in Supabase (`linkedin_oidc`); OQ #20 |
| Happy path | `GET /auth/linkedin` → 302 to LinkedIn → consent → `GET /auth/callback?code=` → `exchangeCodeForSession` → `upsertLinkedInUser` inserts `users` (handle from name, `pickHandle`) → 302 to `safeNext(next)`, default `/me` → 02 `/onboarding/profile` |
| Alternates | `next` is a deep link (F-10, F-11, F-09) |
| Errors | Any failure → `/?error=signin` → generic sign-in error copy |
| Edge cases | LinkedIn gives only name, email, photo and locale (captain decision), so job title, company and city are empty (F-07). No name → "COMPA" fallback (`lib/server/linkedin.ts`). A handle collision races and retries up to 3 times with a random suffix. The email is nullable. The LinkedIn photo URL may expire (OQ #21; IP copies it to Storage). The LinkedIn in-app browser has a different cookie jar, so the session may not carry over to Safari |
| Status | UI Partial (no onboarding gate, T-014) · API Ready · DB Ready |
| E2E coverage | `e2e/onboarding/signin.spec.ts`: LinkedIn is never called in CI. Stub the callback with `realUser` and assert the redirect to `next`. A unit test covers `profileFrom` with missing name, photo and email, and the `safeNext` cases (`//evil.com`, `/\\evil`) |
| Tickets | [T-011](backlog.md#t-011), [T-014](backlog.md#t-014), [T-013](backlog.md#t-013) |

<a id="f-04"></a>
### F-04 · LinkedIn cancelled or denied

| Field | Detail |
| --- | --- |
| Actor | Anonymous visitor |
| Entry | LinkedIn consent screen → Cancel |
| Pre | — |
| Happy path | `/auth/callback?error=user_cancelled_login` (or `access_denied`) → `/?error=signin` → generic sign-in error copy |
| Alternates | The person retries. `next` is lost today, because `failedSignIn` drops it |
| Errors | Callback `error` → `?error=cancelled` or `denied` (T-012) |
| Edge cases | The person closes the tab mid-OAuth and the PKCE verifier cookie lingers. The landing on the landing branch removes `Welcome`, which held the error copy |
| Status | UI Partial · API Partial (single generic reason) · DB — |
| E2E coverage | `e2e/onboarding/signin.spec.ts`: `/auth/callback?error=user_cancelled_login` and `error=access_denied&next=/u/x` show distinct copy and keep `next` on retry |
| Tickets | [T-012](backlog.md#t-012) |

<a id="f-05"></a>
### F-05 · LinkedIn invalid scope or user sync failure

| Field | Detail |
| --- | --- |
| Actor | Anonymous visitor |
| Entry | `/auth/callback` |
| Pre | — |
| Happy path | — |
| Alternates | `error=invalid_scope` (PR #19 removed the duplicate scopes), the code exchange fails, or user sync fails → `/?error=signin` |
| Errors | → `?error=scope` or `sync` (T-012) |
| Edge cases | A sync failure leaves a Supabase `auth.users` row without a `users` row, so every API call returns 401. The person loops between sign-in and failure until the next successful sync |
| Status | UI Partial · API Partial · DB — |
| E2E coverage | `e2e/onboarding/signin.spec.ts`: `error=invalid_scope` → scope copy. A unit test makes a sync throw and asserts `?error=sync` |
| Tickets | [T-012](backlog.md#t-012), [T-007](backlog.md#t-007) |

<a id="f-06"></a>
### F-06 · Returning user signs in

| Field | Detail |
| --- | --- |
| Actor | A signed-out user with an existing `users` row |
| Entry | Landing or a deep link → LinkedIn |
| Pre | `users.auth_user_id` matches |
| Happy path | Callback → `syncUser` refreshes `linkedin_raw` and the email, refreshes the name unless `name_edited`, and the photo only when the person still shows their LinkedIn photo and it changed (M14, `lib/linkedin-photo.ts`) → `next`, or `/me` |
| Alternates | On `main`, "Ya tengo cuenta" sends to `/home` |
| Errors | as F-05 |
| Edge cases | A returning user who never finished onboarding is not resumed (T-014). The LinkedIn photo changed, so a re-copy to Storage is needed (T-015). The same LinkedIn after an account deletion → a fresh user (T-100) |
| Status | UI Partial · API Ready · DB Ready |
| E2E coverage | `e2e/onboarding/signin.spec.ts`: an edited name survives a re-sync; an unedited one is replaced (unit-level sync and an e2e check on `/me`) |
| Tickets | [T-014](backlog.md#t-014) |

<a id="f-07"></a>
### F-07 · Profile prefill and edit (02)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | `/onboarding/profile` (or `?from=me`) |
| Pre | Session |
| Happy path | `GET /api/me` → form with name, job title (`headline`), company and city; network toggles → Siguiente → `PATCH /api/me` + `PATCH /api/me/visibility` (on → `connections`, off → `hidden`) → 02b |
| Alternates | `?from=me` returns to `/me`. Interests are editable in the API only (T-065) |
| Errors | 400 `invalid_input` with `fields` → *raw msg* (`ProfileForm`) |
| Edge cases | `city` passes zod and is **silently dropped** on `main` (IP stores it). `welcome.noteCreate` promises job title, company and city from LinkedIn, which is false (T-013). Headline is at most 120 characters, company and city at most 80 (DB checks). The WhatsApp number is normalized to digits. A network link may point to any `https` host (T-016) |
| Status | UI Partial · API Partial · DB Partial (no `city` on `main`) |
| E2E coverage | `e2e/onboarding/profile.spec.ts`: prefilled name; empty job title, company and city with placeholders; save → 02b; city persists after reload; mock `x-compa-mock-error: invalid_input` shows field errors localized; each toggle maps on → visible to connections; 390 and 1440; es and en |
| Tickets | [T-013](backlog.md#t-013), [T-015](backlog.md#t-015), [T-016](backlog.md#t-016), [T-065](backlog.md#t-065) |

<a id="f-08"></a>
### F-08 · Monito or photo (02b)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | `/onboarding/monito` |
| Pre | 02 done |
| Happy path | Builder (body Hombre/Mujer/Otro, 5 skins, 4 hair styles, 4 hair colors, 6 shirts, extras, random) → `PATCH /api/me { avatar, avatarMode }` → `next` or `/home`. The look is always saved, also with the LinkedIn photo mode. Mandatory: the (app) layout renders `MonitoGate`, which sends anyone whose `avatar` is empty to `/onboarding/monito?next=<path>`; onboarding lives in its own `(onboarding)` route group so the gate cannot loop. IP: `avatar_mode` is `photo` by default (the LinkedIn photo copied to Storage) or `monito` |
| Alternates | No skip: leaving 02b and opening any app screen comes back to it |
| Errors | Save failed → *raw msg* (`MonitoBuilder`); should keep the local choice and retry |
| Edge cases | On `main` the server ignores `avatar`, so everyone shows the default monito (gap analysis U4). Stored jsonb is untrusted; IP `parseLook` drops an invalid look. No LinkedIn photo → the monito is the only option |
| Status | UI Mock-only · API Mock-only (IP) · DB Missing (IP) |
| E2E coverage | `e2e/onboarding/monito.spec.ts`: pick options → save → reload shows the same look on `/home`, `/me` and the big-screen card; random button; photo vs monito mode; save error keeps the selection; reduced motion |
| Tickets | [T-015](backlog.md#t-015), [T-066](backlog.md#t-066) |

<a id="f-09"></a>
### F-09 · Referral-link visitor `/i/<code>`

| Field | Detail |
| --- | --- |
| Actor | Invite-link visitor |
| Entry | A shared referral link `https://compa.lol/i/<code>` (WhatsApp, Instagram); the code is the inviter's handle, inside an event or not |
| Pre | — |
| Happy path | Inviter at an event: `/i/<code>` → 307 `/e/<event code>?invite=<code>` (the event door) → LinkedIn → `/e/<event code>/join?invite=<code>` → **claim** `POST /api/invites/{code}/claim` (server-side, quiet) → consent and check-in. Inviter outside an event: `/i/<code>` → 307 `/auth/linkedin?next=/onboarding/profile?invite=<code>` → onboarding claims it |
| Alternates | Already signed in → the door goes straight to join. Mock mode → the example event door. A code from before referral codes (`<handle>-<suffix>`) still names its inviter. An unknown code → the "event not found" page |
| Errors | Claim 404 `not_found` (unknown code, or my own code) → silent; 409 `referral_not_new` (the person has already checked in to an event, so they are not new to COMPA) → silent |
| Edge cases | A person already checked in to that event is sent to `/home` before the join step, so no claim. A self-invite is blocked in IP. A second claim returns the first inviter (IP, repeat-safe). Invite farming with fresh fake accounts (OQ #48). The code is in the URL, so link previews do not leak anything sensitive |
| Status | UI Partial · API Mock-only (IP) · DB Missing (IP) |
| E2E coverage | `e2e/onboarding/invite-link.spec.ts`: `/i/<code>` lands at the event door with the invite; outside an event it goes through sign-in to onboarding, which claims once; join keeps it through sign-in; the join step claims once and the inviter sees the friend; unknown and own codes silent; mock refusal `referral_not_new` |
| Tickets | [T-074](backlog.md#t-074), [T-075](backlog.md#t-075), [T-076](backlog.md#t-076) |

<a id="f-10"></a>
### F-10 · Event-QR visitor `/e/<code>`

| Field | Detail |
| --- | --- |
| Actor | Event-QR visitor |
| Entry | Printed QR → `https://compa.lol/e/<code>` |
| Pre | The event exists with an access code (IP M19) |
| Happy path | `/e/<code>` (IP) → event card → signed out: LinkedIn with `next=/e/<code>/join` → `/e/<code>/join` → screen-consent notice (`JoinConsent`) → `POST /api/e/{code}/check-in { screenConsent: true }` → `/home` |
| Alternates | Already checked in → 200 `alreadyCheckedIn` → `/home` |
| Errors | Unknown or malformed code → `not-found.tsx` (`EventNotFound`); `event_not_running` → copy (T-111); 401 → sign-in |
| Edge cases | The QR was photographed and shared outside the venue (risk [R-04](edge-cases-and-risks.md#abuse-and-safety)). The code was rotated after printing (F-15). Case and whitespace are normalized by `parseAccessCode`. On `main`, `/e/founders-fest` returns 404 (probed) |
| Status | UI **IP** · API **IP** · DB **IP** |
| E2E coverage | `e2e/events/door.spec.ts`: valid code signed in → notice → check-in → `/home`; signed out → LinkedIn with `next`; uppercase or spaced code normalized; unknown code → not found; event before start or ended → `event_not_running` copy; repeat check-in idempotent; es and en |
| Tickets | [T-020](backlog.md#t-020), [T-011](backlog.md#t-011) |

<a id="f-11"></a>
### F-11 · Personal-QR visitor signed out (`/u/<handle>`)

| Field | Detail |
| --- | --- |
| Actor | Personal-QR visitor |
| Entry | Native camera → `https://compa.lol/u/<handle>` |
| Pre | — |
| Happy path (intended, A1) | `/u/<handle>` → LinkedIn with `next=/connect/<handle>` → 05 → consent → request |
| Alternates | Signed in → 307 `/connect/<handle>` → 05 (works) |
| Errors | — |
| Edge cases | **Today: 307 → `/` and the handle is lost** (probed: `/u/test` → `/`). Unknown handle → 05 `notFound()`. The handle changes later and printed QR codes break (T-063). A handle in uppercase from a manual entry |
| Status | UI Partial · API Ready · DB Ready |
| E2E coverage | `e2e/onboarding/deep-links.spec.ts`: signed out `/u/<seeded>` → `/auth/linkedin?next=%2Fconnect%2F<seeded>`; with `realUser` → 05 shows the person; unknown handle → not found |
| Tickets | [T-011](backlog.md#t-011) |

## Check-in and consent

<a id="f-12"></a>
### F-12 · Check in with screen consent at the door

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee, not checked in |
| Entry | `/e/<code>/join` (IP) |
| Pre | The event is running (`isRunning`) |
| Happy path | Notice "your name and photo will appear on the event screen" (M13) → Accept → `POST …/check-in { screenConsent: true }` → 201 → `attendee.checked_in` broadcast → `/home` with the LIVE card |
| Alternates | Decline the notice → no check-in, explanation, back to the landing |
| Errors | 400 `invalid_input` (the body only accepts `screenConsent: true`, so there is no `consent_required` on this route); 409 `event_not_running`; 404 `event_not_found`; 401 → `/join` sends the person to sign in |
| Edge cases | No anonymous mode (M13). Withdrawing consent later is not possible (T-026). A check-in while already at another running event makes the newest check-in the current event (F-71) |
| Status | UI **IP** · API Ready (slug on `main`, code on IP) · DB Ready |
| E2E coverage | `e2e/events/check-in.spec.ts`: accept → appears in `/api/e/<code>/live` people; decline → not checked in; mock `consent_required`, `event_not_running` and `event_not_found` show their copy |
| Tickets | [T-020](backlog.md#t-020), [T-026](backlog.md#t-026) |

<a id="f-13"></a>
### F-13 · Auto check-in when scanning (A1)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee, not checked in |
| Entry | 05 Confirmar after scanning someone at a running event |
| Pre | The target has a current event (A2) |
| Happy path (intended) | `POST /api/connections` without consent → 409 `consent_required` → notice → retry with `screenConsent: true` → check-in to the **target's** event + request 201 |
| Alternates | Already checked in → no notice |
| Errors | `consent_required` |
| Edge cases | **Today `RegisterForm` always sends `screenConsent: true`, so consent is recorded without being asked** (gap analysis U31). The scanner is at a different event than the target, so they are checked in to the target's event. This bypasses the event-QR gate (OQ #54) |
| Status | UI Partial · API Ready · DB Ready |
| E2E coverage | `e2e/connect/register.spec.ts`: not checked in → notice shown before any check-in; accept → request sent; decline → nothing sent; checked in → no notice |
| Tickets | [T-021](backlog.md#t-021) |

<a id="f-14"></a>
### F-14 · Check-in outside the event window

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | Event door before `starts_at` or after `ends_at` |
| Pre | — |
| Happy path | — |
| Alternates | — |
| Errors | 409 `event_not_running` → copy missing (T-111) |
| Edge cases | Early arrivals at the venue are refused (OQ #22). Late joiners after the end are refused. The scan path (`createConnection`) uses `findCurrentEvent`, which also requires the window |
| Status | UI Partial · API Ready · DB Ready |
| E2E coverage | `e2e/events/window.spec.ts`: seeded future event → `event_not_running` copy with the start time in the event time zone; seeded past event → ended copy |
| Tickets | [T-024](backlog.md#t-024) |

<a id="f-15"></a>
### F-15 · Invalid or rotated event code

| Field | Detail |
| --- | --- |
| Actor | Event-QR visitor |
| Entry | Old printed QR, or a typo |
| Pre | — |
| Happy path | — |
| Alternates | — |
| Errors | `/e/<old>` → `EventNotFound` (IP) |
| Edge cases | Attendees already checked in keep working (check-in is stored). Printed QR codes become invalid after rotation (T-022). An enumeration attempt over codes faces 31^10 combinations (`lib/access-code.ts`); the door route is not rate-limited (T-036) |
| Status | UI **IP** · API **IP** · DB **IP** |
| E2E coverage | `e2e/events/door.spec.ts`: rotate via the admin fixture → the old code shows not found, the new code works, a checked-in user still sees Home |
| Tickets | [T-020](backlog.md#t-020), [T-022](backlog.md#t-022) |

## Connect

<a id="f-16"></a>
### F-16 · Show my QR

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | Dock → Conectar (`/connect`, tab Mi QR) |
| Pre | Session |
| Happy path | `GET /api/me` → `qrcode` SVG encoding `${NEXT_PUBLIC_SITE_URL}/u/<handle>` (ADR-004) |
| Alternates | Chip "Invitar" → `/invite` |
| Errors | `/api/me` fails → error page (T-004) |
| Edge cases | `NEXT_PUBLIC_SITE_URL` is unset locally, so the QR encodes `localhost:3000`. Screen brightness. A screenshot of the QR is shared: anyone can request, but the owner must accept (M6) |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/connect/my-qr.spec.ts`: the QR decodes to `<baseURL>/u/<handle>` (decode the SVG in the test); tab switch to Escanear; es and en labels |
| Tickets | — |

<a id="f-17"></a>
### F-17 · Scan in the app

| Field | Detail |
| --- | --- |
| Actor | Checked-in attendee |
| Entry | `/connect?tab=scan` |
| Pre | A camera (`BarcodeDetector`, or the lazily loaded jsQR decoder on Safari and Firefox) |
| Happy path | `getUserMedia` → decode a frame every 300 ms, one at a time → `handleFromQr` → `GET /api/users/{handle}` → person row → Conectar → 05 |
| Alternates | Native camera path (F-11) |
| Errors | `user_not_found` → `connect.notFound`; a network failure → `errorText` copy, and the same QR may be read again after 3 s |
| Edge cases | Without `BarcodeDetector` (iOS Safari, Firefox) jsQR decodes a 640 px frame (conference-load finding 10). An event QR scanned in the app is not recognized. Each handle is looked up once. The camera is not stopped on tab hide |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/client-resilience.spec.ts`: a faked camera stream of a `/u/<handle>` QR with `BarcodeDetector` removed → the person row appears (Chromium and WebKit) |
| Tickets | [T-033](backlog.md#t-033) |

<a id="f-18"></a>
### F-18 · Camera denied or unsupported

| Field | Detail |
| --- | --- |
| Actor | Attendee |
| Entry | `/connect?tab=scan` |
| Pre | Permission denied, or no `mediaDevices` |
| Happy path | — |
| Alternates | Viewfinder sentence per cause (`connect.camera`: denied, no camera, camera busy, unsupported, no decoder) pointing to the phone's camera app, plus the name search |
| Errors | — |
| Edge cases | No pre-prompt explaining why (DESIGN.md pending "Camera permission"). The permission is denied permanently in Safari settings. An insecure context (http on a LAN) |
| Status | UI Ready · API — · DB — |
| E2E coverage | `e2e/client-resilience.spec.ts`: a refused `getUserMedia` (`NotAllowedError`) → `connect.camera.denied` |
| Tickets | [T-033](backlog.md#t-033) |

<a id="f-19"></a>
### F-19 · Search by name

| Field | Detail |
| --- | --- |
| Actor | Checked-in attendee |
| Entry | Search field on the Escanear tab |
| Pre | — |
| Happy path (intended) | Type 2+ characters → `GET` search over my event's attendees → choose → 05 |
| Alternates | Today: `slugify(query)` → `GET /api/users/{slug}`, an exact handle match only |
| Errors | `user_not_found` → `connect.notFound` |
| Edge cases | Fails on handle suffixes (`-2`) and partial names (gap analysis U11). Today any signed-in user can probe handles of people at any event, an enumeration risk ([R-30](edge-cases-and-risks.md#security)). Homonyms |
| Status | UI Partial · API Missing · DB Ready |
| E2E coverage | `e2e/connect/search.spec.ts`: prefix, case and accent match; only same-event attendees; me excluded; no current event message; 429 copy |
| Tickets | [T-034](backlog.md#t-034) |

<a id="f-20"></a>
### F-20 · Non-COMPA QR or unknown handle

| Field | Detail |
| --- | --- |
| Actor | Attendee |
| Entry | Scanning any QR |
| Pre | — |
| Happy path | — |
| Alternates | A non-`/u/` QR shows `connect.invalidQr` and the scanner keeps reading |
| Errors | Unknown handle → 404 `user_not_found` → `connect.notFound`; on 05 → `notFound()` |
| Edge cases | An event QR (`/e/<code>`) should route to the door. A malicious QR with a lookalike domain: `handleFromQr` matches `/u/` on **any** origin, so `evil.com/u/x` looks up handle `x` on COMPA (harmless, but confusing) |
| Status | UI Partial · API Ready · DB — |
| E2E coverage | `e2e/qa-port.spec.ts`: fake video with a non-COMPA QR → `connect.invalidQr` (mock). Missing: event QR → door; unknown handle → not found |
| Tickets | [T-033](backlog.md#t-033) |

<a id="f-21"></a>
### F-21 · Self-scan

| Field | Detail |
| --- | --- |
| Actor | Attendee |
| Entry | Scans their own QR, or opens `/u/<own handle>` |
| Pre | — |
| Happy path | — |
| Alternates | — |
| Errors | `POST /api/connections` → 409 `self_connection` → *raw msg* (`RegisterForm`); DB check `connections_not_self_check` |
| Edge cases | 05 renders the own card before failing on Confirm. It should be refused on load |
| Status | UI Partial · API Ready · DB Ready |
| E2E coverage | `e2e/connect/register.spec.ts`: `/connect/<own handle>` → localized self message, Confirm disabled; mock `self_connection` copy in es and en |
| Tickets | [T-111](backlog.md#t-111) |

<a id="f-22"></a>
### F-22 · Target not at an event

| Field | Detail |
| --- | --- |
| Actor | Attendee |
| Entry | Scanning someone with no current event (A2) |
| Pre | — |
| Happy path | Since 2026-10-29 (owner decision): the register screen labels it "Conexión fuera de evento: sin puntos", Confirm sends a request with `event: null`; the same pending → accept flow follows, paying 0 points ([connection-flow](../../wiki/connection-flow.md#as-built-scanning-someone-outside-an-event-2026-10-29)) |
| Alternates | Repeat or reverse scan → `200` with the same request; the target is at an event → their event wins, as before |
| Errors | 409 `test_user_not_allowed` (a test user with a real user); `not_at_event` was removed |
| Edge cases | The target checked in to an event that ended a minute ago: outside an event. The scanner is at an event but the target is not: outside an event, no points. Checking in after sending does not move the request into the event |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/connect/outside-event.spec.ts`: neither at an event (UI scan and accept, labels, no points, in the list, not on the live board), repeat/reverse scan and double accept, only the scanner at an event, accept after a check-in and a later +20 reconnection, erasure and self-scan |
| Tickets | [T-111](backlog.md#t-111), [T-025](backlog.md#t-025) |

<a id="f-23"></a>
### F-23 · Event ends mid-flow

| Field | Detail |
| --- | --- |
| Actor | Requester or addressee |
| Entry | Any write after `ends_at` |
| Pre | — |
| Happy path | — |
| Alternates | — |
| Errors | Accept or decline → 409 `event_ended`; `knew` → `not_pending`; new scan → outside an event (no points); check-in → `event_not_running` |
| Edge cases | A summary draft or approve is still allowed after the end (`requireAcceptedMembership` does not check the window), which is acceptable. A pending request shows "expired" on read |
| Status | UI Partial · API Ready · DB Ready |
| E2E coverage | `e2e/requests/accept-decline.spec.ts`: `page.clock` past `ends_at` or a seeded ended event → accept shows `event_ended` copy; the requester's done page shows expired |
| Tickets | [T-032](backlog.md#t-032), [T-111](backlog.md#t-111) |

<a id="f-24"></a>
### F-24 · Already connected or duplicate scan (same event)

| Field | Detail |
| --- | --- |
| Actor | Requester |
| Entry | Scanning the same person again at the same event |
| Pre | A row exists for the pair at this event (M5) |
| Happy path | `POST` → 200 with the existing row and its status for the viewer → done page |
| Alternates | 05 shows "Ya se conocían" when `profile.connection` is accepted or a reconnection |
| Errors | — |
| Edge cases | The done page needs `GET /api/connections/{id}` (501 on `main`). After a silent decline the requester keeps seeing pending (M8) |
| Status | UI Mock-only · API Ready · DB Ready |
| E2E coverage | `e2e/connect/register.spec.ts`: second Confirm → same `connectionId`, done page shows the current state (pending or accepted), no duplicate in `/connections` |
| Tickets | [T-030](backlog.md#t-030) |

<a id="f-25"></a>
### F-25 · Simultaneous mutual scans

| Field | Detail |
| --- | --- |
| Actor | Two attendees scanning each other |
| Entry | Both press Confirmar |
| Pre | — |
| Happy path (intended) | The second POST gets the first person's pending request → routed to 06b to accept |
| Alternates | Today the second scanner gets 200 with `status: pending` and lands on the "request sent" screen. They are the addressee, but no UI tells them to accept |
| Errors | — |
| Edge cases | The unique index `connections_pair_per_event_uq` keeps one row. The second person's `knew` and topics are lost |
| Status | UI Missing · API Partial (no `direction` in the POST response) · DB Ready |
| E2E coverage | `e2e/requests/mutual.spec.ts`: `twoUsers` scan each other → one connection; the second lands on Accept |
| Tickets | [T-037](backlog.md#t-037) |

<a id="f-26"></a>
### F-26 · Reconnection across events

| Field | Detail |
| --- | --- |
| Actor | Connected peer at a new event |
| Entry | Scan at event 2 |
| Pre | An accepted connection at an earlier event |
| Happy path | `POST` creates a new row at event 2 → accept → `metAtEarlierEvent` → `reconnection` (+20) to both |
| Alternates | Either ticks "knew" → reconnection (M4) |
| Errors | — |
| Edge cases | Nobody can force `new` (M4). The earlier event must have **started earlier** (`lt(events.startsAt)`): overlapping events can mis-order |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/requests/accept-decline.spec.ts`: seeded earlier accepted connection → accept at a new event → +20 reconnection shown on done and on the big screen edge color |
| Tickets | — |

## Registration extras

<a id="f-27"></a>
### F-27 · Register kind and topics (05)

| Field | Detail |
| --- | --- |
| Actor | Requester |
| Entry | `/connect/<handle>` |
| Pre | The target exists |
| Happy path | Pick Nueva (+50) or Reencuentro (+20) → `knew`; pick up to 3 topic chips (+5) → total on the button → Confirmar |
| Alternates | No topics (allowed) |
| Errors | 400 `invalid_input` (more than 3 topics, more than 40 characters) |
| Edge cases | The chips are a free list in `lib/copy/es.ts` (`register.topics`), not `interests` (T-051). On `main` topics are **dropped** by `insertRequest` (IP stores them). +5 is never awarded (T-040). The total on the button is an estimate: the server decides the kind on acceptance (M4). The 3-chip limit is client-side, and the server also caps at 3 |
| Status | UI Partial · API Partial · DB Missing (IP `connections.topics`) |
| E2E coverage | `e2e/connect/register.spec.ts`: the fourth chip is disabled; the total updates; topics persist and show on the done page; +5 credited after accept (T-040) |
| Tickets | [T-040](backlog.md#t-040), [T-051](backlog.md#t-051) |

<a id="f-28"></a>
### F-28 · Voice note on 05

| Field | Detail |
| --- | --- |
| Actor | Requester |
| Entry | "O cuéntaselo a Compa" button |
| Pre | Microphone permission |
| Happy path | Record (`lib/audio/recorder.ts`) → stop → `POST /api/transcribe` (multipart) → transcript stored in `sessionStorage` (`rememberNote`) → after acceptance 08b drafts it |
| Alternates | Re-record. Type instead |
| Errors | Mic denied → `register.micUnavailable`; 400 `invalid_audio`; 502 `transcription_failed` → "type the note instead" |
| Edge cases | The recorder auto-stops at 120 s; the server rejects more than 120 s or 15 MB. The note is lost on a new tab, a device switch or private mode (T-054). The 15 MB request body may exceed the Vercel function body limit [Unverified]. Background tab or screen lock stops recording. Any signed-in user can transcribe, with no connection required (T-052). The note is in the speaker's language (captain decision) |
| Status | UI Partial · API Ready · DB — (by design no storage) |
| E2E coverage | `e2e/connect/voice-note.spec.ts`: Chromium fake mic → record → stop → transcribed (mock `/api/transcribe` example) → "Nota guardada"; mic denied → copy and the form still works; mock `invalid_audio` and `transcription_failed` → type-instead path; `page.clock` at 120 s → auto-stop |
| Tickets | [T-054](backlog.md#t-054), [T-052](backlog.md#t-052) |

<a id="f-29"></a>
### F-29 · Send the request → pending screen

| Field | Detail |
| --- | --- |
| Actor | Requester |
| Entry | 05 Confirmar |
| Pre | Both at the same running event |
| Happy path | `POST /api/connections` → 201 `{ connectionId, status: pending }` → `request.received` broadcast to the addressee → `/connections/<id>/done` "Solicitud enviada a …" |
| Alternates | 200 for an existing pair (F-24) |
| Errors | `user_not_found`, `self_connection`, `consent_required`, `invalid_input` → *raw msg* |
| Edge cases | **The done page calls `GET /api/connections/{id}` → 501 on `main` → error page** (gap analysis U17). A double tap is guarded by `sending`. No "knew" tick on the pending screen (T-043) |
| Status | UI Mock-only · API Ready (POST), detail IP · DB Ready |
| E2E coverage | `e2e/requests/pending.spec.ts`: Confirm → pending screen with the name; each mocked error code shows its localized copy and keeps the form |
| Tickets | [T-030](backlog.md#t-030), [T-032](backlog.md#t-032), [T-043](backlog.md#t-043) |

## Request lifecycle

<a id="f-30"></a>
### F-30 · Addressee learns about a request

| Field | Detail |
| --- | --- |
| Actor | Addressee |
| Entry | Has the app open on Home or Conexiones |
| Pre | A pending request at a running event |
| Happy path (intended, A3) | A card or badge appears live → tap → `/requests/<id>` |
| Alternates | Today: the bell count on Home from `incoming.length` (only on reload) |
| Errors | — |
| Edge cases | **The bell is not a link; `ConnectionList` does not render `incoming`; no polling or subscription** (gap analysis U15, U16). The server broadcasts `request.received` on a private channel no client joins (OQ #27). No push notifications (A3) |
| Status | UI Missing · API Ready · DB Ready |
| E2E coverage | `e2e/requests/incoming.spec.ts`: `twoUsers`, A sends → B's bell count increments within 4 s without reload → tap → `/requests/<id>`; `/connections` lists it on top |
| Tickets | [T-031](backlog.md#t-031), [T-080](backlog.md#t-080) |

<a id="f-31"></a>
### F-31 · Accept a request (06b)

| Field | Detail |
| --- | --- |
| Actor | Addressee |
| Entry | `/requests/<id>` |
| Pre | Pending, event running |
| Happy path | `GET /api/connections/{id}` + `GET /api/users/{handle}` → card, numbers, interests → Aceptar → `POST …/accept { knew? }` → kind and points to both → `request.accepted` + `connection.accepted` broadcasts → 06 |
| Alternates | Tick "we already knew each other" → reconnection |
| Errors | 403 `forbidden` (the requester tries), 404 `connection_not_found`, 409 `not_pending`, 409 `event_ended` → Spanish copy (`errorText`, `apiErrors`); no answer in 15 s → timeout copy |
| Edge cases | **The page loads through the 501 detail on `main`.** The copy says "+20 each", but the server awards the kind points (T-038). A double tap is guarded by `FOR UPDATE` + a status guard. The view `event_scores` credits both people |
| Status | UI Mock-only · API Ready · DB Ready |
| E2E coverage | `e2e/requests/accept-decline.spec.ts`: accept → 06 with +50 (new) or +20 (reconnection); double click → one award; mock `not_pending` and `event_ended` copy; requester opening `/requests/<id>` → no buttons. `e2e/client-resilience.spec.ts` (mock): a hung accept → timeout copy and the button re-enabled; `event_ended` → Spanish copy |
| Tickets | [T-030](backlog.md#t-030), [T-038](backlog.md#t-038) |

<a id="f-32"></a>
### F-32 · Decline silently ("Ahora no")

| Field | Detail |
| --- | --- |
| Actor | Addressee |
| Entry | `/requests/<id>` → Ahora no |
| Pre | Pending |
| Happy path | `POST …/decline` → 204 → `/home` (a failed decline stays with the reason; `not_pending` counts as done). The requester keeps seeing pending until the end, then expired (M8) |
| Alternates | Treat it as dismiss instead (OQ #42) |
| Errors | as F-31 |
| Edge cases | The pair cannot connect again at this event (M8; reverse scan OQ #23). The decline never appears in broadcasts or on the big screen |
| Status | UI Mock-only · API Ready · DB Ready |
| E2E coverage | `e2e/requests/accept-decline.spec.ts`: decline → Home; the requester (second context) still sees pending, then expired after `page.clock` passes `ends_at`; no decline wording anywhere for the requester. `e2e/client-resilience.spec.ts` (mock): an offline decline stays on `/requests/<id>` with `apiErrors.codes.network_error` |
| Tickets | [T-030](backlog.md#t-030), [T-039](backlog.md#t-039) |

<a id="f-33"></a>
### F-33 · Request expires at event end

| Field | Detail |
| --- | --- |
| Actor | Requester and addressee |
| Entry | Time passes `ends_at` |
| Pre | Pending |
| Happy path | No job runs. `statusForViewer` returns `expired` on read; incoming hides it (`isIncoming` requires `isRunning`) |
| Alternates | — |
| Errors | Accept or decline → `event_ended` |
| Edge cases | The stored status stays `pending` forever (no cron), so analytics on stored status are misleading. Ending an event early moves the expiry (T-023) |
| Status | UI Partial · API Ready · DB Ready |
| E2E coverage | `e2e/requests/pending.spec.ts`: seeded ended event → the done page and the list show expired; the addressee's incoming list is empty |
| Tickets | [T-032](backlog.md#t-032) |

<a id="f-34"></a>
### F-34 · Requester withdraws a pending request

| Field | Detail |
| --- | --- |
| Actor | Requester |
| Entry | Pending screen → "Cancelar solicitud" |
| Pre | Pending |
| Happy path (intended) | `DELETE /api/connections/{id}` → 204 → back |
| Alternates | — |
| Errors | `not_pending` (already answered), `forbidden` |
| Edge cases | A race with accept. Whether withdrawal frees the pair to try again (OQ #43) |
| Status | UI Missing · API Missing · DB Missing |
| E2E coverage | `e2e/requests/withdraw.spec.ts`: withdraw → disappears from B's incoming; withdraw after accept → `not_pending` copy |
| Tickets | [T-035](backlog.md#t-035) |

<a id="f-35"></a>
### F-35 · Requester ticks "we already knew each other"

| Field | Detail |
| --- | --- |
| Actor | Requester |
| Entry | Pending screen (A4) |
| Pre | Pending, running |
| Happy path | `PATCH /api/connections/{id}/knew { knew }` → 200 |
| Alternates | Set on 05 via Reencuentro (works) |
| Errors | `forbidden`, `connection_not_found`, `not_pending` |
| Edge cases | No UI calls this route |
| Status | UI Missing · API Ready · DB Ready |
| E2E coverage | `e2e/requests/pending.spec.ts`: toggle → accept → reconnection kind |
| Tickets | [T-043](backlog.md#t-043) |

## Confirmation and summaries

<a id="f-36"></a>
### F-36 · Confirmation and networks unlock (06)

| Field | Detail |
| --- | --- |
| Actor | Requester or addressee after accept |
| Entry | `/connections/<id>/done` |
| Pre | Accepted |
| Happy path | `GET /api/connections/{id}` → two monitos, +points pop, breakdown (kind, topics, note), "De qué platicaron", "Conecta con …" with the unlocked network links (relation `connected`, M12) → Listo → `/home` |
| Alternates | A note exists → link to 08b |
| Errors | 404 → `notFound()` |
| Edge cases | **501 on `main`** (IP fixes it). Hidden networks never show (visibility `hidden`). The breakdown must match the server (+5 not awarded yet, T-040). Pop animation with reduced motion |
| Status | UI Mock-only · API Mock-only (IP) · DB Ready |
| E2E coverage | `e2e/requests/accept-decline.spec.ts`: after accept both sides see the other's `connections`-level links and not the `hidden` ones; the breakdown sums to the shown total; `reducedMotion` → no pop |
| Tickets | [T-030](backlog.md#t-030), [T-040](backlog.md#t-040) |

<a id="f-37"></a>
### F-37 · Draft and approve the voice-note summary (08b)

| Field | Detail |
| --- | --- |
| Actor | Member of an accepted connection |
| Entry | `/connections/<id>/note` |
| Pre | Accepted |
| Happy path | Record or type → `POST /api/transcribe` → `POST /api/interactions/draft { connectionId, text }` → summary, topics, next steps → edit → `POST /api/interactions/{id}/approve` → +15 → `summary.approved` broadcast → `/people/<handle>` |
| Alternates | Note from 05 in `sessionStorage` is drafted automatically. Re-record. Edit |
| Errors | `connection_not_accepted`, `not_found`, 502 `summary_failed`, `fallback: true` (own text kept), `not_substantive` (cannot approve), `already_approved`, `not_author` → `note.failed` or *raw msg* |
| Edge cases | **The page loads through the 501 detail on `main`.** Every draft inserts a row (T-057), and drafts are unlimited (T-052). The view credits +15 to **both** (T-050). PII and hallucination (T-055). "Recordar" has no handler (T-056). The summary is in the speaker's language. Approve edits are capped at 1 200 characters (DB check) |
| Status | UI Mock-only · API Ready · DB Ready |
| E2E coverage | `e2e/summaries/note.spec.ts`: type → draft (mock example) → approve → +15; mock `fallback`, `notSubstantive` examples; `summary_failed`, `already_approved`, `not_author` error copy; double approve → one award |
| Tickets | [T-030](backlog.md#t-030), [T-050](backlog.md#t-050), [T-052](backlog.md#t-052), [T-055](backlog.md#t-055), [T-056](backlog.md#t-056) |

<a id="f-38"></a>
### F-38 · Read, edit or delete a saved summary

| Field | Detail |
| --- | --- |
| Actor | Either member (read); author (edit, delete) |
| Entry | 08 "La última vez" → 08b |
| Pre | Approved summary |
| Happy path | `GET /api/connections/{id}` → `interaction` → read |
| Alternates | Edit or delete (missing) |
| Errors | — |
| Edge cases | Who may read the author's summary is undecided (OQ #50). Deleting it affects points (OQ #49) |
| Status | UI Mock-only · API Missing (edit, delete; read is IP) · DB Ready |
| E2E coverage | `e2e/summaries/note.spec.ts`: the author edits without new points; delete; the non-author sees a read-only view (or none, per OQ #50) |
| Tickets | [T-030](backlog.md#t-030), [T-053](backlog.md#t-053) |

## Connections and profiles

<a id="f-39"></a>
### F-39 · Connections list, filters and search (07)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | Dock → Conexiones |
| Pre | Session |
| Happy path | `GET /api/me` + `GET /api/connections` → grouped by person (A7) → row → 08 |
| Alternates | Kind filter Todas / Nueva / Reencuentro / Amigo; event chip |
| Errors | List failed → error page (T-004) |
| Edge cases | `type` and `topics` are not filled, so the Amigo filter is always empty (gap analysis U19, OQ #40). The search icon and the event chip do nothing. `incoming` is not rendered (T-031). Empty → `connections.empty`. A long list has no pagination |
| Status | UI Partial · API Partial · DB Ready |
| E2E coverage | `e2e/connections/list.spec.ts`: seeded 3 people → rows grouped with meetings; filter by kind; search by name; event chip; empty state copy; 390 and 1440 |
| Tickets | [T-060](backlog.md#t-060), [T-061](backlog.md#t-061), [T-031](backlog.md#t-031) |

<a id="f-40"></a>
### F-40 · Another person's profile (08)

| Field | Detail |
| --- | --- |
| Actor | Any signed-in user (connected peer or not) |
| Entry | `/people/<handle>` |
| Pre | Session |
| Happy path | `GET /api/users/{handle}` → card filtered by relation (`public`, `connected`, `self`) → badges shelf, relation numbers, "La última vez" |
| Alternates | Not connected → public fields only, pill "Sin conectar". Pending → "Pendiente" |
| Errors | `user_not_found` → `notFound()` |
| Edge cases | `scores`, `badges`, `relationship` and `lastInteraction` are never filled (gap analysis U20). Links set to `hidden` never show, even to peers. Badges link `?of=` is ignored (T-064). Any signed-in user can open any profile by handle ([R-30](edge-cases-and-risks.md#security)). Blocked users (T-041) |
| Status | UI Partial · API Partial · DB Ready |
| E2E coverage | `e2e/profiles/other.spec.ts`: a stranger sees public fields only; a peer sees `connections` links; a `hidden` link is absent for both; unknown handle → not found |
| Tickets | [T-060](backlog.md#t-060), [T-064](backlog.md#t-064), [T-041](backlog.md#t-041) |

<a id="f-41"></a>
### F-41 · My profile (09)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | Dock → Perfil (`/me`) |
| Pre | Session |
| Happy path | `GET /api/me` → monito, name, job title, city, points and rank, badges shelf, numbers, network toggles, links to Ranking and Mi monito, QR and edit |
| Alternates | Pick Todos / Conexiones / Solo yo for a link → `PATCH /api/me/visibility` (`MyLinks`) |
| Errors | Toggle save failed → should revert (`me` copy) |
| Edge cases | `scores`, `stats` and `badges` are not filled (0 or "—"). **No sign-out button** (T-062). No delete account or export (T-100, T-101) |
| Status | UI Partial · API Partial · DB Partial |
| E2E coverage | `e2e/profiles/me.spec.ts`: real points and rank after a seeded accept; toggle on → the peer sees the link; toggle failure (mock `invalid_input`) reverts |
| Tickets | [T-060](backlog.md#t-060), [T-062](backlog.md#t-062) |

<a id="f-42"></a>
### F-42 · Edit my profile and network visibility

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | `/me` → Editar → `/onboarding/profile?from=me` |
| Pre | — |
| Happy path | As F-07 → back to `/me` |
| Alternates | — |
| Errors | `invalid_input` |
| Edge cases | Setting `name` sets `name_edited`, so LinkedIn stops overwriting it (M14). Name and photo are always public; email is never shown (M12). Editing interests has no UI (T-065). `photoUrl` accepts any URL (T-016) |
| Status | UI Partial · API Partial · DB Partial |
| E2E coverage | `e2e/profiles/me.spec.ts`: edit name → still edited after a re-login sync; city saved; interests saved (T-065) |
| Tickets | [T-015](backlog.md#t-015), [T-016](backlog.md#t-016), [T-065](backlog.md#t-065) |

<a id="f-43"></a>
### F-43 · Change my monito

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | `/me` → monito → `/onboarding/monito?from=me` |
| Pre | — |
| Happy path | As F-08 → back to `/me` |
| Alternates | — |
| Errors | as F-08 |
| Edge cases | Dropped on `main` |
| Status | UI Mock-only · API Mock-only (IP) · DB Missing (IP) |
| E2E coverage | `e2e/onboarding/monito.spec.ts` (the `from=me` variant) |
| Tickets | [T-015](backlog.md#t-015) |

## Badges, ranking and invites

<a id="f-44"></a>
### F-44 · Badges (10)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | `/me/badges` |
| Pre | — |
| Happy path | `GET /api/badges` → 20 badges with earned date or progress; filter Todas / Ganadas / Por ganar; "N a punto · N secretas" |
| Alternates | `?of=<handle>` for others (ignored, T-064) |
| Errors | **501 on `main` → page throws** (probed 501) |
| Edge cases | Secret badges show no hint or progress. "NUEVA" sticker missing (T-071). Badge names are Spanish only (`lib/badges/catalog.ts`). Computed on read in IP, several queries per call |
| Status | UI Mock-only · API Mock-only (IP) · DB — |
| E2E coverage | `e2e/gamification/badges.spec.ts`: a new user has all locked; after the first accept "Primer apretón" is earned; filters; secret without a hint; es and en names |
| Tickets | [T-070](backlog.md#t-070), [T-071](backlog.md#t-071), [T-064](backlog.md#t-064) |

<a id="f-45"></a>
### F-45 · Ranking tonight (11)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | `/ranking` |
| Pre | A current event |
| Happy path | `GET /api/events/{slug}/leaderboard?scope=event` → podium of 3, my card with the gap to the next, the row above, Conectar ahora |
| Alternates | — |
| Errors | No event → hard-coded `founders-fest` (exists in production today, so the page renders the wrong event for people elsewhere) |
| Edge cases | `me` is not filled (T-073). Ties are ordered by connections, then check-in time (data model §4.4). Everyone checked in is ranked; no opt-out (OQ #46). Confetti with reduced motion |
| Status | UI Partial · API Partial · DB Ready |
| E2E coverage | `e2e/gamification/ranking.spec.ts`: seeded points → podium order; `me` row and gap; equal points; no current event → all-year only; reduced motion |
| Tickets | [T-073](backlog.md#t-073), [T-025](backlog.md#t-025), [T-077](backlog.md#t-077) |

<a id="f-46"></a>
### F-46 · Ranking all year (11)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | `/ranking` toggle "Todo el año" |
| Pre | — |
| Happy path | `…/leaderboard?scope=lifetime` → `lifetime_scores` |
| Alternates | — |
| Errors | — |
| Edge cases | On `main` `scope` is ignored and returns the event board (probed: 200 with `scope=lifetime`). The route still needs an event in its path (T-072) |
| Status | UI Mock-only · API Partial (IP) · DB Ready |
| E2E coverage | `e2e/gamification/ranking.spec.ts`: two seeded events → the all-year total differs from tonight's |
| Tickets | [T-072](backlog.md#t-072) |

<a id="f-47"></a>
### F-47 · Share my invite (12)

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | Home invite card, or the chip on 04 → `/invite`; always shown |
| Pre | — |
| Happy path | `GET /api/invites/me` → `link` (code = handle, url, `event` = where a friend joining now pays +100, or null), 4 slots, golden-cap reward → before the share buttons, "+100 pts en <event>" or "Estás fuera de un evento: cuentan para la gorra dorada, pero no suman puntos" → Copiar (clipboard) or share (WhatsApp, Instagram, Más via `navigator.share`) |
| Alternates | "Mostrar mi QR de invitación" → 04. Golden cap earned: the prize card shows my own picture wearing it and a switch to wear or hide it (`PATCH /api/me {showAccessories}`) |
| Errors | **501 on `main` → page throws** (probed) |
| Edge cases | Clipboard denied → select the text (DESIGN.md). `navigator.share` is unavailable on desktop. Instagram has no web share target |
| Status | UI Mock-only · API Mock-only (IP) · DB Missing (IP) |
| E2E coverage | `e2e/gamification/invites.spec.ts`: code = handle with "+100 pts at <event>" inside an event and the no-points notice outside one (page, home card, 04 chip); Copiar puts it on the clipboard (`permissions: ['clipboard-read','clipboard-write']`); denied clipboard → selectable text; desktop without `navigator.share` → fallback |
| Tickets | [T-074](backlog.md#t-074) |

<a id="f-48"></a>
### F-48 · Invite claim and reward

| Field | Detail |
| --- | --- |
| Actor | Invitee and inviter |
| Entry | F-09 |
| Pre | Claim recorded |
| Happy path | Claim → +100 to the inviter on the event they are checked in to **at that moment** (nothing outside an event) → the friend's first accepted connection anywhere → +50 to them → 3 friends joined (in or out of events) → golden cap, worn on the monito and drawn over the photo everywhere (`accessories`) |
| Alternates | — |
| Errors | `not_found`, `referral_not_new` |
| Edge cases | One row per friend (unique invitee): a repeated or concurrent claim pays once. Fake-account farming with fresh accounts (OQ #48). A person who already checked in to an event is refused. A link from before referral codes whose friend had not connected yet still pays +100 at that link's event on the friend's first connection there |
| Status | UI Missing · API Mock-only (IP routes, no reward) · DB Missing |
| E2E coverage | `e2e/gamification/invites.spec.ts`: claim in an event → +100 there once, then the friend's first accept → +50; claim outside an event → 0 pts but counts; a regular cannot be referred; three friends → golden cap over the photo, on the monito and on the leaderboard row, stored look unchanged; the switch hides it |
| Tickets | [T-075](backlog.md#t-075), [T-076](backlog.md#t-076) |

## Notifications

<a id="f-49"></a>
### F-49 · Bell and notifications

| Field | Detail |
| --- | --- |
| Actor | Signed-in attendee |
| Entry | Home bell |
| Pre | — |
| Happy path (intended) | The count of unseen items → tap → list (requests, acceptances, invitee connected, badge earned) |
| Alternates | Live on every attendee screen: the private Realtime channel `user:<id>` pokes the app, which refetches `GET /api/notifications` (bell, a toast) and the incoming cards (`GET /api/connections`, otherwise polled every 3 s by `usePoll`, T-031); polling every 3 s when Realtime is down, every 30 s as a safety net when it is up. Web Push alerts (`/notifications` → "Turn on alerts") when the app is closed |
| Errors | Push unsupported, blocked, or iPhone outside an installed Home Screen app: the alerts card says why and the in-app alerts keep working |
| Edge cases | Declines never appear and never notify (M8). Opening the list marks seen through the newest item; the seen mark never moves backwards or into the future, and other tabs clear at once (`notifications.seen`). A badge that lands with an acceptance never hides it in the toast. Sign-out turns push off for that browser; a browser that signs in as someone else moves its subscription to them |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/notifications/live.spec.ts` (real mode, two browsers): request arrives in under 2 s by Realtime and push; accept reaches the requester in under 2 s; another person's channel is refused; polling delivers with Realtime blocked; a decline never notifies; the alerts card at 390 |
| Tickets | [T-031](backlog.md#t-031), [T-080](backlog.md#t-080), [T-081](backlog.md#t-081) |

<a id="f-50"></a>
### F-50 · Acceptance notice to the requester

| Field | Detail |
| --- | --- |
| Actor | Requester |
| Entry | The pending screen is open, or the app elsewhere |
| Pre | The addressee accepts |
| Happy path (intended, A4) | "Connected! +N" appears live and the networks unlock |
| Alternates | Polling |
| Errors | — |
| Edge cases | The pending screen re-renders on `request.accepted` from the private channel, else on its 3 s poll; the toast and push say "<name> accepted your request" |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/notifications/live.spec.ts`: requester screen flips to "Conectaste con …" with the points (+50 new) within 2 s |
| Tickets | [T-032](backlog.md#t-032), [T-081](backlog.md#t-081) |

## Big screen

<a id="f-51"></a>
### F-51 · Big screen opens (gated)

| Field | Detail |
| --- | --- |
| Actor | Projector viewer |
| Entry | `https://compa.lol/e/<code>/live` (IP) |
| Pre | The event exists |
| Happy path | `GET /api/e/{code}/live` (1 s shared cache) → network visualization (`components/live/Loom.tsx`), counters (checked in, connections, new, reconnections), color by kind (M16) |
| Alternates | Realtime `event:<slug>:live` messages (the topic is still keyed by slug in `lib/realtime.ts`) |
| Errors | Unknown code → not found. A 404 after the page loaded (code rotated) keeps the board with `live.codeChanged`; a failed or hung poll (8 s timeout) shows `live.staleFor`; a failed render retries every 10 s (`error.tsx`) |
| Edge cases | On `main`, `/live/<slug>` returns 404 and `/api/events/<slug>/live` is public by guessable slug (probed 200; T-092). Name and photo only, never email or a decline (A6) |
| Status | UI **IP** · API **IP** · DB **IP** |
| E2E coverage | `e2e/live/big-screen.spec.ts` (`live-1920` project): counters match the seeded data; a new accept in another context adds an edge within 3 s; unknown code → not found; no email in the DOM or the network payloads. `e2e/live/projector-resilience.spec.ts` (mock): a 404 poll keeps the board with the code-changed pill; a hung poll shows the stale pill with one request in flight, then clears |
| Tickets | [T-090](backlog.md#t-090), [T-092](backlog.md#t-092) |

<a id="f-52"></a>
### F-52 · Big screen with an empty event

| Field | Detail |
| --- | --- |
| Actor | Projector viewer |
| Entry | As F-51, before anyone connects |
| Pre | Zero or few check-ins |
| Happy path | People only, no edges; counters at 0 (DESIGN.md states) |
| Alternates | Seed data to warm the screen (T-028) |
| Errors | — |
| Edge cases | Production `founders-fest` has 0 attendees today (probed) |
| Status | UI **IP** · API Ready · DB Ready |
| E2E coverage | `e2e/live/big-screen.spec.ts`: empty event → empty-state copy, no JS errors. Mock scenarios **covered** by `e2e/live/live-board.spec.ts`: zero, upcoming, one attendee, quiet, ended, after the event |
| Tickets | [T-090](backlog.md#t-090), [T-028](backlog.md#t-028) |

<a id="f-53"></a>
### F-53 · Big screen with many nodes, for hours

| Field | Detail |
| --- | --- |
| Actor | Projector viewer |
| Entry | As F-51 |
| Pre | 300+ people |
| Happy path | Stays readable at 1920×1080 from 10 m and smooth |
| Alternates | — |
| Errors | Snapshot fetch failures → keep the last snapshot, reconnect |
| Edge cases | The snapshot sends every attendee and every edge on each poll (`lib/server/live.ts`). Photos 404 when LinkedIn URLs expire (OQ #21). Memory growth over hours. Screen sleep |
| Status | UI **IP** · API Partial · DB Ready |
| E2E coverage | `e2e/live/big-screen.spec.ts` `@load`: 500 seeded nodes → frame budget; 3 failed polls → "reconnecting" → recovers. Mock scenarios **covered** by `e2e/live/live-board.spec.ts`: 2,500 people and 4,000 links stay responsive; failed polls → "Reconnecting… last update" with backoff → recovers; stuck and out-of-order snapshots |
| Tickets | [T-091](backlog.md#t-091), [T-093](backlog.md#t-093) |

<a id="f-54"></a>
### F-54 · Big screen person card and leaderboard

| Field | Detail |
| --- | --- |
| Actor | Projector viewer |
| Entry | Click a node; click empty space |
| Pre | — |
| Happy path | `GET …/live/people/{userId}` → public card, event points, connections, rank; empty click → `GET …/leaderboard` (A5) |
| Alternates | — |
| Errors | `attendee_not_found` |
| Edge cases | Public fields only (viewer anonymous) |
| Status | UI **IP** · API Ready · DB Ready |
| E2E coverage | `e2e/live/big-screen.spec.ts`: click a node → the card shows public fields only; empty click → the leaderboard order matches the API. Mock scenarios **covered** by `e2e/live/live-board.spec.ts`: leaderboard row → card → back; failing card → message; ties share a place |
| Tickets | [T-090](backlog.md#t-090) |

## Admin and organizer

<a id="f-55"></a>
### F-55 · Admin creates an event

| Field | Detail |
| --- | --- |
| Actor | Admin |
| Entry | Today: `curl -X POST /api/admin/events` with a session; intended: `/admin/events` |
| Pre | `users.is_admin` |
| Happy path | `POST { name, slug, startsAt, endsAt }` → 201 (IP: + `access_code`) |
| Alternates | `db/seed.ts` with `SEED_DEMO=1` (`founders-fest`) |
| Errors | `invalid_input`, 401, 403 `forbidden`, 409 `slug_taken` |
| Edge cases | Slug auto-fills from the name and is checked live; time zone (T-024) |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/admin/console.spec.ts` (@mock: new-event slug, list, QR tab), `e2e/admin/poster.spec.ts` (@mock: poster links from the header and QR panel, big logo, the exact caption in both languages, one screen with no scroll, large still uncovered QR, iPad landscape, reduced motion, unknown event) and `e2e/admin/api.spec.ts` (@real: create, `slug_taken`, non-admin 404) |
| Tickets | [T-023](backlog.md#t-023) |

<a id="f-56"></a>
### F-56 · Admin rotates the access code

| Field | Detail |
| --- | --- |
| Actor | Admin |
| Entry | Intended: the console button |
| Pre | — |
| Happy path | `POST /api/admin/events/{slug}/rotate-code` (IP) → new code → reprint QR |
| Alternates | — |
| Errors | 403 |
| Edge cases | Existing check-ins keep working; old printed QR codes stop working |
| Status | UI Ready · API Ready · DB Ready |
| E2E coverage | `e2e/admin/console.spec.ts` (@mock: rotate confirm warns that printed QR codes stop working); `e2e/events/door.spec.ts` (see F-15) |
| Tickets | [T-022](backlog.md#t-022), [T-023](backlog.md#t-023) |

<a id="f-57"></a>
### F-57 · Admin edits, ends early or archives an event

| Field | Detail |
| --- | --- |
| Actor | Admin |
| Entry | Console |
| Pre | — |
| Happy path (intended) | `PATCH` name or window; "End now" → `ends_at = now`; archive |
| Alternates | — |
| Errors | `invalid_input` (window), 403 |
| Edge cases | Hard delete cascades and erases scores (FK). Pending requests expire on end (OQ #56) |
| Status | UI Ready · API Ready · DB Ready (`events.status` includes `archived`) |
| E2E coverage | `e2e/admin/console-real.spec.ts` (@real: End now, Archive, Restore through the row menus); `e2e/admin/api.spec.ts` (@real: lifecycle routes). Still open: pending request shows expired after End now |
| Tickets | [T-023](backlog.md#t-023) |

<a id="f-58"></a>
### F-58 · Admin seed or demo toggle

| Field | Detail |
| --- | --- |
| Actor | Admin |
| Entry | Console |
| Pre | — |
| Happy path (intended) | Toggle hides seed people from `/live` and the leaderboards (plan p. 13, OQ #17) |
| Alternates | — |
| Errors | — |
| Edge cases | No seed-user concept exists. `users` needs an `auth.users` row, so seeds cannot be created without Supabase Admin (`db/seed.ts` comment) |
| Status | UI Missing · API Missing · DB Missing |
| E2E coverage | `e2e/live/big-screen.spec.ts` |
| Tickets | [T-028](backlog.md#t-028) |

<a id="f-59"></a>
### F-59 · Admin moderation (hide, ban, reports)

| Field | Detail |
| --- | --- |
| Actor | Admin |
| Entry | Console |
| Pre | — |
| Happy path (intended) | Hide a person from `/live`; reset an abusive photo; ban; review reports |
| Alternates | Today: SQL in the Supabase console |
| Errors | — |
| Edge cases | An abusive photo on a projector in front of the audience ([R-07](edge-cases-and-risks.md#abuse-and-safety)) |
| Status | UI Missing · API Missing · DB Missing |
| E2E coverage | `e2e/admin/moderation.spec.ts` |
| Tickets | [T-104](backlog.md#t-104), [T-042](backlog.md#t-042) |

<a id="f-60"></a>
### F-60 · Admin bootstrap (first admin)

| Field | Detail |
| --- | --- |
| Actor | Captain |
| Entry | Terminal |
| Pre | The person signed in once |
| Happy path | `SEED_ADMIN_HANDLE=<handle> bun run db:seed` |
| Alternates | SQL `update users set is_admin = true` |
| Errors | "no user with handle" |
| Edge cases | Needs database credentials on a laptop. No audit (T-029) |
| Status | UI — · API Partial · DB Ready |
| E2E coverage | `e2e/admin/events.spec.ts` (allowlisted user after T-029) |
| Tickets | [T-029](backlog.md#t-029) |

## Account and privacy

<a id="f-61"></a>
### F-61 · Sign out

| Field | Detail |
| --- | --- |
| Actor | Signed-in user |
| Entry | Intended: `/me` → Cerrar sesión |
| Pre | — |
| Happy path | `POST /api/auth/signout` → 204 → `/` |
| Alternates | — |
| Errors | 401 (already signed out) → treat as success |
| Edge cases | No button exists. `sessionStorage` notes persist (T-062). A shared or borrowed phone at the event (T-105) |
| Status | UI Missing · API Ready · DB — |
| E2E coverage | `e2e/account/session.spec.ts`: sign out → `/home` redirects; the note draft is cleared |
| Tickets | [T-062](backlog.md#t-062), [T-105](backlog.md#t-105) |

<a id="f-62"></a>
### F-62 · Session expiry mid-flow

| Field | Detail |
| --- | --- |
| Actor | Signed-in user |
| Entry | Any screen after the access token expires |
| Pre | — |
| Happy path (intended) | Silent refresh; else re-auth with `next` back to the same screen |
| Alternates | — |
| Errors | 401 `unauthorized` → *raw msg* in client components; the `(app)` layout redirects to `/` |
| Edge cases | No proxy refreshes the cookie [Inference] (T-006). A 401 during 05 loses the topics and the recorded note |
| Status | UI Missing · API Partial · DB — |
| E2E coverage | `e2e/account/session.spec.ts`: an expired cookie on `/connect/<h>` → re-auth → back to the same path |
| Tickets | [T-006](backlog.md#t-006), [T-004](backlog.md#t-004) |

<a id="f-63"></a>
### F-63 · Delete my account

| Field | Detail |
| --- | --- |
| Actor | Signed-in user |
| Entry | Intended: `/me` → settings |
| Pre | — |
| Happy path (intended) | Confirm → `DELETE /api/me` → anonymize or delete per OQ #24 → signed out |
| Alternates | — |
| Errors | — |
| Edge cases | Cascade: `auth.users` → `users` → `event_attendees` → `connections` → `interactions`, so other people's points and history change. `events.created_by` has no cascade, so deletion fails for event creators |
| Status | UI Missing · API Missing · DB Partial (cascades exist, policy undecided) |
| E2E coverage | `e2e/account/delete-export.spec.ts` |
| Tickets | [T-100](backlog.md#t-100) |

<a id="f-64"></a>
### F-64 · Export my data

| Field | Detail |
| --- | --- |
| Actor | Signed-in user |
| Entry | Settings |
| Pre | — |
| Happy path (intended) | `GET /api/me/export` → JSON download |
| Alternates | — |
| Errors | 429 |
| Edge cases | The other person's hidden fields must not leak |
| Status | UI Missing · API Missing · DB — |
| E2E coverage | `e2e/account/delete-export.spec.ts` |
| Tickets | [T-101](backlog.md#t-101) |

<a id="f-65"></a>
### F-65 · Block or report a person

| Field | Detail |
| --- | --- |
| Actor | Signed-in user |
| Entry | `/people/<handle>` menu; `/requests/<id>` |
| Pre | — |
| Happy path (intended) | Block → they cannot request me or find me. Report → admins review |
| Alternates | Today: decline (silent), with no way to stop repeat requests at the next event |
| Errors | — |
| Edge cases | Harassment by repeated scans across events ([R-03](edge-cases-and-risks.md#abuse-and-safety)) |
| Status | UI Missing · API Missing · DB Missing |
| E2E coverage | `e2e/account/block-report.spec.ts` |
| Tickets | [T-041](backlog.md#t-041), [T-042](backlog.md#t-042) |

## System

<a id="f-66"></a>
### F-66 · Offline and slow network

| Field | Detail |
| --- | --- |
| Actor | Any |
| Entry | Venue Wi-Fi drops |
| Pre | — |
| Happy path (intended) | "Sin conexión" banner; writes disabled; cached reads (DESIGN.md) |
| Alternates | — |
| Errors | `apiCall` throws `network_error` → *raw msg* |
| Edge cases | A slow transcription upload of 15 MB on venue Wi-Fi. A server page fetch timing out. No loading skeletons (T-004) |
| Status | UI Partial · API — · DB — |
| E2E coverage | `e2e/system/resilience.spec.ts`: `setOffline(true)` → banner, writes disabled; a delayed route → skeleton |
| Tickets | [T-112](backlog.md#t-112), [T-004](backlog.md#t-004) |

<a id="f-67"></a>
### F-67 · Server 500, 501 or unexpected error

| Field | Detail |
| --- | --- |
| Actor | Any |
| Entry | Any page |
| Pre | — |
| Happy path (intended) | A localized error with Retry |
| Alternates | — |
| Errors | `internal_error`, `not_implemented` (501 on `/api/badges`, `/api/invites/me`, `/api/connections/{id}`, probed) |
| Edge cases | **No `error.tsx` or `global-error.tsx` in the app**, so the Next.js default error page shows |
| Status | UI Missing · API Partial · DB — |
| E2E coverage | `e2e/system/resilience.spec.ts`: mock 500 on each page's fetch → error component and Retry |
| Tickets | [T-004](backlog.md#t-004), [T-007](backlog.md#t-007) |

<a id="f-68"></a>
### F-68 · Rate limits hit

| Field | Detail |
| --- | --- |
| Actor | Any signed-in user |
| Entry | Rapid scans, AI calls, searches |
| Pre | — |
| Happy path (intended) | 429 `rate_limited` with `Retry-After` → copy |
| Alternates | — |
| Errors | — |
| Edge cases | Limited by user id, never IP (a venue shares one NAT). Per minute: 30 scans, 10 transcriptions, 10 drafts; per day: 60 transcriptions; caps: 300 new requests per event, 5 drafts per connection (`lib/api/rate-limits.ts`). Windowed limits count every request and return 429 `rate_limited` with `Retry-After`; the two caps count stored rows and return 429 `limit_reached` with no `Retry-After`. Search is not limited yet (no attendee search route, T-034) |
| Status | UI Partial (scan and note screens show `common.rateLimited` or `common.limitReached`) · API Ready · DB Ready (`rate_limit_counters`) |
| E2E coverage | `e2e/system/rate-limits.spec.ts` |
| Tickets | [T-036](backlog.md#t-036), [T-052](backlog.md#t-052) |

<a id="f-69"></a>
### F-69 · Realtime vs polling updates

| Field | Detail |
| --- | --- |
| Actor | Phones and the big screen |
| Entry | — |
| Pre | — |
| Happy path (intended) | Private `user:<id>` channels for requests; public `event:<slug>:live` for the big screen; polling every 3 s as the fallback |
| Alternates | — |
| Errors | A broadcast fails → logged, never fails the request (`lib/realtime.ts`) |
| Edge cases | No client subscribes or polls on `main`. Realtime Authorization is unverified (OQ #27). The live topic uses the slug, which leaks it when the code gates the routes [Inference] |
| Status | UI Missing · API Partial · DB — |
| E2E coverage | Covered by `e2e/requests/incoming.spec.ts` and `e2e/live/big-screen.spec.ts` |
| Tickets | [T-031](backlog.md#t-031), [T-081](backlog.md#t-081) |

<a id="f-70"></a>
### F-70 · Time zones and the event window display

| Field | Detail |
| --- | --- |
| Actor | Any |
| Entry | "hasta las 22:00" on Home, ranking and the big screen |
| Pre | — |
| Happy path (intended) | Event-local time with the UI locale |
| Alternates | — |
| Errors | — |
| Edge cases | `lib/format.ts` hard-codes `es-MX`. No `events.time_zone`. `Me.currentEvent` lacks `endsAt` (gap analysis §3). The demo event is "Founders Fest Madrid" while the team is in Guadalajara |
| Status | UI Partial · API Partial · DB Missing |
| E2E coverage | `e2e/events/window.spec.ts`: `timezoneId: 'Europe/Madrid'` vs `'America/Mexico_City'` → the same event-local time |
| Tickets | [T-024](backlog.md#t-024) |

<a id="f-71"></a>
### F-71 · Overlapping events

| Field | Detail |
| --- | --- |
| Actor | An attendee checked in to two running events |
| Entry | — |
| Pre | — |
| Happy path | The latest check-in wins (`findCurrentEvent`) |
| Alternates | — |
| Errors | — |
| Edge cases | A scan creates the request at the **target's** current event, which may differ from mine. Reconnection ordering uses `starts_at` |
| Status | UI Partial · API Partial · DB Ready |
| E2E coverage | `e2e/events/check-in.spec.ts` |
| Tickets | [T-027](backlog.md#t-027) |

<a id="f-72"></a>
### F-72 · Language detection

| Field | Detail |
| --- | --- |
| Actor | Any |
| Entry | First load |
| Pre | — |
| Happy path (intended) | `Accept-Language` or `navigator.languages`: `es*` → Spanish, otherwise English. No URL language and no picker (captain decision) |
| Alternates | The OS language changes → the next load follows it |
| Errors | Error messages by `code` |
| Edge cases | Only `lib/copy/es.ts` on `main`; IP adds `en` for the landing and the door. `lang="es"` is hard-coded. AI text stays in the speaker's language. The LinkedIn `locale` claim is ignored by design |
| Status | UI **IP** (landing only) · API Ready · DB Ready |
| E2E coverage | `e2e/system/i18n.spec.ts`: `es-MX`, `es-ES` → Spanish; `en-US`, `fr-FR`, `*` → English; every screen; every error code |
| Tickets | [T-110](backlog.md#t-110), [T-111](backlog.md#t-111) |

<a id="f-73"></a>
### F-73 · Accessibility and reduced motion

| Field | Detail |
| --- | --- |
| Actor | Any |
| Entry | — |
| Pre | — |
| Happy path (intended) | Keyboard and screen-reader paths; AA contrast; animations off under `prefers-reduced-motion` |
| Alternates | — |
| Errors | — |
| Edge cases | Dock labels and `aria-label` are hard-coded Spanish (`Dock.tsx`). The camera view has no text alternative. Toggles use `aria-pressed` (good) |
| Status | UI Partial · API — · DB — |
| E2E coverage | `e2e/system/a11y.spec.ts`: axe per screen; keyboard-only register and accept; `reducedMotion: 'reduce'` snapshots |
| Tickets | [T-113](backlog.md#t-113) |

<a id="f-74"></a>
### F-74 · Responsive layouts (390, 834, 1440, 1920)

| Field | Detail |
| --- | --- |
| Actor | Any |
| Entry | Tablet or desktop browser; projector |
| Pre | — |
| Happy path (intended) | A phone-first column at 390; a centered or two-column layout at 834 and 1440; `/e/<code>/live` at 1920 (captain decision) |
| Alternates | — |
| Errors | — |
| Edge cases | `Welcome` and screens are capped at `max-w-[390px]`. The dock is 327 px wide |
| Status | UI Partial · API — · DB — |
| E2E coverage | `e2e/system/responsive.spec.ts`: every screen in the 390, 834 and 1440 projects, with no horizontal scroll and screenshot comparison |
| Tickets | [T-114](backlog.md#t-114), [T-090](backlog.md#t-090) |

Related: [README](README.md), [actors and permissions](actors-and-permissions.md), [edge cases and risks](edge-cases-and-risks.md), [backlog](backlog.md), [gap analysis](../backend-gap-analysis.md), [DESIGN.md](../../DESIGN.md).
