import type { BrowserContext } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { alertIn, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Fakes a camera stream and the Barcode Detection API: the detector reports whatever `window.__qr` holds.
async function fakeCamera(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const fake = {
      getUserMedia: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        canvas.getContext("2d")?.fillRect(0, 0, 320, 240);
        return canvas.captureStream(5);
      },
    };
    Object.defineProperty(navigator, "mediaDevices", { value: fake, configurable: true });
    class FakeDetector {
      async detect() {
        const raw = (window as unknown as { __qr?: string }).__qr;
        return raw ? [{ rawValue: raw }] : [];
      }
    }
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = FakeDetector;
  });
}

const decodeQr = (png: Buffer): string | null => {
  const image = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data ?? null;
};

// 04 Conectar: my QR holds my real handle, the scanner states and the search by name.
test.describe("Conectar", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("my QR encodes my personal link with my real handle", async ({ pageA, userA, baseURL }) => {
    await pageA.goto("/connect");
    const qr = pageA.getByRole("img", { name: `Código QR de ${userA.name}` });
    await expect(qr).toBeVisible();
    const decoded = decodeQr(await qr.screenshot({ scale: "css" }));
    expect(decoded).toBe(`${baseURL}/u/${userA.handle}`);
    await expect(pageA.getByText("Muéstralo para que te escaneen.")).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Invitar" })).toHaveAttribute("href", "/invite");
  });

  test("the segmented control switches modes and keeps the URL in sync", async ({ pageA }) => {
    await pageA.goto("/connect");
    const modes = pageA.getByRole("group", { name: "Modo" });
    await expect(modes.getByRole("button", { name: "Mi QR" })).toHaveAttribute("aria-pressed", "true");
    await modes.getByRole("button", { name: "Escanear" }).click();
    await expect(pageA).toHaveURL("/connect?tab=scan");
    await expect(modes.getByRole("button", { name: "Escanear" })).toHaveAttribute("aria-pressed", "true");
    await expect(pageA.getByRole("searchbox")).toBeVisible();
    await modes.getByRole("button", { name: "Mi QR" }).click();
    await expect(pageA).toHaveURL("/connect");
    await pageA.goto("/connect?tab=scan");
    await expect(modes.getByRole("button", { name: "Escanear" })).toHaveAttribute("aria-pressed", "true");
  });

  test("without camera permission the scanner says so instead of hanging", async ({ pageA }) => {
    await pageA.goto("/connect?tab=scan");
    await expect(pageA.getByRole("status")).toHaveText("Sin cámara aquí. Pide que te escaneen o busca por nombre.");
    await expect(pageA.getByRole("searchbox")).toBeVisible();
  });

  test("a QR that is not from Compa shows a message and a personal QR shows the person", async ({ pageA, userB, context, baseURL }) => {
    await fakeCamera(context);
    await pageA.goto("/connect?tab=scan");
    await expect(pageA.getByRole("status")).toHaveText("Apunta a su QR");
    await pageA.evaluate(() => ((window as unknown as { __qr: string }).__qr = "https://example.com/not-compa"));
    await expect(alertIn(pageA)).toHaveText("Ese QR no es de Compa. Apunta al QR personal de la otra persona.");
    await pageA.evaluate((url) => ((window as unknown as { __qr: string }).__qr = url), `${baseURL}/u/${userB.handle}`);
    const connect = pageA.getByRole("link", { name: `Conectar con ${userB.name}` });
    await expect(connect).toHaveAttribute("href", `/connect/${userB.handle}`);
    await expect(alertIn(pageA)).toHaveCount(0);
    await connect.click();
    await expect(pageA).toHaveURL(`/connect/${userB.handle}`);
    await expect(pageA.getByRole("heading", { name: "Registrar" })).toBeVisible();
  });

  test("a QR of someone unknown does not break the scanner", async ({ pageA, context, baseURL }) => {
    await fakeCamera(context);
    await pageA.goto("/connect?tab=scan");
    await pageA.evaluate((url) => ((window as unknown as { __qr: string }).__qr = url), `${baseURL}/u/nadie-por-aqui`);
    await expect(alertIn(pageA)).toHaveText("No encontramos a nadie con ese nombre.");
    await expect(pageA.getByRole("searchbox")).toBeVisible();
  });

  test("the search finds real people by name, accents aside, and lets me connect", async ({ pageA, world, userB }) => {
    const carla = await world.addPerson({ name: "Carla Núñez", headline: "CMO", company: "Rutea" });
    await world.addPerson({ name: "Zoe Fuera", checkIn: false });
    await pageA.goto("/connect?tab=scan");
    const box = pageA.getByRole("searchbox");
    await box.fill("bruno");
    await box.press("Enter");
    const results = pageA.getByRole("list", { name: "Buscar por nombre" });
    await expect(results.getByText(userB.name)).toBeVisible();
    await expect(results.getByText("Cofounder · Kuali")).toBeVisible();

    await box.fill("nunez");
    await box.press("Enter");
    await expect(results.getByText(carla.name)).toBeVisible();
    await expect(results.getByText(userB.name)).toHaveCount(0);

    await box.fill("zoe");
    await box.press("Enter");
    await expect(alertIn(pageA)).toHaveText("No encontramos a nadie con ese nombre.");
    await expect(results).toHaveCount(0);

    await box.fill("Carla");
    await box.press("Enter");
    await results.getByRole("link", { name: `Conectar con ${carla.name}` }).click();
    await expect(pageA).toHaveURL(`/connect/${carla.handle}`);
    await expect(pageA.getByText(carla.name)).toBeVisible();
  });
});
