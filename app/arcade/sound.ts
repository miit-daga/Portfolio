// The arcade's sounds (asteroid-run.tsx, iss-dock.tsx), synthesised with the
// Web Audio API. Browsers allow sound only after a click or key, which starting
// a game always is.

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
    muted = m;
    if (engine) engine.gain.gain.setTargetAtTime(m ? 0 : engineLevel, audio()?.currentTime ?? 0, 0.05);
}
export const isMuted = () => muted;

function audio(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
}

function tone(f: number, at: number, dur: number, level: number, type: OscillatorType = "sine", slideTo?: number) {
    const a = audio();
    if (!a || muted) return;
    const t = a.currentTime + at;
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
}

function noiseBurst(dur: number, level: number, from: number, to: number) {
    const a = audio();
    if (!a || muted) return;
    const t = a.currentTime;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(from, t);
    lp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(g).connect(a.destination);
    src.start(t);
}

/** A fragment picked up. */
export const sfxCollect = () => {
    tone(880, 0, 0.12, 0.08);
    tone(1320, 0.06, 0.18, 0.07);
};
/** A shield restored: a rising, bright arpeggio. */
export const sfxShield = () => {
    [523, 784, 1046, 1568].forEach((f, i) => tone(f, i * 0.06, 0.3, 0.07, "triangle"));
};
/** Invincible: a shimmering, rising sparkle. */
export const sfxStar = () => {
    [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, i * 0.05, 0.4, 0.06, "sine"));
};
/** Boost: a rushing surge, rising. */
export const sfxBoost = () => {
    noiseBurst(0.9, 0.18, 600, 5000);
    tone(120, 0, 0.8, 0.12, "sawtooth", 520);
};
/** A rock shattered by an invincible or boosting ship. */
export const sfxSmash = () => {
    noiseBurst(0.25, 0.2, 5000, 400);
    tone(300, 0, 0.15, 0.06, "square", 120);
};
/** Hit by a rock. */
export const sfxHit = () => {
    noiseBurst(0.6, 0.35, 2400, 120);
    tone(90, 0, 0.5, 0.25, "triangle", 40);
};
/** Game over, or a hard contact. */
export const sfxOver = () => {
    tone(440, 0, 0.3, 0.08, "square", 220);
    tone(220, 0.25, 0.5, 0.08, "square", 110);
};
/** A short thruster puff. */
export const sfxPuff = () => noiseBurst(0.12, 0.05, 3000, 900);
/** Docked: a soft capture, then a chime. */
export const sfxDocked = () => {
    tone(160, 0, 0.3, 0.2, "triangle", 90);
    [659, 880, 1318].forEach((f, i) => tone(f, 0.25 + i * 0.1, 0.5, 0.07));
};
/** A countdown or a warning beep. */
export const sfxBeep = (high = false) => tone(high ? 1320 : 880, 0, 0.1, 0.06);

// A steady engine rumble, its pitch following the speed (0 to 1)
let engine: { src: AudioBufferSourceNode; gain: GainNode; lp: BiquadFilterNode } | null = null;
let engineLevel = 0;
export function setEngine(level: number, speed = 0) {
    const a = audio();
    if (!a) return;
    engineLevel = level;
    if (!engine && level > 0) {
        const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = a.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const lp = a.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 200;
        const gain = a.createGain();
        gain.gain.value = 0;
        src.connect(lp).connect(gain).connect(a.destination);
        src.start();
        engine = { src, gain, lp };
    }
    if (!engine) return;
    const t = a.currentTime;
    engine.gain.gain.setTargetAtTime(muted ? 0 : level, t, 0.15);
    engine.lp.frequency.setTargetAtTime(180 + speed * 900, t, 0.2);
}
export function stopEngine() {
    if (!engine) return;
    const a = audio();
    engine.gain.gain.setTargetAtTime(0, a?.currentTime ?? 0, 0.1);
    const e = engine;
    engine = null;
    window.setTimeout(() => e.src.stop(), 500);
}
