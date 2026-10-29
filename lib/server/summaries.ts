import "server-only";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { interactions, type InteractionRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import { CAPS } from "../api/rate-limits";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { draftSummary as draftWithAi } from "../ai/draft-summary";
import { AudioValidationError, transcribe as transcribeAudio } from "../ai/transcribe";
import { AudioUploadError, readAudioFile } from "./audio-upload";
import { SUMMARY_POINTS } from "../points";
import { afterResponse } from "../after-response";
import { broadcast, liveTopic } from "../realtime";
import { awardBadges } from "./badges";
import { badgeNotices, notify } from "./notify";
import { requireAcceptedMembership } from "./connections";
import { requireUnderCap } from "./rate-limit";
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

async function countDrafts(connectionId: string, authorId: string): Promise<number> {
  const [row] = await getDb()
    .select({ drafts: count() })
    .from(interactions)
    .where(and(eq(interactions.connectionId, connectionId), eq(interactions.authorId, authorId)));
  return row?.drafts ?? 0;
}

export async function draftSummary({ user, body }: InputOf<typeof R.draftSummary>): ResultOf<typeof R.draftSummary> {
  const { row } = await requireAcceptedMembership(body.connectionId, user.id);
  requireUnderCap(await countDrafts(row.id, user.id), CAPS.draftsPerConnection);
  const draft = await draftOrFail(user, body.text, await otherName(user.id, row));
  const [saved] = await getDb()
    .insert(interactions)
    .values({
      connectionId: row.id,
      authorId: user.id,
      summary: draft.summary,
      title: draft.title.slice(0, 120),
      pendingAction: draft.pending_action?.slice(0, 200) ?? null,
      topics: draft.topics,
      nextSteps: draft.next_steps,
      substantive: draft.substantive,
      fallback: draft.fallback,
    })
    .returning();
  if (!saved) return fail(E.internal);
  const { summary, topics, next_steps: nextSteps, substantive, fallback, title, pending_action: pendingAction } = draft;
  return { status: 201, body: { interactionId: saved.id, summary, topics, nextSteps, substantive, fallback, title, pendingAction } };
}

// ---- POST /api/interactions/:id/approve (M18) ----

async function requireOwnDraft(id: string, userId: string) {
  const [row] = await getDb().select().from(interactions).where(eq(interactions.id, id)).limit(1);
  const draft = row ?? fail(E.notFound);
  const { event } = await requireAcceptedMembership(draft.connectionId, userId);
  return draft.authorId === userId ? { draft, event } : fail(E.notAuthor);
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

async function markApproved(draft: InteractionRow, body: ApproveInput, points: number): Promise<InteractionRow> {
  try {
    const [row] = await getDb()
      .update(interactions)
      .set({
        summary: body.summary,
        topics: body.topics,
        nextSteps: body.nextSteps,
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.pendingAction !== undefined ? { pendingAction: body.pendingAction } : {}),
        points,
        approvedAt: new Date(),
      })
      .where(and(eq(interactions.id, draft.id), isNull(interactions.approvedAt)))
      .returning();
    return row ?? fail(E.alreadyApproved);
  } catch (error) {
    if (isUniqueViolation(error)) return fail(E.alreadyApproved);
    throw error;
  }
}

export async function approveSummary({ user, params, body }: InputOf<typeof R.approveSummary>): ResultOf<typeof R.approveSummary> {
  const { draft, event } = await requireOwnDraft(params.id, user.id);
  if (await hasApprovedSummary(draft.connectionId)) return fail(E.alreadyApproved);
  if (!draft.substantive) return fail(E.notSubstantive);
  // A note on a connection outside an event is kept but pays nothing, and no event board hears of it.
  const points = event ? SUMMARY_POINTS : 0;
  const row = await markApproved(draft, body, points);
  if (event) {
    // Off the response path: badges read every connection the author has (conference-scale finding 13).
    afterResponse("awards", async () => notify(...badgeNotices(user.id, await awardBadges(user, event, row.id))));
    await broadcast({ topic: liveTopic(event.accessCode), event: "summary.approved", payload: { connectionId: row.connectionId, topics: body.topics } });
  }
  const interaction = {
    id: row.id,
    connectionId: row.connectionId,
    summary: row.summary,
    topics: body.topics,
    nextSteps: row.nextSteps,
    title: row.title ?? undefined,
    pendingAction: row.pendingAction,
    points,
    approvedAt: (row.approvedAt ?? new Date()).toISOString(),
  };
  return { body: { interaction, pointsAwarded: points } };
}
