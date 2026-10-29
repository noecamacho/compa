import { MonitoBuilder } from "@/components/monito/MonitoBuilder";
import { Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { safeNext } from "@/lib/safe-next";

type Props = { searchParams: Promise<{ from?: string; next?: string }> };

// 02b Monito (step 2 of 2). `?from=me` is the "Mi monito" flow from 09 and returns there;
// `?next=` is where the (app) monito gate was heading, a same-site path only.
export default async function MonitoPage({ searchParams }: Props) {
  const { from, next } = await searchParams;
  const me = await apiGet("/api/me", Me);
  const editing = from === "me";
  return <MonitoBuilder me={me} next={editing ? "/me" : safeNext(next, "/home")} back={editing ? "/me" : "/onboarding/profile"} onboarding={!editing} />;
}
