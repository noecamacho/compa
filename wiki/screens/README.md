# Screens

The plan defined seven screens (p. 4). The V2 design handoff (`design/compa-v2/README.md`, 2026-10-29) replaced them with sixteen attendee screens, built under `app/` on top of the same API. `/live` is unchanged ([live-dashboard](../live-dashboard.md), p. 6).

## V2 screens and routes (design handoff)

| # | Mock | Route | Goes to |
| --- | --- | --- | --- |
| 01 | V2Bienvenida | `/` | Crear cuenta → `/auth/linkedin?next=/onboarding/profile` · Ya tengo cuenta → `/auth/linkedin?next=/home` |
| 02 | V2Perfil | `/onboarding/profile` (`?from=me` to edit) | → `/onboarding/monito` |
| 02b | V2Monito | `/onboarding/monito` (`?from=me` to change) | → `/home` |
| 03 / 03b | V2Inicio / V2InicioVacio | `/home` (empty branch when there are no connections; `?demo=empty` in mock mode) | `/me`, `/ranking`, `/connect`, `/invite` |
| 04 | V2Conectar | `/connect` (`?tab=scan`) | Conectar → `/connect/[handle]` · Invitar → `/invite` |
| 05 | V2Registrar | `/connect/[handle]` | Confirmar → `POST /api/connections` → `/connections/[id]/done` |
| 06 | V2Confirmacion | `/connections/[id]/done` | Resumen → `/connections/[id]/note` · Listo → `/home` |
| 06b | V2Solicitud | `/requests/[id]` | Aceptar → accept → `/connections/[id]/done` · Ahora no → decline → `/home` |
| 07 | V2Conexiones | `/connections` | Row → `/people/[handle]` |
| 08 | V2PerfilOtro | `/people/[handle]` | `/connections/[id]/note`, `/me/badges?of=[handle]`, `/ranking` |
| 08b | V2NotaVoz | `/connections/[id]/note` | Guardar → approve → `/people/[handle]` |
| 09 | V2MiPerfil | `/me` | `/onboarding/monito?from=me`, `/me/badges`, `/ranking`, `/onboarding/profile?from=me`, `/connect` |
| 10 | V2Insignias | `/me/badges` | → `/me` |
| 11 | V2Ranking | `/ranking` | `/people/[handle]`, `/connect` |
| 12 | V2Invitar | `/invite` | → `/connect` |

The personal QR encodes `/u/[handle]`, which redirects to `/connect/[handle]` (API spec A8, ADR-004); an invite link is `/i/[code]`. The dock (Inicio, Conectar, Conexiones, Perfil) is on 03, 04, 07 and 09. Screens under `app/(app)/` need a session; mock mode (`API_MODE=mock`) has none and shows the example person. Copy is Spanish in `lib/copy/es.ts` ([open-questions](../open-questions.md) #6).

## The plan's seven screens (superseded, kept for the acceptance criteria)

| # | Screen | Route | Page |
| --- | --- | --- | --- |
| 1 | Profile | `/join` | [join](join.md) |
| 2 | Home | `/me` | [me](me.md) |
| 3 | Scan | `/c/[handle]` | [scan](scan.md) |
| 4 | Connection made | `/connection/[id]` | [connection](connection.md) |
| 5 | Summary | `/connection/[id]/summary` | [summary](summary.md) |
| 6 | My connections | `/connections` | [connections](connections.md) |
| 7 | Dashboard | `/live` | [live-dashboard](../live-dashboard.md) (specified in the gamification section, p. 6) |

Global UI rules from the agent contract: mobile first, test at 375 px (the V2 mocks are 390 px); `/live` is designed for 1920×1080 (p. 17).

Related: [connection-flow](../connection-flow.md), [api](../api.md), [points-rules](../points-rules.md).
