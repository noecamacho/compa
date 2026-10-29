import { redirect } from "next/navigation";
import { Welcome } from "@/components/welcome/Welcome";
import { hasSession } from "@/lib/server/session";

type Props = { searchParams: Promise<{ error?: string }> };

// 01 Bienvenida. A signed-in person goes straight to home (gap analysis U1); mock mode keeps the screen
// reachable because it has no real sessions, so the buttons go straight to the next screen.
export default async function WelcomePage({ searchParams }: Props) {
  const { error } = await searchParams;
  const mock = process.env.API_MODE === "mock";
  if (!mock && (await hasSession())) redirect("/home");
  return <Welcome mock={mock} error={error === "linkedin"} />;
}
