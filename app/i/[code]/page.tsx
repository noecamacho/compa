import { redirect } from "next/navigation";

type Props = { params: Promise<{ code: string }> };

// Invite link: sign in with LinkedIn, then claim the invite and start onboarding.
export default async function InviteLinkPage({ params }: Props) {
  const { code } = await params;
  const next = encodeURIComponent(`/onboarding/profile?invite=${code}`);
  redirect(process.env.API_MODE === "mock" ? "/onboarding/profile" : `/auth/linkedin?next=${next}`);
}
