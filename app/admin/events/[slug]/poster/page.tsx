import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { QrPoster } from "@/components/admin/QrPoster";
import { AdminEventBody } from "@/lib/api/admin-schemas";
import { apiGetOrNull } from "@/lib/api/server-fetch";
import { adminCopy, requireAdminPage } from "@/lib/server/admin-page";

type Props = { params: Promise<{ slug: string }> };

// Same colors as the event page's QR; margin 4 is the standard quiet zone, which matters when scanned from far away.
const QR_OPTIONS = { type: "svg", margin: 4, errorCorrectionLevel: "M", color: { dark: "#1E1B2E", light: "#FFFFFF" } } as const;

// /admin/events/<slug>/poster: the event's join QR as a full-screen promo for a projector or TV. Gated like every
// /admin page and rendered without the admin shell.
export default async function AdminEventPosterPage({ params }: Props) {
  const { slug } = await params;
  const found = await apiGetOrNull(`/api/admin/events/${encodeURIComponent(slug)}`, AdminEventBody);
  if (!found) notFound();
  const { event } = found;
  const [, { locale }, svg] = await Promise.all([requireAdminPage(), adminCopy(), QRCode.toString(event.joinUrl, QR_OPTIONS)]);
  return <QrPoster locale={locale} name={event.name} slug={event.slug} joinUrl={event.joinUrl} svg={svg} />;
}
