import { redirect } from "next/navigation";

type Props = { params: Promise<{ handle: string }> };

// The personal QR link (API spec A8). With a session it opens the register screen; the (app) layout handles the rest.
export default async function PersonalLinkPage({ params }: Props) {
  const { handle } = await params;
  redirect(`/connect/${handle}`);
}
