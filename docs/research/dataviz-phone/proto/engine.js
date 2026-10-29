// Phone data-viz prototypes: scenario loader, replay and derived state. Vanilla, no build.
// URL: ?scenario=<name>&speed=<x>&t=<sec>&me=<attendeeId|@top|@last|@mid|@zero|@tied|@anon>&lang=es|en&stale=<sec>
// Scenarios load from ../../sim/scenarios/<name>.json (sibling agent) and fall back to the inline generator below.
(function () {
  const Q = new URLSearchParams(location.search);
  const P = {
    scenario: Q.get("scenario") || "steady",
    speed: Number(Q.get("speed") ?? 0),
    t: Q.has("t") ? Number(Q.get("t")) : null,
    me: Q.get("me") || "@mid",
    lang: Q.get("lang") === "en" ? "en" : "es",
    stale: Number(Q.get("stale") || 0),
    chrome: Q.get("chrome") !== "0",
  };

  // ---------- deterministic fixture generator (same schema as docs/research/sim) ----------
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const FIRST = ["Ana", "Luis", "Valeria", "Diego", "Sofía", "Mateo", "Camila", "Jorge", "Lucía", "Andrés", "Mariana", "Pablo", "Regina", "Emilio", "Fernanda", "Iván", "Paola", "Rodrigo", "Ximena", "Tomás", "Daniela", "Héctor", "Renata", "Omar"];
  const LAST = ["García", "López", "Martínez", "Hernández", "Pérez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Cruz", "Morales", "Ortiz", "Vargas"];
  const LONG = ["María Guadalupe Fernández de la Garza", "Juan Sebastián Villaseñor-Montemayor", "Ximena Alejandra Bustamante Echeverría", "Francisco Javier Hinojosa Santibáñez", "Wolfgang Schwarzenegger-Oppenheimer"];
  const TOPICS = ["IA", "Fintech", "Diseño", "Startups", "Web3", "Producto", "Growth", "DevTools", "Salud", "Clima", "Open source", "Hardware"];

  function makeAttendees(n, r, opts = {}) {
    return Array.from({ length: n }, (_, i) => {
      const long = opts.long && i % 3 === 0;
      const name = long ? LONG[i % LONG.length] : `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}${i >= FIRST.length ? " " + String.fromCharCode(65 + (i % 26)) + "." : ""}`;
      const k = 1 + Math.floor(r() * 3);
      const interests = Array.from({ length: k }, () => TOPICS[Math.floor(r() * TOPICS.length)]);
      return {
        id: `p${String(i + 1).padStart(3, "0")}`,
        name,
        headline: long ? "Head of Developer Relations & Community Partnerships, LATAM" : ["Founder", "PM", "Engineer", "Designer", "VC"][i % 5],
        photo: opts.noPhotos ? null : i % 4 === 0 ? null : `photo-${i}`,
        interests: [...new Set(interests)],
        anonymous: opts.anon ? i % 5 === 2 : i % 23 === 7,
      };
    });
  }

  function generate(name) {
    const r = rng([...name].reduce((h, c) => h * 31 + c.charCodeAt(0), 7));
    const H = 3 * 3600;
    const base = { name, durationSec: H + 1800, eventStartsAtSec: 0, eventEndsAtSec: H, attendees: [], events: [] };
    const cfg = {
      "zero-activity": { n: 40, conns: 0 },
      "one-attendee": { n: 1, conns: 0 },
      trickle: { n: 30, conns: 14 },
      steady: { n: 80, conns: 170 },
      rush: { n: 120, conns: 260, rush: true },
      huge: { n: 600, conns: 2600 },
      "end-of-event": { n: 80, conns: 170 },
      "after-event": { n: 80, conns: 170 },
      "tie-heavy": { n: 40, conns: 40, ties: true },
      "long-names-and-missing-photos": { n: 30, conns: 45, long: true, noPhotos: true, anon: true },
    }[name] || { n: 50, conns: 80 };
    const A = makeAttendees(cfg.n, r, cfg);
    base.attendees = A;
    const ev = base.events;
    A.forEach((a, i) => ev.push({ t: Math.floor((i / Math.max(1, A.length)) * 2400 * r()) , type: "checkin", a: a.id }));
    const seen = new Set();
    for (let k = 0; k < cfg.conns; k++) {
      let ia, ib;
      if (cfg.ties) { ia = (k * 2) % A.length; ib = (k * 2 + 1) % A.length; }
      else { ia = Math.floor(Math.pow(r(), 1.6) * A.length); ib = Math.floor(r() * A.length); }
      if (ia === ib) continue;
      const key = [ia, ib].sort().join("-");
      const again = seen.has(key);
      seen.add(key);
      let t = cfg.rush ? (r() < 0.75 ? 4200 + r() * 420 : 600 + r() * (H - 900)) : 300 + Math.pow(r(), 0.9) * (H - 400);
      if (cfg.ties) t = 900 + k * 120;
      t = Math.floor(t);
      const a = A[ia], b = A[ib];
      const shared = a.interests.filter((x) => b.interests.includes(x));
      const topics = r() < 0.6 ? (shared.length ? shared : [TOPICS[Math.floor(r() * TOPICS.length)]]).slice(0, 2) : [];
      ev.push({ t, type: "connection_requested", a: a.id, b: b.id });
      ev.push({ t: t + 20 + Math.floor(r() * 90), type: "connection_accepted", a: a.id, b: b.id, topics, kind: again ? "reconnection" : "new" });
      if (r() < 0.22 && !cfg.ties) ev.push({ t: t + 300, type: "summary_approved", a: a.id, b: b.id, topics: topics.length ? topics : [TOPICS[k % TOPICS.length]] });
    }
    if (cfg.conns > 0) ev.push({ t: 4000, type: "connection_requested", a: A[0].id, b: A[A.length - 1].id }); // one pending forever
    ev.sort((x, y) => x.t - y.t);
    return base;
  }

  // Default replay time per scenario (when ?t is absent): an interesting moment.
  function defaultT(s) {
    const end = s.eventEndsAtSec, start = s.eventStartsAtSec;
    if (s.name === "end-of-event") return end - 240;
    if (s.name === "after-event") return Math.min(s.durationSec, end + 1500);
    if (s.name === "rush") { // end of the densest 5-minute window
      const ts = s.events.filter((e) => e.type === "connection_accepted").map((e) => e.t);
      let best = 0, at = start + 4500;
      for (let i = 0, j = 0; j < ts.length; j++) { while (ts[j] - ts[i] > 300) i++; if (j - i > best) { best = j - i; at = ts[j]; } }
      return Math.min(s.durationSec, at);
    }
    return Math.min(s.durationSec, Math.round(start + (end - start) * 0.62));
  }

  async function loadScenario(name) {
    try {
      const res = await fetch(`../../sim/scenarios/${name}.json`, { cache: "no-store" });
      if (res.ok) { const j = await res.json(); j.events.sort((x, y) => x.t - y.t); return Object.assign(j, { _source: "sim" }); } // delivery order is not time order (clock-skew scenario)
    } catch (_) { /* fall back to the generator */ }
    return Object.assign(generate(name), { _source: "inline" });
  }

  // ---------- derived state at time t ----------
  const PTS = { new: 50, reconnection: 20, topics: 5, note: 15 };
  function stateAt(s, t) {
    const people = new Map();
    s.attendees.forEach((a) => people.set(a.id, { ...a, points: 0, connections: 0, checkinT: null, lastT: null, partners: new Map(), topics: new Set(), notes: 0, scannedBy: 0, badges: [], series: [[s.eventStartsAtSec, 0]], firstConnT: null, lastConnT: null, sent: 0, pendingIn: 0 }));
    const topicScore = new Map();
    const connections = [];
    const feed = [];
    const pending = new Map();
    const pairs = new Set(), noted = new Set(), badged = new Set(); // idempotency, as the server enforces it
    const bump = (p, n, at) => { if (!p) return; p.points += n; p.lastT = at; p.series.push([at, p.points]); };
    for (const e of s.events) {
      if (e.t > t) break;
      const a = people.get(e.a), b = e.b ? people.get(e.b) : null;
      if (!a) continue;
      if (e.type === "checkin") { if (a.checkinT === null) a.checkinT = e.t; feed.push(e); continue; }
      if (e.type === "connection_requested") { pending.set(e.a + ">" + e.b, e); if (b) b.pendingIn++; continue; }
      if (e.type === "connection_accepted" && b) {
        const pk = [e.a, e.b].sort().join("|") + ":" + (e.kind || "");
        if (pairs.has(pk + e.t)) continue;
        pairs.add(pk + e.t);
        if (pending.delete(e.a + ">" + e.b)) b.pendingIn = Math.max(0, b.pendingIn - 1);
        const kind = e.kind || (a.partners.has(b.id) ? "reconnection" : "new");
        const pts = e.points ?? PTS[kind];
        bump(a, pts + (e.topics?.length ? PTS.topics : 0), e.t);
        bump(b, pts, e.t);
        for (const p of [a, b]) { p.connections++; p.firstConnT ??= e.t; p.lastConnT = e.t; }
        a.partners.set(b.id, e.t); b.partners.set(a.id, e.t);
        a.sent++; b.scannedBy++;
        const shared = a.interests.filter((x) => b.interests.includes(x));
        for (const x of e.topics?.length ? e.topics : shared) { topicScore.set(x, (topicScore.get(x) || 0) + 1); a.topics.add(x); b.topics.add(x); }
        connections.push({ a: a.id, b: b.id, t: e.t, kind, topics: e.topics || [] });
        feed.push({ ...e, kind });
        continue;
      }
      if (e.type === "summary_approved") {
        const nk = [e.a, e.b || ""].sort().join("|");
        if (noted.has(nk)) continue;
        noted.add(nk);
        bump(a, e.points ?? PTS.note, e.t); a.notes++;
        for (const x of e.topics || []) { topicScore.set(x, (topicScore.get(x) || 0) + 3); a.topics.add(x); }
        feed.push(e); continue;
      }
      if (e.type === "badge") { if (badged.has(e.a + e.badge)) continue; badged.add(e.a + e.badge); a.badges.push({ id: e.badge, t: e.t }); feed.push(e); }
    }
    const checked = [...people.values()].filter((p) => p.checkinT !== null);
    const board = checked.slice().sort((x, y) => y.points - x.points || y.connections - x.connections || x.checkinT - y.checkinT);
    board.forEach((p, i) => { p.rank = i + 1; p.crank = i && board[i - 1].points === p.points ? board[i - 1].crank : i + 1; }); // crank: shared rank for equal points
    const W = 600; // "recent" window: points in the last 10 minutes
    checked.forEach((p) => (p.recent = pointsSince(p, t - W)));
    const phase = t < s.eventStartsAtSec ? "upcoming" : t >= s.eventEndsAtSec ? "ended" : "running";
    const counters = {
      checkedIn: checked.length,
      connections: connections.length,
      newCount: connections.filter((c) => c.kind === "new").length,
      reconnections: connections.filter((c) => c.kind === "reconnection").length,
      summaries: s.events.filter((e) => e.type === "summary_approved" && e.t <= t).length,
      active: checked.filter((p) => p.lastT !== null && p.lastT > t - W).length,
    };
    const topics = [...topicScore.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);
    return { s, t, phase, people, board, connections, feed: feed.slice(-30).reverse(), topics, counters, pending };
  }
  function pointsSince(p, from) {
    let before = 0;
    for (const [at, v] of p.series) { if (at <= from) before = v; }
    return p.points - before;
  }

  // Connections per bucket (default 5 min) between event start and min(t, end).
  function buckets(st, size = 300) {
    const { s, t } = st;
    const end = Math.min(t, s.eventEndsAtSec);
    const n = Math.max(1, Math.ceil((end - s.eventStartsAtSec) / size));
    const out = new Array(n).fill(0);
    for (const c of st.connections) { const i = Math.floor((c.t - s.eventStartsAtSec) / size); if (i >= 0 && i < n) out[i]++; }
    return out;
  }

  function resolveMe(st, want) {
    const b = st.board;
    if (!b.length) return st.people.values().next().value || null;
    if (want === "@top") return b[0];
    if (want === "@last") return b[b.length - 1];
    if (want === "@mid") return b[Math.min(b.length - 1, Math.floor(b.length * 0.4))];
    if (want === "@zero") return b.find((p) => p.connections === 0) || b[b.length - 1];
    if (want === "@tied") return b.find((p, i) => i > 0 && b[i - 1].points === p.points && p.points > 0) || b[Math.floor(b.length / 2)];
    if (want === "@anon") { const p = b.find((x) => x.anonymous) || b[Math.floor(b.length / 2)]; p.anonymous = true; return p; }
    return st.people.get(want) || b[0];
  }

  // LeaderboardMe as the API shapes it (lib/api/schemas.ts): rank, points, above, gap.
  function meView(st, me) {
    if (!me) return null;
    const i = me.rank ? me.rank - 1 : -1;
    const above = i > 0 ? st.board[i - 1] : null;
    const below = i >= 0 && i < st.board.length - 1 ? st.board[i + 1] : null;
    const tiedWith = st.board.filter((p) => p !== me && p.points === me.points && me.points > 0).length;
    return { crank: me.crank, rank: me.connections > 0 || me.points > 0 ? me.rank : null, points: me.points, above, below, gap: above ? Math.max(0, above.points - me.points) : 0, tiedWith, total: st.board.length };
  }

  // Badge progress for me, mirroring lib/badges/rules.ts where facts exist in the scenario.
  const BADGE_NAMES = { apreton: ["Primer apretón", "First handshake"], madrugador: ["Madrugador", "Early bird"], cierre: ["Cierre", "Closer"], iman: ["Imán", "Magnet"], maraton: ["Maratón", "Marathon"], curioso: ["Curioso", "Curious"], memoria: ["Memoria de elefante", "Elephant memory"], tresdetres: ["Tres de tres", "Three of three"] };
  function badgesFor(st, me) {
    const s = st.s;
    const rows = [
      ["apreton", Math.min(me.connections, 1), 1],
      ["madrugador", me.firstConnT !== null && me.firstConnT - s.eventStartsAtSec <= 3600 ? 1 : 0, 1],
      ["iman", me.scannedBy, 10],
      ["maraton", me.connections, 15],
      ["curioso", me.topics.size, 10],
      ["memoria", me.notes, 20],
      ["cierre", st.phase === "ended" && me.lastConnT !== null && s.eventEndsAtSec - me.lastConnT <= 1800 ? 1 : 0, 1],
    ];
    return rows.map(([id, cur, total]) => ({ id, name: BADGE_NAMES[id][P.lang === "en" ? 1 : 0], current: Math.min(cur, total), total, earned: cur >= total, pct: Math.min(1, cur / total) }));
  }

  // ---------- small UI helpers ----------
  const COMPA_OFFLINE_PHOTOS = Q.get("photos") !== "1"; // pravatar needs network; opt in with ?photos=1
  const PALETTE = ["#6BE4A3", "#6CC4FF", "#FF8FAB", "#FFD93D", "#FF6B4A", "#F2A766"];
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const label = (p) => (p.anonymous ? (P.lang === "en" ? "Anonymous" : "Anónimo") : p.name);
  const first = (p) => (p.anonymous ? label(p) : p.name.split(" ")[0]);
  const initials = (p) => (p.anonymous ? "?" : p.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase());
  const hue = (id) => PALETTE[[...id].reduce((h, c) => h + c.charCodeAt(0), 0) % PALETTE.length];
  // shortcut: initials in brand colors stand in for monitos/photos; the real app renders <Avatar>.
  function avatar(p, size = 36) {
    if (p.photo && !p.anonymous && /^https?:/.test(p.photo) && !COMPA_OFFLINE_PHOTOS) return `<img class="av" alt="" src="${esc(p.photo)}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:cover;background:${hue(p.id)}" loading="lazy">`;
    const bg = p.anonymous ? "#D5DCE6" : hue(p.id);
    return `<span class="av" style="width:${size}px;height:${size}px;background:${bg};font-size:${Math.round(size * 0.38)}px">${esc(initials(p))}</span>`;
  }
  const fmt = (n) => n.toLocaleString(P.lang === "en" ? "en-US" : "es-MX");
  const clock = (st, at) => { const m = Math.floor((at - st.s.eventStartsAtSec) / 60); const h = 19 + Math.floor(m / 60); return `${String(h % 24).padStart(2, "0")}:${String(((m % 60) + 60) % 60).padStart(2, "0")}`; };
  const ago = (st, at) => { const d = Math.max(0, Math.round((st.t - at) / 60)); return P.lang === "en" ? (d < 1 ? "now" : `${d} min ago`) : d < 1 ? "ahora" : `hace ${d} min`; };
  const tr = (es, en) => (P.lang === "en" ? en : es);

  function spark(values, w = 120, h = 28, color = "#1E1B2E") {
    if (!values.length) return "";
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? w / (values.length - 1) : 0;
    const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }

  function chromeBar(st) {
    if (!P.chrome) return "";
    const src = st.s._source === "sim" ? "sim" : "inline";
    return `<div class="dbg">${esc(st.s.name)} · t=${Math.round(st.t)}s · ${st.phase} · ${src}</div>`;
  }
  function staleBanner(st) {
    if (!P.stale) return "";
    return `<div class="stale" role="status">${tr(`Sin conexión · datos de hace ${Math.round(P.stale / 60) || 1} min`, `Offline · data from ${Math.round(P.stale / 60) || 1} min ago`)}</div>`;
  }

  // Replay loop: render(state, me, view) at t; with speed>0 advance t in real time × speed.
  async function run(render) {
    const s = await loadScenario(P.scenario);
    let t = P.t ?? defaultT(s);
    const root = document.getElementById("app");
    const draw = () => {
      const st = stateAt(s, Math.max(0, t - P.stale));
      const me = resolveMe(st, P.me);
      root.innerHTML = chromeBar(st) + staleBanner(st) + render(st, me, me ? meView(st, me) : null);
      document.documentElement.dataset.phase = st.phase;
    };
    draw();
    if (P.speed > 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInterval(() => { t = Math.min(s.durationSec, t + P.speed); draw(); }, 1000);
    }
    document.body.dataset.ready = "1";
  }

  window.COMPA = { P, run, stateAt, buckets, resolveMe, meView, badgesFor, avatar, label, first, esc, fmt, clock, ago, tr, spark, hue, PALETTE, generate };
})();
