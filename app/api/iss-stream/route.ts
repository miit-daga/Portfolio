import { NextResponse } from "next/server";

// Which ISS video to play in the contact globe's player (signal-globe.tsx).
//
// Sen's 4K cameras are the default; NASA's own stream is the fallback. YouTube
// IDs change whenever a stream is restarted, so neither is hard-coded: Sen's
// comes from its channel's /live address, NASA's from its "Live Video from the
// International Space Station" playlist, and each is checked to be live now.
// Read from the public pages, no API key; cached for half an hour.

export const dynamic = "force-dynamic";

const SEN_LIVE = "https://www.youtube.com/@Sen/live";
const NASA_PLAYLIST = "https://www.youtube.com/playlist?list=PL2aBZuCeDwlQMf6xMgQAUAY_nbHAgW5jz";
// Last known good, used if a lookup fails
const SEN_FALLBACK = "fO9e9jnhYK8";

type Streams = { sen: string | null; nasa: string | null };
let cache: { at: number; body: Streams } | null = null;

const page = (url: string) =>
    fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" }, cache: "no-store" }).then((r) => (r.ok ? r.text() : ""));

const liveNow = (html: string) => /"isLiveNow":true/.test(html);

async function sen(): Promise<string | null> {
    const html = await page(SEN_LIVE);
    const id = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1];
    return id && liveNow(html) ? id : null;
}

async function nasa(): Promise<string | null> {
    const html = await page(NASA_PLAYLIST);
    const ids = [...new Set([...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m[1]))].slice(0, 4);
    // Prefer the Earth-facing HD views over the interior feed
    const checked = await Promise.all(
        ids.map(async (id) => {
            const w = await page(`https://www.youtube.com/watch?v=${id}`);
            return { id, live: liveNow(w), hd: /High-Definition Views/i.test(w.match(/<title>([^<]*)<\/title>/)?.[1] ?? "") };
        }),
    );
    const live = checked.filter((c) => c.live);
    return (live.find((c) => c.hd) ?? live[0])?.id ?? null;
}

export async function GET() {
    if (cache && Date.now() - cache.at < 30 * 60 * 1000) {
        return NextResponse.json(cache.body, { headers: { "Cache-Control": "public, s-maxage=1800" } });
    }
    const [s, n] = await Promise.all([sen().catch(() => null), nasa().catch(() => null)]);
    const body: Streams = { sen: s, nasa: n };
    // Only a complete answer is worth keeping for half an hour
    if (s || n) cache = { at: Date.now(), body };
    return NextResponse.json(s || n ? body : { sen: SEN_FALLBACK, nasa: null }, {
        headers: { "Cache-Control": s || n ? "public, s-maxage=1800" : "no-store" },
    });
}
