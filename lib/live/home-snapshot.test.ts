import { describe, expect, test } from "bun:test";
import { liveSnapshot } from "../api/examples";
import { fetchHomeSnapshot } from "./home-snapshot";

const answer = (response: Response | Error) => async (): Promise<Response> => {
  if (response instanceof Error) throw response;
  return response;
};

const signal = new AbortController().signal;

describe("fetchHomeSnapshot", () => {
  test("parses a snapshot", async () => {
    const snapshot = await fetchHomeSnapshot("ABC123", signal, answer(Response.json(liveSnapshot)));
    expect(snapshot?.event.name).toBe(liveSnapshot.event.name);
  });

  test("reads the event's own live route", async () => {
    let url = "";
    const spy = async (input: string): Promise<Response> => {
      url = input;
      return Response.json(liveSnapshot);
    };
    await fetchHomeSnapshot("A B", signal, spy);
    expect(url).toBe("/api/e/A%20B/live");
  });

  test("a non-2xx, a wrong body or a network error is null", async () => {
    expect(await fetchHomeSnapshot("X", signal, answer(new Response("", { status: 503 })))).toBeNull();
    expect(await fetchHomeSnapshot("X", signal, answer(Response.json({ nope: true })))).toBeNull();
    expect(await fetchHomeSnapshot("X", signal, answer(new Error("offline")))).toBeNull();
  });
});
