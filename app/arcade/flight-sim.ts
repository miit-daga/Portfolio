// Free flight's rules, apart from the drawing, so the server can replay a
// flight (app/api/leaderboard) and score it itself, as run-sim.ts does for
// Asteroid Run: a fixed 1/120 s step, one seeded random sequence, and an input
// tape (tape.ts) sampled every INPUT_EVERY steps.
//
// Flying needs rotations, and browsers don't all compute Math.sin, Math.atan2
// or Math.pow to the last bit alike, so this carries its own: sine and
// arctangent as polynomials (plain arithmetic, the same everywhere), and its
// own vectors and quaternions (three.js's use Math.sin). Square roots are
// fine: every engine rounds them the same.
//
// A tape sample is [thrust + 1, turn, climb]: thrust -1 slower, 0 cruise, +1
// faster; turn and climb the nose's yaw and pitch over the sample, in units of
// 1/10000 radian, spread evenly over its steps.

import { seededRandom } from "./seed";
import { neoScale, type RunNeo } from "./run-sim";

export const DT = 1 / 120;
export const INPUT_EVERY = 4;
export const SHIELDS = 3;
export const ROCKS = 280;
export const FIELD = 115;
export const SHIP_R = 0.85;
export const CRUISE = 20;
export const FAST = 46;
export const SLOW = 6;
export const RING_R = 3.4;
export const TAPE_DELTA = [false, false, false];
export const TAPE_WIDTH = 3;
export const MAX_SAMPLES = (2 * 3600) / (DT * INPUT_EVERY);
const TURN_UNIT = 1e-4;

// ---- deterministic maths ----------------------------------------------------
const PI = 3.141592653589793;
const HALF_PI = 1.5707963267948966;
const TWO_PI = 6.283185307179586;

/** sin, from a Taylor polynomial after reducing to [-pi/2, pi/2] (about 1e-12 off). */
export function dsin(x: number) {
    x -= TWO_PI * Math.round(x / TWO_PI);
    if (x > HALF_PI) x = PI - x;
    else if (x < -HALF_PI) x = -PI - x;
    const x2 = x * x;
    return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800 + x2 * (1 / 6227020800 + x2 * (-1 / 1307674368000))))))));
}
export const dcos = (x: number) => dsin(x + HALF_PI);

/** atan2, from a series after reducing the ratio to below tan(pi/8) (about 1e-10 off). */
export function datan2(y: number, x: number) {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (ax === 0 && ay === 0) return 0;
    let t = Math.min(ax, ay) / Math.max(ax, ay);
    let off = 0;
    if (t > 0.41421356237309503) {
        t = (t - 1) / (t + 1);
        off = 0.7853981633974483;
    }
    const t2 = t * t;
    let r = off + t * (1 + t2 * (-1 / 3 + t2 * (1 / 5 + t2 * (-1 / 7 + t2 * (1 / 9 + t2 * (-1 / 11 + t2 * (1 / 13 + t2 * (-1 / 15 + t2 * (1 / 17 + t2 * (-1 / 19 + t2 * (1 / 21)))))))))));
    if (ay > ax) r = HALF_PI - r;
    if (x < 0) r = PI - r;
    return y < 0 ? -r : r;
}

export type V = { x: number; y: number; z: number };
export type Q = { x: number; y: number; z: number; w: number };
const v = (x = 0, y = 0, z = 0): V => ({ x, y, z });
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: V) => {
    const l = Math.sqrt(dot(a, a)) || 1;
    a.x /= l;
    a.y /= l;
    a.z /= l;
    return a;
};
/** q times r (r applied first, in q's frame), as three.js's multiply. */
const qmul = (q: Q, r: Q): Q => ({
    x: q.x * r.w + q.w * r.x + q.y * r.z - q.z * r.y,
    y: q.y * r.w + q.w * r.y + q.z * r.x - q.x * r.z,
    z: q.z * r.w + q.w * r.z + q.x * r.y - q.y * r.x,
    w: q.w * r.w - q.x * r.x - q.y * r.y - q.z * r.z,
});
const around = (axis: "x" | "y" | "z", a: number): Q => {
    const s = dsin(a / 2);
    return { x: axis === "x" ? s : 0, y: axis === "y" ? s : 0, z: axis === "z" ? s : 0, w: dcos(a / 2) };
};
/** A vector turned by a quaternion. */
export function rotate(q: Q, p: V): V {
    const tx = 2 * (q.y * p.z - q.z * p.y);
    const ty = 2 * (q.z * p.x - q.x * p.z);
    const tz = 2 * (q.x * p.y - q.y * p.x);
    return v(p.x + q.w * tx + (q.y * tz - q.z * ty), p.y + q.w * ty + (q.z * tx - q.x * tz), p.z + q.w * tz + (q.x * ty - q.y * tx));
}

// ---- the flight -------------------------------------------------------------
export type Body = V & { r: number; live: boolean; drift: V };
export type NamedBody = Body & { neo: number; near: boolean };
export type FlightEvent = { kind: "hit"; neo: number | null } | { kind: "ring"; shield: boolean } | { kind: "neo"; index: number } | { kind: "passed"; neo: number } | { kind: "over" };

export type Flight = {
    rnd: () => number;
    daily: boolean;
    neos: RunNeo[];
    step: number;
    over: boolean;
    time: number;
    distance: number;
    bonus: number;
    rings: number;
    speed: number;
    shields: number;
    invulnerable: number;
    pos: V;
    q: Q;
    fwd: V;
    up: V;
    right: V;
    rocks: Body[];
    named: NamedBody[];
    ring: V & { n: V; side: number };
    active: number;
    pathTimer: number;
    neoNext: number;
    neoTimer: number;
    /** this sample's input: thrust, and yaw and pitch per step */
    input: { thrust: number; yaw: number; pitch: number };
    /** the drawing's own: a field flown past between flights, where nothing hits (never on the server) */
    ghost?: boolean;
};

const body = (): Body => ({ ...v(), r: 1, live: false, drift: v() });

function orient(f: Flight) {
    f.fwd = rotate(f.q, v(0, 0, -1));
    f.up = rotate(f.q, v(0, 1, 0));
    f.right = rotate(f.q, v(1, 0, 0));
}

function randomDir(f: Flight): V {
    const rnd = f.rnd;
    const d = v(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
    if (dot(d, d) < 1e-8) d.z = -1;
    return norm(d);
}

/** A rock somewhere: all round at the start (a clear way ahead), after that mostly ahead. */
function place(f: Flight, k: Body, atStart: boolean) {
    const rnd = f.rnd;
    let dir = randomDir(f);
    let dist = 0;
    for (let tries = 0; tries < 6; tries++) {
        if (tries) dir = randomDir(f);
        if (atStart) {
            dist = 22 + Math.sqrt(rnd()) * (FIELD - 22);
            if (dot(dir, f.fwd) > 0.85 && dist < 90) continue;
        } else {
            dir = norm(v(dir.x * 0.75 + f.fwd.x, dir.y * 0.75 + f.fwd.y, dir.z * 0.75 + f.fwd.z));
            dist = FIELD * (0.78 + rnd() * 0.22);
        }
        break;
    }
    k.x = f.pos.x + dir.x * dist;
    k.y = f.pos.y + dir.y * dist;
    k.z = f.pos.z + dir.z * dist;
    // mostly small, now and then a big one
    const u = rnd();
    k.r = (0.7 + u * u * Math.sqrt(Math.sqrt(u)) * 4.4) * 0.9;
    k.drift = v((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4);
    k.live = true;
}

function placeRing(f: Flight) {
    const rnd = f.rnd;
    const d = norm(v(f.fwd.x + (rnd() - 0.5) * 0.75, f.fwd.y + (rnd() - 0.5) * 0.75, f.fwd.z + (rnd() - 0.5) * 0.75));
    const dist = 70 + rnd() * 30;
    const ring = f.ring;
    ring.x = f.pos.x + d.x * dist;
    ring.y = f.pos.y + d.y * dist;
    ring.z = f.pos.z + d.z * dist;
    // facing the ship
    ring.n = norm(v(f.pos.x - ring.x, f.pos.y - ring.y, f.pos.z - ring.z));
    ring.side = ringSide(f);
}
const ringSide = (f: Flight) => (f.pos.x - f.ring.x) * f.ring.n.x + (f.pos.y - f.ring.y) * f.ring.n.y + (f.pos.z - f.ring.z) * f.ring.n.z;

/** A new flight. The open field's seed is dealt by the server; today's field is seeded by the day. */
export function newFlight(seed: number, day: string | null, neos: RunNeo[]): Flight {
    const f: Flight = {
        rnd: seededRandom(day ? `flight:${day}` : `flight:open:${seed >>> 0}`),
        daily: !!day,
        neos: day ? neos.slice(0, 8) : [],
        step: 0,
        over: false,
        time: 0,
        distance: 0,
        bonus: 0,
        rings: 0,
        speed: CRUISE,
        shields: SHIELDS,
        invulnerable: 2,
        pos: v(),
        q: { x: 0, y: 0, z: 0, w: 1 },
        fwd: v(0, 0, -1),
        up: v(0, 1, 0),
        right: v(1, 0, 0),
        rocks: Array.from({ length: ROCKS }, body),
        named: Array.from({ length: 8 }, () => ({ ...body(), neo: -1, near: false })),
        ring: { ...v(), n: v(0, 0, 1), side: 0 },
        active: 160,
        pathTimer: 2,
        neoNext: 0,
        neoTimer: 8,
        input: { thrust: 0, yaw: 0, pitch: 0 },
    };
    for (let i = 0; i < f.active; i++) place(f, f.rocks[i], true);
    placeRing(f);
    return f;
}

/** A tape sample: thrust (-1, 0, 1), and the yaw and pitch over the sample, in radians. */
export function sample(thrust: number, yaw: number, pitch: number): number[] {
    const q = (a: number) => Math.round(Math.max(-0.5, Math.min(0.5, a)) / TURN_UNIT);
    return [Math.max(-1, Math.min(1, Math.round(thrust))) + 1, q(yaw), q(pitch)];
}

function useSample(f: Flight, s: number[]) {
    f.input.thrust = Math.max(0, Math.min(2, s[0] | 0)) - 1;
    const clamp = (n: number) => Math.max(-5000, Math.min(5000, n | 0));
    f.input.yaw = (clamp(s[1]) * TURN_UNIT) / INPUT_EVERY;
    f.input.pitch = (clamp(s[2]) * TURN_UNIT) / INPUT_EVERY;
}

// the rock furthest behind, put right in the way: ahead, near the ship's line
function inTheWay(f: Flight) {
    let pick: Body | null = null;
    let behind = Infinity;
    for (let i = 0; i < f.active; i++) {
        const k = f.rocks[i];
        if (!k.live) continue;
        const d = (k.x - f.pos.x) * f.fwd.x + (k.y - f.pos.y) * f.fwd.y + (k.z - f.pos.z) * f.fwd.z;
        if (d < behind) {
            behind = d;
            pick = k;
        }
    }
    if (!pick) return;
    place(f, pick, false);
    const rnd = f.rnd;
    const d = v(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
    const along = dot(d, f.fwd);
    const side = norm(v(d.x - f.fwd.x * along, d.y - f.fwd.y * along, d.z - f.fwd.z * along));
    const ahead = 70 + rnd() * 40;
    const off = rnd() * 3.5;
    pick.x = f.pos.x + f.fwd.x * ahead + side.x * off;
    pick.y = f.pos.y + f.fwd.y * ahead + side.y * off;
    pick.z = f.pos.z + f.fwd.z * ahead + side.z * off;
    pick.drift = v(pick.drift.x * 0.3, pick.drift.y * 0.3, pick.drift.z * 0.3);
}

const dist2 = (a: V, b: V) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z);

function hit(f: Flight, ev: FlightEvent[], neo: number | null) {
    f.shields -= 1;
    f.invulnerable = 1.6;
    f.speed *= 0.4;
    ev.push({ kind: "hit", neo });
    if (f.shields <= 0) {
        f.over = true;
        ev.push({ kind: "over" });
    }
}

/** One step; `input` is the tape sample at the start of every INPUT_EVERY steps. */
export function stepFlight(f: Flight, input: number[] | null): FlightEvent[] {
    const ev: FlightEvent[] = [];
    if (f.over) return ev;
    if (f.step % INPUT_EVERY === 0 && input) useSample(f, input);
    f.step += 1;
    const dt = DT;
    const rnd = f.rnd;

    // the nose turns; a gentle hand keeps the roll level unless pointing
    // nearly straight up or down
    f.q = qmul(qmul(f.q, around("y", f.input.yaw)), around("x", f.input.pitch));
    orient(f);
    if (Math.abs(f.fwd.y) < 0.85) {
        const roll = -datan2(f.right.y, f.up.y);
        f.q = qmul(f.q, around("z", roll * Math.min(1, dt * 1.4)));
    }
    const l = Math.sqrt(f.q.x * f.q.x + f.q.y * f.q.y + f.q.z * f.q.z + f.q.w * f.q.w) || 1;
    f.q = { x: f.q.x / l, y: f.q.y / l, z: f.q.z / l, w: f.q.w / l };
    orient(f);

    const want = f.input.thrust > 0 ? FAST : f.input.thrust < 0 ? SLOW : CRUISE;
    f.speed += (want - f.speed) * Math.min(1, dt * 1.6);
    f.time += dt;
    f.distance += f.speed * dt;
    f.invulnerable = Math.max(0, f.invulnerable - dt);
    f.active = Math.min(ROCKS, Math.floor(160 + f.time * 1.5));
    f.pos.x += f.fwd.x * f.speed * dt;
    f.pos.y += f.fwd.y * f.speed * dt;
    f.pos.z += f.fwd.z * f.speed * dt;

    const far2 = FIELD * 1.08 * (FIELD * 1.08);
    for (let i = 0; i < ROCKS; i++) {
        const k = f.rocks[i];
        if (!k.live) {
            if (i < f.active) place(f, k, false);
            continue;
        }
        k.x += k.drift.x * dt;
        k.y += k.drift.y * dt;
        k.z += k.drift.z * dt;
        const d2 = dist2(k, f.pos);
        if (d2 > far2) {
            if (i < f.active) place(f, k, false);
            else k.live = false;
            continue;
        }
        const reach = k.r + SHIP_R;
        if (!f.ghost && f.invulnerable <= 0 && d2 < reach * reach) {
            place(f, k, false);
            hit(f, ev, null);
            if (f.over) return ev;
        }
    }
    f.pathTimer -= dt;
    if (f.pathTimer <= 0) {
        inTheWay(f);
        // more often as the flight goes on, and at speed
        f.pathTimer = Math.max(0.9, 2.6 - f.time / 60) * Math.sqrt(CRUISE / Math.max(f.speed, SLOW));
    }
    if (f.daily && f.neoNext < f.neos.length) {
        f.neoTimer -= dt;
        if (f.neoTimer <= 0) {
            const i = f.neoNext;
            const k = f.named[i];
            f.neoNext += 1;
            if (k) {
                const sideSign = rnd() < 0.5 ? -1 : 1;
                const across = sideSign * (16 + rnd() * 8);
                const lift = (rnd() - 0.5) * 14;
                k.x = f.pos.x + f.fwd.x * 95 + f.right.x * across + f.up.x * lift;
                k.y = f.pos.y + f.fwd.y * 95 + f.right.y * across + f.up.y * lift;
                k.z = f.pos.z + f.fwd.z * 95 + f.right.z * across + f.up.z * lift;
                const aim = norm(v(f.pos.x + f.fwd.x * 70 - k.x, f.pos.y + f.fwd.y * 70 - k.y, f.pos.z + f.fwd.z * 70 - k.z));
                k.drift = v(aim.x * 7, aim.y * 7, aim.z * 7);
                k.r = neoScale(f.neos[i].d) * 1.5 * 0.92;
                k.neo = i;
                k.near = false;
                k.live = true;
                ev.push({ kind: "neo", index: i });
            }
            f.neoTimer = 12;
        }
    }
    for (const k of f.named) {
        if (!k.live) continue;
        k.x += k.drift.x * dt;
        k.y += k.drift.y * dt;
        k.z += k.drift.z * dt;
        const d2 = dist2(k, f.pos);
        if (d2 < 1600) k.near = true;
        if (d2 > far2) {
            if (k.near) ev.push({ kind: "passed", neo: k.neo });
            k.live = false;
            continue;
        }
        const reach = k.r + SHIP_R;
        if (!f.ghost && f.invulnerable <= 0 && d2 < reach * reach) {
            k.live = false;
            hit(f, ev, k.neo);
            if (f.over) return ev;
        }
    }

    // the ring: through it for points (every fifth restores a shield); a missed one goes
    const side = ringSide(f);
    if (!f.ghost && (side < 0) !== (f.ring.side < 0)) {
        const px = f.pos.x - f.ring.x - f.ring.n.x * side;
        const py = f.pos.y - f.ring.y - f.ring.n.y * side;
        const pz = f.pos.z - f.ring.z - f.ring.n.z * side;
        const lim = RING_R - 0.15;
        if (px * px + py * py + pz * pz < lim * lim) {
            f.rings += 1;
            f.bonus += 100;
            const shield = f.rings % 5 === 0 && f.shields < SHIELDS;
            if (shield) f.shields += 1;
            ev.push({ kind: "ring", shield });
            placeRing(f);
        }
    }
    f.ring.side = ringSide(f);
    const toRing = v(f.ring.x - f.pos.x, f.ring.y - f.pos.y, f.ring.z - f.pos.z);
    if (dot(toRing, toRing) > 230 * 230 || dot(toRing, f.fwd) < -30) placeRing(f);
    return ev;
}

export const flightScore = (f: Flight) => Math.floor(f.distance / 10) + f.bonus;

/** The server's replay: the score this tape earns, or null if it isn't a whole flight. */
export function replayFlight(samples: number[][], seed: number, day: string | null, neos: RunNeo[]): number | null {
    if (!samples.length || samples.length > MAX_SAMPLES) return null;
    const f = newFlight(seed, day, neos);
    for (let i = 0; i < samples.length; i++) {
        for (let k = 0; k < INPUT_EVERY; k++) {
            stepFlight(f, k === 0 ? samples[i] : null);
            if (f.over) return flightScore(f);
        }
    }
    return null;
}
