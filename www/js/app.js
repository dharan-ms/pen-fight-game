const P = BiroPhysics;
const COLORS = { 1: "#1f4fbf", 2: "#c62828" };
const INK = { 1: "Blue ink", 2: "Red ink" };
const BIROS = [
  { id: "bic", name: "Bic", style: "All-rounder", accent: "#1d6fd1", length: 128, width: 10, mass: 0.9, blurb: "The classroom standard. Even in everything, no real weakness. E no get wahala.", stats: { power: 3, speed: 4, reach: 3, defense: 3 } },
  { id: "lucky", name: "Lucky", style: "Heavy hitter", accent: "#1730b5", length: 120, width: 12, mass: 1.15, blurb: "Solid and steady. Hits harder than it looks and doesn't shake easily.", stats: { power: 4, speed: 3, reach: 3, defense: 4 } },
  { id: "racer", name: "Lucky Racer", style: "Speedster", accent: "#d32020", length: 124, width: 9, mass: 0.62, blurb: "Slim and feather-light. E go fly across the desk. But one solid knock and e don comot.", stats: { power: 2, speed: 5, reach: 3, defense: 1 } },
  { id: "leo", name: "Leo Smart", style: "Steady aim", accent: "#222222", length: 126, width: 10, mass: 1.15, blurb: "Sleek and solid. Its long body spins less than most, so your flicks stay on target.", stats: { power: 4, speed: 3, reach: 3, defense: 4 } },
  { id: "multi", name: "Multi Colour", style: "Tank", accent: "#e0337a", length: 112, width: 14, mass: 1.9, blurb: "The chunkiest biro in class, four refills packed inside. Slow off the mark, but almost impossible to push off.", stats: { power: 5, speed: 2, reach: 2, defense: 5 } },
];
const byId = Object.fromEntries(BIROS.map((b) => [b.id, b]));
const BOARD_KEY = "biro-board";

const $ = (id) => document.getElementById(id);
const screens = ["screen-home", "screen-pick", "screen-pass", "screen-game"];

let mode = "ai";
let pickPlayer = 1;
let picks = { 1: null, 2: null };
let selected = null;

const match = {
  pens: [],
  turn: 1,
  phase: "aim",
  scores: { 1: 0, 2: 0 },
  round: 1,
  winner: null,
  concludeAt: 0,
  drag: null,
  recorded: false,
};

const view = { w: 800, h: 560, scale: 1, ox: 0, oy: 0 };
let deskCache = null;
let raf = 0;
let last = 0;
let aiStarted = 0;

function show(id) {
  for (const screen of screens) $(screen).classList.toggle("hidden", screen !== id);
  $("soundbar").classList.toggle("hidden", id === "screen-game");
}

function penSvg(biro, h = 120) {
  const w = Math.round(h * 0.28);
  return `<svg viewBox="0 0 24 120" width="${w}" height="${h}" aria-hidden="true">
    <rect x="5" y="4" width="14" height="112" rx="6" fill="#eef2f6" stroke="#8d99a6"/>
    <rect x="11" y="40" width="2" height="64" fill="#2a2a2a"/>
    <rect x="5" y="4" width="14" height="36" rx="6" fill="${biro.accent}"/>
    <rect x="17" y="10" width="3.5" height="34" rx="1.5" fill="${biro.accent}" stroke="rgba(0,0,0,.25)"/>
    <rect x="6" y="108" width="12" height="8" rx="3" fill="${biro.accent}"/>
  </svg>`;
}

function pips(value, color) {
  return `<div class="pips">${[0, 1, 2, 3, 4].map((i) => `<span class="pip" style="background:${i < value ? color : "rgba(31,42,68,.12)"}"></span>`).join("")}</div>`;
}

function renderGrid() {
  const color = COLORS[pickPlayer];
  $("biro-grid").innerHTML = BIROS.map((biro) => {
    const on = selected === biro.id;
    const bars = ["power", "speed", "reach", "defense"].map((key, i) => {
      const label = ["PWR", "SPD", "RCH", "DEF"][i];
      return `<div class="stat"><b>${label}</b>${pips(biro.stats[key], color)}</div>`;
    }).join("");
    return `<button type="button" class="card${on ? " on" : ""}" data-id="${biro.id}" style="${on ? `border-color:${color};box-shadow:3px 3px 0 ${color}` : ""}">
      <div class="card-head"><span class="card-name">${biro.name}</span>${on ? `<span class="check" style="background:${color}">✓</span>` : ""}</div>
      <p class="card-style" style="color:${biro.accent}">${biro.style}</p>
      <div class="card-body">${penSvg(biro)}<div class="stats">${bars}</div></div>
      <p class="card-blurb">${biro.blurb}</p>
    </button>`;
  }).join("");
  const go = $("lets-play");
  go.disabled = !selected;
  go.style.background = selected ? "#008751" : "";
  go.style.color = selected ? "#fff" : "";
  go.style.borderColor = selected ? "#1f2a44" : "";
  $("pick-you").textContent = `YOU · ${INK[pickPlayer]}`;
  $("pick-you").style.color = color;
  $("pick-word").style.color = color;
}

function openPick(player) {
  pickPlayer = player;
  selected = picks[player];
  renderGrid();
  show("screen-pick");
}

function spawnPens() {
  const table = P.TABLE;
  const y = table.y + table.h / 2;
  const inset = Math.min(table.w * 0.18, 90);
  match.pens = [1, 2].map((player) => {
    const def = byId[picks[player]];
    const x = player === 1 ? table.x + inset : table.x + table.w - inset;
    const angle = player === 1 ? -Math.PI / 2 : Math.PI / 2;
    return P.createPen({ x, y }, angle, COLORS[player], def.accent, player, def.length, def.width, def.mass, def.id);
  });
}

function resetRound(starter) {
  spawnPens();
  match.turn = starter;
  match.phase = "aim";
  match.concludeAt = 0;
  match.drag = null;
  aiStarted = 0;
  $("round-banner").classList.add("hidden");
  paintHud();
}

function labelFor(player) {
  if (mode === "ai") return player === 1 ? "YOU" : "CPU";
  return player === 1 ? "P1" : "P2";
}

function startMatch() {
  match.scores = { 1: 0, 2: 0 };
  match.round = 1;
  match.winner = null;
  match.recorded = false;
  $("match-banner").classList.add("hidden");
  $("label-1").textContent = mode === "ai" ? "YOU" : "P1";
  $("label-2").textContent = mode === "ai" ? "CPU" : "P2";
  show("screen-game");
  resize();
  resetRound(1);
  if (!raf) raf = requestAnimationFrame(frame);
}

function paintHud() {
  $("pts-1").textContent = match.scores[1];
  $("pts-2").textContent = match.scores[2];
  $("round-num").textContent = match.round;
  for (const player of [1, 2]) {
    const box = $(`score-${player}`);
    const active = match.phase === "aim" && match.turn === player;
    box.style.color = COLORS[player];
    box.style.borderColor = active ? COLORS[player] : "rgba(31,42,68,0.15)";
    box.style.boxShadow = active ? `3px 3px 0 ${COLORS[player]}` : "none";
    box.querySelector("span").style.color = COLORS[player];
    box.querySelector("strong").style.color = COLORS[player];
  }
  const pill = $("turn-pill");
  pill.style.display = match.phase === "aim" ? "block" : "none";
  const yours = mode === "friend" || match.turn === 1;
  pill.textContent = yours ? "Your flick" : "Computer dey think…";
  pill.style.color = COLORS[match.turn];
  pill.style.borderColor = COLORS[match.turn];
  $("play").style.cursor = match.phase === "aim" && yours ? "crosshair" : "default";
}

function resize() {
  const stage = $("stage");
  const canvas = $("play");
  const rect = stage.getBoundingClientRect();
  const w = Math.max(320, Math.floor(rect.width));
  const h = Math.max(320, Math.floor(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  view.w = w;
  view.h = h;
  view.scale = Math.min(w / P.VIEW.w, h / P.VIEW.h);
  view.ox = (w - P.VIEW.w * view.scale) / 2;
  view.oy = (h - P.VIEW.h * view.scale) / 2;
}

function worldPoint(event) {
  const rect = $("play").getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - view.ox) / view.scale,
    y: (event.clientY - rect.top - view.oy) / view.scale,
  };
}

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPen(ctx, pen, active) {
  const r = pen.width / 2;
  const half = pen.length / 2;
  const body = () => rounded(ctx, -half - r, -r, pen.length + pen.width, pen.width, r);
  ctx.save();
  ctx.translate(pen.pos.x + 4, pen.pos.y + 6);
  ctx.rotate(pen.angle);
  ctx.fillStyle = "rgba(40,20,5,0.3)";
  body();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(pen.pos.x, pen.pos.y);
  ctx.rotate(pen.angle);
  body();
  ctx.lineWidth = active ? 5 : 3;
  ctx.strokeStyle = pen.color;
  ctx.stroke();
  const cap = (pen.length + pen.width) * 0.3;
  const top = half + r;
  const tail = -half - r;
  ctx.fillStyle = "rgba(238,242,246,0.96)";
  rounded(ctx, tail, -r, pen.length + pen.width, pen.width, r);
  ctx.fill();
  ctx.strokeStyle = "#8d99a6";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(tail + 10, -pen.width * 0.1, top - cap - tail - 10, pen.width * 0.2);
  ctx.fillStyle = pen.accent;
  rounded(ctx, top - cap, -r, cap, pen.width, r);
  ctx.fill();
  ctx.fillRect(top - cap - 2, r - 2, cap * 0.85, 4);
  rounded(ctx, tail, -r + 1, 7, pen.width - 2, Math.min(3, r));
  ctx.fill();
  ctx.restore();
}

function drawAim(ctx) {
  const drag = match.drag;
  if (!drag) return;
  const dx = drag.now.x - drag.start.x;
  const dy = drag.now.y - drag.start.y;
  const len = Math.hypot(dx, dy);
  const power = Math.min(len, 180);
  if (power <= 4) return;
  const ux = dx / len;
  const uy = dy / len;
  const color = `hsl(${Math.round(135 - 135 * (power / 180))}, 75%, 36%)`;
  const tip = power * 0.35;
  ctx.save();
  ctx.strokeStyle = "rgba(31,42,68,0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(drag.contact.x, drag.contact.y);
  ctx.lineTo(drag.contact.x + ux * power, drag.contact.y + uy * power);
  ctx.stroke();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const ax = drag.contact.x - ux * tip;
  const ay = drag.contact.y - uy * tip;
  ctx.beginPath();
  ctx.moveTo(drag.contact.x, drag.contact.y);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(-uy, -ux);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 10 * Math.cos(ang - 0.5), ay - 10 * Math.sin(ang - 0.5));
  ctx.lineTo(ax - 10 * Math.cos(ang + 0.5), ay - 10 * Math.sin(ang + 0.5));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "rgba(31,42,68,0.25)";
  ctx.fillRect(drag.contact.x - 30, drag.contact.y + 22, 60, 5);
  ctx.fillStyle = color;
  ctx.fillRect(drag.contact.x - 30, drag.contact.y + 22, 60 * (power / 180), 5);
  ctx.restore();
}

function render() {
  const ctx = $("play").getContext("2d");
  const table = P.TABLE;
  ctx.fillStyle = "#f7f3e6";
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = "#bcd5ea";
  for (let y = 31; y < view.h; y += 32) ctx.fillRect(0, y, view.w, 1);
  ctx.fillStyle = "#e48a8a";
  ctx.fillRect(47, 0, 2, view.h);
  ctx.save();
  ctx.transform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  if (!deskCache) deskCache = paintDesk(table.w, table.h, "Permanent Marker");
  ctx.fillStyle = "rgba(60,35,15,0.22)";
  ctx.fillRect(table.x + 8, table.y + 12, table.w, table.h);
  ctx.drawImage(deskCache, table.x, table.y, table.w, table.h);
  ctx.strokeStyle = "#5b3a1e";
  ctx.lineWidth = 8;
  ctx.strokeRect(table.x - 4, table.y - 4, table.w + 8, table.h + 8);
  ctx.strokeStyle = "rgba(255,225,180,0.25)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(table.x + 1, table.y + 1, table.w - 2, table.h - 2);
  for (const pen of match.pens) drawPen(ctx, pen, pen.player === match.turn && match.phase === "aim");
  for (const pen of match.pens) {
    if (!pen.offTable) continue;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 150);
    ctx.save();
    ctx.strokeStyle = `rgba(198,40,40,${0.55 + 0.45 * pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(pen.pos.x, pen.pos.y, pen.length * 0.5 + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawAim(ctx);
  if (match.phase === "aim" && !match.drag) {
    const pen = match.pens.find((item) => item.player === match.turn);
    if (pen) {
      const pulse = 4 + 2 * Math.sin(performance.now() / 240);
      ctx.fillStyle = pen.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pen.pos.x, pen.pos.y, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function flick(pen, contact, dir, power) {
  P.impulse(pen, contact, dir, power);
  BiroSound.flick(Math.min(power, 1620) / 1620);
  match.phase = "settling";
  match.drag = null;
  aiStarted = 0;
  paintHud();
}

function finishRound(kind, winner) {
  match.phase = "round-over";
  const banner = $("round-banner");
  if (kind === "draw") {
    banner.innerHTML = `<div class="result" style="border-color:#d98f00;box-shadow:3px 3px 0 #d98f00"><p class="kicker">Double Knockout</p><h3 class="marker" style="color:#d98f00">Draw</h3></div>`;
  } else {
    match.scores[winner] += 1;
    const color = COLORS[winner];
    banner.innerHTML = `<div class="result" style="border-color:${color};box-shadow:3px 3px 0 ${color}"><p class="kicker">Round Won</p><h3 class="marker" style="color:${color}">${labelFor(winner)}</h3></div>`;
    if (match.scores[winner] >= 2) {
      match.winner = winner;
      match.phase = "match-over";
      showMatch();
      banner.classList.add("hidden");
      paintHud();
      return;
    }
  }
  banner.classList.remove("hidden");
  paintHud();
  const loser = kind === "win" ? (winner === 1 ? 2 : 1) : match.turn === 1 ? 2 : 1;
  setTimeout(() => {
    if (match.phase !== "round-over") return;
    match.round += 1;
    resetRound(loser);
  }, 1700);
}

function showMatch() {
  const winner = match.winner;
  const color = COLORS[winner];
  const line = mode === "ai"
    ? (winner === 1 ? "Na you be the champion!" : "Computer don beat you. Try again!")
    : (winner === 1 ? "Blue ink don win the desk!" : "Red ink don win the desk!");
  $("match-banner").innerHTML = `<div class="result" style="border-color:${color};box-shadow:3px 3px 0 ${color}">
    <p class="kicker">Match Winner</p>
    <h3 class="marker" style="color:${color}">${labelFor(winner)}</h3>
    <p class="line">${line}</p>
    <div class="actions">
      <button class="btn btn-green" id="again" type="button">Play Again</button>
      <button class="btn" id="menu" type="button">Main Menu</button>
    </div>
  </div>`;
  $("match-banner").classList.remove("hidden");
  if (mode === "ai") record(winner === 1);
  $("again").onclick = () => startMatch();
  $("menu").onclick = goHome;
}

function loadBoard() {
  try {
    const data = JSON.parse(localStorage.getItem(BOARD_KEY) || "{}");
    return { name: typeof data.name === "string" ? data.name : "You", rows: Array.isArray(data.rows) ? data.rows : [] };
  } catch {
    return { name: "You", rows: [] };
  }
}

function record(win) {
  if (match.recorded) return;
  match.recorded = true;
  const board = loadBoard();
  const name = board.name || "You";
  const row = board.rows.find((item) => item.name === name) || { name, wins: 0, losses: 0, played: 0 };
  row.played += 1;
  if (win) row.wins += 1;
  else row.losses += 1;
  board.rows = [row, ...board.rows.filter((item) => item.name !== name)];
  board.rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  localStorage.setItem(BOARD_KEY, JSON.stringify(board));
}

function step(dt) {
  if (match.phase !== "settling") return;
  if (match.pens.every(P.settled) && !match.pens.some((pen) => pen.offTable)) {
    match.turn = match.turn === 1 ? 2 : 1;
    match.phase = "aim";
    paintHud();
    BiroSound.setMotion(0, 0);
    return;
  }
  const impact = P.stepPair(match.pens, P.TABLE, dt);
  if (impact > 0) BiroSound.contact(impact);
  let omega = 0;
  let speed = 0;
  for (const pen of match.pens) {
    if (pen.offTable) continue;
    omega = Math.max(omega, Math.abs(pen.omega));
    speed = Math.max(speed, Math.hypot(pen.vel.x, pen.vel.y));
  }
  BiroSound.setMotion(omega, speed);
  judge(performance.now());
}

function judge(now) {
  if (match.phase !== "settling") return;
  if (match.concludeAt) {
    if (now >= match.concludeAt) {
      const pending = match.pending;
      match.concludeAt = 0;
      if (pending.kind === "draw") finishRound("draw");
      else finishRound("win", pending.winner);
    }
    return;
  }
  const gone = match.pens.filter((pen) => pen.offTable);
  const moving = match.pens.some((pen) => !pen.offTable && !P.settled(pen));
  const mostly = (pen) => P.offFraction(pen, P.TABLE) >= 0.9;
  if (!match.pens.every(P.settled) && gone.length < 2 && !(gone.length === 1 && !moving)) return;
  if (gone.length >= 2) {
    match.pending = { kind: "draw" };
    match.concludeAt = now + (gone.every(mostly) ? 0 : 900);
  } else if (gone.length === 1 && !moving && (mostly(gone[0]) || P.settled(gone[0]))) {
    match.pending = { kind: "win", winner: gone[0].player === 1 ? 2 : 1 };
    match.concludeAt = now + (mostly(gone[0]) ? 0 : 900);
  } else if (gone.length === 0 && match.pens.every(P.settled)) {
    match.turn = match.turn === 1 ? 2 : 1;
    match.phase = "aim";
    paintHud();
  }
  if (match.concludeAt && now >= match.concludeAt) {
    const pending = match.pending;
    match.concludeAt = 0;
    if (pending.kind === "draw") finishRound("draw");
    else finishRound("win", pending.winner);
  }
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if ($("screen-game").classList.contains("hidden")) return;
  const dt = Math.min(1 / 30, (now - (last || now)) / 1000);
  last = now;
  step(dt);
  if (mode === "ai" && match.phase === "aim" && match.turn === 2 && !match.winner) runAi(now);
  render();
}

function runAi(now) {
  if (!aiStarted) aiStarted = now;
  const elapsed = now - aiStarted;
  const cpu = match.pens.find((pen) => pen.player === 2);
  const you = match.pens.find((pen) => pen.player === 1);
  if (!cpu || !you) return;
  const table = P.TABLE;
  const aimX = you.pos.x + (you.pos.x - (table.x + table.w / 2)) * 0.18;
  const aimY = you.pos.y + (you.pos.y - (table.y + table.h / 2)) * 0.18;
  const angle = Math.atan2(aimY - cpu.pos.y, aimX - cpu.pos.x);
  const dist = Math.min(180, Math.max(85, 0.7 * Math.hypot(you.pos.x - cpu.pos.x, you.pos.y - cpu.pos.y)));
  const grip = 0.22 * cpu.length;
  const contact = { x: cpu.pos.x - Math.cos(angle) * grip, y: cpu.pos.y - Math.sin(angle) * grip };
  const pull = { x: contact.x - Math.cos(angle) * dist, y: contact.y - Math.sin(angle) * dist };
  if (elapsed < 450) return;
  if (elapsed < 1050) {
    const t = 1 - (1 - (elapsed - 450) / 600) ** 2;
    match.drag = {
      start: contact,
      now: { x: contact.x + (pull.x - contact.x) * t, y: contact.y + (pull.y - contact.y) * t },
      contact,
      pen: cpu,
    };
    return;
  }
  aiStarted = 0;
  flick(cpu, contact, { x: Math.cos(angle), y: Math.sin(angle) }, 9 * dist);
}

function onDown(event) {
  if (match.phase !== "aim") return;
  if (mode === "ai" && match.turn === 2) return;
  const point = worldPoint(event);
  const pen = match.pens.find((item) => item.player === match.turn);
  if (!pen || !P.hitsPen(pen, point, 10)) return;
  try { $("play").setPointerCapture(event.pointerId); } catch { /* already captured */ }
  match.drag = { start: point, now: point, contact: P.clampToPen(pen, point), pen };
}

function onMove(event) {
  if (!match.drag) return;
  match.drag.now = worldPoint(event);
}

function onUp(event) {
  if (!match.drag) return;
  const drag = match.drag;
  const point = worldPoint(event);
  const dx = point.x - drag.start.x;
  const dy = point.y - drag.start.y;
  const len = Math.min(Math.hypot(dx, dy), 180);
  match.drag = null;
  if (len < 6) return;
  flick(drag.pen, drag.contact, { x: -dx, y: -dy }, 9 * len);
}

function modal(html) {
  $("modals").innerHTML = `<div class="modal-back" id="modal-back"><div class="modal">${html}</div></div>`;
  $("modal-back").addEventListener("click", (event) => {
    if (event.target.id === "modal-back") closeModal();
  });
  $("modals").querySelectorAll("[data-close]").forEach((node) => node.addEventListener("click", closeModal));
}
function closeModal() { $("modals").innerHTML = ""; }

function openHow() {
  modal(`<button class="close-x" data-close type="button">×</button>
    <h2>How to Play?</h2>
    <ol class="rules">
      <li>Two players take turns flicking their biros on the desk.</li>
      <li>Click and drag <b style="color:#1f4fbf">YOUR biro</b> backwards, like a catapult. Longer drag = harder flick.</li>
      <li>Flick off-centre to add <b>spin</b> and make it rebound.</li>
      <li>Knock your opponent's biro off the desk to win the round.</li>
      <li>First player to <b style="color:#008751">2 rounds</b> wins the match.</li>
    </ol>`);
}

function openFriend() {
  modal(`<button class="close-x" data-close type="button">×</button>
    <h2 class="marker">Play with a <span style="color:#c62828">Friend</span></h2>
    <div class="stack">
      <button class="btn choice btn-green" id="same-desk" type="button">Same desk<small>Pass the phone. Each of you picks a biro.</small></button>
    </div>`);
  $("same-desk").onclick = () => {
    closeModal();
    BiroSound.ui();
    mode = "friend";
    picks = { 1: null, 2: null };
    openPick(1);
  };
}

function openBoard() {
  const board = loadBoard();
  const rows = board.rows.length
    ? `<table><thead><tr><th>#</th><th>Player</th><th class="num">Wins</th><th class="num">Losses</th><th class="num">Win %</th></tr></thead><tbody>
      ${board.rows.map((row, index) => {
        const rank = index + 1;
        const pct = row.played ? `${Math.round((row.wins / row.played) * 100)}%` : "–";
        const medal = ["", "🥇", "🥈", "🥉"][rank] || rank;
        const cls = row.name === board.name ? "me" : rank <= 3 ? "top3" : "";
        const you = row.name === board.name ? " (you)" : "";
        return `<tr class="${cls}"><td>${medal}</td><td>${row.name}${you}</td><td class="num" style="color:#008751;font-weight:800">${row.wins}</td><td class="num">${row.losses}</td><td class="num">${pct}</td></tr>`;
      }).join("")}
    </tbody></table>`
    : `<p class="empty">Nobody has won a match yet. The top spot dey wait for you!</p>`;
  modal(`<button class="close-x" data-close type="button">×</button>
    <h2 class="marker">🏆 Leader<span style="color:#c62828">board</span></h2>
    <p class="empty" style="margin-top:0">Most wins vs computer · ${board.rows.length} ranked</p>
    <div class="name-row"><input id="board-name" maxlength="20" value="${board.name.replace(/"/g, "")}" /><button class="btn" id="save-name" type="button">Save</button></div>
    ${rows}`);
  $("save-name").onclick = () => {
    const data = loadBoard();
    data.name = $("board-name").value.trim().slice(0, 20) || "You";
    localStorage.setItem(BOARD_KEY, JSON.stringify(data));
    openBoard();
  };
}

function goHome() {
  match.phase = "menu";
  BiroSound.setMotion(0, 0);
  show("screen-home");
}

function paintHomeDesk() {
  const canvas = $("home-desk");
  canvas.getContext("2d").drawImage(paintDesk(1724, 784, "Permanent Marker"), 0, 0);
}

function syncSoundButtons() {
  for (const button of $("soundbar").querySelectorAll("button")) {
    const on = BiroSound.prefs[button.dataset.key];
    button.classList.toggle("off", !on);
    button.setAttribute("aria-pressed", String(on));
    button.querySelector(".ico").textContent = on ? "🔊" : "🔇";
  }
}

function boot() {
  document.fonts?.load('48px "Permanent Marker"').then(() => paintHomeDesk());
  paintHomeDesk();
  syncSoundButtons();
  $("play-ai").onclick = () => {
    BiroSound.unlock();
    BiroSound.ui();
    mode = "ai";
    picks = { 1: null, 2: "bic" };
    openPick(1);
  };
  $("play-friend").onclick = () => {
    BiroSound.unlock();
    openFriend();
  };
  $("how").onclick = openHow;
  $("open-board").onclick = openBoard;
  $("pick-back").onclick = () => (pickPlayer === 2 && mode === "friend" ? show("screen-pass") : goHome());
  $("biro-grid").onclick = (event) => {
    const card = event.target.closest("[data-id]");
    if (!card) return;
    selected = card.dataset.id;
    BiroSound.ui();
    renderGrid();
  };
  $("lets-play").onclick = () => {
    if (!selected) return;
    picks[pickPlayer] = selected;
    BiroSound.ui();
    if (mode === "friend" && pickPlayer === 1) show("screen-pass");
    else startMatch();
  };
  $("pass-ready").onclick = () => {
    BiroSound.ui();
    openPick(2);
  };
  $("exit").onclick = goHome;
  const canvas = $("play");
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("resize", () => {
    if (!$("screen-game").classList.contains("hidden")) resize();
  });
  $("soundbar").onclick = (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    BiroSound.unlock();
    BiroSound.setPref(button.dataset.key, !BiroSound.prefs[button.dataset.key]);
    syncSoundButtons();
  };
  $("lock-land").onclick = async () => {
    try { await document.documentElement.requestFullscreen(); } catch { /* optional */ }
    try { await screen.orientation?.lock?.("landscape"); } catch { /* rotation lock */ }
  };
  document.addEventListener("pointerdown", () => BiroSound.unlock(), { once: false });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot();
