import { NextResponse } from "next/server";
import { Octokit } from "@octokit/core";

// Terminal guestbook, stored as a JSON file inside a GitHub gist so it needs no
// extra service. Requires:
//   GUESTBOOK_GIST_ID  - id of a gist containing a `guestbook.json` file
//   GITHUB_API_TOKEN   - must carry the `gist` scope to write
//   GUESTBOOK_SALT     - optional, salts the stored IP hashes
//
// Reads and writes are read-modify-write against the whole file. Two signatures
// landing inside the same few hundred milliseconds can clobber one another;
// acceptable at this traffic level, and the cap below bounds the damage.

export const dynamic = "force-dynamic";

const GIST_FILE = "guestbook.json";
const MAX_ENTRIES = 200; // oldest are dropped past this
const MAX_NAME = 24;
const MAX_MESSAGE = 140;
const MIN_INTERVAL_MS = 60_000; // one signature per minute per visitor
const MAX_PER_DAY = 3;

type Entry = {
  id: string;
  name: string;
  message: string;
  at: string; // ISO timestamp
  ipHash: string; // never returned to clients
};

type PublicEntry = Omit<Entry, "ipHash">;

// Deliberately small. Catches drive-by crudeness, not a determined attacker;
// the length cap and rate limit do the heavier lifting.
const BLOCKLIST = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "bastard",
  "slut", "whore", "nigger", "faggot", "retard", "rape",
];

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function hashIp(ip: string): Promise<string> {
  const salt = process.env.GUESTBOOK_SALT || "miit-guestbook-v1";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Strip markup and control characters, collapse whitespace, trim. */
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
  const lowered = text.toLowerCase();
  return BLOCKLIST.some((word) => new RegExp(`\\b${word}`, "i").test(lowered));
}

function octokit() {
  return new Octokit({ auth: process.env.GITHUB_API_TOKEN });
}

async function readEntries(): Promise<Entry[]> {
  const gistId = process.env.GUESTBOOK_GIST_ID;
  if (!gistId) return [];
  const res = await octokit().request("GET /gists/{gist_id}", {
    gist_id: gistId,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });
  const raw = res.data.files?.[GIST_FILE]?.content;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.entries) ? (parsed.entries as Entry[]) : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries: Entry[]): Promise<void> {
  const gistId = process.env.GUESTBOOK_GIST_ID;
  if (!gistId) throw new Error("GUESTBOOK_GIST_ID is not set");
  await octokit().request("PATCH /gists/{gist_id}", {
    gist_id: gistId,
    files: { [GIST_FILE]: { content: JSON.stringify({ entries }, null, 2) } },
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  });
}

const strip = (e: Entry): PublicEntry => ({
  id: e.id,
  name: e.name,
  message: e.message,
  at: e.at,
});

export async function GET(request: Request) {
  if (!process.env.GUESTBOOK_GIST_ID) {
    return NextResponse.json({ configured: false, entries: [] });
  }
  const limitParam = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

  try {
    const entries = await readEntries();
    const newestFirst = [...entries].reverse().slice(0, limit).map(strip);
    return NextResponse.json({
      configured: true,
      total: entries.length,
      entries: newestFirst,
    });
  } catch (error) {
    console.error("Guestbook read failed:", error);
    return NextResponse.json({ error: "Could not read the guestbook." }, { status: 502 });
  }
}

/**
 * Length-independent comparison, so a wrong key cannot be narrowed down by
 * timing how long the rejection took.
 */
function keyMatches(supplied: string, expected: string): boolean {
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Remove one entry, or all of them with id "*".
 *
 * Authorised by GUESTBOOK_ADMIN_KEY, which lives only on the server. The
 * terminal command that calls this is visible in the client bundle; the key is
 * what actually gates it, so treat it like a password.
 */
export async function DELETE(request: Request) {
  if (!process.env.GUESTBOOK_GIST_ID) {
    return NextResponse.json({ error: "The guestbook is not configured yet." }, { status: 503 });
  }
  const adminKey = process.env.GUESTBOOK_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: "No admin key is configured on the server." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const { id, key } = (body ?? {}) as { id?: unknown; key?: unknown };

  if (typeof key !== "string" || !keyMatches(key, adminKey)) {
    // Deliberate delay: the only defence against someone hammering this.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Rejected." }, { status: 401 });
  }
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "Which entry?" }, { status: 400 });
  }

  try {
    const entries = await readEntries();
    const target = id.trim().replace(/^#/, "");

    if (target === "*") {
      await writeEntries([]);
      return NextResponse.json({ ok: true, removed: entries.length, remaining: 0 });
    }

    const kept = entries.filter((e) => e.id !== target);
    if (kept.length === entries.length) {
      return NextResponse.json({ error: `No entry with id ${target}.` }, { status: 404 });
    }
    await writeEntries(kept);
    return NextResponse.json({
      ok: true,
      removed: entries.length - kept.length,
      remaining: kept.length,
    });
  } catch (error) {
    console.error("Guestbook delete failed:", error);
    return NextResponse.json({ error: "Could not update the guestbook." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!process.env.GUESTBOOK_GIST_ID) {
    return NextResponse.json(
      { error: "The guestbook is not configured yet." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const payload = (body ?? {}) as { name?: unknown; message?: unknown };
  const name = sanitise(payload.name).slice(0, MAX_NAME) || "anonymous";
  const message = sanitise(payload.message).slice(0, MAX_MESSAGE);

  if (!message) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }
  if (hasBlockedWord(`${name} ${message}`)) {
    return NextResponse.json(
      { error: "That one did not make it past the filter." },
      { status: 400 },
    );
  }

  const ipHash = await hashIp(clientIp(request));

  try {
    const entries = await readEntries();

    // Rate limiting rides on the stored entries, so it survives cold starts and
    // multiple serverless instances the way an in-memory map would not.
    const now = Date.now();
    const mine = entries.filter((e) => e.ipHash === ipHash);
    const last = mine[mine.length - 1];
    if (last && now - Date.parse(last.at) < MIN_INTERVAL_MS) {
      return NextResponse.json(
        { error: "Easy there. One signature per minute." },
        { status: 429 },
      );
    }
    const sinceMidnight = mine.filter((e) => now - Date.parse(e.at) < 86_400_000);
    if (sinceMidnight.length >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: `That is ${MAX_PER_DAY} for today. Come back tomorrow.` },
        { status: 429 },
      );
    }

    const entry: Entry = {
      id: crypto.randomUUID().slice(0, 8),
      name,
      message,
      at: new Date().toISOString(),
      ipHash,
    };

    const next = [...entries, entry].slice(-MAX_ENTRIES);
    await writeEntries(next);

    return NextResponse.json({ ok: true, entry: strip(entry) }, { status: 201 });
  } catch (error) {
    console.error("Guestbook write failed:", error);
    return NextResponse.json({ error: "Could not sign the guestbook." }, { status: 502 });
  }
}
