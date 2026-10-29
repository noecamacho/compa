import { notFound } from "next/navigation";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { NoteEditor } from "@/components/record/NoteEditor";
import { Header } from "@/components/ui/Header";
import { Screen } from "@/components/ui/Screen";
import { Muted } from "@/components/ui/Text";
import { ConnectionDetail } from "@/lib/api/schemas";
import { apiGetOrNull } from "@/lib/api/server-fetch";
import { requestCopy } from "@/lib/server/locale";
import { timeAgo } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

// 08b NotaVoz: the voice note of one connection, drafted by Compa.
export default async function NotePage({ params }: Props) {
  const { locale, copy: all } = await requestCopy();
  const { connections, note: copy } = all;
  const { id } = await params;
  const detail = await apiGetOrNull(`/api/connections/${id}`, ConnectionDetail);
  if (!detail) notFound();
  const kind = detail.kind === "reconnection" ? connections.types.reconnection : connections.types.new;
  return (
    <Screen gap={16} width="focus">
      <Header back={`/people/${detail.other.handle}`} title={copy.title} />
      <div className="flex items-center gap-3">
        <Avatar person={avatarOf(detail.other)} size={46} />
        <span className="flex flex-col">
          <span className="font-display text-[17px] leading-[1.2] font-bold">{detail.other.name}</span>
          <Muted className="text-[13px] font-bold">{copy.reconnectionAgo(kind, timeAgo(locale, detail.at))}</Muted>
        </span>
      </div>
      <NoteEditor detail={detail} />
    </Screen>
  );
}
