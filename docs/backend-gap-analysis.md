# Backend gap analysis: V2 design vs approved specs vs code

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · For the captain and the backend owner · Baseline: `main` @ `882c833`.

Sources compared:

- **V2:** `design/compa-v2/README.md` and the screen mocks (product and UX; see [DESIGN.md](../DESIGN.md)).
- **Specs:** [data model](specs/2026-10-29-data-model.md) (M1–M18), [API](specs/2026-10-29-api.md) (A1–A9), [AI summaries contract](contracts/ai-summaries-api.md).
- **Code:** `db/schema.ts`, `drizzle/0000_init.sql`, `lib/api/*`, `lib/server/*`, `lib/ai/*`, `app/api/**`.

How it was verified:

- Each **Ready** claim was checked by reading its handler in `lib/server/*`.
- Production was probed on 2026-10-29:
  - `/api/interests` returns 200 with the seeded topics.
  - `/api/me` and `/api/connections` return 401 when signed out.
  - `/auth/linkedin` returns 302 to the Supabase `linkedin_oidc` authorize URL.
  - **`/api/events/founders-fest` returns 404: production has no event yet.**
  - Mock mode (`x-compa-mock: 1`) returns the documented examples for `/api/me`, `/api/connections`, `POST /api/connections` and `/live`.
  - Every page except `/` and `/design` returns 404 (`/home`, `/me`, `/connect`, `/u/<handle>`, `/e/<slug>`, `/live`).
- Not verified: a full LinkedIn round trip in production, Realtime delivery, or behavior under concurrent load.

Status legend, measured **against the code**:

- **Ready:** the server side works as the screen needs.
- **Partial:** it works, but data or behavior the screen shows is missing.
- **Missing:** nothing exists on the server.
- **Conflict:** V2 and the approved specs disagree, so the captain must decide before building.

The UI is not counted in the status. **No attendee page exists yet**, so every row also needs its page; only the components in `components/` exist. Effort: **S** < 1 h, **M** 1–3 h, **L** > 3 h, for one person with an agent.

## 1. Use-case catalogue

| # | Use case (screen) | Status | Routes | What is lacking | Effort |
| --- | --- | --- | --- | --- | --- |
| U1 | Onboarding: LinkedIn sign-in, create account vs already have one (01) | Partial | `GET /auth/linkedin`, `GET /auth/callback` | Works up to the redirect, but the callback defaults to `/me`, which is a 404 page. Nothing tells the client "new user → 02, returning → 03"; `upsertLinkedInUser` knows but does not say. Ownership of the LinkedIn app is open (#20) | S |
| U2 | Profile prefill and edit (02) | Partial | `GET /api/me`, `PATCH /api/me` | Name, photo and email are prefilled. LinkedIn OIDC provides no job title, company or city [Inference: standard OIDC claims only; `lib/server/linkedin.ts` reads none of them], so the V2 promise "tomamos puesto, empresa y ciudad" fails. There is no `city` column. Job title maps to `headline` (#33) | S (city column) |
| U3 | Network toggles (02, 09) | Conflict | `PATCH /api/me/visibility`, `PATCH /api/me` | There is no `whatsapp` link key; `github` and `web` are not in V2. On/off toggles vs three levels (#31, #32) | M |
| U4 | Monito builder (02b, tap on 09) | Missing | — | `lib/monito/look.ts` says the look is "stored as `users.avatar` (jsonb)", but that column does not exist and `Card` has no `avatar`, so other people cannot see anyone's monito (#35) | M |
| U5 | Home live: counter, pairs, my rank and delta, bell count (03) | Partial | `GET /api/me`, `GET /api/events/{slug}`, `…/live`, `…/leaderboard`, `GET /api/connections` | `Me.currentEvent` has no `endsAt`, so "hasta las 22:00" needs a second call. My rank means finding myself in the leaderboard (max `limit=100`). There is no rank delta (▲ 1) and no "my rank" route | S |
| U6 | Home empty, first night (03b) | Ready | as U5 | 0 connections → `totals.connections === 0`; checked-in people with 0 points are still ranked (`rankedAttendees`) | — |
| U7 | Home outside an event | Partial | `GET /api/me` (`currentEvent: null`) | Works, but the useful content (all-year rank) is missing (U26). The screen is not designed | S |
| U8 | Show my QR (04 Mi QR) | Ready | `GET /api/me` (`handle`) | The QR encodes `https://<domain>/u/<handle>` (A8). No QR rendering library is installed (client) | — |
| U9 | Scan in app → see the person (04 Escanear) | Ready | `GET /api/users/{handle}` | Needs the user signed in. Camera decoding is client-side and no library is installed | — |
| U10 | Scan with the native camera (`/u/<handle>`) | Ready (API) | `GET /api/users/{handle}`, `POST /api/connections` | The `/u/[handle]` page does not exist (404 in production), so a printed QR leads nowhere today | — |
| U11 | Search by name when the QR fails (04) | Missing | — | No route. Plan P1 (@ search). Needs a scope: checked-in attendees of my current event only (#39) | S–M |
| U12 | Register: connection type Nueva / Reencuentro (05) | Conflict | `POST /api/connections` (`knew`) | Only "we already knew each other" maps (`knew: true`); the scanner cannot force `new` (M4), and history or the addressee's tick may override it. The "Ya se conocían" tag needs a "met before" flag that `GET /api/users/{handle}` does not return (it only reports the relation at the current event). The points shown before confirming are an estimate (#29, #30) | S |
| U13 | Register: "¿De qué hablaron?" topics (+5) (05) | Conflict | — | `CreateConnectionBody` has no topics. Topics exist only on `interactions`, which need an **accepted** connection. The vocabulary differs from V2 (#30, #38) | M |
| U14 | Register: optional voice note (+15) before acceptance (05 → 06) | Conflict | `POST /api/transcribe` (any user), `POST /api/interactions/draft` (accepted only) | Transcription works at any time, but the draft is refused with 409 `connection_not_accepted` while the request is pending, so the V2 flow (summary on 06 right after registering) cannot work (#30, #41) | S–M |
| U15 | Request, receiver side: accept / decline (06b) | Ready | `GET /api/connections` (`incoming`), `POST /api/connections/{id}/accept`, `…/decline` | Accept is transactional with `FOR UPDATE` and a `where status = 'pending'` guard; decline is silent. The card's extras (rank, "3 en común", connection count, events, people in common) are missing: see U20 | — |
| U16 | Learn about a request or acceptance live | Partial | `broadcast()` in `lib/realtime.ts` | The server broadcasts on private `user:<id>` topics, but no `realtime.messages` policy exists in `drizzle/0000_init.sql` and no client subscribes (#27). The fallback (poll `GET /api/connections` every 3 s, `docs/api-quickstart.md`) works with today's API | S |
| U17 | Request sent, sender side (pending) | Ready | `POST /api/connections`, `PATCH /api/connections/{id}/knew`, `GET /api/connections` / `GET /api/users/{handle}` | A declined request keeps showing `pending` (silent, §7.4). Gap: for simultaneous mutual scans, the response does not say who must accept (see the edge cases) | — |
| U18 | Confirmation: points, AI summary, unlocked networks (06) | Partial | accept response `from`, `request.accepted` or `GET /api/users/{handle}`, `POST /api/interactions/draft` | Networks unlock correctly after acceptance (`toCard` with relation `connected`). The breakdown (+20 reencuentro · +15 nota) does not match the server's points. The summary is only possible after acceptance (U14) | S |
| U19 | Connections list and filters (07) | Partial | `GET /api/connections` | Grouping by person, kinds, events and incoming requests are there, and the kind and event filters can be done in the client. The topics line under each person (from summaries) is missing; there is no "Amigo" kind (#40) | S |
| U20 | Other person's profile (08) | Partial | `GET /api/users/{handle}`, `GET /api/connections` | Missing: their points and rank, badges, connections in common, and "La última vez" (no route reads a summary, U22). Reconnections and events together can be derived from `people[].meetings` | M |
| U21 | Voice-note detail: record, summary, save / re-record / edit (08b) | Partial | `POST /api/transcribe`, `POST /api/interactions/draft`, `POST /api/interactions/{id}/approve` | Works for accepted connections. The output is `summary` (2–4 sentences) + `topics` (≤ 4) + `next_steps` (≤ 3); V2 wants a one-line title, 3 points and one "pendiente detectado" with "Recordar" (no reminder store). Points are 25 to both vs V2's 15 (#41) | S–M |
| U22 | Read an approved summary later (06, 08, 08b) | Missing | — | No `GET` route for interactions. The contract says both people see the summary, but nothing serves it | S |
| U23 | My profile: points, rank, badges, numbers (09) | Partial | `GET /api/me`, `GET /api/connections` (`totals`) | Lifetime points come from `totals.points`; new / reconnection / event counts can be derived from meetings. Rank (all year) and badges are missing | S |
| U24 | Badges: 20, earned / to earn / secret (10, shelves on 08, 09) | Missing | — | No table or rules. `lib/badges/catalog.ts` refers to a `user_badges.badge_id` that does not exist; M17 put badges out of the model (#34) | M (on read, a subset) / L (all 20) |
| U25 | Ranking tonight: podium, "Tú", the person above (11) | Ready | `GET /api/events/{slug}/leaderboard` | Order: points, connections, earliest check-in. Limit ≤ 100, enough for the demo. There is no position delta | — |
| U26 | Ranking all year (11) | Missing | — | The `lifetime_scores` view exists, but no route uses it (#37) | S |
| U27 | Invite friends and rewards (+100 / +50, golden cap) (12, card on 03) | Missing | — | No referral model, no `/i/<code>` route, no reward. The link in the mock says `compa.app`; production is `compa.lol` (#36) | L |
| U28 | Notifications (bell on 03) | Partial | `GET /api/connections` (`incoming`) | Only pending incoming requests. There is no store of "X accepted you" once the live message is missed (A3 says in-app only) | S |
| U29 | Big screen `/live` | Ready (API) | `GET /api/events/{slug}/live`, `…/live/people/{userId}`, `…/leaderboard` | Public, filtered to public fields only (`cardFor(null, …)`), cached for 1 s. The page does not exist; production has no event | — |
| U30 | Admin: create an event | Ready (API) | `POST /api/admin/events` | No form. `db/seed.ts` (`SEED_DEMO=1`, `SEED_ADMIN_HANDLE`) has **not** been run in production | — |
| U31 | Check-in with the event QR (`/e/<slug>`) | Ready (API) | `GET /api/events/{slug}`, `POST /api/events/{slug}/check-in` | Repeat-safe, requires `screenConsent: true`, and refuses outside the window (409 `event_not_running`). The page does not exist | — |
| U32 | Sign out | Ready | `POST /api/auth/signout` | — | — |
| U33 | Delete my account | Missing | — | No route. Deleting `auth.users` would cascade and change other people's scores (#24) | M |
| U34 | Summary points (+25 to both) | Conflict | `POST /api/interactions/{id}/approve` | Ready as specified (M18); V2 says +15 for the voice note, and does not say for whom (#29) | S |

**Counts (34 use cases):** Ready 11 (U6, U8, U9, U10, U15, U17, U25, U29, U30, U31, U32) · Partial 11 (U1, U2, U5, U7, U16, U18, U19, U20, U21, U23, U28) · Missing 7 (U4, U11, U22, U24, U26, U27, U33) · Conflict 5 (U3, U12, U13, U14, U34).

## 2. Conflicts the captain must decide

"Rec." is this analysis's recommendation for the hackathon, not a decision.

| # | Topic | V2 says | Spec says | Code does | Recommendation | OQ |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Points table | New +50, reconnection +20, topics +5, voice note +15, accept +20 each, invite +100 / +50 (README "Puntos"). The mocks are not consistent with each other: `V2Registrar` adds 20 + 5 + 15 = 40, while `V2Confirmacion` shows +35 (20 + 15) for the same case | New 20, reconnection 10 to both (M3); summary +25 to both (M18) | `CONNECTION_POINTS = { new: 20, reconnection: 10 }`, `SUMMARY_POINTS = 25` (`lib/points.ts`); a DB check hard-codes 20/10 (`connections_points_follow_kind_check`) | Adopt the V2 kind values **50 / 20 to both on acceptance, with no separate +20 for accepting** (#28). Replace the summary +25 with **+15 to both** for an approved note, and fold "+5 topics" into it (an approved summary with ≥ 1 topic). Cut invites. Needs a migration of the check constraint, constants, examples, `openapi.json` and tests (M) | #28, #29 |
| C2 | Who sets the kind and topics, and when the voice note happens | The scanner picks the kind, topics and the note on 05, before B accepts; 06 shows the AI summary immediately | The kind is decided on acceptance from history or either `knew` (M4); summaries only for accepted connections (A9) | `decideKind`; `requireAcceptedMembership` in `draftSummary` | Kind: map Nueva/Reencuentro to `knew` and show "hasta +50" until the server answers. Note: allow `draft` and `approve` by the **requester on a pending connection**, and make `event_scores` count a summary only when its connection is `accepted` (the view's interaction branch does not filter by status today). Topic chips go into the draft as hints | #30 |
| C3 | Networks list | LinkedIn, Instagram, WhatsApp, X | `linkedin, github, x, instagram, web` | `LINK_KEYS` in `lib/profile-fields.ts`; strict `VisibilitySettings` with 5 keys; jsonb default | Add `whatsapp` (normalize to `https://wa.me/<digits>`); keep `github` and `web` in the API but not in the UI. Existing rows need the new key merged on read (M) | #31 |
| C4 | Visibility model | Per network on/off; "solo las ven tus conexiones"; off is hidden to all. Job title, company and city show before connecting (`V2Conectar`, `V2Solicitud`) | `public` / `connections` / `hidden` per field and per link (M12) | As spec (`lib/visibility.ts`) | Keep the three-level backend. The UI maps on → `connections` and off → `hidden` for networks; headline, company and city stay `public` with no UI control. No server change | #32 |
| C5 | Profile fields | Nombre, puesto, empresa, ciudad, all "from LinkedIn" | `headline` (≤ 120), `company` (≤ 80); no city (M11) | As spec; LinkedIn sync sets only name, photo and email | Job title = `headline`. Add a nullable `city` (≤ 80) with `public` visibility (S). The welcome copy must not promise LinkedIn fills job title, company or city | #33 |
| C6 | Badges | 20 badges, award rules marked "propuesta", secret ones | Out of the model (M17) | Catalog and drawing only; `lib/badges/catalog.ts` names a `user_badges` table that does not exist | P2. If wanted, compute a subset **on read** from existing data (apreton, ff2026, og, madrugador, maraton, conector100, memoria), with no table; leave the rest locked | #34 |
| C7 | Monito look storage | A look per person, editable; clothes unlocked later | Not in the spec | `MonitoLook` zod exists; no column | Add `users.avatar jsonb` (nullable, validated with `MonitoLook`), expose it on `Card` (always public like the photo), and accept it in `PATCH /api/me` (M). Until then, derive a deterministic look from the user id in the client | #35 |
| C8 | Invites and referrals | Invite link, +100 for you and +50 for the friend at their first connection, golden cap for 3 | Not in the spec | None | Cut for the hackathon (P2); hide the Home card or show it as "pronto" | #36 |
| C9 | Ranking scopes | Esta noche and Todo el año, with a position delta and the gap to the next person | Event leaderboard; `lifetime_scores` view (§4.4) | Event route only | Add `GET /api/leaderboard?scope=year` over `lifetime_scores` (S); compute the gap in the client; drop the delta (it needs snapshots) | #37 |
| C10 | "Accepting gives +20 each" | Separate +20 on acceptance | Kind points on acceptance, nothing extra | Kind points only | Already logged; with C1, accepting awards the kind points to both and nothing else | #28 |
| C11 | Voice notes vs the summaries table | One-line title, 3 points, chips, one detected follow-up with "Recordar"; +15; Guardar / Regrabar / Editar | `interactions` with `summary`, `topics`, `next_steps`, `substantive`; one approved per connection; audio never stored | As spec; the output schema has no title or points list | For the demo, render `summary` as the body, `topics` as chips and `next_steps[0]` as the follow-up; derive the title from the first sentence. Adding a `title` field to the schema is S if wanted. "Recordar" is P2 | #41 |
| C12 | Search by name | "¿No sale el QR? Busca por nombre" | Plan P1 (@ search); not in the API spec | None | `GET /api/events/{slug}/people?q=` limited to my current event's attendees, returning public cards, minimum 2 characters (S–M, P1) | #39 |
| C13 | Topic vocabulary | Business topics: Levantar capital, IA, Proptech, Contratar, Ventas B2B, Fintech, Serie A, Producto, Marketing, Go to market, Hardware | `interests` seeded from `lib/topics.ts` (M15) | `TOPICS` is a JavaScript-conference list (React, Bun, …); the AI prompt says "a JavaScript conference" | Replace `TOPICS` with a founders list for Founders Fest; reseed `interests`; update the prompt. `TOPICS` is a lead-owned contract file (S) | #38 |
| C14 | "Amigo" connection kind | `V2Conexiones` filters Nueva / Reencuentro / Amigo | Kinds are `new` and `reconnection` | Same | Drop "Amigo" from the filter for now | #40 |
| C15 | "Ahora no" on a request | Two buttons: Aceptar / Ahora no → Home | Decline is explicit and silent (M8); a pending request expires at the end of the event | Same | "Ahora no" dismisses the request (it stays pending until the event ends); no decline button in V2. Confirm | #42 |

## 3. Edge cases

| Case | Covered? | Where / what happens |
| --- | --- | --- |
| Double scan of the same person at the same event | Yes | Unique index `connections_pair_per_event_uq` + `onConflictDoNothing`; returns 200 with the existing row and no second broadcast (`createConnection`, `lib/server/connections.ts`) |
| Self-scan | Yes | 409 `self_connection` (`requireTarget`) + DB check `connections_not_self_check` |
| Scan when the target is not at an event | Yes | 409 `not_at_event` (`findCurrentEvent`, A2). The copy is UI work |
| Scan when the scanner is not checked in | Yes | 409 `consent_required` until `screenConsent: true`, then auto check-in (A1, `checkInScanner`) |
| Event ended | Yes | Accept and decline → 409 `event_ended`; pending reads as `expired` (`statusForViewer`); check-in → 409 `event_not_running`; the target's current event disappears → `not_at_event` |
| Check-in before `starts_at` | Refused | `isRunning` requires `starts_at ≤ now`; whether early check-in should be allowed is open (#22) |
| Declined, then scanned again | Yes, as specified | Same direction: 200 with the existing row; the requester still sees `pending` (silent). Reverse direction: 200 with the row, and the decliner sees `declined`. The UI must handle a 200 with `declined` (#23) |
| Simultaneous mutual scans | Partial | The unique index keeps one row; the second scanner gets 200 with a row where they are the **addressee** but cannot tell from the response. Fix: add `direction: "sent" \| "received"` to the `ConnectionRequest` response (S), or the client checks `incoming` |
| Double-tap accept | Yes | `FOR UPDATE` + `where status = 'pending'`; a replay returns 409 `not_pending` |
| Summary approved twice | Yes | Partial unique index `interactions_one_approved_uq` + 409 `already_approved` |
| LinkedIn account without an email | Yes | `email` is nullable; `profileFrom` falls back. A missing name falls back to "COMPA" and the handle to `compa` (`lib/handle.ts`) |
| Name or photo edited, then re-login | Yes | `syncUser` keeps edited fields (M14). Photo editing has no upload (#16) |
| LinkedIn photo URL expires | No | The URL is stored as is; photos may break during the event (#21) |
| Deleted user | No | No route; an `auth.users` delete cascades and rewrites others' scores (#24) |
| Anonymous viewer on `/live` | Yes | Public routes; `cardFor(null, …)` returns public fields only; 1 s cache (`lib/server/live.ts`) |
| Rate limiting and spam scanning | No | One signed-in user can send a request to every attendee. Suggest a per-user cap in `createConnection` (for example 30 requests per 10 min → 429) or a Vercel Firewall rate-limit rule (S) |
| Offline | No | No service worker or queue; the UI must disable writes (DESIGN.md "States per screen") |
| Camera permission denied | No (client) | The fallback needs name search (U11, missing) and the Mi QR tab |
| AI failure | Yes | The draft falls back to the author's text (`fallback: true`, `lib/ai/draft-summary.ts`); transcription failure → 502 `transcription_failed` "Type the note instead"; a missing `OPENAI_TEXT_MODEL` → fallback |
| Transcript or recording too long | Yes | Audio ≤ 120 s and ≤ 15 MB (`validateAudio`); the recorder stops at 120 s (`lib/audio/recorder.ts`); draft text ≤ 4000 characters; summary ≤ 1200 |
| Time zone and event window | Partial | The API is ISO UTC; there is no display time zone and `Me.currentEvent` has no `endsAt` (#22) |
| Private Realtime channels not configured | Partial | Broadcasts are sent with `private: true`, but there is no `realtime.messages` policy and no client subscription; the client must poll `GET /api/connections` every 3 s (#27). The public `event:<slug>:live` topic needs no policy |
| QR of a person with no current event | Yes | `GET /api/users/{handle}` still returns the card; `POST /api/connections` → `not_at_event` |
| Unknown or garbage QR | Yes | Handle regex → 400 `invalid_input`; unknown handle → 404 `user_not_found` |

## 4. Prioritized backlog (freeze 09:00, submission 10:00)

Lanes from `wiki/team-and-prs.md` / `AGENTS.md` §1b: **scaffold**, **profile+QR**, **connections+points**, **summaries**, **live+seeds**.

### P0: the demo path breaks without these

| # | Task | Lane | Effort |
| --- | --- | --- | --- |
| P0-1 | Seed production: a captain sign-in, `SEED_ADMIN_HANDLE=<handle>`, `SEED_DEMO=1 bun run db:seed` (or `POST /api/admin/events`), so `/api/events/founders-fest` stops returning 404. Fix the event name (seed "Madrid", mocks "GDL", examples "Guadalajara") | live+seeds | S |
| P0-2 | Pages for the core path: `/` (01) → `/me` exists (the callback target) → `/home` (03 / 03b) → `/connect` (04, QR + scanner) → `/u/[handle]` → `/e/[slug]` check-in with the screen notice | scaffold, profile+QR | L |
| P0-3 | Connect flow pages: 05 Registrar (`knew`, `consent_required` retry), request sent, 06b accept / "Ahora no", 06 confirmation with unlocked networks, `/connections` (07) | connections+points | L |
| P0-4 | Request and acceptance updates by **polling** `GET /api/connections` every 3 s (no private channels) | connections+points | S |
| P0-5 | `/live/[slug]`: network visualization + counters + person card + leaderboard, public, color by kind | live+seeds | L |
| P0-6 | Captain decides C1 (points) and C2 (note before acceptance). If V2 points: migrate the DB check, `lib/points.ts`, examples, `openapi.json`, tests | connections+points | M |
| P0-7 | i18n foundation: locale detection (`navigator.languages` / `Accept-Language`, `es*` → `es`, otherwise `en`), `es` and `en` dictionaries, error-code mapping, `<html lang>` from the locale | scaffold | M |
| P0-8 | AI language follows the speaker: drop `language: "es"` in `lib/ai/transcribe.ts`, and make the prompt write in the note's language (§5). **In progress (separate PR)** | summaries | S |

### P1: visible in the demo if time allows

| # | Task | Lane | Effort |
| --- | --- | --- | --- |
| P1-1 | Source the AI topics enum from the DB `interests` list instead of `lib/topics.ts` (§5) | summaries | S–M |
| P1-2 | Voice note on 05 before acceptance (C2 recommendation) + 08b detail page | summaries | M |
| P1-3 | `GET /api/connections/{id}/summary` to read the approved summary (U22) | summaries | S |
| P1-4 | `users.avatar` jsonb + `Card.avatar` + `PATCH /api/me` (C7); deterministic client fallback first | profile+QR | M |
| P1-5 | `city` column (C5) and the `whatsapp` link key (C3) | profile+QR | M |
| P1-6 | `direction` in the `POST /api/connections` response (mutual scans) | connections+points | S |
| P1-7 | Founders topic vocabulary, reseed `interests`, generalize the prompt (C13); localized labels by `slug` (§5) | summaries | S |
| P1-8 | Ranking page (11) for tonight; `scope=year` route over `lifetime_scores` (C9) | live+seeds | M |
| P1-9 | Name search among my event's attendees (C12) | connections+points | S–M |
| P1-10 | Per-user rate limit on `POST /api/connections` | connections+points | S |
| P1-11 | Profile pages 08 and 09 with the numbers derived from meetings | profile+QR | M |

### P2: cut first

Badges (C6, 10), invites and rewards (C8, 12), rank delta, notifications store, share to stories, "Recordar" reminders, account deletion (#24), copying LinkedIn photos to Storage (#21), Realtime Authorization for private channels (#27).

## 5. Internationalization: backend impact

Captain decision, 2026-10-29: the app is **bilingual, English and Spanish**, detected from the system locale (`es*` → Spanish, otherwise English), with no language in the URL (DESIGN.md "Internationalization").

What is Spanish-only or single-language today:

| Area | Today | Impact |
| --- | --- | --- |
| Transcription | `lib/ai/transcribe.ts` forces `language: "es"` | English notes are transcribed badly. Removing the parameter lets the model detect the language [Unverified: auto-detect quality of `gpt-4o-mini-transcribe` for short notes]. In progress (separate PR) |
| Summary prompt | `lib/ai/prompt.ts`: "Write the summary and the next steps in Spanish"; also "at a JavaScript conference" | Becomes "same language as the note", with a neutral event description. In progress (separate PR) |
| Topics and interests | `TOPICS` labels are English strings, stored in `interests.name` (one column) and in `interactions.topics` | Show them through a per-language label keyed by `slug` in the UI dictionary; no migration needed. The alternative is `name_es` / `name_en` columns (migration, M) |
| Badge names | Spanish in `lib/badges/catalog.ts` | UI dictionary (client) |
| API error `message` | English only (`lib/api/errors.ts`) | Acceptable: the UI localizes by `code`. Some `fail()` calls pass a custom English message with a shared code (for example `forbidden`); the code is still stable |
| Server-rendered copy | `app/layout.tsx`: `lang="es"`, Spanish description | Must follow `Accept-Language` |
| Mock examples, OpenAPI | Spanish sample data | No change needed |

**AI language follows the speaker, not the UI locale.** This is a captain decision (2026-10-29):

1. Transcription keeps the language that was spoken. It is detected automatically and no longer forced to Spanish.
2. The AI summary and next steps are written in that same language.
3. Topics are always assigned from the DB `interests` list, a fixed vocabulary, whatever language was spoken.

Both people read the summary in the language of the note.

Backend items:

| Item | Change | Status |
| --- | --- | --- |
| Transcription language | Drop `language: "es"` in `lib/ai/transcribe.ts` | In progress (separate PR) |
| Summary language | Change the Spanish-only prompt in `lib/ai/prompt.ts` to "same language as the note" (also drop "at a JavaScript conference") | In progress (separate PR) |
| Topic vocabulary | Source the topics enum from `interests` instead of `lib/topics.ts` (`SummaryOutput`, `SUMMARY_JSON_SCHEMA`, `Topic` in `lib/api/schemas.ts` and the prompt all read `TOPICS` today; the DB is seeded from it). Either load `interests` at request time and build the JSON schema from it, or keep `TOPICS` as the seed source and assert in a test that the two match | Open, S–M (P1) |
| Topic and interest labels in the UI | Labels per language keyed by `slug` in the UI dictionary; `interests.name` stays single-language | Open, S (P1) |

## 6. Not verified

- The LinkedIn round trip in production (stops at the Supabase authorize redirect).
- Realtime Broadcast delivery, both public and private.
- Migration state of the production database beyond `interests` being seeded.
- Load behavior of `/live` polling with many screens.
- LinkedIn OIDC claims for job title, company and city (inferred absent from the standard claim set and from `lib/server/linkedin.ts`).

Related: [DESIGN.md](../DESIGN.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [wiki/open-questions.md](../wiki/open-questions.md), [docs/api-quickstart.md](api-quickstart.md).
