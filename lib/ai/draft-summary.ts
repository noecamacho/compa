import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { getOpenAI } from "./openai";
import { buildSummaryPrompt, type SummaryParties } from "./prompt";
import { SUMMARY_JSON_SCHEMA, SummaryOutput } from "./summary-schema";

export type SummaryClient = {
  responses: {
    create(body: ResponseCreateParamsNonStreaming): Promise<{ output_text: string }>;
  };
};

export type DraftSummaryInput = SummaryParties & { text: string };
export type DraftSummary = SummaryOutput & { fallback: boolean };

function requireTextModel(): string {
  const model = process.env.OPENAI_TEXT_MODEL;
  if (!model) throw new Error("OPENAI_TEXT_MODEL is not set");
  return model;
}

// Plan p. 12: if the summary fails, store the user's text verbatim.
const fallbackFor = (text: string): DraftSummary => ({
  summary: text.trim().slice(0, 1200),
  title: text.trim().slice(0, 100),
  topics: [],
  next_steps: [],
  pending_action: null,
  substantive: true,
  fallback: true,
});

async function requestSummary(
  { text, author, other }: DraftSummaryInput,
  client: SummaryClient,
): Promise<SummaryOutput> {
  const response = await client.responses.create({
    model: requireTextModel(),
    instructions: buildSummaryPrompt({ author, other }),
    input: text,
    text: {
      format: { type: "json_schema", name: "interaction_summary", strict: true, schema: SUMMARY_JSON_SCHEMA },
    },
  });
  return SummaryOutput.parse(JSON.parse(response.output_text));
}

// The client is created inside the try: without an OpenAI key the SDK throws on construction, and that case
// must fall back to the verbatim text like any other failure (plan p. 12), not fail the request.
export async function draftSummary(
  input: DraftSummaryInput,
  client?: SummaryClient,
): Promise<DraftSummary> {
  try {
    return { ...(await requestSummary(input, client ?? getOpenAI())), fallback: false };
  } catch (error) {
    console.error("draftSummary failed, using verbatim text", error);
    return fallbackFor(input.text);
  }
}
