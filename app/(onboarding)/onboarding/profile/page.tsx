import { ProfileForm } from "@/components/profile/ProfileForm";
import { Me } from "@/lib/api/schemas";
import { apiGet, apiPostQuietly } from "@/lib/api/server-fetch";

type Props = { searchParams: Promise<{ from?: string; invite?: string }> };

const INVITE_CODE = /^[a-z0-9-]{2,40}$/;

// 02 Perfil (step 1 of 2). `?from=me` is the edit flow from 09 and returns there; `?invite=<code>` links a friend's invite.
export default async function ProfilePage({ searchParams }: Props) {
  const { from, invite } = await searchParams;
  if (invite && INVITE_CODE.test(invite)) await apiPostQuietly(`/api/invites/${invite}/claim`);
  const me = await apiGet("/api/me", Me);
  const editing = from === "me";
  return <ProfileForm me={me} next={editing ? "/me" : "/onboarding/monito"} back={editing ? "/me" : "/"} onboarding={!editing} />;
}
