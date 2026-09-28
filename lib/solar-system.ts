import type { Craft, SolarNow } from "@/app/api/solar-system/route";
import { issNow } from "@/lib/iss";
import { describeLocation } from "@/lib/locate";

// The solar system in the site's background (components/ui/animated-background.tsx),
// round the big half-Sun on the left, seen from above and a little to the side
// (each orbit an ellipse), so a planet on the far side can pass behind the Sun
// and is hidden by it, and one off the left edge is simply out of view.
//
// And the solar system view (its button, or the command menu): the page fades
// away and the Sun glides to the middle of the screen, the orbits opening out
// round it so all of it's in view, the view turning to its own best angle.
// `layout` takes how far along that is (0, reading, to 1, the whole view).
//
// - Where each planet is: its true angle round the Sun today (app/api/solar-system),
//   the view turned so the Earth always sits front-right, in view; the others
//   keep their true angles from it. Distances are evenly spaced, not to scale
//   (to scale, Mercury would hug the Sun and Pluto be dozens of screens away).
//   Mercury to Neptune, and Pluto, the dwarf planet.
// - Each planet spins, from its real map, lit from the Sun: the spins sped up
//   3,600 times (a real hour a second, so the Earth turns once in 24 s and
//   Jupiter in 10 s), their relative speeds and tilts real; Venus turns
//   backwards, and Mercury and Venus barely at all, as they really do.
// - The Moon circles the Earth at its real place today, so its phase is real.
// - Hovering a planet names it, with its distance from Earth today.
// - The view is turned, each day, to whichever angle shows the most planets
//   with the Earth in view (their angles from each other stay true); one
//   still hidden gets a small marker at the edge, or at the Sun's rim.
// - In the solar system view, the planets and the Moon go round in real time:
//   each worked out for this very moment, every frame (astronomy-engine, loaded
//   only then), so they move at their true pace (too slow to see: the Earth
//   goes about a degree a day). And time can run backwards, a reverse
//   time-lapse to where they were on any date in the past (their speeds and the
//   gaps between them real; the view's angle stays put, so the Earth goes round
//   too), never into the future; back to now replays it forward to the present
//   (and leaving the view does).
// - In the solar system view, the Sun is its real map (Solar System Scope's, as
//   the planets' are), turning once in 25.4 days, sped up the same 3,600 times;
//   and the main asteroid belt between Mars and Jupiter (2.2 to 3.2 AU) and the
//   Kuiper belt out past Neptune (30 to 50 AU) fill in: scattered rocks, not
//   real ones, each drifting round at its own distance's pace (the inner ones
//   faster, as Kepler's law has it), far slower than the spins.
// - Spacecraft at their real places: the ISS circling the Earth (sped up 60
//   times; hover for where it is right now), ISRO's Aditya-L1 at L1 and the
//   James Webb Space Telescope at L2 (their 1.5 million km from the Earth
//   drawn larger), Parker Solar Probe on its real orbit near the Sun, and the
//   Voyagers as arrows at the edge, pointing the way they've gone.

const ASSET = "/arcade/";
const RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const SQUASH = 0.34;
// in the solar system view on a tall, narrow screen (a phone held upright): seen more
// from above, so the orbits use its height
const SQUASH_TALL = 0.8;
// how far back the reverse time-lapse goes: to the start of 1800
const MAX_BACK_DAYS = (Date.now() - Date.UTC(1800, 0, 1)) / 86_400_000;
// where the Earth would sit on its orbit, on the screen, all else equal (radians;
// 0 is to the Sun's right, positive toward the viewer); the framing picks the
// angle that shows the most planets, nearest this
const EARTH_AT = 0.5;
const AU_OF = [0.387, 0.723, 1, 1.524, 5.203, 9.537, 19.19, 30.07, 39.48];
const AU_KM = 149_597_870.7;
// each one's year, in days (for how fast it whirls round in the time-lapse)
const YEAR_DAYS: Record<string, number> = { Mercury: 87.97, Venus: 224.7, Earth: 365.26, Mars: 686.98, Jupiter: 4332.6, Saturn: 10759, Uranus: 30687, Neptune: 60190, Pluto: 90560 };

type Spec = { name: string; file: string; r: number; spinHours: number; tilt: number; colour: string; ring?: boolean };
const PLANETS: Spec[] = [
    { name: "Mercury", file: "planet-mercury.jpg", r: 7, spinHours: 1407.6, tilt: 0, colour: "#9ca3af" },
    { name: "Venus", file: "planet-venus.jpg", r: 11, spinHours: -5832.5, tilt: 2.6, colour: "#e8c98f" },
    { name: "Earth", file: "planet-earth.jpg", r: 12, spinHours: 23.93, tilt: 23.4, colour: "#4f8fdc" },
    { name: "Mars", file: "planet-mars.jpg", r: 9, spinHours: 24.62, tilt: 25.2, colour: "#d9724a" },
    { name: "Jupiter", file: "planet-jupiter.jpg", r: 26, spinHours: 9.93, tilt: 3.1, colour: "#d8b48c" },
    { name: "Saturn", file: "planet-saturn.jpg", r: 21, spinHours: 10.66, tilt: 26.7, colour: "#e3cf9f", ring: true },
    // Uranus spins on its side; Pluto's axis leans past the vertical too (so both turn "backwards" as drawn)
    { name: "Uranus", file: "planet-uranus.jpg", r: 15, spinHours: 17.24, tilt: 97.8, colour: "#a5e9f0" },
    { name: "Neptune", file: "planet-neptune.jpg", r: 14.5, spinHours: 16.11, tilt: 28.3, colour: "#5b8def" },
    { name: "Pluto", file: "planet-pluto.jpg", r: 4.5, spinHours: 153.3, tilt: 122.5, colour: "#d9c4a8" },
];
const SUN: Spec = { name: "Sun", file: "planet-sun.jpg", r: 0, spinHours: 609.1, tilt: 7.25, colour: "#fb923c" };
const MOON: Spec = { name: "Moon", file: "planet-moon.jpg", r: 3.8, spinHours: 655.7, tilt: 6.7, colour: "#cbd5e1" };

type Map = { w: number; h: number; d: Uint8ClampedArray };
type Table = { size: number; idx: Int32Array; nx: Float32Array; ny: Float32Array; nz: Float32Array; lat: Float32Array; lon: Float32Array; edge: Float32Array };
type Sprite = { spec: Spec; map: Map | null; canvas: HTMLCanvasElement; table: Table | null };

function loadMap(file: string, w = 512): Promise<Map> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = w;
            c.height = w / 2;
            const g = c.getContext("2d", { willReadFrequently: true })!;
            g.drawImage(img, 0, 0, w, w / 2);
            resolve({ w, h: w / 2, d: g.getImageData(0, 0, w, w / 2).data });
        };
        img.onerror = reject;
        img.src = ASSET + file;
    });
}

/** Per pixel of a sphere `size` px across (tilted by its axis), what's fixed: its normal, latitude and base longitude. */
function makeTable(size: number, tilt: number): Table {
    const n = size * size;
    const t: Table = { size, idx: new Int32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n), lat: new Float32Array(n), lon: new Float32Array(n), edge: new Float32Array(n) };
    const r = size / 2;
    const c = Math.cos(tilt * RAD);
    const s = Math.sin(tilt * RAD);
    let k = 0;
    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            const nx = (px + 0.5 - r) / r;
            const ny = -(py + 0.5 - r) / r;
            const d2 = nx * nx + ny * ny;
            if (d2 > 1) continue;
            const nz = Math.sqrt(1 - d2);
            // the axis leans (tilted about the line of sight), as each planet's does
            const tx = nx * c + ny * s;
            const ty = -nx * s + ny * c;
            t.idx[k] = (py * size + px) * 4;
            t.nx[k] = nx;
            t.ny[k] = ny;
            t.nz[k] = nz;
            t.lat[k] = Math.asin(Math.max(-1, Math.min(1, ty)));
            t.lon[k] = Math.atan2(tx, nz);
            t.edge[k] = Math.min(1, (1 - Math.sqrt(d2)) * r * 1.3);
            k++;
        }
    }
    t.idx = t.idx.slice(0, k);
    return { ...t, nx: t.nx.slice(0, k), ny: t.ny.slice(0, k), nz: t.nz.slice(0, k), lat: t.lat.slice(0, k), lon: t.lon.slice(0, k), edge: t.edge.slice(0, k) };
}

/** The sprite, this frame: turned by `spin`, lit from the direction (lx, ly) on the screen. */
function paint(sp: Sprite, size: number, spin: number, lx: number, ly: number) {
    if (!sp.map) return false;
    if (!sp.table || sp.table.size !== size) {
        sp.table = makeTable(size, sp.spec.tilt);
        sp.canvas.width = sp.canvas.height = size;
    }
    const t = sp.table;
    const m = sp.map;
    const g = sp.canvas.getContext("2d")!;
    const img = g.createImageData(size, size);
    const d = img.data;
    // the light, a little from in front, so a planet shows more than a half
    const ln = Math.hypot(lx, ly, 0.35);
    const Lx = lx / ln;
    const Ly = ly / ln;
    const Lz = 0.35 / ln;
    for (let k = 0; k < t.idx.length; k++) {
        const lon = t.lon[k] - spin;
        const u = ((((lon / TWO_PI + 0.5) % 1) + 1) % 1) * (m.w - 1);
        const v = (0.5 - t.lat[k] / Math.PI) * (m.h - 1);
        const mi = ((v | 0) * m.w + (u | 0)) * 4;
        const dot = t.nx[k] * Lx + t.ny[k] * Ly + t.nz[k] * Lz;
        // (the Sun lights itself, darkening toward its edge as the real one does)
        const lit = sp.spec === SUN ? 1 : Math.max(0, Math.min(1, (dot + 0.06) / 0.28)) * 0.96 + 0.04;
        const limb = sp.spec === SUN ? 0.45 + 0.55 * Math.sqrt(t.nz[k]) : 0.8 + 0.2 * t.nz[k];
        const i = t.idx[k];
        d[i] = m.d[mi] * lit * limb;
        d[i + 1] = m.d[mi + 1] * lit * limb;
        d[i + 2] = m.d[mi + 2] * lit * limb;
        d[i + 3] = 255 * t.edge[k];
    }
    g.putImageData(img, 0, 0);
    return true;
}

export type SunPlace = { x: number; y: number; r: number };

/** A small label with a dark outline, so it reads over the Sun as well as over space. */
function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign, alpha: number) {
    c.save();
    c.textAlign = align;
    c.lineJoin = "round";
    c.lineWidth = 3;
    c.strokeStyle = `rgba(0,0,0,${0.7 * alpha + 0.2})`;
    c.strokeText(text, x, y);
    c.fillStyle = `rgba(226,232,240,${alpha})`;
    c.fillText(text, x, y);
    c.restore();
}
type Placed = {
    spec: Spec;
    sprite: Sprite;
    x: number;
    y: number;
    r: number;
    depth: number;
    fromEarthAu: number | null;
    /** a planet out of view: behind the Sun, or off the screen */
    hidden?: "sun" | "off" | null;
    /** a spacecraft: drawn as a point of light, named on hover */
    dot?: { colour: string; hover: () => string };
};
/** a Voyager's label at the edge; `ray`, when it sits on its real direction from the Sun (a dotted line runs out to it) */
type Arrow = { text: string; x: number; y: number; align: CanvasTextAlign; ray?: boolean; detail?: () => string };

/**
 * A spacecraft at this very moment: along its track from NASA JPL's Horizons (every 6 hours,
 * today and tomorrow), between the points either side of now (or on from the last two, if the
 * day's track is late). Its angle round the Sun, distance, speed, and how fast it's moving away.
 */
function craftNow(c: Craft, at = Date.now()) {
    const tr = c.track;
    if (!tr || tr.length < 2) return { lon: c.lon, au: c.au, speed: null as number | null, away: null as number | null };
    let i = tr.findIndex((p) => p[0] > at);
    if (i === -1) i = tr.length - 1;
    if (i === 0) i = 1;
    const [a, b] = [tr[i - 1], tr[i]];
    const k = (at - a[0]) / (b[0] - a[0] || 1);
    const [x, y, z] = [1, 2, 3].map((j) => a[j] + (b[j] - a[j]) * k);
    const secs = (b[0] - a[0]) / 1000 || 1;
    return {
        lon: ((Math.atan2(y, x) / RAD) % 360 + 360) % 360,
        au: Math.hypot(x, y, z),
        speed: (Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) * AU_KM) / secs,
        away: ((Math.hypot(b[1], b[2], b[3]) - Math.hypot(a[1], a[2], a[3])) * AU_KM) / secs,
    };
}
type Box = { x: number; y: number; w: number; h: number };
type Spot = { x: number; y: number; align: CanvasTextAlign };

export function createSolarSystem() {
    const sprites = new Map<string, Sprite>();
    for (const spec of [...PLANETS, MOON, SUN]) {
        const sp: Sprite = { spec, map: null, canvas: document.createElement("canvas"), table: null };
        sprites.set(spec.name, sp);
        // (the Sun, drawn far bigger, from a finer map)
        loadMap(spec.file, spec === SUN ? 1024 : 512).then((m) => (sp.map = m)).catch(() => {});
    }
    let now: SolarNow | null = null;
    const refresh = () =>
        fetch("/api/solar-system")
            .then((r) => (r.ok ? (r.json() as Promise<SolarNow>) : null))
            .then((d) => d && (now = d))
            .catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 3600_000);
    // (the ephemeris, once the page has settled, so the planets are worked out live on the page too;
    // the server's hourly positions meanwhile)
    const settle = window.setTimeout(() => {
        if (!Astro) import("astronomy-engine").then((m) => (Astro = m)).catch(() => {});
    }, 4000);

    // the belts: scattered rocks, made once (the same every visit): distance, starting angle, size, brightness
    type Rock = { au: number; a0: number; s: number; lum: number; kuiper: boolean };
    const rocks: Rock[] = [];
    {
        let seed = 20260928;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        // (thickest in the middle of each: the main belt round 2.7 AU, the Kuiper belt's classical part round 44)
        for (let i = 0; i < 560; i++) rocks.push({ au: 2.2 + (rnd() + rnd()) * 0.5, a0: rnd() * TWO_PI, s: rnd() < 0.07 ? 2.4 + rnd() * 2 : 0.8 + rnd() * 1.2, lum: 0.35 + rnd() * 0.5, kuiper: false });
        for (let i = 0; i < 420; i++) rocks.push({ au: 30 + (rnd() + rnd()) * 10 + rnd() * 4, a0: rnd() * TWO_PI, s: rnd() < 0.05 ? 2 + rnd() * 1.4 : 0.7 + rnd() * 1, lum: 0.25 + rnd() * 0.45, kuiper: true });
    }
    // a few lumpy rock shapes for the bigger ones, lit from one side
    const rockSprites = [0, 1, 2, 3].map((n) => {
        const c = document.createElement("canvas");
        c.width = c.height = 16;
        const g = c.getContext("2d")!;
        let seed = 97 + n * 131;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        g.beginPath();
        for (let k = 0; k < 9; k++) {
            const a = (k / 9) * TWO_PI;
            const r = 5 + rnd() * 2.6;
            if (k) g.lineTo(8 + r * Math.cos(a), 8 + r * 0.85 * Math.sin(a));
            else g.moveTo(8 + r * Math.cos(a), 8 + r * 0.85 * Math.sin(a));
        }
        g.closePath();
        const shade = g.createRadialGradient(5.5, 5.5, 1, 8, 8, 8);
        shade.addColorStop(0, "#d6d0c4");
        shade.addColorStop(0.6, "#8a847a");
        shade.addColorStop(1, "#3f3b36");
        g.fillStyle = shade;
        g.fill();
        return c;
    });
    let view = { mouse: { x: 0, y: 0 }, implode: 1, cx: 0, cy: 0, size: 1 };
    let sunPainted = { at: -1e9, size: 0 };
    // the time-lapse: days from now (never ahead of it), and how many a second (negative,
    // back in time; 0 is real time); `toNow`, replaying it forward to the present
    let Astro: typeof import("astronomy-engine") | null = null;
    const sim = { days: 0, rate: 0, toNow: false, last: performance.now(), from: 0, fromAt: 0, span: 1, pace: 0 };
    const stepSim = () => {
        const t = performance.now();
        const dt = Math.min(0.1, (t - sim.last) / 1000);
        sim.last = t;
        const before = sim.days;
        if (sim.toNow) {
            // (eased, in a second for a few weeks back up to three for centuries)
            const k = Math.min(1, (t - sim.fromAt) / 1000 / sim.span);
            const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            sim.days = sim.from * (1 - ease);
            if (k >= 1) {
                sim.days = 0;
                sim.toNow = false;
            }
        } else if (Astro) {
            sim.days = Math.max(-MAX_BACK_DAYS, Math.min(0, sim.days + sim.rate * dt));
            if (sim.days === -MAX_BACK_DAYS) sim.rate = 0;
        }
        // (how fast time is going, in days a second, either way)
        sim.pace = dt > 0 ? Math.abs(sim.days - before) / dt : 0;
    };
    /** Where the planets and the Moon are at this moment, or back on the time-lapse's date; null until the ephemeris loads (the server's, meanwhile). */
    const simPositions = () => {
        if (!Astro) return null;
        const A = Astro;
        const date = new Date(Date.now() + sim.days * 86_400_000);
        const vec = (name: string) => A.HelioVector(A.Body[name as keyof typeof A.Body], date);
        const ev = vec("Earth");
        const out = new Map<string, { lon: number; fromEarthAu: number | null }>();
        for (const p of PLANETS) {
            const v = p.name === "Earth" ? ev : vec(p.name);
            out.set(p.name, { lon: A.Ecliptic(v).elon, fromEarthAu: p.name === "Earth" ? null : Math.hypot(v.x - ev.x, v.y - ev.y, v.z - ev.z) });
        }
        return { planets: out, moonLon: A.EclipticGeoMoon(date).lon, date };
    };
    /** A Voyager's live readout, for its hover: its distance ticking up, to the kilometre. */
    const voyagerDetail = (c: Craft) => () => {
        const p = craftNow(c);
        const km = Math.round(p.au * AU_KM).toLocaleString("en-US");
        const hours = (p.au * 499.005) / 3600;
        return `${km} km from the Sun right now${p.away ? `, ${p.away.toFixed(1)} km farther every second` : ""} · its signal takes about ${Math.floor(hours)} h ${Math.round((hours % 1) * 60)} min to reach us · launched ${c.name === "Voyager 1" ? "5 Sep 1977" : "20 Aug 1977"}`;
    };
    // where each Voyager's words were drawn last frame, to point at them by (after any nudge
    // out of another label's way)
    const arrowBoxes = new Map<string, Box>();
    // with one thing pointed at, the rest of the labels fade away (0 to 1)
    let focusFade = 0;
    // where each label went last frame (its spot, and how far faded in), so it stays put
    const labelMemo = new Map<string, { i: number; a: number }>();
    // the date's word for the hover and the facts: "today", or the date
    let when = "today";
    let placed: Placed[] = [];
    let earth: Placed | null = null;
    let moon: Placed | null = null;
    let orbits: { a: number; b: number }[] = [];
    let sunAt: SunPlace | null = null;
    let fade = 0;
    let arrows: Arrow[] = [];
    let framing: { key: string; earthAt: number; viewAt: number } | null = null;
    // how far into the solar system view (0 to 1)
    let skyE = 0;
    let lastImplode = 1;
    let issAngle = 0;
    let issLast = performance.now();
    let issPaused = false;
    // the page's own text to keep labels off (see keepClear)
    let clear: Box[] = [];
    // the ISS's latest position, asked for only when someone hovers it
    let iss: { at: number; text: string } | null = null;
    let issAsking = false;
    const issText = () => {
        if (!issAsking && (!iss || Date.now() - iss.at > 20_000)) {
            issAsking = true;
            issNow()
                .then((f) => f && (iss = { at: Date.now(), text: `${describeLocation(f.latitude, f.longitude)} right now, ${Math.round(f.altitude)} km up` }))
                .catch(() => {})
                .finally(() => (issAsking = false));
        }
        return iss ? iss.text : "finding where it is…";
    };
    const dotSpec = (name: string): Spec => ({ name, file: "", r: 2, spinHours: 1, tilt: 0, colour: "#fff" });

    /** Whether a point is in view: on the screen, and not behind the Sun. */
    const inView = (x: number, y: number, depth: number, r: number, w: number, h: number, sun: SunPlace) =>
        x > r && x < w - r && y > r && y < h - r && !(depth < 0 && Math.hypot(x - sun.x, y - sun.y) < sun.r + r * 0.5);

    /** The Earth's angle on the screen that shows the most planets (their true angles from it kept). */
    const frame = (w: number, h: number, sun: SunPlace, earthLon: number, orbits: { a: number; b: number }[]) => {
        let best = EARTH_AT;
        let bestScore = -Infinity;
        for (let e = -0.5; e <= 1.35; e += 0.02) {
            const ei = 2;
            const ex = sun.x + orbits[ei].a * Math.cos(e);
            const ey = sun.y + orbits[ei].b * Math.sin(e);
            if (!(ex > 60 && ex < w - 160 && ey > 60 && ey < h - 60) || (Math.sin(e) < 0 && Math.hypot(ex - sun.x, ey - sun.y) < sun.r + 20)) continue;
            let count = 0;
            now!.planets.forEach((p) => {
                const i = PLANETS.findIndex((q) => q.name === p.name);
                if (i < 0) return;
                const phi = e - (p.lon - earthLon) * RAD;
                if (inView(sun.x + orbits[i].a * Math.cos(phi), sun.y + orbits[i].b * Math.sin(phi), Math.sin(phi), 16, w, h, sun)) count++;
            });
            const score = count * 100 - Math.abs(e - EARTH_AT) * 10;
            if (score > bestScore) {
                bestScore = score;
                best = e;
            }
        }
        return best;
    };

    /** A distance from the Sun (AU) on the diagram's spacing: between the planets' orbits, in proportion. */
    const auToA = (au: number, sunR: number) => {
        const xs = [0, ...AU_OF];
        const ys = [sunR, ...orbits.map((o) => o.a)];
        for (let i = 1; i < xs.length; i++) if (au <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (au - xs[i - 1])) / (xs[i] - xs[i - 1]);
        const n = xs.length - 1;
        return ys[n] + ((ys[n] - ys[n - 1]) * (au - xs[n])) / (xs[n] - xs[n - 1]);
    };

    /** How flat the orbits look in the solar system view. */
    const viewSquash = (w: number, h: number) => (h > w * 1.3 ? SQUASH_TALL : SQUASH);
    // how flat this frame (between the two views' as it glides)
    let squash = SQUASH;

    /** The orbits' sizes: round the half-Sun while reading; in the view, all of them round the Sun in the middle. */
    const orbitsFor = (w: number, h: number, sun: SunPlace, whole: boolean) => {
        // (in the view, Pluto near the screen's edge; on a narrow screen the outer ones
        // run off it, rather than crowding in)
        const k = whole ? viewSquash(w, h) : SQUASH;
        const first = sun.r * (whole ? 1.3 : 1.22);
        const last = whole ? Math.max(first + 8 * 26, Math.min(w - sun.x - w * 0.05, (h * 0.5 - 24) / k)) : Math.max(first + 200, w - sun.x - w * 0.09);
        return PLANETS.map((_, i) => {
            const a = first + (last - first) * Math.pow(i / (PLANETS.length - 1), 0.92);
            return { a, b: a * k };
        });
    };

    /**
     * Where everything is this frame; call before drawBack. `implode` (1 down to 0) pulls it all into (cx, cy).
     * `sky`: how far into the solar system view (0 to 1, eased), and where the Sun is in each view.
     */
    const layout = (w: number, h: number, sun: SunPlace, mouse: { x: number; y: number }, implode: number, sky?: { e: number; left: SunPlace; centre: SunPlace }) => {
        sunAt = sun;
        placed = [];
        dots = [];
        earth = moon = null;
        if (!now) return;
        fade = Math.min(1, fade + 0.02);
        const earthLon = now.planets.find((p) => p.name === "Earth")!.lon;
        stepSim();
        const at = simPositions();
        when = at && sim.days < -0.5 ? `on ${at.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "today";
        const size = Math.max(0.65, Math.min(1.25, w / 1440));
        const e = sky?.e ?? 0;
        const readingOrbits = orbitsFor(w, h, sky?.left ?? sun, false);
        const viewOrbits = orbitsFor(w, h, sky?.centre ?? sun, true);
        squash = SQUASH + (viewSquash(w, h) - SQUASH) * e;
        orbits = readingOrbits.map((o, i) => {
            const a = o.a + (viewOrbits[i].a - o.a) * e;
            return { a, b: a * squash };
        });
        const cx = w / 2;
        const cy = h / 2;
        lastImplode = implode;
        view = { mouse, implode, cx, cy, size };
        // the framing, for each view, worked out again only when the day's positions or the
        // screen change; between the two, the view turns from one to the other
        const key = `${now.at}|${w}|${h}`;
        // (not while in the view, where it would turn under you)
        if (!framing || (framing.key !== key && e === 0)) {
            const left = sky?.left ?? sun;
            const centre = sky?.centre ?? sun;
            framing = { key, earthAt: frame(w, h, left, earthLon, readingOrbits), viewAt: frame(w, h, centre, earthLon, viewOrbits) };
        }
        const earthAt = framing.earthAt + (framing.viewAt - framing.earthAt) * e;
        skyE = e;
        PLANETS.forEach((spec, i) => {
            // (worked out here for this moment, or the time-lapse's; the server's until that's loaded)
            const p = at?.planets.get(spec.name) ?? now!.planets.find((q) => q.name === spec.name);
            if (!p) return;
            // (counter-clockwise from the north, as the planets go: seen from above, the far side is up the screen)
            const phi = earthAt - (p.lon - earthLon) * RAD;
            const { a, b } = orbits[i];
            const depth = Math.sin(phi);
            // nearer ones a little bigger; all of it moves with the mouse as one, with the
            // Sun (so each planet stays on its orbit's line)
            const r = spec.r * size * (0.88 + 0.24 * (depth + 1) / 2);
            let x = sun.x + a * Math.cos(phi);
            let y = sun.y + b * depth;
            x = cx + (x - cx) * implode;
            y = cy + (y - cy) * implode;
            const hidden = inView(x, y, depth, r, w, h, sun) ? null : depth < 0 && Math.hypot(x - sun.x, y - sun.y) < sun.r + r * 0.5 ? "sun" : "off";
            const pl: Placed = { spec, sprite: sprites.get(spec.name)!, x, y, r: r * Math.max(0.05, implode), depth, fromEarthAu: p.fromEarthAu, hidden };
            placed.push(pl);
            if (spec.name === "Earth") earth = pl;
        });
        // the Moon, round the Earth at its real angle (so lit as it really is: its phase)
        if (earth) {
            const e: Placed = earth;
            const phiM = earthAt - ((at?.moonLon ?? now.moonLon) - earthLon) * RAD;
            const dm = e.r * 2.4;
            moon = { spec: MOON, sprite: sprites.get("Moon")!, x: e.x + dm * Math.cos(phiM), y: e.y + dm * squash * 1.4 * Math.sin(phiM), r: MOON.r * size * Math.max(0.05, implode), depth: e.depth + Math.sin(phiM) * 0.001, fromEarthAu: null };

            // the ISS, round the Earth: once every 92.7 minutes, shown 60 times faster
            // (held still while its pop-up is open)
            const tNow = performance.now();
            if (!issPaused) issAngle += ((tNow - issLast) / 1000) * (TWO_PI / 92.7);
            issLast = tNow;
            const th = issAngle;
            const di = e.r * 1.7;
            // (back in time, each only once it was there: the ISS from its first module, the
            // telescopes from reaching their points)
            const then = Date.now() + sim.days * 86_400_000;
            if (then >= Date.UTC(1998, 10, 20)) dots.push({ spec: dotSpec("ISS"), sprite: sprites.get("Moon")!, x: e.x + di * Math.cos(th), y: e.y + di * 0.45 * Math.sin(th), r: 2.4, depth: e.depth + Math.sin(th) * 0.001, fromEarthAu: null, dot: { colour: "#f1f5f9", hover: () => `${issText()} · click for its live telemetry` } });
            // L1 toward the Sun, L2 away from it, 1.5 million km each (drawn larger)
            const ux = sun.x - e.x;
            const uy = sun.y - e.y;
            const un = Math.hypot(ux, uy) || 1;
            const dl = e.r * 3.4;
            if (then >= Date.UTC(2024, 0, 6)) dots.push({ spec: dotSpec("Aditya-L1"), sprite: sprites.get("Moon")!, x: e.x + (ux / un) * dl, y: e.y + (uy / un) * dl, r: 2.6, depth: e.depth, fromEarthAu: null, dot: { colour: "#fbbf24", hover: () => "ISRO's solar observatory, at L1: 1.5 million km sunward, watching the Sun without a break" } });
            if (then >= Date.UTC(2022, 0, 24)) dots.push({ spec: dotSpec("James Webb Space Telescope"), sprite: sprites.get("Moon")!, x: e.x - (ux / un) * dl, y: e.y - (uy / un) * dl, r: 2.6, depth: e.depth, fromEarthAu: null, dot: { colour: "#fde68a", hover: () => "at L2: 1.5 million km beyond the Earth, in its shadow side" } });
        }

        // Parker Solar Probe, on its real orbit; the Voyagers, the way they've gone
        arrows = [];
        for (const c of now.craft ?? []) {
            // (where it is at this moment, along NASA's track)
            const live = craftNow(c);
            const phi = earthAt - (live.lon - earthLon) * RAD;
            if (c.name === "Parker Solar Probe") {
                // (known for today only: left out back in time)
                if (sim.days < -1) continue;
                const a = auToA(live.au, sun.r);
                const x = sun.x + a * Math.cos(phi);
                const y = sun.y + a * squash * Math.sin(phi);
                const hidden = inView(x, y, Math.sin(phi), 3, w, h, sun) ? null : Math.sin(phi) < 0 && Math.hypot(x - sun.x, y - sun.y) < sun.r + 2 ? "sun" : "off";
                dots.push({ spec: dotSpec(c.name), sprite: sprites.get("Moon")!, x, y, r: 2.8, depth: Math.sin(phi), fromEarthAu: null, hidden, dot: { colour: "#f9a8d4", hover: () => {
                            const p = craftNow(c);
                            return `${p.au.toFixed(3)} AU from the Sun right now${p.speed ? `, moving at ${Math.round(p.speed)} km/s` : ""}; at its closest it passes within 0.05`;
                        } } });
                continue;
            }
            // (the Voyagers' directions are today's: shown only now)
            if (sim.days < -1) continue;
            const km = (live.au * AU_KM) / 1e9;
            // (just its name on a narrow screen, where the whole line would cross the view)
            const label = w < 640 ? c.name : `${c.name} · ${km.toFixed(1)} billion km that way`;
            const dx = Math.cos(phi);
            const dy = squash * Math.sin(phi);
            if (dx > 0.15 || e > 0.5) {
                // along the line from the Sun to the screen's edge, whichever side
                // (kept above the bottom corners, where the fragments counter sits)
                const ts = [dx > 0 ? (w - 24 - sun.x) / dx : dx < 0 ? (24 - sun.x) / dx : Infinity, dy > 0 ? (h - 84 - sun.y) / dy : dy < 0 ? (20 - sun.y) / dy : Infinity].filter((v) => v > 0);
                const t = Math.min(...ts);
                const right = dx >= 0;
                arrows.push({ text: right ? `${label} →` : `← ${label}`, x: sun.x + dx * t, y: sun.y + dy * t, align: right ? "right" : "left", ray: true, detail: voyagerDetail(c) });
            } else {
                // out past the left edge: at the edge, above or below the Sun
                // (kept above the bottom-left corner, where the fragments counter sits)
                arrows.push({ text: `← ${label}`, x: 14, y: Math.max(20, Math.min(h - 84, sun.y + Math.sign(dy || 1) * h * 0.44)), align: "left", detail: voyagerDetail(c) });
            }
        }
    };
    let dots: Placed[] = [];

    const drawBody = (c: CanvasRenderingContext2D, p: Placed, t: number) => {
        if (p.x < -p.r * 3 || p.y < -p.r * 3 || p.y > c.canvas.height + p.r * 3 || p.x > c.canvas.width + p.r * 3) return;
        if (p.dot) {
            // a spacecraft: a point of light
            c.save();
            c.globalAlpha = fade;
            // a dark ring first, so it shows over the Sun as well as over space
            c.fillStyle = "rgba(0,0,0,0.65)";
            c.beginPath();
            c.arc(p.x, p.y, p.r + 1.6, 0, TWO_PI);
            c.fill();
            c.fillStyle = p.dot.colour;
            c.shadowColor = p.dot.colour;
            c.shadowBlur = 8;
            c.beginPath();
            c.arc(p.x, p.y, p.r, 0, TWO_PI);
            c.fill();
            c.restore();
            return;
        }
        const size = Math.max(6, Math.round(p.r * 2) & ~1);
        // the light, from the Sun
        const lx = (sunAt?.x ?? 0) - p.x;
        const ly = -((sunAt?.y ?? 0) - p.y);
        const spin = (t / 1000) * (TWO_PI / p.spec.spinHours);
        c.save();
        c.globalAlpha = fade;
        if (p.spec.ring) drawRing(c, p, "back");
        if (paint(p.sprite, size, spin, lx, ly)) c.drawImage(p.sprite.canvas, p.x - size / 2, p.y - size / 2);
        else {
            c.fillStyle = p.spec.colour;
            c.beginPath();
            c.arc(p.x, p.y, p.r, 0, TWO_PI);
            c.fill();
        }
        if (p.spec.ring) drawRing(c, p, "front");
        c.restore();
    };

    const drawRing = (c: CanvasRenderingContext2D, p: Placed, half: "back" | "front") => {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(-0.35);
        const bands: [number, string][] = [
            [1.35, "rgba(214,196,160,0.35)"],
            [1.6, "rgba(226,208,170,0.55)"],
            [1.85, "rgba(200,182,146,0.45)"],
            [2.1, "rgba(180,164,132,0.3)"],
        ];
        for (const [k, col] of bands) {
            c.strokeStyle = col;
            c.lineWidth = Math.max(1, p.r * 0.22);
            c.beginPath();
            if (half === "back") c.ellipse(0, 0, p.r * k, p.r * k * 0.34, 0, Math.PI, TWO_PI);
            else c.ellipse(0, 0, p.r * k, p.r * k * 0.34, 0, 0, Math.PI);
            c.stroke();
        }
        c.restore();
    };

    const orbitHalf = (c: CanvasRenderingContext2D, half: "back" | "front") => {
        if (!sunAt || !placed.length) return;
        c.save();
        c.globalAlpha = fade;
        c.lineWidth = 1;
        for (const o of orbits) {
            c.strokeStyle = half === "back" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)";
            c.beginPath();
            if (half === "back") c.ellipse(sunAt.x, sunAt.y, o.a, o.b, 0, Math.PI, TWO_PI);
            else c.ellipse(sunAt.x, sunAt.y, o.a, o.b, 0, 0, Math.PI);
            c.stroke();
        }
        c.restore();
    };

    /** The belts' rocks on one side (behind the Sun, or in front), each drifting round at its distance's pace. */
    const belts = (c: CanvasRenderingContext2D, t: number, front: boolean) => {
        // (only in the solar system view, fading in with it)
        if (!sunAt || !placed.length || skyE < 0.01) return;
        const w = c.canvas.width;
        const h = c.canvas.height;
        const { implode, cx, cy, size } = view;
        c.save();
        for (const k of rocks) {
            // (once round in 10 minutes at 2.7 AU, slower farther out; the same way round as the planets)
            // (and with the time-lapse, at their real pace: a year a turn at 1 AU)
            const ang = k.a0 - ((t / 1000) * TWO_PI) / (600 * Math.pow(k.au / 2.7, 1.5)) - (TWO_PI * sim.days) / (365.25 * Math.pow(k.au, 1.5));
            const depth = Math.sin(ang);
            if (depth >= 0 !== front) continue;
            const a = auToA(k.au, sunAt.r);
            let x = sunAt.x + a * Math.cos(ang);
            let y = sunAt.y + a * squash * depth;
            x = cx + (x - cx) * implode;
            y = cy + (y - cy) * implode;
            if (x < -4 || y < -4 || x > w + 4 || y > h + 4) continue;
            const sz = k.s * size;
            // (fainter on the far side, as if farther off)
            c.globalAlpha = fade * skyE * k.lum * (k.kuiper ? 0.6 : 1) * (front ? 1 : 0.75);
            if (sz > 2.2) c.drawImage(rockSprites[(k.a0 * 7) & 3], x - sz, y - sz, sz * 2, sz * 2);
            else {
                c.fillStyle = k.kuiper ? "#b4c0d6" : "#cfc6b6";
                c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
            }
        }
        c.restore();
    };

    const order = (front: boolean) => {
        const list = [...placed, ...dots];
        if (moon) list.push(moon);
        return list.filter((p) => (front ? p.depth >= 0 : p.depth < 0)).sort((a, b) => a.depth - b.depth);
    };

    return {
        layout,
        /** Behind the Sun: the far halves of the orbits, and the planets on the far side. */
        drawBack(c: CanvasRenderingContext2D, t: number) {
            orbitHalf(c, "back");
            belts(c, t, false);
            for (const p of order(false)) drawBody(c, p, t);
        },
        /** In front of the Sun: the near halves, the planets on the near side, the Earth's ring, and a hovered planet's name. */
        drawFront(c: CanvasRenderingContext2D, t: number, pointer: { x: number; y: number } | null) {
            orbitHalf(c, "front");
            belts(c, t, true);
            for (const p of order(true)) drawBody(c, p, t);
            const e = earth as Placed | null;
            c.save();
            c.globalAlpha = fade;
            if (e) {
                // you are here
                c.strokeStyle = "rgba(94,234,212,0.55)";
                c.lineWidth = 1;
                c.beginPath();
                c.arc(e.x, e.y, e.r + 5, 0, TWO_PI);
                c.stroke();
            }
            c.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
            const w = c.canvas.width;
            const h = c.canvas.height;
            // labels go in the first of their spots that's free: not on another label,
            // the Earth, or the page's text; if none is, a name waits for a hover
            // (the Earth's, the markers and the Voyagers' take their first spot anyway)
            const taken: Box[] = [...clear];
            if (e) taken.push({ x: e.x - e.r - 6, y: e.y - e.r - 6, w: 2 * e.r + 12, h: 2 * e.r + 12 });
            // (and the planets themselves: no name written across one's disc)
            for (const p of placed) if (!p.hidden && p !== e) taken.push({ x: p.x - p.r - 2, y: p.y - p.r - 2, w: 2 * p.r + 4, h: 2 * p.r + 4 });
            // Each label keeps the spot it had while that's still free, and moves only when
            // it must; one with no spot free fades out, and back in, rather than blinking
            // (as they would, frame to frame, with everything moving in the time-lapse).
            // `alpha`: how far faded in it is.
            function spot(id: string, text: string, spots: Spot[], always: true): Spot & { alpha: number };
            function spot(id: string, text: string, spots: Spot[], always: boolean): (Spot & { alpha: number }) | null;
            function spot(id: string, text: string, spots: Spot[], always: boolean): (Spot & { alpha: number }) | null {
                const tw = c.measureText(text).width;
                const box = (o: Spot): Box => ({ x: o.align === "right" ? o.x - tw : o.x, y: o.y - 9, w: tw, h: 12 });
                const free = (b: Box) => !taken.some((t) => b.x < t.x + t.w && b.x + b.w > t.x && b.y < t.y + t.h && b.y + b.h > t.y);
                const kept = labelMemo.get(id) ?? { i: 0, a: always ? 1 : 0 };
                const last = Math.min(kept.i, spots.length - 1);
                const order = [last, ...spots.keys()].filter((i, k, all) => all.indexOf(i) === k);
                const pick = order.find((i) => free(box(spots[i])));
                const shown = pick !== undefined || always;
                if (pick !== undefined) kept.i = pick;
                kept.a = always ? 1 : shown ? Math.min(1, kept.a + 0.12) : Math.max(0, kept.a - 0.12);
                labelMemo.set(id, kept);
                if (kept.a <= 0) return null;
                const o = spots[Math.min(kept.i, spots.length - 1)];
                if (shown) taken.push(box(o));
                return { ...o, alpha: kept.a };
            }
            // a longer text under a name: kept on the screen, onto more lines if it's wider than that
            const lines = (text: string, o: Spot): { text: string; x: number; y: number }[] => {
                const most = Math.min(420, w - 16);
                const rows: string[] = [];
                for (const word of text.split(" ")) {
                    const last = rows[rows.length - 1];
                    if (last !== undefined && c.measureText(`${last} ${word}`).width <= most) rows[rows.length - 1] = `${last} ${word}`;
                    else rows.push(word);
                }
                return rows.map((row, i) => ({ text: row, ...fit(row, { ...o, y: o.y + i * 12 }) }));
            };
            // a text kept on the screen: moved in from whichever edge it would run past
            const fit = (text: string, o: Spot): Spot => {
                const tw = c.measureText(text).width;
                const x0 = o.align === "right" ? o.x - tw : o.x;
                return { x: Math.max(8, Math.min(w - 8 - tw, x0)), y: o.y, align: "left" };
            };
            // a hovered name's more, on a solid dark backing, drawn after everything else
            // (so no other label lands on it, and none shows through)
            const later: (() => void)[] = [];
            const more = (rows: { text: string; x: number; y: number }[], colour: string) => {
                if (!rows.length) return;
                later.push(() => {
                    const x0 = Math.min(...rows.map((r) => r.x)) - 6;
                    const x1 = Math.max(...rows.map((r) => r.x + c.measureText(r.text).width)) + 6;
                    const y0 = rows[0].y - 12;
                    const hh = rows.length * 12 + 8;
                    c.fillStyle = "rgb(8,11,22)";
                    c.fillRect(x0, y0, x1 - x0, hh);
                    c.strokeStyle = "rgba(255,255,255,0.12)";
                    c.lineWidth = 1;
                    c.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, hh - 1);
                    c.textAlign = "left";
                    c.fillStyle = colour;
                    for (const r of rows) c.fillText(r.text, r.x, r.y);
                });
            };
            // out of view: a marker at the Sun's rim, or at the edge it went past
            const marker = (p: Placed, k = 1) => {
                if (lastImplode < 1 || !sunAt || k <= 0.02) return;
                if (p.hidden === "sun") {
                    // just outside the Sun's visible edge, at its height
                    const my = Math.max(16, Math.min(h - 10, p.y));
                    const dy = Math.min(sunAt.r, Math.abs(my - sunAt.y));
                    const mx = Math.max(12, sunAt.x + Math.sqrt(sunAt.r * sunAt.r - dy * dy) + 12);
                    const at = spot(`marker:${p.spec.name}`, `${p.spec.name} · behind the Sun`, [{ x: mx, y: my, align: "left" }, { x: mx, y: my + 14, align: "left" }, { x: mx, y: my - 14, align: "left" }], true);
                    label(c, `${p.spec.name} · behind the Sun`, at.x, at.y, "left", 0.5 * k);
                } else {
                    const left = p.x < 0;
                    const right = p.x > w;
                    const text = `${p.y < 0 ? "↑ " : p.y > h ? "↓ " : left ? "← " : ""}${p.spec.name}${right ? " →" : ""}`;
                    const o: Spot = { x: Math.max(12, Math.min(w - 24, p.x)), y: Math.max(16, Math.min(h - 10, p.y)), align: right ? "right" : "left" };
                    const at = spot(`marker:${p.spec.name}`, text, [o, { ...o, y: o.y + (o.y > h / 2 ? -14 : 14) }, { ...o, y: o.y + (o.y > h / 2 ? -28 : 28) }], true);
                    label(c, text, at.x, at.y, at.align, 0.5 * k);
                }
                c.textAlign = "left";
            };
            // what's pointed at, if anything: the nearest planet or spacecraft under the pointer,
            // or a Voyager's arrow; everything else's label fades away meanwhile
            let focus: string | null = null;
            if (pointer && lastImplode === 1) {
                let best = Infinity;
                for (const p of placed) {
                    const d = Math.hypot(pointer.x - p.x, pointer.y - p.y);
                    if (!p.hidden && d < Math.max(12, p.r + 8) && d < best) [best, focus] = [d, p.spec.name];
                }
                for (const q of dots) {
                    const d = Math.hypot(pointer.x - q.x, pointer.y - q.y);
                    if (q.dot && !q.hidden && d < 10 && d < best) [best, focus] = [d, q.spec.name];
                }
                if (!focus)
                    for (const a of arrows) {
                        // (on its words, as drawn, with a little give)
                        const b = arrowBoxes.get(a.text);
                        const on = b
                            ? pointer.x > b.x - 6 && pointer.x < b.x + b.w + 6 && pointer.y > b.y - 5 && pointer.y < b.y + b.h + 5
                            : Math.abs(pointer.y - a.y) < 10 && (a.align === "left" ? pointer.x > a.x - 6 && pointer.x < a.x + 320 : pointer.x < a.x + 6 && pointer.x > a.x - 320);
                        if (on) focus = `arrow:${a.text}`;
                    }
            }
            focusFade = focus ? Math.min(1, focusFade + 0.15) : Math.max(0, focusFade - 0.1);
            const others = 1 - focusFade;
            // (the Earth's first, so it's the one that keeps its place)
            for (const p of [...placed].sort((a, b) => Number(b.spec.name === "Earth") - Number(a.spec.name === "Earth"))) {
                const hovered = focus === p.spec.name;
                if (!hovered && others <= 0.02) continue;
                if (p.hidden) {
                    // (not while time runs: they'd flick on and off as the planets whirl round
                    // behind the Sun; the label fades back in as it comes out instead)
                    const kept = labelMemo.get(p.spec.name);
                    if (sim.rate !== 0 || sim.toNow) {
                        if (kept && p.spec.name !== "Earth") kept.a = 0;
                    } else marker(p, others);
                    continue;
                }
                const name = p.spec.name === "Earth" ? "Earth · you are here" : p.spec.name === "Pluto" ? "Pluto · dwarf planet" : p.spec.name;
                // (one whirling round faster than 200° a second in the time-lapse goes unnamed
                // meanwhile: no label could keep up with it; it fades back in as time slows)
                if (!hovered && p.spec.name !== "Earth" && (sim.pace * 360) / (YEAR_DAYS[p.spec.name] ?? Infinity) > 200) {
                    const kept = labelMemo.get(p.spec.name);
                    if (kept) kept.a = 0;
                    continue;
                }
                const at = spot(
                    p.spec.name,
                    name,
                    [
                        { x: p.x + p.r + 6, y: p.y - p.r - 2, align: "left" },
                        { x: p.x + p.r + 6, y: p.y + p.r + 10, align: "left" },
                        { x: p.x - p.r - 6, y: p.y - p.r - 2, align: "right" },
                        { x: p.x - p.r - 6, y: p.y + p.r + 10, align: "right" },
                    ],
                    p.spec.name === "Earth" || !!hovered,
                );
                if (!at) continue;
                const { x: lx, y: ly, align } = at;
                c.textAlign = align;
                c.fillStyle = hovered ? "rgba(226,232,240,0.95)" : `rgba(226,232,240,${0.45 * at.alpha * others})`;
                c.fillText(name, lx, ly);
                if (hovered && p.fromEarthAu !== null) {
                    const mins = (p.fromEarthAu * 499.005) / 60;
                    c.fillStyle = "rgba(148,163,184,0.95)";
                    const text = `${p.fromEarthAu.toFixed(2)} AU from Earth ${when} · light ${mins < 60 ? `${Math.round(mins)} min` : `${(mins / 60).toFixed(1)} h`} · click for a fact`;
                    more(lines(text, { x: lx, y: ly + 13, align }), "rgba(148,163,184,0.95)");
                }
                c.textAlign = "left";
            }
            // the spacecraft: named faintly, and more on hover; labels to the side away from the Earth
            const ex = (earth as Placed | null)?.x ?? 0;
            for (const d of dots) {
                // (none for one off the screen: its label would be cut off at the edge)
                if (d.dot && d.hidden) {
                    marker(d, others);
                    continue;
                }
                if (!d.dot || lastImplode < 1 || d.x < 4 || d.y < 4 || d.x > w - 4 || d.y > h - 4) continue;
                const hovered = focus === d.spec.name;
                if (!hovered && others <= 0.02) continue;
                const leftSide = d.spec.name !== "ISS" && d.spec.name !== "Parker Solar Probe" && d.x < ex;
                const short = d.spec.name === "James Webb Space Telescope" && !hovered ? "JWST" : d.spec.name;
                const near: Spot = leftSide ? { x: d.x - 8, y: d.y - 5, align: "right" } : { x: d.x + 8, y: d.y - 5, align: "left" };
                const far: Spot = leftSide ? { x: d.x + 8, y: d.y - 5, align: "left" } : { x: d.x - 8, y: d.y - 5, align: "right" };
                const at = spot(d.spec.name, short, [near, { ...near, y: d.y + 12 }, far, { ...far, y: d.y + 12 }], !!hovered);
                if (!at) continue;
                const named = fit(short, at);
                label(c, short, named.x, named.y, "left", hovered ? 0.98 : 0.42 * at.alpha * others);
                if (hovered) more(lines(d.dot.hover(), { ...at, y: at.y + 13 }), "rgba(226,232,240,0.85)");
            }
            // the Voyagers, at the edge (stacked, not overlapping, when they point the same way or meet another label)
            if (lastImplode === 1) {
                for (const a of arrows) {
                    const near = focus === `arrow:${a.text}`;
                    if (!near && others <= 0.02) continue;
                    const step = a.y > h / 2 ? -14 : 14;
                    const { y } = spot(`arrow:${a.text}`, a.text, [0, 1, 2, 3, 4].map((k) => ({ x: a.x, y: a.y + k * step, align: a.align })), true);
                    const aw = c.measureText(a.text).width;
                    arrowBoxes.set(a.text, { x: a.align === "right" ? a.x - aw : a.x, y: y - 11, w: aw, h: 15 });
                    // its direction: a dotted line from the Sun's edge out toward it, stopping short of
                    // the words (so two Voyagers read as two ways, not two stray labels)
                    if (a.ray && sunAt) {
                        const ux = a.x - sunAt.x;
                        const uy = y - sunAt.y;
                        const len = Math.hypot(ux, uy);
                        // (where the line meets the words' box, a little before)
                        const tw = c.measureText(a.text).width;
                        const bx0 = a.align === "right" ? a.x - tw - 4 : a.x - 4;
                        const bx1 = bx0 + tw + 8;
                        const by0 = y - 13;
                        const by1 = y + 5;
                        const slab = (o: number, d: number, lo: number, hi: number) => (d === 0 ? (o >= lo && o <= hi ? [-Infinity, Infinity] : [Infinity, -Infinity]) : [Math.min((lo - o) / d, (hi - o) / d), Math.max((lo - o) / d, (hi - o) / d)]);
                        const [tx0] = slab(sunAt.x, ux, bx0, bx1);
                        const [ty0] = slab(sunAt.y, uy, by0, by1);
                        const stop = Math.min(1, Math.max(tx0, ty0)) * len - 6;
                        if (stop > sunAt.r + 20) {
                            c.save();
                            c.setLineDash([3, 5]);
                            c.lineWidth = 1;
                            c.strokeStyle = `rgba(226,232,240,${near ? 0.6 : 0.32 * others})`;
                            c.beginPath();
                            c.moveTo(sunAt.x + (ux / len) * (sunAt.r + 8), sunAt.y + (uy / len) * (sunAt.r + 8));
                            c.lineTo(sunAt.x + (ux / len) * stop, sunAt.y + (uy / len) * stop);
                            c.stroke();
                            c.restore();
                        }
                    }
                    label(c, a.text, a.x, y, a.align, near ? 0.95 : 0.5 * others);
                    if (near && a.detail) more(lines(a.detail(), { x: a.x, y: y + 13, align: a.align }), "rgba(226,232,240,0.85)");
                }
            }
            for (const draw of later) draw();
            c.restore();
        },
        /** What's at a point on the screen, for the click-for-a-fact pop-up: a planet or the Moon in view, or the Sun. */
        hitTest(x: number, y: number): { name: string; detail: string | null } | null {
            if (lastImplode < 1) return null;
            const bodies = [...placed.filter((p) => !p.hidden), ...(moon ? [moon] : [])].sort((a, b) => b.depth - a.depth);
            for (const p of bodies) {
                if (Math.hypot(x - p.x, y - p.y) > Math.max(12, p.r + 6)) continue;
                if (p.spec.name === "Earth") return { name: "Earth", detail: "You are here" };
                if (p.spec.name === "Moon") return { name: "Moon", detail: "Circling the Earth, shown at today's phase" };
                if (p.fromEarthAu === null) return { name: p.spec.name, detail: null };
                const mins = (p.fromEarthAu * 499.005) / 60;
                return { name: p.spec.name, detail: `${p.fromEarthAu.toFixed(2)} AU from Earth ${when} · its light takes ${mins < 60 ? `${Math.round(mins)} min` : `${(mins / 60).toFixed(1)} h`} to reach you` };
            }
            if (sunAt && Math.hypot(x - sunAt.x, y - sunAt.y) < sunAt.r) return { name: "Sun", detail: "The centre of it all" };
            return null;
        },
        /**
         * The Sun's disc, from its real map, turning (repainted a few times a second:
         * it turns slowly), at `alpha`. Painted `paintR` in radius, however big it's drawn
         * (so it isn't repainted at every size as it glides between the views). False
         * until the map has loaded.
         */
        drawSun(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, alpha = 1, paintR = r) {
            const sp = sprites.get("Sun")!;
            const size = Math.max(8, Math.round(paintR * 2) & ~1);
            if (t - sunPainted.at > 120 || sunPainted.size !== size) {
                if (!paint(sp, size, (t / 1000) * (TWO_PI / SUN.spinHours), 0, 0)) return false;
                sunPainted = { at: t, size };
            }
            c.save();
            c.globalAlpha = alpha;
            c.drawImage(sp.canvas, x - r, y - r, r * 2, r * 2);
            c.restore();
            return true;
        },
        /**
         * Time's pace, in days a second: 0 is real time (paused, back in the past), negative
         * runs it backwards. Loads the ephemeris the first time (entering the view does).
         */
        timeLapse(rate: number) {
            sim.toNow = false;
            sim.rate = Math.min(0, rate);
            if (!Astro) import("astronomy-engine").then((m) => (Astro = m)).catch(() => {});
        },
        /** Back to now: the past replayed forward, quickly, to the present, then real time. */
        toNow() {
            sim.rate = 0;
            if (sim.days === 0) return;
            sim.toNow = true;
            sim.from = sim.days;
            sim.fromAt = performance.now();
            sim.span = Math.max(1, Math.min(3, 0.6 + Math.log10(Math.abs(sim.days) + 1) * 0.5));
        },
        /** The date shown, whether it's now (real time), and the pace (days a second). */
        simNow() {
            return { date: new Date(Date.now() + sim.days * 86_400_000), now: sim.days === 0, rate: sim.toNow ? 0 : sim.rate, toNow: sim.toNow };
        },
        /** The page's text on the screen now (its boxes, in canvas pixels), for the labels to keep off. */
        keepClear(boxes: Box[]) {
            clear = boxes;
        },
        /** Where the ISS is on the screen this frame (for its click-for-telemetry pop-up), or null. */
        issAt() {
            const d = dots.find((x) => x.spec.name === "ISS");
            return d && lastImplode === 1 ? { x: d.x, y: d.y } : null;
        },
        /** Hold the ISS still (while its pop-up is open), or let it go on. */
        setIssPaused(p: boolean) {
            issPaused = p;
        },
        dispose() {
            window.clearInterval(timer);
            window.clearTimeout(settle);
        },
    };
}
