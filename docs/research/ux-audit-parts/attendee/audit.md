# Attendee app UX audit (responsive, states, perceived speed)

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Branch: `docs/COMPA-TBD-live-dataviz-and-ux-research` · Baseline: `main` @ `f6f65f3`

Scope: the attendee screens in `app/(app)`, `app/(onboarding)`, `app/u`, `app/i`, `app/e/[code]/join` and the shared shell (`components/ui/Screen.tsx`, `components/nav/Dock.tsx`, `components/tour/Tour.tsx`). The landing, the event door and `/live` belong to other audit parts and appear here only where they touch the attendee flow.

New tickets for these findings are in [tickets.md](tickets.md) (`UX-A1`–`UX-A22`). Existing tickets are named with links to the [backlog](../../../flows/backlog.md).

## Method

- The app ran locally with `API_MODE=mock PORT=3101 bun run dev`. Mock mode has no auth and uses the example data in `lib/api/examples.ts`, so everyone is Diego at Founders Fest GDL.
- Playwright (Chromium 1140) took viewport screenshots of 20 routes at 320×568, 360×740, 390×844, 430×932, 834×1194, 1440×900 and 1920×1080, with `locale` set to `es-MX` and `en-US`. Phones used `isMobile` and `hasTouch`. Tours were marked seen for the base shots.
- More states were captured too:
  - first-run tours, full-page shots at 320 and 390, landscape 844×390, reduced motion and keyboard focus;
  - client-side errors through `x-compa-mock-error` (`self_connection`, `not_pending`) and a 400 on `PATCH /api/me`;
  - a "not found" search and a long name injected into the scan result;
  - an offline dock tap and a navigation slowed by 3 s.
- Every screenshot listed below was opened and checked by eye. Code claims cite the file.
- Screenshots: `shots/<screen>/<viewport>-<locale>[-state].jpg`. `-full` means full page. Every file is under 250 KB.

**Limits.**

- Server-rendered fetches cannot get mock errors or delays from the browser. `lib/api/server-fetch.ts` does not forward the `x-compa-mock*` headers, as T-000 notes. So server-side error, empty and loading states (for example an empty connections list or a failed Home) were judged from code, not screenshots.
- The bottom-left "N" badge and the "Rendering" pill are the Next.js dev overlay. They are not product UI.
- The `register` and `ranking` base shots show their first-run tour, because those tour ids were not pre-marked in the sweep. Clean versions are in the `-full` and `-reduced` shots.

## Top findings

1. **On tablet and desktop the app is a 390 px phone strip.** `Screen.tsx` caps every attendee screen at `max-w-[390px]`, and the mobile dock floats at the bottom center. That leaves about 53 % of the width blank at 834, 73 % at 1440 and 80 % at 1920 (A-001). T-114 only asks for "centered column or two-column", so the concrete adaptive shell is new (UX-A1).
2. **At 320 px the dock (fixed 327 px) is wider than the screen.** It is clipped on both sides and causes horizontal page scroll. The connections filter chips also overflow (A-002, A-060).
3. **At 320×568 the dock covers part of "Mi QR"**, so the screen's one job, being scanned, fails without a scroll (A-020).
4. **The scanner restarts the camera on every render**, for example on each keystroke in the search box. `useCamera` has an inline callback in its effect dependencies (A-030).
5. **Navigation shows no progress, and an offline tap ends on a blank white page.** There is no `loading.tsx`, and every page makes 2–7 loopback HTTP calls to its own API before it paints (A-005, A-006, A-008).

## Severity

- **P0**: breaks the core flow, or the captain's "use the whole space" goal, on a target device.
- **P1**: a real launch needs it.
- **P2**: polish.

## Laws and heuristics used

- Fitts's law (target size and distance, thumb zone).
- Hick's law (choices per decision).
- Miller's law (chunking).
- Jakob's law (match platform conventions).
- Doherty threshold (feedback in under 400 ms).
- Postel's law (be liberal in input, strict in output).
- The peak-end rule (the connect moment and the "done" screen are the peaks).
- Nielsen heuristics N1–N10: N1 visibility of status, N2 match with the real world, N3 user control, N4 consistency, N5 error prevention, N6 recognition over recall, N7 flexibility and efficiency, N8 minimalist design, N9 error recovery, N10 help.
- WCAG 2.2 AA.

---

## 0. App shell (all `(app)` screens)

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-001 | P0 | 834, 1440, 1920 | [home 834](shots/home/834-es.jpg), [connections 1440](shots/connections/1440-es.jpg), [me 1920](shots/me/1920-es.jpg), [connect 834](shots/connect/834-es.jpg) | Jakob, Miller, N8 | `Screen.tsx` caps every screen at `max-w-[390px]`, so tablets and desktops show a phone strip with 450–1530 px of empty paper. Fix: an adaptive shell, described in UX-A1. Phones (<600) stay fluid at 100 % width, with no 390 cap and a max of 560. Tablets (600–1023) get two panes or a two-column grid and a side rail instead of the dock. Desktops (≥1024) get a nav rail plus main plus an aside, for live, requests and rank, with a max content width of about 1200. | None | T-114 (partial) |
| A-002 | P0 | 320 | [home 320 full](shots/home/320-es-full.jpg), [connections 320 full](shots/connections/320-es-full.jpg) | Fitts, N4 | The dock is fixed at 327 px and its inner track at 312 px, so at 320 it is clipped and the page gets horizontal scroll (full-page width 350 px). Fix: compute the width from `min(327px, 100vw - 16px)` and derive `STEP` and `OPEN` from it. Under 340 px, shrink the open label. | None | T-114 (no horizontal scroll) |
| A-003 | P1 | 844×390 landscape | [home landscape](shots/home/844x390-es-landscape.jpg) | Fitts, N8 | In landscape the dock covers about 25 % of the height and sits over the content. Fix: a compact dock (50 px, icons only) when `height < 500`, or hide it while scrolling down and show it on scroll up. | None | — |
| A-004 | P1 | all | [connections 390](shots/connections/390-es.jpg) | N6, Jakob | Inactive dock tabs show icons only, with labels hidden (`maxWidth: 0`). New users must guess the people and profile icons. Tablets and desktops have room for every label. Fix: labels always shown at ≥600 (rail). On phones, a long-press tooltip at minimum. | None | — |
| A-005 | P1 | all | [slow nav at 1 s](shots/home/390-es-slow-nav-1s.jpg) | Doherty, N1 | Tapping a dock tab moves the pill at once (good), but the old screen stays with no progress cue until the server render lands. There is no `loading.tsx` under `app/(app)`. Fix: skeletons (T-004) plus a 2 px top progress bar driven by the pending route (UX-A5). | None | T-004 |
| A-006 | P1 | all | — (code) | Doherty | Every page fetches through HTTP loopback to its own `/api/*` (`lib/api/server-fetch.ts`). The `(app)` layout calls `/api/me`, then the page calls it again. Home makes 7 loopback calls in 2 waves: me, then live, door, connections, invites and notifications. Each pays HTTP plus auth plus zod again. Fix: call the server services directly in Server Components, with `React.cache()` per request for `me` (UX-A6). | Shared loaders in `lib/server/*`, wrapped in `cache()` | — |
| A-007 | P1 | all | — (code) | N1, scalability | Home polls `GET /api/connections` (the full list) and `GET /api/notifications` every 3 s. `PendingWatcher` polls every 3 s. None of them pause when the tab is hidden or back off on errors. With 500 attendees that is about 330 full-list queries per second [Inference]. Fix: one light `GET /api/me/pulse` with ETag and 304, paused when hidden, with backoff (UX-A7). | New pulse endpoint, conditional GET, index on `connections(addressee_id, status)` | T-031 (pause), T-081 |
| A-008 | P1 | 390 | [offline tap](shots/home/390-es-offline-tap.jpg) | N9, N1 | Tapping a tab while offline ends on a **blank white page**: client navigation fails, then the hard navigation fails. Fix: an `online`/`offline` banner and disabled writes (T-112), plus a service-worker offline fallback page (UX-A19). | None | T-112 |
| A-009 | P1 | all `-en` shots | [monito en](shots/onboarding-monito/390-en.jpg), [home tour en](shots/home/390-en-tour.jpg) | N2, N4 | With `en-US`, every attendee screen except notifications and the bell renders in Spanish. The `es` and `en` files are byte-identical in size. `<html lang="es">` is hard-coded, and the dock labels and `aria-label` are Spanish literals. | None | T-111 |
| A-010 | P1 | all | [register error](shots/register/390-es-error.jpg), [profile error](shots/onboarding-profile/390-es-error.jpg) | N9, WCAG 1.4.3 | API errors show the raw English `message` ("You cannot connect with yourself.", "Some fields are invalid.") in coral `#FF6B4A` on paper. That is **2.62:1** contrast, which fails AA. Muted `#6F6A7E` on `gum-soft` (4.32:1) and `sky-soft` (4.48:1) also fails for 12–13 px text. Fix: an error-code map (T-111), errors in ink with a coral icon or a `#C2410C`-class red that reaches ≥4.5:1, and per-field errors (UX-A16). | Return `fields` (already in `ApiClientError`) | T-111, T-113 |
| A-011 | P1 | unknown route | [404](shots/request/390-es-unknown-route.jpg) | N9, N4 | The unknown-route page is the unstyled Next default ("404 This page could not be found."): English, off-brand and with no way back. | None | T-004 |
| A-012 | P1 | all | — (code) | Jakob, PWA | There is no web app manifest, so the app cannot be installed. In a browser tab, phones lose about 100–150 px to the browser chrome, and standalone mode gives that space back to the app (the captain's space goal). `viewportFit: cover` and safe-area insets are already in place. | None | — (UX-A19) |
| A-013 | P2 | phones | — (code) | N1 | There is no haptic feedback on scan detection, accept or the points pop. Android supports `navigator.vibrate`; iOS Safari does not [Inference]. | None | — (UX-A20) |
| A-014 | P2 | 390 | [monito](shots/onboarding-monito/390-en.jpg), [connections](shots/connections/390-es.jpg) | Fitts, WCAG 2.5.8 | Color swatches are 32×32 px (`MonitoBuilder.tsx` `h-8 w-8`), option chips are 32 px tall and filter chips about 34 px. AA's 24 px minimum passes, but DESIGN.md's 44 px rule does not. Fix: keep the 32 px visual and pad the hit area to 44 px. | None | T-113 |
| A-015 | P2 | 1440 | [focus](shots/connections/1440-es-focus.jpg) | WCAG 2.4.7 | The keyboard focus ring is the browser default, a thin blue outline. It is visible but off-brand and weak on colored cards. Fix: a global `:focus-visible` ring of 3 px ink plus 4 px mint offset. | None | T-113 |
| A-016 | P2 | all | [ranking reduced](shots/ranking/390-es-reduced.jpg) | a11y | Reduced motion is honored globally (`globals.css`), and Ranking and Done stay complete without motion. Keep this. The screen slide-in template also stops, which is correct. | — | — |

## 1. Home (03, 03b) — `/home`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-017 | P1 | 320, 360 | [home 320](shots/home/320-es.jpg), [320 full](shots/home/320-es-full.jpg) | Fitts, Hick | The primary action **Conectar** is below the fold at 320×568 and sits at about 560–650 px at 390. The LIVE card takes about 60 % of the first screen. Fix: at heights under 700, put Conectar first (or make it the dock's center action), and collapse the LIVE card to the counter and rank row (UX-A18). | None | — |
| A-018 | P1 | all | [home 390](shots/home/390-es.jpg), [834](shots/home/834-es.jpg) | N8 | The rising-pairs area is a fixed box of about 140 px, but it holds a single pair, so about 100 px of empty light blue. Fix: size it to its content (1–3 pairs), or show "latest 3 connections" as a list. | `LiveSnapshot.recentPairs` must hold ≥3 | — |
| A-019 | P2 | 320, all | [home 320](shots/home/320-es.jpg) | N4 | The event line "Founders Fest GDL · hasta las 22:00" wraps beside the pill at 320, and a long event name would push the counter down. The pill reads "ENVIVO" (tight tracking). Fix: one line with ellipsis plus `title`, and real word spacing. | None | — |
| A-021 | P1 | all | — (code) | N1 | The LIVE counter and pairs are server-rendered once. They are not refreshed and have no "updated n s ago" or stale state (DESIGN.md: "last known counters, marked stale"). Fix: refresh from the pulse (UX-A7), and add a stale label when offline (T-112). | Pulse includes `eventCounter` | T-112 |
| A-022 | P2 | 390 | [home empty](shots/home-empty/390-es.jpg) | N4 | The first-night preview still shows a bell with 3 notifications. That is a mock inconsistency, but it would confuse demo viewers (UX-A22). | Mock example | — |
| A-023 | P1 | 834, 1440 | [834](shots/home/834-es.jpg) | Miller, N8 | At tablet and desktop size Home should be a dashboard: requests, LIVE and rank in one row, then Conectar and Invite. Today it is a single 356 px column (UX-A1). | None | T-114 |

## 2. Connect: Mi QR (04) — `/connect`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-020 | P0 | 320×568 | [connect 320](shots/connect/320-es.jpg) | Fitts, N8 | The QR card is a fixed 274 px plus padding, so the dock covers its bottom rows. The screen's only job, being scanned, needs a scroll first. Fix: size the QR from the space left (`min(274px, 100dvh - header - tabs - dock - 40px)`, at least 200), or hide the dock on this tab (UX-A3). | None | — |
| A-024 | P1 | 834, 1440 | [connect 834](shots/connect/834-es.jpg) | Fitts | On a tablet held up at a booth the QR stays 274 px with 600 px blank below. Fix: scale the QR up to about 60 % of the short side, and at ≥834 show Mi QR and Escanear side by side with no tab switch (Hick). | None | — |
| A-025 | P1 | phones | — (code) | N7 | There is no full-screen or brightness mode for the QR, and no Screen Wake Lock, so the phone dims while someone lines up a scan. Fix: tap the QR for full screen, and request `navigator.wakeLock` while it is visible. | None | — |
| A-026 | P2 | 320 | [connect 320](shots/connect/320-es.jpg) | N4 | The identity card is a fixed `w-[315px]`, which leaves an uneven 2 px margin at 320. Fix: `w-full`. | None | — |

## 3. Connect: Escanear (04, F-17–F-21) — `/connect?tab=scan`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-030 | P1 | all | — (code: `ScanPanel.tsx` `useCamera(videoRef, (handle) => …)`, effect deps `[videoRef, onHandle]`) | Doherty, N1 | The inline callback has a new identity on every render. So each `setQuery` keystroke, `setFound` or `setNotFound` stops every camera track and calls `getUserMedia` again. That causes viewfinder flicker, battery drain and possible repeated permission prompts [Inference: iOS shows the prompt again per session]. Fix: keep the callback in a ref and use `[]` effect deps (UX-A4). | None | T-033 (scan fallback, separate) |
| A-031 | P1 | 320, 834+ | [scan 320](shots/connect-scan/320-es.jpg), [scan 834](shots/connect-scan/834-es.jpg) | Fitts | The viewfinder is a fixed 360 px tall with corners at fixed pixel offsets (`left-[72px]`, `top-[234px]`). At 320×568 the search fallback sits under the dock. On tablets the frame is small and off-proportion. Fix: an `aspect-square` box with `clamp(220px, 45dvh, 420px)` and corners in percent. When the camera is unavailable, put the search first. | None | T-033 |
| A-032 | P1 | 390 | [not found](shots/connect-scan/390-es-notfound.jpg) | Postel, N5 | The search is an exact-handle lookup (`slugify(query)`), so "valeria" finds nothing. Fix: name search over the event's attendees. | `GET /api/e/{code}/attendees?q=` | T-034 |
| A-033 | P2 | 390 | [long name](shots/connect-scan/390-es-longname.jpg) | N8 | The found card does not clamp: a 47-character name takes 3 lines and the headline 4, and the card hides the whole frame. Fix: name clamped to 2 lines and headline to 1, with `title`. | None | — |
| A-034 | P1 | all | — (code) | N5 | A self-scan shows your own card with "Conectar". The 409 `self_connection` arrives only after Confirm on 05 (F-21). Fix: compare with `me.handle` on detection and say "Ese eres tú". | None | F-21 → T-111 (copy only) |
| A-035 | P2 | phones | — | N1 | There is no haptic or sound on a successful detection, and no auto-advance. Fix: vibrate for 30 ms, then go to `/connect/<handle>` after 600 ms unless the person taps elsewhere (UX-A20). | None | — |

## 4. Register (05) — `/connect/<handle>`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-040 | P1 | 320–430 first visit | [tour 320](shots/register/320-es-tour.jpg), [tour 390](shots/register/390-es-tour.jpg) | Peak-end, Hick | A 4-step first-run tour opens on this screen, the most time-critical moment, while both people stand there waiting. Fix: no tour on 05 or 06b, and use one-line inline hints instead (UX-A14). | None | — |
| A-041 | P1 | 320 | [320 full](shots/register/320-es-full.jpg) | N8, N4 | The "Ya se conocían" pill overlaps the wrapped name ("Ochoa" collides with it), and the headline wraps 3 lines. Fix: move the pill under the name at <360, and clamp the headline to 1 line. | None | — |
| A-042 | P1 | 320 | [320 full](shots/register/320-es-full.jpg) | Fitts | Confirm is below the fold at 320×568. Fix: a sticky bottom action bar with a safe-area inset, holding the screen notice and the button (UX-A17). | None | — |
| A-043 | P1 | 390 | [error](shots/register/390-es-error.jpg) | N9, WCAG 1.4.3 | The error shows the raw English API message in 2.62:1 coral. `self_connection` should be refused on load (A-034). | Error-code map | T-111 |
| A-044 | P2 | all | — (code: `toggleTopic`) | N1, N5 | A 4th topic tap is ignored silently (`MAX_TOPICS = 3`). Fix: a counter "2/3", unpicked chips dimmed at 3, a light shake on the 4th. | None | — |
| A-045 | P1 | all | — (code) | N5, N3 | There is no guard when leaving during a recording or with an unsent note. Back or a dock tap loses the audio. Fix: confirm on `beforeunload` and on the in-app back while `recording` or `ready`. | None | T-054 (server copy of the note) |
| A-046 | P1 | all | — (code) | Doherty | Confirm waits for `POST /api/connections`, then `router.push`. There is no optimistic transition to the pending screen. Fix: navigate at once to a pending skeleton, and reconcile with the id. This needs a client idempotency key so a retry cannot double-create. | `Idempotency-Key` header on `POST /api/connections` | T-036 |

## 5. Pending and confirmation (06) — `/connections/<id>/done`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-050 | P1 | all | — (code: `PendingWatcher.tsx`) | N1 | Polling every 3 s never pauses, backs off or times out, and there is no visible "waiting for Valeria…" activity. Fix: the pulse hook (UX-A7), a subtle waiting animation, and after the event end show `event_ended`. | Pulse includes `pendingIds` status | T-032 |
| A-051 | P2 | 390 | [done 390](shots/done/390-es.jpg), [reduced](shots/done/390-es-reduced.jpg) | Peak-end | It is a strong peak screen: points pop, summary and networks. With reduced motion it stays complete. At ≥834 it is a narrow strip, so give the celebration room (UX-A1). | None | — |
| A-052 | P2 | all | [done 390](shots/done/390-es.jpg) | N6 | Network buttons are icon-only (they have `aria-label`). Show a visible caption at ≥600. | None | — |

## 6. Incoming request (06b) — `/requests/<id>`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-053 | P1 | 320 | [request 320](shots/request/320-es.jpg) | Fitts | Accept is about 1.5 screens down at 320×568. It fits at 390 ([full](shots/request/390-es-full.jpg)). Fix: sticky Accept / Ahora no bar (UX-A17). | None | T-031 |
| A-054 | P1 | all | [error](shots/request/390-es-error.jpg) | N3, N9 | "Ahora no" declines at once, with no undo. A mis-tap loses the connection, and the reverse request needs T-039. Fix: a 5 s undo toast before `POST /decline` is sent. | None (delay client-side), or `POST /undecline` within 10 s | T-039 |
| A-055 | P2 | 390 | [request 390 full](shots/request/390-es-full.jpg) | N2 | The mock `incoming` example uses Diego, the signed-in user, as the requester ("Diego quiere conectar contigo"). Fix the example (UX-A22). | Mock data | — |

## 7. Connections (07) — `/connections`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-060 | P0 | 320 | [320](shots/connections/320-es.jpg), [320 full](shots/connections/320-es-full.jpg) | N4 | The filter chip row (`flex gap-2`, no wrap and no scroll) overflows: "Amigos" is cut and the page scrolls sideways. Fix: a horizontal scroller with `overflow-x-auto`, `scroll-snap`, an edge fade and `scrollbar-width: none`. | None | T-114 |
| A-061 | P1 | all | [390](shots/connections/390-es.jpg) | N7 | The search icon and the event chip do nothing. | — | T-061 |
| A-062 | P1 | all | [390](shots/connections/390-es.jpg) | Miller, N6, N7 | There is no sort (recent, name, points, follow-up pending), no day or event sections, and no count per filter. A row shows topics but not the company or "when we met", which hurts recall ("who was that?"). Fix: sections by event and day, a sort menu, counts on chips, and a meta line "Kuali · 21:40" (UX-A8). | `GET /api/connections?cursor&limit=30&sort=recent|name&type&event&q`, index `(user_id, last_met_at desc)` | T-061, T-060 |
| A-063 | P1 | all | — (code) | Doherty | The whole list loads in one response with no pagination or windowing. At 150+ connections (lifetime) the server render and the DOM grow without bound, and every row animates in. Fix: cursor pagination with infinite scroll and an `IntersectionObserver` sentinel. Animate only the first 8 rows (already capped by delay, but all rows still animate). | Cursor pagination | — |
| A-064 | P1 | all | — | N1 | Incoming requests are not listed here. | — | T-031 |
| A-065 | P2 | all | [320 full](shots/connections/320-es-full.jpg) | N7 | The header and chips scroll away, so filtering on a long list means scrolling back to the top. Fix: put the chips inside the `StickyBar`. | None | — |
| A-066 | P1 | 834, 1440 | [1440](shots/connections/1440-es.jpg) | Jakob | At tablet and desktop size use master-detail: the list on the left and `/people/<handle>` on the right, through parallel or intercepting routes (UX-A9). | None | T-114 |
| A-067 | P2 | all | — (code) | N9 | The empty filter result is muted text only, with no next step. The empty list (0 connections) is not designed on this screen. Fix: an illustration plus "Conectar" CTA. | None | — |

## 8. Another person (08) — `/people/<handle>`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-070 | P1 | all | [person 390](shots/person/390-es.jpg) | N7, N6 | A **connected** person's profile shows no way to contact them. LinkedIn, WhatsApp and Instagram appear only once, on the "done" screen. Fix: a networks row under the header when `connection.status === "accepted"` (UX-A10). | `UserProfile.card.links` (already returned when connected, `valeriaConnected`) | — |
| A-071 | P1 | all | [person 390](shots/person/390-es.jpg) | N2 | The "La última vez" row prints `copy.today` ("Hoy") for every interaction, whatever its date. Fix: relative date from `lastInteraction.at` with `Intl.RelativeTimeFormat`. | `lastInteraction.at` | — |
| A-072 | P2 | 390 | [person 390](shots/person/390-es.jpg) | N8 | About 250 px is empty below the last card. Fix: a meeting-history timeline (events, notes and pending follow-ups) and an "Add a note" CTA when there is none. | `GET /api/users/{handle}/meetings?cursor` | T-053, T-056 |
| A-073 | P1 | all | — (code) | Jakob, N3 | Back is always `/connections`, even when the person was reached from Ranking, a notification or a request. Fix: history-aware back with a fallback (UX-A11). | None | — |
| A-074 | P2 | all | — | N7 | "Conexiones en común" links to the whole `/connections` list, not a filtered one. Fix: `?mutual=<handle>`. | `mutual` filter | T-061 |

## 9. Voice note (08b) — `/connections/<id>/note`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-075 | P1 | 320 | [320 full](shots/note/320-es-full.jpg) | Fitts | Save is below the fold at 320×568. The recording card is a fixed `h-[486px]` and overflows short screens. Fix: a sticky action bar, and `min-h` in place of the fixed height (UX-A17). | None | — |
| A-076 | P1 | all | — (code) | N5 | The typed note has no `maxLength` or counter, and leaving with an unsaved draft has no guard. The draft text sits in browser storage (`lib/note-draft.ts`). | Server cap on draft text length | T-054, T-057 |
| A-077 | P2 | all | [note 390](shots/note/390-es.jpg) | Doherty | "Transcribing" and "drafting" show the recording card in a disabled state, with no progress or time estimate. Fix: a labelled indeterminate bar, and stream the draft if it is available. | Streaming draft (optional) | T-052 |

## 10. My profile (09) — `/me`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-080 | P1 | all | [me 390](shots/me/390-es.jpg), [profile 390](shots/onboarding-profile/390-es.jpg) | N5, N2 | The "Redes que compartes" toggles turn visibility on or off, but nothing lets the person **enter** a WhatsApp number or an Instagram or X handle. A network can be "shared" with no value. `PatchMeBody.links` already accepts values. Fix: an inline input per network, and the toggle disabled until it has a value (UX-A15). | `PATCH /api/me` `links` (exists), host validation T-016 | T-016 |
| A-081 | P2 | all | [me 390](shots/me/390-es.jpg) | N2 | The X icon reads as "close / remove", and off toggles at 55 % opacity look disabled rather than off. Fix: a visible label under each icon and an explicit "Oculto" state. | None | — |
| A-082 | P2 | 1920 | [me 1920](shots/me/1920-es.jpg) | N8 | On desktop the profile is a 356 px strip. Fix: a two-column layout, with identity and stats on the left and badges, networks and settings on the right (UX-A1). | None | T-114 |

## 11. Badges (10) — `/me/badges`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-085 | P2 | all | [badges 390](shots/badges/390-es.jpg) | Hick, goal-gradient | "Por ganar" keeps catalog order. Fix: sort "closest to earn" first (progress ratio desc), with secrets last. | None | — (UX-A21) |
| A-086 | P2 | 834+ | [badges 834](shots/badges/834-es.jpg) | N8 | The grid is a fixed 3 columns at every width. Fix: `repeat(auto-fill, minmax(112px, 1fr))`. | None | T-114 |
| A-087 | P1 | all | — | N1 | `?of=<handle>` shows **my** badges under another person's back link. | `GET /api/users/{handle}/badges` | T-064 |

## 12. Ranking (11) — `/ranking`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-090 | P1 | all | [reduced 390](shots/ranking/390-es-reduced.jpg) | N7, Miller | Only the podium, my card and the one person above me are shown. Ranks 4..N are missing, so there is no list, no "jump to me" and no way to see who is near. Fix: a windowed list with a sticky "me" row (UX-A12). | `GET /api/e/{code}/leaderboard?scope&around=me&limit=20&cursor`, index `(event_id, points desc, id)` | T-072, T-073 |
| A-091 | P1 | all | [ranking 390](shots/ranking/390-es.jpg) | N1 | The header pill says "Vivo" but the board is server-rendered once and never refreshes. Fix: refresh on the pulse or every 10 s while visible, or drop the pill. | Pulse `rankVersion`, or SSE | T-081 |
| A-092 | P2 | 320, 1440 | [ranking 320](shots/ranking/320-es.jpg) | N8 | The podium is a fixed `h-[372px]`. At 320×568 it pushes my card below the fold, and at desktop it is small. Fix: `clamp(240px, 40dvh, 420px)`. | None | — |
| A-093 | P2 | all | — | Jakob | Back is hard-coded to `/home`, but Ranking is also reached from `/me` and from a profile's points pill (UX-A11). | None | — |

## 13. Notifications — `/notifications`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-095 | P1 | all | [390](shots/notifications/390-es.jpg) | N1 | The page **marks everything seen during the server render** (`apiPostQuietly(".../seen")` in the GET page). Any prefetch, retry or double render clears the badge before the person sees the list. The list it shows still has every "new" dot. Fix: mark seen from a client effect after paint, with `seenThrough` of the newest item shown (UX-A13). | Same endpoint, called from the client | T-080 |
| A-096 | P1 | all | [390](shots/notifications/390-es.jpg) | N2, Miller | Items show only a clock time ("12:15 p.m."), with no day, no grouping and no relative time. Fix: "Hoy / Ayer / date" sections and relative time. | `createdAt` exists | T-111 (`Intl`) |
| A-097 | P2 | all | [390](shots/notifications/390-es.jpg) | Fitts, N7 | A request notification needs 2 taps to accept. Fix: inline "Ver" / "Aceptar" on request rows. There is also no pagination, and the header is not sticky (no `StickyBar`). | `GET /api/notifications?before=&limit=` | T-080 |
| A-098 | P2 | all | — (code) | N8 | `Screen dock` reserves 104 px of bottom padding, but `/notifications` is not a dock route, so the dock is hidden. Fix: `dock={false}`. | None | — |

## 14. Invite (12) — `/invite`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-100 | P2 | 320 | [invite 320](shots/invite/320-es.jpg) | Fitts | The link and share are below the fold at 320×568, and the link is truncated. Fix: the share sheet (`navigator.share`) as the primary button in the first screen, and copy as secondary. | None | T-074 |

## 15. Onboarding (02, 02b) — `/onboarding/profile`, `/onboarding/monito`

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-105 | P1 | 390 | [140-char name](shots/onboarding-profile/390-es-error.jpg), [empty name](shots/onboarding-profile/390-es-empty-name.jpg) | N5, Postel | The inputs have no `maxLength` (zod allows 80 for the name and 120 for the headline), no `autoComplete` (`name`, `organization-title`, `organization`, `address-level2`) and no `enterKeyHint`. A 140-character name is accepted, then the generic English "Some fields are invalid." appears with no field highlighted. Fix: mirror the zod limits, add per-field errors from `fields`, and show a counter near the limit (UX-A16). | `fields` in 400 (exists) | T-013, T-111 |
| A-106 | P2 | 320 | [monito 320](shots/onboarding-monito/320-es.jpg) | Fitts | The builder is long at 320 and "Listo, entrar" is far down. Fix: a sticky save bar (UX-A17). | None | — |
| A-107 | P2 | 390 | [monito en](shots/onboarding-monito/390-en.jpg) | N6 | Swatches have `aria-label` but no visible names, which is acceptable. Hit areas are 32 px (A-014). | None | T-113 |
| A-108 | P2 | 834+ | [profile 834](shots/onboarding-profile/834-es.jpg) | N8 | At tablet size and up, put the form and a live preview card side by side. | None | T-114 |

## 16. Deep links and auth (`/u/<handle>`, `/i/<code>`, `/e/<code>/join`, `/auth/*`)

| ID | Sev | Viewport(s) | Screenshot | Law / heuristic | Finding → fix | Backend need | Existing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-110 | P2 | all | — (code: `app/u/[handle]/page.tsx`) | N9 | An invalid handle silently redirects to `/` with no message. Fix: `/?error=bad_link` copy. | None | — |
| A-111 | P1 | all | — (code: `onboarding/profile/page.tsx`) | N5 | The invite claim runs as a side effect of a GET page render, so every reload or prefetch posts the claim again. | Idempotent claim, already 404-safe | T-075 |
| A-112 | P2 | 390 | [join 390](shots/event-join/390-es.jpg) | Fitts | "Ahora no" is a bare text link, smaller than 44 px. Fix: a 44 px tall secondary button. | None | — |
| A-113 | P1 | all | — | N3 | A session that expires mid-flow (scan → register) is not refreshed. | — | T-006 |

## Backend needs (roll-up)

| Need | Serves | Notes |
| --- | --- | --- |
| `GET /api/me/pulse` with `ETag` and `304` | A-007, A-021, A-050, A-091 | Returns `{ unseenCount, incoming: [ids], pending: {id: status}, eventCounter, rankVersion }`. Replaces 3 polls with one cheap read. Later moved to Realtime (T-081). |
| Direct service loaders in Server Components, wrapped in `React.cache()` | A-006 | No loopback HTTP. One `me` per request. |
| Cursor pagination on `/api/connections`, `/api/notifications`, leaderboard and meetings | A-062, A-063, A-090, A-097, A-072 | `limit` ≤ 50, opaque cursor, stable order with an `id` tie-break. |
| Indexes `connections(addressee_id, status)`, `connections(requester_id, created_at desc)`, `scores(event_id, points desc, user_id)` | A-007, A-062, A-090 | [Unverified] against the current `drizzle/` schema. Check before the migration (additive only). |
| `Idempotency-Key` on `POST /api/connections` and `/accept` | A-046, A-054 | Makes optimistic UI and retries safe. |
| Error-code map plus `fields` everywhere | A-010, A-043, A-105 | T-111. |
| Leaderboard `around=me` | A-090 | A window of ±10 around my rank. |

## Counts

| Severity | Findings |
| --- | --- |
| P0 | 4 (A-001, A-002, A-020, A-060) |
| P1 | 48 |
| P2 | 32 (A-016 is a "keep" note) |
| Total | 84 |

IDs are grouped per screen, so the numbering has gaps on purpose.
