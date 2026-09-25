// The arcade's background music: "Ambient Relaxing Loop" by isaiah658, from
// OpenGameArt (opengameart.org/content/ambient-relaxing-loop), released CC0
// into the public domain. A soft, steady synth pad, edited by its author to
// loop seamlessly (24.5 seconds), in public/arcade/music-loop.mp3.
//
// It plays while someone is on the arcade and has clicked or pressed a key
// there (browsers allow sound only after one), quietly, under the games' own
// sounds. It stops with the sound mute (a game's speaker button, or M), with
// its own switch in the arcade's header (remembered on the device), while the
// tab is hidden, and when they leave the arcade.

import { audioContext, isMuted, onMute } from "./sound";

const FILE = "/arcade/music-loop.mp3";
// Quiet, about 12 dB under the games' own sounds
const LEVEL = 0.24;
const KEY = "arcade-music";

let on = true;
let wanted = false;
let playing = false;
// Bumped by every start and stop, so a start that was waiting on the download
// and has since been overtaken doesn't play as well
let generation = 0;
let bus: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let track: Promise<AudioBuffer | null> | null = null;
const listeners = new Set<(on: boolean) => void>();

if (typeof window !== "undefined") {
    try {
        on = localStorage.getItem(KEY) !== "off";
    } catch {}
    document.addEventListener("visibilitychange", () => sync());
    onMute(() => sync());
}

/**
 * The loop, fetched and decoded once. An MP3 decodes with a little silence at
 * each end (the encoder's padding), which would click at every repeat, so the
 * loop runs from the first sound to the last.
 */
function load(a: AudioContext) {
    track ??= fetch(FILE)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => a.decodeAudioData(b))
        .catch(() => {
            track = null; // try again next time
            return null;
        });
    return track;
}

function soundSpan(buf: AudioBuffer) {
    const d = buf.getChannelData(0);
    const quiet = 1e-4;
    let first = 0;
    let last = d.length - 1;
    while (first < last && Math.abs(d[first]) < quiet) first++;
    while (last > first && Math.abs(d[last]) < quiet) last--;
    return [first / buf.sampleRate, (last + 1) / buf.sampleRate] as const;
}

async function start() {
    if (playing) return;
    const a = audioContext();
    if (!a) return;
    playing = true;
    const mine = ++generation;
    const buf = await load(a);
    // turned off, muted or left (or started again) while it loaded
    if (mine !== generation) return;
    // it didn't load: not playing, so the next start tries again
    if (!buf) return void (playing = false);
    if (!bus) {
        bus = a.createGain();
        bus.gain.value = 0;
        bus.connect(a.destination);
    }
    const [from, to] = soundSpan(buf);
    const src = a.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = from;
    src.loopEnd = to;
    src.connect(bus);
    src.start(a.currentTime, from);
    source = src;
    bus.gain.cancelScheduledValues(a.currentTime);
    bus.gain.setTargetAtTime(LEVEL, a.currentTime, 1.5);
}

function stop() {
    if (!playing) return;
    playing = false;
    generation++;
    const a = audioContext();
    if (!a || !bus) return;
    bus.gain.cancelScheduledValues(a.currentTime);
    bus.gain.setTargetAtTime(0, a.currentTime, 0.25);
    source?.stop(a.currentTime + 1.5);
    source = null;
}

function sync() {
    if (wanted && on && !isMuted() && !document.hidden) void start();
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
