import { describe, expect, test } from "bun:test";
import { TOPICS } from "../topics";
import { SUMMARY_JSON_SCHEMA, SummaryOutput } from "./summary-schema";

const valid = {
  summary: "Ana y Luis hablaron de React Server Components.",
  topics: ["React", "Next.js"],
  next_steps: ["Compartir el repositorio"],
  substantive: true,
};

describe("SummaryOutput", () => {
  test("accepts a valid output", () => {
    expect(SummaryOutput.safeParse(valid).success).toBe(true);
  });

  test("rejects a topic outside the vocabulary", () => {
    expect(SummaryOutput.safeParse({ ...valid, topics: ["Cooking"] }).success).toBe(false);
  });

  test("rejects more than 4 topics", () => {
    const topics = ["React", "Node", "TypeScript", "Agents", "LLMs"];
    expect(SummaryOutput.safeParse({ ...valid, topics }).success).toBe(false);
  });

  test("rejects more than 3 next steps", () => {
    expect(SummaryOutput.safeParse({ ...valid, next_steps: ["a", "b", "c", "d"] }).success).toBe(false);
  });
});

describe("SUMMARY_JSON_SCHEMA", () => {
  test("is strict and matches the vocabulary", () => {
    expect(SUMMARY_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(Object.keys(SUMMARY_JSON_SCHEMA.properties).sort()).toEqual([...SUMMARY_JSON_SCHEMA.required].sort());
    expect(SUMMARY_JSON_SCHEMA.properties.topics.items.enum).toEqual([...TOPICS]);
    expect(SUMMARY_JSON_SCHEMA.properties.summary.description).toContain("same language as the note");
  });
});
