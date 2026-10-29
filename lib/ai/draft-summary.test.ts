import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { SummaryClient } from "./draft-summary";
import type { SummaryOutput } from "./summary-schema";

mock.module("server-only", () => ({}));
const { draftSummary } = await import("./draft-summary");

const input = { text: "  Hablamos de agentes con LLMs.  ", author: "Ana", other: "Luis" };
const fallback = {
  summary: "Hablamos de agentes con LLMs.",
  title: "Hablamos de agentes con LLMs.",
  topics: [],
  next_steps: [],
  pending_action: null,
  substantive: true,
  fallback: true,
};

const clientReturning = (create: SummaryClient["responses"]["create"]): SummaryClient => ({
  responses: { create },
});

beforeEach(() => {
  process.env.OPENAI_TEXT_MODEL = "test-model";
});

describe("draftSummary", () => {
  test("parses a valid structured response", async () => {
    const output: SummaryOutput = {
      summary: "Ana y Luis hablaron de agentes.",
      title: "Agentes con LLMs",
      topics: ["Agents", "LLMs"],
      next_steps: ["Probar un agente"],
      pending_action: "Luis prueba un agente y le cuenta a Ana",
      substantive: true,
    };
    const client = clientReturning(async () => ({ output_text: JSON.stringify(output) }));
    expect(await draftSummary(input, client)).toEqual({ ...output, fallback: false });
  });

  test("falls back to the verbatim text on an API error", async () => {
    const client = clientReturning(async () => {
      throw new Error("503");
    });
    expect(await draftSummary(input, client)).toEqual(fallback);
  });

  test("falls back on invalid JSON", async () => {
    const client = clientReturning(async () => ({ output_text: "not json" }));
    expect(await draftSummary(input, client)).toEqual(fallback);
  });

  test("falls back when the output breaks the schema", async () => {
    const bad = { summary: "x", topics: ["Cooking"], next_steps: [], substantive: true };
    const client = clientReturning(async () => ({ output_text: JSON.stringify(bad) }));
    expect(await draftSummary(input, client)).toEqual(fallback);
  });

  test("falls back when OpenAI is not configured", async () => {
    const key = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      expect(await draftSummary(input)).toEqual(fallback);
    } finally {
      if (key !== undefined) process.env.OPENAI_API_KEY = key;
    }
  });
});
