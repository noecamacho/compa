import { after } from "next/server";

// Runs a side effect once the response is sent (Realtime broadcasts, badges), so a slow Realtime or a heavy badge
// query never delays the tap that caused it (conference-scale finding 13). Failures are logged, never thrown.
// Outside a request (scripts, unit tests) `after` throws, so the task runs at once instead.
export function afterResponse(label: string, task: () => Promise<unknown>): void {
  const run = () => task().catch((error: unknown) => console.error(`${label} failed`, error));
  try {
    after(run);
  } catch {
    void run();
  }
}
