import { NextResponse } from "next/server";
import { hasKv, kv, kvPipeline, readFile, storeReady, writeFile } from "@/lib/store";
import { GAMES, GAME_KEYS, isGameKey, type GameKey } from "@/constants/games";
import { dailyMission, dayKey, isDayKey } from "@/app/arcade/assist-daily";
import { LEVELS, fly } from "@/app/arcade/assist-sim";
import { replay as replayStack } from "@/app/arcade/stack-sim";
import { MAX_SAMPLES as RUN_MAX, TAPE_DELTA as RUN_DELTA, TAPE_WIDTH as RUN_WIDTH, replayRun, type RunNeo } from "@/app/arcade/run-sim";
import { decodeTape } from "@/app/arcade/tape";
import { checkSeed } from "@/lib/run-seed";
import { createHash } from "node:crypto";

// An open field's seed must be one the server dealt (lib/run-seed.ts), and a
// dealt seed goes with one run: the first tape posted on it. The same tape may
// be posted again (another name, after a clash); a different one may not.
async function seedFor(token: unknown, seed: number, game: "run" | "flight", tape: string): Promise<string | null> {
  const dealt = checkSeed(token, game);
  if (!dealt) return "That run's field wasn't dealt by the arcade (was it offline when the run began?), so it can't be checked.";
  if (dealt.seed !== seed) return "That run doesn't match its field.";
  if (REDIS()) {
    const key = `runseed:${String(token).split(".")[3]}`;
    const mine = createHash("sha256").update(tape).digest("base64url").slice(0, 22);
    const set = await kv<string | null>(["SET", key, mine, "NX", "PX", 4 * 3_600_000]);
    if (set === null && (await kv<string | null>(["GET", key])) !== mine) return "That field has already been flown and posted.";
  }
  return null;
}

// Today's real asteroids, as a daily run met them: the list the run sent,
// checked against the one the site fetched from NASA for that day (in Redis,
// from /api/space-today) when it has it. Null: not today's.
async function neosFor(day: string, sent: unknown): Promise<RunNeo[] | null> {
  const list = Array.isArray(sent) ? sent.slice(0, 8) : [];
  const clean = list.map((n) => {
    const o = (n ?? {}) as Record<string, unknown>;
    return { d: Number(o.d), v: Number(o.v), h: o.h === true };
  });
  if (clean.some((n) => !(n.d >= 1 && n.d <= 100000 && n.v >= 0 && n.v <= 200))) return null;
  if (hasKv()) {
    try {
      const raw = await kv<string | null>(["GET", `space:today:${day}`]);
      const known = raw ? (JSON.parse(raw) as { asteroids?: { d: number; v: number; hazardous: boolean }[] | null }).asteroids : null;
      if (Array.isArray(known) && known.length) {
        const want = known.slice(0, 8).map((a) => ({ d: a.d, v: a.v, h: !!a.hazardous }));
        const same = want.length === clean.length && want.every((w, i) => w.d === clean[i].d && w.v === clean[i].v && w.h === clean[i].h);
        return same ? want : null;
      }
    } catch {
      /* no record of the day: take the run's list, within reason */
    }
  }
  return clean;
}

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
// The arcade's are checked here rather than taken on trust: Gravity Assist's
// times (its shot flown again), Stack the Station's modules (its drop times
// replayed, stack-sim.ts), and Asteroid Run's scores (the run replayed from
// its seed and input tape, run-sim.ts). A bot playing perfectly would still
// pass: they prove a score can be had by the rules, not that a person had it.
//
// Honest about the rest: their scores originate on the client, so they cannot be
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

// (anywhere to keep the boards: Redis, the gist, or this process's memory)
function gistId(): string | undefined {
  if (MEMORY) return "memory";
  return storeReady() ? "store" : undefined;
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

const EMPTY: Stored = { boards: {}, recent: [] };

async function read(): Promise<Stored> {
  if (MEMORY) return structuredClone(memory ?? EMPTY);
  const raw = await readFile(GIST_FILE);
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
  await writeFile(GIST_FILE, JSON.stringify(data, null, 2));
}

const strip = (e: Entry): PublicEntry => ({ name: e.name, score: e.score, at: e.at });

// ---- Redis: collision-proof boards ------------------------------------------
// Each board is a hash, lbe:<board>, one field per row (a random id, the row's
// JSON). A post adds only its own field, atomically, then removes the rows
// that fell off (past the top ten, or past three for one player): removing a
// named field is safe however many posts land at once, so no post can undo
// another. The rate limits are Redis counters with expiry, atomic too.
const REDIS = () => hasKv() && !MEMORY;
type Row = Entry & { id: string };
const rowsOf = (flat: string[] | null): Row[] => {
  const out: Row[] = [];
  for (let k = 0; flat && k < flat.length; k += 2) {
    try {
      out.push({ ...(JSON.parse(flat[k + 1]) as Entry), id: flat[k] });
    } catch {
      /* skip a damaged row */
    }
  }
  return out;
};
const order = (lower?: boolean) => (a: Entry, b: Entry) =>
  (lower ? a.score - b.score : b.score - a.score) || Date.parse(a.at) - Date.parse(b.at);
async function redisBoards(keys: string[]): Promise<Row[][]> {
  const res = await kvPipeline<string[]>(keys.map((k) => ["HGETALL", `lbe:${k}`]));
  return res.map(rowsOf);
}

// The daily mission's board key, for today or yesterday (someone's evening
// can be the next day in UTC); reading any past day is allowed
const today = () => dayKey();
const yesterday = () => dayKey(new Date(Date.now() - 86_400_000));
// A daily board, one per day; Gravity Assist's missions, one board each
const DAILY = new Set<GameKey>(["assist-daily", "run-daily", "stack-daily", "flight-daily"]);
const isMission = (m: unknown) => typeof m === "string" && /^\d{1,2}$/.test(m) && Number(m) < LEVELS.length;
const boardKey = (game: GameKey, sub?: string | null) =>
  DAILY.has(game) ? `${game}:${sub}` : game === "assist-mission" ? `assist-mission:${sub}` : game;

export async function GET(request: Request) {
  if (!gistId()) return NextResponse.json({ configured: false, boards: {} });

  const params = new URL(request.url).searchParams;
  const game = params.get("game");
  const day = game === "assist-mission" ? params.get("mission") : params.get("day") ?? today();
  if (game && DAILY.has(game as GameKey) && !isDayKey(day)) {
    return NextResponse.json({ error: "A day is YYYY-MM-DD." }, { status: 400 });
  }
  if (game === "assist-mission" && !isMission(day)) {
    return NextResponse.json({ error: "Which mission?" }, { status: 400 });
  }
  if (game && !isGameKey(game)) {
    return NextResponse.json(
      { error: `Unknown game '${game}'.`, games: GAME_KEYS },
      { status: 400 },
    );
  }

  try {
    // (the 3D arcade's boards only when asked for by name)
    const wanted = game ? [game as GameKey] : GAME_KEYS.filter((k) => !GAMES[k].arcade);
    const boards: Record<string, PublicEntry[]> = {};
    if (REDIS()) {
      const rows = await redisBoards(wanted.map((k) => boardKey(k, day)));
      wanted.forEach((k, i) => (boards[k] = rows[i].sort(order(GAMES[k].lower)).slice(0, TOP_N).map(strip)));
      return NextResponse.json({ configured: true, boards });
    }
    const data = await read();
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
  const { game, name: rawName, score: rawScoreIn, player: rawPlayer, day: rawDay, angle, power, t: rawT, mission: rawMission, drops } =
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

  // The daily boards take today's (or yesterday's, for a late evening)
  let day: string | undefined;
  if (DAILY.has(game) && game !== "assist-daily") {
    if (!isDayKey(rawDay) || (rawDay !== today() && rawDay !== yesterday())) {
      return NextResponse.json({ error: "That day's board has closed." }, { status: 400 });
    }
    day = rawDay;
  }
  // A Gravity Assist mission: fly the shot again, from when it was launched, and time it here
  if (game === "assist-mission") {
    const m = String(rawMission ?? "");
    const a = Number(angle);
    const pw = Number(power);
    const t = Number(rawT ?? 0);
    if (!isMission(m) || !Number.isFinite(a) || !Number.isFinite(pw) || pw < 0.1 || pw > 1 || !Number.isFinite(t) || t < 0 || t > 600) {
      return NextResponse.json({ error: "Send the winning shot: the mission, its angle, power and launch time." }, { status: 400 });
    }
    day = m;
    const flight = fly(LEVELS[Number(m)], a, pw, t);
    if (flight.state !== "arrived") {
      return NextResponse.json({ error: "That shot doesn't arrive when flown again here." }, { status: 400 });
    }
    rawScore = Math.max(1, Math.round(flight.flight * 100));
  }
  // Stack the Station: the build is replayed from its drop times, and the
  // modules it stood are counted here (the score sent is ignored)
  if (game === "stack-station" || game === "stack-daily") {
    const counted = replayStack(drops, game === "stack-daily" ? day : null);
    if (counted === null) {
      return NextResponse.json({ error: "Send the build: its drop times." }, { status: 400 });
    }
    if (counted <= 0) return NextResponse.json({ error: "That build stood no modules." }, { status: 400 });
    rawScore = counted;
  }
  // Asteroid Run: the run is replayed from its seed and its input, and scored
  // here (the score sent is ignored); today's field, with today's asteroids
  if (game === "asteroid-run" || game === "run-daily") {
    const rec = ((body ?? {}) as { run?: { seed?: unknown; tape?: unknown; neos?: unknown } }).run;
    const seed = Number(rec?.seed);
    const samples = rec ? decodeTape(rec.tape, RUN_WIDTH, RUN_DELTA, RUN_MAX) : null;
    if (!rec || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !samples) {
      return NextResponse.json({ error: "Send the run: its seed and its input." }, { status: 400 });
    }
    if (game === "asteroid-run") {
      const bad = await seedFor((rec as { token?: unknown }).token, seed, "run", String(rec.tape));
      if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    }
    const neos = game === "run-daily" ? await neosFor(day!, rec.neos) : [];
    if (!neos) return NextResponse.json({ error: "That wasn't today's field. Play it again?" }, { status: 400 });
    const scored = replayRun(samples, seed, game === "run-daily" ? day! : null, neos);
    if (scored === null) return NextResponse.json({ error: "That run doesn't end where it says when it's replayed here." }, { status: 400 });
    if (scored <= 0) return NextResponse.json({ error: "That run scored nothing." }, { status: 400 });
    rawScore = scored;
  }
  // The mission of the day: fly the shot again, and time it here
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

  if (REDIS()) {
    try {
      // the limits: ten seconds between posts, twenty a day
      const today0 = new Date().toISOString().slice(0, 10);
      const [gap, count] = await kvPipeline<string | number | null>([
        ["SET", `lbgap:${ipHash}`, "1", "NX", "PX", MIN_INTERVAL_MS],
        ["INCR", `lbday:${ipHash}:${today0}`],
        ["EXPIRE", `lbday:${ipHash}:${today0}`, 86_400],
      ]);
      if (gap === null) return NextResponse.json({ error: "Easy there. Ten seconds between submissions." }, { status: 429 });
      if (Number(count) > MAX_PER_DAY) return NextResponse.json({ error: "That is enough for today." }, { status: 429 });

      const key = boardKey(game, day);
      const sort = order(meta.lower);
      const board = (await redisBoards([key]))[0].sort(sort);
      const whose = (e: Entry) => (meta.arcade ? (e.player ?? e.ipHash) === (player ?? ipHash) : e.name.toLowerCase() === name.toLowerCase());
      const sameName = board.filter(whose);
      const owner = sameName.find((e) => e.player)?.player;
      if (!meta.arcade && owner && player && owner !== player) {
        return NextResponse.json({ error: `"${name}" is taken on this board by someone else. Pick another.`, code: "name_taken" }, { status: 409 });
      }
      const unchanged = () =>
        NextResponse.json({
          ok: true,
          improved: false,
          best: bestOf(sameName.map((e) => e.score)),
          rank: board.filter((e) => better(e.score, score)).length + 1,
          board: board.slice(0, TOP_N).map(strip),
        });
      if (sameName.some((e) => e.score === score)) return unchanged();
      const weakest = sameName.length >= PER_NAME ? worstOf(sameName.map((e) => e.score)) : null;
      if (weakest !== null && !better(score, weakest)) return unchanged();

      // add this row, on its own
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const entry: Entry = { name, score, at: new Date().toISOString(), ipHash, player };
      await kvPipeline([
        ["HSET", `lbe:${key}`, id, JSON.stringify(entry)],
        ...(DAILY.has(game) ? [["EXPIRE", `lbe:${key}`, 8 * 86_400] as (string | number)[]] : []),
      ]);
      // then take away whatever has fallen off, as the board stands now
      const now = (await redisBoards([key]))[0].sort(sort);
      const perPlayer = new Map<string, number>();
      const keep: Row[] = [];
      const drop: string[] = [];
      for (const r of now) {
        const who = meta.arcade ? (r.player ?? r.ipHash) : r.name.toLowerCase();
        const n = perPlayer.get(who) ?? 0;
        if (n >= PER_NAME || keep.length >= TOP_N) drop.push(r.id);
        else {
          perPlayer.set(who, n + 1);
          keep.push(r);
        }
      }
      if (drop.length) await kv(["HDEL", `lbe:${key}`, ...drop]);
      const rank = keep.findIndex((r) => r.id === id) + 1;
      return NextResponse.json({
        ok: true,
        improved: true,
        previous: sameName.length ? bestOf(sameName.map((e) => e.score)) : null,
        score,
        rank: rank || null,
        board: keep.map(strip),
      });
    } catch (error) {
      console.error("Leaderboard write failed:", error);
      return NextResponse.json({ error: "Could not update the leaderboard." }, { status: 502 });
    }
  }

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
  if (!isGameKey(game) || (DAILY.has(game) && !isDayKey(day)) || (game === "assist-mission" && !isMission(day))) {
    return NextResponse.json({ error: "Which board?" }, { status: 400 });
  }
  try {
    const k = boardKey(game, day as string | undefined);
    if (REDIS()) {
      const removed = (await redisBoards([k]))[0].length;
      await kv(["DEL", `lbe:${k}`]);
      return NextResponse.json({ ok: true, board: k, removed });
    }
    const data = await read();
    const removed = data.boards[k]?.length ?? 0;
    delete data.boards[k];
    await write(data);
    return NextResponse.json({ ok: true, board: k, removed });
  } catch (error) {
    console.error("Leaderboard clear failed:", error);
    return NextResponse.json({ error: "Could not update the leaderboard." }, { status: 502 });
  }
}
