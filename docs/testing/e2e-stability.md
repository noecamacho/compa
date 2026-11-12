# E2E stability audit

COMPA-<TBD> / B2, 2026-11-11. Baseline: `main` at `c57f2a18d1e2cc03dac0d75bb141d9ac3093190c`.

## Diagnosis before changes

The E2E workflow previously ran only on pull requests. `gh-axi run list --workflow E2E --branch main` returned no runs. There is no main workflow result to call green or red. This change adds main pushes to the same mock matrix so future comparisons have a baseline. Real-mode credentials were not used.

The completed failing jobs below were read with `gh-axi` from the individual job-log API, which works while sibling shards are still running. Counts are final failures, retry flakes and passes respectively. Cancelled shards do not establish a passing baseline.

| Change | Workflow run | Shard | Failed | Flaky | Passed |
| --- | --- | --- | ---: | ---: | ---: |
| [Demo data](https://github.com/noecamacho/compa/pull/80) | [43134713108](https://github.com/noecamacho/compa/actions/runs/43134713108) | 1 / 4 / 6 / 8 | 19 / 42 / 33 / 15 | 2 / 3 / 1 / 1 | 290 / 307 / 344 / 350 |
| [Dates and profiles](https://github.com/noecamacho/compa/pull/81) | [43135664590](https://github.com/noecamacho/compa/actions/runs/43135664590) | 1 / 4 / 6 / 8 | 19 / 39 / 30 / 14 | 2 / 2 / 0 / 2 | 297 / 317 / 353 / 357 |
| [Connect and note](https://github.com/noecamacho/compa/pull/82) | [43135667272](https://github.com/noecamacho/compa/actions/runs/43135667272) | 1 / 4 / 6 / 8 | 20 / 44 / 31 / 17 | 5 / 0 / 0 / 3 | 288 / 310 / 348 / 348 |
| [Live monitos](https://github.com/noecamacho/compa/pull/83) | [43136564931](https://github.com/noecamacho/compa/actions/runs/43136564931) | 1 / 4 / 6 / 8 | 21 / 41 / 35 / 16 | 3 / 2 / 2 / 7 | 289 / 310 / 344 / 345 |
| Historical parent change | [40959271766](https://github.com/noecamacho/compa/actions/runs/40959271766) | 1 | 17 | 0 | 294 |

Unchanged main was built with `API_MODE=mock`, served on local port 3920, and shard 1 was run without retries with eight workers: **282 passed, 29 failed, 125 skipped**, in 173 seconds. The extra failures at eight workers include duplicate text locators that vary between CI retries. This is a local macOS reproduction, not a claim of identical Linux timings.

## Shared failing test inventory

These 53 unique test titles appear as failures or retry failures in **all four** changes across shards 1, 4, 6 and 8. Line numbers and project prefixes are removed because changes add lines and shards span projects. The workflow/job links above are the sources.

<details>
<summary>Exact shared test titles</summary>

- `e2e/account/session.spec.ts › sign out › an already expired session (401) still ends on the landing @mock`
- `e2e/account/session.spec.ts › sign out › cancel keeps the session @mock`
- `e2e/account/session.spec.ts › sign out › confirm posts the sign-out and goes to the landing @mock`
- `e2e/admin/events.spec.ts › admin events console (mock) › end: a failed call shows the error @mock`
- `e2e/admin/events.spec.ts › admin events console (mock) › end: cancel sends nothing, confirm calls the API and says so @mock`
- `e2e/connect/my-qr.spec.ts › connect: my QR › a failed /api/me shows the screen error with a retry @mock`
- `e2e/connect/my-qr.spec.ts › connect: my QR › the QR encodes my personal link and my card shows @mock`
- `e2e/connect/my-qr.spec.ts › connect: my QR › the invite chip opens /invite @mock`
- `e2e/connect/my-qr.spec.ts › connect: my QR › the tabs switch between my QR and the scanner and follow the URL @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › Confirm shows the screen notice first, sends the request and opens the done page @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › a person I already knew starts as a reconnection; kind and topics move the total @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › an unknown handle is a 404 @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › invalid_input keeps the form and shows the error @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › self_connection keeps the form and shows the error @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › the back arrow returns to the scanner @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › unauthorized keeps the form and shows the error @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › user_not_found keeps the form and shows the error @mock`
- `e2e/connect/register.spec.ts › connect: register screen (mock) › while sending, the button says so and a double tap sends one request @mock`
- `e2e/connect/search.spec.ts › connect: search by name › a name with accents and capitals finds the person and opens the register screen @mock`
- `e2e/connect/search.spec.ts › connect: search by name › fewer than two characters sends nothing @mock`
- `e2e/connect/search.spec.ts › connect: search by name › nobody found shows the message, and a later hit clears it @mock`
- `e2e/gamification/badges.spec.ts › badges in mock mode › a failed list renders empty instead of the error screen @mock`
- `e2e/gamification/ranking.spec.ts › ranking in mock mode › a podium place I am connected with opens their profile @mock`
- `e2e/gamification/ranking.spec.ts › ranking in mock mode › all year switches to the lifetime board @mock`
- `e2e/gamification/ranking.spec.ts › ranking in mock mode › tonight shows the podium, my place and the gap to the next @mock`
- `e2e/notifications/bell.spec.ts › notifications (mock) › the list shows every kind, unseen marks and the right links @mock`
- `e2e/onboarding/deep-links.spec.ts › personal QR link signed in › an unknown handle shows not found in mock mode @mock`
- `e2e/qa-port.spec.ts › ranking and badges › another person's badges are theirs, not mine @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › a draft that fails with connection_not_accepted keeps the text and says why @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › a draft that fails with invalid_input keeps the text and says why @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › a draft that fails with limit_reached keeps the text and says why @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › a draft that fails with not_found keeps the text and says why @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › a draft that fails with rate_limited keeps the text and says why @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › a draft that fails with summary_failed keeps the text and says why @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › an approval that fails with already_approved stays on the note @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › an approval that fails with not_author stays on the note @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › an approval that fails with not_found stays on the note @mock`
- `e2e/summaries/note.spec.ts › voice note in mock mode › an unknown connection is not found @mock`
- `e2e/system/rate-limits.spec.ts › rate limits on screen › a scan answered limit_reached shows its copy and keeps the form @mock`
- `e2e/system/rate-limits.spec.ts › rate limits on screen › a scan answered rate_limited shows its copy and keeps the form @mock`
- `e2e/system/resilience.spec.ts › resilience › /connect: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /connections/0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a/done: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /connections: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /home: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /invite: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /me: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /notifications: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /onboarding/monito: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /onboarding/profile: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /ranking: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › /requests/0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a: a failed server fetch shows the error screen and Retry recovers @mock`
- `e2e/system/resilience.spec.ts › resilience › a slow screen shows the loading skeleton until it arrives @mock`
- `e2e/system/resilience.spec.ts › resilience › a write while offline shows an error and keeps the screen usable @mock`

</details>

## Failure classification

| Class | Affected tests | Evidence and action |
| --- | --- | --- |
| Timing-dependent selectors | Badges summary, profile headline, confirmation points, empty connections, home cards, invite copy, incoming cards and QR instructions | Failure traces show the expected text twice, with one copy outside the active accessible `main`. These vary between runs and PRs. Scope assertions to the active landmark, preserving the expected text and counts. |
| Broken on main: locale | Session sign-out, QR/tabs, register, profile/monito, notes, requests, ranking/badges and resilience | English projects asserted imports from `lib/copy/es`, literal Spanish strings, or Spanish strings captured at test discovery. Select copy at test time, including errors, locked badge names and rate limits. Both locales still run. |
| Broken on main: 404 contract | `register`, `deep-links`, `profiles/other`, `summaries/note` unknown-resource cases | Expected Next.js's old English 404; the app now has a bilingual custom page. Assert its heading, body and return link. Streamed not-found pages can retain HTTP 200. |
| Broken on main: search contract | All three mock name-search cases | Main already calls `GET /api/users?q=...`; an empty list alone falls back to `GET /api/users/{handle}`. Old tests waited for the fallback after a successful name search. Exercise both paths, including accented names, minimum length, not found and recovery. Wait for hydration before typing. |
| Broken on main: badge selector | The failed badge-list mock case | A substring match for an earned badge also matched its locked name. Require the exact earned accessible name while retaining the zero-earned assertion. |
| Broken on main: accessible labels | Three ranking mock cases | Podium links have an explicit `#rank full name` accessible label. Check that label, destination, visible name and points separately; retain the rank/gap assertions and use the localized derived tip. |
| Broken on main: navigation contract | Notification list and real acceptance flow | `notificationHref` sends an acceptance to `/connections/{id}/done`, not the general list. Assert the precise destination. |
| Local platform behavior | Admin shell skip-link test | macOS WebKit's Tab skipped links and focused `list-q`. Option+Tab reaches the skip link; both WebKit locale tests pass with that shortcut. Linux keeps Tab. |
| Known broken, still executed | Two admin end cases and the loading-fallback case | See the two notes below. They have explicit expected-failure reasons, keep their test bodies and assertions, and fail on an unexpected pass. They are not retry flakes. |

No failure caused specifically by one of today's four changes has been established from the completed logs. Their common failures also occur in unchanged main or historical parent CI. This does **not** clear assertions that those failures prevented CI from reaching, especially the new live/monito assertions. Rebase conflicting test edits and rerun them after integration.

## Expired admin fixture

`e2e/admin/events.spec.ts`: `end: cancel sends nothing, confirm calls the API and says so` and `end: a failed call shows the error`.

The shared `adminEvent` fixture ends on 2026-10-29. The server computes its phase with the real clock (`app/admin/events/[slug]/page.tsx`, `lib/admin/event-phase.ts`). It therefore renders an ended event and omits End. The unchanged-main snapshot shows `Terminado`. Browser clock mocking cannot change the server's phase. These cases are expected failures only while the fixture is expired; no tests are skipped. The next fixture repair should supply a running event consistently to both server and browser, then remove this annotation. Do not make the product show End for ended events.

## Loading fallback

`e2e/system/resilience.spec.ts`: `a slow screen shows the loading skeleton until it arrives`.

Holding the entire navigation RSC response also holds the streamed fallback. Main stays on Home instead of displaying the expected skeleton. Replacing the fixed 2.5-second delay with a condition-controlled response still reproduces this failure. Prefetch is aborted so cached navigation cannot invalidate the experiment. The test remains an explicit expected failure with its skeleton and recovery assertions intact. Repair requires delaying server data after delivering the fallback, rather than holding the whole transport response; remove the annotation when that proof works.

## Admin form hydration

The full local matrix observed one WebKit Spanish `/admin/events/new` responsive check fail on React hydration error 418 while serving unchanged main application code. Its console-error assertion remains blocking and unchanged. This case carries an `unstable` annotation pointing here, rather than an expected-failure exemption: a hydration error could expose a real regression. The exact server/browser text mismatch still needs a development-mode trace; do not dismiss subsequent errors as harmless or clear a PR based on this annotation.

## Large board capture

The full local matrix also timed out in `e2e/live/live-board.spec.ts`, `thousands: 2,500 people and 4,000+ threads stay flat and responsive`, at `page.screenshot` after fonts loaded. This used unchanged main application code, not the live-monito change. The scenario's assertions and capture remain active and blocking, with an `unstable` annotation pointing here. This could reflect renderer load rather than a harmless test race; it is not cleared or changed into an expected failure. Measure the capture separately before changing either the load or its assertions.

## Overlapping searches

A final repeat of the added punctuation check exposed a separate main behavior: an earlier valid lookup can overwrite a later lookup's empty/error state. The trace records the `valeria-ochoa` query starting at 02:46:23.749Z and taking 126.091 ms, while the later `¿?` query starts at 02:46:23.852Z and takes 15.513 ms. The newer empty response finishes first; the snapshot then shows the older people under `¿?`. Application code was unchanged main. This is a concurrency risk in `ScanPanel`, not evidence against one of today's changes.

The minimum-length test now waits for the valid result to render before starting its separate punctuation scenario. Its original no-empty-handle assertion is retained. Concurrent-search cancellation/latest-response ownership still needs its own product regression test and fix; this audit does not clear that behavior.

## Linux WebKit event creation

The first [full branch workflow](https://github.com/noecamacho/compa/actions/runs/43144708908) passed seven mock shards; shard 4 failed only `creating sends the event and opens its page` in `mobile-390-webkit-en` (351 passed, 84 skipped, one failure). Both its original attempt and retry timed out waiting for `Unsaved changes`. The snapshot showed `Mock Night` in the DOM, an empty slug and no dirty indicator, so React had not observed the edit. The same test also failed in earlier [dates/profile CI](https://github.com/noecamacho/compa/actions/runs/43135664590) and [live-monito CI](https://github.com/noecamacho/compa/actions/runs/43136564931); it is not a new product regression from this test-maintenance change.

The old helper refilled the same DOM value repeatedly. A regression setup now pre-populates the input without emitting a React change event; the old helper reproduces the failure locally. The helper waits for hydration, clears the value before refilling so React observes a change, and bounds the condition retry at ten seconds. Its dirty-indicator and final POST-payload assertions remain intact. With that fix, all 27 local creation cases passed: three repetitions across nine browser/locale projects, with retries disabled. The initial CI failure is an observed intermittent platform/input-readiness failure; a later green workflow is reported as recovery with that history, not a clean baseline.

## Verification

Command: `CI=1 API_MODE=mock E2E_BASE_URL=http://localhost:3920 bun run e2e --shard=1/8 --workers=8 --retries=0 --reporter=json` against the mock production build. Final code: `5ed7f38`. These are three consecutive local runs of **mock shard 1**, not three complete eight-shard CI workflows.

| Run | Ordinary passes | Explicit expected failures | Existing skips | Unexpected failures | Time |
| --- | ---: | ---: | ---: | ---: | ---: |
| Unchanged main, before | 282 | 0 | 125 | 29 | 173.2 s |
| Final 1 (2026-11-12T02:49:48.747Z) | 308 | 3 | 125 | 0 | 66.0 s |
| Final 2 (2026-11-12T02:50:55.042Z) | 308 | 3 | 125 | 0 | 62.5 s |
| Final 3 (2026-11-12T02:51:57.844Z) | 308 | 3 | 125 | 0 | 60.3 s |

No retries and no new skips. The three expected failures are the two expired admin-fixture cases and the loading simulation, not ordinary passes. Targeted checks: all 27 search matrix cases and 36 custom-404 matrix cases passed; 41 English register/profile/note cases passed after the final locale fixes; both macOS WebKit skip-link cases passed.

The full exploratory matrix ran while fixes were being applied (2,755 expected, 682 skipped, 48 unexpected); it is diagnostic evidence, not final full-matrix proof. The remaining hydration/capture annotations still block on failure, and the measured overlapping-search risk is documented. CI on this PR must validate all eight shards.


Local unit tests also expose an unchanged-main ICU formatting expectation in `lib/admin/format.test.ts`: expected `Oct 29, 10:00`, received `Oct 29 at 10:00`. It reproduces with Bun 1.4.4 and CI's Bun 1.3.10 on macOS. This B2 change does not alter that formatter or weaken its assertion.

Related: [E2E harness](../flows/README.md#e2e-tests), [flow catalog](../flows/catalog.md), [engineering standards](../engineering-standards.md).
