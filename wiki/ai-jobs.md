# AI: transcription, summaries and topics

The AI does three bounded jobs with structured output; it never decides points or permissions (p. 11).

## Jobs (p. 11)

| Job | Input | Output | When |
| --- | --- | --- | --- |
| Transcribe | Audio (webm/m4a, max 2 min) | Text | Dictating a profile or summary; recording |
| Pre-fill profile | Dictated text | JSON of profile fields | "Dictate my profile" option |
| Draft summary | Text or transcript + both names and topics | `{summary, topics, next_steps, substantive}` | Before approval |

## Summary schema (Structured Outputs / JSON Schema) (p. 12)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["summary", "topics", "next_steps", "substantive"],
  "properties": {
    "summary": { "type": "string", "description": "2-4 sentences, third person: what A and B talked about" },
    "topics": { "type": "array", "maxItems": 4, "items": { "type": "string", "enum": ["<fixed vocabulary>"] } },
    "next_steps": { "type": "array", "maxItems": 3, "items": { "type": "string" } },
    "substantive": { "type": "boolean", "description": "false if the text does not describe a real conversation" }
  }
}
```

Language: transcription runs with `language: "es"` and the summary and next steps are written in Spanish (p. 12; team decision 2026-10-29, [open-questions](open-questions.md) #6). Prompts, code and identifiers stay English.

## System prompt for the summary, translated (p. 12)

> You are the COMPA assistant at a JavaScript conference. You receive {author}'s note about their conversation with {other}. Write a brief, neutral summary both can read. Do not invent facts that are not in the note. Do not include sensitive data (health, money, personal matters); if they appear, omit them. Classify topics ONLY with the given vocabulary. Set substantive=false if the note is empty, is spam or does not describe a conversation.

## Models and fallbacks (p. 12)

- Defaults: `OPENAI_STT_MODEL=gpt-4o-mini-transcribe`; `OPENAI_TEXT_MODEL=gpt-5.4-mini` (confirmed in the team account; the code has no default and requires it).
- Use the transcription and text models current in the team's OpenAI account; confirm the names in the console before coding them and put them in environment variables `OPENAI_STT_MODEL` and `OPENAI_TEXT_MODEL`.
- If transcription fails, show the text field; if the summary fails, store the user's text verbatim as the summary.
- Transcription slow (> 5 s) or noisy: the text field is always visible as an alternative (p. 20).

Related: [screens/summary](screens/summary.md), [api](api.md), [privacy-consent](privacy-consent.md), [topics-vocabulary](topics-vocabulary.md). Owner: person C ([team-and-prs](team-and-prs.md)).
