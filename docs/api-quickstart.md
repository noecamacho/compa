# API quickstart

For the UI lane and agents. The contract is `openapi.json` at the repository root (regenerate with `bun run openapi`); the source of truth is `lib/api/routes.ts` and `lib/api/schemas.ts`. Specs: `docs/specs/2026-10-29-api.md` and `2026-10-29-data-model.md` (branch `docs/COMPA-TBD-mvp-api-plan`).

## Base URL and docs

| What | Where |
| --- | --- |
| Base URL | `https://<deployment>.vercel.app` (placeholder until the coordinator deploys), or `http://localhost:3000` with `bun run dev` |
| OpenAPI 3.1 | `GET /api/openapi.json` or `openapi.json` in the repo |
| Human docs | `GET /api/docs` (Scalar) |

## Mock mode

Every route can answer from the examples in the OpenAPI document, with no sign-in and no database. A request is mocked when any of these is true:

- the deployment has `API_MODE=mock`;
- the request has header `x-compa-mock: 1`;
- the URL has `?mock=1`.

Choose the answer:

| Header | Query | Effect |
| --- | --- | --- |
| `x-compa-mock-error: <code>` | `mockError=<code>` | That documented error, e.g. `not_pending` |
| `x-compa-mock-status: <status>` | `mockStatus=<status>` | The first documented error with that status |
| `x-compa-mock-example: <name>` | `mockExample=<name>` | A named success example, e.g. `fallback` on `/api/interactions/draft` |

Asking for an error the route does not document returns `400 mock_error_unknown` listing the ones it does. Mock responses carry `x-compa-mock: 1`.

```sh
curl -H 'x-compa-mock: 1' localhost:3000/api/events/founders-fest/live
curl -X POST -H 'x-compa-mock: 1' -H 'x-compa-mock-error: event_ended' localhost:3000/api/connections/0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a/accept
curl -X POST 'localhost:3000/api/interactions/draft?mock=1&mockExample=fallback'
```

## Auth

- Sign-in is LinkedIn only: link the user to `/auth/linkedin?next=/u/<handle>` (or any same-site path). `/auth/callback` sets the Supabase session cookie and redirects to `next` or `/me`; failure goes to `/?error=linkedin`.
- Same-origin `fetch` sends the cookie; no header needed. No session → `401 unauthorized`.
- Public routes (no session): `/api/interests`, `/api/events/:slug`, `/api/events/:slug/live`, `/api/events/:slug/live/people/:userId`, `/api/events/:slug/leaderboard`.
- Admin routes (`users.is_admin`): `POST /api/admin/events`. Promote someone with `SEED_ADMIN_HANDLE=<handle> bun run db:seed`.

## Errors

Every error is `{ "error": { "code": "snake_case", "message": "…", "fields"?: { "<field>": ["…"] } } }`. `fields` appears on `400 invalid_input`. Each route lists its codes in the OpenAPI document.

## Realtime

The server broadcasts on Supabase Realtime (API spec §8): `user:<userId>` (private) gets `request.received` and `request.accepted`; `event:<slug>:live` gets `connection.accepted`, `attendee.checked_in` and `summary.approved`. Until private channels are authorized, poll `GET /api/connections` every 3 s.

Related: `lib/api/routes.ts`, `lib/api/mock.ts`, `lib/visibility.ts`.
