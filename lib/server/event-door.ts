import "server-only";
import { cache } from "react";
import { codeFromSegment } from "../access-code";
import { EventDoor, type EventDoorT } from "../api/schemas";
import { apiGetOrNull } from "../api/server-fetch";

// One request per render for the /e/<code> pages; null for any code that opens nothing (A10).
export const loadEventDoor = cache(
  (code: string): Promise<EventDoorT | null> => apiGetOrNull(`/api/e/${encodeURIComponent(codeFromSegment(code))}`, EventDoor),
);
