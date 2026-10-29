import { notFound, redirect } from "next/navigation";
import { eventPath } from "@/lib/access-code";
import { accessCode } from "@/lib/api/examples";
import { referralDoor } from "@/lib/server/invites";

type Props = { params: Promise<{ code: string }> };

const INVITE_CODE = /^[a-z0-9-]{2,40}$/;

const onboardingSignIn = (code: string) => `/auth/linkedin?next=${encodeURIComponent(`/onboarding/profile?invite=${code}`)}`;

// Referral link: while the inviter is at an event the friend lands at its door (and joins it too); otherwise they sign
// up straight into onboarding. Either way the code rides along and is claimed once they are signed in.
export default async function InviteLinkPage({ params }: Props) {
  const { code } = await params;
  if (process.env.API_MODE === "mock") redirect(`${eventPath(accessCode)}?invite=${code}`);
  const door = INVITE_CODE.test(code) ? await referralDoor(code) : undefined;
  if (door === undefined) notFound();
  redirect(door ? `${eventPath(door)}?invite=${code}` : onboardingSignIn(code));
}
