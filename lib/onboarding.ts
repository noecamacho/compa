import type { MeT } from "./api/schemas";

const filled = (value: string | undefined) => Boolean(value?.trim());

// The onboarding screen someone still owes, in order: 02 Perfil, then 02b Monito; null once both are done.
// LinkedIn OIDC gives only name, photo and email, so job title and company are asked here (OQ #33, T-013).
export function pendingOnboarding(me: Pick<MeT, "headline" | "company" | "avatar">): string | null {
  if (!filled(me.headline) || !filled(me.company)) return "/onboarding/profile";
  if (!me.avatar) return "/onboarding/monito";
  return null;
}
