// Gravity Assist's physics and missions, apart from the drawing, so the same
// code can be checked by a script (every mission has to be winnable).
//
// Everything happens in one flat plane, x across and y up the screen. A probe
// leaves Earth at up to VMAX, and every body pulls on it with strength mu
// (acceleration mu / distance², softened a little up close). Some planets
// orbit the Sun, and a probe that passes close behind a moving planet is
// flung on faster: a real gravity assist, the way Voyager crossed the solar
// system. Touch a body and the probe is lost; reach the target's capture ring
// (after any flybys the mission asks for) and it has arrived.

export type Kind = "sun" | "earth" | "moon" | "mars" | "jupiter" | "saturn" | "neptune" | "rock";
export type Orbit = { around: [number, number]; R: number; period: number; phase: number };
// (pass: how close counts as a flyby, where a mission wants it closer than usual)
export type Body = { kind: Kind; r: number; mu: number; at?: [number, number]; orbit?: Orbit; pass?: number };
export type Level = {
    name: string;
    brief: string;
    fact: string;
    bodies: Body[];
    start: number; // Earth, in bodies
    target: number;
    flyby?: number[]; // bodies to pass close to on the way
    par: number; // launches for three stars
};

// The missions are laid out for a top speed of 30; everything runs SLOW
// times slower (gravity by its square, orbits by it), which follows exactly
// the same paths, only at a pace you can watch
const SLOW = 1.9;
export const VMAX = 30 / SLOW;
const G = 1 / (SLOW * SLOW);
export const DT = 1 / 120;
export const MAX_TIME = 40;
export const BOUNDS = { x: 60, y: 36 };
const SOFT = 0.25;
/** How close counts as a flyby, and as arriving, for a body of radius r. */
export const flybyRadius = (r: number) => r * 3.2 + 1.5;
export const captureRadius = (r: number) => r * 1.8 + 2;
export const passRadius = (b: Body) => b.pass ?? flybyRadius(b.r);

/** Where a body is at time t. */
export function bodyAt(b: Body, t: number, out: [number, number] = [0, 0]): [number, number] {
    if (b.orbit) {
        const a = b.orbit.phase + (t / (b.orbit.period * SLOW)) * Math.PI * 2;
        out[0] = b.orbit.around[0] + Math.cos(a) * b.orbit.R;
        out[1] = b.orbit.around[1] + Math.sin(a) * b.orbit.R;
    } else {
        out[0] = b.at![0];
        out[1] = b.at![1];
    }
    return out;
}

// A wall of rocks along a line, with a little scatter: the same every time
function belt(from: [number, number], to: [number, number], count: number, seed: number): Body[] {
    let s = seed;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, (_, i) => {
        const f = (i + 0.5) / count;
        return {
            kind: "rock" as const,
            r: 0.5 + rand() * 0.6,
            mu: 0,
            at: [from[0] + (to[0] - from[0]) * f + (rand() - 0.5) * 1.6, from[1] + (to[1] - from[1]) * f + (rand() - 0.5) * 1.6] as [number, number],
        };
    });
}

const EARTH = (x: number, y: number): Body => ({ kind: "earth", r: 1.6, mu: 30, at: [x, y] });

export const LEVELS: Level[] = [
    {
        name: "First flight",
        brief: "Press anywhere and drag back to aim, and let go to launch. Reach Mars.",
        fact: "Mariner 4 made the first flyby of Mars in 1965, and sent back 22 photographs.",
        bodies: [EARTH(-40, -6), { kind: "mars", r: 1.3, mu: 60, at: [34, 10] }],
        start: 0,
        target: 1,
        par: 1,
    },
    {
        name: "Jupiter's pull",
        brief: "Jupiter bends everything that passes it. Aim for Mars, and allow for the pull.",
        fact: "Jupiter is more than twice as massive as all the other planets together.",
        bodies: [EARTH(-40, -14), { kind: "jupiter", r: 4.2, mu: 2600, at: [-2, 6] }, { kind: "mars", r: 1.3, mu: 60, at: [36, -16] }],
        start: 0,
        target: 2,
        par: 2,
    },
    {
        name: "Behind the giant",
        brief: "Neptune is hidden behind Jupiter. Swing round the giant to reach it.",
        fact: "Voyager 2 is the only spacecraft to have visited Neptune, in 1989.",
        bodies: [EARTH(-42, 0), { kind: "jupiter", r: 4.2, mu: 2600, at: [0, 0] }, { kind: "neptune", r: 2.3, mu: 500, at: [40, 0] }],
        start: 0,
        target: 2,
        par: 3,
    },
    {
        name: "The belt",
        brief: "A wall of asteroids stands between you and Mars. Find the way round.",
        fact: "The asteroid belt is so sparse that probes cross it without trying to dodge.",
        bodies: [
            EARTH(-42, 14),
            { kind: "saturn", r: 3.4, mu: 2200, at: [-4, -18] },
            { kind: "mars", r: 1.3, mu: 60, at: [40, -12] },
            ...belt([6, 30], [16, -10], 18, 7),
        ],
        start: 0,
        target: 2,
        par: 3,
    },
    {
        name: "Moving target",
        brief: "Mars is going round the Sun. Aim for where it will be, not where it is.",
        fact: "Missions to Mars leave in a launch window that opens about every 26 months.",
        bodies: [
            EARTH(-44, -22),
            { kind: "sun", r: 4.5, mu: 1800, at: [4, 2] },
            { kind: "mars", r: 1.3, mu: 60, orbit: { around: [4, 2], R: 22, period: 16, phase: 0 } },
        ],
        start: 0,
        target: 2,
        par: 3,
    },
    {
        name: "The assist",
        brief: "Neptune is a long way out. Pass close behind Jupiter as it moves, and it will fling you on, faster.",
        fact: "Voyager 2 gained about 10 km/s from Jupiter, and more from Saturn and Uranus.",
        bodies: [
            EARTH(-46, -20),
            { kind: "sun", r: 4.5, mu: 2600, at: [-14, 4] },
            { kind: "jupiter", r: 3.6, mu: 1600, orbit: { around: [-14, 4], R: 18, period: 14, phase: 0.6 } },
            { kind: "neptune", r: 2.3, mu: 400, at: [44, 22] },
        ],
        start: 0,
        target: 3,
        flyby: [2],
        par: 4,
    },
    {
        name: "Ringed world",
        brief: "Reach Saturn, going past Mars on the way.",
        fact: "Cassini orbited Saturn for 13 years before diving into it in 2017.",
        bodies: [
            EARTH(-44, 0),
            { kind: "mars", r: 1.3, mu: 60, at: [-14, 18] },
            { kind: "jupiter", r: 4.2, mu: 2600, at: [0, -6] },
            { kind: "saturn", r: 3.4, mu: 900, at: [40, 14] },
            ...belt([16, -32], [22, 6], 14, 3),
        ],
        start: 0,
        target: 3,
        flyby: [1],
        par: 4,
    },
    {
        name: "Grand tour",
        brief: "Visit Jupiter and Saturn, then Neptune, like Voyager 2.",
        fact: "The planets lined up for Voyager's grand tour once in 175 years.",
        bodies: [
            EARTH(-46, -22),
            { kind: "jupiter", r: 4, mu: 2200, at: [-16, 6] },
            { kind: "saturn", r: 3.4, mu: 1800, at: [10, -8] },
            { kind: "neptune", r: 2.3, mu: 400, at: [44, 18] },
        ],
        start: 0,
        target: 3,
        flyby: [1, 2],
        par: 5,
    },
    {
        name: "Chandrayaan-3",
        brief: "ISRO's Moon mission: catch the Moon as it goes round Earth.",
        fact: "Chandrayaan-3's Vikram lander touched down near the Moon's south pole on 23 August 2023, the first landing there.",
        bodies: [
            { kind: "earth", r: 1.8, mu: 700, at: [-26, -6] },
            { kind: "moon", r: 1, mu: 260, orbit: { around: [-26, -6], R: 28, period: 26, phase: 0.4 } },
        ],
        start: 0,
        target: 1,
        par: 2,
    },
    {
        name: "Two giants",
        brief: "Thread the gap between Jupiter and Saturn to reach Neptune.",
        fact: "Jupiter and Saturn line up in our sky every 20 years or so, the Great Conjunction.",
        bodies: [
            EARTH(-44, 4),
            { kind: "jupiter", r: 4.2, mu: 2600, at: [-4, 10] },
            { kind: "saturn", r: 3.4, mu: 2200, at: [-2, -8] },
            { kind: "neptune", r: 2.3, mu: 400, at: [42, -16] },
        ],
        start: 0,
        target: 3,
        par: 3,
    },
    {
        name: "Close to the Sun",
        brief: "Skim close past the Sun, through the amber ring, then reach Mars.",
        fact: "Parker Solar Probe, the fastest thing people have made, flies within 6.2 million km of the Sun.",
        bodies: [
            EARTH(-44, 20),
            { kind: "sun", r: 4.5, mu: 2400, at: [-2, 0], pass: 12.5 },
            { kind: "mars", r: 1.3, mu: 60, at: [40, -16] },
        ],
        start: 0,
        target: 2,
        flyby: [1],
        par: 3,
    },
    {
        name: "Mangalyaan",
        brief: "ISRO's Mars Orbiter Mission. Mars starts on the far side of the Sun: swing round the Sun, or wait for Mars to come round, and aim for where it will be.",
        fact: "India's Mars Orbiter Mission reached Mars on 24 September 2014, the first to get there on a first attempt.",
        bodies: [
            EARTH(-52, -6),
            { kind: "sun", r: 4.5, mu: 3200, at: [2, 0] },
            { kind: "mars", r: 1.3, mu: 60, orbit: { around: [2, 0], R: 24, period: 30, phase: -0.5 } },
        ],
        start: 0,
        target: 2,
        par: 4,
    },
    {
        name: "The maze",
        brief: "Two walls of asteroids, with a gap at opposite ends. Wind your way through to Mars.",
        fact: "The asteroid belt holds over a million rocks bigger than a kilometre, yet all of it together weighs less than the Moon.",
        bodies: [
            EARTH(-44, -14),
            { kind: "jupiter", r: 4, mu: 2400, at: [0, 2] },
            { kind: "mars", r: 1.3, mu: 60, at: [42, 14] },
            ...belt([-20, 36], [-16, -8], 14, 11),
            ...belt([16, -36], [20, 10], 14, 13),
        ],
        start: 0,
        target: 2,
        par: 4,
    },
    {
        name: "Free return",
        brief: "Loop round the Moon and come home to Earth, the way Apollo 13 did.",
        fact: "Apollo 13's crew swung round the Moon to get home after an oxygen tank burst in 1970.",
        bodies: [
            { kind: "earth", r: 1.8, mu: 700, at: [-18, -4] },
            { kind: "moon", r: 1, mu: 600, orbit: { around: [-18, -4], R: 22, period: 26, phase: 0.2 } },
        ],
        start: 0,
        target: 0,
        flyby: [1],
        par: 5,
    },
    {
        name: "Double assist",
        brief: "Jupiter and Saturn are both on the move. Catch them one after the other, and on to Neptune.",
        fact: "Voyager 1 used Jupiter and Saturn to head out of the solar system; it is now over 25 billion km away.",
        bodies: [
            EARTH(-46, -24),
            { kind: "sun", r: 4.5, mu: 2000, at: [-20, 0] },
            { kind: "jupiter", r: 3.6, mu: 1400, orbit: { around: [-20, 0], R: 15, period: 13, phase: 0.8 } },
            { kind: "saturn", r: 3, mu: 1200, orbit: { around: [-20, 0], R: 30, period: 26, phase: 0.2 } },
            { kind: "neptune", r: 2.3, mu: 400, at: [46, 24] },
        ],
        start: 0,
        target: 4,
        flyby: [2, 3],
        par: 6,
    },
];

// Worlds drawn big enough to see: every body is 1.5 times the size laid out
// above (rocks 1.2), and what you see is what you hit
for (const l of LEVELS) for (const b of l.bodies) b.r *= b.kind === "rock" ? 1.2 : 1.5;

export type Outcome = "flying" | "crashed" | "arrived" | "lost";
export type Probe = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    t: number; // the level's clock
    flight: number; // seconds since launch
    state: Outcome;
    hit: number; // the body it crashed into
    passed: boolean[]; // flybys done
    early: boolean; // reached the target before its flybys were done
    fastest: number;
};

/** A probe leaving Earth's surface along `angle` (radians), at `power` (0 to 1) of full speed. */
export function launch(level: Level, angle: number, power: number, t: number): Probe {
    const e = level.bodies[level.start];
    const [ex, ey] = bodyAt(e, t);
    const v = power * VMAX;
    return {
        x: ex + Math.cos(angle) * (e.r + 0.35),
        y: ey + Math.sin(angle) * (e.r + 0.35),
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        t,
        flight: 0,
        state: "flying",
        hit: -1,
        passed: level.bodies.map(() => false),
        early: false,
        fastest: v,
    };
}

const pos: [number, number] = [0, 0];
function accel(level: Level, x: number, y: number, t: number, out: [number, number]) {
    let ax = 0;
    let ay = 0;
    for (const b of level.bodies) {
        if (!b.mu) continue;
        bodyAt(b, t, pos);
        const dx = pos[0] - x;
        const dy = pos[1] - y;
        const d2 = dx * dx + dy * dy + SOFT;
        const f = (b.mu * G) / (d2 * Math.sqrt(d2));
        ax += dx * f;
        ay += dy * f;
    }
    out[0] = ax;
    out[1] = ay;
}

const acc: [number, number] = [0, 0];
/** One fixed step (velocity Verlet, which keeps orbits honest). */
export function step(level: Level, p: Probe) {
    if (p.state !== "flying") return;
    accel(level, p.x, p.y, p.t, acc);
    const hx = p.vx + acc[0] * DT * 0.5;
    const hy = p.vy + acc[1] * DT * 0.5;
    p.x += hx * DT;
    p.y += hy * DT;
    p.t += DT;
    p.flight += DT;
    accel(level, p.x, p.y, p.t, acc);
    p.vx = hx + acc[0] * DT * 0.5;
    p.vy = hy + acc[1] * DT * 0.5;
    p.fastest = Math.max(p.fastest, Math.hypot(p.vx, p.vy));
    const need = level.flyby ?? [];
    for (let i = 0; i < level.bodies.length; i++) {
        const b = level.bodies[i];
        bodyAt(b, p.t, pos);
        const d = Math.hypot(pos[0] - p.x, pos[1] - p.y);
        // (a mission can end back at Earth: it only counts once the probe has been away)
        const leaving = i === level.start && p.flight < 2;
        if (i === level.target && d < captureRadius(b.r) && !leaving) {
            // it only counts once the flybys are done; before that, the probe flies on
            if (need.every((k) => p.passed[k])) {
                p.state = "arrived";
                return;
            }
            p.early = true;
        }
        if (d < b.r + 0.15 && !(i === level.start && p.flight < 0.3)) {
            p.state = "crashed";
            p.hit = i;
            return;
        }
        if (d < passRadius(b)) p.passed[i] = true;
    }
    if (Math.abs(p.x) > BOUNDS.x || Math.abs(p.y) > BOUNDS.y || p.flight > MAX_TIME) p.state = "lost";
}

/** Flies a probe to the end; for the checking script. */
export function fly(level: Level, angle: number, power: number, t: number) {
    const p = launch(level, angle, power, t);
    while (p.state === "flying") step(level, p);
    return p;
}
