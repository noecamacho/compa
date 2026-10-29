import { z } from "zod";
import { TOPICS } from "../topics";

const SUMMARY_DESCRIPTION =
  "2-4 sentences, in Spanish, third person: what the two attendees talked about";
const SUBSTANTIVE_DESCRIPTION = "false if the text does not describe a real conversation";

export const SummaryOutput = z.object({
  summary: z.string(),
  topics: z.array(z.enum(TOPICS)).max(4),
  next_steps: z.array(z.string()).max(3),
  substantive: z.boolean(),
});

export type SummaryOutput = z.infer<typeof SummaryOutput>;

// Hand-written strict JSON Schema for OpenAI Structured Outputs (plan p. 12); kept in sync with SummaryOutput by tests.
export const SUMMARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "topics", "next_steps", "substantive"],
  properties: {
    summary: { type: "string", description: SUMMARY_DESCRIPTION },
    topics: { type: "array", maxItems: 4, items: { type: "string", enum: [...TOPICS] } },
    next_steps: { type: "array", maxItems: 3, items: { type: "string" } },
    substantive: { type: "boolean", description: SUBSTANTIVE_DESCRIPTION },
  },
} as const;
