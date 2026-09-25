import { NextResponse } from "next/server";
import { hasKv, kvPipeline } from "@/lib/store";

// Who else is aboard right now, and where on the page (lib/presence.ts): each
// open tab checks in every 20 seconds with a random id of its own and the
// section it's reading, and gets back everyone else seen in the last 45. All
// that's kept is that and the city Vercel places the visitor in (as the
// contact globe uses): no IP, nothing that outlives the visit.
//
// One Redis hash of tab to {section, city, country, time}; a check-in is two
// or three commands. Off the live site (local development) it's kept in
// memory instead, so a test tab never shows up for real visitors.

export const dynamic = "force-dynamic";

const KEY = "presence:v1";
const LIVE_MS = 45_000;
const SECTIONS = new Set(["hero", "about-me", "workex", "education", "skills-achievements", "projects", "publications", "contact"]);
const MEMORY = process.env.NODE_ENV !== "production" || !hasKv();
const mem = new Map<string, string>();

type Entry = { s: string; c: string | null; k: string | null; t: number };
export type Explorer = { section: string; city: string | null; country: string | null };

function header(req: Request, name: string) {
    const raw = req.headers.get(name);
    if (!raw) return null;
    try {
        return decodeURIComponent(raw).slice(0, 60);
    } catch {
        return raw.slice(0, 60);
    }
}

export async function POST(req: Request) {
    const body = (await req.json().catch(() => null)) as { id?: unknown; section?: unknown; leave?: unknown } | null;
    const id = typeof body?.id === "string" && /^[a-z0-9]{8,24}$/.test(body.id) ? body.id : null;
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
    const now = Date.now();

    // leaving: gone at once, not 45 seconds later
    if (body?.leave) {
        if (MEMORY) mem.delete(id);
        else await kvPipeline([["HDEL", KEY, id]]).catch(() => {});
        return NextResponse.json({ ok: true });
    }

    const section = typeof body?.section === "string" && SECTIONS.has(body.section) ? body.section : "hero";
    const me: Entry = { s: section, c: header(req, "x-vercel-ip-city"), k: header(req, "x-vercel-ip-country"), t: now };
    let all: Record<string, string>;
    try {
        if (MEMORY) {
            mem.set(id, JSON.stringify(me));
            all = Object.fromEntries(mem);
        } else {
            const [, flat] = await kvPipeline<unknown>([
                ["HSET", KEY, id, JSON.stringify(me)],
                ["HGETALL", KEY],
                ["EXPIRE", KEY, 3600],
            ]);
            all = {};
            if (Array.isArray(flat)) for (let i = 0; i + 1 < flat.length; i += 2) all[String(flat[i])] = String(flat[i + 1]);
            else if (flat && typeof flat === "object") all = flat as Record<string, string>;
        }
    } catch {
        return NextResponse.json({ explorers: [] });
    }

    const explorers: Explorer[] = [];
    const stale: string[] = [];
    for (const [k, v] of Object.entries(all)) {
        let e: Entry;
        try {
            e = JSON.parse(v) as Entry;
        } catch {
            stale.push(k);
            continue;
        }
        if (now - e.t > LIVE_MS * 3) stale.push(k);
        if (k === id || now - e.t > LIVE_MS) continue;
        explorers.push({ section: e.s, city: e.c, country: e.k });
    }
    // tidy away tabs long gone (closed without saying so)
    if (stale.length) {
        if (MEMORY) stale.forEach((k) => mem.delete(k));
        else kvPipeline([["HDEL", KEY, ...stale]]).catch(() => {});
    }
    return NextResponse.json({ explorers: explorers.slice(0, 40) }, { headers: { "Cache-Control": "no-store" } });
}
