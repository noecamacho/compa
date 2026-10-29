# Attendee UX tickets (UX-A1–UX-A22)

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Source: [audit.md](audit.md) · Format and legend: [backlog](../../../flows/backlog.md#build-backlog-agent-ready-tickets).

Every ticket depends on [T-000](../../../flows/backlog.md#t-000) and ships Playwright specs for the flows it touches. Each spec covers the 390, 834 and 1440 projects, plus 320×568 where noted, in `es-MX` and `en-US`. Mock mode supplies the error states (`x-compa-mock-error`). The **E2E** line names the spec and the scenarios.

## Summary

| Ticket | Title | Type | Priority | Lane | Effort | Findings |
| --- | --- | --- | --- | --- | --- | --- |
| [UX-A1](#ux-a1) | Adaptive app shell for tablet and desktop | ui | **P0** | scaffold | L | A-001, A-004, A-023, A-051, A-082 |
| [UX-A2](#ux-a2) | Dock that fits 320 px and landscape | ui | **P0** | scaffold | S | A-002, A-003 |
| [UX-A3](#ux-a3) | Mi QR always fully visible and scannable | ui | **P0** | profile+QR | M | A-020, A-024, A-025, A-026 |
| [UX-A4](#ux-a4) | Scanner: stable camera, responsive viewfinder, self-scan | ui | P1 | profile+QR | M | A-030, A-031, A-033, A-034 |
| [UX-A5](#ux-a5) | Navigation feedback under 400 ms | ui | P1 | scaffold | S | A-005 |
| [UX-A6](#ux-a6) | Server Components read services directly, one `me` per request | backend | P1 | scaffold | M | A-006 |
| [UX-A7](#ux-a7) | `GET /api/me/pulse` replaces the 3 s full-list polls | backend+ui | P1 | connections+points | M | A-007, A-021, A-050, A-091 |
| [UX-A8](#ux-a8) | Connections list: sort, sections, counts, pagination | backend+ui | P1 | profile+QR | M | A-060, A-062, A-063, A-065, A-067 |
| [UX-A9](#ux-a9) | Connections master-detail at tablet and desktop | ui | P1 | profile+QR | M | A-066 |
| [UX-A10](#ux-a10) | Person page: contact row, real "last time", history | ui | P1 | profile+QR | M | A-070, A-071, A-072 |
| [UX-A11](#ux-a11) | History-aware back button | ui | P1 | scaffold | S | A-073, A-093 |
| [UX-A12](#ux-a12) | Full leaderboard list with a sticky "me" row | backend+ui | P1 | live+seeds | M | A-090, A-092 |
| [UX-A13](#ux-a13) | Notifications: mark seen after paint, day sections, inline actions | backend+ui | P1 | connections+points | M | A-095, A-096, A-097, A-098 |
| [UX-A14](#ux-a14) | First-run tours that never block the connect moment | ui | P1 | scaffold | S | A-040 |
| [UX-A15](#ux-a15) | Enter network values, not only toggle them | ui | P1 | profile+QR | M | A-080, A-081 |
| [UX-A16](#ux-a16) | Form hygiene: limits, autocomplete, field errors, AA error color | ui | P1 | scaffold | M | A-010, A-076, A-105 |
| [UX-A17](#ux-a17) | Sticky action bar on decision screens, and undo for decline | ui | P1 | connections+points | M | A-042, A-053, A-054, A-075, A-106 |
| [UX-A18](#ux-a18) | Home space budget on short phones | ui | P1 | live+seeds | S | A-017, A-018, A-019 |
| [UX-A19](#ux-a19) | Installable PWA with an offline fallback page | infra+ui | P1 | scaffold | M | A-008, A-012 |
| [UX-A20](#ux-a20) | Haptic and auto-advance feedback on scan and accept | ui | P2 | profile+QR | S | A-013, A-035 |
| [UX-A21](#ux-a21) | Badges: closest-first sort and fluid grid | ui | P2 | live+seeds | S | A-085, A-086 |
| [UX-A22](#ux-a22) | Coherent mock examples for the demo | docs | P2 | scaffold | S | A-022, A-055 |

Totals: 22 tickets, of which 3 are P0, 17 are P1 and 2 are P2.

---

<a id="ux-a1"></a>
### UX-A1 · Adaptive app shell for tablet and desktop

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | scaffold | T-000, T-114, UX-A2 | L |

- **E2E:** `e2e/system/responsive.spec.ts`. The scenarios run at 390, 834, 1440 and 1920 on `/home`, `/connections`, `/me`, `/connect` and `/ranking`:
  - no horizontal scroll;
  - content width is at least 70 % of the viewport at 834 and at least 60 % at 1440;
  - the nav rail is visible and the dock hidden at ≥600, and the reverse at 390;
  - every nav item has a visible label at ≥600;
  - keyboard Tab reaches the rail first.
- **Files:** `components/ui/Screen.tsx` (`max-w-[390px]`), `components/nav/Dock.tsx` (a new `NavRail` beside `DockHost`), `app/(app)/layout.tsx`, `app/(app)/home/page.tsx`, `app/(app)/me/page.tsx`, `app/(app)/connections/[id]/done/page.tsx`.
- **Acceptance:**
  - Phone (<600): fluid width with no 390 cap (max 560). Same layout as today.
  - Tablet (600–1023): a left rail 88 px wide, with icons plus labels, in place of the dock. Content goes in a 2-column grid. Home shows requests and LIVE side by side, then Conectar and Invite. Me shows identity and stats on the left, and badges, networks and settings on the right.
  - Desktop (≥1024): the rail plus main content (max 760) plus a 320 px aside. The aside holds incoming requests, my rank, and Conectar as a QR thumbnail. The aside hides on `/connect` and on decision screens.
  - DESIGN.md "Responsive breakpoints" gets the three tiers. The dock's spring motion is kept on phones.
  - Safe-area insets still apply on every tier.
- **Edge cases:** an iPad in split view at 507 px uses the phone layout. Pinch-zoom at 200 % stays usable (WCAG 1.4.10 reflow at 320 CSS px). The Admin link (`Screen admin`) moves into the rail.
- **Do not touch:** `/e/<code>/live` (its own layout), the admin shell.

<a id="ux-a2"></a>
### UX-A2 · Dock that fits 320 px and landscape

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | scaffold | T-000 | S |

- **E2E:** `e2e/system/dock.spec.ts`. Scenarios:
  - at 320×568, `document.documentElement.scrollWidth === 320` on every dock route, and all 4 tabs are inside the viewport and tappable;
  - at 844×390 the dock is at most 56 px tall;
  - scrolling down hides it and scrolling up shows it;
  - with reduced motion the hide is instant.
- **Files:** `components/nav/Dock.tsx` (`CLOSED`, `OPEN` and `STEP` constants, `w-[327px]`, `w-[312px]`).
- **Acceptance:**
  - The width is `min(327px, 100vw - 16px)`. `OPEN`, `CLOSED` and `STEP` derive from the measured width.
  - Under 340 px the open label shrinks to 13 px, or shows the icon only plus a pill.
  - When `innerHeight < 500` the dock is compact and hides on scroll down.
- **Edge cases:** `env(safe-area-inset-bottom)` on iPhone landscape. A dock route reached during a tour (the `data-tour="dock"` target must stay measurable).
- **Do not touch:** `DOCK_ROUTES` membership.

<a id="ux-a3"></a>
### UX-A3 · Mi QR always fully visible and scannable

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | **P0** | profile+QR | T-000, UX-A2 | M |

- **E2E:** `e2e/connect/my-qr.spec.ts`. Scenarios:
  - at 320×568, 390×844 and 834×1194 the QR's bounding box is fully inside the viewport and does not intersect the dock;
  - tapping the QR opens full screen, and Escape or tap closes it;
  - `navigator.wakeLock.request` is called while Mi QR is visible (stubbed) and released on tab hide;
  - at ≥834 Mi QR and Escanear render side by side with no segmented control;
  - `es` and `en` labels.
- **Files:** `components/connect/ConnectTabs.tsx` (`h-[274px] w-[274px]`, `w-[315px]`), `app/(app)/connect/page.tsx`.
- **Acceptance:**
  - QR side = `clamp(200px, min(100vw - 72px, 100dvh - 330px), 520px)`. The identity card is `w-full`.
  - Full-screen mode shows a white background, a QR of about 85 % of the short side, the name under it, and the dock hidden.
  - A Wake Lock is held while visible, with a silent fallback when unsupported.
  - At ≥834 there are two panes: QR on the left, scanner on the right.
- **Edge cases:** a browser without Wake Lock (Safari before 16.4 [Unverified]). Landscape phones put the QR to the right of the identity card. Rotation while in full screen.
- **Do not touch:** the QR payload (`/u/<handle>`, ADR-004).

<a id="ux-a4"></a>
### UX-A4 · Scanner: stable camera, responsive viewfinder, self-scan

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000, T-033 | M |

- **E2E:** `e2e/connect/scan.spec.ts`. Scenarios:
  - with a fake camera (`--use-fake-device-for-media-stream`), typing 10 characters in search calls `getUserMedia` exactly once (spy);
  - a QR of my own handle shows "Ese eres tú" and no Conectar button;
  - a 47-character name renders in at most 2 lines;
  - at 320×568 the search input is above the dock when the camera is denied.
- **Files:** `components/connect/ScanPanel.tsx`. In `useCamera`, the deps `[videoRef, onHandle]` with an inline callback restart the stream on every render. Corners sit at fixed px offsets, and the viewfinder is `h-[360px]`.
- **Acceptance:**
  - The callback is held in a ref and the effect runs once per mount. Tracks stop on unmount and on `visibilitychange: hidden`.
  - The viewfinder is `aspect-square`, with height `clamp(220px, 45dvh, 420px)` and corners in percent.
  - When the camera is unavailable, the search field renders first and gets focus.
  - A detected handle equal to `me.handle` shows the self message (F-21).
  - The found card clamps the name to 2 lines and the headline to 1.
- **Edge cases:** the same QR detected repeatedly (debounce for 2 s). A front-only laptop camera. A permission revoked mid-session.
- **Do not touch:** `handleFromQr` (it has tests).

<a id="ux-a5"></a>
### UX-A5 · Navigation feedback under 400 ms

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-004 | S |

- **E2E:** `e2e/system/navigation.spec.ts`. Scenarios:
  - with the RSC request for `/connections` delayed 3 s (`page.route`), a progress indicator is visible within 150 ms of the dock tap and gone after the page renders;
  - the reduced-motion variant shows a static bar;
  - back and forward show the indicator too.
- **Files:** new `components/nav/RouteProgress.tsx` (client: `useLinkStatus`, or the pending pathname from `Dock`), `app/(app)/layout.tsx`.
- **Acceptance:**
  - A 2 px top bar in mint appears after 100 ms of a pending navigation and completes on render.
  - `aria-busy` is set on `main` while pending.
  - Dock links keep `prefetch` (the default).
  - This does not replace the T-004 skeletons. It covers the gap before a skeleton streams.
- **Edge cases:** an instant navigation (<100 ms) shows nothing. A failed navigation clears the bar and leaves the error to T-004.
- **Do not touch:** the dock pill's optimistic move.

<a id="ux-a6"></a>
### UX-A6 · Server Components read services directly, one `me` per request

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend | P1 | scaffold | T-000 | M |

- **E2E:** `e2e/system/perf.spec.ts`. Scenarios:
  - a mock-mode render of `/home` makes 0 loopback requests to `/api/*` (the dev server log counter, or a test header), and the response time drops versus baseline (recorded, not gated);
  - every `(app)` screen still renders in both locales.
- **Files:** `lib/api/server-fetch.ts`, `app/(app)/layout.tsx` (`apiGetSafe("/api/me")`), every `app/(app)/**/page.tsx` that calls `apiGet`, and `lib/server/*` (`buildMe`, `listConnections`, etc.).
- **Acceptance:**
  - A `getMe = cache(async () => …)` in `lib/server/` is shared by the layout and pages, so 1 call per request.
  - Pages call service functions, not HTTP. The services check the session once.
  - Mock mode keeps working: the services return the examples when `API_MODE=mock`.
  - The OpenAPI routes keep calling the same services, so one contract remains.
- **Edge cases:** a 404 must still map to `notFound()` (`apiGetOrNull` contract). Errors keep their `code`, for T-004 and T-111.
- **Do not touch:** the public API shape, and the `x-compa-mock*` headers for client calls.

<a id="ux-a7"></a>
### UX-A7 · `GET /api/me/pulse` replaces the 3 s full-list polls

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | connections+points | T-000, T-031 | M |

- **E2E:** `e2e/requests/pulse.spec.ts`. Scenarios:
  - a second browser context sends a request, and the bell and incoming card update within 4 s;
  - a hidden tab (`page.evaluate` dispatching `visibilitychange`) makes no pulse calls;
  - a 304 leaves the UI unchanged;
  - after 3 errors the interval backs off to 15 s;
  - the pending screen re-renders when accepted.
- **Files:** new `app/api/me/pulse/route.ts` plus `lib/api/routes.ts` spec, new `lib/use-pulse.ts`, `components/home/IncomingRequests.tsx` (two 3 s intervals), `components/connections/PendingWatcher.tsx`, `components/home/LiveCard.tsx`, `components/ranking/RankingView.tsx`.
- **Acceptance:**
  - The response is `{ unseenCount, incoming: [{ connectionId, from }], pending: Record<id, status>, eventCounter, rankVersion }` with a weak `ETag`. `If-None-Match` returns 304.
  - One shared client hook polls every 3 s while visible and online. It backs off to 15 s on errors and pauses on hidden or offline.
  - Home, Pending, LIVE and Ranking read from the pulse. A full list is fetched only when the `incoming` ids change.
  - Rate-limited per user (T-036).
- **Edge cases:** clock skew (use server versions, not timestamps). Several tabs (a BroadcastChannel leader, optional). An event that ends while polling.
- **Do not touch:** the Realtime design (T-081). The pulse is its fallback.

<a id="ux-a8"></a>
### UX-A8 · Connections list: sort, sections, counts, pagination

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | profile+QR | T-000, T-060, T-061 | M |

- **E2E:** `e2e/connections/list.spec.ts`. Scenarios:
  - at 320×568 the chip row scrolls horizontally, the page `scrollWidth` is 320 and every chip is reachable;
  - the chips stay visible after scrolling 2 screens;
  - sorting by name orders A–Z with accents ("Álvaro" next to "Alvaro");
  - sections "Founders Fest GDL · hoy" and "Septiembre" appear;
  - a chip shows a count "Nuevas 12";
  - 60 mocked connections load 30, then 30 more on scroll;
  - an empty filter shows a CTA to Conectar;
  - zero connections shows the empty design.
- **Files:** `components/connections/ConnectionList.tsx` (`flex gap-2` chip row, all rows animate), `app/(app)/connections/page.tsx`, `lib/server/connections.ts`, `lib/api/routes.ts`, `lib/api/schemas.ts`.
- **Acceptance:**
  - `GET /api/connections?cursor&limit=30&sort=recent|name&type&event&q` returns `{ people, nextCursor, counts: { all, new, reconnection, friend } }`. It stays backward-compatible: no params means today's shape.
  - An index supports `(user, last_met_at desc)` (an additive migration, numbered after the latest on `main`).
  - The chip row is a scroller with snap and an edge fade. Chips sit in the `StickyBar`.
  - The row meta line shows "Company · 21:40" or "Company · 12 sep". Topics move to the second line only at ≥600.
  - Only the first 8 rows animate. Later pages appear without stagger.
- **Edge cases:** a person met at several events appears once, in the section of the latest meeting. A sort change resets the cursor. Restore the scroll position on back (the Next router keeps it for client navigations [Inference]; verify).
- **Do not touch:** the incoming-requests block (T-031).

<a id="ux-a9"></a>
### UX-A9 · Connections master-detail at tablet and desktop

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000, UX-A1, UX-A8 | M |

- **E2E:** `e2e/connections/master-detail.spec.ts`. Scenarios:
  - at 1440, clicking a row shows the person in the right pane, the URL becomes `/people/<handle>` and the list keeps its scroll;
  - a reload of `/people/<handle>` at 1440 shows both panes;
  - at 390 the same click navigates full screen;
  - keyboard: arrow keys move the row selection, and Enter opens.
- **Files:** `app/(app)/connections/layout.tsx` (new), intercepting route `app/(app)/connections/@detail/(..)people/[handle]/page.tsx` or an equivalent, `app/(app)/people/[handle]/page.tsx`.
- **Acceptance:** at ≥834 a list of 360 px plus a detail pane filling the rest. An empty detail shows "Elige a alguien". The selected row has `aria-current`.
- **Edge cases:** a deep link to a person who is not a connection (pending or stranger) opens full screen.
- **Do not touch:** the phone flow.

<a id="ux-a10"></a>
### UX-A10 · Person page: contact row, real "last time", history

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000, T-060 | M |

- **E2E:** `e2e/profiles/other.spec.ts`. Scenarios:
  - a connected person with LinkedIn and WhatsApp shows 2 contact buttons that open `linkedin.com` and `wa.me` in a new tab;
  - a pending person shows none, with copy "Se desbloquea al aceptar";
  - `lastInteraction.at` 3 days ago reads "hace 3 días" (es) or "3 days ago" (en), never "Hoy";
  - no interaction shows "Agregar nota" leading to `/connections/<id>/note`;
  - a meetings timeline lists events newest first.
- **Files:** `app/(app)/people/[handle]/page.tsx` (`copy.today` hard-coded on the "La última vez" row), `lib/format.ts`.
- **Acceptance:**
  - The contact row reuses the `NETWORK_STYLE` buttons from 06, with visible labels at ≥600.
  - Relative time uses `Intl.RelativeTimeFormat(locale)`.
  - The timeline reads `GET /api/users/{handle}/meetings?cursor&limit=10`: `{ eventName, at, kind, interaction? }`.
- **Edge cases:** links hidden by visibility are simply absent (no disabled buttons). A blocked person (T-041).
- **Do not touch:** visibility rules (`lib/visibility.ts`).

<a id="ux-a11"></a>
### UX-A11 · History-aware back button

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000 | S |

- **E2E:** `e2e/system/back.spec.ts`. Scenarios:
  - Ranking → podium person → Back returns to Ranking;
  - notification → person → Back returns to notifications;
  - a deep link straight to `/people/<handle>` → Back goes to `/connections` (fallback);
  - `/me` → Ranking → Back returns to `/me`;
  - the browser back button gives the same results.
- **Files:** `components/ui/Header.tsx` (a `back` href is always a `Link`), new client `BackButton`, `app/(app)/ranking/page.tsx` (`back="/home"`), `app/(app)/people/[handle]/page.tsx` (`back="/connections"`).
- **Acceptance:** the back button calls `router.back()` when the previous history entry is same-origin and inside the app, tracked in `sessionStorage` on navigation. Otherwise it goes to the fallback href. It keeps the 44 px `IconLink` look and its `aria-label`.
- **Edge cases:** a first page opened from a QR (no history). An external referrer such as LinkedIn. A `close` (X) button keeps its fixed target by design.
- **Do not touch:** close buttons on 06, 06b and 12.

<a id="ux-a12"></a>
### UX-A12 · Full leaderboard list with a sticky "me" row

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | live+seeds | T-000, T-072, T-073, UX-A7 | M |

- **E2E:** `e2e/gamification/ranking.spec.ts`. Scenarios:
  - 60 mocked rows show the podium plus a list from rank 4;
  - "Ir a mi lugar" scrolls to my row, and my row is sticky at the bottom while off-screen;
  - tied points show the same points with distinct ranks;
  - the "Vivo" pill appears only while the pulse is fresh, and the list re-orders when `rankVersion` changes;
  - at 320×568 my card is above the fold (podium clamp);
  - not ranked shows "Tu primera conexión te mete al ranking".
- **Files:** `components/ranking/RankingView.tsx` (podium plus `mine.above` only, podium `h-[372px]`), `app/(app)/ranking/page.tsx`, the leaderboard route, `lib/api/schemas.ts`.
- **Acceptance:**
  - `GET /api/e/{code}/leaderboard?scope=event|lifetime&around=me&limit=20&cursor` returns rows plus `me` plus `nextCursor`.
  - An index on `(event_id, points desc, user_id)` [Unverified: table name], added in an additive migration.
  - The podium height is `clamp(240px, 40dvh, 420px)`.
  - Rows link to `/people/<handle>` when connected, otherwise to a public card.
- **Edge cases:** leaderboard opt-out (T-077) rows are hidden. The event ended means a frozen board with a "Final" label.
- **Do not touch:** points rules (T-120).

<a id="ux-a13"></a>
### UX-A13 · Notifications: mark seen after paint, day sections, inline actions

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| backend+ui | P1 | connections+points | T-000, T-080 | M |

- **E2E:** `e2e/notifications/bell.spec.ts`. Scenarios:
  - a server render of `/notifications` makes no `POST /seen`; the client posts it once after paint;
  - the new dots stay on items for that visit and are gone next visit;
  - items group into "Hoy", "Ayer" and dates;
  - a request row's "Aceptar" accepts in place, with the mock `not_pending` error shown inline;
  - 40 mocked items load 20 at a time;
  - there is no empty bottom padding.
- **Files:** `app/(app)/notifications/page.tsx` (`apiPostQuietly(".../seen")` during render, `Screen dock`), a new client `MarkSeen` component, the notifications route (`before`, `limit`).
- **Acceptance:**
  - Seen is posted from the client with `seenThrough` = the newest rendered `createdAt`.
  - Sections use the locale's time zone (T-111 `Intl`).
  - The header uses `StickyBar` and `Header`.
  - `dock={false}`.
- **Edge cases:** a notification that arrives while the page is open is not marked seen. A request expired since (`event_ended` copy).
- **Do not touch:** the derived-list design (no notifications table, gap analysis P2).

<a id="ux-a14"></a>
### UX-A14 · First-run tours that never block the connect moment

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-111 | S |

- **E2E:** `e2e/system/tour.spec.ts`. Scenarios:
  - the first visit to `/connect/<handle>` and `/requests/<id>` shows no tour overlay, and the inline hints are visible;
  - the Home tour at 320×568 keeps 12 px side margins and never covers its target;
  - Skip, Escape and back all close it;
  - `en` shows English;
  - the "Guía rápida" replay works.
- **Files:** `components/tour/Tour.tsx` (`POPUP_WIDTH = 318`, `POPUP_HEIGHT = 210`), `components/connect/RegisterForm.tsx` (`<Tour id="register">`), `lib/copy/es.ts` and `en.ts` (`tour.*`).
- **Acceptance:**
  - The register tour is removed and replaced by one-line hints under each section, shown on the first 2 visits.
  - The popup width is `min(318px, 100vw - 24px)`, and it flips above or below by measured height.
  - Home and Me tours merge into one 4-step tour on first Home.
  - Focus moves to the popup and returns to the target. Escape closes it.
- **Edge cases:** blocked storage shows the tour every time today; cap it with an in-memory flag per session. Reduced motion means no glide.
- **Do not touch:** the `data-tour` targets used by other tours.

<a id="ux-a15"></a>
### UX-A15 · Enter network values, not only toggle them

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | profile+QR | T-000, T-016 | M |

- **E2E:** `e2e/profiles/me.spec.ts`. Scenarios:
  - tapping a WhatsApp toggle with no value opens an inline input (`type="tel"`, `inputmode="tel"`, autocomplete `tel`);
  - saving `+52 81 1234 5678` stores `wa.me/528112345678`;
  - an Instagram `@handle` or URL is accepted (Postel) and normalized;
  - a foreign host shows the T-016 field error;
  - a toggle with no value cannot be "on";
  - every network shows a visible text label;
  - mock `invalid_input` appears inline.
- **Files:** `components/profile/LinkToggles.tsx` (toggles only), `components/profile/MyLinkToggles.tsx`, `components/profile/ProfileForm.tsx`, `lib/links.ts`.
- **Acceptance:**
  - Each network row is icon plus label plus value plus a visibility switch.
  - Values are saved through `PATCH /api/me` `links` (it already accepts `@user` or a URL). Visibility is saved through the visibility route.
  - The X network shows the X logo plus the text "X", not a close glyph.
- **Edge cases:** an empty string removes the link and turns visibility off. LinkedIn is prefilled from OIDC when known. A number without a country code: assume +52 only with a hint, or ask.
- **Do not touch:** visibility semantics (`lib/visibility.ts`).

<a id="ux-a16"></a>
### UX-A16 · Form hygiene: limits, autocomplete, field errors, AA error color

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | scaffold | T-000, T-111, T-113 | M |

- **E2E:** `e2e/onboarding/profile.spec.ts` and `e2e/record/note.spec.ts`. Scenarios:
  - the name input stops at 80 characters and the headline at 120;
  - a mocked 400 with `fields.name` highlights the name field with `aria-invalid` and `aria-describedby`;
  - the error text contrast is ≥4.5:1 (axe);
  - the note textarea shows a counter near its cap;
  - leaving `/connect/<handle>` while recording asks for confirmation;
  - both locales.
- **Files:** `components/profile/ProfileForm.tsx`, `components/ui/Field.tsx`, `components/record/NoteEditor.tsx`, `components/record/VoiceNoteButton.tsx`, `components/connect/RegisterForm.tsx`, `app/globals.css` (a new `--color-danger` token).
- **Acceptance:**
  - `maxLength` mirrors `PatchMeBody`.
  - `autoComplete` is `name`, `organization-title`, `organization` and `address-level2`. `enterKeyHint="next"` or `"done"`.
  - Field errors come from `ApiClientError.fields`.
  - Error text is ink with a coral icon, or a danger color at ≥4.5:1 on paper.
  - `beforeunload` and in-app navigation guards apply while recording or while an unsaved note exists.
- **Edge cases:** IME composition (no counter jump). Pasting 500 characters truncates with a visible note. Autofill of a full name.
- **Do not touch:** zod schemas, which are the source of truth for limits.

<a id="ux-a17"></a>
### UX-A17 · Sticky action bar on decision screens, and undo for decline

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | connections+points | T-000, T-031 | M |

- **E2E:** `e2e/connect/register.spec.ts`, `e2e/requests/accept.spec.ts`, `e2e/record/note.spec.ts`, `e2e/onboarding/monito.spec.ts`. Scenarios:
  - at 320×568, Confirm (05), Aceptar (06b), Guardar (08b) and "Listo, entrar" (02b) are in the viewport without scrolling;
  - the bar respects `safe-area-inset-bottom` (WebKit project);
  - "Ahora no" shows a 5 s undo toast, Undo keeps the request pending, and no `POST /decline` is sent;
  - after 5 s decline is sent, and navigating away early sends it at once;
  - the mock `not_pending` error appears in the bar.
- **Files:** a new `components/ui/ActionBar.tsx` (sticky bottom, paper background, top hairline), `components/connect/RegisterForm.tsx`, `components/connections/RequestActions.tsx`, `components/record/NoteEditor.tsx`, `components/monito/MonitoBuilder.tsx`.
- **Acceptance:**
  - The bar is `position: sticky; bottom: 0`, with padding `max(12px, env(safe-area-inset-bottom))`.
  - It holds the screen notice, the error line and the buttons. Content gets bottom padding so nothing hides under it.
  - The undo toast is `role="status"` and is focusable from the keyboard.
- **Edge cases:** the soft keyboard opening on 08b (the bar must not cover the textarea; use `visualViewport`). A decline queued while offline is not sent, and the toast says so (T-112).
- **Do not touch:** the silent-decline rule (M8). The requester is still never told.

<a id="ux-a18"></a>
### UX-A18 · Home space budget on short phones

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P1 | live+seeds | T-000, T-025 | S |

- **E2E:** `e2e/home/home.spec.ts`. Scenarios:
  - at 320×568 and 360×740 the Conectar card is fully in the first viewport, both with and without an incoming request;
  - the pairs area height equals its content (1 pair means no empty box);
  - a 60-character event name renders on 1 line with ellipsis and a `title`;
  - the live pill reads "EN VIVO" with visible spacing.
- **Files:** `app/(app)/home/page.tsx`, `components/home/LiveCard.tsx`.
- **Acceptance:**
  - Below 700 px of height, Conectar renders before the LIVE card, and LIVE collapses to the counter plus the rank row (tap to expand).
  - The pairs list is auto-height, showing up to 3.
  - Event-name truncation.
- **Edge cases:** no current event (T-025). The first night (empty) keeps the "Empieza aquí" sticker on Conectar.
- **Do not touch:** the tour targets `data-tour="live"` and `"connect"`.

<a id="ux-a19"></a>
### UX-A19 · Installable PWA with an offline fallback page

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| infra+ui | P1 | scaffold | T-000, T-112 | M |

- **E2E:** `e2e/system/pwa.spec.ts`. Scenarios:
  - `/manifest.webmanifest` is valid (name, `short_name` "Compa", `display: standalone`, `start_url: /home`, theme `#FFF6E5`, 192 and 512 icons plus a maskable icon);
  - a service worker registers;
  - `context.setOffline(true)` and a dock tap show the branded offline page with Retry, never a blank page;
  - back online, Retry loads the route;
  - no API response is cached.
- **Files:** new `app/manifest.ts`, `public/sw.js` (or a minimal hand-written worker; a dependency needs captain approval), `app/offline/page.tsx`, `app/layout.tsx`.
- **Acceptance:**
  - Only the app shell and static assets are precached, and the offline page is served on navigation failure.
  - Personal data is never cached (privacy).
  - The install prompt (`beforeinstallprompt`) is offered after the first accepted connection, not on first visit.
  - iOS gets an "Add to Home Screen" hint in Me.
- **Edge cases:** deploys must update the worker (skipWaiting plus a reload prompt). The auth callback must never be served from cache. The Vercel preview scope.
- **Do not touch:** the API routes' caching (`no-store`).

<a id="ux-a20"></a>
### UX-A20 · Haptic and auto-advance feedback on scan and accept

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | profile+QR | T-000, UX-A4 | S |

- **E2E:** `e2e/connect/scan.spec.ts`. Scenarios:
  - on detection `navigator.vibrate` is called with 30 (stubbed);
  - after 600 ms the app navigates to `/connect/<handle>` unless the found card was tapped;
  - with reduced motion there is no vibrate and no auto-advance;
  - accept on 06b vibrates once.
- **Files:** `components/connect/ScanPanel.tsx`, `components/connections/RequestActions.tsx`, the points pop in `app/(app)/connections/[id]/done/page.tsx`.
- **Acceptance:** a tiny `haptic(pattern)` helper that does nothing when unsupported or when `prefers-reduced-motion` is set. No sound.
- **Edge cases:** iOS has no Vibration API [Inference], so visual feedback alone must suffice.
- **Do not touch:** —

<a id="ux-a21"></a>
### UX-A21 · Badges: closest-first sort and fluid grid

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| ui | P2 | live+seeds | T-000, T-070 | S |

- **E2E:** `e2e/gamification/badges.spec.ts`. Scenarios:
  - "Por ganar" lists badges by progress ratio, highest first, with secrets last;
  - the grid has 3 columns at 390, 5 or more at 834 and 6 at 1440, with no horizontal scroll.
- **Files:** `components/badges/BadgeGrid.tsx`, `app/(app)/me/badges/page.tsx`.
- **Acceptance:** `grid-template-columns: repeat(auto-fill, minmax(112px, 1fr))`, and a stable sort.
- **Edge cases:** a badge earned while the page is open (T-071).
- **Do not touch:** the badge catalog.

<a id="ux-a22"></a>
### UX-A22 · Coherent mock examples for the demo

| Type | Priority | Lane | Depends on | Effort |
| --- | --- | --- | --- | --- |
| docs | P2 | scaffold | — | S |

- **E2E:** N/A (mock data only). Unit test in `lib/api/mock.test.ts`: the `incoming` example's `other.id !== me.id`, and `GET /api/notifications` with `mockExample: "empty"` returns 0 unseen.
- **Files:** `lib/api/examples.ts`, `lib/api/routes.ts` (named examples), `app/(app)/home/page.tsx` (`?demo=empty` should also request the empty notifications example).
- **Acceptance:**
  - `/requests/<id>` in mock mode shows "Valeria quiere conectar contigo", not the signed-in Diego.
  - `/home?demo=empty` shows a bell with no count.
- **Edge cases:** the OpenAPI document examples change too (`docs/api-quickstart.md` if it quotes them).
- **Do not touch:** real-mode code paths.
