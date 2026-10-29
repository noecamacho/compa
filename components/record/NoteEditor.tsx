"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { apiCall, errorText } from "@/lib/api/client";
import { Approved, Draft, type ConnectionDetailT, type DraftT } from "@/lib/api/schemas";
import { ApiError as UploadError, RecorderError, startRecording, uploadForTranscript, type Recording } from "@/lib/audio/recorder";
import { common, note as copy } from "@/lib/copy/es";
import { formatClock } from "@/lib/format";
import { forgetNote, recallNote } from "@/lib/note-draft";
import { SUMMARY_POINTS } from "@/lib/points";
import { HIT_AREA } from "@/components/ui/hit-area";

type Summary = { interactionId: string; title: string; bullets: string[]; topics: string[]; pendingAction: string | null; seconds: number | null; approved: boolean };

type Phase = { kind: "recording"; seconds: number } | { kind: "transcribing" } | { kind: "typing"; text: string; error: string | null } | { kind: "ready"; summary: Summary };

const WAVE = [30, 54, 76, 46, 68, 34, 58, 80, 42, 64, 28];

const fromInteraction = (interaction: NonNullable<ConnectionDetailT["interaction"]>): Summary => ({
  interactionId: interaction.id,
  title: interaction.title,
  bullets: interaction.bullets.length ? interaction.bullets : [interaction.summary],
  topics: interaction.topics,
  pendingAction: interaction.pendingAction,
  seconds: interaction.durationSec,
  approved: interaction.approvedAt !== null,
});

const fromDraft = (draft: DraftT, seconds: number | null): Summary => ({
  interactionId: draft.interactionId,
  title: draft.title ?? draft.summary.split(".")[0] ?? draft.summary,
  bullets: draft.nextSteps.length ? [draft.summary, ...draft.nextSteps] : [draft.summary],
  topics: draft.topics,
  pendingAction: draft.pendingAction ?? null,
  seconds,
  approved: false,
});

type Props = { detail: ConnectionDetailT };

// 08b NotaVoz: record (or type), let Compa draft the summary, then save it to the connection (+15).
export function NoteEditor({ detail }: Props) {
  const router = useRouter();
  const recording = useRef<Recording | null>(null);
  const [phase, setPhase] = useState<Phase>(() => (detail.interaction ? { kind: "ready", summary: fromInteraction(detail.interaction) } : { kind: "typing", text: "", error: null }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A note recorded on the register screen is drafted as soon as this screen opens.
  useEffect(() => {
    if (detail.interaction) return;
    const pending = recallNote(detail.connectionId);
    if (pending) void draftFrom(pending.text, pending.seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function draftFrom(text: string, seconds: number | null) {
    setPhase({ kind: "transcribing" });
    try {
      const draft = await apiCall("POST", "/api/interactions/draft", Draft, { connectionId: detail.connectionId, text });
      setPhase({ kind: "ready", summary: fromDraft(draft, seconds) });
    } catch (caught) {
      setPhase({ kind: "typing", text, error: caught instanceof Error ? errorText(caught) : copy.failed });
    }
  }

  async function record() {
    try {
      let elapsed = 0;
      recording.current = await startRecording({
        onTick: (ms) => {
          elapsed = Math.round(ms / 1000);
          setPhase({ kind: "recording", seconds: elapsed });
        },
        onStop: (file) => {
          setPhase({ kind: "transcribing" });
          uploadForTranscript(file)
            .then(({ text }) => draftFrom(text, elapsed))
            .catch((caught: unknown) => setPhase({ kind: "typing", text: "", error: caught instanceof UploadError && caught.code === "rate_limited" ? common.rateLimited : copy.failed }));
        },
      });
      setPhase({ kind: "recording", seconds: 0 });
    } catch (caught) {
      setPhase({ kind: "typing", text: "", error: caught instanceof RecorderError ? copy.failed : String(caught) });
    }
  }

  async function save(summary: Summary) {
    setSaving(true);
    setError(null);
    try {
      await apiCall("POST", `/api/interactions/${summary.interactionId}/approve`, Approved, {
        summary: summary.bullets.join(" "),
        topics: [],
        nextSteps: summary.pendingAction ? [summary.pendingAction] : [],
        title: summary.title,
        pendingAction: summary.pendingAction,
      });
      forgetNote(detail.connectionId);
      router.push(`/people/${detail.other.handle}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaving(false);
    }
  }

  if (phase.kind === "recording" || phase.kind === "transcribing") {
    const recordingNow = phase.kind === "recording";
    return (
      <div key="recording" className="animate-fade-in flex flex-1 flex-col gap-4">
        <Card tone="coral-soft" className="flex h-[486px] flex-col items-center gap-[14px] px-5 py-6">
          <span className="inline-flex h-[30px] items-center gap-2 rounded-[10px] bg-coral px-3 font-display text-[13px] font-bold border-ink">
            <span className="animate-blink h-[9px] w-[9px] rounded-full bg-white" style={{ border: "1.5px solid #1E1B2E" }} />
            {recordingNow ? copy.recording(formatClock(phase.seconds)) : copy.transcribing}
          </span>
          <div aria-hidden="true" className="flex h-[90px] items-center justify-center gap-[5px]">
            {WAVE.map((height, index) => (
              <span key={index} className="animate-bounce-bar block w-[7px] rounded-[4px] bg-ink" style={{ height, animationDelay: `${(index * 0.12) % 1}s` }} />
            ))}
          </div>
          <span className="text-center font-display text-[20px] leading-[1.2] font-bold">{copy.question}</span>
          <Muted className="text-center text-[14px] leading-[1.4] font-bold">{copy.hint}</Muted>
        </Card>
        <div className="mt-auto flex flex-col items-center gap-[14px]">
          <button
            type="button"
            aria-label={copy.stop}
            disabled={!recordingNow}
            onClick={() => recording.current?.stop()}
            className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-full bg-coral p-0 shadow-hard-4 pressable disabled:cursor-default disabled:opacity-60"
            style={{ border: "3px solid #1E1B2E" }}
          >
            <span className="block h-[30px] w-[30px] rounded-[7px] bg-ink" />
          </button>
          <Muted className="text-[13px] font-extrabold">{copy.tapToStop}</Muted>
        </div>
      </div>
    );
  }

  if (phase.kind === "typing") {
    return (
      <div key="typing" className="animate-fade-in flex flex-1 flex-col gap-4">
        <Card className="flex flex-col gap-3 p-4">
          <SectionLabel>{copy.question}</SectionLabel>
          {phase.error && <Muted className="text-[12px] font-extrabold">{phase.error}</Muted>}
          <textarea
            value={phase.text}
            onChange={(event) => setPhase({ ...phase, text: event.target.value })}
            placeholder={copy.notePlaceholder}
            rows={5}
            className="box-border w-full rounded-[12px] bg-white p-3 font-body text-[14px] font-bold text-ink outline-none border-ink transition-shadow duration-200 focus:shadow-[0_0_0_4px_#6BE4A3]"
          />
          <Button variant="primary" height={46} disabled={!phase.text.trim()} onClick={() => draftFrom(phase.text, null)}>
            {copy.draftButton}
          </Button>
        </Card>
        <div className="mt-auto flex flex-col items-center gap-[14px]">
          <button type="button" aria-label={copy.rerecord} onClick={record} className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-full bg-coral p-0 shadow-hard-4 pressable" style={{ border: "3px solid #1E1B2E" }}>
            <Icon name="mic" size={34} />
          </button>
          <Muted className="text-[13px] font-extrabold">{copy.hint}</Muted>
        </div>
      </div>
    );
  }

  const { summary } = phase;
  return (
    <div key="ready" className="animate-fade-in flex flex-1 flex-col gap-[14px]">
      <Card className="flex flex-col gap-3 p-4">
        <span className="flex items-center justify-between">
          <SectionLabel>{copy.understood}</SectionLabel>
          {summary.seconds !== null && (
            <span className="inline-flex h-6 items-center rounded-[8px] bg-mint-soft px-2 text-[11px] font-extrabold" style={{ border: "2px solid #1E1B2E", transform: "rotate(3deg)" }}>
              {formatClock(summary.seconds)}
            </span>
          )}
        </span>
        <span className="font-display text-[19px] leading-[1.2] font-bold">{summary.title}</span>
        <div className="flex flex-col gap-2">
          {summary.bullets.map((bullet) => (
            <span key={bullet} className="flex gap-[10px] text-[14px] leading-[1.35] font-bold">
              <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-mint-soft" style={{ border: "2px solid #1E1B2E" }}>
                <Icon name="check" size={11} strokeWidth={3.5} />
              </span>
              {bullet}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.topics.map((topic, index) => (
            <Tag key={topic} background={index < 2 ? "#DDF1FF" : "#FFFFFF"}>
              {topic}
            </Tag>
          ))}
        </div>
      </Card>

      {summary.pendingAction && (
        <div className="flex items-center gap-3 rounded-[18px] bg-sun-soft px-[14px] py-3 border-ink shadow-hard-3">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-chip bg-sun border-ink" style={{ transform: "rotate(-5deg)" }}>
            <Icon name="calendar" size={18} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <SectionLabel>{copy.pendingLabel}</SectionLabel>
            <span className="text-[14px] font-extrabold">{summary.pendingAction}</span>
          </span>
          <button type="button" className={`${HIT_AREA} h-8 cursor-pointer rounded-[10px] bg-white px-[10px] font-display text-[13px] font-bold whitespace-nowrap text-ink border-ink shadow-hard-2 pressable`}>
            {copy.remind}
          </button>
        </div>
      )}

      <div className="flex items-center gap-[10px] px-1">
        <Icon name="trophy" size={18} strokeWidth={2.4} />
        <span className="text-[13px] font-extrabold">{copy.pointsNote.replace("15", String(SUMMARY_POINTS))}</span>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {error && <span className="text-center text-[12px] font-extrabold text-coral">{error}</span>}
        {summary.approved ? (
          <Button variant="primary" onClick={() => router.push(`/people/${detail.other.handle}`)}>
            {copy.save}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => save(summary)} disabled={saving}>
            {saving ? copy.saving : copy.save}
          </Button>
        )}
        <div className="flex gap-3">
          <Button height={46} className="text-[15px]" onClick={record}>
            <Icon name="mic" size={16} strokeWidth={2.8} />
            {copy.rerecord}
          </Button>
          <Button height={46} className="text-[15px]" onClick={() => setPhase({ kind: "typing", text: summary.bullets.join(" "), error: null })}>
            <Icon name="pencil" size={16} strokeWidth={2.8} />
            {copy.edit}
          </Button>
        </div>
      </div>
    </div>
  );
}
