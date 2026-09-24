import { NextResponse } from "next/server";
import { Octokit } from "@octokit/core";

// A tally of the arcade's analytics events, kept by the site itself, for
// hosting plans where Vercel doesn't keep custom events. lib/track.ts sends
// each event here as well as to Vercel. Counts only, by day: no ids, no IPs
// kept. Stored as tally.json in the guestbook's gist (a PATCH only touches
// the files it names). Read-modify-write, so two events landing together can
// lose one count; fine for a tally.
//
// Saving is held back: GitHub allows only so many edits to a gist in a
// while, and editing on every event once used them all up (which stopped the
// leaderboard saving too). So counts gather in this instance's memory and
// are saved at most every few minutes (a count can be lost if the instance
// is recycled first; fine for a tally), and browsers send a visit's events
// together, once, as they leave.
//
// POST { events: [{ event, props }] } (or one { event, props }) counts; GET, with the admin key (the same one as
// the guestbook's, GUESTBOOK_ADMIN_KEY) in an x-admin-key header, reads it.
// The page for reading it is /stats.

export const dynamic = "force-dynamic";

const FILE = "tally.json";
const KEEP_DAYS = 90;

// What may be counted: each event, and which of its props split the count
// (anything else is ignored, so the file can't be filled with junk)
const EVENTS: Record<string, { split?: string[]; values?: string[] }> = {
    arcade_link: { split: ["from"] },
    arcade_game_open: { split: ["game"] },
    asteroid_run_over: {},
    stack_station_over: {},
    gravity_assist_arrived: { split: ["mission"] },
    gravity_assist_daily: {},
};
const VALUE = /^[a-z0-9-]{1,24}$/i;

type Tally = { days: Record<string, Record<string, number>> };

const MEMORY = process.env.NODE_ENV !== "production" && process.env.LEADERBOARD_MEMORY === "1";
let memory: Tally = { days: {} };

const gistId = () => process.env.LEADERBOARD_GIST_ID || process.env.GUESTBOOK_GIST_ID;
const octokit = () => new Octokit({ auth: process.env.GITHUB_API_TOKEN });

async function read(): Promise<Tally> {
    if (MEMORY) return structuredClone(memory);
    const res = await octokit().request("GET /gists/{gist_id}", { gist_id: gistId()!, headers: { "X-GitHub-Api-Version": "2022-11-28" } });
    try {
        const parsed = JSON.parse(res.data.files?.[FILE]?.content || "{}");
        return { days: parsed?.days && typeof parsed.days === "object" ? parsed.days : {} };
    } catch {
        return { days: {} };
    }
}
async function write(t: Tally) {
    if (MEMORY) {
        memory = structuredClone(t);
        return;
    }
    await octokit().request("PATCH /gists/{gist_id}", {
        gist_id: gistId()!,
        files: { [FILE]: { content: JSON.stringify(t) } },
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });
}

// A light brake per visitor, in this instance's memory: enough against a loop
const recent = new Map<string, number[]>();
function tooMany(req: Request) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const now = Date.now();
    const times = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
    times.push(now);
    recent.set(ip, times);
    if (recent.size > 5000) recent.clear();
    return times.length > 120;
}

function keyMatches(supplied: string, expected: string) {
    if (supplied.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < supplied.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
}

// Counts waiting to be saved, by day, and when this instance last saved
const pending: Record<string, Record<string, number>> = {};
let lastSave = 0;
const SAVE_EVERY_MS = MEMORY ? 0 : 5 * 60_000;

async function save() {
    if (!Object.keys(pending).length) return;
    const t = await read();
    for (const [day, counts] of Object.entries(pending)) {
        const into = (t.days[day] ??= {});
        for (const [k, n] of Object.entries(counts)) into[k] = (into[k] ?? 0) + n;
    }
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
    for (const d of Object.keys(t.days)) if (d < cutoff) delete t.days[d];
    await write(t);
    for (const d of Object.keys(pending)) delete pending[d];
}

export async function POST(request: Request) {
    if (!MEMORY && !gistId()) return NextResponse.json({ ok: false }, { status: 503 });
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (tooMany(request)) return NextResponse.json({ ok: false }, { status: 429 });
    const b = (body ?? {}) as { event?: unknown; props?: Record<string, unknown>; events?: unknown };
    const list = (Array.isArray(b.events) ? b.events : [b]).slice(0, 200) as { event?: unknown; props?: Record<string, unknown> }[];
    const day = new Date().toISOString().slice(0, 10);
    const today = (pending[day] ??= {});
    let counted = 0;
    for (const { event, props } of list) {
        const spec = typeof event === "string" ? EVENTS[event] : undefined;
        if (!spec) continue;
        counted++;
        today[event as string] = (today[event as string] ?? 0) + 1;
        for (const s of spec.split ?? []) {
            const v = String(props?.[s] ?? "");
            if (VALUE.test(v)) today[`${event}:${s}=${v}`] = (today[`${event}:${s}=${v}`] ?? 0) + 1;
        }
    }
    if (!counted) return NextResponse.json({ ok: false }, { status: 400 });
    if (Date.now() - lastSave < SAVE_EVERY_MS) return NextResponse.json({ ok: true, held: true });
    lastSave = Date.now();
    try {
        await save();
        return NextResponse.json({ ok: true });
    } catch (error) {
        // (kept for the next try)
        console.error("Tally save failed:", error);
        return NextResponse.json({ ok: true, held: true });
    }
}

export async function GET(request: Request) {
    const adminKey = process.env.GUESTBOOK_ADMIN_KEY;
    const supplied = request.headers.get("x-admin-key") ?? "";
    if (!adminKey || !keyMatches(supplied, adminKey)) {
        await new Promise((r) => setTimeout(r, 600));
        return NextResponse.json({ error: "Rejected." }, { status: 401 });
    }
    if (!MEMORY && !gistId()) return NextResponse.json({ error: "No gist configured." }, { status: 503 });
    try {
        return NextResponse.json(await read(), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Tally read failed:", error);
        return NextResponse.json({ error: "Could not read the tally." }, { status: 502 });
    }
}
