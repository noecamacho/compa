import type { CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { Monito } from "@/components/monito/Monito";
import { Pill } from "@/components/ui/Pill";
import { SAMPLE_PEOPLE, type SampleId } from "@/lib/monito/sample-people";
import { HeroStage } from "./HeroStage";

type Spot = { who: SampleId; left: string; bottom: string; tilt: number; delay: number; flip?: boolean };

// The six monitos of the Three.js scene at its first frame (HOMES in lib/landing/hero-timeline.ts, projected by the
// scene's camera on a 16:10 box), so the cross-fade from this SVG to the canvas keeps every monito where it stands.
// Same cast order as CAST in HeroScene.tsx. Values are percentages so the crowd scales with the box.
const SPOT_WIDTH = "16.2%";
const SPOTS: Spot[] = [
  { who: "XS", left: "0%", bottom: "35%", tilt: -2, delay: 0.6 },
  { who: "DR", left: "13.9%", bottom: "27%", tilt: -3, delay: 0 },
  { who: "ST", left: "26.9%", bottom: "37.3%", tilt: 2, delay: 1.4 },
  { who: "VO", left: "40.8%", bottom: "27.6%", tilt: 3, delay: 1.1, flip: true },
  { who: "PN", left: "54.7%", bottom: "36.7%", tilt: -2, delay: 0.3, flip: true },
  { who: "CI", left: "67.7%", bottom: "28.8%", tilt: 3, delay: 1.8, flip: true },
];

const spotStyle = (spot: Spot): CSSProperties =>
  ({ left: spot.left, bottom: spot.bottom, width: SPOT_WIDTH, animationDelay: `${spot.delay}s`, "--tilt": `${spot.tilt}deg` }) as CSSProperties;

// Words the animated hero says: extra topics after `topic`, the greeting on hover, and the reconnection badge.
export type CrowdStory = { topics: readonly string[]; hello: string; reconnection: string };

type Props = { label: string; topic: string; story?: CrowdStory };

// The static crowd: server-rendered, and the fallback for reduced motion, missing WebGL and while Three.js loads.
function CrowdArt({ topic }: { topic: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute right-[4.4%] bottom-[19.2%] left-[4.4%] h-[26%] rounded-[50%] bg-[#FFFDF7]"
        style={{ border: "2.5px solid #1E1B2E", boxShadow: "5px 5px 0 #1E1B2E" }}
      />
      {SPOTS.map((spot) => (
        <span key={spot.who} aria-hidden="true" className="animate-bob absolute block origin-bottom" style={spotStyle(spot)}>
          <span className="block" style={{ transform: spot.flip ? "scaleX(-1)" : undefined, }}>
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
