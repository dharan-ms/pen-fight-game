/* Desk biro physics: capsule-vs-capsule impulse, friction, and table exits. */
(function (root) {
  function createPen(pos, angle, color, accent, player, length, width, mass, archetype) {
    return {
      pos: { x: pos.x, y: pos.y },
      vel: { x: 0, y: 0 },
      angle,
      omega: 0,
      length,
      width,
      mass,
      inertia: (1 / 12) * mass * length * length,
      color,
      accent,
      archetype,
      player,
      offTable: false,
    };
  }

  function ends(pen) {
    const c = Math.cos(pen.angle) * (pen.length / 2);
    const s = Math.sin(pen.angle) * (pen.length / 2);
    return {
      a: { x: pen.pos.x - c, y: pen.pos.y - s },
      b: { x: pen.pos.x + c, y: pen.pos.y + s },
    };
  }

  function radius(pen) {
    return pen.width / 2;
  }

  function pointVel(vel, omega, r) {
    return { x: vel.x - omega * r.y, y: vel.y + omega * r.x };
  }

  function closestSegments(a1, a2, b1, b2) {
    const s = { x: a2.x - a1.x, y: a2.y - a1.y };
    const a = { x: b2.x - b1.x, y: b2.y - b1.y };
    const i = { x: a1.x - b1.x, y: a1.y - b1.y };
    const c = s.x * s.x + s.y * s.y;
    const d = a.x * a.x + a.y * a.y;
    const u = a.x * i.x + a.y * i.y;
    let n;
    let o;
    if (c <= 1e-8 && d <= 1e-8) {
      n = 0;
      o = 0;
    } else if (c <= 1e-8) {
      n = 0;
      o = Math.max(0, Math.min(1, u / d));
    } else {
      const e = s.x * i.x + s.y * i.y;
      if (d <= 1e-8) {
        o = 0;
        n = Math.max(0, Math.min(1, -e / c));
      } else {
        const t = s.x * a.x + s.y * a.y;
        const r = c * d - t * t;
        n = r !== 0 ? Math.max(0, Math.min(1, (t * u - e * d) / r)) : 0;
        o = (t * n + u) / d;
        if (o < 0) {
          o = 0;
          n = Math.max(0, Math.min(1, -e / c));
        } else if (o > 1) {
          o = 1;
          n = Math.max(0, Math.min(1, (t - e) / c));
        }
      }
    }
    const c1 = { x: a1.x + s.x * n, y: a1.y + s.y * n };
    const c2 = { x: b1.x + a.x * o, y: b1.y + a.y * o };
    const f = c2.x - c1.x;
    const h = c2.y - c1.y;
    return { c1, c2, distSq: f * f + h * h };
  }

  function collide(e, t) {
    const n = ends(e);
    const o = ends(t);
    const hit = closestSegments(n.a, n.b, o.a, o.b);
    const reach = radius(e) + radius(t);
    if (hit.distSq >= reach * reach) return 0;
    let nx;
    let ny;
    const dist = Math.sqrt(hit.distSq);
    if (dist > 1e-6) {
      nx = (hit.c2.x - hit.c1.x) / dist;
      ny = (hit.c2.y - hit.c1.y) / dist;
    } else {
      nx = 1;
      ny = 0;
    }
    const overlap = reach - dist;
    const im1 = 1 / e.mass;
    const im2 = 1 / t.mass;
    const im = im1 + im2;
    e.pos.x -= nx * (im1 / im) * overlap;
    e.pos.y -= ny * (im1 / im) * overlap;
    t.pos.x += nx * (im2 / im) * overlap;
    t.pos.y += ny * (im2 / im) * overlap;
    const mid = { x: (hit.c1.x + hit.c2.x) / 2, y: (hit.c1.y + hit.c2.y) / 2 };
    const r1 = { x: mid.x - e.pos.x, y: mid.y - e.pos.y };
    const r2 = { x: mid.x - t.pos.x, y: mid.y - t.pos.y };
    const v1 = pointVel(e.vel, e.omega, r1);
    const v2 = pointVel(t.vel, t.omega, r2);
    const rvx = v2.x - v1.x;
    const rvy = v2.y - v1.y;
    const relN = rvx * nx + rvy * ny;
    if (relN > 0) return 0;
    const ii1 = 1 / e.inertia;
    const ii2 = 1 / t.inertia;
    const ra = r1.x * ny - r1.y * nx;
    const rb = r2.x * ny - r2.y * nx;
    const jn = (-1.32 * relN) / (im + ra * ra * ii1 + rb * rb * ii2);
    e.vel.x -= jn * nx * im1;
    e.vel.y -= jn * ny * im1;
    e.omega -= (r1.x * (jn * ny) - r1.y * (jn * nx)) * ii1;
    t.vel.x += jn * nx * im2;
    t.vel.y += jn * ny * im2;
    t.omega += (r2.x * (jn * ny) - r2.y * (jn * nx)) * ii2;
    const tx = -ny;
    const ty = nx;
    const ta = r1.x * ty - r1.y * tx;
    const tb = r2.x * ty - r2.y * tx;
    let jt = -(rvx * tx + rvy * ty) / (im + ta * ta * ii1 + tb * tb * ii2);
    const maxF = 0.28 * Math.abs(jn);
    if (jt > maxF) jt = maxF;
    else if (jt < -maxF) jt = -maxF;
    e.vel.x -= jt * tx * im1;
    e.vel.y -= jt * ty * im1;
    e.omega -= (r1.x * (jt * ty) - r1.y * (jt * tx)) * ii1;
    t.vel.x += jt * tx * im2;
    t.vel.y += jt * ty * im2;
    t.omega += (r2.x * (jt * ty) - r2.y * (jt * tx)) * ii2;
    return -relN;
  }

  function integrate(pen, dt) {
    const lin = Math.exp(-2.25 * dt);
    const ang = Math.exp(-1.9 * dt);
    pen.vel.x *= lin;
    pen.vel.y *= lin;
    pen.omega *= ang;
    pen.pos.x += pen.vel.x * dt;
    pen.pos.y += pen.vel.y * dt;
    pen.angle += pen.omega * dt;
    if (pen.vel.x * pen.vel.x + pen.vel.y * pen.vel.y < 36) {
      pen.vel.x = 0;
      pen.vel.y = 0;
    }
    if (Math.abs(pen.omega) < 0.25) pen.omega = 0;
  }

  function settled(pen) {
    return pen.vel.x === 0 && pen.vel.y === 0 && pen.omega === 0;
  }

  function offFraction(pen, table) {
    const r = radius(pen);
    const half = pen.length / 2;
    const nx = half * Math.abs(Math.cos(pen.angle)) + r;
    const ny = half * Math.abs(Math.sin(pen.angle)) + r;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    return Math.max(
      clamp01((table.x - (pen.pos.x - nx)) / (2 * nx)),
      clamp01((pen.pos.x + nx - (table.x + table.w)) / (2 * nx)),
      clamp01((table.y - (pen.pos.y - ny)) / (2 * ny)),
      clamp01((pen.pos.y + ny - (table.y + table.h)) / (2 * ny))
    );
  }

  function centerOut(pen, table) {
    return pen.pos.x < table.x || pen.pos.x > table.x + table.w || pen.pos.y < table.y || pen.pos.y > table.y + table.h;
  }

  function impulse(pen, contact, dir, power) {
    const len = Math.hypot(dir.x, dir.y);
    if (len < 1e-6 || power < 1e-6) return;
    const mag = 0.8 * power;
    const fx = (dir.x / len) * mag;
    const fy = (dir.y / len) * mag;
    const rx = contact.x - pen.pos.x;
    const ry = contact.y - pen.pos.y;
    pen.vel.x += fx / pen.mass;
    pen.vel.y += fy / pen.mass;
    pen.omega += (rx * fy - ry * fx) / pen.inertia;
  }

  function clampToPen(pen, point) {
    const dx = point.x - pen.pos.x;
    const dy = point.y - pen.pos.y;
    const c = Math.cos(pen.angle);
    const s = Math.sin(pen.angle);
    let along = dx * c + dy * s;
    const half = pen.length / 2;
    if (along > half) along = half;
    else if (along < -half) along = -half;
    return { x: pen.pos.x + c * along, y: pen.pos.y + s * along };
  }

  function hitsPen(pen, point, pad = 6) {
    const dx = point.x - pen.pos.x;
    const dy = point.y - pen.pos.y;
    const c = Math.cos(pen.angle);
    const s = Math.sin(pen.angle);
    return !(Math.abs(-dx * s + dy * c) > pen.width / 2 + pad || Math.abs(dx * c + dy * s) > pen.length / 2 + pad);
  }

  function stepPair(pens, table, dt) {
    let impact = 0;
    if (!pens.some((pen) => !settled(pen))) return 0;
    let fastest = 0;
    for (const pen of pens) {
      if (pen.offTable) continue;
      const speed = Math.hypot(pen.vel.x, pen.vel.y) + Math.abs(pen.omega) * (pen.length / 2);
      if (speed > fastest) fastest = speed;
    }
    const sub = Math.min(32, Math.max(1, 4, Math.ceil((fastest * dt) / 3)));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      for (const pen of pens) integrate(pen, h);
      if (pens.length === 2 && !pens[0].offTable && !pens[1].offTable) {
        impact = Math.max(impact, collide(pens[0], pens[1]));
      }
      for (const pen of pens) {
        if (!pen.offTable && centerOut(pen, table)) pen.offTable = true;
      }
    }
    return impact;
  }

  root.BiroPhysics = {
    TABLE: { x: 38, y: 38, w: 1724, h: 784 },
    VIEW: { w: 1800, h: 860 },
    createPen,
    settled,
    offFraction,
    impulse,
    clampToPen,
    hitsPen,
    stepPair,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
