/* Procedural wooden desk with classroom doodles. Seeded so every load matches. */
(function (root) {
  const INK = ["28,52,150", "25,25,30", "180,30,30"];
  const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

  function paintDesk(width, height, markerFamily) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g) return canvas;

    let seed = 0x134da15;
    const rnd = () => {
      seed = (16807 * seed) % 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const range = (a, b) => a + rnd() * (b - a);
    const pick = (list) => list[Math.floor(rnd() * list.length)];

    const wood = g.createLinearGradient(0, 0, 0, height);
    wood.addColorStop(0, "#b47c47");
    wood.addColorStop(1, "#9c6637");
    g.fillStyle = wood;
    g.fillRect(0, 0, width, height);

    const band = height / 3;
    for (let row = 0; row < 3; row++) {
      g.fillStyle = row % 2 === 0 ? "rgba(255,235,200,0.05)" : "rgba(60,30,10,0.06)";
      g.fillRect(0, row * band, width, band);
      if (row > 0) {
        g.fillStyle = "rgba(55,28,10,0.55)";
        g.fillRect(0, row * band - 2, width, 4);
        g.fillStyle = "rgba(30,15,5,0.35)";
        for (let x = 0; x < width; x += range(4, 30)) {
          g.fillRect(x, row * band - 3, range(3, 18), range(5, 8));
        }
      }
    }

    for (let i = 0; i < 160; i++) {
      const y0 = rnd() * height;
      const amp = 2 + 6 * rnd();
      const freq = 0.002 + 0.004 * rnd();
      const phase = rnd() * Math.PI * 2;
      g.strokeStyle = `rgba(70,38,14,${0.05 + 0.12 * rnd()})`;
      g.lineWidth = 0.6 + 1.6 * rnd();
      g.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const y = y0 + Math.sin(x * freq + phase) * amp;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const rad = 10 + 14 * rnd();
      for (let ring = 0; ring < 3; ring++) {
        g.strokeStyle = `rgba(70,38,14,${0.3 - 0.08 * ring})`;
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(x, y, rad + 7 * ring, (rad + 7 * ring) * 0.4, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }

    const blot = (x, y, rad, rgb, alpha) => {
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${rgb},${alpha})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    };
    for (let i = 0; i < 30; i++) blot(rnd() * width, rnd() * height, range(60, 230), "45,22,6", range(0.08, 0.22));
    for (let i = 0; i < 9; i++) blot(rnd() * width, rnd() * height, range(80, 200), "255,225,185", range(0.05, 0.12));

    for (const [x0, y0, x1, y1] of [
      [0, 0, 0, 80],
      [0, height, 0, height - 80],
      [0, 0, 80, 0],
      [width, 0, width - 80, 0],
    ]) {
      const shade = g.createLinearGradient(x0, y0, x1, y1);
      shade.addColorStop(0, "rgba(35,18,5,0.4)");
      shade.addColorStop(1, "rgba(35,18,5,0)");
      g.fillStyle = shade;
      g.fillRect(0, 0, width, height);
    }

    const blob = (x, y, rad) => {
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = rad * range(0.65, 1.2);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
    };

    for (let i = 0; i < 6; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const rad = range(28, 46);
      g.fillStyle = "rgba(70,35,10,0.06)";
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = `rgba(70,35,10,${range(0.2, 0.35)})`;
      g.lineWidth = range(2.5, 5);
      const start = rnd() * Math.PI * 2;
      g.beginPath();
      g.arc(x, y, rad, start, start + range(1.2 * Math.PI, 2 * Math.PI));
      g.stroke();
    }

    for (let i = 0; i < 14; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const rad = range(4, 20);
      g.fillStyle = `rgba(${pick(INK)},${range(0.45, 0.8)})`;
      blob(x, y, rad);
      g.fill();
      const drops = Math.floor(range(3, 10));
      for (let d = 0; d < drops; d++) {
        const a = rnd() * Math.PI * 2;
        const dist = rad * range(1.3, 3);
        g.beginPath();
        g.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, range(0.8, 3), 0, Math.PI * 2);
        g.fill();
      }
    }

    for (let i = 0; i < 6; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const rad = range(12, 30);
      g.fillStyle = `rgba(246,244,236,${range(0.65, 0.9)})`;
      blob(x, y, rad);
      g.fill();
      if (rnd() > 0.5) g.fillRect(x - 2, y, range(3, 5), rad + range(10, 30));
    }

    const scratch = (x, y, len, angle) => {
      g.strokeStyle = rnd() > 0.45 ? `rgba(255,225,185,${range(0.1, 0.32)})` : `rgba(40,20,5,${range(0.1, 0.3)})`;
      g.lineWidth = range(0.4, 1.5);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(
        x + Math.cos(angle) * len * 0.5 + range(-3, 3),
        y + Math.sin(angle) * len * 0.5 + range(-3, 3),
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len
      );
      g.stroke();
    };
    for (let i = 0; i < 1100; i++) scratch(rnd() * width, rnd() * height, range(5, 70), rnd() * Math.PI * 2);
    for (let i = 0; i < 25; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const angle = rnd() * Math.PI * 2;
      const n = Math.floor(range(3, 9));
      for (let k = 0; k < n; k++) scratch(x + k * range(2, 6), y + k * range(1, 5), range(30, 120), angle + range(-0.08, 0.08));
    }

    for (let i = 0; i < 45; i++) {
      let x = rnd() * width;
      let y = rnd() * height;
      let angle = rnd() * Math.PI * 2;
      const pts = [[x, y]];
      const n = Math.floor(range(2, 6));
      for (let k = 0; k < n; k++) {
        angle += range(-0.6, 0.6);
        const step = range(8, 40);
        x += Math.cos(angle) * step;
        y += Math.sin(angle) * step;
        pts.push([x, y]);
      }
      const w = range(1.5, 4);
      for (const [ox, color, lw] of [
        [1.4, "rgba(255,225,185,0.18)", 0.6 * w],
        [0, `rgba(35,16,4,${range(0.35, 0.6)})`, w],
      ]) {
        g.strokeStyle = color;
        g.lineWidth = lw;
        g.lineCap = "round";
        g.beginPath();
        pts.forEach(([px, py], index) => (index === 0 ? g.moveTo(px + ox, py + ox) : g.lineTo(px + ox, py + ox)));
        g.stroke();
      }
    }

    const marker = (text, x, y, size, rot) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.font = `${size}px ${markerFamily}, cursive`;
      g.textAlign = "center";
      g.fillStyle = "rgba(255,230,190,0.14)";
      g.fillText(text, 2, 2);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = `rgba(45,22,6,${range(0.12, 0.22)})`;
        g.fillText(text, range(-1.5, 1.5), range(-1.5, 1.5));
      }
      g.restore();
    };

    const hand = (text, x, y, size, rot, ink = pick(INK), align = "center") => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.font = `${size}px ${HAND}`;
      g.textAlign = align;
      g.fillStyle = `rgba(${ink},${range(0.55, 0.8)})`;
      g.fillText(text, 0, 0);
      g.fillText(text, 0.6, 0.3);
      g.restore();
    };

    const heart = (x, y, size) => {
      g.beginPath();
      g.moveTo(x, y + 0.35 * size);
      g.bezierCurveTo(x - 1.1 * size, y - 0.35 * size, x - 0.5 * size, y - 1.1 * size, x, y - 0.45 * size);
      g.bezierCurveTo(x + 0.5 * size, y - 1.1 * size, x + 1.1 * size, y - 0.35 * size, x, y + 0.35 * size);
      g.closePath();
    };

    marker("No school go home", 0.3 * width, 0.3 * height, 70, -0.08);
    hand("Lekan was here", 0.83 * width, 0.12 * height, 26, 0.05, INK[1]);

    g.save();
    g.translate(0.66 * width, 0.72 * height);
    g.rotate(0.06);
    g.strokeStyle = `rgba(${INK[2]},0.7)`;
    g.lineWidth = 3;
    heart(0, 70, 200);
    g.stroke();
    g.beginPath();
    g.moveTo(-240, -40);
    g.lineTo(240, -110);
    g.stroke();
    g.beginPath();
    g.moveTo(240, -110);
    g.lineTo(218, -116);
    g.moveTo(240, -110);
    g.lineTo(226, -92);
    g.stroke();
    g.font = `34px ${HAND}`;
    const leftW = g.measureText("Khadijat ").width;
    const total = leftW + 28 + g.measureText(" John").width;
    g.restore();
    g.save();
    g.translate(0.66 * width, 0.72 * height);
    g.rotate(0.06);
    hand("Khadijat ", -total / 2, 10, 34, 0, INK[0], "left");
    g.fillStyle = `rgba(${INK[2]},0.85)`;
    heart(-total / 2 + leftW + 14, 6, 18);
    g.fill();
    hand(" John", -total / 2 + leftW + 28, 10, 34, 0, INK[0], "left");
    g.restore();

    for (const line of ["JSS 2B", "Messsi", "Chidi was here", "No noise!", "Class Captain", "SS1 C", "2 - 1", "Emeka", "WAEC loading..."]) {
      marker(line, range(0.05, 0.95) * width, range(0.08, 0.95) * height, range(34, 56), range(-0.4, 0.4));
    }
    for (const line of [
      "Maths na wa o",
      "Names of noice makers",
      "Mr Adeyemi is smelling",
      "Tunde give my money",
      "Arsenal 4 life",
      "Who took my biro?",
      "Kemi + Seyi",
      "Jollof > Fried rice",
      "Samuel Alajo",
      "Home work??",
      "I don tire",
      "1 + 1 = 11",
      "Bola is a goat",
      "Prefect",
      "no talking",
    ]) {
      hand(line, range(0.06, 0.94) * width, range(0.06, 0.96) * height, range(18, 30), range(-0.5, 0.5));
    }

    const inkStroke = (rgb, w = 2) => {
      g.strokeStyle = `rgba(${rgb},${range(0.5, 0.75)})`;
      g.lineWidth = w;
      g.lineCap = "round";
    };

    for (let i = 0; i < 16; i++) {
      let x = rnd() * width;
      let y = rnd() * height;
      inkStroke(pick(INK), range(1, 2));
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 40; k++) {
        const nx = x + range(-14, 14);
        const ny = y + range(-9, 9);
        g.quadraticCurveTo((x + nx) / 2 + range(-10, 10), (y + ny) / 2 + range(-10, 10), nx, ny);
        x = nx;
        y = ny;
      }
      g.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const n = Math.floor(range(1, 4));
      inkStroke(pick(INK));
      for (let k = 0; k < n; k++) {
        const ox = x + 34 * k;
        g.beginPath();
        for (let s = 0; s < 4; s++) {
          g.moveTo(ox + 6 * s, y);
          g.lineTo(ox + 6 * s + range(-2, 2), y + 26);
        }
        g.moveTo(ox - 4, y + 20);
        g.lineTo(ox + 24, y + 4);
        g.stroke();
      }
    }

    for (let i = 0; i < 3; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const cell = range(18, 26);
      inkStroke(pick(INK));
      g.beginPath();
      for (const k of [1, 2]) {
        g.moveTo(x + k * cell, y);
        g.lineTo(x + k * cell, y + 3 * cell);
        g.moveTo(x, y + k * cell);
        g.lineTo(x + 3 * cell, y + k * cell);
      }
      g.stroke();
      for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
        if (rnd() < 0.4) continue;
        const cx = x + ((cellIndex % 3) + 0.5) * cell;
        const cy = y + (Math.floor(cellIndex / 3) + 0.5) * cell;
        const a = 0.28 * cell;
        g.beginPath();
        if (rnd() > 0.5) {
          g.moveTo(cx - a, cy - a);
          g.lineTo(cx + a, cy + a);
          g.moveTo(cx + a, cy - a);
          g.lineTo(cx - a, cy + a);
        } else g.arc(cx, cy, a, 0, Math.PI * 2);
        g.stroke();
      }
    }

    for (let i = 0; i < 14; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const size = range(8, 18);
      const kind = Math.floor(3 * rnd());
      inkStroke(pick(INK), 1.6);
      g.beginPath();
      if (kind === 0) {
        for (let p = 0; p <= 5; p++) {
          const a = -Math.PI / 2 + ((4 * Math.PI) / 5) * p;
          const px = x + Math.cos(a) * size;
          const py = y + Math.sin(a) * size;
          if (p === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();
      } else if (kind === 1) {
        g.arc(x, y, size, 0, Math.PI * 2);
        g.moveTo(x + 0.55 * size, y + 0.2 * size);
        g.arc(x, y + 0.2 * size, 0.55 * size, 0, Math.PI);
        g.stroke();
        g.fillStyle = g.strokeStyle;
        g.fillRect(x - 0.4 * size, y - 0.35 * size, 2.5, 2.5);
        g.fillRect(x + 0.3 * size, y - 0.35 * size, 2.5, 2.5);
      } else {
        heart(x, y, size);
        g.stroke();
      }
    }

    for (let i = 0; i < 6; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const span = range(30, 80);
      g.strokeStyle = "rgba(60,60,65,0.18)";
      g.lineWidth = 1;
      g.beginPath();
      for (let k = 0; k < span; k += 3) {
        g.moveTo(x + k, y);
        g.lineTo(x + k - 0.4 * span, y + 0.6 * span);
      }
      g.stroke();
    }

    const image = g.getImageData(0, 0, width, height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (rnd() - 0.5) * 26;
      data[i] += n;
      data[i + 1] += n;
      data[i + 2] += n;
    }
    g.putImageData(image, 0, 0);
    return canvas;
  }

  root.paintDesk = paintDesk;
})(typeof globalThis !== "undefined" ? globalThis : window);
