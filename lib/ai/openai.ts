// Server only: import this module only from server code; it reads OPENAI_API_KEY.
// `server-only` is not used because it needs the Next.js bundler; add it once the app exists.
import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
