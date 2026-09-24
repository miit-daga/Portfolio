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

export type Kind = "sun" | "mercury" | "venus" | "earth" | "moon" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "rock" | "blackhole";
export type Orbit = { around: [number, number]; R: number; period: number; phase: number };
// (pass: how close counts as a flyby, where a mission wants it closer than
// usual; name: what it's called, where it isn't a planet of ours)
export type Body = { kind: Kind; r: number; mu: number; at?: [number, number]; orbit?: Orbit; pass?: number; name?: string };
export type Section = "solar" | "deep";
export type Level = {
    section?: Section; // (the solar system, unless deep space)
    name: string;
    brief: string;
    fact: string;
    bodies: Body[];
    start: number; // Earth, in bodies
    target: number;
    flyby?: number[]; // bodies to pass close to on the way
    capture?: number; // how close counts as arriving, where a mission wants it closer than usual
    // arriving no faster than this against the target: a lander setting down
    // (faster is a crash), or an orbiter being caught (faster flies past)
    arrive?: { under: number; as: "land" | "orbit"; craft: string };
    guides?: { around: [number, number]; R: number }[]; // faint orbits drawn, for looks only
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
// Saturn's rings are solid: a probe that crosses them is lost
export const ringsOf = (b: Body) => (b.kind === "saturn" ? { inner: b.r * 1.24, outer: b.r * 2.3 } : null);
/** How close to the target counts as arriving (for Saturn, reaching its rings' edge). */
export const arriveRadius = (level: Level, b: Body) => level.capture ?? (ringsOf(b) ? ringsOf(b)!.outer + 1.5 : captureRadius(b.r));
/** Units of speed in km/s, as the game shows them. */
export const KMS = 2.2;

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
/** How fast a body is moving at time t. */
export function bodyVel(b: Body, t: number, out: [number, number] = [0, 0]): [number, number] {
    if (!b.orbit) {
        out[0] = out[1] = 0;
        return out;
    }
    const w = (Math.PI * 2) / (b.orbit.period * SLOW);
    const a = b.orbit.phase + t * w;
    out[0] = -Math.sin(a) * w * b.orbit.R;
    out[1] = Math.cos(a) * w * b.orbit.R;
    return out;
}

// A wall of rocks along a line, with a little scatter: the same every time
export function belt(from: [number, number], to: [number, number], count: number, seed: number): Body[] {
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

// A ring of rocks round a point, with a gap (angles in degrees)
export function ringBelt(around: [number, number], R: number, count: number, gapAt: number, gapWidth: number, seed: number): Body[] {
    let s = seed;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const out: Body[] = [];
    for (let i = 0; i < count; i++) {
        const a = (i / count) * 360;
        const off = Math.abs(((a - gapAt + 540) % 360) - 180);
        if (off < gapWidth / 2) continue;
        const rr = R + (rand() - 0.5) * 1.4;
        const t = (a * Math.PI) / 180;
        out.push({ kind: "rock", r: 0.5 + rand() * 0.5, mu: 0, at: [around[0] + Math.cos(t) * rr, around[1] + Math.sin(t) * rr] });
    }
    return out;
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
            { kind: "jupiter", r: 4.2, mu: 2200, at: [-4, -18] },
            { kind: "mars", r: 1.3, mu: 60, at: [40, -12] },
            ...belt([6, 30], [20, 6], 11, 7),
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
        brief: "ISRO's Moon mission. Catch the Moon as it goes round Earth, and bring Vikram in gently: arrive under 14.3 km/s against the Moon, or it crashes.",
        fact: "Chandrayaan-3's Vikram lander touched down near the Moon's south pole on 23 August 2023, the first landing there.",
        bodies: [
            { kind: "earth", r: 1.8, mu: 700, at: [-26, -6] },
            { kind: "moon", r: 1, mu: 260, orbit: { around: [-26, -6], R: 28, period: 26, phase: 0.4 } },
        ],
        start: 0,
        target: 1,
        arrive: { under: 6.5, as: "land", craft: "Vikram" },
        par: 3,
    },
    {
        name: "Hairpin",
        brief: "Neptune is behind you. Fly out, through Jupiter's amber ring, and let it whip you round and back past Earth.",
        fact: "In 1992 Ulysses flew past Jupiter and was flung up out of the planets' plane, to fly over the Sun's poles.",
        bodies: [
            EARTH(-12, -2),
            { kind: "jupiter", r: 4.2, mu: 3600, at: [24, -2], pass: 12 },
            { kind: "neptune", r: 2.3, mu: 1200, at: [-36, 12] },
        ],
        start: 0,
        target: 2,
        flyby: [1],
        par: 4,
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
        brief: "ISRO's Mars Orbiter Mission. Reach Mars slowly enough to be caught into orbit, under 15.4 km/s against it; any faster and you fly past.",
        fact: "India's Mars Orbiter Mission reached Mars on 24 September 2014, the first to get there on a first attempt.",
        bodies: [
            EARTH(-52, -6),
            { kind: "sun", r: 4.5, mu: 3200, at: [2, 0] },
            { kind: "mars", r: 1.3, mu: 60, orbit: { around: [2, 0], R: 24, period: 30, phase: -0.5 } },
        ],
        start: 0,
        target: 2,
        arrive: { under: 7, as: "orbit", craft: "Mangalyaan" },
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
            ...belt([-20, 36], [-17, 6], 10, 11),
            ...belt([16, -36], [19, -4], 10, 13),
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
            { kind: "jupiter", r: 3.6, mu: 1400, orbit: { around: [-20, 0], R: 15, period: 13, phase: 0.8 }, pass: 18 },
            { kind: "saturn", r: 3, mu: 1200, orbit: { around: [-20, 0], R: 30, period: 26, phase: 0.2 }, pass: 24 },
            { kind: "neptune", r: 2.3, mu: 400, at: [40, 18] },
        ],
        start: 0,
        target: 4,
        flyby: [2, 3],
        par: 6,
    },
    // Deep space: beyond the solar system, where there are black holes. (The
    // black disc is the hole's shadow, and touching it is falling in.) The
    // worlds out here are nobody's planets, so they go by descriptions
    {
        section: "deep",
        name: "Event horizon",
        brief: "A black hole sits between you and a lone ice giant. Bend round it, and don't touch the dark.",
        fact: "The first picture of a black hole, M87*, was released in 2019 by the Event Horizon Telescope.",
        bodies: [EARTH(-44, 0), { kind: "blackhole", r: 1.6, mu: 5200, at: [-2, 0] }, { kind: "neptune", r: 2.3, mu: 400, at: [40, 2], name: "the ice giant" }],
        start: 0,
        target: 2,
        par: 3,
    },
    {
        section: "deep",
        name: "Home through the dark",
        brief: "Loop round the black hole and bring the probe home to Earth.",
        fact: "Light takes about 27,000 years to reach us from Sagittarius A*, the black hole at the heart of our galaxy.",
        bodies: [{ kind: "earth", r: 1.8, mu: 400, at: [-22, -6] }, { kind: "blackhole", r: 1.5, mu: 2600, at: [14, 8], pass: 9 }],
        start: 0,
        target: 0,
        flyby: [1],
        par: 6,
    },
    {
        section: "deep",
        name: "Accretion",
        brief: "A ring of rubble circles the black hole, with a single gap. Get through to the ice giant.",
        fact: "Gas falling into a black hole heats to millions of degrees, which is why the brightest things in the universe, quasars, surround them.",
        bodies: [
            EARTH(-44, 4),
            { kind: "blackhole", r: 1.5, mu: 4400, at: [0, 0] },
            { kind: "neptune", r: 2.3, mu: 400, at: [42, -6], name: "the ice giant" },
            ...ringBelt([0, 0], 14, 30, 120, 40, 5),
        ],
        start: 0,
        target: 2,
        par: 5,
    },
    {
        section: "deep",
        name: "Binary",
        brief: "Two black holes circle each other. Find a way through them to the red world.",
        fact: "In 2015 LIGO first heard gravitational waves, from two black holes merging over a billion light years away.",
        bodies: [
            EARTH(-46, -18),
            { kind: "blackhole", r: 1.4, mu: 3200, orbit: { around: [0, 0], R: 9, period: 10, phase: 0 } },
            { kind: "blackhole", r: 1.4, mu: 3200, orbit: { around: [0, 0], R: 9, period: 10, phase: Math.PI } },
            { kind: "mars", r: 1.3, mu: 60, at: [44, 16], name: "the red world" },
        ],
        start: 0,
        target: 3,
        par: 5,
    },
    {
        section: "deep",
        name: "Trinary",
        brief: "Three black holes, and a way between them to the red world.",
        fact: "Some galaxies hold three supermassive black holes near their middles, left from galaxies merging.",
        bodies: [
            EARTH(-46, 0),
            { kind: "blackhole", r: 1.4, mu: 3000, at: [-14, 12] },
            { kind: "blackhole", r: 1.4, mu: 3000, at: [-8, -14] },
            { kind: "blackhole", r: 1.4, mu: 3000, at: [10, 4] },
            { kind: "mars", r: 1.3, mu: 60, at: [42, -10], name: "the red world" },
        ],
        start: 0,
        target: 4,
        par: 5,
    },
    {
        section: "deep",
        name: "Photon sphere",
        brief: "Skim the black hole closer than ever, through its tight amber ring, and out to the ice giant.",
        fact: "At the photon sphere, half again the event horizon's size, light itself can orbit a black hole.",
        bodies: [EARTH(-44, -14), { kind: "blackhole", r: 1.5, mu: 4200, at: [-4, 4], pass: 9 }, { kind: "neptune", r: 2.3, mu: 400, at: [30, -26], name: "the ice giant" }],
        start: 0,
        target: 2,
        flyby: [1],
        par: 4,
    },
    {
        section: "deep",
        name: "Captured world",
        brief: "A giant planet orbits a black hole. Catch it from behind as it swings round, and ride it on to the red world.",
        fact: "Planets have been found orbiting pulsars, the spinning cores left when stars explode.",
        bodies: [
            EARTH(-46, -20),
            { kind: "blackhole", r: 1.5, mu: 3400, at: [-8, 2] },
            { kind: "jupiter", r: 3.6, mu: 1500, orbit: { around: [-8, 2], R: 17, period: 13, phase: 1.2 }, name: "the captured giant" },
            { kind: "mars", r: 1.3, mu: 60, at: [44, 22], name: "the red world" },
        ],
        start: 0,
        target: 3,
        flyby: [2],
        par: 5,
    },
    {
        section: "deep",
        name: "Skim the hole",
        brief: "Pass close by the black hole, through the amber ring, and let it throw you on to the ringed giant.",
        fact: "Sagittarius A*, the black hole at the centre of the Milky Way, is about 4 million times the mass of the Sun.",
        bodies: [
            EARTH(-44, 20),
            { kind: "blackhole", r: 1.6, mu: 6000, at: [-10, -8], pass: 11 },
            { kind: "saturn", r: 3.4, mu: 900, at: [38, 18], name: "the ringed giant" },
            ...belt([6, 36], [14, 0], 12, 21),
        ],
        start: 0,
        target: 2,
        flyby: [1],
        par: 4,
    },
    {
        section: "deep",
        name: "Swing twice",
        brief: "Fly past both black holes, through each amber ring, then on to the red world.",
        fact: "A spacecraft falling toward a black hole would, to someone watching from far away, seem to slow and freeze at the horizon.",
        bodies: [
            EARTH(-46, 20),
            { kind: "blackhole", r: 1.4, mu: 3600, at: [-18, -10], pass: 12 },
            { kind: "blackhole", r: 1.4, mu: 3600, at: [14, 14], pass: 12 },
            { kind: "mars", r: 1.3, mu: 60, at: [44, -18], name: "the red world" },
        ],
        start: 0,
        target: 3,
        flyby: [1, 2],
        par: 6,
    },
    {
        section: "deep",
        name: "Spaghettification",
        brief: "A heavy black hole flings everything faster. Reach the ice giant slowly enough to be caught into orbit, under 19.8 km/s against it.",
        fact: "Near a small black hole, the pull on your feet would outstrip the pull on your head: astronomers really call this spaghettification.",
        bodies: [EARTH(-44, -8), { kind: "blackhole", r: 1.6, mu: 7000, at: [-6, 6] }, { kind: "neptune", r: 2.3, mu: 500, at: [40, -12], name: "the ice giant" }],
        start: 0,
        target: 2,
        arrive: { under: 9, as: "orbit", craft: "The probe" },
        par: 5,
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
    rings: boolean; // (into Saturn's rings)
    tooFast: number; // the speed it last came in too fast at, against the target
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
        rings: false,
        tooFast: 0,
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
const vel: [number, number] = [0, 0];
/** The probe's speed against a body. */
export function speedAgainst(p: Probe, b: Body) {
    bodyVel(b, p.t, vel);
    return Math.hypot(p.vx - vel[0], p.vy - vel[1]);
}
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
        if (i === level.target && d < arriveRadius(level, b) && !leaving) {
            // it only counts once the flybys are done; before that, the probe flies on
            if (!need.every((k) => p.passed[k])) p.early = true;
            else if (level.arrive && speedAgainst(p, b) > level.arrive.under) {
                // too fast: a lander hits, an orbiter flies on past
                p.tooFast = speedAgainst(p, b);
                if (level.arrive.as === "land") {
                    p.state = "crashed";
                    p.hit = i;
                    return;
                }
            } else {
                p.state = "arrived";
                return;
            }
        }
        const rings = ringsOf(b);
        if (rings && d > rings.inner && d < rings.outer) {
            p.state = "crashed";
            p.hit = i;
            p.rings = true;
            return;
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
