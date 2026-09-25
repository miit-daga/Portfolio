// Asteroid Run's rules, apart from the drawing, so the server can replay a run
// (app/api/leaderboard) and score it itself: a posted score is the server's.
//
// The run steps at a fixed 1/120 s, and everything that decides it (rocks,
// fragments, the shield ring, power-ups, today's asteroids) comes from one
// seeded random sequence, so the same seed and the same input give the same
// run on any device. It uses plain arithmetic only (collisions compare
// squared distances), which every browser and the server compute alike.
//
// The input is sampled every INPUT_EVERY steps, quantized as it would be
// stored, and those samples are the run's tape (tape.ts): [keys, aim x, aim y],
// where keys packs the arrow/WASD direction and whether the mouse or a finger
// is steering, and the aim is in 1/32 units of the field.

import { seededRandom } from "./seed";

export const DT = 1 / 120;
export const INPUT_EVERY = 4;
export const BOUNDS = { x: 6.5, y: 3.6 };
export const SHIELDS = 3;
export const ROCKS = 70;
export const FRAGS = 8;
export const FAR = -190;
export const POWER_TIME = { star: 6, boost: 4 } as const;
export type Power = keyof typeof POWER_TIME;
export const TAPE_DELTA = [false, true, true];
export const TAPE_WIDTH = 3;
/**
 * The tour past the worlds, some way into a run: which ones, in order, how big
 * they're drawn, and how high the run goes round each. Its timing is part of
 * the run (the grace leaving each orbit decides hits), so it's here, in the
 * run's own time and distance: TOUR_FIRST seconds in, the first comes in over
 * TOUR_IN seconds; the run goes once round it (its circumference at that
 * height, in the field's distance); leaving takes TOUR_OUT seconds, from the
 * start of which nothing hits the ship for TOUR_OUT + TOUR_SAFE; then
 * TOUR_GAP seconds of open space before the next.
 */
export const TOUR = [
    { key: "earth", name: "Earth", r: 120, alt: 10 },
    { key: "moon", name: "the Moon", r: 60, alt: 8 },
    { key: "mars", name: "Mars", r: 90, alt: 9 },
    { key: "jupiter", name: "Jupiter", r: 260, alt: 18 },
    { key: "saturn", name: "Saturn", r: 220, alt: 16 },
    { key: "uranus", name: "Uranus", r: 150, alt: 12 },
    { key: "neptune", name: "Neptune", r: 150, alt: 12 },
    { key: "pluto", name: "Pluto", r: 45, alt: 7 },
] as const;
export const TOUR_FIRST = 12;
export const TOUR_IN = 10;
export const TOUR_OUT = 2.5;
export const TOUR_SAFE = 3;
export const TOUR_GAP = 8;
export type TourStage = "gap" | "in" | "round" | "out" | "done";

/** About two hours: longer is past any run. */
export const MAX_SAMPLES = (2 * 3600) / (DT * INPUT_EVERY);

/** Today's real asteroids as the run uses them: diameter (m), speed (km/s), hazardous. */
export type RunNeo = { d: number; v: number; h: boolean };
export type Thing = { x: number; y: number; z: number; r: number; live: boolean };
export type RunEvent =
    | { kind: "hit"; neo: number | null }
    | { kind: "smash" }
    | { kind: "fragment" }
    | { kind: "shield" }
    | { kind: "power"; power: Power }
    | { kind: "powerEnd" }
    | { kind: "neo"; index: number }
    | { kind: "passed"; neo: number }
    | { kind: "tour"; stage: TourStage; index: number }
    | { kind: "over" };

export type Run = {
    rnd: () => number;
    daily: boolean;
    neos: RunNeo[];
    step: number;
    over: boolean;
    time: number;
    distance: number;
    bonus: number;
    speed: number;
    shields: number;
    invulnerable: number;
    /** leaving a world's orbit: nothing hits the ship while this lasts */
    grace: number;
    /** the tour past the worlds: which one, where it's got to, its stage's time and (going round) distance */
    tour: { index: number; stage: TourStage; t: number; dist: number };
    ship: { x: number; y: number; vx: number; vy: number };
    rocks: Thing[];
    /** which of today's asteroids each named rock is (-1: none) */
    named: (Thing & { neo: number })[];
    frags: Thing[];
    ring: Thing;
    pickup: Thing & { kind: Power | null };
    power: Power | null;
    powerLeft: number;
    rockTimer: number;
    fragTimer: number;
    ringTimer: number;
    pickupTimer: number;
    neoNext: number;
    neoTimer: number;
    /** how the ship is steered this sample: from the tape */
    input: { tx: number; ty: number; aim: boolean; ax: number; ay: number };
};

const thing = (): Thing => ({ x: 0, y: 0, z: 0, r: 1, live: false });

/** The size of one of today's asteroids in the field, from its real diameter. */
export const neoScale = (d: number) => 1.8 + 1.6 * Math.min(1, Math.max(0, (Math.log10(Math.max(1, d)) - 1.3) / 1.4));

/** A new run. The open field's seed is any whole number; today's field is seeded by the day. */
export function newRun(seed: number, day: string | null, neos: RunNeo[]): Run {
    const rnd = seededRandom(day ? `run:${day}` : `run:open:${seed >>> 0}`);
    const s: Run = {
        rnd,
        daily: !!day,
        neos: day ? neos.slice(0, 8) : [],
        step: 0,
        over: false,
        time: 0,
        distance: 0,
        bonus: 0,
        speed: 26,
        shields: SHIELDS,
        invulnerable: 1,
        grace: 0,
        tour: { index: 0, stage: "gap", t: 0, dist: 0 },
        ship: { x: 0, y: 0, vx: 0, vy: 0 },
        rocks: Array.from({ length: ROCKS }, thing),
        named: Array.from({ length: 8 }, () => ({ ...thing(), neo: -1 })),
        frags: Array.from({ length: FRAGS }, thing),
        ring: thing(),
        pickup: { ...thing(), kind: null },
        power: null,
        powerLeft: 0,
        rockTimer: 0,
        fragTimer: 0,
        ringTimer: 0,
        pickupTimer: 0,
        neoNext: 0,
        neoTimer: 8,
        input: { tx: 0, ty: 0, aim: false, ax: 0, ay: 0 },
    };
    s.ringTimer = 12 + rnd() * 8;
    s.pickupTimer = 18 + rnd() * 12;
    // a field already coming
    for (let i = 0; i < 14; i++) {
        const r = spawnRock(s, false);
        if (r) r.z = FAR + i * 12;
    }
    return s;
}

function spawnRock(s: Run, aimed: boolean) {
    const r = s.rocks.find((x) => !x.live);
    if (!r) return null;
    const rnd = s.rnd;
    const scale = 0.7 + rnd() * 1.7;
    r.r = scale * 0.92;
    r.x = aimed ? s.ship.x + (rnd() - 0.5) * 2 : (rnd() - 0.5) * (BOUNDS.x * 2 + 6);
    r.y = aimed ? s.ship.y + (rnd() - 0.5) * 1.5 : (rnd() - 0.5) * (BOUNDS.y * 2 + 4);
    r.z = FAR - rnd() * 20;
    r.live = true;
    return r;
}

/** A tape sample from what's steering the ship (quantized as stored). */
export function sample(tx: number, ty: number, aim: boolean, ax: number, ay: number): number[] {
    const q = (v: number) => Math.round(Math.max(-12, Math.min(12, v)) * 32);
    return [(tx + 1) * 3 + (ty + 1) + (aim ? 9 : 0), q(ax), q(ay)];
}

function useSample(s: Run, v: number[]) {
    const k = Math.max(0, Math.min(17, v[0] | 0));
    s.input.aim = k >= 9;
    const d = k % 9;
    s.input.tx = Math.floor(d / 3) - 1;
    s.input.ty = (d % 3) - 1;
    s.input.ax = v[1] / 32;
    s.input.ay = v[2] / 32;
}

const near = (s: Run, t: Thing, reach: number) => {
    const dx = t.x - s.ship.x;
    const dy = t.y - s.ship.y;
    return dx * dx + dy * dy + t.z * t.z < reach * reach;
};

/**
 * One step. At the start of every INPUT_EVERY steps, `input` is the tape
 * sample for them (ignored in between). Returns what happened.
 */
export function stepRun(s: Run, input: number[] | null): RunEvent[] {
    const ev: RunEvent[] = [];
    if (s.over) return ev;
    if (s.step % INPUT_EVERY === 0 && input) useSample(s, input);
    s.step += 1;
    const dt = DT;
    const rnd = s.rnd;
    const sh = s.ship;
    const { tx, ty } = s.input;

    // steering: toward the pointer, or by the keys
    if (s.input.aim && !tx && !ty) {
        sh.vx += ((s.input.ax - sh.x) * 6 - sh.vx) * (dt * 8);
        sh.vy += ((s.input.ay - sh.y) * 6 - sh.vy) * (dt * 8);
    } else {
        sh.vx += (tx * 11 - sh.vx) * (dt * 7);
        sh.vy += (ty * 9 - sh.vy) * (dt * 7);
    }
    sh.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, sh.x + sh.vx * dt));
    sh.y = Math.max(-BOUNDS.y, Math.min(BOUNDS.y, sh.y + sh.vy * dt));
    s.time += dt;
    // (today's field goes at a pace set by today's asteroids' real speeds)
    const pace = s.daily && s.neos.length ? Math.min(1.15, Math.max(0.9, 0.9 + (s.neos.reduce((a, n) => a + n.v, 0) / s.neos.length - 10) / 100)) : 1;
    s.speed = Math.min(88, (26 + s.time * 1.15) * pace);
    // a boost: over twice as fast, and its distance counts double
    s.distance += s.speed * dt * (s.power === "boost" ? 4.4 : 1);
    if (s.power) {
        s.powerLeft -= dt;
        if (s.powerLeft <= 0) {
            s.power = null;
            s.invulnerable = Math.max(s.invulnerable, 0.8);
            ev.push({ kind: "powerEnd" });
        }
    }
    s.invulnerable = Math.max(0, s.invulnerable - dt);
    s.grace = Math.max(0, s.grace - dt);
    const dz = s.speed * dt * (s.power === "boost" ? 2.2 : 1);

    // the tour past the worlds
    const tr = s.tour;
    if (tr.stage !== "done") {
        tr.t += dt;
        if (tr.stage === "gap" && tr.t >= (tr.index === 0 ? TOUR_FIRST : TOUR_GAP)) {
            tr.stage = "in";
            tr.t = 0;
            ev.push({ kind: "tour", stage: "in", index: tr.index });
        } else if (tr.stage === "in" && tr.t >= TOUR_IN) {
            tr.stage = "round";
            tr.t = 0;
            tr.dist = 0;
            ev.push({ kind: "tour", stage: "round", index: tr.index });
        } else if (tr.stage === "round") {
            tr.dist += dz;
            const w = TOUR[tr.index];
            if (tr.dist >= 6.283185307179586 * (w.r + w.alt)) {
                tr.stage = "out";
                tr.t = 0;
                s.grace = Math.max(s.grace, TOUR_OUT + TOUR_SAFE);
                ev.push({ kind: "tour", stage: "out", index: tr.index });
            }
        } else if (tr.stage === "out" && tr.t >= TOUR_OUT) {
            tr.index += 1;
            tr.stage = tr.index < TOUR.length ? "gap" : "done";
            tr.t = 0;
            ev.push({ kind: "tour", stage: tr.stage, index: tr.index });
        }
    }

    s.rockTimer -= dt;
    if (s.rockTimer <= 0) {
        spawnRock(s, rnd() < 0.28 + Math.min(0.3, s.time / 120));
        s.rockTimer = Math.max(0.08, 0.42 - s.time / 150);
    }
    s.fragTimer -= dt;
    if (s.fragTimer <= 0) {
        const f = s.frags.find((x) => !x.live);
        if (f) {
            f.x = (rnd() - 0.5) * BOUNDS.x * 1.8;
            f.y = (rnd() - 0.5) * BOUNDS.y * 1.8;
            f.z = FAR;
            f.live = true;
        }
        s.fragTimer = 2.2 + rnd() * 1.6;
    }
    if (s.daily && s.neoNext < s.neos.length) {
        s.neoTimer -= dt;
        if (s.neoTimer <= 0) {
            const i = s.neoNext;
            const r = s.named[i];
            s.neoNext += 1;
            if (r) {
                r.r = neoScale(s.neos[i].d) * 0.92;
                r.x = (rnd() - 0.5) * BOUNDS.x * 1.4;
                r.y = (rnd() - 0.5) * BOUNDS.y * 1.4;
                r.z = FAR;
                r.neo = i;
                r.live = true;
                ev.push({ kind: "neo", index: i });
            }
            s.neoTimer = 12;
        }
    }

    const all: Thing[] = [...s.rocks, ...s.named];
    for (const r of all) {
        if (!r.live) continue;
        r.z += dz;
        const neo = "neo" in r ? (r as Thing & { neo: number }).neo : -1;
        if (r.z > 12) {
            r.live = false;
            if (neo >= 0) ev.push({ kind: "passed", neo });
            continue;
        }
        if (Math.abs(r.z) >= r.r + 0.8) continue;
        // invincible or boosting: rocks shatter on the ship, for points
        if (s.power) {
            if (near(s, r, r.r + 0.7)) {
                r.live = false;
                s.bonus += 25;
                ev.push({ kind: "smash" });
            }
            continue;
        }
        if (s.invulnerable <= 0 && s.grace <= 0 && near(s, r, r.r + 0.55)) {
            s.shields -= 1;
            s.invulnerable = 1.4;
            if (!s.ring.live) s.ringTimer = Math.min(s.ringTimer, 5 + rnd() * 4);
            r.live = false;
            ev.push({ kind: "hit", neo: neo >= 0 ? neo : null });
            if (s.shields <= 0) {
                s.over = true;
                ev.push({ kind: "over" });
                return ev;
            }
        }
    }
    for (const f of s.frags) {
        if (!f.live) continue;
        f.z += dz;
        if (f.z > 12) f.live = false;
        else if (Math.abs(f.z) < 1.2 && near(s, f, 1.25)) {
            s.bonus += 50;
            f.live = false;
            ev.push({ kind: "fragment" });
        }
    }

    // the shield ring: counts down only while a shield is down
    const ring = s.ring;
    if (!ring.live && s.shields < SHIELDS) {
        s.ringTimer -= dt;
        if (s.ringTimer <= 0) {
            ring.x = (rnd() - 0.5) * BOUNDS.x * 1.6;
            ring.y = (rnd() - 0.5) * BOUNDS.y * 1.6;
            ring.z = FAR;
            ring.live = true;
            s.ringTimer = 12 + rnd() * 8;
        }
    }
    if (ring.live) {
        ring.z += dz;
        if (ring.z > 12) ring.live = false;
        else if (Math.abs(ring.z) < 1.3 && near(s, ring, 1.5)) {
            ring.live = false;
            s.shields = Math.min(SHIELDS, s.shields + 1);
            ev.push({ kind: "shield" });
        }
    }

    // the power-ups: one at a time, never while one is running
    const pk = s.pickup;
    if (!pk.live && !s.power) {
        s.pickupTimer -= dt;
        if (s.pickupTimer <= 0) {
            pk.kind = rnd() < 0.5 ? "star" : "boost";
            pk.x = (rnd() - 0.5) * BOUNDS.x * 1.5;
            pk.y = (rnd() - 0.5) * BOUNDS.y * 1.5;
            pk.z = FAR;
            pk.live = true;
            s.pickupTimer = 18 + rnd() * 12;
        }
    }
    if (pk.live) {
        pk.z += dz;
        if (pk.z > 12) pk.live = false;
        else if (Math.abs(pk.z) < 1.3 && near(s, pk, 1.5) && pk.kind) {
            s.power = pk.kind;
            s.powerLeft = POWER_TIME[pk.kind];
            pk.live = false;
            ev.push({ kind: "power", power: pk.kind });
        }
    }
    return ev;
}

export const runScore = (s: Run) => Math.floor(s.distance / 10) + s.bonus;

/**
 * The server's replay: the score this tape earns, or null if it isn't a
 * whole run (malformed, or it stops before the run ends).
 */
export function replayRun(samples: number[][], seed: number, day: string | null, neos: RunNeo[]): number | null {
    if (!samples.length || samples.length > MAX_SAMPLES) return null;
    const s = newRun(seed, day, neos);
    for (let i = 0; i < samples.length; i++) {
        for (let k = 0; k < INPUT_EVERY; k++) {
            stepRun(s, k === 0 ? samples[i] : null);
            if (s.over) return runScore(s);
        }
    }
    return null;
}
