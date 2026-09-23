import { NextResponse } from "next/server";
import { Octokit } from "@octokit/core";
import { isFigureId } from "@/constants/constellations";

// How many visitors have charted each of the About section's constellations
// (components/ui/constellation-puzzle.tsx), stored as a third file in the
// guestbook's gist. A PATCH only touches the file it names, so this never
// disturbs guestbook.json or leaderboard.json.
//
// Each visitor counts once per constellation, by salted IP hash, so reloading
// and re-solving does not inflate the number. Like the leaderboard, a
// determined visitor could still fake a solve; it is a friendly count, not a
// record.
//
// Local development keeps the counts in memory rather than writing the real
// gist, so testing never moves the live numbers. CONSTELLATION_USE_GIST=1
// opts back in.

export const dynamic = "force-dynamic";

const GIST_FILE = "constellations.json";
const SEEN_CAP = 5000; // dedupe ledger length

type Stored = { counts: Record<string, number>; seen: string[] };

const useGist = () =>
    !!process.env.GUESTBOOK_GIST_ID && (process.env.NODE_ENV === "production" || process.env.CONSTELLATION_USE_GIST === "1");

// Dev store, per server process
const memory: Stored = { counts: {}, seen: [] };

function clientIp(req: Request): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip")?.trim() ||
        "unknown"
    );
}

async function hashIp(ip: string): Promise<string> {
    const salt = process.env.GUESTBOOK_SALT || "miit-guestbook-v1";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
    return Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

const octokit = () => new Octokit({ auth: process.env.GITHUB_API_TOKEN });

async function read(): Promise<Stored> {
    if (!useGist()) return memory;
    const res = await octokit().request("GET /gists/{gist_id}", {
        gist_id: process.env.GUESTBOOK_GIST_ID!,
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });
    const raw = res.data.files?.[GIST_FILE]?.content;
    if (!raw) return { counts: {}, seen: [] };
    try {
        const parsed = JSON.parse(raw);
        return {
            counts: parsed?.counts && typeof parsed.counts === "object" ? parsed.counts : {},
            seen: Array.isArray(parsed?.seen) ? parsed.seen : [],
        };
    } catch {
        return { counts: {}, seen: [] };
    }
}

async function write(data: Stored): Promise<void> {
    if (!useGist()) {
        memory.counts = data.counts;
        memory.seen = data.seen;
        return;
    }
    await octokit().request("PATCH /gists/{gist_id}", {
        gist_id: process.env.GUESTBOOK_GIST_ID!,
        files: { [GIST_FILE]: { content: JSON.stringify(data, null, 2) } },
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });
}

/** GET ?fig=<id>: how many have charted it. */
export async function GET(request: Request) {
    const fig = new URL(request.url).searchParams.get("fig");
    if (!isFigureId(fig)) return NextResponse.json({ error: "Unknown constellation." }, { status: 400 });
    try {
        const data = await read();
        return NextResponse.json({ count: data.counts[fig] ?? 0 });
    } catch (error) {
        console.error("Constellation read failed:", error);
        return NextResponse.json({ error: "Could not read the sky chart." }, { status: 502 });
    }
}

/** POST {fig}: record a charting. Returns this visitor's place in line. */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Malformed request." }, { status: 400 });
    }
    const fig = (body as { fig?: unknown })?.fig;
    if (!isFigureId(fig)) return NextResponse.json({ error: "Unknown constellation." }, { status: 400 });

    const ipHash = await hashIp(clientIp(request));
    const mark = `${ipHash}:${fig}`;
    try {
        const data = await read();
        // Already counted: report where they came in, without counting again
        if (data.seen.includes(mark)) {
            return NextResponse.json({ count: data.counts[fig] ?? 0, place: null, repeat: true });
        }
        const count = (data.counts[fig] ?? 0) + 1;
        data.counts[fig] = count;
        data.seen = [...data.seen, mark].slice(-SEEN_CAP);
        await write(data);
        return NextResponse.json({ count, place: count, repeat: false });
    } catch (error) {
        console.error("Constellation write failed:", error);
        return NextResponse.json({ error: "Could not update the sky chart." }, { status: 502 });
    }
}
