// Where the site keeps what visitors leave: the guestbook, the constellation
// counts, the leaderboards and the arcade's tally. Upstash Redis (set up
// through Vercel's marketplace, which adds KV_REST_API_URL and
// KV_REST_API_TOKEN) when it's there; otherwise the GitHub gist these lived
// in before (GUESTBOOK_GIST_ID), which GitHub lets be edited only 100 times
// an hour. Server-side only: the token never reaches a browser.
//
// Each of the gist's files is one Redis key, "file:<name>", holding the same
// JSON as before, so the routes' logic is unchanged. The tally uses Redis's
// own counters instead (see app/api/tally).

import { Octokit } from "@octokit/core";

const kvUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasKv = () => !!(kvUrl() && kvToken());
const gistId = () => process.env.LEADERBOARD_GIST_ID || process.env.GUESTBOOK_GIST_ID;
/** Whether there is anywhere to keep things. */
export const storeReady = () => hasKv() || !!gistId();

type Cmd = (string | number)[];

/** One Redis command. */
export async function kv<T = unknown>(cmd: Cmd): Promise<T> {
    const r = await fetch(kvUrl()!, {
        method: "POST",
        headers: { Authorization: `Bearer ${kvToken()}` },
        body: JSON.stringify(cmd),
        cache: "no-store",
    });
    const d = (await r.json()) as { result?: T; error?: string };
    if (!r.ok || d.error) throw new Error(`Redis: ${d.error ?? r.status}`);
    return d.result as T;
}

/** Several Redis commands in one request. */
export async function kvPipeline<T = unknown>(cmds: Cmd[]): Promise<T[]> {
    if (!cmds.length) return [];
    const r = await fetch(`${kvUrl()}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${kvToken()}` },
        body: JSON.stringify(cmds),
        cache: "no-store",
    });
    const d = (await r.json()) as { result?: T; error?: string }[];
    if (!r.ok || !Array.isArray(d)) throw new Error(`Redis pipeline: ${r.status}`);
    return d.map((x) => {
        if (x.error) throw new Error(`Redis: ${x.error}`);
        return x.result as T;
    });
}

const octokit = () => new Octokit({ auth: process.env.GITHUB_API_TOKEN });

/** A stored file's text, or null if it has none yet. */
export async function readFile(name: string): Promise<string | null> {
    if (hasKv()) return (await kv<string | null>(["GET", `file:${name}`])) ?? null;
    const id = gistId();
    if (!id) return null;
    const res = await octokit().request("GET /gists/{gist_id}", { gist_id: id, headers: { "X-GitHub-Api-Version": "2022-11-28" } });
    return res.data.files?.[name]?.content ?? null;
}

/** Store a file's text. */
export async function writeFile(name: string, content: string): Promise<void> {
    if (hasKv()) {
        await kv(["SET", `file:${name}`, content]);
        return;
    }
    const id = gistId();
    if (!id) throw new Error("Nowhere to store: set KV_REST_API_URL and KV_REST_API_TOKEN, or GUESTBOOK_GIST_ID");
    await octokit().request("PATCH /gists/{gist_id}", {
        gist_id: id,
        files: { [name]: { content } },
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });
}
