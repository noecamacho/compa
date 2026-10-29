"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { Approved, Draft, type ConnectionDetailT, type DraftT } from "@/lib/api/schemas";
import { startRecording, uploadForTranscript, type Recording } from "@/lib/audio/recorder";
import { useCopy, useLocale } from "@/components/LocaleProvider";
import { errorText } from "@/lib/api/error-text";
import { formatClock } from "@/lib/format";
import { forgetNote, recallNote } from "@/lib/note-draft";
import { SUMMARY_POINTS } from "@/lib/points";
import { HIT_AREA } from "@/components/ui/hit-area";
import { TOPICS, type Topic } from "@/lib/topics";

type Summary = { interactionId: string; title: string; bullets: string[]; topics: string[]; pendingAction: string | null; seconds: number | null; approved: boolean };

type Phase = { kind: "recording"; seconds: number } | { kind: "transcribing" } | { kind: "typing"; text: string; error: string | null } | { kind: "ready"; summary: Summary };

// The draft route may run 30 s (maxDuration); give it a little more before giving up.
const DRAFT_TIMEOUT_MS = 35_000;

const WAVE = [30, 54, 76, 46, 68, 34, 58, 80, 42, 64, 28];

const isTopic = (value: string): value is Topic => (TOPICS as readonly string[]).includes(value);

// "Recordar": a calendar event with the pending action, so the follow-up leaves Compa with the person.
const reminderUrl = (action: string, other: string): string => {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", action);
  url.searchParams.set("details", `Compa · ${other}`);
  return url.toString();
};

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
  const all = useCopy();
  const copy = all.note;
  const locale = useLocale();
  const router = useRouter();
  const recording = useRef<Recording | null>(null);
  const [phase, setPhase] = useState<Phase>(() => (detail.interaction ? { kind: "ready", summary: fromInteraction(detail.interaction) } : { kind: "typing", text: "", error: null }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A failed upload keeps the recording so the person can retry instead of recording again.
  const [unsent, setUnsent] = useState<{ file: File; seconds: number } | null>(null);

  // Leaving the screen mid-recording (or while the mic prompt is open) releases the microphone.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recording.current?.cancel();
    };
  }, []);

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
      const draft = await apiCall("POST", "/api/interactions/draft", Draft, { connectionId: detail.connectionId, text }, { timeoutMs: DRAFT_TIMEOUT_MS });
      setPhase({ kind: "ready", summary: fromDraft(draft, seconds) });
    } catch (caught) {
      setPhase({ kind: "typing", text, error: errorText(all, caught) });
    }
  }

  function transcribe(audio: { file: File; seconds: number }) {
    setUnsent(null);
    setPhase({ kind: "transcribing" });
    uploadForTranscript(audio.file)
      .then(({ text }) => draftFrom(text, audio.seconds))
      .catch((caught: unknown) => {
        setUnsent(audio);
        setPhase({ kind: "typing", text: "", error: errorText(all, caught) });
      });
  }

  async function record() {
    setUnsent(null);
    try {
      let elapsed = 0;
      recording.current = await startRecording({
        onTick: (ms) => {
          elapsed = Math.round(ms / 1000);
          setPhase({ kind: "recording", seconds: elapsed });
        },
        onStop: (file) => transcribe({ file, seconds: elapsed }),
      });
      if (!mounted.current) return recording.current.cancel();
      setPhase({ kind: "recording", seconds: 0 });
    } catch {
      setPhase({ kind: "typing", text: "", error: copy.failed });
    }
  }

  async function save(summary: Summary) {
    setSaving(true);
    setError(null);
    try {
      await apiCall("POST", `/api/interactions/${summary.interactionId}/approve`, Approved, {
        summary: summary.bullets.join(" "),
        // The approve API only accepts vocabulary topics (lib/topics.ts).
        topics: summary.topics.filter(isTopic),
        nextSteps: summary.pendingAction ? [summary.pendingAction] : [],
        title: summary.title,
        pendingAction: summary.pendingAction,
      });
      forgetNote(detail.connectionId);
      router.push(`/people/${detail.other.handle}`);
    } catch (caught) {
      setError(errorText(all, caught));
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
            {recordingNow ? copy.recording(formatClock(locale, phase.seconds)) : copy.transcribing}
          </span>
          <div aria-hidden="true" className="flex h-[90px] items-center justify-center gap-[5px]">
            {WAVE.map((height, index) => (
              <span key={index} className="animate-bounce-bar block w-[7px] rounded-[4px] bg-ink" style={{ height, animationDelay: `${(index * 0.12) % 1}s` }} />
            ))}
          </div>
          <span className="text-center font-display text-[20px] leading-[1.2] font-bold">{copy.question}</span>
          <Muted className="text-center text-[14px] leading-[1.4] font-bold">{copy.hint}</Muted>
        </Card>
        <div className="mt-auto flex flex-col items-center gap-[14px] lg:mt-2">
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
          {unsent && !phase.text.trim() && (
            <Button height={46} onClick={() => transcribe(unsent)}>
              <Icon name="mic" size={16} strokeWidth={2.8} />
              {copy.retryUpload}
            </Button>
          )}
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
        <div className="mt-auto flex flex-col items-center gap-[14px] lg:mt-2">
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
              {formatClock(locale, summary.seconds)}
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
          <a
            href={reminderUrl(summary.pendingAction, detail.other.name)}
            target="_blank"
            rel="noreferrer"
            className={`${HIT_AREA} flex h-8 cursor-pointer items-center rounded-[10px] bg-white px-[10px] font-display text-[13px] font-bold whitespace-nowrap text-ink border-ink shadow-hard-2 pressable`}
          >
            {copy.remind}
          </a>
        </div>
      )}

      <div className="flex items-center gap-[10px] px-1">
        <Icon name="trophy" size={18} strokeWidth={2.4} />
        <span className="text-[13px] font-extrabold">{copy.pointsNote.replace("15", String(SUMMARY_POINTS))}</span>
      </div>

      <div className="mt-auto flex flex-col gap-3 lg:mt-2">
        {error && (
          <span role="alert" className="text-center text-[12px] font-extrabold text-coral">
            {error}
          </span>
        )}
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
