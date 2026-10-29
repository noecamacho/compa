import "server-only";
import { Me, type MeT } from "../api/schemas";
import { apiGet } from "../api/server-fetch";
import { hasSession } from "./session";

// The signed-in person, or null for visitors and for sessions whose user row is gone (pages degrade, never crash).
// An Auth outage still throws: treating it as a visitor would send a signed-in person back through LinkedIn.
export async function currentMe(): Promise<MeT | null> {
  if (!(await hasSession())) return null;
  try {
    return await apiGet("/api/me", Me);
  } catch {
    return null;
  }
}
