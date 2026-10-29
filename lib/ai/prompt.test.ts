import { expect, test } from "bun:test";
import { buildSummaryPrompt } from "./prompt";

test("prompt names both people and asks for Spanish", () => {
  const prompt = buildSummaryPrompt({ author: "Ana", other: "Luis" });
  expect(prompt).toContain("Ana");
  expect(prompt).toContain("Luis");
  expect(prompt).toContain("in Spanish");
  expect(prompt).toContain("substantive=false");
});
