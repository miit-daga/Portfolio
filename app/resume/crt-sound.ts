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
