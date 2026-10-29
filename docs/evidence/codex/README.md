# Built with Codex

Five bilingual COMPA marketing edits, authored with **GPT-6.1-Sol / high reasoning**, Brag **full** workflow and Hyperframes. Each edit is 20 seconds at 1920×1080, with Spanish and English copy, local music, sound effects and a custom poster.

| Edit | Focus | Video | Share caption |
| --- | --- | --- | --- |
| 01 | The conference networking problem | [Watch](01-problem/brag.mp4) | [Copy](01-problem/share-copy.txt) |
| 02 | QR → request → connection | [Watch](02-qr-solution/brag.mp4) | [Copy](02-qr-solution/share-copy.txt) |
| 03 | A staged attendee event journey | [Watch](03-event-journey/brag.mp4) | [Copy](03-event-journey/share-copy.txt) |
| 04 | Live board and busy network research | [Watch](04-live-bigscreen/brag.mp4) | [Copy](04-live-bigscreen/share-copy.txt) |
| 05 | Organizer console and event QR poster | [Watch](05-organizer/brag.mp4) | [Copy](05-organizer/share-copy.txt) |

All people and figures in the showcase are mock/test examples. The busy network in edit 04 is explicitly labeled as a research prototype. No real JSConf event is featured. Each edit's `composition/` folder contains editable source; its plan and composition brief document timing and claims.

Codex evidence: [launch process](codex-launch-process.txt), [session capture](codex-session-capture.txt). Firstmate captured these from the actual worker session; paths were removed. A header screenshot was unavailable and the text substitute was explicitly authorized.

See [source material and limitations](SOURCE-MATERIAL.md), [asset credits](ASSET-LICENSES.md), and [verification](verification.md). Keep the music attribution when reposting: **Music: Sascha Ende, ende.app (CC BY 4.0)**.

## Re-render

Install FFmpeg and use Node.js 22+. From an edit's `composition/` folder:

```sh
npx hyperframes@0.8.216 check --json
npx hyperframes@0.8.216 render --workers 1 --quality delivery --output ../brag.mp4
```

Hyperframes's full local pipeline was used for all delivered cuts. No Brag Slim fallback was needed. The local preview can be opened with `npx hyperframes@0.8.216 preview`; it remains editable in the HyperFrames desktop app.
