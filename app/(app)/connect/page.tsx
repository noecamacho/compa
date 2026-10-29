import QRCode from "qrcode";
import { Suspense } from "react";
import { ConnectTabs } from "@/components/connect/ConnectTabs";
import { Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { requestOrigin } from "@/lib/server/site";

// 04 Conectar. The QR encodes the personal link /u/<handle> so the native camera also works (ADR-004).
export default async function ConnectPage() {
  const me = await apiGet("/api/me", Me);
  const qrSvg = await QRCode.toString(`${await requestOrigin()}/u/${me.handle}`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1E1B2E", light: "#FFFFFF" },
  });
  return (
    <Suspense>
      <ConnectTabs me={me} qrSvg={qrSvg} />
    </Suspense>
  );
}
