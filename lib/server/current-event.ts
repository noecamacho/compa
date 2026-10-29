import "server-only";
import { Me, type MeT } from "../api/schemas";
import { ApiFetchError, apiGet } from "../api/server-fetch";
import { hasSession } from "./session";

// A signed-out /api/me (401) or a session whose user row is gone (404) reads as a visitor.
const meansVisitor = (error: unknown): boolean => error instanceof ApiFetchError && (error.status === 401 || error.status === 404);

// The signed-in person, or null for visitors and for sessions whose user row is gone.
// An outage (Auth 503, database 500) throws instead: treating it as a visitor would send a signed-in person back
// through LinkedIn (conference-scale finding 1).
export async function currentMe(): Promise<MeT | null> {
  if (!(await hasSession())) return null;
  try {
    return await apiGet("/api/me", Me);
  } catch (error) {
    if (meansVisitor(error)) return null;
    throw error;
  }
}
