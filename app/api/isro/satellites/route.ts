import { NextResponse, after } from "next/server";
import { hasKv, kv } from "@/lib/store";
import { NORADS } from "@/lib/isro/satellites";

// The current orbits of India's active satellites (lib/isro/satellites.ts),
// for the ISRO page's live globe, which works out where each is from them.
// From CelesTrak's active set (its JSON orbit format, which satellite.js
// reads). CelesTrak refuses the same download twice within about two hours,
// so it's fetched at most once a day and kept in Redis for a week: when the
// copy is a day old it's refreshed after answering, and a refused or failed
// refresh leaves the old one serving.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json";
const KEY = "isro:gp";
const FRESH_MS = 24 * 3600_000;
const KEEP_S = 7 * 86400;

export type Omm = Record<string, string | number> & { NORAD_CAT_ID: number };
type Kept = { at: number; sats: Omm[] };
let memory: Kept | null = null;
let refreshing = false;

async function fetchOrbits(): Promise<Kept | null> {
    try {
        const r = await fetch(SOURCE, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
        if (!r.ok) return null;
        const all = (await r.json()) as Omm[];
        const sats = all.filter((o) => NORADS.has(Number(o.NORAD_CAT_ID)));
        if (sats.length < NORADS.size / 2) return null;
        return { at: Date.now(), sats };
    } catch {
        return null;
    }
}

async function keep(k: Kept) {
    memory = k;
    if (hasKv()) await kv(["SET", KEY, JSON.stringify(k), "EX", KEEP_S]).catch(() => {});
}

async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
        const k = await fetchOrbits();
        if (k) await keep(k);
    } finally {
        refreshing = false;
    }
}

export async function GET() {
    let k = memory;
    if (!k && hasKv()) {
        try {
            const raw = await kv<string | null>(["GET", KEY]);
            if (raw) k = memory = JSON.parse(raw) as Kept;
        } catch {
            /* fetch instead */
        }
    }
    if (!k) {
        // nothing kept yet: this one visitor waits for the download
        await refresh();
        k = memory;
        if (!k) return NextResponse.json({ error: "No orbit data just now." }, { status: 503 });
    } else if (Date.now() - k.at > FRESH_MS) {
        after(refresh);
    }
    return NextResponse.json({ at: k.at, sats: k.sats }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
