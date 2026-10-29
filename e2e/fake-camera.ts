// A fake camera for scan specs: the page sees a canvas stream of the given image (a QR data URL), with no
// BarcodeDetector, so the in-app scanner decodes it with jsQR as on Safari and Firefox.
import type { Page } from "@playwright/test";

export async function fakeCamera(page: Page, image: string): Promise<void> {
  await page.addInitScript((src: string) => {
    delete (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
    const fake = async (): Promise<MediaStream> => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const context = canvas.getContext("2d");
      const draw = () => {
        context?.fillRect(0, 0, 640, 480);
        context?.drawImage(image, 80, 0, 480, 480);
      };
      draw();
      setInterval(draw, 100);
      return canvas.captureStream(10);
    };
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: fake }, configurable: true });
  }, image);
}
