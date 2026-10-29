"use client";

import { screenState as copy } from "@/lib/copy/es";

type Props = { error: Error & { digest?: string }; retry: () => void };

// Replaces the root layout when it crashes, so it brings its own document and inline styles (no global CSS here).
export default function GlobalError({ error, retry }: Props) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#FFF6E5", color: "#1E1B2E", fontFamily: "system-ui, sans-serif" }}>
        <main role="alert" style={{ maxWidth: 340, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>{copy.errorTitle}</h1>
          <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{copy.errorBody}</p>
          {error.digest ? <p style={{ fontSize: 12, margin: "0 0 8px" }}>Ref: {error.digest}</p> : null}
          <button type="button" onClick={retry} style={{ minHeight: 48, padding: "0 24px", fontSize: 16, fontWeight: 700, borderRadius: 12, border: "2px solid #1E1B2E", background: "#FFD23F", color: "inherit" }}>
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
