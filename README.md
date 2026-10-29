# COMPA

Networking companion for conferences: fill in a profile once, connect by scanning a QR code or typing an @tag, and both people receive a summary of the conversation while a live Kahoot-style dashboard shows the leaderboard and the most-discussed topics.

## What is built here

This repository contains a working Next.js app for conference attendees: an event door and live dashboard, LinkedIn and email sign-in, consented check-in, profile and monito onboarding, QR and @tag connections, incoming requests, conversation summaries, invites, badges, rankings and sign-out. It also includes the PostgreSQL schema and migrations, server-side API handlers, and the API reference at `/api/docs`.

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

For hosted Supabase projects, configure a custom SMTP server or a Send Email hook before enabling email sign-in for attendees. Supabase's built-in email service is limited to team addresses and two messages per hour; see the [Supabase SMTP setup guide](https://supabase.com/docs/guides/auth/auth-smtp).

- Start with [AGENTS.md](AGENTS.md), the single instruction file for agents and contributors.
- Knowledge lives in the wiki: [wiki/index.md](wiki/index.md).
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md). Design: [DESIGN.md](DESIGN.md). History: [CHANGELOG.md](CHANGELOG.md).
- Setup: `scripts/setup.sh` (add `--install` to install missing agent tools).

## License

[MIT](LICENSE).
