// The arcade's sounds (asteroid-run.tsx, stack-station.tsx), synthesised with the
// Web Audio API. Browsers allow sound only after a click or key, which starting
// a game always is.

let ctx: AudioContext | null = null;
let muted = false;

// Told when the mute changes (the background music, music.ts, follows it)
const muteListeners = new Set<() => void>();
export function onMute(f: () => void) {
    muteListeners.add(f);
    return () => void muteListeners.delete(f);
}

export function setMuted(m: boolean) {
    muted = m;
    if (engine) engine.gain.gain.setTargetAtTime(m ? 0 : engineLevel, audio()?.currentTime ?? 0, 0.05);
    muteListeners.forEach((f) => f());
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

/** The one audio context the arcade's sounds share (null without Web Audio). */
export const audioContext = () => audio();

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
/** A module set down: a soft clunk. */
export const sfxPlace = (step = 0) => tone(220 + step * 30, 0, 0.12, 0.12, "triangle", 150);
/** A perfect drop: a bright note, higher with each one in a row. */
export const sfxPerfect = (streak: number) => {
    const f = 523 * Math.pow(2, Math.min(streak - 1, 12) / 12);
    tone(f, 0, 0.25, 0.08, "triangle");
    tone(f * 1.5, 0.05, 0.3, 0.05);
};
/** A probe launched: a rushing lift-off, falling away. */
export const sfxLaunch = (power: number) => {
    noiseBurst(0.9, 0.1 + power * 0.12, 2500, 200);
    tone(70 + power * 40, 0, 0.8, 0.14, "triangle", 40);
};
/** A flyby done: a soft two-note ping. */
export const sfxFlyby = () => {
    tone(988, 0, 0.18, 0.06);
    tone(1319, 0.08, 0.3, 0.06);
};
/** Not yet: two low buzzes. */
export const sfxDeny = () => {
    tone(196, 0, 0.14, 0.07, "square");
    tone(165, 0.16, 0.22, 0.07, "square");
};
/** Arrived: a warm chord, rising. */
export const sfxArrive = () => {
    [392, 494, 587, 784, 988].forEach((f, i) => tone(f, i * 0.08, 0.7, 0.06, "triangle"));
};
/** An overhang sliced off. */
export const sfxSlice = () => noiseBurst(0.18, 0.12, 6000, 900);

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
