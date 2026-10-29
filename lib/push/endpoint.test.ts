import { describe, expect, test } from "bun:test";
import { allowedPushOrigins, isAllowedPushEndpoint } from "./endpoint";

describe("isAllowedPushEndpoint", () => {
  test("accepts the browser push services", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QGx")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=x")).toBe(true);
  });

  test("refuses anything that could reach another host", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://user@fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.dev/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://evilnotify.windows.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });

  test("admits only the exact extra origins", () => {
    const extra = allowedPushOrigins(" http://127.0.0.1:3199 , ");
    expect(extra).toEqual(["http://127.0.0.1:3199"]);
    expect(isAllowedPushEndpoint("http://127.0.0.1:3199/push/b", extra)).toBe(true);
    expect(isAllowedPushEndpoint("http://127.0.0.1:3198/push/b", extra)).toBe(false);
  });
});
