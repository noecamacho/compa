import { notFound, redirect } from "next/navigation";
import { eventPath } from "@/lib/access-code";
import { accessCode } from "@/lib/api/examples";
import { inviteDoorCode } from "@/lib/server/invites";

type Props = { params: Promise<{ code: string }> };

const INVITE_CODE = /^[a-z0-9-]{2,40}$/;

// Invite link: lands the friend at the door of the event it was made for; the door carries the invite through sign-in.
export default async function InviteLinkPage({ params }: Props) {
  const { code } = await params;
  if (process.env.API_MODE === "mock") redirect(`${eventPath(accessCode)}?invite=${code}`);
  const event = INVITE_CODE.test(code) ? await inviteDoorCode(code) : null;
  if (!event) notFound();
  redirect(`${eventPath(event)}?invite=${code}`);
}
