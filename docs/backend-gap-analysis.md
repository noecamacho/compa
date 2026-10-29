# Backend gap analysis: V2 design vs approved specs vs code

Date: 2026-10-29 (revised at 09:05 after PRs #14, #15 and #17) · Ticket: `COMPA-<TBD>` · For the captain and the backend owner · Baseline: branch `docs/COMPA-TBD-design-and-gaps` @ `e3d604f` (includes `main` with the V2 screens).

Sources compared:

- **V2:** `design/compa-v2/README.md` and the screen mocks (product and UX; see [DESIGN.md](../DESIGN.md)).
- **Specs:** [data model](specs/2026-10-29-data-model.md) (M1–M18), [API](specs/2026-10-29-api.md) (A1–A9), [AI summaries contract](contracts/ai-summaries-api.md).
- **Code:** `app/(app)/**` (screens), `components/**`, `lib/api/*`, `lib/server/*`, `lib/ai/*`, `db/schema.ts`, `drizzle/*.sql`.

How it was verified:

- For each screen, I read which endpoints its page and components call, then read the server handler behind each endpoint. **`lib/server/*` did not change in PRs #14–#17**: new fields and routes exist in the contract (`lib/api/schemas.ts`, `lib/api/routes.ts`) and in mock examples only.
- Production was probed at 09:04 local time, after the redeploy:
  - Every `app/(app)` page returns 307 to `/` without a session.
  - `/i/abc` returns 307 to `/auth/linkedin?next=/onboarding/profile?invite=abc`.
  - `/e/founders-fest`, `/live` and `/live/founders-fest` return 404.
  - `/api/badges`, `/api/invites/me` and `GET /api/connections/{id}` return **501 `not_implemented`**.
  - `/api/events/founders-fest` returns 404: **production still has no event**.
  - In mock mode (`x-compa-mock: 1`), the new routes return their examples.
- Not verified: a signed-in session in production, so pages were not rendered with real data. Real-mode page behavior is inferred from the code path: `apiGet` throws on any non-2xx response, and `apiGetOrNull` turns only 404 into `null`.

Status legend, measured **end to end in real mode** (page + API + database):

- **Ready:** works for a real signed-in user.
- **Partial:** works, but data or behavior the screen shows is missing or silently dropped.
- **Mock-only:** the screen renders only in mock mode. In real mode a route answers 501, or the server ignores the field, so the page errors or the change is lost.
- **Missing:** no page or no server support.
- **Conflict:** V2 and the approved specs disagree, so the captain must decide.

Effort: **S** < 1 h, **M** 1–3 h, **L** > 3 h.

## 1. Use-case catalogue

| # | Use case (screen → route) | Status | Endpoints the screen calls | What is lacking in real mode | Effort |
| --- | --- | --- | --- | --- | --- |
| U1 | Onboarding: LinkedIn sign-in (01 → `/`) | Partial | `GET /auth/linkedin?next=/onboarding/profile` or `/home` | Works to the Supabase redirect. A signed-in visitor on `/` is not sent onward. The LinkedIn round trip is unverified; app ownership is open (#20) | S |
| U2 | Profile prefill and edit (02 → `/onboarding/profile`) | Partial | `GET /api/me`, `PATCH /api/me`, `PATCH /api/me/visibility` | **`city` passes zod but is silently dropped**: no column, and `profileChanges` ignores it. LinkedIn provides no job title, company or city (#33) | S |
| U3 | Network toggles (02, 09) | Partial | `PATCH /api/me/visibility` (on → `connections`, off → `hidden`) | `whatsapp` was added (migration 0001 default). **Users created before 0001 have no `whatsapp` key**, so the strict `VisibilitySettings` zod check in `apiGet` fails and every page reading `Me` errors [Inference from code] | S |
| U4 | Monito builder (02b → `/onboarding/monito`) | Mock-only | `PATCH /api/me` `{ avatar }` | No `users.avatar` column; the server ignores `avatar`, so the look is lost and everyone shows the default monito (#35) | M |
| U5 | Home live (03 → `/home`) | Mock-only | `GET /api/me`, `…/live`, `GET /api/events/{slug}`, `GET /api/connections`, **`GET /api/invites/me`** | `GET /api/invites/me` returns 501, so the page throws. Without a current event it falls back to `founders-fest`, which is a 404 in production | S (tolerate errors) |
| U6 | Home empty, first night (03b → `/home`) | Mock-only | as U5 | as U5 | — |
| U7 | Home outside an event | Missing | as U5 | `currentEvent: null` → hard-coded `founders-fest` → 404 → error page. Not designed | S |
| U8 | Show my QR (04 → `/connect`) | Ready | `GET /api/me` | QR rendered with `qrcode`, encoding `/u/<handle>` | — |
| U9 | Scan in app (04 → `/connect?tab=scan`) | Partial | `GET /api/users/{handle}` | Uses `BarcodeDetector`, which iOS Safari does not support [Inference]; there the viewfinder shows "camera unavailable" and the native camera with `/u/` is the fallback | M (jsQR fallback) |
| U10 | Native camera (`/u/[handle]`) | Partial | redirect → `/connect/[handle]` | Signed in: works. **Signed out: the `(app)` session guard redirects to `/` and the handle is lost**, so A1 (visitor → LinkedIn → check-in → request) is broken | S |
| U11 | Search by name (04) | Partial | `GET /api/users/{slugify(query)}` | Matches only when the slug of the typed name equals the handle exactly (fails on suffixes like `-2`, and on partial names). No search route (#39) | S–M |
| U12 | Register: kind Nueva / Reencuentro (05 → `/connect/[handle]`) | Ready | `GET /api/users/{handle}`, `POST /api/connections` (`knew`) | "Reencuentro" → `knew: true`, as recommended. The total on the button is an estimate; the server decides on acceptance (M4) | — |
| U13 | Register: topics (+5) (05) | Mock-only | `POST /api/connections` `{ topics }` | Accepted by zod, **ignored by `insertRequest`**: not stored and no +5 (`TOPICS_POINTS` is never used on the server) | M |
| U14 | Register: voice note before acceptance (05 → 08b) | Mock-only | `POST /api/transcribe` (real); transcript kept in `sessionStorage` (`lib/note-draft.ts`) until 08b drafts it | The transcription is real, but 08b needs `GET /api/connections/{id}` (501). The note survives only in the same browser session | depends on U18 |
| U15 | Request, receiver side (06b → `/requests/[id]`) | Mock-only | `GET /api/connections/{id}` (501), `GET /api/users/{handle}`, accept / decline (real) | Accept and decline handlers are real, but the page loads through a 501 route. **No UI links to `/requests/[id]`**: the bell is not a link, and `ConnectionList` does not render `incoming` | M |
| U16 | Learn about a request or acceptance live | Missing | — | No polling and no Realtime subscription in any component. The server still broadcasts (#27) | S (poll) |
| U17 | Request sent, sender side (pending branch of `/connections/[id]/done`) | Mock-only | `GET /api/connections/{id}` (501) | `RegisterForm` sends the request (real), then routes to a page that errors | depends on U18 |
| U18 | Confirmation: points, summary, unlocked networks (06 → `/connections/[id]/done`) | Mock-only | `GET /api/me`, `GET /api/connections/{id}` (501) | Needs a real `getConnection` handler: direction, status, kind, other card, topics, points breakdown, interaction | M |
| U19 | Connections list (07 → `/connections`) | Partial | `GET /api/me`, `GET /api/connections` | Works. `type` ("friend") and `topics` are not filled by the server, so the Amigo filter is always empty and the row shows the person's interests (#40) | S |
| U20 | Other profile (08 → `/people/[handle]`) | Partial | `GET /api/users/{handle}` | `scores`, `badges`, `relationship` and `lastInteraction` are never filled (the page hides or zeroes them) | M |
| U21 | Voice-note detail (08b → `/connections/[id]/note`) | Mock-only | `GET /api/connections/{id}` (501), draft and approve (real) | Blocked by the 501. `title` and `pendingAction` are accepted by `ApproveBody` but not produced by the AI or stored (#41) | depends on U18 |
| U22 | Read a saved summary later | Mock-only | `GET /api/connections/{id}` `interaction` | Same 501 | depends on U18 |
| U23 | My profile (09 → `/me`) | Partial | `GET /api/me` | `scores`, `stats` and `badges` are not filled, so the page shows 0 / "—". No sign-out button | S–M |
| U24 | Badges (10 → `/me/badges`) | Mock-only | `GET /api/badges` (501) | The page throws; no award logic (#34) | M (subset on read) |
| U25 | Ranking tonight (11 → `/ranking`) | Partial | `GET /api/me`, `GET …/leaderboard?scope=event`, `GET /api/connections` | Rows are real. `me` (rank, gap, person above) is not filled. Needs a current event, otherwise `founders-fest` gives 404 and the page throws | S |
| U26 | Ranking all year (11) | Mock-only | `GET …/leaderboard?scope=lifetime` | **`scope` is parsed but ignored by `lib/server/live.ts`**, so it returns the event board again (#37) | S |
| U27 | Invites and rewards (12 → `/invite`, `/i/[code]`) | Mock-only | `GET /api/invites/me` (501), `POST /api/invites/{code}/claim` (501) | No model, no rewards (#36) | L |
| U28 | Notifications (bell on 03) | Partial | `GET /api/connections` `incoming.length` | The count is real, but the bell is not a link and there is no list (and Home is blocked by U5) | S |
| U29 | Big screen `/live/[slug]` | Partial | — | API ready (`…/live`, `…/live/people/{userId}`, `…/leaderboard`, public, 1 s cache); **the page does not exist** (404) | L |
| U30 | Admin: create an event | Partial | `POST /api/admin/events` | API ready, no form, **no event in production** (seed not run) | S |
| U31 | Check-in (`/e/[slug]`) and screen consent | Partial | `POST /api/events/{slug}/check-in`; auto check-in in `POST /api/connections` | No `/e/[slug]` page. **`RegisterForm` always sends `screenConsent: true` without showing the notice**, so consent is recorded without being asked (M13) | S |
| U32 | Sign out | Partial | `POST /api/auth/signout` | API ready, no button | S |
| U33 | Delete my account | Missing | — | No route (#24) | M |
| U34 | Summary points | Conflict | `POST /api/interactions/{id}/approve` | `SUMMARY_POINTS = 15` and the route says "+15 to the author", but the `event_scores` view still credits approved interactions to **both** people (#29) | S |
| U35 | Bilingual UI (system locale) | Missing | — | Only `lib/copy/es.ts`; no English dictionary, no detection, `es-MX` hard-coded in `lib/format.ts`, `lang="es"`, API `message` shown on errors (§5) | M–L |

**Counts (35 use cases):** Ready 2 (U8, U12) · Partial 15 (U1, U2, U3, U9, U10, U11, U19, U20, U23, U25, U28, U29, U30, U31, U32) · Mock-only 13 (U4, U5, U6, U13, U14, U15, U17, U18, U21, U22, U24, U26, U27) · Missing 4 (U7, U16, U33, U35) · Conflict 1 (U34).

Since the first version (11 Ready, 11 Partial, 7 Missing, 5 Conflict, all judged on the API only): the screens now exist, so the status is measured end to end. Several conflicts were settled in code: the points table, WhatsApp, the toggle mapping, "Ahora no" = decline, the kind mapping and holding the note on the client until acceptance. Those rows moved to Ready, Partial or Mock-only, pending the captain's ratification. The largest new finding is that **one missing handler, `GET /api/connections/{id}`, blocks four screens** (06, 06b, 08b, request sent), and **`GET /api/invites/me` (501) blocks Home**.

## 2. Conflicts the captain must decide

"Code does" reflects the branch at `e3d604f`. "Rec." is this analysis's recommendation, not a decision.

| # | Topic | V2 says | Spec says | Code does | Recommendation | OQ |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Points table | New +50, reconnection +20, topics +5, voice note +15, accept +20 each, invite +100 / +50. Mocks disagree (40 vs +35) | 20 / 10 to both (M3); +25 summary to both (M18) | **Implemented V2 values**: `lib/points.ts` (50 / 20, `TOPICS_POINTS` 5, `SUMMARY_POINTS` 15, `INVITE_POINTS`), migration 0001 (check 50 / 20). But +5 is never awarded (U13), invites are mock-only, the +15 goes to both through the view (U34), and the 06b copy still says "+20" | Ratify V2 and update M3 / M18. Award +15 to both or change the view; store topics or drop "+5" from the UI; fix the "+20" copy | #28, #29 |
| C2 | Kind, topics, note before acceptance | Scanner sets kind, topics and note on 05; summary on 06 | Kind on acceptance (M4); summaries only when accepted (A9) | Kind via `knew` (as recommended). Note: transcript held in `sessionStorage`, drafted on 08b after acceptance. Topics are sent but dropped | Keep the client approach for the demo; store `topics` on `connections` (M) after | #30 |
| C3 | Networks list | LinkedIn, Instagram, WhatsApp, X | linkedin, github, x, instagram, web | `whatsapp` added (`LINK_KEYS`, `wa.me`, migration 0001 default) | Ratify. Merge `DEFAULT_VISIBILITY` into stored visibility on read so old rows parse (S) | #31 |
| C4 | Visibility model | On/off per network, only connections see them | Three levels (M12) | UI maps on → `connections`, off → `hidden` (`MyLinkToggles`, `ProfileForm`) | Ratify; no server change | #32 |
| C5 | City and job title | Job title, company, city from LinkedIn | headline, company; no city | `city` in the API schema; no column; dropped | Add `users.city` (≤ 80, public) + handler (S); change the welcome copy | #33 |
| C6 | Badges | 20 badges, proposed rules | Out of the model (M17) | `GET /api/badges` mock-only; `/me/badges` throws in real mode | P2; show locked shelves and hide the page, or compute a subset on read | #34 |
| C7 | Monito storage | Look per person | — | `avatar` in the schema and sent by `MonitoBuilder`; no column; dropped | Add `users.avatar jsonb` + handler + `Card.avatar` (M) | #35 |
| C8 | Invites | Link, +100 / +50, golden cap | — | Routes and `/i/[code]` exist, mock-only | Cut; make Home tolerate the 501 | #36 |
| C9 | Ranking scopes | Esta noche / Todo el año, delta | Event leaderboard; `lifetime_scores` | `scope` accepted and ignored; `me` not filled | Implement `scope=lifetime` over `lifetime_scores` and `me` (S–M); drop the delta | #37 |
| C10 | "Accept gives +20 each" | Separate +20 | Kind points only | Kind points only; 06b copy says +20 | Change the copy to the kind points | #28 |
| C11 | Voice-note summary shape | Title, 3 points, follow-up, "Recordar" | `summary`, `topics`, `next_steps` | `Draft` / `ApproveBody` accept optional `title` and `pendingAction`; the AI does not produce them; nothing stores them | Derive the title from the first sentence and use `nextSteps[0]` as the follow-up; reminders are P2 | #41 |
| C12 | Search by name | Search when the QR fails | Plan P1 | `slugify(name)` as handle lookup | Real search over my event's attendees (S–M) | #39 |
| C13 | Topic vocabulary | Startup topics | `interests` seeded from `lib/topics.ts` (M15) | Register chips are free labels from `lib/copy/es.ts`; AI topics use `TOPICS` (a JavaScript-conference list); the prompt still says "at a JavaScript conference" | Founders list as the single source in `interests` (§5) | #38 |
| C14 | "Amigo" kind | Filter Nueva / Reencuentro / Amigo | new / reconnection | `PersonType` "friend" (≥ 3 reconnections) in the schema, not filled | Fill `type` in `listConnections` (S) or hide the chip | #40 |
| C15 | "Ahora no" | Two buttons | Explicit silent decline (M8) | **Implemented as decline** (`RequestActions`) | Ratify, or make it "dismiss" | #42 |

## 3. Edge cases

| Case | Covered? | Where / what happens |
| --- | --- | --- |
| Double scan, same event | Yes | Unique index + `onConflictDoNothing` → 200 with the existing row (`createConnection`) |
| Self-scan | Yes | 409 `self_connection` + DB check |
| Target not at an event | Yes (API) | 409 `not_at_event`; `RegisterForm` shows the API's English `message` |
| Scanner not checked in | Partial | The API asks for `screenConsent`, but **the UI always sends `true` without showing the notice** (M13) |
| Event ended | Yes | 409 `event_ended`, expiry on read, 409 `event_not_running` on check-in |
| Check-in before `starts_at` | Refused | `isRunning` (#22) |
| Declined, then scanned again | Yes (API) | 200 with the existing row; the done page that would show it is mock-only (#23) |
| Simultaneous mutual scans | Partial | One row survives; `ConnectionDetail.direction` exists in the contract, but the route is 501; the `POST` response still has no direction |
| Double-tap accept / approve | Yes | `FOR UPDATE` + status guard; partial unique index on approved summaries |
| LinkedIn without an email or a name | Yes | Nullable email; name and handle fallbacks |
| Name or photo edited, then re-login | Yes | `syncUser` keeps edited fields (M14); no photo upload (#16) |
| LinkedIn photo URL expiry | No | #21 |
| Deleted user | No | #24 |
| Anonymous viewer on `/live` | Yes (API) | Public routes, public fields only; no page |
| Signed-out visitor opens `/u/<handle>` | **No** | The `(app)` layout redirects to `/` and drops the handle |
| Rate limiting and spam scanning | No | No cap in `createConnection` |
| Offline | Partial | `apiCall` throws `network_error` and the component shows the raw message; no banner, no queue |
| Camera denied or unsupported | Partial | `ScanPanel` shows "camera unavailable" and keeps the handle search; no jsQR fallback for browsers without `BarcodeDetector` |
| Microphone denied | Yes | `VoiceNoteButton` shows `micUnavailable` and continues without a note |
| AI failure | Yes | Draft falls back to the author's text; transcription 502 → "type the note instead"; `uploadForTranscript` errors switch to the text field |
| Recording or transcript too long | Yes | Recorder stops at 120 s; server ≤ 120 s and 15 MB; draft ≤ 4000 characters |
| Note lost between 05 and 08b | Partial | Kept in `sessionStorage` only (same tab session; private mode drops it) |
| Time zone and event window | Partial | `lib/format.ts` formats with `es-MX` and a time zone argument; `Me.currentEvent` has no `endsAt` (#22) |
| Private Realtime channels not configured | **No client** | No polling or subscription anywhere; the server still broadcasts (#27) |
| Old users after migration 0001 | **Risk** | Stored `visibility` lacks `whatsapp`, so the strict zod parse in pages fails [Inference]. Adding the 50 / 20 check fails if production holds accepted 20 / 10 rows [Inference; production likely has none] |
| Migration 0001 not applied in production | **Risk** | The old 20 / 10 check rejects every accept that writes 50 / 20 (500) [Unverified: migration state of production] |
| Pages hitting 501 or 404 | **No** | `apiGet` throws, so Home, Ranking, Badges, Invite, Done, Request and Note show the error page in real mode |

## 4. Prioritized backlog (09:05: freeze passed, submission 10:00)

The feature freeze (09:00) has passed. The P0 items below are the **only** changes worth making before 10:00. Everything else goes into the README as known limitations. Lanes: scaffold, profile+QR, connections+points, summaries, live+seeds.

### P0: before 10:00, or record the demo in mock mode

| # | Task | Lane | Effort |
| --- | --- | --- | --- |
| P0-1 | Production data: apply migration 0001 (`bun run db:migrate`) and seed an admin and the Founders Fest event (`SEED_ADMIN_HANDLE`, `SEED_DEMO=1 bun run db:seed`) | live+seeds | S |
| P0-2 | **Decide the demo mode.** If the real path cannot be fixed by about 09:30, record the video against a mock-mode deployment or local run (`API_MODE=mock`), where all 16 screens render, and say so in the README | captain | S |
| P0-3 | Real `getConnection` handler (`GET /api/connections/{id}`): unblocks 06, 06b, 08b and request sent | connections+points | M |
| P0-4 | Home and Ranking must not crash: catch the `/api/invites/me` 501 (hide the card) and a missing event (no hard-coded `founders-fest`) | scaffold | S |
| P0-5 | An entry to incoming requests: make the bell (or the top of `/connections`) link to `/requests/[id]`, and poll `GET /api/connections` every 3 s | connections+points | S |
| P0-6 | Show the screen notice before sending `screenConsent: true` (M13; consent is recorded without being asked today) | connections+points | S |
| P0-7 | Merge `DEFAULT_VISIBILITY` into stored `visibility` in `buildMe` and `toCard`, so users created before 0001 parse | profile+QR | S |
| — | Done: AI follows the speaker (PR #15: no `language`, prompt and schema "same language as the note") | summaries | — |

### P1: right after submission

| # | Task | Lane | Effort |
| --- | --- | --- | --- |
| P1-1 | i18n: `lib/copy/en.ts`, locale detection (`navigator.languages` / `Accept-Language`, `es*` → `es`, otherwise `en`), `Intl` with the resolved locale instead of `es-MX`, `<html lang>`, error-code → message map instead of the API `message` | scaffold | M–L |
| P1-2 | `/u/[handle]` signed out: keep the handle through LinkedIn (`/auth/linkedin?next=/connect/<handle>`) | profile+QR | S |
| P1-3 | `/live/[slug]` page (API ready) | live+seeds | L |
| P1-4 | Persist `avatar` and `city` (columns + `profileChanges` + `Card`) (C5, C7) | profile+QR | M |
| P1-5 | Store connection `topics` and award +5; settle +15 to the author or to both (C1, U34) | connections+points | M |
| P1-6 | Leaderboard `scope=lifetime` and `me` (C9) | live+seeds | S–M |
| P1-7 | Fill `scores`, `stats`, `relationship`, `lastInteraction`, `type`, `topics` on profile and list responses | profile+QR | M |
| P1-8 | Topics from `interests` as the single vocabulary, founders list, neutral prompt (C13, §5) | summaries | S–M |
| P1-9 | Sign-out button; `/e/[slug]` check-in page; real name search; `BarcodeDetector` fallback (jsQR) | scaffold, profile+QR | M |
| P1-10 | Per-user rate limit on `POST /api/connections` | connections+points | S |

### P2: cut

Badges (C6), invites and rewards (C8), rank delta, notifications store, share to stories, "Recordar" reminders, account deletion (#24), LinkedIn photo copy (#21), Realtime Authorization (#27).

## 5. Internationalization: backend impact

Captain decisions, 2026-10-29: the app is **bilingual, English and Spanish**, detected from the system locale (`es*` → Spanish, otherwise English), with no language in the URL. **AI language follows the speaker, independent of the UI locale**: transcription keeps the spoken language, the summary and next steps use that same language, and topics always come from the DB `interests` list (DESIGN.md "Internationalization").

| Item | Today on the branch | Status |
| --- | --- | --- |
| Transcription language | `lib/ai/transcribe.ts` no longer passes `language` (PR #15) [Unverified: auto-detect quality on short notes] | **Done** |
| Summary language | Prompt and JSON-schema description say "same language as the note" (PR #15). The prompt still says "at a JavaScript conference" | **Done**; neutral event wording open (S, P1-8) |
| Topic vocabulary | `SummaryOutput`, `SUMMARY_JSON_SCHEMA`, `Topic` in `lib/api/schemas.ts` and the prompt read `TOPICS` from `lib/topics.ts`; `interests` is seeded from it. The register chips are a separate free list in `lib/copy/es.ts` | Open (P1-8): load `interests` at request time and build the schema from it, or keep `TOPICS` as the seed source with a test asserting they match; make the chips come from the same list |
| Interest and topic labels | `interests.name` is one column (English labels such as "AI Products") | Open: per-language labels keyed by `slug` in the UI dictionary; no migration |
| English UI dictionary | Only `lib/copy/es.ts` (28 imports across `app/` and `components/`) | **Missing** (P1-1) |
| Locale detection | None; copy is imported directly | **Missing** (P1-1) |
| Number and date formatting | `lib/format.ts` hard-codes `es-MX` | Open (P1-1) |
| Error messages | API `message` is English only (acceptable). **Components display it** (`RegisterForm`, `RequestActions`, `ProfileForm`, `MonitoBuilder`, `NoteEditor`) instead of mapping `code` | Open (P1-1) |
| Server-rendered copy | `app/layout.tsx`: `lang="es"`, Spanish description | Open (P1-1) |
| Badge names | Spanish in `lib/badges/catalog.ts` | Open: UI dictionary |
| Mock examples, OpenAPI | Spanish sample data | No change |

## 6. Not verified

- A signed-in session in production, so no page was rendered with real data. Real-mode outcomes above are traced through the code.
- The LinkedIn round trip; Realtime delivery; whether migration 0001 has run in production; load on `/live`.
- `BarcodeDetector` support on the demo phones.
- LinkedIn OIDC claims for job title, company and city (inferred absent).

Related: [DESIGN.md](../DESIGN.md), [wiki/screens](../wiki/screens/README.md), [wiki/open-questions.md](../wiki/open-questions.md), [docs/api-quickstart.md](api-quickstart.md).
