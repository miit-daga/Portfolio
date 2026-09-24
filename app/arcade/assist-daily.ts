// Gravity Assist's mission of the day: the real solar system on that date
// (UTC). Every planet is where it really is, in its true direction from the
// Sun, and the Moon in its true direction from Earth (ephemeris.ts, checked
// against JPL Horizons). The distances are squeezed to fit, each planet on its
// own ring in order out from the Sun.
//
// The target turns with the days. The sky and its gravity are the same every
// day (the planets where they are, the same masses); only what the mission
// asks changes: arriving close by, then slowly enough to be caught into orbit,
// then a flyby of Jupiter on the way. The solver flies each in turn, easiest
// first, and keeps the first that can be won but not easily (0.6% to 2% of a
// spread of shots arrive).
// Nothing in it moves, so a winning shot flown again anywhere gives the same
// result: that is how the leaderboard's server checks the times.
//
// The server lays it out (app/api/assist-daily) and the game fetches it, so
// every browser plays the very same mission.

import { fly, type Body, type Level } from "./assist-sim";
import { PLANETS, distanceKm, longitude, moonLongitude, type Planet } from "./ephemeris";

/** Today's key, e.g. "2026-09-24", in UTC. */
export function dayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}
export const isDayKey = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const NAME: Record<Planet, string> = { mercury: "Mercury", venus: "Venus", earth: "Earth", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune" };
// Each planet's ring, out from the Sun (in order, not to scale), size and pull
const RING: Record<Planet, number> = { mercury: 6.5, venus: 9.5, earth: 13, mars: 16.5, jupiter: 21.5, saturn: 26, uranus: 29.5, neptune: 33 };
const LOOK: Record<Planet, { r: number; mu: number }> = {
    mercury: { r: 0.8, mu: 20 },
    venus: { r: 1.2, mu: 70 },
    earth: { r: 1.4, mu: 40 },
    mars: { r: 1, mu: 30 },
    jupiter: { r: 2.8, mu: 900 },
    saturn: { r: 2.3, mu: 650 },
    uranus: { r: 1.8, mu: 300 },
    neptune: { r: 1.8, mu: 300 },
};
// The target, turning day by day
const TARGETS: Planet[] = ["mars", "jupiter", "saturn", "venus", "neptune", "uranus", "mercury"];

/** The share of a spread of shots that arrive: every 3 degrees, powers 0.2 to 1. */
export function winShare(level: Level) {
    let win = 0;
    let n = 0;
    for (let a = 0; a < 360; a += 3)
        for (let pw = 0.2; pw <= 1.0001; pw += 0.1) {
            n++;
            if (fly(level, (a * Math.PI) / 180, pw, 0).state === "arrived") win++;
        }
    return win / n;
}

const fmtTime = (s: number) => (s < 3600 ? `${Math.round(s / 60)} minutes` : `${(s / 3600).toFixed(1)} hours`);

const SUN_MU = 1400;
type Ask = { tight: boolean; under?: number; via: boolean };
// What a day's mission can ask, from easiest to hardest
const ASKS: Ask[] = [
    { tight: false, via: false },
    { tight: true, via: false },
    { tight: true, under: 11, via: false },
    { tight: true, under: 9, via: false },
    { tight: true, under: 7, via: false },
    { tight: true, under: 5.5, via: false },
    { tight: true, under: 4.5, via: false },
    { tight: true, under: 3.5, via: false },
    { tight: true, under: 7, via: true },
];

function layout(key: string, date: Date, target: Planet, ask: Ask): Level {
    const { tight, via: viaJupiter, under } = ask;
    const at = (p: Planet): [number, number] => {
        const l = (longitude(p, date) * Math.PI) / 180;
        return [Math.cos(l) * RING[p], Math.sin(l) * RING[p]];
    };
    const planets: Body[] = PLANETS.map((p) => ({ kind: p, r: LOOK[p].r, mu: LOOK[p].mu, at: at(p), ...(p === "jupiter" && viaJupiter ? { pass: 6 } : {}) }));
    const earth = planets[PLANETS.indexOf("earth")];
    const m = (moonLongitude(date) * Math.PI) / 180;
    const moon: Body = { kind: "moon", r: 0.5, mu: 12, at: [earth.at![0] + Math.cos(m) * 3, earth.at![1] + Math.sin(m) * 3] };
    const sun: Body = { kind: "sun", r: 3.2, mu: SUN_MU, at: [0, 0] };
    const bodies = [earth, ...planets.filter((b) => b !== earth), moon, sun];
    const km = distanceKm("earth", target, date);
    const via = viaJupiter ? ", flying past Jupiter on the way" : "";
    const slow = under ? ` Arrive under ${(under * 2.2).toFixed(1)} km/s against it, to be caught into orbit.` : "";
    return {
        name: "Today's sky",
        brief: `The planets where they really are on ${key}, each in its true direction from the Sun (distances squeezed to fit). Reach ${NAME[target]}${via}.${slow}`,
        fact: `Today ${NAME[target]} is ${Math.round(km / 1e6).toLocaleString("en")} million km from Earth: its light takes ${fmtTime(km / 299_792.458)} to reach us.`,
        bodies,
        start: 0,
        target: bodies.findIndex((b) => b.kind === target),
        flyby: viaJupiter ? [bodies.findIndex((b) => b.kind === "jupiter")] : undefined,
        par: viaJupiter ? 5 : 4,
        // (asked to arrive right by it)
        // (for Saturn, its rings' edge: its rings are solid)
        capture: tight ? (target === "saturn" ? LOOK.saturn.r * 2.3 + 0.8 : LOOK[target].r + 1.4) : undefined,
        arrive: under ? { under, as: "orbit", craft: "The probe" } : undefined,
        guides: PLANETS.map((p) => ({ around: [0, 0] as [number, number], R: RING[p] })),
    };
}

const made = new Map<string, Level>();
/** The mission for a day. */
export function dailyMission(key: string): Level {
    const hit = made.get(key);
    if (hit) return hit;
    const date = new Date(`${key}T00:00:00Z`);
    const n = Math.floor(date.getTime() / 86_400_000);
    let level: Level | null = null;
    // the day's planet (or, if its sky can't be won at all today, the next)
    for (let k = 0; k < TARGETS.length && !level; k++) {
        const target = TARGETS[(n + k) % TARGETS.length];
        let easier: { level: Level; share: number } | null = null;
        for (const ask of ASKS) {
            if (ask.via && target === "jupiter") continue;
            const l = layout(key, date, target, ask);
            const share = winShare(l);
            if (share >= 0.006 && share <= 0.02) {
                level = l;
                break;
            }
            if (share < 0.006) {
                // gone too hard: the one before, if it was winnable, or this if it is
                level = easier && easier.share <= 0.03 ? easier.level : share > 0 ? l : easier?.level ?? null;
                break;
            }
            easier = { level: l, share };
        }
        // (even the hardest ask is still easy: that's the day's)
        level ??= easier?.level ?? null;
    }
    level ??= layout(key, date, TARGETS[n % TARGETS.length], ASKS[0]);
    made.set(key, level);
    return level;
}
