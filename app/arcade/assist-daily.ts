// Gravity Assist's mission of the day: the real solar system on that date
// (UTC). Every planet is where it really is, in its true direction from the
// Sun, and the Moon in its true direction from Earth (ephemeris.ts, checked
// against JPL Horizons). The distances are squeezed to fit, each planet on its
// own ring in order out from the Sun.
//
// The target turns with the days. The layout is flown by the solver over a
// spread of angles and powers, and the masses (never the positions) are eased
// until it can be won, but not too easily (0.5% to 5% of those shots arrive).
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

function layout(key: string, date: Date, target: Planet, sunMu: number, viaJupiter: boolean, tight: boolean): Level {
    const at = (p: Planet): [number, number] => {
        const l = (longitude(p, date) * Math.PI) / 180;
        return [Math.cos(l) * RING[p], Math.sin(l) * RING[p]];
    };
    const planets: Body[] = PLANETS.map((p) => ({ kind: p, r: LOOK[p].r, mu: LOOK[p].mu, at: at(p), ...(p === "jupiter" && viaJupiter ? { pass: 6 } : {}) }));
    const earth = planets[PLANETS.indexOf("earth")];
    const m = (moonLongitude(date) * Math.PI) / 180;
    const moon: Body = { kind: "moon", r: 0.5, mu: 12, at: [earth.at![0] + Math.cos(m) * 3, earth.at![1] + Math.sin(m) * 3] };
    const sun: Body = { kind: "sun", r: 3.2, mu: sunMu, at: [0, 0] };
    const bodies = [earth, ...planets.filter((b) => b !== earth), moon, sun];
    const km = distanceKm("earth", target, date);
    const via = viaJupiter ? ", flying past Jupiter on the way" : "";
    return {
        name: "Today's sky",
        brief: `The planets where they really are on ${key}, each in its true direction from the Sun (distances squeezed to fit). Reach ${NAME[target]}${via}.`,
        fact: `Today ${NAME[target]} is ${Math.round(km / 1e6).toLocaleString("en")} million km from Earth: its light takes ${fmtTime(km / 299_792.458)} to reach us.`,
        bodies,
        start: 0,
        target: bodies.findIndex((b) => b.kind === target),
        flyby: viaJupiter ? [bodies.findIndex((b) => b.kind === "jupiter")] : undefined,
        par: viaJupiter ? 5 : 4,
        // (a close target made harder: arrive right by it)
        capture: tight ? LOOK[target].r + 1.4 : undefined,
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
    const began = Date.now();
    let best: { level: Level; share: number } | null = null;
    // the day's target first (then the next ones round, if its sky won't do),
    // each tried from hardest to easiest: a tight arrival and a strong Sun first
    search: for (let k = 0; k < TARGETS.length; k++) {
        const target = TARGETS[(n + k) % TARGETS.length];
        const outer = target === "saturn" || target === "uranus" || target === "neptune";
        for (const via of outer && n % 2 === 0 ? [true, false] : [false])
            for (const tight of [false, true])
                for (const sunMu of [2600, 1800, 1400, 1000, 700, 400]) {
                    const level = layout(key, date, target, sunMu, via, tight);
                    const share = winShare(level);
                    if (share >= 0.005 && share <= 0.05) {
                        best = { level, share };
                        break search;
                    }
                    if (share > 0 && (!best || Math.abs(Math.log(share / 0.02)) < Math.abs(Math.log(best.share / 0.02)))) best = { level, share };
                    // (a few seconds at most: the closest so far will do)
                    if (Date.now() - began > 5000) break search;
                }
    }
    const level = best?.level ?? layout(key, date, TARGETS[n % TARGETS.length], 400, false, false);
    made.set(key, level);
    return level;
}
