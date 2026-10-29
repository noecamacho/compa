# Hyperframes composition brief: 01-problem

Objective: Conoces gente. Luego… ¿quién era quién? Deliver 20 seconds, landscape 1920×1080, H.264, local render only.

Source material: README.md, DESIGN.md, app/globals.css, lib/points.ts, original mock audit screenshots under docs/research/ux-audit-parts, public test event capture docs/evidence/codex/live-test-event.png. No real JSConf data.

Creative contract: [brag-plan.md](brag-plan.md). Preserve actual UI, bilingual captions, clear mock-data labeling, readable holds and the brand's cream/pastel/ink palette. The busy network research scene must be labeled as prototype, never claimed as production footage.

Implementation: three editable Hyperframes sub-compositions with paused GSAP timelines, local runtime/media, seek-safe transforms, one card/phone stage per product moment. Device stage informed by registry browser-device-stage. No generated human testimonials or invented usage metrics. No CSS filters or autonomous playback loops.

Audio: local 20-second music excerpt, licensed in ../ASSET-LICENSES.md, subtle CC0 click and impact; no voice. Cue 17.02 s anchors CTA emphasis. Audio-reactive helper unavailable (numpy missing), documented omission.

Gate: Hyperframes check including text contrast and layout; decode output, verify duration, inspect representative frames, bake poster at frame zero. No app code or database writes. Full application e2e suites deliberately not rerun under the dispatch's resource constraint.
