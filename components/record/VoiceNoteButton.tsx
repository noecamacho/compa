"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { HIT_AREA } from "@/components/ui/hit-area";
import { Muted } from "@/components/ui/Text";
import { startRecording, uploadForTranscript, type Recording } from "@/lib/audio/recorder";
import { useCopy, useLocale } from "@/components/LocaleProvider";
import { errorText } from "@/lib/api/error-text";
import { formatClock } from "@/lib/format";

export type NoteState =
  | { status: "idle"; error?: string }
  | { status: "recording"; seconds: number }
  | { status: "transcribing"; seconds: number }
  | { status: "ready"; seconds: number; text: string };

const WAVE = [10, 18, 22, 14, 20, 12, 18, 22];

type Props = { state: NoteState; onChange: (state: NoteState) => void };

type Audio = { file: File; seconds: number };

// The three note states of V2Registrar: not recorded / recording / saved. Audio goes to /api/transcribe.
export function VoiceNoteButton({ state, onChange }: Props) {
  const all = useCopy();
  const copy = all.register;
  const locale = useLocale();
  const recording = useRef<Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  // A failed upload keeps the recording so the person can retry instead of recording again.
  const [unsent, setUnsent] = useState<Audio | null>(null);

  // Leaving the screen mid-recording (or while the mic prompt is open) releases the microphone.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recording.current?.cancel();
    };
  }, []);

  function transcribe(audio: Audio) {
    setUnsent(null);
    onChange({ status: "transcribing", seconds: audio.seconds });
    uploadForTranscript(audio.file)
      .then(({ text }) => onChange({ status: "ready", seconds: audio.seconds, text }))
      .catch((error: unknown) => {
        setUnsent(audio);
        onChange({ status: "idle", error: errorText(all, error) });
      });
  }

  async function start() {
    setUnsent(null);
    try {
      let elapsed = 0;
      recording.current = await startRecording({
        onTick: (ms) => {
          elapsed = Math.round(ms / 1000);
          setSeconds(elapsed);
          onChange({ status: "recording", seconds: elapsed });
        },
        onStop: (file) => transcribe({ file, seconds: elapsed }),
      });
      if (!mounted.current) return recording.current.cancel();
      onChange({ status: "recording", seconds: 0 });
    } catch {
      onChange({ status: "idle", error: copy.micUnavailable });
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
          <span className="text-[14px] font-extrabold">{copy.recording(formatClock(locale, seconds))}</span>
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
          <span className="text-[14px] font-extrabold">{copy.noteSaved(formatClock(locale, state.seconds))}</span>
          <Muted className="text-[12px] font-bold">{copy.noteSavedHint}</Muted>
        </span>
        <button
          type="button"
          onClick={start}
          className={`${HIT_AREA} h-[30px] cursor-pointer rounded-[10px] bg-white px-[10px] font-display text-[12px] font-bold text-ink border-ink tappable`}
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
      {unsent && (
        <button
          type="button"
          onClick={() => transcribe(unsent)}
          className="h-[34px] cursor-pointer self-start rounded-[10px] bg-white px-3 font-display text-[13px] font-bold text-ink border-ink shadow-hard-2 pressable"
        >
          {copy.retryUpload}
        </button>
      )}
    </div>
  );
}
