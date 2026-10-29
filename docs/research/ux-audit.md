# Whole-app UX and edge-case audit

Date: 2026-10-29 · Ticket: `COMPA-<TBD>` · Baseline: `main` @ `f6f65f3` · Audit only; no product code changed. Run on local mock mode (`API_MODE=mock`), es and en, 320 to 2560 px wide.

## Parts

| Part | Scope | Findings | New tickets |
| --- | --- | --- | --- |
| [attendee/audit.md](ux-audit-parts/attendee/audit.md) | 18 attendee routes, 334 screenshots | 84 (4 P0, 48 P1, 32 P2) | [UX-A1 – UX-A22](ux-audit-parts/attendee/tickets.md) |
| [public-admin/audit.md](ux-audit-parts/public-admin/audit.md) | Landing, door, `/live`, admin; 204 screenshots | 55 (1 P0, 27 P1, 27 P2) | [UX-P1 – UX-P18](ux-audit-parts/public-admin/tickets.md) |

> **Staleness.** The audit ran against `main` @ `f6f65f3`. PRs #51 (responsive attendee screens) and #52 (3D landing) merged afterwards. Re-check UX-A1, UX-A2, UX-A9, UX-A18 and the landing findings (UX-P5, P-015) against current `main` before picking them up.

## Top findings

1. **P0 – Tablet and desktop waste the width.** Every attendee screen is a 390 px column: 53 % blank at 834, 73 % at 1440, 80 % at 1920 (UX-A1, UX-A9).
2. **P0 – Dock breaks at 320 px** (fixed 327 px, sideways scroll) and covers "Mi QR" at 320×568 (UX-A2, UX-A3).
3. **P0 – `/live` without WebGL** leaves about 70 % of a 1920 screen empty (UX-P10).
4. **P1 – Perceived speed.** No navigation feedback, blank page offline, 2–7 API calls per page, Home re-downloads the full list every 3 s even in a hidden tab (UX-A5, UX-A6, UX-A7, UX-A19).
5. **P1 – Admin lists do not scale.** No search, sort or pagination; silent caps of 200 events and 1000 attendees; "50 results" is the page size (UX-P13, UX-P14).
6. **P1 – i18n and a11y.** English users see Spanish on every attendee screen but notifications; error text is 2.6:1 contrast (UX-A16).
7. **P1 – Bugs found:** scanner restarts the camera on each search keystroke (UX-A4); long names push `/live` sideways (UX-P18); notifications are marked seen before they render (UX-A13); ranking never lists 4th place or lower (UX-A12).
8. **P1 – Indexing.** Door and join pages lack `noindex`; no `robots.txt`; root 404 is the bare Next.js page (UX-P2).

## Limits

Server-side error/empty/loading states judged from code (mock errors reach only browser-side calls). The 3D hero was not on `main`, so landing findings that overlap in-flight work are labelled. Proposed DB indexes are not checked against the schema.

Related: [live data viz](live-dataviz.md), [flow catalog](../flows/catalog.md), [backlog](../flows/backlog.md).
