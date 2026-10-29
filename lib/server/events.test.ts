import { describe, expect, mock, test } from "bun:test";
import type { EventRow } from "../../db/schema";
import { ApiError } from "../api/errors";

mock.module("server-only", () => ({}));
const { requireEventByCode } = await import("./events");

const event = { id: "e1", slug: "founders-fest", accessCode: "k7m2p9xq4t", name: "Founders Fest GDL" } as EventRow;

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  if (!(error instanceof ApiError)) throw new Error("expected an ApiError");
  return error;
}

describe("requireEventByCode (A10)", () => {
  test("finds the event by its normalized code", async () => {
    const find = mock(async (code: string) => (code === event.accessCode ? event : undefined));
    expect(await requireEventByCode(" K7M2P9XQ4T ", find)).toBe(event);
    expect(find).toHaveBeenCalledWith("k7m2p9xq4t");
  });

  test("an unknown code and a malformed one get the same 404, and the slug opens nothing", async () => {
    const find = mock(async (code: string) => (code === event.accessCode ? event : undefined));
    const bodies = await Promise.all(["zz9zz9zz9z", "founders-fest", "", "../admin"].map((code) => failure(requireEventByCode(code, find))));
    for (const error of bodies) {
      expect(error.status).toBe(404);
      expect(error.toBody()).toEqual({ error: { code: "event_not_found", message: "Event not found." } });
    }
    // Malformed codes never reach the database.
    expect(find).toHaveBeenCalledTimes(1);
  });
});
