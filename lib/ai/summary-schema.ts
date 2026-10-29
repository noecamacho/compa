import { z } from "zod";
import { TOPICS } from "../topics";

const SUMMARY_DESCRIPTION = "2-4 sentences, in Spanish, third person: what the two attendees talked about";
const TITLE_DESCRIPTION = "One line, in Spanish, at most 100 characters: the gist of the conversation";
const PENDING_DESCRIPTION = "One concrete follow-up the author committed to, in Spanish, or null when there is none";
const SUBSTANTIVE_DESCRIPTION = "false if the text does not describe a real conversation";

export const SummaryOutput = z.object({
  summary: z.string(),
  title: z.string(),
  topics: z.array(z.enum(TOPICS)).max(4),
  next_steps: z.array(z.string()).max(3),
  pending_action: z.string().nullable(),
  substantive: z.boolean(),
});

export type SummaryOutput = z.infer<typeof SummaryOutput>;

// Hand-written strict JSON Schema for OpenAI Structured Outputs (plan p. 12); kept in sync with SummaryOutput by tests.
export const SUMMARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "title", "topics", "next_steps", "pending_action", "substantive"],
  properties: {
    summary: { type: "string", description: SUMMARY_DESCRIPTION },
    title: { type: "string", description: TITLE_DESCRIPTION },
    topics: { type: "array", maxItems: 4, items: { type: "string", enum: [...TOPICS] } },
    next_steps: { type: "array", maxItems: 3, items: { type: "string" } },
    pending_action: { type: ["string", "null"], description: PENDING_DESCRIPTION },
    substantive: { type: "boolean", description: SUBSTANTIVE_DESCRIPTION },
  },
} as const;
