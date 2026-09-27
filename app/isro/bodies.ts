// Realistic worlds for the journeys' 2D drawings (./journeys.tsx): each is
// rendered once, pixel by pixel, into a small canvas (an orthographic view
// of its real map, lit by the Sun), and then only scaled each frame.
//
// - The Earth: NASA's Blue Marble (the arcade's earth-day.jpg) with its
//   clouds and, on the night side, city lights; turned so India faces you
// - The Moon and Mars: their real maps (public/arcade), Mars turned to show
//   Valles Marineris
// - The Sun: no map, so granulation from noise, darkening toward the limb as
//   the real Sun's does, white-yellow at the centre to orange at the edge
// The sunlight comes from the left and a little behind, so each world shows
// a lit crescent-to-gibbous face with a soft terminator.

export type BodyKey = "earth" | "moon" | "mars" | "sun";

const ASSET = "/arcade/";
const SIZE = 512;
// the light's direction in view space (x right, y up, z toward you)
const L = (() => {
    const v = [-0.78, 0.22, 0.58];
    const n = Math.hypot(v[0], v[1], v[2]);
    return v.map((c) => c / n);
})();

type Map = { w: number; h: number; d: Uint8ClampedArray };

function loadMap(file: string, w: number, h: number): Promise<Map> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const g = c.getContext("2d", { willReadFrequently: true })!;
            g.drawImage(img, 0, 0, w, h);
            resolve({ w, h, d: g.getImageData(0, 0, w, h).data });
        };
        img.onerror = reject;
        img.src = ASSET + file;
    });
}

/** A map's colour at a latitude and longitude (radians), bilinear. */
function sample(m: Map, lat: number, lon: number, out: number[]) {
    let u = ((lon / (2 * Math.PI) + 0.5) % 1 + 1) % 1;
    const v = Math.min(0.9999, Math.max(0, 0.5 - lat / Math.PI));
    const x = u * (m.w - 1);
    const y = v * (m.h - 1);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = (x0 + 1) % m.w;
    const y1 = Math.min(m.h - 1, y0 + 1);
    const fx = x - x0;
    const fy = y - y0;
    for (let k = 0; k < 3; k++) {
        const a = m.d[(y0 * m.w + x0) * 4 + k];
        const b = m.d[(y0 * m.w + x1) * 4 + k];
        const c = m.d[(y1 * m.w + x0) * 4 + k];
        const e = m.d[(y1 * m.w + x1) * 4 + k];
        out[k] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy;
    }
    u = 0;
    return out;
}

/** An orthographic, sunlit view of a world from its map(s). */
function renderWorld(key: "earth" | "moon" | "mars", day: Map, clouds: Map | null, night: Map | null, lon0: number, lat0: number) {
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    const g = c.getContext("2d")!;
    const img = g.createImageData(SIZE, SIZE);
    const r = SIZE / 2 - 1;
    const col = [0, 0, 0];
    const cl = [0, 0, 0];
    const nt = [0, 0, 0];
    const cosT = Math.cos(lat0);
    const sinT = Math.sin(lat0);
    for (let py = 0; py < SIZE; py++) {
        for (let px = 0; px < SIZE; px++) {
            const nx = (px + 0.5 - SIZE / 2) / r;
            const ny = -(py + 0.5 - SIZE / 2) / r;
            const d2 = nx * nx + ny * ny;
            if (d2 > 1) continue;
            const nz = Math.sqrt(1 - d2);
            // tilt the view by lat0 (so the centre is at that latitude), then read off lat/lon
            const y = ny * cosT + nz * sinT;
            const z = -ny * sinT + nz * cosT;
            const lat = Math.asin(Math.max(-1, Math.min(1, y)));
            const lon = lon0 + Math.atan2(nx, z);
            sample(day, lat, lon, col);
            // light: a soft terminator, a little ambient
            const ndl = nx * L[0] + ny * L[1] + nz * L[2];
            const lit = Math.max(0, Math.min(1, (ndl + 0.08) / 0.3));
            let rr = col[0] * lit * 1.05;
            let gg = col[1] * lit * 1.05;
            let bb = col[2] * lit * 1.05;
            if (key === "earth") {
                if (clouds) {
                    sample(clouds, lat, lon, cl);
                    const a = Math.pow(cl[0] / 255, 1.5) * 0.9;
                    rr = rr * (1 - a) + 250 * a * lit;
                    gg = gg * (1 - a) + 250 * a * lit;
                    bb = bb * (1 - a) + 255 * a * lit;
                }
                if (night && lit < 0.6) {
                    sample(night, lat, lon, nt);
                    const k = Math.pow(nt[0] / 255, 2) * 1.6 * (1 - lit / 0.6);
                    rr += 255 * k;
                    gg += 200 * k;
                    bb += 120 * k;
                }
                // the air: bluer toward the edge on the day side
                const edge = Math.pow(1 - nz, 2.2);
                rr = rr * (1 - edge * 0.5) + 90 * edge * lit;
                gg = gg * (1 - edge * 0.5) + 150 * edge * lit;
                bb = bb * (1 - edge * 0.5) + 255 * edge * lit;
            } else {
                // bare rock darkens gently toward the limb
                const limb = 0.75 + 0.25 * nz;
                rr *= limb;
                gg *= limb;
                bb *= limb;
                if (key === "mars") {
                    const edge = Math.pow(1 - nz, 3);
                    rr += 220 * edge * lit * 0.35;
                    gg += 150 * edge * lit * 0.35;
                    bb += 120 * edge * lit * 0.35;
                }
            }
            // an anti-aliased rim
            const a = Math.min(1, (1 - Math.sqrt(d2)) * r * 1.2);
            const i = (py * SIZE + px) * 4;
            img.data[i] = rr;
            img.data[i + 1] = gg;
            img.data[i + 2] = bb;
            img.data[i + 3] = 255 * a;
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}

/** Value noise, for the Sun's granulation. */
function noise(seed: number) {
    const hash = (x: number, y: number) => {
        let h = (x * 374761393 + y * 668265263 + seed * 69069) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    return (x: number, y: number) => {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const fx = x - xi;
        const fy = y - yi;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const a = hash(xi, yi);
        const b = hash(xi + 1, yi);
        const c = hash(xi, yi + 1);
        const d = hash(xi + 1, yi + 1);
        return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
    };
}

function renderSun() {
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    const g = c.getContext("2d")!;
    const img = g.createImageData(SIZE, SIZE);
    const r = SIZE / 2 - 1;
    const n1 = noise(7);
    const n2 = noise(19);
    for (let py = 0; py < SIZE; py++) {
        for (let px = 0; px < SIZE; px++) {
            const nx = (px + 0.5 - SIZE / 2) / r;
            const ny = (py + 0.5 - SIZE / 2) / r;
            const d2 = nx * nx + ny * ny;
            if (d2 > 1) continue;
            const mu = Math.sqrt(1 - d2);
            // granulation: fine cells, foreshortened toward the limb
            const gx = nx / (0.35 + 0.65 * mu);
            const gran = n1(gx * 38 + 100, ny * 38 + 100) * 0.6 + n2(gx * 90 + 50, ny * 90 + 50) * 0.4;
            // limb darkening (the real Sun's, roughly: I = 1 - 0.6(1 - mu))
            const I = (1 - 0.6 * (1 - mu)) * (0.86 + 0.28 * gran);
            const warm = 1 - mu;
            const i = (py * SIZE + px) * 4;
            img.data[i] = 255 * Math.min(1, I * 1.08);
            img.data[i + 1] = 255 * Math.min(1, I * (0.93 - 0.3 * warm));
            img.data[i + 2] = 255 * Math.min(1, I * (0.72 - 0.55 * warm));
            img.data[i + 3] = 255 * Math.min(1, (1 - Math.sqrt(d2)) * r * 1.2);
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}

/** Halving copies down to 8 px, largest first: drawing a 512 px world at 16 px in one step scrambles it. */
function mips(c: HTMLCanvasElement) {
    const out = [c];
    while (out[out.length - 1].width > 8) {
        const prev = out[out.length - 1];
        const m = document.createElement("canvas");
        m.width = m.height = prev.width / 2;
        const g = m.getContext("2d")!;
        g.imageSmoothingQuality = "high";
        g.drawImage(prev, 0, 0, m.width, m.height);
        out.push(m);
    }
    return out;
}

const RAD = Math.PI / 180;
let pending: Promise<Partial<Record<BodyKey, HTMLCanvasElement>>> | null = null;

/** Every world, rendered (once per page; each appears as soon as it's ready). */
export function loadBodies(onReady: (key: BodyKey, sizes: HTMLCanvasElement[]) => void) {
    onReady("sun", mips(renderSun()));
    pending ??= (async () => {
        const out: Partial<Record<BodyKey, HTMLCanvasElement>> = {};
        const [day, clouds, night, moon, mars] = await Promise.all([
            loadMap("earth-day.jpg", 2048, 1024),
            loadMap("earth-clouds.jpg", 2048, 1024).catch(() => null),
            loadMap("earth-night.jpg", 2048, 1024).catch(() => null),
            loadMap("planet-moon.jpg", 2048, 1024),
            loadMap("planet-mars.jpg", 2048, 1024),
        ]);
        out.earth = renderWorld("earth", day, clouds, night, 80 * RAD, 15 * RAD);
        out.moon = renderWorld("moon", moon, null, null, 0, 0);
        out.mars = renderWorld("mars", mars, null, null, -70 * RAD, 0);
        return out;
    })();
    pending.then((all) => (Object.keys(all) as BodyKey[]).forEach((k) => onReady(k, mips(all[k]!)))).catch(() => {});
}
