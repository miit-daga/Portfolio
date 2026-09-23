// The resume computer's sounds (retro-computer.tsx), synthesised with the
// Web Audio API, no files. They only ever start from the visitor's own click
// (the yellow button, the start-up it replays), so the automatic start-up on
// arrival stays silent, as browsers require.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
}

// Only once the visitor has clicked something: before that the context is not allowed to run
const live = () => (ctx && ctx.state === "running" ? ctx : null);

function noise(a: AudioContext, seconds: number) {
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    return src;
}

function env(a: AudioContext, g: GainNode, t: number, peak: number, attack: number, hold: number, release: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

// A switch's mechanical click
function click(a: AudioContext, t: number, level = 0.5) {
    const n = noise(a, 0.03);
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    const g = a.createGain();
    env(a, g, t, level, 0.001, 0.002, 0.025);
    n.connect(hp).connect(g).connect(a.destination);
    n.start(t);
    n.stop(t + 0.04);
}

/** Power on: the switch, the tube degaussing ("thoom" with a buzz), a faint whine as it warms. */
export function playPowerOn() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    click(a, t, 0.6);

    // degauss: a low tone that sags, with a mains buzz on it
    const hum = a.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.setValueAtTime(95, t + 0.05);
    hum.frequency.exponentialRampToValueAtTime(48, t + 0.9);
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const hg = a.createGain();
    env(a, hg, t + 0.05, 0.28, 0.03, 0.25, 0.6);
    hum.connect(lp).connect(hg).connect(a.destination);
    hum.start(t + 0.05);
    hum.stop(t + 1);

    const boom = a.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(70, t + 0.05);
    boom.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    const bg = a.createGain();
    env(a, bg, t + 0.05, 0.5, 0.01, 0.05, 0.45);
    boom.connect(bg).connect(a.destination);
    boom.start(t + 0.05);
    boom.stop(t + 0.6);

    // the high whine of the flyback, faint and fading in
    const whine = a.createOscillator();
    whine.type = "sine";
    whine.frequency.value = 7800;
    const wg = a.createGain();
    wg.gain.setValueAtTime(0.0001, t + 0.3);
    wg.gain.exponentialRampToValueAtTime(0.012, t + 0.8);
    wg.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    whine.connect(wg).connect(a.destination);
    whine.start(t + 0.3);
    whine.stop(t + 2.5);
}

/** Power off: the switch, and the picture collapsing with a falling zap and a crackle. */
export function playPowerOff() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    click(a, t, 0.6);

    const zap = a.createOscillator();
    zap.type = "triangle";
    zap.frequency.setValueAtTime(1400, t + 0.02);
    zap.frequency.exponentialRampToValueAtTime(60, t + 0.32);
    const zg = a.createGain();
    env(a, zg, t + 0.02, 0.22, 0.005, 0.03, 0.3);
    zap.connect(zg).connect(a.destination);
    zap.start(t + 0.02);
    zap.stop(t + 0.4);

    const crackle = noise(a, 0.35);
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3000;
    bp.Q.value = 0.7;
    const cg = a.createGain();
    env(a, cg, t + 0.02, 0.12, 0.005, 0.02, 0.3);
    crackle.connect(bp).connect(cg).connect(a.destination);
    crackle.start(t + 0.02);
    crackle.stop(t + 0.4);
}

/** The PC speaker's beep when the self test passes. Silent unless sound is already allowed. */
export function playPostBeep() {
    const a = live();
    if (!a) return;
    const t = a.currentTime + 0.01;
    const o = a.createOscillator();
    o.type = "square";
    o.frequency.value = 880;
    const g = a.createGain();
    env(a, g, t, 0.06, 0.003, 0.11, 0.02);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.16);
}

/** A disk seek: a soft tick, for the drive light. */
export function playDiskTick() {
    const a = live();
    if (!a) return;
    click(a, a.currentTime + 0.005, 0.12);
}

/** A dot-matrix printer: lines of rasping print-head chatter, each followed by a paper feed. */
export function playPrinter(lines = 7, lineSeconds = 0.26) {
    const a = audio();
    if (!a) return;
    let t = a.currentTime + 0.05;
    for (let i = 0; i < lines; i++) {
        // the head: a buzz chopped into dots
        const head = a.createOscillator();
        head.type = "square";
        head.frequency.value = i % 2 ? 330 : 290;
        const chop = a.createOscillator();
        chop.type = "square";
        chop.frequency.value = 55 + (i % 3) * 8;
        const chopGain = a.createGain();
        chopGain.gain.value = 0.5;
        const g = a.createGain();
        g.gain.value = 0;
        chop.connect(chopGain).connect(g.gain);
        const bp = a.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1800;
        bp.Q.value = 0.8;
        const out = a.createGain();
        env(a, out, t, 0.09, 0.01, lineSeconds - 0.04, 0.02);
        head.connect(g).connect(bp).connect(out).connect(a.destination);
        head.start(t);
        chop.start(t);
        head.stop(t + lineSeconds);
        chop.stop(t + lineSeconds);
        // the paper advancing a line
        const feed = noise(a, 0.08);
        const lp = a.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        const fg = a.createGain();
        env(a, fg, t + lineSeconds, 0.08, 0.005, 0.03, 0.04);
        feed.connect(lp).connect(fg).connect(a.destination);
        feed.start(t + lineSeconds);
        feed.stop(t + lineSeconds + 0.09);
        t += lineSeconds + 0.09;
    }
}

/** Degauss: the tube's coil firing, a deep "thwum" that shudders and fades. */
export function playDegauss() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    click(a, t, 0.4);
    const o = a.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(60, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 1.2);
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 300;
    const wob = a.createOscillator();
    wob.frequency.value = 9;
    const wobGain = a.createGain();
    wobGain.gain.value = 0.18;
    const g = a.createGain();
    env(a, g, t, 0.45, 0.02, 0.15, 1.0);
    wob.connect(wobGain).connect(g.gain);
    o.connect(lp).connect(g).connect(a.destination);
    o.start(t);
    wob.start(t);
    o.stop(t + 1.3);
    wob.stop(t + 1.3);
}

/** A dial-up modem: dial tones, the ring, then the handshake's squeal and hiss. About 4 seconds. */
export function playModem() {
    const a = audio();
    if (!a) return;
    let t = a.currentTime + 0.05;
    const tone = (f1: number, f2: number, start: number, dur: number, level = 0.08) => {
        [f1, f2].forEach((f) => {
            const o = a.createOscillator();
            o.frequency.value = f;
            const g = a.createGain();
            env(a, g, start, level, 0.005, dur - 0.02, 0.015);
            o.connect(g).connect(a.destination);
            o.start(start);
            o.stop(start + dur + 0.02);
        });
    };
    // DTMF digits of a short number
    const keys: [number, number][] = [[697, 1209], [770, 1336], [852, 1477], [941, 1336], [697, 1336], [770, 1209]];
    keys.forEach(([f1, f2]) => {
        tone(f1, f2, t, 0.08);
        t += 0.12;
    });
    t += 0.15;
    // ring back
    tone(440, 480, t, 0.6, 0.05);
    t += 0.8;
    // answer tone, then the squeal sweeping, then static
    tone(2100, 2100, t, 0.5, 0.05);
    t += 0.5;
    const sq = a.createOscillator();
    sq.type = "triangle";
    sq.frequency.setValueAtTime(1200, t);
    sq.frequency.linearRampToValueAtTime(2400, t + 0.3);
    sq.frequency.linearRampToValueAtTime(980, t + 0.6);
    const sg = a.createGain();
    env(a, sg, t, 0.06, 0.02, 0.5, 0.1);
    sq.connect(sg).connect(a.destination);
    sq.start(t);
    sq.stop(t + 0.65);
    t += 0.6;
    const hiss = noise(a, 1.1);
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.5;
    const hg = a.createGain();
    env(a, hg, t, 0.07, 0.05, 0.8, 0.2);
    hiss.connect(bp).connect(hg).connect(a.destination);
    hiss.start(t);
    hiss.stop(t + 1.1);
}
