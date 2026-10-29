import { LiveSnapshot, type LiveSnapshotT } from "../api/schemas";

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

// The event's live snapshot for the Home card, or null on any failure (network, non-2xx, a body that is not a snapshot).
export async function fetchHomeSnapshot(code: string, signal: AbortSignal, fetcher: Fetcher = fetch): Promise<LiveSnapshotT | null> {
  try {
    const response = await fetcher(`/api/e/${encodeURIComponent(code)}/live`, { cache: "no-store", signal });
    if (!response.ok) return null;
    const parsed = LiveSnapshot.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

