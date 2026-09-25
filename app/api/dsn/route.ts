import { NextResponse } from "next/server";

// NASA's Deep Space Network, right now: which of its dishes (at Goldstone,
// Madrid and Canberra) is talking to which spacecraft, how far away it is,
// and how long its signal takes, for the live panel on the contact section
// (components/ui/dsn-live.tsx). From DSN Now (eyes.nasa.gov/dsn), which NASA
// updates every few seconds: the feed for the links, its config for the
// spacecraft's full names. Fetched on the server at most every 30 seconds
// (the names once a day), so visitors never wait on NASA.

export const dynamic = "force-dynamic";

const FEED = "https://eyes.nasa.gov/dsn/data/dsn.xml";
const CONFIG = "https://eyes.nasa.gov/dsn/config.xml";
const C_KM_S = 299_792.458;

export type DsnLink = {
    station: string;
    place: string;
    dish: string;
    /** the dish's diameter, metres */
    size: number;
    spacecraft: string;
    code: string;
    /** km, when the feed has it */
    km: number | null;
    /** one-way light time, seconds, when known */
    light: number | null;
    /** receiving from it (and at what rate, bits a second), sending to it */
    down: number | null;
    up: boolean;
};
export type Dsn = { at: number; links: DsnLink[] };

const PLACES: Record<string, string> = { Goldstone: "California", Madrid: "Spain", Canberra: "Australia" };
// the three 70 m dishes; the rest are 34 m
const BIG = new Set(["DSS14", "DSS43", "DSS63"]);

let names: { at: number; map: Map<string, string> } | null = null;
let cached: { at: number; v: Dsn } | null = null;

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";

async function friendlyNames() {
    if (names && Date.now() - names.at < 86_400_000) return names.map;
    const map = new Map<string, string>();
    try {
        const r = await fetch(CONFIG, { cache: "no-store", signal: AbortSignal.timeout(6000) });
        const xml = await r.text();
        for (const m of xml.matchAll(/<spacecraft\s[^>]*>/g)) {
            const code = attr(m[0], "name").toLowerCase();
            const friendly = attr(m[0], "friendlyName");
            if (code && friendly) map.set(code, friendly);
        }
        if (map.size) names = { at: Date.now(), map };
    } catch {
        /* the codes will do */
    }
    return names?.map ?? map;
}

function parse(xml: string, map: Map<string, string>): Dsn {
    const links: DsnLink[] = [];
    let station = "";
    let at = 0;
    // stations and dishes come in order: each dish belongs to the station before it
    for (const block of xml.matchAll(/<station\s[^>]*\/>|<dish\s[^>]*>[\s\S]*?<\/dish>/g)) {
        const b = block[0];
        if (b.startsWith("<station")) {
            station = attr(b, "friendlyName");
            at = Math.max(at, Number(attr(b, "timeUTC")) || 0);
            continue;
        }
        const dish = attr(b.match(/<dish\s[^>]*>/)![0], "name");
        const downs = [...b.matchAll(/<downSignal\s[^>]*\/>/g)].map((m) => m[0]).filter((s) => attr(s, "active") === "true");
        const ups = [...b.matchAll(/<upSignal\s[^>]*\/>/g)].map((m) => m[0]).filter((s) => attr(s, "active") === "true");
        for (const t of b.matchAll(/<target\s[^>]*\/>/g)) {
            const code = attr(t[0], "name");
            if (!code || code === "DSN" || attr(t[0], "id") === "99") continue;
            const down = downs.find((s) => attr(s, "spacecraft").toLowerCase() === code.toLowerCase());
            const up = ups.some((s) => attr(s, "spacecraft").toLowerCase() === code.toLowerCase());
            // (only the links actually carrying a signal)
            if (!down && !up) continue;
            const range = Number(attr(t[0], "downlegRange")) || Number(attr(t[0], "uplegRange"));
            const rtlt = Number(attr(t[0], "rtlt"));
            const km = range > 0 ? range : null;
            links.push({
                station,
                place: PLACES[station] ?? "",
                dish,
                size: BIG.has(dish) ? 70 : 34,
                spacecraft: map.get(code.toLowerCase()) ?? code,
                code,
                km,
                light: rtlt > 0 ? rtlt / 2 : km ? km / C_KM_S : null,
                down: down ? Number(attr(down, "dataRate")) || 0 : null,
                up,
            });
        }
    }
    // one row per spacecraft (arrays use several dishes): the one that knows its distance, or the biggest dish
    const best = new Map<string, DsnLink>();
    for (const l of links) {
        const k = l.code.toLowerCase();
        const was = best.get(k);
        if (!was || (l.km && !was.km) || (!!l.km === !!was.km && l.size > was.size)) best.set(k, l);
    }
    // farthest first, those without a distance after
    const out = [...best.values()].sort((a, b) => (b.km ?? -1) - (a.km ?? -1));
    return { at: at || Date.now(), links: out };
}

export async function GET() {
    if (cached && Date.now() - cached.at < 30_000) return NextResponse.json(cached.v, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
    try {
        const [r, map] = await Promise.all([fetch(`${FEED}?r=${Math.floor(Date.now() / 30_000)}`, { cache: "no-store", signal: AbortSignal.timeout(6000) }), friendlyNames()]);
        if (!r.ok) throw new Error(`DSN ${r.status}`);
        const v = parse(await r.text(), map);
        cached = { at: Date.now(), v };
        return NextResponse.json(v, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
    } catch {
        // NASA slow or down: the last picture, if there is one
        if (cached) return NextResponse.json(cached.v, { headers: { "Cache-Control": "public, s-maxage=15" } });
        return NextResponse.json({ at: Date.now(), links: [] } satisfies Dsn, { status: 503 });
    }
}
