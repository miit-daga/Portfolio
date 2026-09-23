import { NextResponse } from "next/server";

// The newest image from INSAT-3DS, ISRO's weather satellite over the Indian
// Ocean, for the contact globe's Kolkata close-up (signal-globe.tsx).
//
// MOSDAC (ISRO's satellite data centre) lists its gallery through a small
// endpoint that does not allow calls from other sites, so the browser asks
// here and this asks MOSDAC. The image itself loads straight from MOSDAC.
// A new one lands every 30 minutes; the answer is cached for 10.

export const dynamic = "force-dynamic";

const LIST = "https://mosdac.gov.in/gallery/getImage.php";
const LOOK = "https://mosdac.gov.in/look/";
// Full disk colour composite: two visible channels and thermal infrared
const PRODUCT = "3SIMG_*_L1B_STD_RGB_V*.jpg";

let cache: { at: number; body: { url: string; time: string } } | null = null;

async function newest(day: Date): Promise<string | null> {
    const res = await fetch(LIST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prod: PRODUCT, st_date: day.toISOString().slice(0, 10), count: 1 }),
        cache: "no-store",
    });
    if (!res.ok) return null;
    const [files] = (await res.json()) as [string, string];
    if (!files || files === "na" || files.startsWith("<")) return null;
    return files.split(",").pop() ?? null;
}

export async function GET() {
    if (cache && Date.now() - cache.at < 10 * 60 * 1000) {
        return NextResponse.json(cache.body, { headers: { "Cache-Control": "public, s-maxage=600" } });
    }
    try {
        // Just after midnight UTC the day's first image may not be out yet
        const file = (await newest(new Date())) ?? (await newest(new Date(Date.now() - 86400000)));
        if (!file) return NextResponse.json({ error: "No image yet." }, { status: 404 });
        // 3SIMG_23SEP2026_0900_... : the scan's start, in UTC
        const m = file.match(/3SIMG_(\d{2})([A-Z]{3})(\d{4})_(\d{2})(\d{2})/);
        const months = "JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC";
        const time = m
            ? new Date(Date.UTC(+m[3], months.indexOf(m[2]) / 3, +m[1], +m[4], +m[5])).toISOString()
            : new Date().toISOString();
        const body = { url: LOOK + file, time };
        cache = { at: Date.now(), body };
        return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=600" } });
    } catch (error) {
        console.error("INSAT lookup failed:", error);
        return NextResponse.json({ error: "Could not reach MOSDAC." }, { status: 502 });
    }
}
