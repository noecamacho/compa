// A stand-in browser push service for e2e: records what the app POSTs to a subscription endpoint. The app admits it
// only through PUSH_ALLOWED_ORIGINS, which is set for local runs and never in Vercel. web-push always speaks https, so
// the mock serves a self-signed certificate that the app trusts through NODE_EXTRA_CA_CERTS (docs/testing/real-mode.md §6).
import { createECDH, randomBytes } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { createServer, type Server } from "node:https";

export type ReceivedPush = { path: string; at: number; headers: IncomingHttpHeaders; bytes: number };

export type MockPushService = {
  origin: string;
  received: ReceivedPush[];
  // A subscription body for POST /api/push/subscriptions with real P-256 keys, so web-push can encrypt to it.
  subscriptionFor: (name: string) => { endpoint: string; keys: { p256dh: string; auth: string }; locale: "es" | "en" };
  close: () => Promise<void>;
};

export async function startMockPushService(port: number, tls: { cert: Buffer; key: Buffer }): Promise<MockPushService> {
  const received: ReceivedPush[] = [];
  const server: Server = createServer(tls, (req, res) => {
    let bytes = 0;
    req.on("data", (chunk: Buffer) => (bytes += chunk.length));
    req.on("end", () => {
      received.push({ path: req.url ?? "", at: Date.now(), headers: req.headers, bytes });
      res.writeHead(201).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const origin = `https://127.0.0.1:${port}`;
  return {
    origin,
    received,
    subscriptionFor: (name) => {
      const ecdh = createECDH("prime256v1");
      ecdh.generateKeys();
      return { endpoint: `${origin}/push/${name}`, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") }, locale: "en" };
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
