import { MonitoBuilder } from "@/components/monito/MonitoBuilder";
import { Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";

type Props = { searchParams: Promise<{ from?: string }> };

// 02b Monito (step 2 of 2). `?from=me` is the "Mi monito" flow from 09 and returns there.
export default async function MonitoPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const me = await apiGet("/api/me", Me);
  const editing = from === "me";
  return <MonitoBuilder me={me} next={editing ? "/me" : "/home"} back={editing ? "/me" : "/onboarding/profile"} onboarding={!editing} />;
}
