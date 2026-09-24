import { NextResponse } from "next/server";
import { hasKv, kv } from "@/lib/store";

// What's really happening in space today, for the arcade's daily games:
// - the asteroids passing Earth today, from NASA's Near Earth Object web
//   service (NeoWs): name, size, speed, how close, and whether NASA calls
//   it potentially hazardous. For Asteroid Run's "Today's field"
// - the planetary K index, from NOAA's Space Weather Prediction Center: the
//   highest in the last day (5 and up is a geomagnetic storm, with aurora).
//   For Stack the Station's "Today's station"
// - how many people are in space right now
// Fetched on the server, at most once a day (the space weather every few
// hours), and kept in Redis, so the games never wait on these services; a
// source that fails comes back null and is tried again soon.
// NASA's key is NASA_API_KEY if set (free, from api.nasa.gov), else its
// public DEMO_KEY, which allows only a few requests an hour.

export const dynamic = "force-dynamic";

type Asteroid = { name: string; d: number; v: number; ld: number; hazardous: boolean; at: string };
type Today = { day: string; asteroids: Asteroid[] | null; kp: number | null; people: number | null; fetched: string };

const cache = new Map<string, { t: number; v: Today }>();

async function getJson<T>(url: string): Promise<T | null> {
    try {
        const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
        return r.ok ? ((await r.json()) as T) : null;
    } catch {
        return null;
    }
}

async function asteroids(day: string): Promise<Asteroid[] | null> {
    const key = process.env.NASA_API_KEY || "DEMO_KEY";
    type Neo = {
        name: string;
        is_potentially_hazardous_asteroid: boolean;
        estimated_diameter: { meters: { estimated_diameter_min: number; estimated_diameter_max: number } };
        close_approach_data: { close_approach_date_full?: string; relative_velocity: { kilometers_per_second: string }; miss_distance: { lunar: string } }[];
    };
    const d = await getJson<{ near_earth_objects?: Record<string, Neo[]> }>(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${day}&end_date=${day}&api_key=${key}`);
    const list = d?.near_earth_objects?.[day];
    if (!list) return null;
    return list
        .map((o) => {
            const c = o.close_approach_data[0];
            const m = o.estimated_diameter.meters;
            return {
                name: o.name.replace(/^\((.*)\)$/, "$1"),
                d: Math.round((m.estimated_diameter_min + m.estimated_diameter_max) / 2),
                v: Math.round(Number(c?.relative_velocity.kilometers_per_second ?? 0) * 10) / 10,
                ld: Math.round(Number(c?.miss_distance.lunar ?? 0) * 10) / 10,
                hazardous: !!o.is_potentially_hazardous_asteroid,
                at: c?.close_approach_date_full ?? day,
            };
        })
        .sort((a, b) => a.at.localeCompare(b.at));
}

async function kpToday(): Promise<number | null> {
    const d = await getJson<{ time_tag: string; Kp: number }[]>("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");
    if (!Array.isArray(d) || !d.length) return null;
    const since = Date.now() - 24 * 3_600_000;
    const recent = d.filter((r) => Date.parse(`${r.time_tag}Z`) >= since).map((r) => Number(r.Kp)).filter(Number.isFinite);
    return recent.length ? Math.round(Math.max(...recent) * 10) / 10 : null;
}

async function people(): Promise<number | null> {
    const d = await getJson<{ number?: number }>("https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json");
    return typeof d?.number === "number" ? d.number : null;
}

export async function GET(request: Request) {
    const asked = new URL(request.url).searchParams.get("day");
    const today = new Date().toISOString().slice(0, 10);
    const day = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today;
    const hit = cache.get(day);
    if (hit && Date.now() - hit.t < 30 * 60_000) return NextResponse.json(hit.v, { headers: { "Cache-Control": "public, s-maxage=1800" } });

    const redisKey = `space:today:${day}`;
    let stored: Today | null = null;
    if (hasKv()) {
        try {
            const raw = await kv<string | null>(["GET", redisKey]);
            stored = raw ? (JSON.parse(raw) as Today) : null;
        } catch {
            stored = null;
        }
    }
    // the asteroids once a day; the space weather and the crew every three hours
    const stale = !stored || Date.now() - Date.parse(stored.fetched) > 3 * 3_600_000;
    let out = stored;
    if (!stored || stale || stored.asteroids === null) {
        const [a, k, p] = await Promise.all([stored?.asteroids ? Promise.resolve(stored.asteroids) : asteroids(day), kpToday(), people()]);
        out = { day, asteroids: a, kp: k ?? stored?.kp ?? null, people: p ?? stored?.people ?? null, fetched: new Date().toISOString() };
        if (hasKv()) {
            try {
                // (kept two days; a failed fetch is tried again in ten minutes)
                const ttl = a === null || k === null ? 600 : 2 * 86_400;
                await kv(["SET", redisKey, JSON.stringify(a === null || k === null ? { ...out, fetched: new Date(Date.now() - 3 * 3_600_000 + 600_000).toISOString() } : out), "EX", ttl]);
            } catch {
                /* ignore */
            }
        }
    }
    cache.set(day, { t: Date.now(), v: out! });
    return NextResponse.json(out, { headers: { "Cache-Control": "public, s-maxage=1800" } });
}
