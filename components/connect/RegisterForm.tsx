"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { VoiceNoteButton, type NoteState } from "@/components/record/VoiceNoteButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Muted, SectionLabel } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { ConnectionRequest, type UserProfileT } from "@/lib/api/schemas";
import { register as copy } from "@/lib/copy/es";
import { CONNECTION_POINTS, SUMMARY_POINTS, TOPICS_POINTS } from "@/lib/points";
import { rememberNote } from "@/lib/note-draft";

type Kind = "new" | "reconnection";

const KIND: Record<Kind, { label: string; points: number; color: string; icon: IconName }> = {
  new: { label: copy.newType, points: CONNECTION_POINTS.new, color: "#6BE4A3", icon: "userPlus" },
  reconnection: { label: copy.reconnectionType, points: CONNECTION_POINTS.reconnection, color: "#6CC4FF", icon: "refresh" },
};

const MAX_TOPICS = 3;

type Props = { profile: UserProfileT };

// 05 Registrar: kind, topics (+5), optional voice note (+15), then the request is sent (two-step connection).
export function RegisterForm({ profile }: Props) {
  const router = useRouter();
  const person = profile.card;
  const knew = profile.connection?.status === "accepted" || profile.connection?.kind === "reconnection";
  const [kind, setKind] = useState<Kind>(knew ? "reconnection" : "new");
  const [topics, setTopics] = useState<string[]>([]);
  const [note, setNote] = useState<NoteState>({ status: "idle" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = KIND[kind].points + (topics.length ? TOPICS_POINTS : 0) + (note.status === "ready" ? SUMMARY_POINTS : 0);

  const toggleTopic = (topic: string) => {
    if (topics.includes(topic)) return setTopics(topics.filter((item) => item !== topic));
    if (topics.length < MAX_TOPICS) setTopics([...topics, topic]);
  };

  async function confirm() {
    setSending(true);
    setError(null);
    try {
      const result = await apiCall("POST", "/api/connections", ConnectionRequest, {
        toHandle: person.handle,
        knew: kind === "reconnection",
        screenConsent: true,
        topics,
      });
      if (note.status === "ready") rememberNote(result.connectionId, note);
      router.push(`/connections/${result.connectionId}/done`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSending(false);
    }
  }

  return (
    <Screen gap={16}>
      <Header back="/connect?tab=scan" title={copy.title} />
      <Card className="flex items-center gap-[14px] px-[14px] py-3">
        <Avatar person={{ name: person.name, look: person.avatar }} size={56} />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="font-display text-[19px] leading-[1.15] font-bold">{person.name}</span>
          <Muted className="text-[13px] font-bold">{[person.headline, person.company, person.city?.split(",")[0]].filter(Boolean).join(" · ")}</Muted>
        </span>
        {knew && (
          <Pill tone="sky-soft" kind="text" height={28} shadow={false} className="rounded-[9px] px-[9px] text-[11px]" style={{ borderWidth: 2 }}>
            <Icon name="refresh" size={12} strokeWidth={2.8} />
            {copy.alreadyKnew}
          </Pill>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <SectionLabel>{copy.typeLabel}</SectionLabel>
        <div role="group" aria-label={copy.typeLabel} className="grid grid-cols-2 gap-[10px]">
          {(Object.keys(KIND) as Kind[]).map((option) => {
            const on = option === kind;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => setKind(option)}
                className="flex h-[86px] cursor-pointer flex-col items-start justify-between rounded-button p-[10px] text-left font-body text-ink border-ink"
                style={{ background: on ? KIND[option].color : "#FFFFFF", boxShadow: on ? "3px 3px 0 #1E1B2E" : "2px 2px 0 #1E1B2E" }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white" style={{ border: "2px solid #1E1B2E" }}>
                  <Icon name={KIND[option].icon} size={14} strokeWidth={2.8} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-extrabold">{KIND[option].label}</span>
                  <span className="text-[12px] font-bold">+{KIND[option].points} pts</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{copy.topicsLabel}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {copy.topics.map((topic) => (
            <Chip key={topic} pressed={topics.includes(topic)} onClick={() => toggleTopic(topic)}>
              {topic}
            </Chip>
          ))}
        </div>
      </div>

      <VoiceNoteButton state={note} onChange={setNote} />

      <div className="mt-auto flex flex-col gap-[10px]">
        {/* Confirming checks the scanner in, which records `screenConsent`; the notice must be visible first (M13). */}
        <Muted className="text-center text-[12px] font-bold">{copy.screenNotice}</Muted>
        {error && <span className="text-center text-[12px] font-extrabold text-coral">{error}</span>}
        <Button variant="primary" onClick={confirm} disabled={sending}>
          {sending ? copy.sending : copy.confirm(total)}
        </Button>
      </div>
    </Screen>
  );
}
