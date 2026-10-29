import { Welcome } from "@/components/welcome/Welcome";

type Props = { searchParams: Promise<{ error?: string }> };

// 01 Bienvenida. In mock mode there is no LinkedIn, so the buttons go straight to the next screen.
export default async function WelcomePage({ searchParams }: Props) {
  const { error } = await searchParams;
  return <Welcome mock={process.env.API_MODE === "mock"} error={error === "linkedin"} />;
}
