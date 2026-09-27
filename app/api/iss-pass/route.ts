import { NextResponse } from "next/server";
import { hasKv, kv } from "@/lib/store";
import { visiblePasses, type Pass } from "@/lib/iss-pass";

// When the ISS will next be visible where the visitor is (lib/iss-pass.ts),
// for the card beside the Deep Space Network's (components/ui/iss-pass.tsx).
// Where they are comes from the headers Vercel adds after placing the
// visitor (as the contact globe's location does), or ?lat=&lon=&city= (for
// trying it locally, where there are no such headers). Nothing about the
// visitor is kept. The ISS's orbit (a TLE, from CelesTrak) is fetched at most
// every 12 hours and kept in Redis, so CelesTrak is asked rarely.

export const dynamic = "force-dynamic";

const TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
const TLE_KEY = "iss:tle";
const TLE_MAX_AGE = 12 * 3600_000;
let tleCache: { at: number; tle: [string, string] } | null = null;

async function orbit(): Promise<[string, string] | null> {
    if (tleCache && Date.now() - tleCache.at < TLE_MAX_AGE) return tleCache.tle;
    if (hasKv()) {
        try {
            const kept = await kv<string | null>(["GET", TLE_KEY]);
            if (kept) {
                const k = JSON.parse(kept) as { at: number; tle: [string, string] };
                if (Date.now() - k.at < TLE_MAX_AGE) return (tleCache = k).tle;
            }
        } catch {
            /* fetch it instead */
        }
    }
    try {
        const r = await fetch(TLE_URL, { cache: "no-store", signal: AbortSignal.timeout(6000) });
        const lines = (await r.text())
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => /^[12] 25544/.test(l));
        if (!r.ok || lines.length < 2) throw new Error("no TLE");
        tleCache = { at: Date.now(), tle: [lines[0], lines[1]] };
        if (hasKv()) kv(["SET", TLE_KEY, JSON.stringify(tleCache), "EX", 7 * 86400]).catch(() => {});
        return tleCache.tle;
    } catch {
        // CelesTrak slow or down: an older orbit is still good for days
        return tleCache?.tle ?? null;
    }
}

const num = (s: string | null) => {
    const n = parseFloat(s ?? "");
    return Number.isFinite(n) ? n : null;
};
function decoded(s: string | null) {
    if (!s) return null;
    try {
        return decodeURIComponent(s).slice(0, 60);
    } catch {
        return s.slice(0, 60);
    }
}

export type IssPassReply = { city: string | null; passes: Pass[]; located: boolean };

export async function GET(req: Request) {
    const q = new URL(req.url).searchParams;
    const lat = num(req.headers.get("x-vercel-ip-latitude")) ?? num(q.get("lat"));
    const lon = num(req.headers.get("x-vercel-ip-longitude")) ?? num(q.get("lon"));
    const city = decoded(req.headers.get("x-vercel-ip-city")) ?? decoded(q.get("city"));
    const headers = { "Cache-Control": "private, max-age=600" };
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return NextResponse.json({ city: null, passes: [], located: false } satisfies IssPassReply, { headers });
    }
    const tle = await orbit();
    if (!tle) return NextResponse.json({ error: "No orbit data just now." }, { status: 503 });
    return NextResponse.json({ city, passes: visiblePasses(tle, lat, lon), located: true } satisfies IssPassReply, { headers });
}
