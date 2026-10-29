import "server-only";
import { eq, like } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "../../db/client";
import { authUsers } from "../../db/auth-schema";
import { users, type UserRow } from "../../db/schema";
import { handleBase, pickHandle } from "../handle";
import { isUniqueViolation } from "./people";

// Test sign-in for the Playwright suite (docs/engineering-standards.md → Testing: "a test session, never a live
// LinkedIn login"). Enabled only with COMPA_TEST_AUTH=1 outside production; scripts/e2e/server.sh sets it.
// A stand-in LinkedIn consent page replaces the OAuth redirect, and the session is a plain cookie with the auth id.

export const TEST_SESSION_COOKIE = "compa_test_session";

export const isTestAuth = (): boolean => process.env.COMPA_TEST_AUTH === "1" && process.env.NODE_ENV !== "production";

export async function testSessionAuthId(): Promise<string | null> {
  const store = await cookies();
  return store.get(TEST_SESSION_COOKIE)?.value ?? null;
}

const TestProfile = z.object({
  sub: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(80),
  headline: z.string().trim().max(120).optional(),
  company: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  email: z.string().trim().max(120).optional(),
});

export type TestProfile = z.infer<typeof TestProfile>;

export const testProfileFromQuery = (url: string): TestProfile | null => {
  const params = Object.fromEntries(new URL(url).searchParams);
  const parsed = TestProfile.safeParse(params);
  return parsed.success ? parsed.data : null;
};

async function takenHandles(base: string): Promise<Set<string>> {
  const rows = await getDb().select({ handle: users.handle }).from(users).where(like(users.handle, `${base}%`));
  return new Set(rows.map((row) => row.handle));
}

async function insertTestUser(profile: TestProfile, sub: string, attempt = 0): Promise<UserRow> {
  const db = getDb();
  const authUserId = crypto.randomUUID();
  const base = handleBase(profile.name);
  const handle = attempt === 0 ? pickHandle(base, await takenHandles(base)) : `${base}-${crypto.randomUUID().slice(0, 4)}`;
  try {
    await db.insert(authUsers).values({ id: authUserId });
    const [row] = await db
      .insert(users)
      .values({
        authUserId,
        linkedinSub: sub,
        handle,
        name: profile.name,
        email: profile.email ?? null,
        headline: profile.headline || null,
        company: profile.company || null,
        city: profile.city || null,
        avatarMode: "monito",
        linkedinRaw: profile,
        linkedinSyncedAt: new Date(),
      })
      .returning();
    if (!row) throw new Error("test user insert returned nothing");
    return row;
  } catch (error) {
    if (!isUniqueViolation(error) || attempt >= 3) throw error;
    return insertTestUser(profile, sub, attempt + 1);
  }
}

// Same contract as the LinkedIn sync (M14): an existing person keeps an edited name; a new one is created.
export async function upsertTestUser(profile: TestProfile): Promise<UserRow> {
  const sub = profile.sub ?? `test:${profile.email ?? profile.name.toLowerCase()}`;
  const [existing] = await getDb().select().from(users).where(eq(users.linkedinSub, sub)).limit(1);
  if (!existing) return insertTestUser(profile, sub);
  const [synced] = await getDb()
    .update(users)
    .set({ linkedinSyncedAt: new Date(), ...(existing.nameEdited ? {} : { name: profile.name }) })
    .where(eq(users.id, existing.id))
    .returning();
  return synced ?? existing;
}

export const sessionCookie = (authUserId: string | null): string =>
  authUserId
    ? `${TEST_SESSION_COOKIE}=${authUserId}; Path=/; HttpOnly; SameSite=Lax`
    : `${TEST_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const field = (name: string, label: string, value: string, required = false) => `
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" value="${escapeHtml(value)}" ${required ? "required" : ""} />`;

// The stand-in for linkedin.com's consent screen: the person "allows" (and may edit what LinkedIn would send) or cancels.
export function testLinkedInPage(next: string, prefill: Partial<TestProfile>): string {
  const cancel = "/?error=linkedin";
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LinkedIn de prueba</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f3f2ef; color: #000; }
    main { max-width: 420px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; }
    label { display: block; font-size: 13px; margin: 12px 0 4px; }
    input { width: 100%; box-sizing: border-box; padding: 10px; font-size: 16px; border: 1px solid #999; border-radius: 4px; }
    .actions { display: flex; gap: 12px; margin-top: 20px; }
    button, a.cancel { flex: 1; padding: 12px; font-size: 16px; border-radius: 24px; text-align: center; text-decoration: none; }
    button { background: #0a66c2; color: #fff; border: 0; cursor: pointer; }
    a.cancel { color: #0a66c2; border: 1px solid #0a66c2; }
  </style>
</head>
<body>
  <main>
    <h1>Entrar a Compa con LinkedIn</h1>
    <p>Pantalla de prueba. Compa recibirá los datos de abajo.</p>
    <form method="get" action="/auth/callback">
      <input type="hidden" name="code" value="test" />
      <input type="hidden" name="next" value="${escapeHtml(next)}" />
      <input type="hidden" name="sub" value="${escapeHtml(prefill.sub ?? "")}" />
      ${field("name", "Nombre", prefill.name ?? "", true)}
      ${field("headline", "Puesto", prefill.headline ?? "")}
      ${field("company", "Empresa", prefill.company ?? "")}
      ${field("city", "Ciudad", prefill.city ?? "")}
      ${field("email", "Correo", prefill.email ?? "")}
      <div class="actions">
        <a class="cancel" href="${cancel}">Cancelar</a>
        <button type="submit">Permitir</button>
      </div>
    </form>
  </main>
</body>
</html>`;
}
