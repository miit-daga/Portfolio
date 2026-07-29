import { NextResponse } from "next/server";
import { Octokit } from "@octokit/core";
import { GAMES, GAME_KEYS, isGameKey, type GameKey } from "@/constants/games";

// Arcade leaderboards, stored as a second file inside the guestbook's gist.
// A PATCH only touches the files it names, so leaderboard writes never disturb
// guestbook.json.
//
// Honest about what this is: scores originate on the client, so they cannot be
// verified. The ceilings in constants/games.ts and the rate limit below only
// stop the board becoming immediately worthless. Anyone determined enough to
// read this file can still post a plausible lie, and that is fine.
//
// Reads and writes are read-modify-write on the whole file, so two submissions
// landing within the same few hundred milliseconds can clobber one another.
// Acceptable at this traffic level; the caps below bound the damage.

export const dynamic = "force-dynamic";

const GIST_FILE = "leaderboard.json";
const TOP_N = 10; // kept per game
const MAX_NAME = 16;
const RECENT_CAP = 200; // rate-limit ledger length
const MIN_INTERVAL_MS = 10_000; // one submission per 10s per visitor
const MAX_PER_DAY = 20;

type Entry = { name: string; score: number; at: string; ipHash: string };
type Board = Partial<Record<GameKey, Entry[]>>;
type Stored = { boards: Board; recent: { ipHash: string; at: string }[] };
type PublicEntry = { name: string; score: number; at: string };

const BLOCKLIST = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "bastard",
  "slut", "whore", "nigger", "faggot", "retard", "rape",
];

function gistId(): string | undefined {
  return process.env.LEADERBOARD_GIST_ID || process.env.GUESTBOOK_GIST_ID;
}

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

function sanitise(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasBlockedWord(text: string): boolean {
  return BLOCKLIST.some((w) => new RegExp(`\\b${w}`, "i").test(text.toLowerCase()));
}

function octokit() {
  return new Octokit({ auth: process.env.GITHUB_API_TOKEN });
}

const EMPTY: Stored = { boards: {}, recent: [] };

async function read(): Promise<Stored> {
  const id = gistId();
  if (!id) return EMPTY;
  const res = await octokit().request("GET /gists/{gist_id}", {
    gist_id: id,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });
  const raw = res.data.files?.[GIST_FILE]?.content;
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    return {
      boards: parsed?.boards && typeof parsed.boards === "object" ? parsed.boards : {},
      recent: Array.isArray(parsed?.recent) ? parsed.recent : [],
    };
  } catch {
    return EMPTY;
  }
}

async function write(data: Stored): Promise<void> {
  const id = gistId();
  if (!id) throw new Error("no gist id configured");
  await octokit().request("PATCH /gists/{gist_id}", {
    gist_id: id,
    files: { [GIST_FILE]: { content: JSON.stringify(data, null, 2) } },
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });
}

const strip = (e: Entry): PublicEntry => ({ name: e.name, score: e.score, at: e.at });

export async function GET(request: Request) {
  if (!gistId()) return NextResponse.json({ configured: false, boards: {} });

  const game = new URL(request.url).searchParams.get("game");
  if (game && !isGameKey(game)) {
    return NextResponse.json(
      { error: `Unknown game '${game}'.`, games: GAME_KEYS },
      { status: 400 },
    );
  }

  try {
    const data = await read();
    const wanted = game ? [game as GameKey] : GAME_KEYS;
    const boards: Record<string, PublicEntry[]> = {};
    for (const key of wanted) {
      boards[key] = (data.boards[key] ?? []).slice(0, TOP_N).map(strip);
    }
    return NextResponse.json({ configured: true, boards });
  } catch (error) {
    console.error("Leaderboard read failed:", error);
    return NextResponse.json({ error: "Could not read the leaderboard." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!gistId()) {
    return NextResponse.json({ error: "The leaderboard is not configured yet." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const { game, name: rawName, score: rawScore } = (body ?? {}) as Record<string, unknown>;

  if (!isGameKey(game)) {
    return NextResponse.json(
      { error: "Unknown game.", games: GAME_KEYS },
      { status: 400 },
    );
  }
  const meta = GAMES[game];

  const score = typeof rawScore === "number" ? rawScore : Number(rawScore);
  if (!Number.isInteger(score) || score <= 0) {
    return NextResponse.json({ error: "Score must be a positive whole number." }, { status: 400 });
  }
  if (score > meta.max) {
    return NextResponse.json(
      { error: `${score} is past what ${meta.label} can produce: ${meta.why}.` },
      { status: 400 },
    );
  }

  const name = sanitise(rawName).slice(0, MAX_NAME) || "anonymous";
  if (hasBlockedWord(name)) {
    return NextResponse.json({ error: "Pick a different name." }, { status: 400 });
  }

  const ipHash = await hashIp(clientIp(request));

  try {
    const data = await read();
    const now = Date.now();

    // Rate limiting rides on a stored ledger rather than memory, so it survives
    // cold starts and multiple serverless instances.
    const mine = data.recent.filter((r) => r.ipHash === ipHash);
    const last = mine[mine.length - 1];
    if (last && now - Date.parse(last.at) < MIN_INTERVAL_MS) {
      return NextResponse.json({ error: "Easy there. Ten seconds between submissions." }, { status: 429 });
    }
    if (mine.filter((r) => now - Date.parse(r.at) < 86_400_000).length >= MAX_PER_DAY) {
      return NextResponse.json({ error: "That is enough for today." }, { status: 429 });
    }

    const board = data.boards[game] ?? [];
    // One row per name per board, keeping their best, so a single player cannot
    // occupy the whole thing.
    const existing = board.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (existing && existing.score >= score) {
      return NextResponse.json({
        ok: true,
        improved: false,
        best: existing.score,
        rank: board.filter((e) => e.score > existing.score).length + 1,
        board: board.slice(0, TOP_N).map(strip),
      });
    }

    const without = board.filter((e) => e.name.toLowerCase() !== name.toLowerCase());
    const entry: Entry = { name, score, at: new Date().toISOString(), ipHash };
    const next = [...without, entry].sort((a, b) => b.score - a.score).slice(0, TOP_N);

    data.boards[game] = next;
    data.recent = [...data.recent, { ipHash, at: new Date().toISOString() }].slice(-RECENT_CAP);
    await write(data);

    return NextResponse.json({
      ok: true,
      improved: true,
      previous: existing?.score ?? null,
      rank: next.findIndex((e) => e === entry) + 1,
      board: next.map(strip),
    });
  } catch (error) {
    console.error("Leaderboard write failed:", error);
    return NextResponse.json({ error: "Could not update the leaderboard." }, { status: 502 });
  }
}
