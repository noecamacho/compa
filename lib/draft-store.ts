// Unsent form state (profile fields, monito choices) kept in sessionStorage so a reload or going back
// mid-onboarding loses nothing. Keyed per person; cleared once the form is saved.
import type { z } from "zod";

const key = (name: string, userId: string) => `compa:draft:${name}:${userId}`;

export function rememberDraft(name: string, userId: string, value: unknown): void {
  try {
    sessionStorage.setItem(key(name, userId), JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the draft is simply not kept.
  }
}

export function recallDraft<T extends z.ZodType>(name: string, userId: string, schema: T): z.output<T> | null {
  try {
    const raw = sessionStorage.getItem(key(name, userId));
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function forgetDraft(name: string, userId: string): void {
  try {
    sessionStorage.removeItem(key(name, userId));
  } catch {
    // Nothing to forget.
  }
}
