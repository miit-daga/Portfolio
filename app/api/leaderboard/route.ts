import { NextResponse } from "next/server";
import { Octokit } from "@octokit/core";
import { GAMES, GAME_KEYS, isGameKey, type GameKey } from "@/constants/games";
import { dailyMission, dayKey, isDayKey } from "@/app/arcade/assist-daily";
import { fly } from "@/app/arcade/assist-sim";

// Arcade leaderboards, stored as a second file inside the guestbook's gist.
// A PATCH only touches the files it names, so leaderboard writes never disturb
// guestbook.json.
//
// The 3D arcade's boards ride along (constants/games.ts, arcade: true): kept
// out of the terminal's listing, signed with initials, and for Gravity
// Assist's mission of the day, one board per day ranked by the fastest
// arrival. That one is the exception to what follows: the client sends the
// shot (angle and power), and the server flies it again and times it itself.
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
const TOP_N = 10; // rows kept per game
const PER_NAME = 3; // rows one player may hold on a single board
const MAX_NAME = 16;
const RECENT_CAP = 200; // rate-limit ledger length
const MIN_INTERVAL_MS = 10_000; // one submission per 10s per visitor
const MAX_PER_DAY = 20;

type Entry = {
  name: string;
  score: number;
  at: string;
  ipHash: string;
  /** Browser-scoped token. Names are reserved to one of these, because an IP
   *  rotates and would cost a returning player their own name. */
  player?: string;
};
// (keyed by game, or for the daily mission "assist-daily:YYYY-MM-DD")
type Board = Record<string, Entry[]>;
type Stored = { boards: Board; recent: { ipHash: string; at: string }[] };
type PublicEntry = { name: string; score: number; at: string };

const BLOCKLIST = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "bastard",
  "slut", "whore", "nigger", "faggot", "retard", "rape",
];

// For trying the boards locally without the gist: LEADERBOARD_MEMORY=1 keeps
// them in this process's memory instead (never in production)
const MEMORY = process.env.NODE_ENV !== "production" && process.env.LEADERBOARD_MEMORY === "1";
let memory: Stored | null = null;

function gistId(): string | undefined {
  if (MEMORY) return "memory";
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
  if (MEMORY) return structuredClone(memory ?? EMPTY);
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
  if (MEMORY) {
    memory = structuredClone(data);
    return;
  }
  const id = gistId();
  if (!id) throw new Error("no gist id configured");
  await octokit().request("PATCH /gists/{gist_id}", {
    gist_id: id,
    files: { [GIST_FILE]: { content: JSON.stringify(data, null, 2) } },
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });
}

const strip = (e: Entry): PublicEntry => ({ name: e.name, score: e.score, at: e.at });

// The daily mission's board key, for today or yesterday (someone's evening
// can be the next day in UTC); reading any past day is allowed
const today = () => dayKey();
const yesterday = () => dayKey(new Date(Date.now() - 86_400_000));
const boardKey = (game: GameKey, day?: string | null) => (game === "assist-daily" ? `assist-daily:${day}` : game);

export async function GET(request: Request) {
  if (!gistId()) return NextResponse.json({ configured: false, boards: {} });

  const params = new URL(request.url).searchParams;
  const game = params.get("game");
  const day = params.get("day") ?? today();
  if (game === "assist-daily" && !isDayKey(day)) {
    return NextResponse.json({ error: "A day is YYYY-MM-DD." }, { status: 400 });
  }
  if (game && !isGameKey(game)) {
    return NextResponse.json(
      { error: `Unknown game '${game}'.`, games: GAME_KEYS },
      { status: 400 },
    );
  }

  try {
    const data = await read();
    // (the 3D arcade's boards only when asked for by name)
    const wanted = game ? [game as GameKey] : GAME_KEYS.filter((k) => !GAMES[k].arcade);
    const boards: Record<string, PublicEntry[]> = {};
    for (const key of wanted) {
      boards[key] = (data.boards[boardKey(key, day)] ?? []).slice(0, TOP_N).map(strip);
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
  const { game, name: rawName, score: rawScoreIn, player: rawPlayer, day: rawDay, angle, power } =
    (body ?? {}) as Record<string, unknown>;
  let rawScore = rawScoreIn;
  const player = typeof rawPlayer === "string" && /^[a-f0-9]{8,32}$/i.test(rawPlayer)
    ? rawPlayer
    : undefined;

  if (!isGameKey(game)) {
    return NextResponse.json(
      { error: "Unknown game.", games: GAME_KEYS },
      { status: 400 },
    );
  }
  const meta = GAMES[game];
  const better = (a: number, b: number) => (meta.lower ? a < b : a > b);
  const bestOf = (xs: number[]) => (meta.lower ? Math.min(...xs) : Math.max(...xs));
  const worstOf = (xs: number[]) => (meta.lower ? Math.max(...xs) : Math.min(...xs));

  // The mission of the day: fly the shot again, and time it here
  let day: string | undefined;
  if (game === "assist-daily") {
    if (!isDayKey(rawDay) || (rawDay !== today() && rawDay !== yesterday())) {
      return NextResponse.json({ error: "That mission of the day has closed." }, { status: 400 });
    }
    day = rawDay;
    const a = Number(angle);
    const pw = Number(power);
    if (!Number.isFinite(a) || !Number.isFinite(pw) || pw < 0.1 || pw > 1) {
      return NextResponse.json({ error: "Send the winning shot: its angle and power." }, { status: 400 });
    }
    const flight = fly(dailyMission(day), a, pw, 0);
    if (flight.state !== "arrived") {
      return NextResponse.json({ error: "That shot doesn't arrive when flown again here." }, { status: 400 });
    }
    rawScore = Math.max(1, Math.round(flight.flight * 100));
  }

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

    const key = boardKey(game, day);
    const board = data.boards[key] ?? [];
    // One player's rows: by name on the terminal's boards, where a name is a
    // claimed identity; by player on the arcade's, where initials are not
    const whose = (e: Entry) => (meta.arcade ? (e.player ?? e.ipHash) === (player ?? ipHash) : e.name.toLowerCase() === name.toLowerCase());
    const sameName = board.filter(whose);

    // A name belongs to whoever used it first. Entries predating this field are
    // treated as unclaimed and adopted by the next writer.
    const owner = sameName.find((e) => e.player)?.player;
    if (!meta.arcade && owner && player && owner !== player) {
      return NextResponse.json(
        {
          error: `"${name}" is taken on this board by someone else. Pick another.`,
          code: "name_taken",
        },
        { status: 409 },
      );
    }

    // Posting the same number twice would just duplicate a row.
    if (sameName.some((e) => e.score === score)) {
      return NextResponse.json({
        ok: true,
        improved: false,
        best: bestOf(sameName.map((e) => e.score)),
        rank: board.filter((e) => better(e.score, score)).length + 1,
        board: board.slice(0, TOP_N).map(strip),
      });
    }

    // Up to PER_NAME rows each: enough to show progress, not enough for one
    // player to own a board that only sees a handful of visitors.
    const weakest = sameName.length >= PER_NAME
      ? worstOf(sameName.map((e) => e.score))
      : null;
    if (weakest !== null && !better(score, weakest)) {
      return NextResponse.json({
        ok: true,
        improved: false,
        best: bestOf(sameName.map((e) => e.score)),
        rank: board.filter((e) => better(e.score, score)).length + 1,
        board: board.slice(0, TOP_N).map(strip),
      });
    }

    const entry: Entry = { name, score, at: new Date().toISOString(), ipHash, player };
    // Equal scores are ranked by who got there first. Relying on array order
    // would have re-shuffled ties every time the board was rebuilt.
    const byScoreThenAge = (a: Entry, b: Entry) =>
      (meta.lower ? a.score - b.score : b.score - a.score) || Date.parse(a.at) - Date.parse(b.at);

    const kept = [...sameName, entry].sort(byScoreThenAge).slice(0, PER_NAME);
    const others = board.filter((e) => !whose(e));
    const next = [...others, ...kept].sort(byScoreThenAge).slice(0, TOP_N);

    data.boards[key] = next;
    // (the daily boards of more than a week ago go)
    for (const k of Object.keys(data.boards)) {
      if (k.startsWith("assist-daily:") && k.slice(13) < dayKey(new Date(Date.now() - 7 * 86_400_000))) delete data.boards[k];
    }
    data.recent = [...data.recent, { ipHash, at: new Date().toISOString() }].slice(-RECENT_CAP);
    await write(data);

    return NextResponse.json({
      ok: true,
      improved: true,
      previous: sameName.length ? bestOf(sameName.map((e) => e.score)) : null,
      score,
      rank: next.findIndex((e) => e === entry) + 1,
      board: next.map(strip),
    });
  } catch (error) {
    console.error("Leaderboard write failed:", error);
    return NextResponse.json({ error: "Could not update the leaderboard." }, { status: 502 });
  }
}

/**
 * Clear one board: { game, day?, key }. Authorised by GUESTBOOK_ADMIN_KEY,
 * the guestbook's admin key, which lives only on the server.
 */
export async function DELETE(request: Request) {
  if (!gistId()) return NextResponse.json({ error: "The leaderboard is not configured yet." }, { status: 503 });
  const adminKey = process.env.GUESTBOOK_ADMIN_KEY;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const { game, day, key } = (body ?? {}) as Record<string, unknown>;
  const matches = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  };
  if (!adminKey || typeof key !== "string" || !matches(key, adminKey)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Rejected." }, { status: 401 });
  }
  if (!isGameKey(game) || (game === "assist-daily" && !isDayKey(day))) {
    return NextResponse.json({ error: "Which board?" }, { status: 400 });
  }
  try {
    const data = await read();
    const k = boardKey(game, day as string | undefined);
    const removed = data.boards[k]?.length ?? 0;
    delete data.boards[k];
    await write(data);
    return NextResponse.json({ ok: true, board: k, removed });
  } catch (error) {
    console.error("Leaderboard clear failed:", error);
    return NextResponse.json({ error: "Could not update the leaderboard." }, { status: 502 });
  }
}
