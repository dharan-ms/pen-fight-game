/* Flick and pen-clack. No recorded audio. */
(function (root) {
  const KEY = "biro-sound-prefs";
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    stored = {};
  }
  const prefs = { effects: true, ...stored };

  let ctx = null;
  let motionGain = null;
  let unlocked = false;

  function save() {
    localStorage.setItem(KEY, JSON.stringify({ effects: prefs.effects }));
  }

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function ensureMotion() {
    const audio = context();
    if (!audio || motionGain) return;
    motionGain = audio.createGain();
    motionGain.gain.value = 0;
    const scrape = audio.createBufferSource();
    const scrapeBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const sd = scrapeBuf.getChannelData(0);
    for (let i = 0; i < sd.length; i++) sd[i] = (Math.random() * 2 - 1) * (0.4 + 0.6 * Math.sin(i / 80));
    scrape.buffer = scrapeBuf;
    scrape.loop = true;
    const band = audio.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900;
    band.Q.value = 0.7;
    scrape.connect(band);
    band.connect(motionGain);
    motionGain.connect(audio.destination);
    scrape.start();
  }

  function unlock() {
    const audio = context();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    unlocked = true;
    ensureMotion();
  }

  function setPref(key, value) {
    if (key !== "effects") return;
    prefs[key] = value;
    save();
    if (!value) setMotion(0, 0);
    window.dispatchEvent(new CustomEvent("biro-sound-pref"));
  }

  function tone(freq, dur, type, gainValue, slide) {
    if (!prefs.effects) return;
    const audio = context();
    if (!audio || !unlocked) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), audio.currentTime + dur);
    gain.gain.setValueAtTime(gainValue, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur + 0.02);
  }

  function setMotion(omega, speed) {
    if (!motionGain || !ctx) return;
    const level = prefs.effects ? Math.min(0.08, omega * 0.004 + speed * 0.00005) : 0;
    motionGain.gain.cancelScheduledValues(ctx.currentTime);
    motionGain.gain.linearRampToValueAtTime(level, ctx.currentTime + 0.05);
  }

  window.BiroSound = {
    get prefs() {
      return prefs;
    },
    unlock,
    setPref,
    flick(amount) {
      tone(180 + amount * 220, 0.12 + amount * 0.08, "triangle", 0.05 + amount * 0.06, 90);
    },
    contact(strength) {
      const n = Math.min(1, strength / 400);
      tone(140 + n * 80, 0.07, "square", 0.03 + n * 0.07, 70);
    },
    ui() {
      tone(520, 0.06, "sine", 0.03, 740);
    },
    setMotion,
  };
})(window);
