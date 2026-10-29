import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/connect/RegisterForm";
import { UserProfile } from "@/lib/api/schemas";
import { apiGetOrNull } from "@/lib/api/server-fetch";

type Props = { params: Promise<{ handle: string }> };

// 05 Registrar: the scanned person, before the request is sent.
export default async function RegisterPage({ params }: Props) {
  const { handle } = await params;
  const profile = await apiGetOrNull(`/api/users/${handle}`, UserProfile);
  if (!profile) notFound();
  return <RegisterForm profile={profile} />;
}
