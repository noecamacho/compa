import { expect, test } from "bun:test";
import { buildSummaryPrompt } from "./prompt";

test("prompt names both people and keeps the note's language", () => {
  const prompt = buildSummaryPrompt({ author: "Ana", other: "Luis" });
  expect(prompt).toContain("Ana");
  expect(prompt).toContain("Luis");
  expect(prompt).toContain("same language as the note");
  expect(prompt).not.toContain("in Spanish");
  expect(prompt).toContain("substantive=false");
  expect(prompt).not.toContain("JavaScript conference");
});
