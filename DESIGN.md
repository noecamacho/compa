# COMPA — product and UX design

The attendee app follows the **V2 design handoff** in [`design/compa-v2/`](design/compa-v2/README.md) (README in Spanish, 16 screen mocks in `pantallas/*.dc.html`, 4 components in `componentes/*.dc.html`). That handoff is the source of truth for screens, copy, states and navigation. Backend behavior comes from the approved specs: [data model](docs/specs/2026-10-29-data-model.md) (decisions M1–M18) and [API](docs/specs/2026-10-29-api.md) (A1–A9). Where the two disagree, this page records the conflict and links the open question. It does not pick a side. The detailed comparison against the code is in [docs/backend-gap-analysis.md](docs/backend-gap-analysis.md).

Citations: "README §X" is a section of `design/compa-v2/README.md`, a file name such as `V2Registrar` is a screen mock, and M*/A* are spec decision ids.

## Principles

1. **Connect at the event, remember it afterwards.** The app's tagline is "Conecta en el evento. Recuérdalo después." (`V2Bienvenida`, `app/layout.tsx`). There are three steps: scan, keep their networks and the topic, and earn points and clothes for your monito (`V2Bienvenida`).
2. **Connecting takes two steps and needs consent.** A scans B and registers the connection, B accepts, and only then do they see each other's networks (README "Reglas de negocio"; M6, A3, A4).
3. **LinkedIn is the only sign-in, and COMPA never posts for you.** "Tomamos tu nombre, puesto, empresa y ciudad. Nunca publicamos nada por ti." (`V2Bienvenida`; M2).
4. **Few options on purpose; the rest is earned.** The monito builder exposes five controls, and clothes and badges come from connecting (`V2Monito`, README "Monito").
5. **The server decides and the UI shows.** Points, kind (new vs reconnection) and visibility are computed on the server (M3, M4, M12; `AGENTS.md` §4). The UI never shows a point total as final until the server returns it.
6. **Playful and physical.** The style uses paper with dots, thick ink borders, hard shadows without blur, Fredoka numbers and bouncy motion, and every animation respects reduced motion (README "Sistema visual").
7. **Mobile first.** Mocks are 390×844 (iPhone). Test at 375 px. The big screen is 1920×1080 (`AGENTS.md` §4).

Stack: the README suggests Expo + React Native. The repository builds a **Next.js App Router web app** instead (ARCHITECTURE ADR-001; the components are already ported to React/SVG in `components/`). The mocks are layout and copy references, not code to run (README "Cómo leer este paquete").

## Screens

The README "Flujo" lists 16 screens plus the dock. The routes are **built** under `app/(app)/` (PR #14, see [wiki/screens](wiki/screens/README.md)); screens under `app/(app)/` require a session. Pages read the API over HTTP and validate responses with zod (`lib/api/server-fetch.ts`, `lib/api/client.ts`), so in mock mode (`API_MODE=mock`) every screen renders. Several screens depend on routes that answer 501 outside mock mode; which ones is in the gap analysis. API routes are the ones in `lib/api/routes.ts`. The data each screen needs and its gaps are in the [gap analysis](docs/backend-gap-analysis.md).

| # | Mock | Route | Purpose | Key components | Data needed (API) | Navigation (mock `href`s) |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Landing (replaces `V2Bienvenida`, API spec A10) | `/` | One promise, idle monitos, "you get in only by scanning your event's QR"; no sign-up or sign-in; checked-in people get "Back to my event" | `Logo`, `Crowd`, `ButtonLink` | `GET /api/me` (only when signed in) | Back to my event → 03 |
| 02 | `V2Perfil` | `/onboarding/profile` (`?from=me` to edit) | LinkedIn data prefilled and editable (name, job title, company, city); network toggles; "Paso 1 de 2" | `Field`, `IconButton` (network toggles), `Button` | `GET /api/me`, `PATCH /api/me`, `PATCH /api/me/visibility` | back → 01; Siguiente → 02b |
| 02b | `V2Monito` | `/onboarding/monito` (`?from=me` to change) | Monito builder: body Hombre/Mujer/Otro (Mujer draws a skirt; team decision beyond the handoff), 5 skins, 4 hair styles, 4 hair colors, 6 shirts, extras cap/glasses/beard, random. Required: the (app) layout sends anyone without a saved look here first (`?next=`) | `Monito`, `Chip`, `lib/monito/look.ts` builder helpers | storage for the look (missing, see gap analysis) | back → 02; Listo, entrar → 03 |
| 03 | `V2Inicio` | `/home` | Greeting, bell with count, LIVE card (event, end time, connection count, animated pairs), my rank and points with delta, Conectar, Invite 3 friends card | `Avatar`, `Card`, `Pill`, `Stat`, `Dock` | `GET /api/me` (current event code), `GET /api/e/{code}`, `GET /api/e/{code}/live`, `GET /api/e/{code}/leaderboard`, `GET /api/connections` (incoming count) | avatar → 09; rank → 11; Conectar → 04; Invitar → 12 |
| 03b | `V2InicioVacio` | `/home` (0 connections) | Same Home on the first night: "Tu primera conexión te mete al ranking +50", sticker "Empieza aquí" on Conectar, "faltan 3" | as 03 | as 03 | rank card and Conectar → 04; Invitar → 12 |
| 04 | `V2Conectar` | `/connect` (`?tab=scan`) | Tabs Mi QR (name + 274 px QR) / Escanear (camera viewfinder, detected person with Conectar, name search fallback); chip Invitar | `Segmented`, `Avatar`, `Button`, `Field`, `Dock` | `GET /api/me` (handle → QR `https://<domain>/u/<handle>`, A8), `GET /api/users/{handle}`, name search (missing) | Invitar → 12; Conectar → 05 |
| 05 | `V2Registrar` | `/connect/[handle]` (reached from the scanner and from `/u/[handle]`) | Person card, "Ya se conocían" tag, kind (Nueva +50 / Reencuentro +20), "¿De qué hablaron?" chips (+5), optional voice note in the states not recorded / recording / saved (+15), Confirmar · +N pts | `Avatar`, `Card`, `Chip`, `Button`, `lib/audio/recorder.ts` | `GET /api/users/{handle}`, `POST /api/connections` (`knew`, `screenConsent`), `POST /api/transcribe` | back → 04; Confirmar → 06 |
| 06 | `V2Confirmacion` | `/connections/[id]/done` | Two monitos, big +pts with pop, title, breakdown; "De qué platicaron" (chips + AI summary); "Conecta con [persona]" with their networks as icon buttons; Listo | `Avatar`, `Pill` (`animate-pop`), `Tag`, `IconLink`, `Button` | accept result or `request.accepted`, `POST /api/interactions/draft`, the unlocked `Card.links` | summary → 08b; Listo → 03 |
| 06b | `V2Solicitud` | `/requests/[id]` | What the scanned person sees: who, rank, 3 numbers (in common, connections, events), people in common, interests, "Al aceptar, los dos ganan +20 pts", Aceptar / Ahora no | `Avatar`, `Card`, `Stat`, `Tag`, `Button` | `GET /api/connections` (`incoming`), `POST /api/connections/{id}/accept` / `decline`, Realtime `request.received` | Aceptar → 06; Ahora no → 03 |
| 07 | `V2Conexiones` | `/connections` | List of connections with a kind filter (Todas / Nueva / Reencuentro / Amigo) and an event chip | `Chip`, `Avatar`, `Card`, `Dock` | `GET /api/connections` (`people[]`, `incoming[]`) | row → 08 |
| 08 | `V2PerfilOtro` | `/people/[handle]` | A connected person: monito, name, job title, city, points and rank, shelf of 5 badges, relation numbers (reconnections, events together, in common), "La última vez", connections in common | `Avatar`, `BadgeShelf`, `Stat`, `Card` | `GET /api/users/{handle}`, `GET /api/connections` (meetings), summary read (missing) | back → 07; last time → 08b; badges → 10; points → 11 |
| 08b | `V2NotaVoz` | `/connections/[id]/note` | Note detail: recording state; "Lo que Compa entendió" (one-line title, 3 points, chips, detected follow-up with "Recordar", +15); Guardar / Regrabar / Editar | `Card`, `Tag`, `Button`, recorder | `POST /api/transcribe`, `POST /api/interactions/draft`, `POST /api/interactions/{id}/approve` | Guardar → 08 |
| 09 | `V2MiPerfil` | `/me` | My monito (tap to change), name, job title, city, points and rank; badge shelf; numbers (new, reconnections, events); 4 network toggles with handle or "oculto"; links to Ranking and Mi monito; QR and edit at the top | `Avatar`, `BadgeShelf`, `StatGrid`, `IconButton`, `Card`, `Dock` | `GET /api/me`, `PATCH /api/me/visibility`, `GET /api/connections` (totals) | monito → 02b; badges → 10; Ranking → 11; edit → 02; QR → 04 |
| 10 | `V2Insignias` | `/me/badges` (`?of=[handle]` for others) | The 20 badges with a filter Todas / Ganadas / Por ganar, progress bar, "N a punto · N secretas", secrets without hints | `Badge` (`earned` / `locked`), `ProgressBar`, `Chip` | badge state per user (missing) | back → 09 |
| 11 | `V2Ranking` | `/ranking` (in-page toggle) | Podium of 3 with confetti, scope toggle Esta noche / Todo el año, "Tú" card with the gap to the next person, the row above you, Conectar ahora | `Avatar`, `Segmented`, `ProgressBar`, `Card` | `GET /api/e/{code}/leaderboard`; all-year ranking (missing) | people → 08; back → 03; Conectar ahora → 04 |
| 12 | `V2Invitar` | `/invite` | Reward (golden cap for 3 friends), 4 progress slots, invite link with Copiar, share to WhatsApp / Instagram / Más, Mostrar mi QR de invitación | `Monito` (`GOLDEN_CAP`), `Avatar`, `Button` | invites (missing) | back → 03; QR → 04 |
| — | `DockV2` | layout of 03, 03b, 04, 07, 09 | Pill of 327×66 with Inicio, Conectar, Conexiones and Perfil; the color "drop" travels to the active tab (sky, mint, gum, sun) | `Dock`, `Screen dock` | — | `/home`, `/connect`, `/connections`, `/me` |

Surfaces that the specs require but the handoff does not draw:

| Surface | Route | Source | Notes |
| --- | --- | --- | --- |
| Personal QR landing | `/u/[handle]` (built: redirects to `/connect/[handle]`) | A1, A8 | The phone's native camera opens this URL. Signed in: straight to 05. Signed out it should go LinkedIn → check-in notice → 05, but today the session guard sends it to `/` and the handle is lost |
| Event door and check-in | `/e/[code]` and `/e/[code]/join` (built, API spec A10) | M9, M13, M19, `GET /api/e/{code}`, `POST /api/e/{code}/check-in` | Must show the notice "your name and photo will appear on the event screen" before `screenConsent: true` |
| Big screen | `/e/[code]/live` (built, API spec A10) | A5, A6 | See [Big screen](#big-screen-live) |
| Admin console | `/admin`, `/admin/events/new`, `/admin/events/[slug]`, `/admin/people`, `/admin/test-users` (built, API spec A11) | M20, `/api/admin/*` | Super admins only, 404 for everyone else; V2 cards and buttons in a wide, fluid frame (390 → 1440); entry points only for super admins |
| Invite link | `/i/[code]` (built) | V2 `V2Invitar` | Sends to LinkedIn with `next=/onboarding/profile?invite=<code>`; the claim route is mock only |

## Responsive breakpoints (captain decision, 2026-10-29)

Every view works at **390** (phone, primary), **834** (tablet) and **1440+** (desktop): fluid layout, readable content centered on wide screens, no horizontal scroll, touch targets of at least 44 px. `/e/<code>/live` is designed for **1920×1080** and also works on a 1280 laptop and in phone portrait (counters plus a compact network). The V2 visual system in `design/compa-v2/README.md` is the visual source of truth; the event entry flow (landing, `/e/<code>`, `/e/<code>/join`, `/e/<code>/live`) is specified in API spec A10.

Attendee app (`app/(app)`, onboarding): `Screen` takes `width="wide"` (dashboards: content 354 → 770 → 1040) or `width="focus"` (one task: 354 → 576 → 600). From 834, Home puts the live card beside a tall Conectar tile, Me and PerfilOtro split into two columns, Ranking puts the podium beside "Tú", the monito builder keeps the preview beside the options, Connections uses 2 then 3 columns and Badges 4 then 5. From 1024 the bottom dock becomes the left rail of the Figma `Dock layout=rail` and stays on every attendee screen; super admins find "Admin" at its foot (the /me row stays on phones).

## Visual system

All tokens are defined once in `app/globals.css` (`@theme`) and come from README "Sistema visual". Fonts load in `app/layout.tsx` (`next/font/google`). The live reference page is `/design` (`app/design/page.tsx`).

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-paper` | `#FFF6E5` | Page background (`paper-dots` adds dots `rgba(30,27,46,0.07)` every 22 px) |
| `--color-ink` | `#1E1B2E` | Text, borders, shadows |
| `--color-muted` | `#6F6A7E` | Secondary text, inactive dock icons |
| `--color-mint` / `-soft` | `#6BE4A3` / `#DDF8EA` | Primary button, "new" kind, Conectar tab |
| `--color-sky` / `-soft` | `#6CC4FF` / `#DDF1FF` | "Reconnection" kind, Inicio tab |
| `--color-gum` / `-soft` | `#FF8FAB` / `#FFE3EA` | "Amigo" kind, Conexiones tab |
| `--color-sun` / `-soft` | `#FFD93D` / `#FFF3BF` | Points, ranking, Perfil tab |
| `--color-coral` / `-soft` | `#FF6B4A` / `#FFE1D9` | Alerts, live dot, cap accent |
| `--color-linkedin` | `#0A66C2` | The LinkedIn button only (README) |
| `--color-silver`, `--color-bronze` | `#D5DCE6`, `#F2A766` | Podium 2nd and 3rd place |

### Type

| Role | Font | Notes |
| --- | --- | --- |
| Titles, numbers, buttons | Fredoka 700 (`--font-display`; weights 500–700 loaded) | Buttons are 16 px |
| Body | Nunito 700/800 (`--font-body`; body weight 700) | |
| Section label | `label-caps` utility | 11 px, 800, uppercase, tracking 1.6 px, muted |

### Borders, shadows, radii, spacing

| Token | Value | Use |
| --- | --- | --- |
| `border-ink` | 2.5 px solid ink | Every card, button and chip |
| `dashed-ink` | 1.5 px dashed ink at 30 % | Badge shelf line, dividers |
| `--shadow-hard-4` | `4px 4px 0` ink | Cards, main buttons |
| `--shadow-hard-3` | `3px 3px 0` ink | Icon buttons, small cards, selected kind |
| `--shadow-hard-2` | `2px 2px 0` ink | Chips, enabled network toggles |
| `--shadow-ring` | white 3 px + ink 5 px ring | Selected swatch in the monito builder |
| `--radius-card` / `button` / `chip` / `phone` | 22 / 16 / 11 / 44 px | Cards / buttons and small cards / chips / phone frame |
| Screen padding | 48 top, 18 sides, gap 14 (`components/ui/Screen.tsx`) | Screens with the dock reserve 104 px at the bottom |
| Sizes | Main button 54 px high; icon buttons 44×44; minimum touch target 44 px | `Button`, `IconButton` |

### Motion

| Animation | Token | Where (README) |
| --- | --- | --- |
| Rising pairs, 7.5 s loop | `--animate-pair` | Home LIVE card |
| Points pop | `--animate-pop` | Confirmation |
| Dock drop, 0.8 s with overshoot `cubic-bezier(.34,1.3,.5,1)` | inline in `Dock.tsx` | Dock |
| Confetti, podium rise | `--animate-confetti`, `--animate-podium` | Ranking |
| Others | `rise`, `beat`, `spark`, `bounce-bar` (recording), `wiggle` (sticker), `blink` (live dot) | Various |

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` in `app/globals.css` turns off every animation and transition. The UI must stay complete without motion. For example, the pairs on Home must be readable as a static list.

## Components inventory

| Component | File | What it covers |
| --- | --- | --- |
| `Screen` | `components/ui/Screen.tsx` | Phone screen frame, paper dots, padding, optional fixed dock |
| `Button`, `ButtonLink` | `components/ui/Button.tsx` | Variants `primary` (mint), `secondary` (white), `linkedin`, `ink`; height 54 by default |
| `IconButton`, `IconLink` | `components/ui/IconButton.tsx` | 44×44 icon buttons with a required `label` |
| `Card` | `components/ui/Card.tsx` | Tones (`white`, `paper`, accents, `-soft`, `ink`), sizes `md` / `sm` / `flat`, optional `href` |
| `Chip`, `Tag` | `components/ui/Chip.tsx` | Toggle chip (`pressed`), static tag |
| `Pill` | `components/ui/Pill.tsx` | Rotated stickers and point pills |
| `Field` | `components/ui/Field.tsx` | Labeled text input |
| `Segmented` | `components/ui/Segmented.tsx` | Two- or three-option tabs (Mi QR / Escanear, Esta noche / Todo el año) |
| `SectionLabel`, `Muted`, `Stat`, `StatGrid`, `ProgressBar` | `components/ui/Text.tsx` | Text helpers and numbers |
| `Icon` | `components/icons.tsx` | 28 icons, including home, qr, people, user, back, bell, search, mic, refresh, share, dice, pencil, trophy, cap, linkedin, instagram, whatsapp, x, bolt and heart |
| `Monito` | `components/monito/Monito.tsx` + `lib/monito/grid.ts`, `look.ts` | 16×20 pixel art; `MonitoLook` zod schema; builder options of 02b; `GOLDEN_CAP` |
| `Avatar` | `components/monito/Avatar.tsx` + `lib/monito/sample-people.ts` | Round head (`size`) or full body (`px`); sample people of the mocks |
| `Badge`, `BadgeShelf` | `components/badges/*.tsx` + `lib/badges/catalog.ts` | The 20 badges, states `earned` / `locked`, tilted shelf of 5 |
| `Dock` | `components/nav/Dock.tsx` | DockV2 with route-based active tab |

Screen components added with the screens (PR #14):

| Component | File | What it covers |
| --- | --- | --- |
| `Header` | `components/ui/Header.tsx` | Back button and title row |
| `Welcome` | `components/welcome/Welcome.tsx` | 01 with the create / sign-in toggle |
| `ProfileForm`, `LinkToggles`, `MyLinkToggles` | `components/profile/` | 02 form; network toggles (on → `connections`, off → `hidden`) |
| `MonitoBuilder` | `components/monito/MonitoBuilder.tsx` | 02b builder, saves `avatar` through `PATCH /api/me` |
| `LiveCard`, `InviteCard` | `components/home/` | Home LIVE card with rising pairs; invite progress |
| `ConnectTabs`, `ScanPanel`, `RegisterForm` | `components/connect/` | 04 tabs, QR (`qrcode` package), camera scan with `BarcodeDetector`, handle lookup; 05 form |
| `VoiceNoteButton`, `NoteEditor` | `components/record/` | Recording states on 05; 08b draft, edit and approve |
| `ConnectionList`, `RequestActions` | `components/connections/` | 07 list and filters; 06b accept / "Ahora no" (decline) |
| `RankingView` | `components/ranking/RankingView.tsx` | 11 podium, scope toggle, "Tú" card |
| `BadgeGrid` | `components/badges/BadgeGrid.tsx` | 10 grid and filters |
| `InviteActions` | `components/invite/InviteActions.tsx` | Copy and share (`navigator.clipboard`, `navigator.share`) |

Not built yet: the `/live` page, the event check-in page, the screen-consent notice, the toast or sheet for incoming requests (the bell is not a link), the "NUEVA" sticker, skeletons, an offline banner, a sign-out button.

## Internationalization

Captain decision, 2026-10-29: **the app is bilingual, English and Spanish** (resolves [open question #6](wiki/open-questions.md)).

- **Detection:** the language comes from the system automatically. On the client that is `navigator.languages`. For server rendering it is the `Accept-Language` header. Any `es*` locale resolves to `es`, and everything else resolves to `en`, so English is the fallback. The URL carries no language and there is no language picker in V2.
- **One dictionary per language.** All UI copy, including `aria-label`s, goes through it. The V2 Spanish copy in the mocks is the source for `es`, and the English strings are translations of it. Identifiers and code stay English (`AGENTS.md` §1).
- **Errors:** the API keeps returning stable error `code`s (API spec §3). The UI maps each code to a localized message and never shows the API's English `message`.
- **Formatting:** dates, times ("hasta las 22:00"), relative times ("hace 1 min") and numbers ("1,265 pts") go through `Intl` with the resolved locale. Event times show in the event's time zone ([open question #22](wiki/open-questions.md)).
- **Layout:** leave about 30 % extra width for text in either language. Buttons, chips, the dock's open label (110 px max in `Dock.tsx`) and stickers must not clip.
- **Server-rendered copy:** `app/layout.tsx` hard-codes `lang="es"` and a Spanish description, so both must follow the resolved locale.
- **Status on the branch (2026-10-29):** only `lib/copy/es.ts` exists, and there is no English dictionary. There is no locale detection: pages import `lib/copy/es` directly. `lib/format.ts` hard-codes `es-MX`. Components show the API's English `message` on errors (`RegisterForm`, `RequestActions`, `ProfileForm`, `MonitoBuilder`, `NoteEditor`) instead of mapping the `code`. The remaining work is in the [gap analysis](docs/backend-gap-analysis.md#5-internationalization-backend-impact). **Update (API spec A10):** `lib/i18n.ts` implements the detection and `lib/copy/en.ts` holds English for the landing and event-entry screens (`lib/copy/index.ts` `copyFor(locale)`); the other screens still import `lib/copy/es` directly.
- **AI language follows the speaker, independent of the UI locale** (captain, 2026-10-29). Transcription keeps the spoken language, detected automatically. The summary and next steps are written in that same language. Topics always come from the fixed DB `interests` list, whatever the language. A Spanish note therefore shows a Spanish summary even to an English UI, and only the labels around it are localized.
- **Data in both languages:** interest and topic labels and badge names are shown through the dictionary, keyed by `slug` or badge id; `interests.name` stays single-language. Backend impact: [gap analysis §5](docs/backend-gap-analysis.md#5-internationalization-backend-impact).

## States per screen

Every screen handles **loading** (skeleton in the final layout, never a blank page), **error** (localized message from the error `code` plus a retry), **offline** (banner "sin conexión"; writes are disabled, not queued) and **401** (go to `/auth/linkedin?next=<current path>`). The rows below list only what is specific to each screen.

| Screen | Empty | Error / conflict | Offline | Permission denied |
| --- | --- | --- | --- | --- |
| 01 Landing | — | `/?error=linkedin` after a failed sign-in: asks to scan the event QR again | — | LinkedIn consent refused → back to 01 with the message |
| 02 Perfil | LinkedIn gave no job title, company or city: empty fields with placeholders | 400 `invalid_input` per field | Save disabled | — |
| 02b Monito | Default look (`DEFAULT_LOOK`) | Save failed → keep the local choice and retry | Save disabled | — |
| 03 Inicio | 03b (0 connections). **Outside an event** (`currentEvent: null`): not designed, pending | Live or leaderboard failed → hide that card and keep Conectar | Last known counters, marked stale | — |
| 04 Conectar | No current event: the QR still shows, and scanning someone may answer `not_at_event` | `user_not_found` (QR is not a COMPA QR), `not_at_event`, `self_connection` | QR tab works from cache; scan disabled | **Camera denied**: explain, offer name search and Mi QR (pending in the handoff) |
| 05 Registrar | No topics picked is allowed | `consent_required` → show the screen notice, retry with `screenConsent: true`; 200 for an existing pair → show its state; `invalid_audio` / `transcription_failed` → "type the note instead" | Confirm disabled | **Microphone denied**: hide the voice note and keep the topics |
| 06 Confirmación | AI summary still loading, or no note → hide "De qué platicaron" | Draft returned `fallback: true` → show the author's text with "No pudimos generar el resumen"; networks hidden until accepted | Show the points and retry later | — |
| 06b Solicitud | No incoming request → nothing to show | `not_pending` (already answered), `event_ended` (expired) | Buttons disabled | — |
| 07 Conexiones | "Aún no tienes conexiones" plus a call to Conectar | List failed → retry | Cached list | — |
| 08 Perfil otro | No summary yet → hide "La última vez"; no badges → empty shelf | `user_not_found`; fields hidden by visibility are simply absent | Cached | — |
| 08b Nota de voz | Recording state; recording stops at 2:00 (`lib/audio/recorder.ts`) | `not_substantive` (cannot approve), `already_approved` (read only), `connection_not_accepted` | Record and save disabled | Microphone denied → text input instead |
| 09 Mi perfil | No networks → toggles off with "oculto" | Toggle save failed → revert the toggle | Toggles disabled | — |
| 10 Insignias | 0 earned → all locked, with hints except for secrets | — | Cached | — |
| 11 Ranking | No event → only the "Todo el año" scope; me not ranked yet → "Tu primera conexión te mete al ranking" | — | Last snapshot | — |
| 12 Invitar | 0 of 3 invited | — | Copy works; share disabled | Clipboard denied → select the text |
| `/live/[slug]` | No connections yet → people only (seed data per [privacy-consent](wiki/privacy-consent.md)) | `event_not_found` | Keep the last snapshot and reconnect | — |

## Known pending screens

README "Pendientes conocidos" lists these as not drawn. Each needs a design before or while it is built.

| Pending | What it must cover | Backend support |
| --- | --- | --- |
| Request sent (scanner side) | Partly built as the pending branch of `/connections/[id]/done` ("Solicitud enviada a …"). Wait state after 05 while B decides; optional "we already knew each other" tick; becomes "Connected! +N" live; stays "pending" after a silent decline (M8, A4) | `POST /api/connections`, `PATCH /api/connections/{id}/knew`, `request.accepted` or polling |
| Notifications (the bell on Home) | Incoming requests and acceptances, in the app only, no push (A3) | `GET /api/connections` `incoming`; no notifications store |
| Camera permission | Ask before opening Escanear, and explain the denied state with a fallback | client only |
| Home outside an event | `currentEvent: null`: no LIVE card; show the all-year rank and how to check in | `GET /api/me` |
| Share card to stories | Share image of the connection or profile | none |
| Recording timer | Visible elapsed time while recording; stop at 2:00 | `lib/audio/recorder.ts` `onTick`, 120 s limit |
| 3-topic limit | "¿De qué hablaron?" allows at most 3 chips (AI summaries allow up to 4 topics, `lib/ai/summary-schema.ts`) | client; the server schema allows 4 |
| Locked badge and "NUEVA" sticker on the shelf | Locked state exists in `Badge`; the "new" sticker does not | badge state is missing |

## Big screen (`/live`)

Approved decisions (A5, A6, M13, M16). The handoff has no big-screen mock.

- **Content:** a **network visualization** of checked-in people (nodes with name and photo) and accepted connections (edges), plus **counters**: checked in, connections, new, reconnections (`GET /api/e/{code}/live`).
- **Interaction:** clicking a person opens their card with public fields, event points, connection count and rank (`GET /api/e/{code}/live/people/{userId}`). Clicking empty space opens the **leaderboard** (`GET /api/e/{code}/leaderboard`).
- **Public:** anyone with the link can view it. It shows only name, photo, public fields, points and connection kinds, never email, summary text or anything about a decline (A6; API spec §8).
- **Color encodes the connection kind**, new vs reconnection. People are neutral (M16). Using the V2 palette here (mint for new, sky for reconnection, matching `V2Registrar`) is a suggestion, not a decision.
- **Updates:** the public Realtime channel `event:<code>:live` (`connection.accepted`, `attendee.checked_in`, `summary.approved`), with snapshot polling as a fallback (the snapshot is cached for 1 s).
- **Everyone checked in appears.** There is no anonymous mode, and check-in records the consent (M13).
- **Size:** 1920×1080, readable from 10 m (`AGENTS.md` §4).
- **Figma file:** [COMPA — App flows (V2)](https://www.figma.com/design/UEnpABAPbq7WJUfhfoYi46): foundations, components, every flow with happy, empty, error and edge states, and the prototype.

## Decided vs open

Decided:

- The V2 handoff is the source of truth for attendee screens, copy and visual system (wiki log 2026-10-29 "Compa V2 design handoff").
- A Next.js web app, not Expo (ADR-001).
- LinkedIn-only sign-in (M2); two-step connection with acceptance (M6); silent decline (M8); check-in by event QR or by scanning someone (M9, A1); one connection per pair per event (M5).
- Name and photo are always public and email is never shown (M12).
- `/live`: network visualization and counters, a person card on click, the leaderboard on empty click, public, color by kind (A5, A6, M16).
- The tokens and components listed above (`app/globals.css`, `components/`).
- Bilingual UI in English and Spanish detected from the system locale, with English as the fallback, no language in the URL and errors localized by `code`; AI transcription and summaries follow the speaker's language, and topics come from `interests` (captain, 2026-10-29; [#6](wiki/open-questions.md)).

Open (see [open questions](wiki/open-questions.md)):

- Points table: the code now uses the V2 values (`lib/points.ts`, migration `drizzle/0001_v2_points_whatsapp.sql`: 50/20, +5, +15, +100/+50), while the specs still say M3/M18 (20/10, +25). The captain has to ratify it ([#28](wiki/open-questions.md), [#29](wiki/open-questions.md)).
- Who sets the kind and topics, and whether the voice note can come before acceptance (`V2Registrar` → `V2Confirmacion` vs M6, A9) ([#30](wiki/open-questions.md)).
- Networks: V2 LinkedIn, Instagram, WhatsApp, X vs code linkedin, github, x, instagram, web ([#31](wiki/open-questions.md)).
- Visibility: V2 on/off toggles shown only to connections vs three levels per field (M12) ([#32](wiki/open-questions.md)).
- Profile fields: city, and job title vs `headline`; what LinkedIn really prefills ([#33](wiki/open-questions.md)).
- Badges, monito storage, invites and the all-year ranking ([#34](wiki/open-questions.md)–[#37](wiki/open-questions.md)).
- Topic vocabulary for a founders event ([#38](wiki/open-questions.md)); name search ([#39](wiki/open-questions.md)); the "Amigo" kind ([#40](wiki/open-questions.md)); the voice-note summary shape ([#41](wiki/open-questions.md)); "Ahora no" semantics (built as decline, [#42](wiki/open-questions.md)).
- In-app camera scanning in V2 vs native-camera scanning in ADR-004: both can coexist through `/u/[handle]`.
- Event time window and time zone ([#22](wiki/open-questions.md)); handle shown or editable ([#26](wiki/open-questions.md)); private Realtime channels ([#27](wiki/open-questions.md)).

Related: [docs/backend-gap-analysis.md](docs/backend-gap-analysis.md), [ARCHITECTURE.md](ARCHITECTURE.md), [wiki/screens](wiki/screens/README.md) (the earlier plan's seven screens, superseded for UI by V2), [wiki/live-dashboard](wiki/live-dashboard.md), [wiki/privacy-consent](wiki/privacy-consent.md).
