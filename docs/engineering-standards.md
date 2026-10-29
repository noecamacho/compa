# Engineering standards

Every change to COMPA follows these rules. Reviewers and the PR template check them. Examples are TypeScript because the plan picks Next.js + TypeScript (`raw/pasillo-plan-de-construccion.pdf`, p. 8, p. 17).

## SOLID

**Single responsibility.** A module has one reason to change.

Before:
```ts
async function approveInteraction(id: string, authorId: string) {
  const row = await db.interactions.find(id);
  if (row.author_id !== authorId) throw new Error("forbidden");
  await openai.responses.create({ /* re-summarize */ });
  await db.points.insert({ attendee_id: authorId, reason: "summary", amount: 25, ref_id: id });
}
```
After:
```ts
async function approveInteraction(id: string, authorId: string) {
  const interaction = await interactions.requireOwnedBy(id, authorId);
  await interactions.markApproved(interaction.id);
  await points.awardSummary(interaction);
}
```

**Open/closed.** Extend behavior by adding, not by editing a growing conditional.

Before:
```ts
function pointsFor(reason: string) {
  if (reason === "connection") return 10;
  if (reason === "bridge") return 15;
  if (reason === "summary") return 25;
  return 0;
}
```
After:
```ts
const POINTS: Record<PointReason, number> = { connection: 10, bridge: 15, summary: 25, first_of_day: 5 };
const pointsFor = (reason: PointReason) => POINTS[reason];
```

**Liskov substitution.** Anything that implements an interface honors its contract; no implementation throws "not supported".

**Interface segregation.** Depend on the narrow interface you use.

Before: `function renderCard(attendee: AttendeeRow)` (the whole DB row).
After: `function renderCard(card: { name: string; company?: string; links: Links })`.

**Dependency inversion.** Business rules depend on abstractions, not on SDK clients.

Before: `lib/points.ts` imports the Supabase client directly.
After: `lib/points.ts` receives a `PointsRepository` with `insertOnce(entry)`; the route handler wires the Supabase implementation.

## KISS

Pick the simplest thing that fully works. No configuration, option or layer that the task does not need.

Before:
```ts
class HandleGeneratorFactory { create(strategy: "slug" | "random") { /* ... */ } }
```
After:
```ts
const toHandle = (name: string) => slugify(name).slice(0, 20);
```

## DRY

One source of truth. Repeated logic becomes one function; repeated shapes become one zod schema with inferred types.

Before: the link normalization regex lives in the form component and in the route handler.
After:
```ts
// lib/links.ts
export const normalizeLink = (network: Network, raw: string): string => /* ... */;
// used by both app/join/form.tsx and app/api/attendees/route.ts
```

## NO NESTING

- Use guard clauses and early returns.
- Maximum nesting depth is 2 (a function body counts as depth 0; one `if` inside a loop is depth 2).
- Extract a function instead of nesting deeper.

Before:
```ts
export async function POST(req: Request) {
  const session = await getSession(req);
  if (session) {
    const body = await req.json();
    const parsed = ConnectionInput.safeParse(body);
    if (parsed.success) {
      if (parsed.data.targetHandle !== session.handle) {
        return createConnection(session, parsed.data);
      } else {
        return badRequest("cannot connect to yourself");
      }
    } else {
      return badRequest(parsed.error);
    }
  }
  return unauthorized();
}
```
After:
```ts
export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return unauthorized();
  const parsed = ConnectionInput.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error);
  if (parsed.data.targetHandle === session.handle) return badRequest("cannot connect to yourself");
  return createConnection(session, parsed.data);
}
```

Shell scripts follow the same rule: no block nested more than two levels deep; extract a function.

## Clean code

- **Intention-revealing names.** `pendingFirst(connections)` not `sortConn(c)`.
- **Small functions** that do one thing and fit on a screen.
- **One level of abstraction per function.** A function either orchestrates steps or does low-level work, not both.
- **No dead code.** No commented-out blocks, unused exports or "for later" branches; git history keeps the past.
- **Comments only for why.** The code says what; a comment explains a non-obvious reason or constraint.

Before:
```ts
// loop over connections
for (const c of cs) { /* ... */ }
```
After:
```ts
// Pending summaries first: the plan requires it on /connections (PDF p. 6).
const ordered = pendingFirst(connections);
```

## Types at every boundary

Type every input, intermediate value and return. Validate untrusted data (request bodies, webhooks, third-party responses, environment, URL state) with a zod schema and infer the type from it. Prefer the provider's official typed SDK or generated types over hand-written shapes. Never add `any` or an unchecked cast.

```ts
const Env = z.object({ OPENAI_STT_MODEL: z.string().min(1), OPENAI_TEXT_MODEL: z.string().min(1) });
export const env = Env.parse(process.env);
```

## Testing

Every change ships with tests that prove the behavior it touches.

- **Unit tests** (`bun test`, next to the code as `*.test.ts`) for pure logic: points, visibility, parsing, mapping.
- **Playwright e2e** (preferred for anything a user can do) under `e2e/<area>/<flow>.spec.ts`. Each spec confirms the user flows from `docs/flows/catalog.md` that the change affects:
  - the happy path end to end;
  - every edge case listed for the flow (double scan, self-scan, event ended, already connected…);
  - every error state, each with the UI message the user sees (inject errors with mock mode: `x-compa-mock: 1` plus `x-compa-mock-error: <code>`);
  - viewports 390, 834 and 1440; locales `es` and `en`; `prefers-reduced-motion`.
- Real-mode specs use a seeded test event and a test session created with the service role, never a live LinkedIn login.
- A PR is not done while its e2e specs fail or are skipped without a written reason in the PR.

## English only

All code, identifiers, comments, documentation, commit messages and PR text are in English. Product copy shown to end users is a product decision tracked in `wiki/open-questions.md` (#6) and is kept in dedicated copy files, never inline in logic.
