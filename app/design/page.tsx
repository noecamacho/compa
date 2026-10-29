import { Badge } from "@/components/badges/Badge";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { Monito } from "@/components/monito/Monito";
import { Dock } from "@/components/nav/Dock";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Tag } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar, SectionLabel, Stat, StatGrid } from "@/components/ui/Text";
import { BADGE_IDS } from "@/lib/badges/catalog";
import { GOLDEN_CAP, withDefaults } from "@/lib/monito/look";
import { SAMPLE_IDS } from "@/lib/monito/sample-people";

// Visual QA gallery for the design system; not linked from the app.
export default function DesignGallery() {
  return (
    <main className="paper-dots mx-auto flex max-w-[390px] flex-col gap-6 px-[18px] py-12">
      <h1 className="font-display text-[28px] font-bold">Sistema V2</h1>

      <section className="flex flex-col gap-3">
        <SectionLabel>Monito</SectionLabel>
        <div className="flex flex-wrap items-end gap-3">
          <Monito look={withDefaults({})} px={7} />
          <Monito look={withDefaults({ ...GOLDEN_CAP, outfit: "compa", shirt: "#FFFFFF" })} px={7} label="Gorra dorada" />
          <Monito look={withDefaults({ hair: "curly", hairColor: "#2A2438", face: "sunglasses", outfit: "suit", shirt: "#1E1B2E" })} px={7} />
          <Monito look={withDefaults({ hat: "crown", extra: "cape", outfit: "hoodie", shirt: "#FF8FAB" })} px={7} />
          <Monito look={withDefaults({ hair: "bun", hat: "beanie", extra: "badge", face: "mustache", beard: true })} px={7} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Avatar</SectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_IDS.map((id) => (
            <Avatar key={id} who={id} size={46} shadow={3} />
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {SAMPLE_IDS.map((id) => (
            <Avatar key={id} who={id} px={4} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Insignias</SectionLabel>
        <Card className="px-[14px] pt-3 pb-[10px]">
          <BadgeShelf ids={["apreton", "tresdetres", "ff2026", "madrugador", "og"]} />
        </Card>
        <div className="grid grid-cols-3 gap-3">
          {BADGE_IDS.map((id, index) => (
            <div key={id} className="flex flex-col items-center gap-1">
              <Badge id={id} size={64} state={index % 3 === 2 ? "locked" : "earned"} tilted />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge id="rey" size={120} withName />
          <Badge id="conector100" size={120} withName state="locked" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Dock</SectionLabel>
        <Dock active="home" />
        <Dock active="connect" />
        <Dock active="connections" />
        <Dock active="me" />
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Botones y chips</SectionLabel>
        <Button variant="primary">Listo, entrar</Button>
        <Button variant="secondary">Ahora no</Button>
        <Button variant="linkedin" height={56}>
          <Icon name="link" size={20} />
          Crear cuenta con LinkedIn
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Regresar">
            <Icon name="back" />
          </IconButton>
          <IconButton label="Al azar">
            <Icon name="dice" size={20} />
          </IconButton>
          <Pill tone="coral" rotate={-2}>
            <span className="h-2 w-2 rounded-full bg-white" style={{ border: "1.5px solid #1E1B2E" }} />
            EN VIVO
          </Pill>
          <Pill tone="sun" rotate={6} height={42} className="text-[20px]">
            <Icon name="bolt" size={16} />
            +50
          </Pill>
          <Pill tone="mint" rotate={5} height={24} shadow={false}>
            ▲ 1
          </Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip pressed>Levantar capital</Chip>
          <Chip>IA</Chip>
          <Chip background="#6CC4FF">Reencuentros</Chip>
          <Tag background="#DDF1FF">Proptech</Tag>
          <Tag>Serie A</Tag>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Tarjetas</SectionLabel>
        <Card>
          <StatGrid>
            <Stat value="42" label="nuevas" />
            <Stat value="16" label="reencuentros" />
            <Stat value="7" label="eventos" />
          </StatGrid>
        </Card>
        <Card tone="sun-soft" className="flex flex-col gap-2 p-4">
          <SectionLabel>Barra</SectionLabel>
          <ProgressBar value={25} label="Insignias ganadas" />
          <ProgressBar value={78} color="#FFD93D" label="Para pasar a Ximena" />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Íconos</SectionLabel>
        <div className="flex flex-wrap gap-3 text-ink">
          {(["home", "qr", "people", "user", "bell", "search", "calendar", "share", "mic", "refresh", "userPlus", "heart", "bolt", "trophy", "cap", "linkedin", "instagram", "whatsapp", "x", "pencil", "check", "plus", "close"] as const).map((name) => (
            <Icon key={name} name={name} />
          ))}
        </div>
      </section>
    </main>
  );
}
