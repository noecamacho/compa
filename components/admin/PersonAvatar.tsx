import { initials } from "./AdminShell";

// Initials in a 32 px circle (spec §5.4): pink for a test user, sky for a real one. Decorative; the name sits beside it.
export function PersonAvatar({ name, isTest }: { name: string; isTest: boolean }) {
  return (
    <span aria-hidden className={`box-border flex size-8 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold border-ink ${isTest ? "bg-gum-soft" : "bg-sky-soft"}`}>
      {initials(name)}
    </span>
  );
}
