"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Muted } from "@/components/ui/Text";
import { RecorderError, startRecording, uploadForTranscript, type Recording } from "@/lib/audio/recorder";
import { register as copy } from "@/lib/copy/es";
import { formatClock } from "@/lib/format";

export type NoteState =
  | { status: "idle"; error?: string }
  | { status: "recording"; seconds: number }
  | { status: "transcribing"; seconds: number }
  | { status: "ready"; seconds: number; text: string };

const WAVE = [10, 18, 22, 14, 20, 12, 18, 22];

type Props = { state: NoteState; onChange: (state: NoteState) => void };

// The three note states of V2Registrar: not recorded / recording / saved. Audio goes to /api/transcribe.
export function VoiceNoteButton({ state, onChange }: Props) {
  const recording = useRef<Recording | null>(null);
  const [seconds, setSeconds] = useState(0);

  async function start() {
    try {
      let elapsed = 0;
      recording.current = await startRecording({
        onTick: (ms) => {
          elapsed = Math.round(ms / 1000);
          setSeconds(elapsed);
          onChange({ status: "recording", seconds: elapsed });
        },
        onStop: (file) => {
          onChange({ status: "transcribing", seconds: elapsed });
          uploadForTranscript(file)
            .then(({ text }) => onChange({ status: "ready", seconds: elapsed, text }))
            .catch(() => onChange({ status: "idle", error: copy.micUnavailable }));
        },
      });
      onChange({ status: "recording", seconds: 0 });
    } catch (error) {
      onChange({ status: "idle", error: error instanceof RecorderError ? copy.micUnavailable : String(error) });
    }
  }

  const stop = () => recording.current?.stop();

  if (state.status === "recording" || state.status === "transcribing") {
    return (
      <button
        key="recording"
        type="button"
        onClick={stop}
        className="animate-fade-in flex w-full cursor-pointer items-center gap-3 rounded-[18px] bg-coral-soft px-[14px] py-[10px] text-left font-body text-ink border-ink shadow-hard-3 pressable"
      >
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral border-ink">
          <span className="block h-4 w-4 rounded-[4px] bg-ink" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[14px] font-extrabold">{copy.recording(formatClock(seconds))}</span>
          <span aria-hidden="true" className="flex h-[22px] items-center gap-1">
            {WAVE.map((height, index) => (
              <span key={index} className="animate-bounce-bar block w-[5px] rounded-[3px] bg-ink" style={{ height, animationDelay: `${index * 0.12}s` }} />
            ))}
          </span>
        </span>
        <Muted className="text-[12px] font-extrabold">{copy.tapToStop}</Muted>
      </button>
    );
  }

  if (state.status === "ready") {
    return (
      <div key="ready" className="animate-fade-in flex items-center gap-3 rounded-[18px] bg-mint-soft px-[14px] py-[10px] border-ink shadow-hard-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint border-ink">
          <Icon name="check" size={18} strokeWidth={3} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
          <span className="text-[14px] font-extrabold">{copy.noteSaved(formatClock(state.seconds))}</span>
          <Muted className="text-[12px] font-bold">{copy.noteSavedHint}</Muted>
        </span>
        <button
          type="button"
          onClick={start}
          className="h-[30px] cursor-pointer rounded-[10px] bg-white px-[10px] font-display text-[12px] font-bold text-ink border-ink tappable"
        >
          {copy.rerecord}
        </button>
      </div>
    );
  }

  return (
    <div key="idle" className="animate-fade-in flex flex-col gap-1">
      <button
        type="button"
        onClick={start}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[18px] bg-white px-[14px] py-[10px] text-left font-body text-ink border-ink shadow-hard-3 pressable"
      >
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral border-ink">
          <Icon name="mic" size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
          <span className="text-[14px] font-extrabold">{copy.noteTitle}</span>
          <Muted className="text-[12px] font-bold">{copy.noteHint}</Muted>
        </span>
      </button>
      {state.error && <Muted className="text-[12px] font-extrabold">{state.error}</Muted>}
    </div>
  );
}
