import type { SolarNow } from "@/app/api/solar-system/route";

// The solar system in the site's background (components/ui/animated-background.tsx),
// round the big half-Sun on the left, seen from above and a little to the side
// (each orbit an ellipse), so a planet on the far side can pass behind the Sun
// and is hidden by it, and one off the left edge is simply out of view.
//
// - Where each planet is: its true angle round the Sun today (app/api/solar-system),
//   the view turned so the Earth always sits front-right, in view; the others
//   keep their true angles from it. Distances are evenly spaced, not to scale
//   (to scale, Mercury would hug the Sun and Saturn be many screens away).
// - Each planet spins, from its real map, lit from the Sun: the spins sped up
//   3,600 times (a real hour a second, so the Earth turns once in 24 s and
//   Jupiter in 10 s), their relative speeds and tilts real; Venus turns
//   backwards, and Mercury and Venus barely at all, as they really do.
// - The Moon circles the Earth at its real place today, so its phase is real.
// - Hovering a planet names it, with its distance from Earth today.

const ASSET = "/arcade/";
const RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const SQUASH = 0.34;
// where the Earth sits on its orbit, on the screen (radians; 0 is to the Sun's right, positive toward the viewer)
const EARTH_AT = 0.5;

type Spec = { name: string; file: string; r: number; spinHours: number; tilt: number; colour: string; ring?: boolean };
const PLANETS: Spec[] = [
    { name: "Mercury", file: "planet-mercury.jpg", r: 7, spinHours: 1407.6, tilt: 0, colour: "#9ca3af" },
    { name: "Venus", file: "planet-venus.jpg", r: 11, spinHours: -5832.5, tilt: 2.6, colour: "#e8c98f" },
    { name: "Earth", file: "planet-earth.jpg", r: 12, spinHours: 23.93, tilt: 23.4, colour: "#4f8fdc" },
    { name: "Mars", file: "planet-mars.jpg", r: 9, spinHours: 24.62, tilt: 25.2, colour: "#d9724a" },
    { name: "Jupiter", file: "planet-jupiter.jpg", r: 26, spinHours: 9.93, tilt: 3.1, colour: "#d8b48c" },
    { name: "Saturn", file: "planet-saturn.jpg", r: 21, spinHours: 10.66, tilt: 26.7, colour: "#e3cf9f", ring: true },
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
type Placed = { spec: Spec; sprite: Sprite; x: number; y: number; r: number; depth: number; fromEarthAu: number | null };

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

    /** Where everything is this frame; call before drawBack. `implode` (1 down to 0) pulls it all into (cx, cy). */
    const layout = (w: number, h: number, sun: SunPlace, mouse: { x: number; y: number }, implode: number) => {
        sunAt = sun;
        placed = [];
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
        PLANETS.forEach((spec, i) => {
            const p = now!.planets.find((q) => q.name === spec.name);
            if (!p) return;
            // (counter-clockwise from the north, as the planets go: seen from above, the far side is up the screen)
            const phi = EARTH_AT - (p.lon - earthLon) * RAD;
            const { a, b } = orbits[i];
            const depth = Math.sin(phi);
            // nearer ones a little bigger, and moving more with the mouse
            const r = spec.r * size * (0.88 + 0.24 * (depth + 1) / 2);
            let x = sun.x + a * Math.cos(phi) + mouse.x * (8 + i * 5);
            let y = sun.y + b * depth + mouse.y * (8 + i * 5);
            x = cx + (x - cx) * implode;
            y = cy + (y - cy) * implode;
            const pl: Placed = { spec, sprite: sprites.get(spec.name)!, x, y, r: r * Math.max(0.05, implode), depth, fromEarthAu: p.fromEarthAu };
            placed.push(pl);
            if (spec.name === "Earth") earth = pl;
        });
        // the Moon, round the Earth at its real angle (so lit as it really is: its phase)
        if (earth) {
            const e: Placed = earth;
            const phiM = EARTH_AT - (now.moonLon - earthLon) * RAD;
            const dm = e.r * 2.4;
            moon = { spec: MOON, sprite: sprites.get("Moon")!, x: e.x + dm * Math.cos(phiM), y: e.y + dm * SQUASH * 1.4 * Math.sin(phiM), r: MOON.r * size * Math.max(0.05, implode), depth: e.depth + Math.sin(phiM) * 0.001, fromEarthAu: null };
        }
    };

    const drawBody = (c: CanvasRenderingContext2D, p: Placed, t: number) => {
        if (p.x < -p.r * 3 || p.y < -p.r * 3 || p.y > c.canvas.height + p.r * 3 || p.x > c.canvas.width + p.r * 3) return;
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
        const list = [...placed];
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
            for (const p of placed) {
                const hovered = pointer && Math.hypot(pointer.x - p.x, pointer.y - p.y) < Math.max(12, p.r + 8);
                const behindSun = sunAt && p.depth < 0 && Math.hypot(p.x - sunAt.x, p.y - sunAt.y) < sunAt.r;
                if (behindSun) continue;
                const lx = p.x + p.r + 6;
                const ly = p.y - p.r - 2;
                c.fillStyle = hovered ? "rgba(226,232,240,0.95)" : "rgba(226,232,240,0.45)";
                c.fillText(p.spec.name === "Earth" ? "Earth · you are here" : p.spec.name, lx, ly);
                if (hovered && p.fromEarthAu !== null) {
                    const mins = (p.fromEarthAu * 499.005) / 60;
                    c.fillStyle = "rgba(148,163,184,0.95)";
                    c.fillText(`${p.fromEarthAu.toFixed(2)} AU from Earth today · light ${mins < 60 ? `${Math.round(mins)} min` : `${(mins / 60).toFixed(1)} h`}`, lx, ly + 13);
                }
            }
            c.restore();
        },
        dispose() {
            window.clearInterval(timer);
        },
    };
}
