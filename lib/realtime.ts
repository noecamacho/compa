// Supabase Realtime Broadcast from the server (API spec §8). No-ops when Supabase env is missing,
// so local dev and mock mode work without it. A failed broadcast never fails the request.
import type { CardT, ConnectionKindT } from "./api/schemas";
import type { BadgeId } from "./badges/catalog";

type LivePersonRef = { id: string; name: string; photoUrl: string | null };
type EventRefT = { slug: string; name: string };

export type BroadcastMessage =
  | { topic: `user:${string}`; event: "request.received"; payload: { connectionId: string; from: CardT; event: EventRefT } }
  | { topic: `user:${string}`; event: "request.accepted"; payload: { connectionId: string; kind: ConnectionKindT; points: number; to: CardT } }
  | { topic: `user:${string}`; event: "invitee.connected"; payload: { invitee: CardT } }
  | { topic: `user:${string}`; event: "badge.earned"; payload: { badgeId: BadgeId; badgeName: string } }
  | { topic: `user:${string}`; event: "notifications.seen"; payload: { seenThrough: string } }
  | {
      topic: `event:${string}:live`;
      event: "connection.accepted";
      payload: { id: string; a: LivePersonRef; b: LivePersonRef; kind: ConnectionKindT; at: string };
    }
  | { topic: `event:${string}:live`; event: "attendee.checked_in"; payload: LivePersonRef }
  | { topic: `event:${string}:live`; event: "summary.approved"; payload: { connectionId: string; topics: string[] } };

const TIMEOUT_MS = 1500;

function realtimeConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { endpoint: `${url}/realtime/v1/api/broadcast`, key } : null;
}

export async function broadcast(...messages: BroadcastMessage[]): Promise<void> {
  const config = realtimeConfig();
  if (!config || messages.length === 0) return;
  const body = { messages: messages.map((m) => ({ ...m, private: m.topic.startsWith("user:") })) };
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.error("realtime broadcast failed", response.status);
  } catch (error) {
    console.error("realtime broadcast failed", error);
  }
}

export type UserMessage = Extract<BroadcastMessage, { topic: `user:${string}` }>;
export type UserEventName = UserMessage["event"];

export const userTopic = (userId: string) => `user:${userId}` as const;
// Keyed by the access code, not the slug, so only people with the event QR can follow the public channel (A10).
export const liveTopic = (accessCode: string) => `event:${accessCode}:live` as const;
