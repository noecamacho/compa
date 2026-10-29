// Shared replay runtime for the /live big-screen prototypes. Vanilla JS, no build step.
// URL: ?scenario=<name>&speed=<x>&t=<sec>&stale=<sec>&shot=1&reduced=1
// Loads ../../sim/scenarios/<name>.json (sibling sim agent); falls back to an inline fixture.
(function () {
  const params = new URLSearchParams(location.search);
  const num = (key, fallback) => (params.has(key) && params.get(key) !== "" && !Number.isNaN(Number(params.get(key))) ? Number(params.get(key)) : fallback);

  const opts = {
    scenario: params.get("scenario") || "fixture",
    speed: num("speed", 1),
    t: params.has("t") ? num("t", 0) : null,
    stale: num("stale", 0), // seconds since the last good snapshot, to preview the stale indicator
    shot: params.get("shot") === "1",
    reduced: params.get("reduced") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches,
    locale: params.get("lang") || ((navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en"),
  };

  const COLORS = {
    paper: "#FFF6E5", ink: "#1E1B2E", muted: "#6F6A7E",
    mint: "#6BE4A3", sky: "#6CC4FF", gum: "#FF8FAB", sun: "#FFD93D", coral: "#FF6B4A",
    mintSoft: "#DDF8EA", skySoft: "#DDF1FF", gumSoft: "#FFE3EA", sunSoft: "#FFF3BF", coralSoft: "#FFE1D9",
    silver: "#D5DCE6", bronze: "#F2A766", white: "#FFFFFF",
  };
  // Categorical order for topics: brand hues first, then soft fills with ink text.
  const CATEGORY = [COLORS.mint, COLORS.sky, COLORS.sun, COLORS.gum, COLORS.coral, COLORS.bronze, COLORS.silver, "#B9A7FF"];

  const POINTS = { new: 50, reconnection: 20, summary: 15, topics: 5 };

  // Tiny fixture following the sim schema, so prototypes work before docs/research/sim lands.
  function fixture() {
    const names = ["Ana Torres", "Luis Pérez", "Valeria Ríos", "Diego Soto", "Camila Núñez", "Mateo Vargas", "Sofía Herrera", "Bruno Díaz", "Lucía Medina", "Tomás Rojas", "Martina Castro", "Joaquín Silva"];
    const pool = ["AI", "React", "Design", "Startups", "LLMs", "DevOps", "Product", "TypeScript", "Agents", "Mobile"];
    const attendees = names.map((name, i) => ({
      id: "p" + i, name, headline: i % 3 ? "Engineer" : "Founder", photo: null,
      interests: [pool[i % pool.length], pool[(i * 3 + 1) % pool.length], pool[(i * 7 + 2) % pool.length]],
      anonymous: i === 7,
    }));
    const events = [];
    attendees.forEach((p, i) => events.push({ t: 30 + i * 40, type: "checkin", a: p.id }));
    for (let k = 0; k < 26; k++) {
      const a = "p" + ((k * 5) % 12), b = "p" + ((k * 7 + 3) % 12);
      if (a === b) continue;
      const t = 600 + k * 95;
      events.push({ t: t - 20, type: "connection_requested", a, b });
      events.push({ t, type: "connection_accepted", a, b, kind: k % 6 === 0 ? "reconnection" : "new" });
      if (k % 4 === 0) events.push({ t: t + 120, type: "summary_approved", a, b, topics: [pool[k % pool.length]] });
    }
    events.push({ t: 2400, type: "badge", a: "p0", badge: "maraton" });
    events.sort((x, y) => x.t - y.t);
    return { name: "fixture", durationSec: 3600, eventStartsAtSec: 300, eventEndsAtSec: 3300, attendees, events };
  }

  async function loadScenario(name) {
    if (name === "fixture") return fixture();
    try {
      const response = await fetch(`../../sim/scenarios/${name}.json`, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } catch (error) {
      console.warn("scenario load failed, using fixture", name, error);
      return { ...fixture(), name: name + " (fixture)" };
    }
  }

  const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

  // Pure fold over events with t <= now. Mirrors the server: points, ranking (points, connections, earliest check-in),
  // topics (+1 per shared interest per connection, x3 per approved summary topic), counters.
  function stateAt(scn, now) {
    const byId = new Map(scn.attendees.map((p) => [p.id, p]));
    const people = new Map();
    const touch = (id) => {
      if (!people.has(id)) {
        const p = byId.get(id) || { id, name: "?", interests: [] };
        people.set(id, { ...p, display: p.anonymous ? (opts.locale === "es" ? "Anónimo" : "Anonymous") : p.name, checkedInAt: null, points: 0, connections: 0, summaries: 0, badges: [], lastActiveAt: null });
      }
      return people.get(id);
    };
    const connections = [];
    const pending = new Map();
    const topics = new Map();
    const summaries = [];
    const badges = [];
    const feed = [];
    const seenPairs = new Set();
    const addTopic = (name, weight, t) => {
      const cur = topics.get(name) || { name, score: 0, connections: 0, summaries: 0, lastAt: 0 };
      cur.score += weight; cur.lastAt = t;
      if (weight === 1) cur.connections++; else cur.summaries++;
      topics.set(name, cur);
    };
    for (const ev of scn.events) {
      if (ev.t > now) break;
      if (ev.type === "checkin") {
        const p = touch(ev.a);
        if (p.checkedInAt === null) p.checkedInAt = ev.t;
        p.lastActiveAt = ev.t;
        feed.push(ev);
      } else if (ev.type === "connection_requested") {
        pending.set(pairKey(ev.a, ev.b), ev);
      } else if (ev.type === "connection_accepted") {
        const key = pairKey(ev.a, ev.b);
        pending.delete(key);
        if (seenPairs.has(key)) continue; // idempotent: one connection per pair per event
        seenPairs.add(key);
        // The sim carries no kind: points 20 means a reconnection (wiki/points-rules.md).
        const kind = ev.kind === "reconnection" || (!ev.kind && ev.points === POINTS.reconnection) ? "reconnection" : "new";
        const pts = ev.points ?? POINTS[kind];
        const a = touch(ev.a), b = touch(ev.b);
        for (const p of [a, b]) { p.points += pts; p.connections++; p.lastActiveAt = ev.t; p.lastConnectedAt = ev.t; if (p.checkedInAt === null) p.checkedInAt = ev.t; }
        const shared = ev.topics || (a.interests || []).filter((x) => (b.interests || []).includes(x));
        if (ev.topics && ev.topics.length) a.points += POINTS.topics; // +5 to the scanner for marked topics
        shared.forEach((x) => addTopic(x, 1, ev.t));
        connections.push({ a: ev.a, b: ev.b, t: ev.t, kind, topics: shared });
        feed.push({ ...ev, kind, topics: shared });
      } else if (ev.type === "summary_approved") {
        const noteKey = pairKey(ev.a, ev.b || "") + "|" + ev.a;
        if (seenPairs.has("note:" + noteKey)) continue; // one approved note per connection and author
        seenPairs.add("note:" + noteKey);
        const author = touch(ev.a);
        author.points += ev.points ?? POINTS.summary; author.summaries++; author.lastActiveAt = ev.t;
        (ev.topics || []).forEach((x) => addTopic(x, 3, ev.t));
        summaries.push(ev);
        feed.push(ev);
      } else if (ev.type === "badge") {
        const p = touch(ev.a);
        if (p.badges.includes(ev.badge)) continue; // one badge per person
        p.badges.push(ev.badge);
        if (ev.points) p.points += ev.points;
        badges.push(ev);
        feed.push(ev);
      }
    }
    const list = [...people.values()].filter((p) => p.checkedInAt !== null);
    const leaderboard = [...list].sort((x, y) => y.points - x.points || y.connections - x.connections || x.checkedInAt - y.checkedInAt);
    // Dense ties: same points and connections share a rank (display only; the server still orders by check-in).
    leaderboard.forEach((p, i) => {
      const prev = leaderboard[i - 1];
      p.rank = prev && prev.points === p.points && prev.connections === p.connections ? prev.rank : i + 1;
      p.tied = Boolean((prev && prev.rank === p.rank) || (leaderboard[i + 1] && leaderboard[i + 1].points === p.points && leaderboard[i + 1].connections === p.connections));
    });
    const reconnections = connections.filter((c) => c.kind === "reconnection").length;
    const lastEventAt = feed.length ? feed[feed.length - 1].t : null;
    const phase = now < scn.eventStartsAtSec ? "pre" : now >= scn.eventEndsAtSec ? "ended" : scn.eventEndsAtSec - now <= 600 ? "closing" : "live";
    return {
      now, phase,
      elapsed: Math.max(0, now - scn.eventStartsAtSec),
      remaining: Math.max(0, scn.eventEndsAtSec - now),
      eventLength: scn.eventEndsAtSec - scn.eventStartsAtSec,
      people: list, byId: people, leaderboard, connections, pending: [...pending.values()], summaries, badges,
      topics: [...topics.values()].sort((x, y) => y.score - x.score || x.name.localeCompare(y.name)),
      feed: feed.slice(-40).reverse(),
      counters: { checkedIn: list.length, connections: connections.length, newCount: connections.length - reconnections, reconnections, summaries: summaries.length, active: list.filter((p) => p.lastConnectedAt != null && now - p.lastConnectedAt <= 600).length /* sim: in a connection in the last 600 s */ },
      lastEventAt,
      idleFor: lastEventAt === null ? now : now - lastEventAt,
      registered: scn.attendees.length,
    };
  }

  // Connections per bucket (default 60 s) from the event start to now.
  function rateSeries(state, bucket = 60, from = 0) {
    const n = Math.max(1, Math.ceil((state.now - from) / bucket));
    const out = new Array(n).fill(0);
    for (const c of state.connections) {
      const i = Math.floor((c.t - from) / bucket);
      if (i >= 0 && i < n) out[i]++;
    }
    return out;
  }

  // First letter of the first two words; skips emoji/symbols and keeps surrogate pairs (CJK, RTL) whole.
  const initials = (name) => (name || "").split(/\s+/).map((w) => [...w].find((ch) => /\p{L}|\p{N}/u.test(ch))).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  function hash(text) { let h = 0; for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }
  const colorFor = (id) => [COLORS.mint, COLORS.sky, COLORS.sun, COLORS.gum, COLORS.coral, COLORS.bronze][hash(id) % 6];

  // Avatar HTML: photo when present and loadable, else initials on a stable brand color. Anonymous never shows a photo.
  function avatar(person, size) {
    const s = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px`;
    // Initials sit underneath; a photo that fails to load removes itself and reveals them.
    const img = person.photo && !person.anonymous ? `<img src="${person.photo}" alt="" style="position:absolute;inset:0" onerror="this.remove()" />` : "";
    return `<span class="av av-fallback" style="${s};position:relative;background:${person.anonymous ? COLORS.silver : colorFor(person.id)}">${person.anonymous ? "?" : initials(person.name)}${img}</span>`;
  }

  const fmt = (n) => new Intl.NumberFormat(opts.locale).format(n);
  const clock = (sec) => { const s = Math.max(0, Math.floor(sec)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(r).padStart(2, "0"); };
  const nameOf = (state, id) => (state.byId.get(id) || { display: "?" }).display;

  const COPY = {
    en: { live: "LIVE", ended: "Event ended", startsIn: "Starts in", left: "left", scan: "Scan to join", stale: "Reconnecting… last update", ago: "ago", connections: "Connections", checkedIn: "Checked in", summaries: "Notes", people: "People", talkedAbout: "talked about", met: "met", reconnected: "reconnected", joined: "joined", earned: "earned", noActivity: "Be the first: scan the QR and say hi to someone", points: "pts" },
    es: { live: "EN VIVO", ended: "Evento terminado", startsIn: "Empieza en", left: "restante", scan: "Escanea para entrar", stale: "Reconectando… última actualización hace", ago: "", connections: "Conexiones", checkedIn: "Registrados", summaries: "Notas", people: "Personas", talkedAbout: "hablaron de", met: "conectó con", reconnected: "se reencontró con", joined: "llegó", earned: "ganó", noActivity: "Sé la primera persona: escanea el QR y saluda a alguien", points: "pts" },
  };
  const copy = COPY[opts.locale] || COPY.en;

  // Placeholder QR: a deterministic pseudo-QR so layouts can be judged; the real board renders a real one server-side.
  function fakeQr(size, seed = "compa") {
    const n = 25, cell = size / n; let rects = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      const on = finder ? ((x % 6 === 0 || y % 6 === 0 || (x % 6 >= 2 && x % 6 <= 4 && y % 6 >= 2 && y % 6 <= 4)) && !(x === 6 && y >= n - 7 && false)) : hash(seed + x + "," + y) % 2 === 0;
      if (on) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell + 0.3}" height="${cell + 0.3}"/>`;
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="${COLORS.ink}" aria-label="QR"><rect width="${size}" height="${size}" fill="#fff"/>${rects}</svg>`;
  }

  function staleBadge(host) {
    if (!opts.stale) return;
    const el = document.createElement("div");
    el.className = "stale-pill";
    el.setAttribute("role", "status");
    el.innerHTML = `<span class="stale-dot"></span>${copy.stale} ${clock(opts.stale)} ${copy.ago}`;
    (host || document.body).appendChild(el);
  }

  // Runs the replay. render(state, scenario, info) is called whenever the folded state changes, plus every `tickMs`
  // for animations that need time (clocks). When ?t is given with speed 0 the screen is frozen for screenshots.
  async function run(render, { tickMs = 250 } = {}) {
    const scn = await loadScenario(opts.scenario);
    scn.events.sort((x, y) => x.t - y.t);
    const startT = opts.t ?? 0;
    const wall = performance.now();
    const simNow = () => Math.min(scn.durationSec, startT + ((performance.now() - wall) / 1000) * opts.speed);
    let lastCount = -1, lastState = null;
    const step = () => {
      const now = simNow();
      let count = 0; while (count < scn.events.length && scn.events[count].t <= now) count++;
      const changed = count !== lastCount || !lastState;
      if (changed) { lastState = stateAt(scn, now); lastCount = count; }
      else Object.assign(lastState, { now, remaining: Math.max(0, scn.eventEndsAtSec - now), elapsed: Math.max(0, now - scn.eventStartsAtSec), idleFor: lastState.lastEventAt === null ? now : now - lastState.lastEventAt, phase: now < scn.eventStartsAtSec ? "pre" : now >= scn.eventEndsAtSec ? "ended" : scn.eventEndsAtSec - now <= 600 ? "closing" : "live" });
      render(lastState, scn, { changed, opts });
      if (!opts.shot) hud.textContent = `${scn.name} · t=${Math.round(now)}s · x${opts.speed} · ${lastState.phase}`;
    };
    const hud = document.createElement("div");
    hud.className = "hud";
    if (!opts.shot) document.body.appendChild(hud);
    staleBadge();
    step();
    window.__ready = true;
    if (opts.speed > 0) setInterval(step, tickMs);
  }

  window.COMPA = { opts, COLORS, CATEGORY, POINTS, stateAt, rateSeries, avatar, initials, colorFor, fmt, clock, nameOf, copy, fakeQr, run, hash };
})();
