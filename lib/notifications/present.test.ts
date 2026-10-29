import { describe, expect, test } from "bun:test";
import * as X from "../api/examples";
import { Notifications, type NotificationT } from "../api/schemas";
import { copyFor } from "../copy";
import { freshNotifications, notificationHref, notificationText } from "./present";

const [example] = Notifications.parse(X.notifications).notifications.filter((item) => item.kind === "request");
if (!example || example.kind !== "request") throw new Error("the examples need a request");
const request: NotificationT = { ...example, id: "request:c1", connectionId: "c1", eventName: "Codex Conf", unseen: true };
const badge: NotificationT = { id: "badge:apreton", kind: "badge_earned", badgeId: "apreton", badgeName: "Primer apretón", createdAt: "2026-10-29T09:00:00Z", unseen: false };

describe("notification presentation", () => {
  test("a badge notice names the badge in the reader's language, not the API's", () => {
    expect(notificationText(badge, copyFor("en").notifications, copyFor("en").badgeNames)).toBe("You earned the First Handshake badge");
    expect(notificationText(badge, copyFor("es").notifications, copyFor("es").badgeNames)).toBe("Ganaste la insignia Primer apretón");
  });

  test("text and link per kind", () => {
    expect(notificationText(request, copyFor("en").notifications, copyFor("en").badgeNames)).toBe(`${example.person.name} sent you a request at Codex Conf`);
    expect(notificationHref(request)).toBe("/requests/c1");
    expect(notificationHref(badge)).toBe("/me/badges");
  });

  test("only new unseen items are announced, never on the first load", () => {
    expect(freshNotifications([request, badge], null)).toEqual([]);
    expect(freshNotifications([request, badge], new Set())).toEqual([request]);
    expect(freshNotifications([request, badge], new Set(["request:c1"]))).toEqual([]);
  });

  test("a badge that lands with an acceptance never hides it", () => {
    const newBadge: NotificationT = { ...badge, unseen: true, createdAt: "2026-10-29T11:00:00Z" };
    expect(freshNotifications([newBadge, request], new Set()).map((item) => item.id)).toEqual(["request:c1", "badge:apreton"]);
  });
});
