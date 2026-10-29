# COMPA

Networking companion for conferences: fill in a profile once, connect by scanning a QR code or typing an @tag, and both people receive a summary of the conversation while a live Kahoot-style dashboard shows the leaderboard and the most-discussed topics.

## What is built here

This repository contains the Next.js app scaffold, PostgreSQL schema and migration, and API handlers for profiles, events, connections, the live dashboard, transcription and AI summaries. The home page links to the API reference at `/api/docs`; attendee-facing product screens are not implemented yet.

## Run locally

```sh
bun install --frozen-lockfile
cp -n .env.example .env.local
```

Set `API_MODE=mock` in `.env.local` to run the documented API examples without Supabase or OpenAI credentials. Then start the app:

```sh
bun run dev
```

Open `http://localhost:3000` for the app or `http://localhost:3000/api/docs` for the API reference. See [docs/api-quickstart.md](docs/api-quickstart.md) for mock requests and real backend configuration.

- Start with [AGENTS.md](AGENTS.md), the single instruction file for agents and contributors.
- Knowledge lives in the wiki: [wiki/index.md](wiki/index.md).
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md). Design: [DESIGN.md](DESIGN.md). History: [CHANGELOG.md](CHANGELOG.md).
- Setup: `scripts/setup.sh` (add `--install` to install missing agent tools).

## License

[MIT](LICENSE).
