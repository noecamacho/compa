import { TOPICS } from "../topics";

export type SummaryParties = { author: string; other: string };

// System prompt from the plan (p. 12). Output follows the language of the note (captain decision 2026-10-29);
// topics always come from the fixed vocabulary that also seeds the `interests` table.
export function buildSummaryPrompt({ author, other }: SummaryParties): string {
  return [
    `You are the COMPA assistant at a networking event. You receive ${author}'s note about their conversation with ${other}.`,
    "Write a brief, neutral summary both can read, in 2-4 sentences, third person.",
    "Also write a one-line title with the gist, and set pending_action to the one concrete follow-up the author committed to (for example an introduction to make), or null.",
    "Write the summary, the title, the next steps and the pending action in the same language as the note.",
    "Do not invent facts that are not in the note.",
    "Do not include sensitive data (health, money, personal matters); if they appear, omit them.",
    `Classify topics ONLY with this vocabulary: ${TOPICS.join(", ")}.`,
    "Set substantive=false if the note is empty, is spam or does not describe a conversation.",
  ].join("\n");
}
