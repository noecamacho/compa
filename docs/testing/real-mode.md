# Real-mode testing

How engineers and agents test COMPA against the **real database** without LinkedIn: synthetic **test users**, a shared **test event**, and a sign-in-as route. Contract: API spec A11 (`docs/specs/2026-10-29-api.md`); data: data model M20 (`docs/specs/2026-10-29-data-model.md`).

## Safety rules

1. **Only `is_test` people.** The harness creates, lists, signs in as and deletes only rows with `users.is_test = true`. A real person's id answers `404 test_user_not_found`, the same as an unknown id (`requireTestTarget`, `lib/server/test-users.ts`).
2. **Never at real events.** A test user cannot check in to an event unless `events.is_test = true` (`409 test_user_not_allowed`), and every count, list, live snapshot and leaderboard of a real event leaves test users out (`realPeopleOnly`, `lib/server/events.ts`). The lifetime board includes them only when seen from a test event or by a test user.
3. **Test admins are boxed in.** A test user with `role = super_admin` (the seeded `codex-test-admin`) sees and edits test events and test people only, and every event it creates is a test event (`canManageEvent`, `lib/api/admin-gate.ts`).
4. **The secret never leaves its header.** `TEST_AUTOMATION_SECRET` (at least 32 characters) lives in Vercel and in your local `.env` only. It is compared in constant time and never logged, echoed or put in an error. Unset means automation is off.
5. **Clean up what you create.** Delete your test users at the end of a run. The shared event and its 13 seeded people stay.

## 1. Seed the test event (once per database)

```sh
SEED_TEST_EVENT=1 bun run db:seed
```

Needs `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. It is idempotent and prints the door path:

- Event **Codex Conf 2026**, slug `codex-conf-2026`, `is_test = true`, window from yesterday to a year from now (re-running extends it).
- `@codex-test-admin`, a test super admin and owner of the event.
- 12 test users from the seeded generator (founder, engineer, designer, investor profiles), all checked in, with 4 accepted and 2 pending connections and one approved summary.

## 2. Create mock users

From a browser signed in as a super admin: `/admin/test-users` (count, profile preset, test event to check in to).

From a script or agent (no browser):

```sh
curl -sS -X POST "$BASE/api/admin/test-users" \
  -H "x-compa-automation: $TEST_AUTOMATION_SECRET" -H "content-type: application/json" \
  -d '{"count":2,"preset":"engineer","seed":7,"checkInTo":"codex-conf-2026"}'
```

`users: [{ name, handle, headline, company, city, interests, links, visibility, avatar, avatarMode, photoUrl, role }]` sets fields instead of generating them; anything missing is generated. `seed` makes the generated people repeatable. Each user gets a Supabase auth row with the email `<handle>@test.compa.lol`, no password, and `linkedin_sub = test:<auth id>`.

## 3. Sign in as a test user

`POST /api/admin/test-users/{id}/session` answers with the Supabase session cookies in `Set-Cookie`, for that test user. From `/admin/test-users`, "Sign in as" replaces your admin session in that browser (sign in with LinkedIn again to get it back). From a script, keep the cookies:

```ts
import { asUser, realModeClient } from "@/lib/testing/real-mode";
const harness = realModeClient({ baseUrl: BASE, secret: process.env.TEST_AUTOMATION_SECRET! });
const [ana, bruno] = await harness.createTestUsers({ count: 2, checkInTo: "codex-conf-2026" });
const anaSession = await harness.signInAs(ana);   // { cookies, cookieHeader }
```

The session is a server-verified magic-link token (no email is sent); if Supabase refuses it, a one-time random password is set and used once. Both need the Supabase **Email** provider enabled, which the email sign-in (`POST /api/auth/email`) already requires.

## 4. Run a real scenario: connect → accept → summary

```ts
import { ConnectionRequest, Accepted, Draft, Approved } from "@/lib/api/schemas";
const brunoSession = await harness.signInAs(bruno);
const sent = await asUser(anaSession, { baseUrl: BASE, method: "POST", path: "/api/connections", body: { toHandle: bruno.handle, screenConsent: true }, schema: ConnectionRequest });
await asUser(brunoSession, { baseUrl: BASE, method: "POST", path: `/api/connections/${sent.connectionId}/accept`, body: {}, schema: Accepted });
const draft = await asUser(anaSession, { baseUrl: BASE, method: "POST", path: "/api/interactions/draft", body: { connectionId: sent.connectionId, text: "Hablamos de agentes." }, schema: Draft });
await asUser(anaSession, { baseUrl: BASE, method: "POST", path: `/api/interactions/${draft.interactionId}/approve`, body: { summary: draft.summary, topics: draft.topics, nextSteps: draft.nextSteps }, schema: Approved });
```

Then open `/e/<code>/live` for the test event: the edge and the points show there, and nowhere else. The draft step calls OpenAI; skip it when `OPENAI_API_KEY` is not set.

Playwright (`docs/flows/README.md` "E2E tests"): `e2e/fixtures/real-mode.ts` gives `testUsers(n)` (created, checked in, deleted after the test) and `signIn(context, user)`; `realUser`, `testEvent` and `twoUsers` build on them. Run with `TEST_AUTOMATION_SECRET=... bun run e2e`; tests tagged `@real` skip without the secret and never run against compa.lol. `e2e/requests/incoming.spec.ts` runs connect and accept between two fresh users; `e2e/summaries/note.spec.ts` covers the summary. `bunfig.toml` keeps `bun test` in `lib/`.

## 5. Clean up

```sh
curl -sS -X DELETE "$BASE/api/admin/test-users/<id>" -H "x-compa-automation: $TEST_AUTOMATION_SECRET"
```

Deleting removes the auth row; the profile, check-ins, connections, summaries and points go by cascade. `GET /api/admin/test-users?handlePrefix=<prefix>` lists what a run created when handles share a prefix.

## 6. Local e2e (two people, live)

Run the live specs against a local Supabase stack, never production. From any scratch folder outside the repo:

```sh
supabase init && supabase start -x studio,imgproxy,mailpit,edge-runtime,logflare,vector,storage-api,postgres-meta,supavisor
```

Put its `DB_URL`, `API_URL`, `ANON_KEY` and `SERVICE_ROLE_KEY` in an env file outside git as `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, plus `TEST_AUTOMATION_SECRET`, a VAPID pair (`bunx web-push generate-vapid-keys`, `VAPID_SUBJECT=mailto:…`) and `PUSH_ALLOWED_ORIGINS=http://127.0.0.1:3199` (the mock push service the spec starts). Then, with that file sourced:

```sh
bun run db:migrate && SEED_TEST_EVENT=1 bun run db:seed
hr-heavy bun run build && hr-heavy bunx next start -p 3107
E2E_BASE_URL=http://localhost:3107 bun run e2e e2e/notifications --project=desktop-1440-en
```

`e2e/notifications/live.spec.ts` opens two browser contexts (390 px English, 1440 px Spanish): A confirms a scan of B, B's toast, bell and push arrive in under 2 s, B accepts, A's pending screen flips with the points in under 2 s. It also proves another person's private channel and an anonymous join are refused, that polling delivers when the Realtime websocket is blocked, and that a decline sends nothing. Real browser push services are not reached: the spec registers a subscription whose endpoint is its own mock service and checks the encrypted, VAPID-signed POST.

## Known limits

- `test.compa.lol` must not receive mail. Since email sign-in exists, whoever controls that mailbox could request a link for a test address. [Unverified: DNS has no MX for it.]
- Real-mode runs write to whichever database the deployment uses. Prefer a preview deployment or a separate Supabase project for heavy runs.

Related: API spec A11, data model M20, `docs/flows/backlog.md` T-000, T-023, T-028.
