import { NextResponse } from "next/server";
import * as A from "astronomy-engine";
import { hasKv, kv } from "@/lib/store";

// Where the planets are today, for the solar system in the site's background
// (lib/solar-system.ts): each one's heliocentric ecliptic longitude (its true
// angle round the Sun), its distance from the Earth, and the Moon's
// geocentric longitude (for its place round the Earth, and so its phase).
// Worked out here so the page doesn't carry the ephemeris; an hour's cache.
//
// And three spacecraft on their own paths: Parker Solar Probe, and Voyager 1
// and 2, from NASA JPL's Horizons service (heliocentric, ecliptic): each one's
// track for today and tomorrow, every 6 hours, fetched once a day and kept in
// Redis, so the page can place it at the very moment, between the points
// (lib/solar-system.ts). If Horizons is down they're left out.

export const dynamic = "force-dynamic";

const BODIES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as const;
const CRAFT = [
    { id: "-96", name: "Parker Solar Probe" },
    { id: "-31", name: "Voyager 1" },
    { id: "-32", name: "Voyager 2" },
] as const;

/** its place now (as fetched), and its track: [time (ms), x, y, z (AU, heliocentric ecliptic)] every 6 hours */
export type Craft = { name: (typeof CRAFT)[number]["name"]; lon: number; au: number; track?: [number, number, number, number][] };
export type SolarNow = {
    at: number;
    planets: { name: (typeof BODIES)[number]; lon: number; fromEarthAu: number | null }[];
    moonLon: number;
    craft: Craft[];
};

let cached: { at: number; v: SolarNow } | null = null;

/** One spacecraft's track from Horizons, today to tomorrow's end every 6 hours, and its place at the start. */
async function horizons(id: string, day: string, next: string): Promise<{ lon: number; au: number; track: [number, number, number, number][] } | null> {
    const q = new URLSearchParams({
        format: "json",
        COMMAND: `'${id}'`,
        EPHEM_TYPE: "'VECTORS'",
        CENTER: "'500@10'",
        START_TIME: `'${day}'`,
        STOP_TIME: `'${next}'`,
        STEP_SIZE: "'6h'",
        VEC_TABLE: "'1'",
        REF_PLANE: "'ECLIPTIC'",
        OUT_UNITS: "'AU-D'",
        MAKE_EPHEM: "'YES'",
        OBJ_DATA: "'NO'",
    });
    try {
        const r = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${q}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        const text = ((await r.json()) as { result?: string }).result ?? "";
        const block = /\$\$SOE([\s\S]*?)\$\$EOE/.exec(text)?.[1];
        if (!block) return null;
        // each point: its Julian date, then X, Y and Z
        const jds = [...block.matchAll(/^\s*(\d{7}\.\d+) = A\.D\./gm)].map((m) => Number(m[1]));
        const xyz = [...block.matchAll(/[XYZ] =\s*([-+0-9.E]+)/g)].map((m) => Number(m[1]));
        const track: [number, number, number, number][] = jds.map((jd, i) => [Math.round((jd - 2440587.5) * 86_400_000), xyz[3 * i], xyz[3 * i + 1], xyz[3 * i + 2]]);
        if (!track.length || !track.every((p) => p.every(Number.isFinite))) return null;
        const [, x, y, z] = track[0];
        return { lon: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, au: Math.hypot(x, y, z), track };
    } catch {
        return null;
    }
}

async function craftToday(): Promise<Craft[]> {
    const day = new Date().toISOString().slice(0, 10);
    const key = `solar:craft:v2:${day}`;
    if (hasKv()) {
        try {
            const kept = await kv<string | null>(["GET", key]);
            if (kept) return JSON.parse(kept) as Craft[];
        } catch {
            /* fetch instead */
        }
    }
    const next = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    // (one after another: Horizons turns away several at once)
    const out: Craft[] = [];
    for (const c of CRAFT) {
        const place = await horizons(c.id, day, next);
        if (place) out.push({ name: c.name, ...place });
    }
    // all three kept for the day; with one missing, only an hour, to try again
    if (out.length && hasKv()) kv(["SET", key, JSON.stringify(out), "EX", out.length === CRAFT.length ? 2 * 86400 : 3600]).catch(() => {});
    return out;
}

export async function GET() {
    if (!cached || Date.now() - cached.at > 3600_000) {
        const now = new Date();
        const v: SolarNow = {
            at: now.getTime(),
            planets: BODIES.map((name) => ({
                name,
                lon: A.EclipticLongitude(A.Body[name], now),
                fromEarthAu: name === "Earth" ? null : A.GeoVector(A.Body[name], now, true).Length(),
            })),
            moonLon: A.EclipticGeoMoon(now).lon,
            craft: await craftToday(),
        };
        cached = { at: Date.now(), v };
    }
    return NextResponse.json(cached.v, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
