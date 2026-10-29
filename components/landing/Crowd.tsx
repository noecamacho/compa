import type { CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { Monito } from "@/components/monito/Monito";
import { Pill } from "@/components/ui/Pill";
import { SAMPLE_PEOPLE, type SampleId } from "@/lib/monito/sample-people";
import { HeroStage } from "./HeroStage";

type Spot = { who: SampleId; left: string; width: string; tilt: number; delay: number; flip?: boolean; back?: boolean };

// Five monitos at an event; the two in the middle just connected. Positions are percentages so the scene scales.
const SPOTS: Spot[] = [
  { who: "XS", left: "2%", width: "17%", tilt: -3, delay: 0.6, back: true },
  { who: "DR", left: "21%", width: "22%", tilt: -4, delay: 0 },
  { who: "VO", left: "57%", width: "22%", tilt: 4, delay: 1.1, flip: true },
  { who: "CI", left: "81%", width: "17%", tilt: 3, delay: 1.8, back: true },
];

const spotStyle = (spot: Spot): CSSProperties =>
  ({ left: spot.left, width: spot.width, animationDelay: `${spot.delay}s`, "--tilt": `${spot.tilt}deg` }) as CSSProperties;

// Words the animated hero says: extra topics after `topic`, the greeting on hover, and the reconnection badge.
export type CrowdStory = { topics: readonly string[]; hello: string; reconnection: string };

type Props = { label: string; topic: string; story?: CrowdStory };

// The static crowd: server-rendered, and the fallback for reduced motion, missing WebGL and while Three.js loads.
function CrowdArt({ topic }: { topic: string }) {
  return (
    <>
      <span className="absolute right-[4%] bottom-[9%] left-[4%] h-[2.5px] rounded-full bg-ink opacity-80" />
      <span className="absolute top-[42%] right-[36%] left-[36%]" style={{ borderTop: "3px dashed #1E1B2E" }} />
      {SPOTS.map((spot) => (
        <span key={spot.who} aria-hidden="true" className="animate-bob absolute bottom-[9%] block origin-bottom" style={spotStyle(spot)}>
          <span className="block" style={{ transform: spot.flip ? "scaleX(-1)" : undefined, opacity: spot.back ? 0.92 : 1 }}>
            <Monito look={SAMPLE_PEOPLE[spot.who].look} label={SAMPLE_PEOPLE[spot.who].name} className="h-auto w-full" />
          </span>
        </span>
      ))}
      <span aria-hidden="true" className="animate-thread absolute top-[18%] left-1/2" style={{ transform: "translate(-50%, 0) rotate(6deg)" }}>
        <Pill tone="sun" height={40} className="rounded-[12px] px-[14px] text-[20px] shadow-hard-3">
          <Icon name="bolt" size={16} />
          +50
        </Pill>
      </span>
      <span aria-hidden="true" className="absolute bottom-0 left-1/2" style={{ transform: "translate(-50%, 40%) rotate(-3deg)" }}>
        <Pill kind="text" height={32} className="rounded-[12px] px-3">
          {topic}
        </Pill>
      </span>
    </>
  );
}

// The landing hero. With `story`, a Three.js vignette (components/landing/HeroScene.tsx) plays over the same box.
export function Crowd({ label, topic, story }: Props) {
  return (
    <div role="img" aria-label={label} className="relative mx-auto aspect-[16/10] w-full max-w-[560px]">
      {story ? (
        <HeroStage story={{ topics: [topic, ...story.topics], hello: story.hello, reconnection: story.reconnection }}>
          <CrowdArt topic={topic} />
        </HeroStage>
      ) : (
        <CrowdArt topic={topic} />
      )}
    </div>
  );
}
