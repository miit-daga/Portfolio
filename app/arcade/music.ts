// The arcade's background music: slow, quiet, and made live with the Web Audio
// API, so there is no recording to download and it never quite repeats. A pad
// of detuned saws through a slowly breathing low-pass moves through four chords
// (Am9, Fmaj9, Cadd9, Em7), sixteen seconds each and crossfading, with now and
// then a soft chime above it, echoing, all in a long synthetic reverb.
//
// It plays while someone is on the arcade and has clicked or pressed a key
// there (browsers allow sound only after one), under the games' own sounds. It
// stops with the sound mute (a game's speaker button, or M), with its own
// switch in the arcade's header (remembered on the device), while the tab is
// hidden, and when they leave the arcade.

import { audioContext, isMuted, onMute } from "./sound";

// Quiet, under the games' own sounds, but pitched and filtered to be heard on
// laptop and phone speakers, which play little below 300 Hz: the first version
// sat almost entirely down there and was, on those, silent
const LEVEL = 0.34;
const KEY = "arcade-music";
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// Each chord voiced low to high, as MIDI notes, from the octave above the bass
// (small speakers can't play the bass octave)
const CHORDS = [
    [57, 64, 67, 71, 72], // Am9: A3 E4 G4 B4 C5
    [53, 60, 64, 67, 69], // Fmaj9: F3 C4 E4 G4 A4
    [60, 67, 74, 76, 79], // Cadd9: C4 G4 D5 E5 G5
    [52, 59, 62, 67, 71], // Em7: E3 B3 D4 G4 B4
];
const CHORD_S = 16;
// The chimes: A minor pentatonic, up high, which sits over all four chords
const BELLS = [69, 72, 74, 76, 79, 81, 84];

let on = true;
let wanted = false;
let playing = false;
let chord = 0;
let voices: ((at: number) => void)[] = [];
let chordTimer: ReturnType<typeof setTimeout> | undefined;
let chimeTimer: ReturnType<typeof setTimeout> | undefined;
let graph: { bus: GainNode; input: GainNode; echo: GainNode } | null = null;
const listeners = new Set<(on: boolean) => void>();

if (typeof window !== "undefined") {
    try {
        on = localStorage.getItem(KEY) !== "off";
    } catch {}
    document.addEventListener("visibilitychange", () => sync());
    onMute(() => sync());
}

/** A stereo reverb's impulse: noise, dying away over `seconds`. */
function impulse(a: AudioContext, seconds: number, decay: number) {
    const len = Math.floor(a.sampleRate * seconds);
    const buf = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
}

function build(a: AudioContext) {
    const bus = a.createGain();
    bus.gain.value = 0;
    bus.connect(a.destination);
    const verb = a.createConvolver();
    verb.buffer = impulse(a, 6, 2.4);
    const wet = a.createGain();
    wet.gain.value = 0.9;
    verb.connect(wet).connect(bus);
    const dry = a.createGain();
    dry.gain.value = 0.35;
    dry.connect(bus);
    const input = a.createGain();
    input.connect(dry);
    input.connect(verb);
    // The chimes' echo: a delay feeding back into itself, into the reverb
    const echo = a.createGain();
    const delay = a.createDelay(2);
    delay.delayTime.value = 0.42;
    const feedback = a.createGain();
    feedback.gain.value = 0.38;
    echo.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(verb);
    return { bus, input, echo };
}

/** One note of the pad, fading in from `t`; returns its release. */
function padVoice(a: AudioContext, n: number, t: number, input: AudioNode) {
    const g = a.createGain();
    g.gain.setValueAtTime(0, t);
    // the low notes carry the chord, the top ones stay light
    g.gain.linearRampToValueAtTime(n < 62 ? 0.07 : 0.045, t + 5);
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    lp.Q.value = 0.6;
    // the filter breathes, each note at its own slow rate
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.04 + Math.random() * 0.05;
    const depth = a.createGain();
    depth.gain.value = 450;
    lfo.connect(depth).connect(lp.frequency);
    const oscs = [-7, 7].map((cents) => {
        const o = a.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midi(n);
        o.detune.value = cents;
        o.connect(lp);
        return o;
    });
    lp.connect(g).connect(input);
    [lfo, ...oscs].forEach((o) => o.start(t));
    return (at: number) => {
        g.gain.setTargetAtTime(0, Math.max(at, t + 0.1), 2);
        [lfo, ...oscs].forEach((o) => o.stop(Math.max(at, t) + 12));
    };
}

function bell(a: AudioContext, f: number, t: number, input: AudioNode, echo: AudioNode) {
    const g = a.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    const o = a.createOscillator();
    o.frequency.value = f;
    // a faint, slightly sharp octave above, for the glassy edge
    const over = a.createOscillator();
    over.frequency.value = f * 2.01;
    const overLevel = a.createGain();
    overLevel.gain.value = 0.22;
    o.connect(g);
    over.connect(overLevel).connect(g);
    g.connect(input);
    g.connect(echo);
    [o, over].forEach((x) => {
        x.start(t);
        x.stop(t + 4.2);
    });
}

function nextChord() {
    const a = audioContext();
    if (!playing || !a || !graph) return;
    if (a.state === "running") {
        const t = a.currentTime + 0.05;
        const old = voices;
        voices = CHORDS[chord].map((n) => padVoice(a, n, t, graph!.input));
        old.forEach((release) => release(t + 1));
        chord = (chord + 1) % CHORDS.length;
    }
    chordTimer = setTimeout(nextChord, CHORD_S * 1000);
}

function chime() {
    const a = audioContext();
    if (!playing || !a || !graph) return;
    if (a.state === "running" && Math.random() < 0.8) {
        bell(a, midi(BELLS[Math.floor(Math.random() * BELLS.length)]), a.currentTime + 0.05, graph.input, graph.echo);
    }
    chimeTimer = setTimeout(chime, 3500 + Math.random() * 6000);
}

function start() {
    if (playing) return;
    const a = audioContext();
    if (!a) return;
    graph ??= build(a);
    playing = true;
    graph.bus.gain.cancelScheduledValues(a.currentTime);
    graph.bus.gain.setTargetAtTime(LEVEL, a.currentTime, 1.5);
    nextChord();
    chimeTimer = setTimeout(chime, 2500);
}

function stop() {
    if (!playing) return;
    playing = false;
    clearTimeout(chordTimer);
    clearTimeout(chimeTimer);
    const a = audioContext();
    if (!a || !graph) return;
    graph.bus.gain.cancelScheduledValues(a.currentTime);
    graph.bus.gain.setTargetAtTime(0, a.currentTime, 0.25);
    voices.forEach((release) => release(a.currentTime));
    voices = [];
}

function sync() {
    if (wanted && on && !isMuted() && !document.hidden) start();
    else stop();
}

/** The arcade is open and someone has clicked or pressed a key there (true), or they've left (false). */
export function wantMusic(w: boolean) {
    wanted = w;
    sync();
}

export const musicOn = () => on;

/** The header's switch: music on or off, remembered on this device. */
export function setMusicOn(v: boolean) {
    on = v;
    try {
        localStorage.setItem(KEY, v ? "on" : "off");
    } catch {}
    sync();
    listeners.forEach((f) => f(v));
}

export function onMusicChange(f: (on: boolean) => void) {
    listeners.add(f);
    return () => void listeners.delete(f);
}
