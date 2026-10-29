# Mapa del proyecto (Compa)

1. Next.js 16 (App Router, React 19) + Tailwind 4, corre con Bun (`~/.bun/bin/bun`); TypeScript estricto; zod en toda frontera.
2. Datos en Supabase Postgres vía Drizzle (`db/schema.ts`, migraciones en `drizzle/`); auth solo LinkedIn OIDC por Supabase (`lib/server/auth-routes.ts`).
3. Pantallas de la persona en `app/(app)/*` (home, connect, connect/[handle], connections, connections/[id]/done|note, me, me/badges, people/[handle], ranking, requests/[id], invite, onboarding/profile|monito); todas exigen sesión (`app/(app)/layout.tsx`).
4. Entrada: `/` landing, `/e/<code>` puerta del evento, `/e/<code>/join` consentimiento y check-in, `/u/<handle>` QR personal, `/i/<code>` enlace de invitación.
5. API en `app/api/**` = `defineRoute(spec, handler)`; los specs viven en `lib/api/routes.ts` y los esquemas en `lib/api/schemas.ts`; ejemplos en `lib/api/examples.ts`.
6. Lógica de negocio en `lib/server/*` (profile, connections, connection-detail, badges, invites, live, summaries, events); puntos en `lib/points.ts` (50 nueva, 20 reencuentro, +5 temas, +15 nota, +100/+50 invitación).
7. Las páginas server leen la API por HTTP (`lib/api/server-fetch.ts`); los componentes cliente usan `lib/api/client.ts`.
8. `API_MODE=mock` sirve los ejemplos de OpenAPI sin estado (el `.env.local` del repo lo usa); no sirve para probar flujos reales.
9. Para la suite e2e existe `COMPA_TEST_AUTH=1` (`lib/server/test-auth.ts`): LinkedIn simulado en `/auth/linkedin`, cookie `compa_test_session`, nunca en producción.
10. Base de pruebas: Postgres en Docker, puerto 3901 (`scripts/e2e/db.sh`: contenedor, stub `auth.users`, migraciones, seed de intereses).
11. Servidor de pruebas: `scripts/e2e/server.sh` → `next dev` en 3902 (el dev normal usa 3900); Playwright lo levanta solo (`playwright.config.ts`, webServer).
12. Suite: `e2e/tests/*.spec.ts`, helpers en `e2e/helpers` (db, auth), fixtures A/B en `e2e/fixtures`; tres proyectos chromium 390×844, 375×667, 1280×800.
13. Comandos: `bun run lint`, `bun run typecheck`, `bun test` (unitarios), `bun run test:e2e`, `bun run test:e2e:report`.
14. Copy en `lib/copy/es.ts` (y `en.ts` para landing/puerta); monito en `lib/monito/*` y `components/monito/*`; insignias en `lib/badges/*`.
15. Reglas del repo: Conventional Commits en inglés (hook `scripts/check-commit-message.sh`), sin atribución a IA, nunca push a `main`.
