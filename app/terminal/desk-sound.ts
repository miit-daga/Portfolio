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

// ---- The desk's small things ---------------------------------------------

/** The rubber duck: a squeaky toy's two-part squeeze. */
export function playQuack() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    [0, 0.13].forEach((d, i) => {
        const o = a.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(i ? 620 : 700, t + d);
        o.frequency.exponentialRampToValueAtTime(i ? 380 : 460, t + d + 0.11);
        const bp = a.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1300;
        bp.Q.value = 3;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.16, t + d + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12);
        o.connect(bp).connect(g).connect(a.destination);
        o.start(t + d);
        o.stop(t + d + 0.14);
    });
}

function whoosh(a: AudioContext, t: number, dur: number, from: number, to: number, level: number, q = 1.5) {
    const n = noise(a, dur);
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(a.destination);
    n.start(t);
    n.stop(t + dur);
}

/** A sip of chai: a short slurp, then a gulp. */
export function playSip() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    whoosh(a, t, 0.28, 900, 2600, 0.06, 4);
    tone(a, 150, t + 0.34, 0.1, 0.09);
}

/** Pouring: a trickle that runs for a moment. */
export function playPour() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    whoosh(a, t, 0.9, 2400, 1400, 0.05, 2.5);
}

/** The drawer, sliding open or shut on its runners. */
export function playDrawer(open: boolean) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    whoosh(a, t, 0.32, open ? 300 : 500, open ? 500 : 280, 0.06, 1);
    tone(a, open ? 120 : 90, t + 0.3, 0.08, 0.08);
}

/** The webcam's shutter. */
export function playShutter() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    whoosh(a, t, 0.06, 3000, 5000, 0.1, 0.8);
    whoosh(a, t + 0.09, 0.06, 5000, 2600, 0.08, 0.8);
}

/** A fragment picked up: a sparkle. */
export function playSparkle() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    [880, 1320, 1760].forEach((f, i) => tone(a, f, t + i * 0.07, 0.2, 0.06));
}

// ---- Music on the phone ----------------------------------------------------
// A slow space ambient, made up as it plays: a drone that breathes, and bell
// notes from a pentatonic scale through a long echo

let music: { stop: () => void } | null = null;

export function musicPlaying() {
    return !!music;
}

export function playMusic(): boolean {
    const a = audio();
    if (!a || music) return !!music;
    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, a.currentTime);
    out.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 2);
    out.connect(a.destination);
    // the echo
    const delay = a.createDelay(2);
    delay.delayTime.value = 0.55;
    const fb = a.createGain();
    fb.gain.value = 0.45;
    const wet = a.createGain();
    wet.gain.value = 0.35;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(out);
    // the drone, its filter opening and closing slowly
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = a.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(lp.frequency);
    const droneGain = a.createGain();
    droneGain.gain.value = 0.05;
    lp.connect(droneGain).connect(out);
    const drones = [110, 110.6, 164.8].map((f) => {
        const o = a.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.connect(lp);
        o.start();
        return o;
    });
    lfo.start();
    // the bells
    const SCALE = [440, 493.9, 554.4, 659.3, 740, 880, 987.8, 1108.7];
    const bell = () => {
        const t = a.currentTime + 0.05;
        const f = SCALE[Math.floor(Math.random() * SCALE.length)];
        const o = a.createOscillator();
        o.frequency.value = f;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o.connect(g);
        g.connect(out);
        g.connect(delay);
        o.start(t);
        o.stop(t + 2.5);
    };
    let timer = 0;
    const next = () => {
        bell();
        if (Math.random() < 0.35) window.setTimeout(bell, 260);
        timer = window.setTimeout(next, 900 + Math.random() * 1800);
    };
    next();
    music = {
        stop: () => {
            window.clearTimeout(timer);
            const t = a.currentTime;
            out.gain.cancelScheduledValues(t);
            out.gain.setValueAtTime(out.gain.value, t);
            out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
            window.setTimeout(() => {
                drones.forEach((o) => o.stop());
                lfo.stop();
                out.disconnect();
            }, 1300);
        },
    };
    return true;
}

export function stopMusic() {
    music?.stop();
    music = null;
}

/** The voice memo AirDropped from the phone: four seconds of someone humming. */
export function playHum() {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + 0.05;
    // hmm hmm hmmm, hm hmmm: a soft, breathy tune
    const tune: [number, number, number][] = [
        [220, 0, 0.35],
        [247, 0.45, 0.35],
        [262, 0.9, 0.7],
        [247, 1.75, 0.25],
        [220, 2.1, 1.1],
    ];
    for (const [f, at, dur] of tune) {
        const o = a.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(f * 0.98, t0 + at);
        o.frequency.linearRampToValueAtTime(f, t0 + at + 0.08);
        const vib = a.createOscillator();
        vib.frequency.value = 5;
        const vibGain = a.createGain();
        vibGain.gain.value = 2.5;
        vib.connect(vibGain).connect(o.frequency);
        const lp = a.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(0.09, t0 + at + 0.06);
        g.gain.setValueAtTime(0.09, t0 + at + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        o.connect(lp).connect(g).connect(a.destination);
        o.start(t0 + at);
        vib.start(t0 + at);
        o.stop(t0 + at + dur + 0.05);
        vib.stop(t0 + at + dur + 0.05);
    }
}
