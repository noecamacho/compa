# New backlog tickets: public and operator screens

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Baseline: `origin/main` @ `f6f65f3` · Source: [audit](audit.md). The format follows [docs/flows/backlog.md](../../../flows/backlog.md). Every ticket depends on T-000 (Playwright harness), and every E2E line runs at 390, 834 and 1440 (1920 for `/live`) in `es-MX` and `en-US`.

These tickets do not duplicate existing T-tickets. Where a finding is already covered (T-004, T-012, T-021, T-022, T-023, T-024, T-090–T-093, T-104, T-111–T-114), the audit cites that T-ticket instead. **IF** marks overlap with in-flight branches: the 3D hero, the landing responsive pass, `feat/COMPA-TBD-landing-sign-in`, and the admin responsive follow-ups.

| ID | Title | Type | Priority | Effort | Findings |
| --- | --- | --- | --- | --- | --- |
| [UX-P1](#ux-p1) | Per-route localized metadata | ui | P1 | S | P-002 |
| [UX-P2](#ux-p2) | `noindex` on gated pages, plus `robots.ts` | infra | P1 | S | P-003, P-046 |
| [UX-P3](#ux-p3) | Per-event OG image for the door | ui | P2 | S | P-005 |
| [UX-P4](#ux-p4) | Make the "event QR" card actionable | ui | P1 | S | P-011 |
| [UX-P5](#ux-p5) | Performance guardrails for the 3D hero (IF) | ui | P1 | M | P-015 |
| [UX-P6](#ux-p6) | Landing footer and ES/EN switch | ui+backend | P2 | S | P-016 |
| [UX-P7](#ux-p7) | Door shows when, where and what, plus a desktop handoff | ui+backend | P1 | M | P-020, P-021, P-025 |
| [UX-P8](#ux-p8) | Email magic-link resilience | ui+backend | P1 | M | P-022, P-023 |
| [UX-P9](#ux-p9) | Type an event code by hand | ui+backend | P2 | S | P-027 |
| [UX-P10](#ux-p10) | `/live` 2D fallback when WebGL is missing or lost | ui | **P0** | M | P-030 |
| [UX-P11](#ux-p11) | `/live` QR readable from the back of the room | ui | P1 | S | P-031 |
| [UX-P12](#ux-p12) | `/live` phases and the "just connected" feed | ui+backend | P1 | M | P-034, P-035, P-036 |
| [UX-P13](#ux-p13) | Admin lists: search, sort, filter and cursor pagination | backend+ui+db | P1 | L | P-050, P-070, P-072 |
| [UX-P14](#ux-p14) | Admin attendees table, add-person picker and CSV export | backend+ui | P1 | L | P-060, P-061 |
| [UX-P15](#ux-p15) | Consequence-aware confirmations, undo and an audit log | backend+ui+db | P1 | M | P-063, P-066 |
| [UX-P16](#ux-p16) | Live counters on the admin event page | ui | P2 | S | P-065 |
| [UX-P17](#ux-p17) | Impersonation banner and bulk cleanup of test users | backend+ui | P2 | M | P-073 |
| [UX-P18](#ux-p18) | Fix `/live` horizontal overflow from long names | ui | P1 | S | P-032 |

---

<a id="ux-p1"></a>
### UX-P1 · Per-route localized metadata

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-110 | S |

- **E2E:** `e2e/system/seo.spec.ts`. Scenarios: in `en-US`, the landing `<title>` and `og:description` are English; the door title contains the event name; `/admin` keeps "compa · admin"; in `es-MX`, everything is in Spanish.
- **Files:** `app/layout.tsx`, `app/page.tsx`, `app/e/[code]/page.tsx`, `app/e/[code]/join/page.tsx`, `lib/copy/*`.
- **Acceptance:**
  - `generateMetadata` on the landing, door and join resolves the locale with `requestLocale()`.
  - The door title is `<event name> · compa`.
  - `og:locale` is `es_MX` or `en_US`.
  - The description is taken from the dictionary.
- **Edge cases:**
  - An unknown code must not leak "not found" through the title differently from a valid code; both stay generic until `notFound()`.
  - Event names longer than 60 characters are truncated in the title.
- **Do not touch:** `<html lang>` (T-111 owns it).

<a id="ux-p2"></a>
### UX-P2 · `noindex` on gated pages, plus `robots.ts`

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra | P1 | scaffold | T-000 | S |

- **E2E:** `e2e/system/seo.spec.ts`. Scenarios: `/e/<code>`, `/e/<code>/join`, `/e/<code>/live`, `/design` and `/admin` carry `<meta name="robots" content="noindex, nofollow">`; `/robots.txt` disallows `/e/`, `/admin`, `/design` and `/api/`; the landing stays indexable.
- **Files:** new `app/robots.ts`, `app/e/[code]/layout.tsx` (metadata only), `app/design/page.tsx`.
- **Acceptance:**
  - Gated and internal routes are `noindex`.
  - `/design` returns 404 when `VERCEL_ENV=production`, unless `DESIGN_GALLERY=1`.
  - The `/design` rows wrap at 320 with no horizontal scroll.
- **Edge cases:** a link preview bot (WhatsApp, LinkedIn) must still fetch the OG tags. `noindex` does not block that, but `robots.txt` `Disallow` on `/e/` can; allow `facebookexternalhit`, `LinkedInBot` and `WhatsApp`, or rely on meta only.
- **Do not touch:** the A10 not-found behavior.

<a id="ux-p3"></a>
### UX-P3 · Per-event OG image for the door

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | live+seeds | T-000, UX-P1 | S |

- **E2E:** `e2e/events/door.spec.ts`. Scenarios: `GET /e/<code>/opengraph-image` returns a 1200×630 PNG; an unknown code returns the generic image, not a 500.
- **Files:** new `app/e/[code]/opengraph-image.tsx` (`ImageResponse`, the Fredoka font).
- **Acceptance:**
  - The image shows the event name, a localized date in the event time zone, and "Scan to join · compa.lol".
  - No live counts.
  - It is cached per code for 1 h and invalidated on rotation.
- **Edge cases:**
  - Names of 120 characters wrap to at most 3 lines.
  - Emoji in names.
  - After a code rotation, the old image URL returns the generic image.

<a id="ux-p4"></a>
### UX-P4 · Make the "event QR" card actionable

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+design | P1 | scaffold | T-000, T-010 | S |

**IF:** landing responsive pass and the 3D hero.

- **E2E:** `e2e/onboarding/landing.spec.ts`. Scenarios: at 390 (touch), tapping the card opens an explainer sheet ("open your camera and point at the event QR"); at 1440, it shows a QR of `compa.lol` with "Open on your phone"; the keyboard opens and closes it with Enter and Esc.
- **Files:** `app/page.tsx`, a new small client component, `lib/copy/*`.
- **Acceptance:**
  - The card is a `<button>` with a visible focus ring, or it loses its hard shadow and reads as static text (design decision recorded in DESIGN.md).
- **Edge cases:** iOS cannot open the camera from the web; never promise that. The copy says "use your camera app".

<a id="ux-p5"></a>
### UX-P5 · Performance guardrails for the 3D hero (IF: 3D hero)

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, the 3D hero branch | M |

- **E2E:** `e2e/onboarding/landing-perf.spec.ts`. Scenarios:
  - With `reducedMotion: 'reduce'`, there is no `<canvas>` and the poster image is the LCP.
  - With CPU throttling ×4 and `deviceMemory` 2, the 3D chunk is never requested (network assertion).
  - The canvas pauses when scrolled off screen, and the requestAnimationFrame count stays flat.
- **Files:** the hero component on its branch, plus `next.config` if a chunk split is needed.
- **Acceptance:**
  - LCP is under 2.5 s and CLS under 0.05 on a Moto G Power profile (Lighthouse CI).
  - The 3D code loads after first paint (`dynamic(..., { ssr: false })` + idle).
  - DPR is capped at 1.5.
  - Rendering pauses when the tab is hidden or the hero is off screen.
  - The `Save-Data` header and `prefers-reduced-motion` both select the poster.
  - The hero box keeps a fixed aspect ratio, so swapping in the canvas causes no layout shift.
- **Edge cases:**
  - A WebGL context loss falls back to the poster.
  - Hydration on a slow 3G connection never blocks the CTA.
  - The CTA stays above the fold at 320×568 (P-010).

<a id="ux-p6"></a>
### UX-P6 · Landing footer and ES/EN switch

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+backend | P2 | scaffold | T-000, T-110, T-102 | S |

- **E2E:** `e2e/system/i18n.spec.ts`. Scenarios: an `en-US` browser switches to ES and the choice survives a reload and applies on the door; the footer links reach privacy and terms.
- **Files:** `app/page.tsx`, `lib/server/locale.ts` (reads the `compa-locale` cookie first), `lib/i18n.ts`.
- **Acceptance:**
  - The toggle sets the `compa-locale` cookie (1 year, `SameSite=Lax`).
  - `requestLocale` and `browserLocale` honor the cookie before `Accept-Language`.
  - `/live` ignores the cookie: projector language is decided by the screen's own browser or `?lang=`.
- **Edge cases:** a cookie with an invalid value falls back to the header.

<a id="ux-p7"></a>
### UX-P7 · Door shows when, where and what, plus a desktop handoff

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+backend | P1 | live+seeds | T-000, T-020, T-024 | M |

- **E2E:** `e2e/events/door.spec.ts`. Scenarios:
  - A running event shows its date and hours in the event time zone (with `timezoneId` set to another zone), the venue and the description.
  - An upcoming event shows the date, a countdown and "Add to calendar" (an `.ics` download).
  - At 1440, a "continue on your phone" QR of the same URL appears.
  - The join notice previews my big-screen card.
- **Files:** `lib/api/schemas.ts` (`EventDoor`), `lib/server/event-door.ts`, `app/e/[code]/page.tsx`, `components/event/JoinConsent.tsx`, `lib/api/routes.ts` (example + OpenAPI).
- **Acceptance:**
  - `EventDoor` adds `startsAt`, `endsAt`, `timezone`, `venueName`, `city` and `description` (public fields only).
  - The description is clamped to 3 lines with "More".
  - From `lg` up, the layout has two columns (card | QR handoff + muted live preview).
- **Edge cases:**
  - A missing venue or description hides that row.
  - A 2 000-character description.
  - The event spans midnight.
  - A DST change.
- **Do not touch:** the A10 response for unknown codes.

<a id="ux-p8"></a>
### UX-P8 · Email magic-link resilience

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+backend | P1 | profile+QR | T-000, T-036 | M |

**IF:** `feat/COMPA-TBD-landing-sign-in`.

- **E2E:** `e2e/onboarding/email-sign-in.spec.ts`. Scenarios:
  - `" Ana@Gmial.com "` suggests `gmail.com` and sends a trimmed, lowercased address.
  - "Sent" shows a 30 s resend countdown and "use another email".
  - `x-compa-mock-error: rate_limited` shows its own copy with the `Retry-After` time.
  - Offline shows the network copy.
  - At 320×568 the LinkedIn button is above the fold and the email form is collapsed behind "Use email instead".
- **Files:** `components/event/EmailSignIn.tsx`, `app/api/auth/email/route.ts`, `lib/api/routes.ts`, `lib/copy/*`.
- **Acceptance:**
  - The API returns `429 rate_limited` with `Retry-After`: at most 5 sends per email per hour and 20 per IP per hour.
  - The `sent` state survives a reload (`sessionStorage`).
  - The form is collapsed by default.
- **Edge cases:**
  - A plus-addressed email.
  - An IDN domain.
  - The link is opened on another device (the copy says "open the link on this phone").

<a id="ux-p9"></a>
### UX-P9 · Type an event code by hand

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+backend | P2 | live+seeds | T-000, T-020 | S |

- **E2E:** `e2e/events/door.spec.ts`. Scenarios:
  - On not-found, typing a valid code (any case, with spaces or dashes) opens the door.
  - A wrong code shows not-found again.
  - 20 wrong tries in a minute get `429`.
- **Files:** `components/event/EventNotFound.tsx`, `app/page.tsx` (a small "Have a code?" link), `lib/access-code.ts` (normalize), the door lookup route.
- **Acceptance:**
  - The input normalizes look-alikes the generator excludes (O→0, I→1), strips spaces and dashes, and lowercases.
  - The door lookup is rate limited per IP.
- **Edge cases:** code enumeration. The same not-found answer for every miss is kept (A10).

<a id="ux-p10"></a>
### UX-P10 · `/live` 2D fallback when WebGL is missing or lost

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | live+seeds | T-000, T-090 | M |

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios:
  - With `--disable-webgl` (Chromium launch arg), the 1920 screen shows the 2D mosaic of checked-in people with no empty area larger than 25 % of the viewport.
  - A forced `webglcontextlost` swaps to 2D within 1 s, and a restore swaps back.
  - The empty event shows the people only.
- **Files:** `components/live/LiveBoard.tsx`, `components/live/Loom.tsx`, a new `components/live/LoomFallback.tsx` (SVG or Canvas2D).
- **Acceptance:**
  - The fallback draws avatars on a deterministic layout (a circle or grid by check-in order) with straight edges colored new or reconnection, using the existing legend.
  - At most 300 avatars are drawn, with "+N" beyond that.
  - The "can't draw" sentence is removed or reduced to a small footnote.
  - Taps work on the fallback as on the loom.
- **Edge cases:**
  - 0 people.
  - 2 000 people (performance budget: under 16 ms per frame on the projector laptop).
  - Photos fail to load and fall back to the monito.
- **Do not touch:** the snapshot contract.

<a id="ux-p11"></a>
### UX-P11 · `/live` QR readable from the back of the room

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | live+seeds | T-000, T-090, T-093 | S |

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios:
  - At 1920 the header QR is 160 px or more.
  - Pressing `Q` (or `?qr=1`) shows a full-height QR with `compa.lol/e/<code>` in 60 px or larger type, and pressing `Q` again returns.
  - In present mode, the QR takes over for 10 s every 90 s.
  - With `reducedMotion`, the swap is a cut, not an animation.
- **Files:** `components/live/LiveBoard.tsx`.
- **Acceptance:**
  - The QR clamp is raised to `clamp(160px, 14vw, 420px)`.
  - QR mode uses error correction level M and a 4-module quiet zone.
  - The short URL is shown under the QR.
- **Edge cases:**
  - The code rotates while QR mode is on: the page refreshes to not-found (the existing behavior) and does not keep showing the dead QR.
  - At 2560 the QR stays crisp (SVG).

<a id="ux-p12"></a>
### UX-P12 · `/live` phases and the "just connected" feed

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui+backend | P1 | live+seeds | T-000, T-090, T-091 | M |

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios:
  - An upcoming event shows a countdown plus the QR.
  - A live event with 0 connections turns the panel into a large QR with "Be the first connection".
  - A live event with connections shows the leaderboard plus a ticker of the last 10 connections (A + B, topic, new or reconnection).
  - An ended event shows a final top 3 and the totals, and polling drops to once a minute.
  - Use `page.clock` to move across the window edges.
- **Files:** `lib/api/schemas.ts` (`LiveSnapshot.phase`, `recent[]`), `lib/server/live.ts`, `components/live/*`, `lib/api/routes.ts`.
- **Acceptance:**
  - The snapshot carries `phase` and `recent` (last 10 accepted connections: the two people's ids, `kind`, `acceptedAt`, an optional topic) with no private notes.
  - The leaderboard shows as many rows as fit the height (at least 5 and at most 15).
- **Edge cases:**
  - Two connections accepted in the same second (ordered by id).
  - A person who withdraws screen consent disappears from the ticker.
  - Test users stay hidden (M20).
- **Do not touch:** the 1 s shared cache (`LIVE_CACHE`).

<a id="ux-p13"></a>
### UX-P13 · Admin lists: search, sort, filter and cursor pagination

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui+db | P1 | live+seeds | T-000, T-023 | L |

- **E2E:** `e2e/admin/lists.spec.ts`. Scenarios:
  - 250 seeded test events: the first page shows 50, "Load more" reaches event 250, and the URL keeps `cursor`, `q`, `status` and `sort` across back and refresh.
  - The `status=live-now` filter.
  - Sorting by "When" both ways.
  - People: "120 people" shows the total, not the page size; `q` with no hits offers "Clear search".
  - At 390, the filters scroll horizontally with an edge fade and no clipped labels.
- **Files:** `lib/api/admin-schemas.ts`, `lib/server/admin-events.ts`, `lib/server/admin-people.ts`, `app/admin/page.tsx`, `app/admin/people/page.tsx`, `components/admin/AdminParts.tsx`, a new migration (indexes).
- **Acceptance:**
  - List responses return `{ items, nextCursor, total }`.
  - The cursor is opaque, a base64 of `(sort key, id)`.
  - The hidden 200 cap on events is removed.
  - Migration `NNNN_admin_list_indexes.sql` (additive): `events(status, starts_at desc)` plus `pg_trgm` GIN indexes on `users(name)`, `users(handle)`, `users(email)` and `events(name)`.
  - Sortable headers use `aria-sort`.
  - The derived phase (upcoming, live now, ended) is shown and filterable (P-053).
  - With JS on, the search debounces at 250 ms; without JS, it is a plain GET form.
- **Edge cases:**
  - Rows inserted between pages (keyset pagination avoids duplicates).
  - Accents (`unaccent`).
  - A test super admin sees test rows only (`canManageEvent`).
- **Do not touch:** the 404 gate for non-admins (A11).

<a id="ux-p14"></a>
### UX-P14 · Admin attendees table, add-person picker and CSV export

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | live+seeds | T-000, T-023, UX-P13 | L |

- **E2E:** `e2e/admin/attendees.spec.ts`. Scenarios:
  - 1 200 seeded test attendees: the table loads 100 and filters as you type (a filter, not the add-search).
  - Sorting by points and by check-in time.
  - "Export CSV" downloads every row with a header in the UI locale.
  - "Add attendee" opens a combobox dialog: ↑↓ and Enter add a person, people already checked in are disabled, and Esc closes.
  - At 390, the rows are cards with a sticky filter.
- **Files:** `components/admin/EventPeople.tsx`, `components/admin/UserPicker.tsx`, `lib/server/admin-people.ts`, new `app/api/admin/events/[slug]/attendees.csv/route.ts`, `lib/api/routes.ts`.
- **Acceptance:**
  - `GET …/attendees?q=&sort=&cursor=&limit=100` returns `nextCursor` and `total`.
  - `GET /api/admin/users?excludeEvent=<slug>` exists for the picker.
  - The CSV streams (no 1 000 cap), escapes formula injection (`=`, `+`, `-`, `@` prefixed with `'`) and writes an audit row (UX-P15).
  - Columns: name, handle, points, connections, checked in at (event time zone), consent, by admin.
- **Edge cases:**
  - Names with commas, quotes or newlines.
  - A super admin running as a test admin exports test rows only.
  - Export during a live event (a consistent snapshot read).
- **Do not touch:** check-in idempotency.

<a id="ux-p15"></a>
### UX-P15 · Consequence-aware confirmations, undo and an audit log

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui+db | P1 | live+seeds | T-000, T-022, T-023 | M |

- **E2E:** `e2e/admin/events.spec.ts`. Scenarios:
  - The "End now" dialog names the event and states "340 people inside, 12 pending requests will expire".
  - After End, an "Undo" toast for 10 s restores the window.
  - Rotate requires typing the event name.
  - Removing the last owner gets `409 last_owner` and its copy.
  - Every action leaves a row in `admin_audit` (checked through `GET /api/admin/audit?target=`).
- **Files:** `components/admin/ConfirmDialog.tsx`, `components/admin/EventActions.tsx`, `components/admin/EventPeople.tsx`, `lib/server/admin-events.ts`, a new migration `NNNN_admin_audit.sql`, `lib/api/routes.ts`.
- **Acceptance:**
  - Table `admin_audit(id, actor_id, action, target_type, target_id, before jsonb, after jsonb, created_at)`, insert-only, with an index on `(target_type, target_id, created_at desc)`.
  - `POST …/end` returns `previousEndsAt`.
  - Removing an organizer gets an undo toast.
  - Confirm dialogs show live counts.
- **Edge cases:**
  - Undo after another admin edited the window (compare and set: refuse with `409 stale`).
  - Audit rows survive the deletion of the target.
- **Do not touch:** the archive semantics (`status='archived'`).

<a id="ux-p16"></a>
### UX-P16 · Live counters on the admin event page

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | live+seeds | T-000, T-023 | S |

- **E2E:** `e2e/admin/events.spec.ts`. Scenarios:
  - After a check-in made in a second context, the "Inside" counter increments within 10 s with no reload.
  - Polling pauses while the tab is hidden.
  - With reduced motion, the count changes without animation.
- **Files:** `app/admin/events/[slug]/page.tsx`, a small client counter that reuses `useLiveSnapshot` or `GET …/stats`.
- **Acceptance:**
  - Counts refresh every 10 s.
  - A "+N in the last 10 min" check-in rate is shown.
  - The phone layout uses a sticky section switcher (People · QR · Settings), with the danger zone last (P-062).
- **Edge cases:** an archived event stops polling.

<a id="ux-p17"></a>
### UX-P17 · Impersonation banner and bulk cleanup of test users

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P2 | scaffold | T-000 | M |

- **E2E:** `e2e/admin/test-users.spec.ts`. Scenarios:
  - "Sign in as Ana" lands on `/home` with a sticky banner, "You are Ana (test) · Back to admin". "Back to admin" asks the admin to sign in again; it never escalates silently.
  - "Delete all test users" (typed confirm) removes them and their check-ins from test events only.
  - A real user is never deleted (403).
- **Files:** `components/admin/TestUsersPanel.tsx`, the `(app)` layout (banner), `app/api/admin/test-users/*`, `lib/server/test-users.ts`.
- **Acceptance:**
  - The session route sets an `httpOnly` `compa-impersonating=<admin id>` marker cookie, which the app shell reads to render the banner.
  - `POST /api/admin/test-users/bulk-delete { ids | all }` deletes `is_test` rows only and is audited (UX-P15).
- **Edge cases:**
  - The banner must not leak onto `/e/<code>/live` (a public screen).
  - The banner fits the safe area at 320.

<a id="ux-p18"></a>
### UX-P18 · Fix `/live` horizontal overflow from long names

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | live+seeds | T-000, T-090 | S |

- **E2E:** `e2e/live/big-screen.spec.ts`. Scenarios: a snapshot with a 60-character name gives `document.documentElement.scrollWidth === innerWidth` at 320, 390, 834, 1440 and 1920, and the leaderboard row truncates with an ellipsis.
- **Files:** `components/live/LiveBoard.tsx` (the base grid gets `grid-cols-[minmax(0,1fr)]`), `components/live/LivePanels.tsx` (`min-w-0` on the panel).
- **Acceptance:**
  - No horizontal scroll at any project viewport.
  - At 320 the loom section fits its width (today it overflows by 19 px).
- **Edge cases:**
  - RTL or very long unbroken names (`overflow-wrap:anywhere` in the person card).
  - A long event name in the header.
