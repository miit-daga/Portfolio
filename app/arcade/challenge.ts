// Gravity Assist's challenge links, read by the game (gravity-assist.tsx) and
// by the server, which draws each link's preview picture
// (arcade/challenge-image) and its title (arcade/page.tsx).

import { LEVELS, fly, type Body, type Level, type Probe } from "./assist-sim";
import { dailyMission, dayKey } from "./assist-daily";

// A challenge link: the mission (its number, or "d" and today's date for
// today's sky) and the winning shot, e.g. ?game=assist&c=9.-12345.62000.0.
// The time to beat isn't in it: the shot is flown again here and timed, so
// a link can't claim a better one than it really flies.
export type Challenge = { level: number; day?: string; angle: number; power: number; t: number };
export const encodeChallenge = (c: Challenge) =>
    [c.day ? `d${c.day.replace(/-/g, "")}` : c.level, Math.round(c.angle * 1e5), Math.round(c.power * 1e5), Math.round(c.t * 1000)].join(".");
export function decodeChallenge(code: string): Challenge | null {
    const m = /^(d\d{8}|\d{1,2})\.(-?\d{1,7})\.(\d{1,6})\.(\d{1,7})$/.exec(code);
    if (!m) return null;
    const day = m[1].startsWith("d") ? `${m[1].slice(1, 5)}-${m[1].slice(5, 7)}-${m[1].slice(7, 9)}` : undefined;
    const power = Number(m[3]) / 1e5;
    if (power < 0.1 || power > 1) return null;
    return { level: day ? -1 : Number(m[1]), day, angle: Number(m[2]) / 1e5, power, t: Number(m[4]) / 1000 };
}

const PLANET: Record<string, string> = { sun: "the Sun", mercury: "Mercury", venus: "Venus", earth: "Earth", moon: "the Moon", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", rock: "an asteroid", blackhole: "the black hole" };
/** What a body is called: its own name out in deep space, else its planet's. */
export const nameOf = (b: Body) => b.name ?? PLANET[b.kind];

/** A challenge, flown: its mission, and the flight, if it still arrives. */
export function flyChallenge(c: Challenge): { level: Level; label: string; flight: Probe } | null {
    let level: Level | undefined;
    let label: string;
    if (c.day) {
        if (c.day !== dayKey()) return null;
        level = dailyMission(c.day);
        label = "Today's sky";
    } else {
        level = LEVELS[c.level];
        if (!level) return null;
        const deep = level.section === "deep";
        const n = LEVELS.filter((l) => (l.section === "deep") === deep).indexOf(level) + 1;
        label = `${deep ? "Deep space" : "Mission"} ${n} · ${level.name}`;
    }
    const flight = fly(level, c.angle, c.power, c.t);
    return flight.state === "arrived" ? { level, label, flight } : null;
}
