// Stack the Station's rules, apart from the drawing, so the server can replay
// a build (app/api/leaderboard) and count its modules itself: a posted score
// is the server's, not the browser's.
//
// A module's slide is worked out from the time since it appeared, not moved
// a little each frame, so the same drop times give the same station on any
// device. A build is its drop times, in seconds, rounded to the millisecond.
// Today's station seeds which side each module comes from and how fast it
// slides by the date.

import { seededRandom } from "./seed";

export const H = 0.5; // a module's height
export const BASE = 3.2; // the hub's width and depth
export const PERFECT = 0.08; // within this of the one below counts as perfect
export const RANGE = 4.2; // how far a module swings either side

export type Slab = { w: number; d: number; x: number; z: number; y: number };
export type Moving = { axis: "x" | "z"; side: number; speed: number };
export type Stack = { layers: Slab[]; moving: Moving | null; streak: number; over: boolean; rnd: () => number; daily: boolean };
export type Drop =
    | { kind: "miss"; at: Slab; axis: "x" | "z"; sign: number }
    | { kind: "perfect"; placed: Slab; streak: number }
    | { kind: "cut"; placed: Slab; cut: Slab; axis: "x" | "z"; sign: number };

export const roundTime = (s: number) => Math.round(s * 1000) / 1000;

function spawn(s: Stack, speed: number) {
    const axis: "x" | "z" = s.layers.length % 2 ? "x" : "z";
    // it comes in from one side (on today's station, either)
    const side = s.daily && s.rnd() < 0.5 ? 1 : -1;
    s.moving = { axis, side, speed };
}

/** A new build: the hub, and the first module coming in. */
export function newStack(day?: string | null): Stack {
    const s: Stack = { layers: [{ w: BASE, d: BASE, x: 0, z: 0, y: 0 }], moving: null, streak: 0, over: false, rnd: day ? seededRandom(`stack:${day}`) : Math.random, daily: !!day };
    spawn(s, 3.2);
    return s;
}

/** How far the sliding module is from the one below, along its axis, this long after it appeared. */
export function offsetAt(m: Moving, t: number) {
    // back and forth between the two ends, starting at its side's end
    const u = (m.speed * Math.max(0, t)) % (4 * RANGE);
    return m.side * (Math.abs(u - 2 * RANGE) - RANGE);
}

/** Where the sliding module is, this long after it appeared. */
export function movingAt(s: Stack, t: number): Slab {
    const top = s.layers[s.layers.length - 1];
    const off = offsetAt(s.moving!, t);
    return { w: top.w, d: top.d, x: s.moving!.axis === "x" ? top.x + off : top.x, z: s.moving!.axis === "z" ? top.z + off : top.z, y: top.y + H };
}

/** Drop the sliding module, t seconds after it appeared. */
export function drop(s: Stack, t: number): Drop {
    const top = s.layers[s.layers.length - 1];
    const m = s.moving!;
    const at = movingAt(s, t);
    const along = m.axis === "x" ? at.x - top.x : at.z - top.z;
    const size = m.axis === "x" ? top.w : top.d;
    const over = Math.abs(along);
    const sign = Math.sign(along) || 1;
    s.moving = null;
    if (over >= size) {
        // missed it entirely: the module falls, and that's the build
        s.over = true;
        return { kind: "miss", at, axis: m.axis, sign };
    }
    let result: Drop;
    if (over <= PERFECT) {
        // perfect: snapped onto the one below, and five in a row grows it back a little
        s.streak += 1;
        const placed = { ...at, x: top.x, z: top.z };
        if (s.streak >= 5) {
            if (m.axis === "x") placed.w = Math.min(BASE, placed.w + 0.25);
            else placed.d = Math.min(BASE, placed.d + 0.25);
        }
        s.layers.push(placed);
        result = { kind: "perfect", placed, streak: s.streak };
    } else {
        s.streak = 0;
        const keep = size - over;
        const placed = { ...at };
        const cut = { ...at };
        if (m.axis === "x") {
            placed.w = keep;
            placed.x = top.x + along / 2;
            cut.w = over;
            cut.x = placed.x + sign * (keep / 2 + over / 2);
        } else {
            placed.d = keep;
            placed.z = top.z + along / 2;
            cut.d = over;
            cut.z = placed.z + sign * (keep / 2 + over / 2);
        }
        s.layers.push(placed);
        result = { kind: "cut", placed, cut, axis: m.axis, sign };
    }
    const speed = Math.min(8, 3.2 + s.layers.length * 0.09) * (s.daily ? 0.85 + s.rnd() * 0.4 : 1);
    spawn(s, speed);
    return result;
}

/** The modules a build stood, from its drop times (null if they aren't a real build). */
export function replay(drops: unknown, day?: string | null): number | null {
    if (!Array.isArray(drops) || drops.length < 1 || drops.length > 6000) return null;
    const s = newStack(day);
    for (const d of drops) {
        // (a person needs a moment between drops; nor is a module held for minutes)
        if (typeof d !== "number" || !Number.isFinite(d) || d < 0.05 || d > 600) return null;
        if (s.over) return null; // drops after the build ended
        drop(s, roundTime(d));
    }
    return s.layers.length - 1;
}
