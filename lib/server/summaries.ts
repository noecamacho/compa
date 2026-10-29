import "server-only";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { interactions, type InteractionRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { draftSummary as draftWithAi } from "../ai/draft-summary";
import { AudioValidationError, transcribe as transcribeAudio } from "../ai/transcribe";
import { AudioUploadError, readAudioFile } from "./audio-upload";
import { SUMMARY_POINTS } from "../points";
import { broadcast, liveTopic } from "../realtime";
import { requireAcceptedMembership } from "./connections";
import { isUniqueViolation, usersByIds } from "./people";

// ---- POST /api/transcribe ----

async function readAudio(req: Request): Promise<File> {
  try {
    return await readAudioFile(req);
  } catch (error) {
    if (error instanceof AudioUploadError) return fail(E.invalidAudio);
    throw error;
  }
}

async function transcribeOrFail(file: File): Promise<string> {
  try {
    return await transcribeAudio(file);
  } catch (error) {
    if (error instanceof AudioValidationError) return fail(E.invalidAudio, `Invalid audio: ${error.reason}.`);
    console.error("transcription failed", error);
    return fail(E.transcriptionFailed);
  }
}

export async function transcribe({ req }: InputOf<typeof R.transcribe>): ResultOf<typeof R.transcribe> {
  const text = await transcribeOrFail(await readAudio(req));
  return { body: { text } };
}

// ---- POST /api/interactions/draft ----

async function otherName(userId: string, row: { requesterId: string; addresseeId: string }): Promise<string> {
  const otherId = row.requesterId === userId ? row.addresseeId : row.requesterId;
  const [other] = await usersByIds([otherId]);
  return other?.name ?? "la otra persona";
}

async function draftOrFail(user: UserRow, text: string, other: string) {
  try {
    return await draftWithAi({ text, author: user.name, other });
  } catch (error) {
    console.error("draft failed", error);
    return fail(E.summaryFailed);
  }
}

export async function draftSummary({ user, body }: InputOf<typeof R.draftSummary>): ResultOf<typeof R.draftSummary> {
  const { row } = await requireAcceptedMembership(body.connectionId, user.id);
  const draft = await draftOrFail(user, body.text, await otherName(user.id, row));
  const [saved] = await getDb()
    .insert(interactions)
    .values({
      connectionId: row.id,
      authorId: user.id,
      summary: draft.summary,
      topics: draft.topics,
      nextSteps: draft.next_steps,
      substantive: draft.substantive,
      fallback: draft.fallback,
    })
    .returning();
  if (!saved) return fail(E.internal);
  const { summary, topics, next_steps: nextSteps, substantive, fallback } = draft;
  return { status: 201, body: { interactionId: saved.id, summary, topics, nextSteps, substantive, fallback } };
}

// ---- POST /api/interactions/:id/approve (M18) ----

async function requireOwnDraft(id: string, userId: string): Promise<InteractionRow> {
  const [row] = await getDb().select().from(interactions).where(eq(interactions.id, id)).limit(1);
  const draft = row ?? fail(E.notFound);
  await requireAcceptedMembership(draft.connectionId, userId);
  return draft.authorId === userId ? draft : fail(E.notAuthor);
}

async function hasApprovedSummary(connectionId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: interactions.id })
    .from(interactions)
    .where(and(eq(interactions.connectionId, connectionId), isNotNull(interactions.approvedAt)))
    .limit(1);
  return Boolean(row);
}

type ApproveInput = InputOf<typeof R.approveSummary>["body"];

async function markApproved(draft: InteractionRow, body: ApproveInput): Promise<InteractionRow> {
  try {
    const [row] = await getDb()
      .update(interactions)
      .set({ summary: body.summary, topics: body.topics, nextSteps: body.nextSteps, points: SUMMARY_POINTS, approvedAt: new Date() })
      .where(and(eq(interactions.id, draft.id), isNull(interactions.approvedAt)))
      .returning();
    return row ?? fail(E.alreadyApproved);
  } catch (error) {
    if (isUniqueViolation(error)) return fail(E.alreadyApproved);
    throw error;
  }
}

export async function approveSummary({ user, params, body }: InputOf<typeof R.approveSummary>): ResultOf<typeof R.approveSummary> {
  const draft = await requireOwnDraft(params.id, user.id);
  if (await hasApprovedSummary(draft.connectionId)) return fail(E.alreadyApproved);
  if (!draft.substantive) return fail(E.notSubstantive);
  const row = await markApproved(draft, body);
  const { event } = await requireAcceptedMembership(row.connectionId, user.id);
  await broadcast({ topic: liveTopic(event.accessCode), event: "summary.approved", payload: { connectionId: row.connectionId, topics: body.topics } });
  const interaction = {
    id: row.id,
    connectionId: row.connectionId,
    summary: row.summary,
    topics: body.topics,
    nextSteps: row.nextSteps,
    points: SUMMARY_POINTS,
    approvedAt: (row.approvedAt ?? new Date()).toISOString(),
  };
  return { body: { interaction, pointsAwarded: SUMMARY_POINTS } };
}
