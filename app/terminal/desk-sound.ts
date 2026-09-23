// The terminal desk's sounds (desk.tsx), synthesised with the Web Audio API.
// Browsers allow sound only after the visitor has clicked or typed, on the
// desk or in the terminal inside it; before that, these stay silent.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx.state === "running" ? ctx : null;
}

function tone(a: AudioContext, f: number, t: number, dur: number, level: number, type: OscillatorType = "sine") {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
}

function noise(a: AudioContext, seconds: number) {
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    return src;
}

/** A stick seated in its port: a click and a soft rising pair. */
export function playUsbIn() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    tone(a, 2400, t, 0.03, 0.08, "square");
    tone(a, 660, t + 0.06, 0.16, 0.08);
    tone(a, 990, t + 0.16, 0.22, 0.07);
}

/** Pulled out: the pair, falling. */
export function playUsbOut() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    tone(a, 990, t, 0.14, 0.07);
    tone(a, 660, t + 0.1, 0.2, 0.07);
}

/** AirDrop: a whoosh, then the receiving phone's bloop. */
export function playAirDrop() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    const n = noise(a, 0.6);
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 0.45);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    n.connect(bp).connect(g).connect(a.destination);
    n.start(t);
    n.stop(t + 0.6);
    // the bloop: a sine that swoops up
    const o = a.createOscillator();
    o.frequency.setValueAtTime(520, t + 0.62);
    o.frequency.exponentialRampToValueAtTime(1180, t + 0.72);
    const og = a.createGain();
    og.gain.setValueAtTime(0.0001, t + 0.62);
    og.gain.exponentialRampToValueAtTime(0.12, t + 0.64);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(og).connect(a.destination);
    o.start(t + 0.62);
    o.stop(t + 0.95);
}

/** A notification on the phone: a glassy two-note ping. */
export function playNotify() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.02;
    tone(a, 1318, t, 0.25, 0.05);
    tone(a, 1760, t + 0.08, 0.35, 0.04);
}

/** The tower's power button: a firm click. */
export function playPowerButton() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    tone(a, 3000, t, 0.02, 0.07, "square");
    tone(a, 180, t, 0.08, 0.1);
}

// ---- The fans ------------------------------------------------------------

let fan: { src: AudioBufferSourceNode; gain: GainNode; lp: BiquadFilterNode } | null = null;

/** Fan hum, 0 (off) to 1 (flat out). Quiet enough to be felt more than heard. */
export function setFan(level: number) {
    const a = audio();
    if (!a) return;
    if (!fan) {
        const src = noise(a, 2);
        src.loop = true;
        const lp = a.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 300;
        const gain = a.createGain();
        gain.gain.value = 0;
        src.connect(lp).connect(gain).connect(a.destination);
        src.start();
        fan = { src, gain, lp };
    }
    const t = a.currentTime;
    fan.gain.gain.cancelScheduledValues(t);
    fan.gain.gain.setTargetAtTime(level * 0.03, t, 0.6);
    fan.lp.frequency.setTargetAtTime(220 + level * 700, t, 0.6);
}
