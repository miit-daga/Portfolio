import type { SolarNow } from "@/app/api/solar-system/route";
import { issNow } from "@/lib/iss";
import { describeLocation } from "@/lib/locate";

// The solar system in the site's background (components/ui/animated-background.tsx),
// round the big half-Sun on the left, seen from above and a little to the side
// (each orbit an ellipse), so a planet on the far side can pass behind the Sun
// and is hidden by it, and one off the left edge is simply out of view.
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
// - Spacecraft at their real places: the ISS circling the Earth (sped up 60
//   times; hover for where it is right now), ISRO's Aditya-L1 at L1 and the
//   James Webb Space Telescope at L2 (their 1.5 million km from the Earth
//   drawn larger), Parker Solar Probe on its real orbit near the Sun, and the
//   Voyagers as arrows at the edge, pointing the way they've gone.

const ASSET = "/arcade/";
const RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const SQUASH = 0.34;
// where the Earth would sit on its orbit, on the screen, all else equal (radians;
// 0 is to the Sun's right, positive toward the viewer); the framing picks the
// angle that shows the most planets, nearest this
const EARTH_AT = 0.5;
const AU_OF = [0.387, 0.723, 1, 1.524, 5.203, 9.537, 19.19, 30.07, 39.48];
const AU_KM = 149_597_870.7;

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
const MOON: Spec = { name: "Moon", file: "planet-moon.jpg", r: 3.8, spinHours: 655.7, tilt: 6.7, colour: "#cbd5e1" };

type Map = { w: number; h: number; d: Uint8ClampedArray };
type Table = { size: number; idx: Int32Array; nx: Float32Array; ny: Float32Array; nz: Float32Array; lat: Float32Array; lon: Float32Array; edge: Float32Array };
type Sprite = { spec: Spec; map: Map | null; canvas: HTMLCanvasElement; table: Table | null };

function loadMap(file: string): Promise<Map> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = 512;
            c.height = 256;
            const g = c.getContext("2d", { willReadFrequently: true })!;
            g.drawImage(img, 0, 0, 512, 256);
            resolve({ w: 512, h: 256, d: g.getImageData(0, 0, 512, 256).data });
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
        const lit = Math.max(0, Math.min(1, (dot + 0.06) / 0.28)) * 0.96 + 0.04;
        const limb = 0.8 + 0.2 * t.nz[k];
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
type Arrow = { text: string; x: number; y: number; align: CanvasTextAlign };

export function createSolarSystem() {
    const sprites = new Map<string, Sprite>();
    for (const spec of [...PLANETS, MOON]) {
        const sp: Sprite = { spec, map: null, canvas: document.createElement("canvas"), table: null };
        sprites.set(spec.name, sp);
        loadMap(spec.file).then((m) => (sp.map = m)).catch(() => {});
    }
    let now: SolarNow | null = null;
    const refresh = () =>
        fetch("/api/solar-system")
            .then((r) => (r.ok ? (r.json() as Promise<SolarNow>) : null))
            .then((d) => d && (now = d))
            .catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 3600_000);

    let placed: Placed[] = [];
    let earth: Placed | null = null;
    let moon: Placed | null = null;
    let orbits: { a: number; b: number }[] = [];
    let sunAt: SunPlace | null = null;
    let fade = 0;
    let arrows: Arrow[] = [];
    let framing: { key: string; earthAt: number } | null = null;
    let lastImplode = 1;
    let issAngle = 0;
    let issLast = performance.now();
    let issPaused = false;
    // the ISS's latest position, asked for only when someone hovers it
    let iss: { at: number; text: string } | null = null;
    let issAsking = false;
    const issText = () => {
        if (!issAsking && (!iss || Date.now() - iss.at > 20_000)) {
            issAsking = true;
            issNow()
                .then((f) => f && (iss = { at: Date.now(), text: `over ${describeLocation(f.latitude, f.longitude)} right now, ${Math.round(f.altitude)} km up` }))
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
    const frame = (w: number, h: number, sun: SunPlace, earthLon: number) => {
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

    /** Where everything is this frame; call before drawBack. `implode` (1 down to 0) pulls it all into (cx, cy). */
    const layout = (w: number, h: number, sun: SunPlace, mouse: { x: number; y: number }, implode: number) => {
        sunAt = sun;
        placed = [];
        dots = [];
        earth = moon = null;
        if (!now) return;
        fade = Math.min(1, fade + 0.02);
        const earthLon = now.planets.find((p) => p.name === "Earth")!.lon;
        const size = Math.max(0.65, Math.min(1.25, w / 1440));
        const first = sun.r * 1.22;
        const last = Math.max(first + 200, w - sun.x - w * 0.09);
        orbits = PLANETS.map((_, i) => {
            const a = first + (last - first) * Math.pow(i / (PLANETS.length - 1), 0.92);
            return { a, b: a * SQUASH };
        });
        const cx = w / 2;
        const cy = h / 2;
        lastImplode = implode;
        // the framing, worked out again only when the day's positions or the screen change
        const key = `${now.at}|${w}|${h}`;
        if (!framing || framing.key !== key) framing = { key, earthAt: frame(w, h, sun, earthLon) };
        const earthAt = framing.earthAt;
        PLANETS.forEach((spec, i) => {
            const p = now!.planets.find((q) => q.name === spec.name);
            if (!p) return;
            // (counter-clockwise from the north, as the planets go: seen from above, the far side is up the screen)
            const phi = earthAt - (p.lon - earthLon) * RAD;
            const { a, b } = orbits[i];
            const depth = Math.sin(phi);
            // nearer ones a little bigger, and moving more with the mouse
            const r = spec.r * size * (0.88 + 0.24 * (depth + 1) / 2);
            let x = sun.x + a * Math.cos(phi) + mouse.x * (8 + i * 5);
            let y = sun.y + b * depth + mouse.y * (8 + i * 5);
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
            const phiM = earthAt - (now.moonLon - earthLon) * RAD;
            const dm = e.r * 2.4;
            moon = { spec: MOON, sprite: sprites.get("Moon")!, x: e.x + dm * Math.cos(phiM), y: e.y + dm * SQUASH * 1.4 * Math.sin(phiM), r: MOON.r * size * Math.max(0.05, implode), depth: e.depth + Math.sin(phiM) * 0.001, fromEarthAu: null };

            // the ISS, round the Earth: once every 92.7 minutes, shown 60 times faster
            // (held still while its pop-up is open)
            const tNow = performance.now();
            if (!issPaused) issAngle += ((tNow - issLast) / 1000) * (TWO_PI / 92.7);
            issLast = tNow;
            const th = issAngle;
            const di = e.r * 1.7;
            dots.push({ spec: dotSpec("ISS"), sprite: sprites.get("Moon")!, x: e.x + di * Math.cos(th), y: e.y + di * 0.45 * Math.sin(th), r: 2.4, depth: e.depth + Math.sin(th) * 0.001, fromEarthAu: null, dot: { colour: "#f1f5f9", hover: () => `${issText()} · click for its live telemetry` } });
            // L1 toward the Sun, L2 away from it, 1.5 million km each (drawn larger)
            const ux = sun.x - e.x;
            const uy = sun.y - e.y;
            const un = Math.hypot(ux, uy) || 1;
            const dl = e.r * 3.4;
            dots.push({ spec: dotSpec("Aditya-L1"), sprite: sprites.get("Moon")!, x: e.x + (ux / un) * dl, y: e.y + (uy / un) * dl, r: 2.6, depth: e.depth, fromEarthAu: null, dot: { colour: "#fbbf24", hover: () => "ISRO's solar observatory, at L1: 1.5 million km sunward, watching the Sun without a break" } });
            dots.push({ spec: dotSpec("James Webb Space Telescope"), sprite: sprites.get("Moon")!, x: e.x - (ux / un) * dl, y: e.y - (uy / un) * dl, r: 2.6, depth: e.depth, fromEarthAu: null, dot: { colour: "#fde68a", hover: () => "at L2: 1.5 million km beyond the Earth, in its shadow side" } });
        }

        // Parker Solar Probe, on its real orbit; the Voyagers, the way they've gone
        arrows = [];
        for (const c of now.craft ?? []) {
            const phi = earthAt - (c.lon - earthLon) * RAD;
            if (c.name === "Parker Solar Probe") {
                const a = auToA(c.au, sun.r);
                const x = sun.x + a * Math.cos(phi);
                const y = sun.y + a * SQUASH * Math.sin(phi);
                dots.push({ spec: dotSpec(c.name), sprite: sprites.get("Moon")!, x, y, r: 2.8, depth: Math.sin(phi), fromEarthAu: null, dot: { colour: "#f9a8d4", hover: () => `${c.au.toFixed(2)} AU from the Sun today; at its closest it passes within 0.05` } });
                continue;
            }
            const km = (c.au * AU_KM) / 1e9;
            const label = `${c.name} · ${km.toFixed(1)} billion km that way`;
            const dx = Math.cos(phi);
            const dy = SQUASH * Math.sin(phi);
            if (dx > 0.15) {
                // along the line from the Sun to the screen's edge
                const ts = [(w - 24 - sun.x) / dx, dy > 0 ? (h - 18 - sun.y) / dy : dy < 0 ? (18 - sun.y) / dy : Infinity].filter((v) => v > 0);
                const t = Math.min(...ts);
                arrows.push({ text: `${label} →`, x: sun.x + dx * t, y: sun.y + dy * t, align: "right" });
            } else {
                // out past the left edge: at the edge, above or below the Sun
                // (kept above the bottom-left corner, where the fragments counter sits)
                arrows.push({ text: `← ${label}`, x: 14, y: Math.max(20, Math.min(h - 84, sun.y + Math.sign(dy || 1) * h * 0.44)), align: "left" });
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
            for (const p of order(false)) drawBody(c, p, t);
        },
        /** In front of the Sun: the near halves, the planets on the near side, the Earth's ring, and a hovered planet's name. */
        drawFront(c: CanvasRenderingContext2D, t: number, pointer: { x: number; y: number } | null) {
            orbitHalf(c, "front");
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
            for (const p of placed) {
                const hovered = pointer && Math.hypot(pointer.x - p.x, pointer.y - p.y) < Math.max(12, p.r + 8);
                if (p.hidden) {
                    // out of view: a marker at the Sun's rim, or at the edge it went past
                    if (lastImplode < 1 || !sunAt) continue;
                    if (p.hidden === "sun") {
                        // just outside the Sun's visible edge, at the planet's height
                        const my = Math.max(16, Math.min(h - 10, p.y));
                        const dy = Math.min(sunAt.r, Math.abs(my - sunAt.y));
                        const mx = Math.max(12, sunAt.x + Math.sqrt(sunAt.r * sunAt.r - dy * dy) + 12);
                        label(c, `${p.spec.name} · behind the Sun`, mx, my, "left", 0.5);
                    } else {
                        const left = p.x < 0;
                        const right = p.x > w;
                        const arrow = p.y < 0 ? "↑ " : p.y > h ? "↓ " : left ? "← " : "";
                        label(c, `${arrow}${p.spec.name}${right ? " →" : ""}`, Math.max(12, Math.min(w - 24, p.x)), Math.max(16, Math.min(h - 10, p.y)), right ? "right" : "left", 0.5);
                    }
                    c.textAlign = "left";
                    continue;
                }
                const lx = p.x + p.r + 6;
                const ly = p.y - p.r - 2;
                c.fillStyle = hovered ? "rgba(226,232,240,0.95)" : "rgba(226,232,240,0.45)";
                c.fillText(p.spec.name === "Earth" ? "Earth · you are here" : p.spec.name === "Pluto" ? "Pluto · dwarf planet" : p.spec.name, lx, ly);
                if (hovered && p.fromEarthAu !== null) {
                    const mins = (p.fromEarthAu * 499.005) / 60;
                    c.fillStyle = "rgba(148,163,184,0.95)";
                    c.fillText(`${p.fromEarthAu.toFixed(2)} AU from Earth today · light ${mins < 60 ? `${Math.round(mins)} min` : `${(mins / 60).toFixed(1)} h`} · click for a fact`, lx, ly + 13);
                }
            }
            // the spacecraft: named faintly, and more on hover; labels to the side away from the Earth
            const ex = (earth as Placed | null)?.x ?? 0;
            for (const d of dots) {
                // (none for one off the screen: its label would be cut off at the edge)
                if (!d.dot || lastImplode < 1 || d.x < 4 || d.y < 4 || d.x > w - 4 || d.y > h - 4) continue;
                const hovered = pointer && Math.hypot(pointer.x - d.x, pointer.y - d.y) < 10;
                const leftSide = d.spec.name !== "ISS" && d.spec.name !== "Parker Solar Probe" && d.x < ex;
                const x = leftSide ? d.x - 8 : d.x + 8;
                const short = d.spec.name === "James Webb Space Telescope" && !hovered ? "JWST" : d.spec.name;
                label(c, short, x, d.y - 5, leftSide ? "right" : "left", hovered ? 0.98 : 0.42);
                if (hovered) label(c, d.dot.hover(), x, d.y + 8, leftSide ? "right" : "left", 0.8);
            }
            // the Voyagers, at the edge (stacked, not overlapping, when they point the same way)
            if (lastImplode === 1) {
                const used: Arrow[] = [];
                for (const a of arrows) {
                    let y = a.y;
                    while (used.some((u) => u.align === a.align && Math.abs(u.y - y) < 14)) y += a.y > h / 2 ? -14 : 14;
                    used.push({ ...a, y });
                    const near = pointer && Math.abs(pointer.y - y) < 10 && (a.align === "left" ? pointer.x < a.x + 320 : pointer.x > a.x - 320);
                    label(c, a.text, a.x, y, a.align, near ? 0.95 : 0.5);
                }
            }
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
                return { name: p.spec.name, detail: `${p.fromEarthAu.toFixed(2)} AU from Earth today · its light takes ${mins < 60 ? `${Math.round(mins)} min` : `${(mins / 60).toFixed(1)} h`} to reach you` };
            }
            if (sunAt && Math.hypot(x - sunAt.x, y - sunAt.y) < sunAt.r) return { name: "Sun", detail: "The centre of it all" };
            return null;
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
        },
    };
}
