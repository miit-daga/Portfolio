import { NextResponse } from "next/server";
import { hasKv, kvPipeline } from "@/lib/store";

// Crash reports from the site (lib/report-error.ts, and terminal.html's own), so problems show on
// /stats before anyone has to send a screenshot. Kept: which game, what went
// wrong (the error's message, cut short), and the browser and system, read
// from the user agent here. Not kept: IPs, ids, or the user agent itself.
// Counted per day per distinct problem (errors:YYYY-MM-DD, a hash, 30 days),
// with the 50 latest listed (errors:latest).
//
// POST { game, kind, message } reports; GET, with the admin key in an
// x-admin-key header, reads (for /stats).

export const dynamic = "force-dynamic";

const KEEP_DAYS = 30;
// where it happened: an arcade game, the arcade page, or another page of the site
const GAMES = new Set(["assist", "run", "stack", "flight", "arcade", "home", "desk", "resume", "stats", "page", "terminal"]);
const KINDS = new Set(["crash", "no-webgl", "load-failed", "error", "rejection", "stuck-loading"]);
const MEMORY = process.env.NODE_ENV !== "production" && process.env.LEADERBOARD_MEMORY === "1";
const memory = { days: {} as Record<string, Record<string, number>>, latest: [] as string[] };

/** "Chrome 140 · macOS", from a user agent. */
function browserOf(ua: string) {
    const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "other";
    const m =
        /Edg\/(\d+)/.exec(ua) ? ["Edge", /Edg\/(\d+)/.exec(ua)![1]] :
        /OPR\/(\d+)/.exec(ua) ? ["Opera", /OPR\/(\d+)/.exec(ua)![1]] :
        /Firefox\/(\d+)/.exec(ua) ? ["Firefox", /Firefox\/(\d+)/.exec(ua)![1]] :
        /CriOS\/(\d+)/.exec(ua) ? ["Chrome", /CriOS\/(\d+)/.exec(ua)![1]] :
        /Chrome\/(\d+)/.exec(ua) ? ["Chrome", /Chrome\/(\d+)/.exec(ua)![1]] :
        /Version\/(\d+).*Safari/.exec(ua) ? ["Safari", /Version\/(\d+)/.exec(ua)![1]] : ["other", ""];
    return `${m[0]}${m[1] ? " " + m[1] : ""} · ${os}`;
}
const clean = (s: unknown, n: number) =>
    String(s ?? "")
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, n);

// A light brake per visitor, in this instance's memory
const recent = new Map<string, number[]>();
function tooMany(req: Request) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const now = Date.now();
    const times = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
    times.push(now);
    recent.set(ip, times);
    if (recent.size > 5000) recent.clear();
    return times.length > 30;
}

function keyMatches(a: string, b: string) {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
}

export async function POST(request: Request) {
    if (!MEMORY && !hasKv()) return NextResponse.json({ ok: false }, { status: 503 });
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    const game = String(body.game);
    const kind = String(body.kind);
    if (!GAMES.has(game) || !KINDS.has(kind)) return NextResponse.json({ ok: false }, { status: 400 });
    if (tooMany(request)) return NextResponse.json({ ok: false }, { status: 429 });
    const message = clean(body.message, 160) || "(no message)";
    const browser = browserOf(request.headers.get("user-agent") ?? "");
    const at = new Date().toISOString();
    const problem = `${game}|${kind}|${message}|${browser}`;
    const day = `errors:${at.slice(0, 10)}`;
    const entry = JSON.stringify({ at, game, kind, message, browser });
    if (MEMORY) {
        const d = (memory.days[at.slice(0, 10)] ??= {});
        d[problem] = (d[problem] ?? 0) + 1;
        memory.latest = [entry, ...memory.latest].slice(0, 50);
        return NextResponse.json({ ok: true });
    }
    try {
        await kvPipeline([
            ["HINCRBY", day, problem, 1],
            ["EXPIRE", day, KEEP_DAYS * 86_400],
            ["LPUSH", "errors:latest", entry],
            ["LTRIM", "errors:latest", 0, 49],
        ]);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error report failed:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}

export async function GET(request: Request) {
    const adminKey = process.env.GUESTBOOK_ADMIN_KEY;
    if (!adminKey || !keyMatches(request.headers.get("x-admin-key") ?? "", adminKey)) {
        await new Promise((r) => setTimeout(r, 600));
        return NextResponse.json({ error: "Rejected." }, { status: 401 });
    }
    const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
    if (MEMORY) return NextResponse.json({ days: memory.days, latest: memory.latest.map((e) => JSON.parse(e)) }, { headers: { "Cache-Control": "no-store" } });
    if (!hasKv()) return NextResponse.json({ error: "No Redis configured." }, { status: 503 });
    try {
        const res = await kvPipeline<unknown>([...days.map((d) => ["HGETALL", `errors:${d}`]), ["LRANGE", "errors:latest", 0, 49]]);
        const out: Record<string, Record<string, number>> = {};
        days.forEach((d, i) => {
            const flat = (res[i] as string[]) ?? [];
            if (!flat.length) return;
            const c: Record<string, number> = {};
            for (let k = 0; k < flat.length; k += 2) c[flat[k]] = Number(flat[k + 1]);
            out[d] = c;
        });
        const latest = ((res[days.length] as string[]) ?? []).map((e) => {
            try {
                return JSON.parse(e);
            } catch {
                return null;
            }
        }).filter(Boolean);
        return NextResponse.json({ days: out, latest }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Error read failed:", error);
        return NextResponse.json({ error: "Could not read the reports." }, { status: 502 });
    }
}
