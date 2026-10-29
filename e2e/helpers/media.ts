// Fake microphone and MediaRecorder for the voice-note flows; the transcript comes from a routed /api/transcribe.
import type { BrowserContext, Page } from "@playwright/test";

export async function fakeMicrophone(context: BrowserContext, { denied = false } = {}): Promise<void> {
  await context.addInitScript((deny: boolean) => {
    const stream = { getTracks: () => [{ stop() {} }] };
    const fake = {
      getUserMedia: async () => {
        if (deny) {
          const error = new Error("Permission denied");
          error.name = "NotAllowedError";
          throw error;
        }
        return stream;
      },
    };
    Object.defineProperty(navigator, "mediaDevices", { value: fake, configurable: true });
    class FakeRecorder {
      static isTypeSupported(type: string) {
        return type === "audio/webm";
      }
      mimeType = "audio/webm";
      state: RecordingState = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) });
        this.onstop?.(new Event("stop"));
      }
    }
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
  }, denied);
}

export async function routeTranscript(page: Page, text: string, status = 200): Promise<void> {
  await page.route("**/api/transcribe", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(status === 200 ? { text } : { error: { code: "transcription_failed", message: "x" } }),
    }),
  );
}
