// The arcade's background music: four public-domain (CC0) space tracks from
// OpenGameArt, one of them playing at a time, picked from the arcade header's
// Music menu (music-button.tsx) or turned off there.
//
//   Drift      "Ambient Relaxing Loop", isaiah658: a soft, steady pad, 24.5 s,
//              edited by its author to loop seamlessly
//   Calm       "Calm Ambient 1 (Synthwave 4k)", The Cynic Project
//              (cynicmusic.com, pixelsphere.org): slow, soothing chords, 2.6 min
//   Ice        "Icy Realm (Seven and Eight)", The Cynic Project: ethereal, with
//              gentle plucks, 82 s
//   Out There  "Space Music: Out There", yd: deep and spacious, 4 min
//
// Drift loops as it is. The other three fade in or out at their ends, so each
// repeat crossfades into the next instead of dipping. Their levels are matched
// (gainDb, measured half on full-range loudness and half on the part above
// 300 Hz, which is what laptop and phone speakers play), so switching doesn't
// jump in volume.
//
// It plays while someone is on the arcade and has clicked or pressed a key
// there (browsers allow sound only after one), quietly, under the games' own
// sounds. It stops with the sound mute (a game's speaker button, or M), when
// turned off in the menu (the choice is remembered on the device), while the
// tab is hidden, and when they leave the arcade.

import { audioContext, isMuted, onMute } from "./sound";

export type TrackId = "drift" | "calm" | "ice" | "out-there";
export type MusicChoice = TrackId | "off";

export const TRACKS: { id: TrackId; name: string; about: string; file: string; seamless: boolean; gainDb: number }[] = [
    { id: "drift", name: "Drift", about: "A soft, steady pad", file: "music-drift.mp3", seamless: true, gainDb: 0 },
    { id: "calm", name: "Calm", about: "Slow, soothing chords", file: "music-calm.mp3", seamless: false, gainDb: 0.2 },
    { id: "ice", name: "Ice", about: "Ethereal, with gentle plucks", file: "music-ice.mp3", seamless: false, gainDb: -3.5 },
    { id: "out-there", name: "Out There", about: "Deep and spacious, four minutes", file: "music-out-there.mp3", seamless: false, gainDb: 8.4 },
];

// Quiet, about 12 dB under the games' own sounds
const LEVEL = 0.24;
// How long a fading track's repeats overlap
const CROSSFADE_S = 4;
const KEY = "arcade-music";

let choice: MusicChoice = "drift";
let wanted = false;
let playing = false;
// Bumped by every start and stop, so a start that was waiting on a download
// and has since been overtaken doesn't play as well
let generation = 0;
let bus: GainNode | null = null;
let play: { gain: GainNode; sources: AudioBufferSourceNode[]; timer?: ReturnType<typeof setTimeout> } | null = null;
const tracks = new Map<TrackId, Promise<AudioBuffer | null>>();
const listeners = new Set<(c: MusicChoice) => void>();

if (typeof window !== "undefined") {
    try {
        const saved = localStorage.getItem(KEY);
        // anything else (including "on", from the single-track version) is Drift
        if (saved === "off" || TRACKS.some((t) => t.id === saved)) choice = saved as MusicChoice;
    } catch {}
    document.addEventListener("visibilitychange", () => sync());
    onMute(() => sync());
}

/** A track, fetched and decoded once (and only once someone picks it). */
function load(a: AudioContext, id: TrackId) {
    let track = tracks.get(id);
    if (!track) {
        const file = TRACKS.find((t) => t.id === id)!.file;
        track = fetch(`/arcade/${file}`)
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
            .then((b) => a.decodeAudioData(b))
            .catch(() => {
                tracks.delete(id); // try again next time
                return null;
            });
        tracks.set(id, track);
    }
    return track;
}

/**
 * From the first sound to the last: an MP3 decodes with a little silence at
 * each end (the encoder's padding), which would click or gap at every repeat.
 */
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
    if (playing || choice === "off") return;
    const a = audioContext();
    if (!a) return;
    playing = true;
    const mine = ++generation;
    const track = TRACKS.find((t) => t.id === choice)!;
    const buf = await load(a, track.id);
    // turned off, muted, switched or left while it loaded
    if (mine !== generation) return;
    // it didn't load: not playing, so the next start tries again
    if (!buf) return void (playing = false);
    if (!bus) {
        bus = a.createGain();
        bus.gain.value = LEVEL;
        bus.connect(a.destination);
    }
    const gain = a.createGain();
    gain.gain.value = 0;
    gain.connect(bus);
    gain.gain.setTargetAtTime(Math.pow(10, track.gainDb / 20), a.currentTime, 1.5);
    const p: NonNullable<typeof play> = { gain, sources: [] };
    play = p;
    const [from, to] = soundSpan(buf);

    if (track.seamless) {
        const src = a.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.loopStart = from;
        src.loopEnd = to;
        src.connect(gain);
        src.start(a.currentTime, from);
        p.sources.push(src);
        return;
    }

    // Play it through, and start the next repeat CROSSFADE_S before the end,
    // one fading out as the other fades in
    const length = to - from;
    const run = (at: number, fadeIn: boolean) => {
        if (play !== p) return;
        const src = a.createBufferSource();
        src.buffer = buf;
        const g = a.createGain();
        src.connect(g).connect(gain);
        g.gain.setValueAtTime(fadeIn ? 0 : 1, at);
        if (fadeIn) g.gain.linearRampToValueAtTime(1, at + CROSSFADE_S);
        g.gain.setValueAtTime(1, at + length - CROSSFADE_S);
        g.gain.linearRampToValueAtTime(0, at + length);
        src.start(at, from, length);
        p.sources.push(src);
        src.onended = () => (p.sources = p.sources.filter((s) => s !== src));
        const next = at + length - CROSSFADE_S;
        // scheduled a second early, so the next repeat is ready in time
        p.timer = setTimeout(() => run(next, true), Math.max(0, (next - a.currentTime - 1) * 1000));
    };
    run(a.currentTime + 0.05, false);
}

function stop() {
    if (!playing) return;
    playing = false;
    generation++;
    const a = audioContext();
    const p = play;
    play = null;
    if (!a || !p) return;
    clearTimeout(p.timer);
    p.gain.gain.cancelScheduledValues(a.currentTime);
    p.gain.gain.setTargetAtTime(0, a.currentTime, 0.4);
    p.sources.forEach((s) => {
        try {
            s.stop(a.currentTime + 2.5);
        } catch {}
    });
}

function sync() {
    if (wanted && choice !== "off" && !isMuted() && !document.hidden) void start();
    else stop();
}

/** The arcade is open and someone has clicked or pressed a key there (true), or they've left (false). */
export function wantMusic(w: boolean) {
    wanted = w;
    sync();
}

export const musicChoice = () => choice;

/** The header menu: a track, or off, remembered on this device. Switching crossfades. */
export function setMusicChoice(c: MusicChoice) {
    if (c === choice) return;
    choice = c;
    try {
        localStorage.setItem(KEY, c);
    } catch {}
    stop();
    sync();
    listeners.forEach((f) => f(c));
}

export function onMusicChange(f: (c: MusicChoice) => void) {
    listeners.add(f);
    return () => void listeners.delete(f);
}
