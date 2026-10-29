import { describe, expect, test } from "bun:test";
import { pushPayload } from "./content";

describe("pushPayload", () => {
  test("a request opens the request and speaks the subscriber's language", () => {
    const notice = { kind: "request", connectionId: "c1", personName: "Ana", eventName: "Codex Conf" } as const;
    expect(pushPayload(notice, "es")).toEqual({ title: "COMPA", body: "Ana te envió una solicitud en Codex Conf", url: "/requests/c1", tag: "request:c1" });
    expect(pushPayload(notice, "en").body).toBe("Ana sent you a request at Codex Conf");
  });

  test("each kind links where the notifications list links", () => {
    expect(pushPayload({ kind: "accepted", connectionId: "c2", personName: "Bruno", eventName: "X" }, "en").url).toBe("/connections/c2/done");
    expect(pushPayload({ kind: "invitee_connected", personId: "u1", personName: "Eva" }, "en").url).toBe("/invite");
    expect(pushPayload({ kind: "badge_earned", badgeId: "apreton", badgeName: "Primer apretón" }, "en")).toMatchObject({ url: "/me/badges", tag: "badge:apreton" });
  });
});
