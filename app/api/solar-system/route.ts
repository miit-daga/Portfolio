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
// and 2, from NASA JPL's Horizons service (heliocentric, ecliptic), fetched
// once a day and kept in Redis. If Horizons is down they're left out.

export const dynamic = "force-dynamic";

const BODIES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn"] as const;
const CRAFT = [
    { id: "-96", name: "Parker Solar Probe" },
    { id: "-31", name: "Voyager 1" },
    { id: "-32", name: "Voyager 2" },
] as const;

export type Craft = { name: (typeof CRAFT)[number]["name"]; lon: number; au: number };
export type SolarNow = {
    at: number;
    planets: { name: (typeof BODIES)[number]; lon: number; fromEarthAu: number | null }[];
    moonLon: number;
    craft: Craft[];
};

let cached: { at: number; v: SolarNow } | null = null;

/** One spacecraft's place today from Horizons: its ecliptic longitude and distance from the Sun. */
async function horizons(id: string, day: string, next: string): Promise<{ lon: number; au: number } | null> {
    const q = new URLSearchParams({
        format: "json",
        COMMAND: `'${id}'`,
        EPHEM_TYPE: "'VECTORS'",
        CENTER: "'500@10'",
        START_TIME: `'${day}'`,
        STOP_TIME: `'${next}'`,
        STEP_SIZE: "'1d'",
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
        const [x, y, z] = [...block.matchAll(/[XYZ] =\s*([-+0-9.E]+)/g)].slice(0, 3).map((m) => Number(m[1]));
        if (![x, y, z].every(Number.isFinite)) return null;
        return { lon: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, au: Math.hypot(x, y, z) };
    } catch {
        return null;
    }
}

async function craftToday(): Promise<Craft[]> {
    const day = new Date().toISOString().slice(0, 10);
    const key = `solar:craft:${day}`;
    if (hasKv()) {
        try {
            const kept = await kv<string | null>(["GET", key]);
            if (kept) return JSON.parse(kept) as Craft[];
        } catch {
            /* fetch instead */
        }
    }
    const next = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
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
