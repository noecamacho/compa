import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { LiveBoard } from "@/components/live/LiveBoard";
import { codeFromSegment, joinUrl } from "@/lib/access-code";
import { LiveSnapshot } from "@/lib/api/schemas";
import { apiGetOrNull } from "@/lib/api/server-fetch";
import { pageTitle, requestLocale } from "@/lib/server/locale";
import { requestOrigin } from "@/lib/server/site";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ from?: string | string[] }> };

export const generateMetadata = async (): Promise<Metadata> => ({ ...(await pageTitle("live")()), robots: { index: false, follow: false } });

// /e/<code>/live: the projected dashboard. The QR on screen is the event's own door, so people can join from their seat.
// `?from=home` (the Home card's link) adds a way back: an installed app has no back button, a projector needs none.
export default async function LivePage({ params, searchParams }: Props) {
  const [{ code }, { from }] = await Promise.all([params, searchParams]);
  const [snapshot, locale, origin] = await Promise.all([apiGetOrNull(`/api/e/${encodeURIComponent(codeFromSegment(code))}/live`, LiveSnapshot), requestLocale(), requestOrigin()]);
  if (!snapshot) notFound();
  const url = joinUrl(origin, snapshot.event.code);
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1E1B2E", light: "#FFFFFF" } });
  return <LiveBoard key={snapshot.event.code} code={snapshot.event.code} initial={snapshot} qrSvg={qrSvg} joinUrl={url} locale={locale} backHref={from === "home" ? "/home" : null} />;
}
