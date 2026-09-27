import { NextResponse } from "next/server";
import { hasKv, kvPipeline } from "@/lib/store";
import { routeStates, type RouteState } from "@/lib/mission-control/chain";

// The site's own machinery, for the status page (app/status): each of
// Mission Control's models (up, resting and why, or out for today, from the
// counters the chain already keeps: no model is asked anything, so no quota
// is spent), Redis, and the outside services the live cards lean on. Every
// few minutes a check is also kept (status:history, a day's worth), so the
// page can draw the last 24 hours. Worked out at most every 20 seconds.

export const dynamic = "force-dynamic";

type Check = { ok: boolean; ms: number | null; note: string };
export type Status = {
    at: number;
    models: RouteState[];
    redis: Check & { keys: number | null };
    feeds: { id: string; name: string; what: string; check: Check }[];
    aboard: number | null;
    crashesToday: number | null;
    history: { t: number; redis: number | null; dsn: number | null; iss: number | null; github: number | null }[];
};

const HISTORY_KEY = "status:history";
const HISTORY_EVERY = 5 * 60_000;
let cached: { at: number; v: Status } | null = null;

/** How long a request takes, and whether it worked. */
async function timed(url: string, init: RequestInit = {}, ok: (r: Response) => Promise<string> | string = () => "ok"): Promise<Check> {
    const t0 = performance.now();
    try {
        const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000), ...init });
        const ms = Math.round(performance.now() - t0);
        if (!r.ok) return { ok: false, ms, note: `HTTP ${r.status}` };
        return { ok: true, ms, note: await ok(r) };
    } catch (e) {
        return { ok: false, ms: null, note: (e as Error)?.name === "TimeoutError" ? "timed out" : "unreachable" };
    }
}

const hoursAgo = (t: number) => {
    const h = (Date.now() - t) / 3_600_000;
    return h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : `${Math.round(h)} h ago`;
};

async function build(): Promise<Status> {
    const day = new Date().toISOString().slice(0, 10);
    const redisCheck = async () => {
        if (!hasKv()) return { ok: false, ms: null, note: "not configured", keys: null };
        const t0 = performance.now();
        try {
            const [pong, keys] = await kvPipeline<string | number>([["PING"], ["DBSIZE"]]);
            return { ok: pong === "PONG", ms: Math.round(performance.now() - t0), note: "PONG", keys: Number(keys) };
        } catch {
            return { ok: false, ms: null, note: "unreachable", keys: null };
        }
    };
    const token = process.env.GITHUB_API_TOKEN;
    const [models, redis, dsn, iss, github, kept] = await Promise.all([
        routeStates(),
        redisCheck(),
        timed("https://eyes.nasa.gov/dsn/data/dsn.xml", {}, async (r) => `${(await r.text()).match(/<dish /g)?.length ?? 0} dishes reporting`),
        timed("https://api.wheretheiss.at/v1/satellites/25544", {}, async (r) => {
            const d = (await r.json()) as { latitude?: number; longitude?: number };
            return `over ${Number(d.latitude).toFixed(1)}°, ${Number(d.longitude).toFixed(1)}°`;
        }),
        timed("https://api.github.com/rate_limit", { headers: token ? { Authorization: `Bearer ${token}` } : {} }, async (r) => {
            const d = (await r.json()) as { resources?: { core?: { remaining?: number; limit?: number } } };
            return `${d.resources?.core?.remaining ?? "?"} of ${d.resources?.core?.limit ?? "?"} calls left this hour`;
        }),
        hasKv()
            ? kvPipeline<unknown>([["GET", "iss:tle"], ["GET", `space:today:${day}`], ["HGETALL", "presence:v1"], ["HGETALL", `errors:${day}`], ["LRANGE", HISTORY_KEY, 0, 0]]).catch(() => null)
            : Promise.resolve(null),
    ]);

    // what's kept: the ISS's orbit, today's space data, who's aboard, today's crash reports
    const [tleRaw, todayRaw, presenceRaw, errorsRaw, lastRaw] = (kept ?? []) as [string | null, string | null, string[] | Record<string, string> | null, string[] | null, string[] | null];
    // (not fetched yet isn't a fault: both are fetched when a visitor first needs them)
    let orbit: Check = { ok: true, ms: null, note: "not fetched yet, fetched when first needed" };
    try {
        const t = JSON.parse(tleRaw ?? "null") as { at: number; tle: [string, string] } | null;
        if (t) {
            // the TLE's own epoch: year and day of the year, from its first line
            const yy = Number(t.tle[0].slice(18, 20));
            const doy = Number(t.tle[0].slice(20, 32));
            const epoch = Date.UTC(2000 + yy, 0, 1) + (doy - 1) * 86_400_000;
            orbit = { ok: Date.now() - epoch < 5 * 86_400_000, ms: null, note: `measured ${hoursAgo(epoch)}, fetched ${hoursAgo(t.at)}` };
        }
    } catch {
        /* not fetched yet */
    }
    let today: Check = { ok: true, ms: null, note: "not fetched yet today, fetched when first needed" };
    try {
        const d = JSON.parse(todayRaw ?? "null") as { asteroids: unknown[] | null; kp: number | null; people: number | null; fetched: string } | null;
        if (d) today = { ok: !!d.asteroids && d.kp !== null, ms: null, note: `${d.asteroids?.length ?? "?"} asteroids, Kp ${d.kp ?? "?"}, ${d.people ?? "?"} people in space · fetched ${hoursAgo(Date.parse(d.fetched))}` };
    } catch {
        /* not fetched yet */
    }
    const flat = (x: string[] | Record<string, string> | null) => (Array.isArray(x) ? x.filter((_, i) => i % 2 === 1) : x ? Object.values(x) : []);
    const aboard = kept ? flat(presenceRaw).filter((v) => {
        try {
            return Date.now() - (JSON.parse(v) as { t: number }).t < 45_000;
        } catch {
            return false;
        }
    }).length : null;
    const crashesToday = kept ? flat(errorsRaw).reduce((n, v) => n + Number(v), 0) : null;

    // a check for the history, every few minutes
    const sample = { t: Date.now(), redis: redis.ms, dsn: dsn.ms, iss: iss.ms, github: github.ms };
    let history: Status["history"] = [];
    if (hasKv()) {
        try {
            const last = JSON.parse(lastRaw?.[0] ?? "null") as { t: number } | null;
            const cmds: (string | number)[][] = [];
            // (kept only from the live site: local development shares its Redis, and its timings aren't the site's)
            if (process.env.NODE_ENV === "production" && (!last || sample.t - last.t >= HISTORY_EVERY)) cmds.push(["LPUSH", HISTORY_KEY, JSON.stringify(sample)], ["LTRIM", HISTORY_KEY, 0, 287]);
            cmds.push(["LRANGE", HISTORY_KEY, 0, 287]);
            const res = await kvPipeline<unknown>(cmds);
            history = ((res[res.length - 1] as string[]) ?? []).map((s) => JSON.parse(s)).filter((h) => sample.t - h.t < 86_400_000).reverse();
        } catch {
            /* no history this time */
        }
    }

    return {
        at: Date.now(),
        models,
        redis,
        feeds: [
            { id: "dsn", name: "NASA Deep Space Network", what: "the live DSN card", check: dsn },
            { id: "iss", name: "ISS position", what: "Stack the Station's live Earth", check: iss },
            { id: "orbit", name: "ISS orbit (CelesTrak)", what: "the ISS pass card", check: orbit },
            { id: "today", name: "Today in space (NASA, NOAA)", what: "the arcade's daily games", check: today },
            { id: "github", name: "GitHub API", what: "the Projects section", check: github },
        ],
        aboard,
        crashesToday,
        history,
    };
}

export async function GET() {
    if (!cached || Date.now() - cached.at > 20_000) cached = { at: Date.now(), v: await build() };
    return NextResponse.json(cached.v, { headers: { "Cache-Control": "no-store" } });
}
