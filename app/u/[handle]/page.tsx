import { redirect } from "next/navigation";
import { hasSession } from "@/lib/server/session";

type Props = { params: Promise<{ handle: string }> };

const HANDLE = /^[a-z0-9-]{2,32}$/;

// The personal QR link (API spec A8). Signed in it opens the register screen; signed out it goes through
// LinkedIn and comes back here, so a scan from the native camera never loses the handle (gap analysis U10).
export default async function PersonalLinkPage({ params }: Props) {
  const { handle } = await params;
  if (!HANDLE.test(handle)) redirect("/");
  const target = `/connect/${handle}`;
  if (await hasSession()) redirect(target);
  redirect(`/auth/linkedin?next=${encodeURIComponent(target)}`);
}
