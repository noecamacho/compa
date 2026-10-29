# AI summaries API contract

For the front end of `/connection/[id]/summary` ([screens/summary](../../wiki/screens/summary.md)). Source: routes 14–16, `DraftInput`, `ApproveInput` and the error body in section 7 of `docs/plans/2026-10-28-mvp-api-plan.md` (branch `docs/COMPA-TBD-mvp-api-plan`), plus `lib/ai/*`. Items marked **proposed** are not in the plan; the routes owner confirms them.

## Common rules

- **Auth:** every route needs the session cookie (Supabase session or `compa_session`). Same-origin `fetch` sends it; no header needed. No session → `401`.
- **Error body**, every route:

  ```json
  { "error": { "code": "not_substantive", "message": "…", "fields": {} } }
  ```

  `fields` appears on `400` (zod) only. Statuses: 400 invalid input, 401 no session, 403 wrong actor, 404 not found or not yours, 409 state conflict, 502 upstream AI failed.
- **Field names are camelCase** in every request and response: `nextSteps`, not `next_steps`. `lib/ai/draft-summary.ts` returns `next_steps` (the OpenAI schema name); the routes map it to `nextSteps`.

## Flow

1. The user records (optional) or types a note.
2. Recording → `POST /api/transcribe` → the text lands in the note field. The text field is **always visible**.
3. `POST /api/interactions/draft` with the note → an editable summary, topics and next steps.
4. The user edits.
5. `POST /api/interactions/:id/approve` with the edited values → both people see the summary. Summaries award **no points**: points come only from connections (data model M3, [summaries spec](../specs/2026-10-29-summaries.md)).

Summaries exist only for **accepted** connections (data model M6). Hide the summary entry point while a connection is pending.

## 1. `POST /api/transcribe`

Request: `multipart/form-data` with one field, `audio` (a `File`).

| Limit | Value | Enforced by |
| --- | --- | --- |
| Type | `audio/webm`, `audio/mp4`, `audio/m4a`, `audio/x-m4a`, `audio/mpeg`, `audio/wav`, `audio/x-wav` (codec params such as `;codecs=opus` are ignored) | server (`lib/ai/transcribe.ts`) |
| Size | 1 byte to 15 MB | server |
| Duration | 2 minutes | **client only** (`lib/audio/recorder.ts`) |

The audio stays in memory and is never stored. Transcription is in Spanish.

Success `200`:

```json
{ "text": "Hablé con Ana sobre cómo migrar su app de Vue a React y quedamos en compartir el repo." }
```

| Status | Code | UI must |
| --- | --- | --- |
| 400 | `invalid_audio` (**proposed**) | Show the text field: "No pudimos leer el audio, escríbelo." |
| 401 | `unauthorized` (**proposed**) | Send the user to sign in with LinkedIn (data model M2). |
| 502 | `transcription_failed` (**proposed**) | Show the text field and keep the user on the screen (plan p. 12). |

Network failure: `uploadForTranscript` throws `ApiError` with status `0` and code `network_error`; treat it like 502.

## 2. `POST /api/interactions/draft`

Request JSON (`DraftInput`):

| Field | Type | Limits |
| --- | --- | --- |
| `connectionId` | string | UUID; the caller must be a member of the connection |
| `text` | string | trimmed, 1–4000 characters |

Each call inserts a new draft row; drafts are unlimited.

Success `201`:

```json
{
  "interactionId": "5b8f2c1e-3a4d-4e6f-9b0a-1c2d3e4f5a6b",
  "summary": "Ana y Luis hablaron sobre migrar una app de Vue a React. Luis compartirá su repositorio de ejemplo.",
  "topics": ["React", "Vue"],
  "nextSteps": ["Luis comparte el repo con Ana"],
  "substantive": true,
  "fallback": false
}
```

- `topics`: at most 4, from `lib/topics.ts` only. `nextSteps`: at most 3.
- `fallback` is **added beyond the plan** (from `lib/ai/draft-summary.ts`): `true` means the AI failed and `summary` is the user's own text, trimmed to 1200 characters, with empty `topics` and `nextSteps` and `substantive: true`.
- `substantive: false` means the note does not describe a conversation.

| Status | Code | UI must |
| --- | --- | --- |
| 201 with `fallback: true` | — | Show the user's text as the editable summary with a note "No pudimos generar el resumen; revisa tu texto." Approve stays enabled. |
| 201 with `substantive: false` | — | Show "Cuéntanos de qué hablaron" and disable Approve until a new draft is substantive. |
| 400 | `invalid_input` (**proposed**) | Highlight `fields.text`; empty notes cannot be sent. |
| 401 | `unauthorized` (**proposed**) | Send the user to sign in with LinkedIn (data model M2). |
| 404 | `not_found` (**proposed**) | "Esta conexión no existe." Back to `/me`. |
| 409 | `connection_not_accepted` (**proposed**) | "Primero la otra persona tiene que aceptar la conexión." Back to the connection. |
| 502 | `summary_failed` (**proposed**) | Same as `fallback: true`, but there is no `interactionId`: keep the typed text editable and retry the draft before approving. |

The 502 is only a safety net: `draftSummary` already falls back without throwing, so the normal AI failure arrives as `201` with `fallback: true`.

## 3. `POST /api/interactions/:id/approve`

`:id` is the `interactionId` from the draft. Only the draft's author may approve.

Request JSON (`ApproveInput`), the user-edited values:

| Field | Type | Limits |
| --- | --- | --- |
| `summary` | string | trimmed, 1–1200 characters |
| `topics` | string[] | at most 4, each from `lib/topics.ts` |
| `nextSteps` | string[] | at most 3, each trimmed, 1–200 characters |

Success `200` (the `interaction` shape is **proposed**; the plan only names it):

```json
{
  "interaction": {
    "id": "5b8f2c1e-3a4d-4e6f-9b0a-1c2d3e4f5a6b",
    "connectionId": "0d9c8b7a-6f5e-4d3c-2b1a-0f9e8d7c6b5a",
    "summary": "Ana y Luis hablaron sobre migrar una app de Vue a React. Luis compartirá su repositorio de ejemplo.",
    "topics": ["React", "Vue"],
    "nextSteps": ["Luis comparte el repo con Ana"],
    "approvedAt": "2026-10-29T08:15:00.000Z"
  }
}
```

| Status | Code | UI must |
| --- | --- | --- |
| 400 | `invalid_input` (**proposed**) | Highlight the fields in `fields`. |
| 401 | `unauthorized` (**proposed**) | Send the user to sign in with LinkedIn (data model M2). |
| 403 | `not_author` (**proposed**) | "Solo quien escribió el resumen puede aprobarlo." |
| 404 | `not_found` (**proposed**) | Back to the connection. |
| 409 | `not_substantive` | Block approval: "El resumen no describe una conversación real. Cuéntanos de qué hablaron." Let the user edit the note and draft again. |
| 409 | `already_approved` | This connection already has an approved summary (one per connection). Show it read-only; do not retry. |

Replay is safe: a second approve returns 409 and never creates a second approved summary. Disable the button while the request runs.

## Using `lib/audio/recorder.ts`

```ts
import { RecorderError, startRecording, uploadForTranscript } from "@/lib/audio/recorder";

try {
  const recording = await startRecording({
    onTick: (ms) => setSeconds(ms / 1000),           // every second; auto-stops at 2 min
    onStop: (file) => uploadForTranscript(file)
      .then(({ text }) => setNote(text))
      .catch(showTextField),                          // ApiError: e.status, e.code
  });
  stopButton.onclick = () => recording.stop();      // cancel() discards the audio
} catch (e) {
  if (e instanceof RecorderError) showTextField();  // e.reason: unsupported | permission_denied | no_microphone | failed
}
```

- `startRecording` is async: it waits for the microphone permission. Call it from a tap handler (iOS requires a user gesture).
- `stop()` and `cancel()` always stop the mic tracks, so the iOS mic indicator turns off.
- The file is `audio.webm` (Chrome, Firefox) or `audio.m4a` (iOS Safari).
- Recording needs the other person's consent first ([privacy-consent](../../wiki/privacy-consent.md)); the recorder does not check it.

## Mocking until the routes exist

Swap `fetch` for a stub that returns these bodies (`uploadForTranscript` takes one as its second argument):

```ts
export const mocks = {
  transcribe: { status: 200, body: { text: "Hablé con Ana sobre migrar su app de Vue a React." } },
  transcribeFailed: { status: 502, body: { error: { code: "transcription_failed", message: "STT failed" } } },
  draft: {
    status: 201,
    body: {
      interactionId: "5b8f2c1e-3a4d-4e6f-9b0a-1c2d3e4f5a6b",
      summary: "Ana y Luis hablaron sobre migrar una app de Vue a React. Luis compartirá su repositorio de ejemplo.",
      topics: ["React", "Vue"],
      nextSteps: ["Luis comparte el repo con Ana"],
      substantive: true,
      fallback: false,
    },
  },
  draftFallback: {
    status: 201,
    body: {
      interactionId: "6c9f3d2e-4b5e-4f70-8c1b-2d3e4f5a6b7c",
      summary: "hablamos de vue y react, me pasa el repo",
      topics: [],
      nextSteps: [],
      substantive: true,
      fallback: true,
    },
  },
  draftNotSubstantive: {
    status: 201,
    body: {
      interactionId: "7d0a4e3f-5c6f-4081-9d2c-3e4f5a6b7c8d",
      summary: "",
      topics: [],
      nextSteps: [],
      substantive: false,
      fallback: false,
    },
  },
  approve: {
    status: 200,
    body: {
      interaction: {
        id: "5b8f2c1e-3a4d-4e6f-9b0a-1c2d3e4f5a6b",
        connectionId: "0d9c8b7a-6f5e-4d3c-2b1a-0f9e8d7c6b5a",
        summary: "Ana y Luis hablaron sobre migrar una app de Vue a React.",
        topics: ["React", "Vue"],
        nextSteps: ["Luis comparte el repo con Ana"],
        approvedAt: "2026-10-29T08:15:00.000Z",
      },
    },
  },
  approveNotSubstantive: {
    status: 409,
    body: { error: { code: "not_substantive", message: "The summary does not describe a conversation" } },
  },
  approveAlreadyApproved: {
    status: 409,
    body: { error: { code: "already_approved", message: "This connection already has a summary" } },
  },
} as const;

export const mockFetch = (mock: { status: number; body: unknown }) => async () =>
  Response.json(mock.body, { status: mock.status });
```

Related: [ai-jobs](../../wiki/ai-jobs.md), [screens/summary](../../wiki/screens/summary.md), [api](../../wiki/api.md), [privacy-consent](../../wiki/privacy-consent.md).
