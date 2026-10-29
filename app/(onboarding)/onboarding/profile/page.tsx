import { ProfileForm } from "@/components/profile/ProfileForm";
import { Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";

type Props = { searchParams: Promise<{ from?: string }> };

// 02 Perfil (step 1 of 2). `?from=me` is the edit flow from 09 and returns there.
export default async function ProfilePage({ searchParams }: Props) {
  const { from } = await searchParams;
  const me = await apiGet("/api/me", Me);
  const editing = from === "me";
  return <ProfileForm me={me} next={editing ? "/me" : "/onboarding/monito"} back={editing ? "/me" : "/"} onboarding={!editing} />;
}
