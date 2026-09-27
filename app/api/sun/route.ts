import { NextResponse } from "next/server";
import { VIEWS } from "@/lib/sun-views";

// The Sun, today, for the card in the contact section (components/ui/sun-today.tsx):
// when NASA's Solar Dynamics Observatory last updated its latest pictures (they
// load straight from NASA; this only says how old they are, since SDO's feed
// can fall behind), and the week's solar flares from NOAA's GOES satellites.
// Worked out at most every 10 minutes.

export const dynamic = "force-dynamic";

const SDO = "https://sdo.gsfc.nasa.gov/assets/img/latest/";
const FLARES = "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json";

type Flare = { begin_time: string; max_time: string; max_class: string };
export type SunNow = {
    images: { id: string; url: string; at: number | null }[];
    latestFlare: { cls: string; at: string } | null;
    strongestFlare: { cls: string; at: string } | null;
    flaresThisWeek: number | null;
};

let cached: { at: number; v: SunNow } | null = null;

/** A flare class as a number, for comparing: B1 < C1 < M1 < X1, each ten times the last. */
const strength = (cls: string) => {
    const m = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(cls);
    return m ? 10 ** "ABCMX".indexOf(m[1]) * Number(m[2]) : 0;
};

async function build(): Promise<SunNow> {
    const [images, flares] = await Promise.all([
        Promise.all(
            VIEWS.map(async (v) => {
                const url = `${SDO}latest_512_${v.id}.jpg`;
                try {
                    const r = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(6000) });
                    const lm = r.headers.get("last-modified");
                    return { id: v.id, url, at: lm ? Date.parse(lm) : null };
                } catch {
                    return { id: v.id, url, at: null };
                }
            }),
        ),
        fetch(FLARES, { cache: "no-store", signal: AbortSignal.timeout(6000) })
            .then((r) => (r.ok ? (r.json() as Promise<Flare[]>) : null))
            .catch(() => null),
    ]);
    // (C-class and up: the ones worth a mention)
    const notable = (flares ?? []).filter((f) => f.max_class && strength(f.max_class) >= 100);
    const latest = [...notable].sort((a, b) => b.max_time.localeCompare(a.max_time))[0];
    const strongest = [...notable].sort((a, b) => strength(b.max_class) - strength(a.max_class))[0];
    return {
        images,
        latestFlare: latest ? { cls: latest.max_class, at: latest.max_time } : null,
        strongestFlare: strongest ? { cls: strongest.max_class, at: strongest.max_time } : null,
        flaresThisWeek: flares ? notable.length : null,
    };
}

export async function GET() {
    if (!cached || Date.now() - cached.at > 10 * 60_000) cached = { at: Date.now(), v: await build() };
    return NextResponse.json(cached.v, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
}
