import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DemoStage, type DemoLinks } from "@/components/demo/DemoStage";
import { demoCast } from "@/lib/demo/cast";
import { isDemoMode } from "@/lib/demo/respond";
import { DEMO_EVENT_CODE, DEMO_EVENT_SLUG } from "@/lib/demo/scenario";
import { demoConnectionId, nextScanTarget, readVisitor } from "@/lib/demo/visitor";
import { requestCopy, requestLocale } from "@/lib/server/locale";

export const generateMetadata = async (): Promise<Metadata> => ({ title: (await requestCopy()).copy.demo.tabTitle, robots: { index: false, follow: false } });

// The guide connects the visitor with the first person they have not met, so "Start over" or a new visitor replays it.
async function demoLinks(): Promise<DemoLinks> {
  const cast = demoCast();
  // The cookie keeps 24 links out of 150 people, so someone is always left to meet.
  const target = nextScanTarget(readVisitor((await headers()).get("cookie")), cast) ?? cast[0]!;
  const connection = `/connections/${demoConnectionId(cast.indexOf(target))}`;
  return {
    phone: ["/home", "/connect", `/connect/${target.handle}`, `${connection}/done`, `${connection}/note`, "/ranking"],
    screen: `/e/${DEMO_EVENT_CODE}/live`,
    console: `/admin/events/${DEMO_EVENT_SLUG}`,
    target: { handle: target.handle, topics: target.interests.slice(0, 2) },
  };
}

// /demo (D3): only on a demo deployment (API_MODE=demo); elsewhere the frames would need a real account.
export default async function DemoPage() {
  if (!isDemoMode()) notFound();
  const [links, locale] = await Promise.all([demoLinks(), requestLocale()]);
  return (
    <main lang={locale} className="paper-dots min-h-svh w-full overflow-x-clip">
      <DemoStage links={links} />
    </main>
  );
}
