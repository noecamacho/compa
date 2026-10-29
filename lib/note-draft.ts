// A voice note recorded while registering waits in sessionStorage until the connection is accepted
// and the summary can be drafted (summaries exist only for accepted connections, ai-summaries contract).
import { z } from "zod";

const NoteDraft = z.object({ seconds: z.number(), text: z.string() });
export type NoteDraft = z.infer<typeof NoteDraft>;

const key = (connectionId: string) => `compa:note:${connectionId}`;

export function rememberNote(connectionId: string, note: NoteDraft): void {
  try {
    sessionStorage.setItem(key(connectionId), JSON.stringify({ seconds: note.seconds, text: note.text }));
  } catch {
    // Private mode or blocked storage: the note is simply not kept.
  }
}

export function recallNote(connectionId: string): NoteDraft | null {
  try {
    const raw = sessionStorage.getItem(key(connectionId));
    return raw ? NoteDraft.parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function forgetNote(connectionId: string): void {
  try {
    sessionStorage.removeItem(key(connectionId));
  } catch {
    // Nothing to forget.
  }
}
