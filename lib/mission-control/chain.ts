// Mission Control's models: free tiers from three companies, tried in turn,
// fastest and most dependable first, so one being busy, down or out of its
// day's quota never leaves a visitor without an answer.
//
// - Google's Gemini API (GEMINI_API_KEY): Flash Lite first (500 a day, fast),
//   the full Flash models later (better, but slower and only 20 a day each),
//   Gemma last (14,400 a day, slow, 16K tokens a minute)
// - Groq (GROQ_API_KEY): gpt-oss-120b and Qwen 3.8 27B, 1,000 a day each,
//   under a second
// - NVIDIA's free endpoints (NVIDIA_API_KEY): Nemotron 3 Ultra and Super
// A provider without a key is skipped.
//
// Each attempt has its own timeout (one hung for over three minutes when this
// was tried). If an attempt is slow, the next big-quota route starts alongside
// it and whichever answers first wins ("hedging"); the 20-a-day Flash models
// are never hedged onto, so they don't spend their day on answers thrown away.
// A route that fails is skipped for a while (a minute or two for a hiccup,
// until the quota resets for a day's limit), and each route's attempts today
// are counted, so it stops short of its cap rather than finding out from a 429.

import { hasKv, kv, kvPipeline } from "@/lib/store";

type Provider = "gemini" | "groq" | "nvidia";
export type Route = {
    id: string;
    label: string;
    provider: Provider;
    model: string;
    /** attempts a day to stop at (a little under the real free cap) */
    daily: number;
    /** whether it may be started alongside a slow attempt */
    hedge: boolean;
    timeout: number;
    /** extra request fields: thinking off or low */
    extra?: Record<string, unknown>;
};

export const ROUTES: Route[] = [
    { id: "g-35-lite", label: "Gemini 3.5 Flash Lite", provider: "gemini", model: "gemini-3.5-flash-lite", daily: 480, hedge: true, timeout: 8000 },
    { id: "groq-oss", label: "gpt-oss-120b on Groq", provider: "groq", model: "openai/gpt-oss-120b", daily: 950, hedge: true, timeout: 8000, extra: { reasoning_effort: "low" } },
    { id: "nv-ultra", label: "Nemotron 3 Ultra on NVIDIA", provider: "nvidia", model: "nvidia/nemotron-3-ultra-550b-a55b", daily: 2000, hedge: true, timeout: 10000, extra: { chat_template_kwargs: { thinking: false, enable_thinking: false } } },
    { id: "groq-qwen", label: "Qwen 3.8 27B on Groq", provider: "groq", model: "qwen/qwen3.8-27b", daily: 950, hedge: true, timeout: 8000, extra: { reasoning_effort: "none" } },
    { id: "nv-super", label: "Nemotron 3 Super on NVIDIA", provider: "nvidia", model: "nvidia/nemotron-3-super-120b-a12b", daily: 2000, hedge: true, timeout: 10000, extra: { chat_template_kwargs: { thinking: false, enable_thinking: false } } },
    { id: "g-36", label: "Gemini 3.6 Flash", provider: "gemini", model: "gemini-3.6-flash", daily: 18, hedge: false, timeout: 12000, extra: { thinking_level: "low" } },
    { id: "g-3", label: "Gemini 3 Flash", provider: "gemini", model: "gemini-3-flash-preview", daily: 18, hedge: false, timeout: 12000, extra: { thinking_level: "low" } },
    { id: "g-38", label: "Gemini 3.8 Flash", provider: "gemini", model: "gemini-3.8-flash", daily: 18, hedge: false, timeout: 12000, extra: { thinking_level: "low" } },
    { id: "g-37", label: "Gemini 3.7 Flash", provider: "gemini", model: "gemini-3.7-flash", daily: 18, hedge: false, timeout: 12000, extra: { thinking_level: "low" } },
    { id: "g-35", label: "Gemini 3.5 Flash", provider: "gemini", model: "gemini-3.5-flash", daily: 18, hedge: false, timeout: 12000, extra: { thinking_level: "low" } },
    { id: "g-31-lite", label: "Gemini 3.1 Flash Lite", provider: "gemini", model: "gemini-3.1-flash-lite", daily: 480, hedge: true, timeout: 8000 },
    { id: "gemma-26", label: "Gemma 4 26B", provider: "gemini", model: "gemma-4-26b-a4b-it", daily: 14000, hedge: true, timeout: 20000, extra: { thinking_level: "minimal" } },
    // (its lightest thinking gave internal errors when tried; its default thinks at length, so it gets the room the Flash models get)
    { id: "gemma-31", label: "Gemma 4 31B", provider: "gemini", model: "gemma-4-31b-it", daily: 14000, hedge: true, timeout: 20000, extra: { thinking_level: "high" } },
];

const KEYS: Record<Provider, string> = { gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY", nvidia: "NVIDIA_API_KEY" };
const keyFor = (p: Provider) => process.env[KEYS[p]]?.trim() || "";

/** Output room: short answers, plus thinking for the Flash models (their budget includes it). */
const maxOut = (r: Route) => (r.extra?.thinking_level === "low" || r.extra?.thinking_level === "high" ? 1400 : r.provider === "groq" ? 900 : 500);

// ---- what's out, and how much each has done today ----------------------------

// For trying it locally without touching the site's Redis (LEADERBOARD_MEMORY=1,
// as for the leaderboards), and for anywhere without Redis at all
const MEMORY = !hasKv() || (process.env.NODE_ENV !== "production" && process.env.LEADERBOARD_MEMORY === "1");
const mem = new Map<string, { v: string; until: number }>();
const memGet = (k: string) => {
    const e = mem.get(k);
    if (!e) return null;
    if (e.until < Date.now()) {
        mem.delete(k);
        return null;
    }
    return e.v;
};

/** Several keys at once. */
export async function getMany(keys: string[]): Promise<(string | null)[]> {
    if (!keys.length) return [];
    if (MEMORY) return keys.map(memGet);
    return (await kv<(string | null)[]>(["MGET", ...keys])) ?? keys.map(() => null);
}
export async function setFor(key: string, value: string, seconds: number) {
    if (MEMORY) {
        mem.set(key, { v: value, until: Date.now() + seconds * 1000 });
        return;
    }
    await kv(["SET", key, value, "EX", Math.max(1, Math.round(seconds))]);
}
/** Add one, keeping the count for `seconds` from its first use; the new count. */
export async function bump(key: string, seconds: number): Promise<number> {
    if (MEMORY) {
        const n = Number(memGet(key) ?? 0) + 1;
        const until = mem.get(key)?.until ?? Date.now() + seconds * 1000;
        mem.set(key, { v: String(n), until });
        return n;
    }
    // (made with its expiry the first time, then counted up)
    const [, n] = await kvPipeline<string | number | null>([
        ["SET", key, 0, "EX", Math.round(seconds), "NX"],
        ["INCR", key],
    ]);
    return Number(n);
}

// The free quotas reset at midnight Pacific time
function pacific() {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
            .formatToParts(new Date())
            .map((p) => [p.type, p.value]),
    );
    const left = 86400 - (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, left: Math.max(60, left) };
}

const coolKey = (id: string) => `mc:cool:${id}`;
const countKey = (id: string, day: string) => `mc:n:${id}:${day}`;

/** The routes worth trying now: keyed, not resting, and under today's count. */
async function available(): Promise<Route[]> {
    const keyed = ROUTES.filter((r) => keyFor(r.provider));
    const { day } = pacific();
    let vals: (string | null)[];
    try {
        vals = await getMany(keyed.flatMap((r) => [coolKey(r.id), countKey(r.id, day)]));
    } catch {
        return keyed;
    }
    return keyed.filter((r, i) => !vals[2 * i] && Number(vals[2 * i + 1] ?? 0) < r.daily);
}

async function rest(r: Route, seconds: number, why: string) {
    try {
        await setFor(coolKey(r.id), why, seconds);
    } catch {
        /* ignore */
    }
}

// ---- one attempt ---------------------------------------------------------------

type Attempt = { ok: true; text: string } | { ok: false; status: number | "timeout" | "network" | "empty"; message: string; retryAfter?: number; daily?: boolean };

async function call(r: Route, system: string, user: string, signal: AbortSignal): Promise<Attempt> {
    const key = keyFor(r.provider);
    let res: Response;
    try {
        if (r.provider === "gemini") {
            res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": "2026-05-20" },
                body: JSON.stringify({ model: r.model, input: user, system_instruction: system, generation_config: { max_output_tokens: maxOut(r), temperature: 0.3, ...r.extra }, store: false }),
                signal,
                cache: "no-store",
            });
        } else {
            const url = r.provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://integrate.api.nvidia.com/v1/chat/completions";
            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
                body: JSON.stringify({
                    model: r.model,
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                    [r.provider === "groq" ? "max_completion_tokens" : "max_tokens"]: maxOut(r),
                    temperature: 0.3,
                    ...r.extra,
                }),
                signal,
                cache: "no-store",
            });
        }
    } catch (e) {
        const name = (e as Error)?.name;
        return { ok: false, status: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network", message: String((e as Error)?.message ?? e).slice(0, 160) };
    }
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
        const err = (body?.error ?? body) as { message?: string } | string | null;
        const message = (typeof err === "string" ? err : (err?.message ?? JSON.stringify(err ?? {}))).slice(0, 300);
        const retryAfter = Number(res.headers.get("retry-after")) || undefined;
        // a day's limit: Gemini names it; Groq says so in its headers
        const daily = res.status === 429 && (/per ?day|daily|PerDay/i.test(message) || res.headers.get("x-ratelimit-remaining-requests") === "0");
        return { ok: false, status: res.status, message, retryAfter, daily };
    }
    let text = "";
    if (r.provider === "gemini") {
        const steps = (body?.steps ?? []) as { type?: string; content?: { type?: string; text?: string }[] }[];
        text = steps
            .filter((s) => s.type === "model_output")
            .flatMap((s) => s.content ?? [])
            .map((c) => c.text ?? "")
            .join("");
    } else {
        const choices = (body?.choices ?? []) as { message?: { content?: string } }[];
        text = choices[0]?.message?.content ?? "";
    }
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    return text ? { ok: true, text } : { ok: false, status: "empty", message: "no text" };
}

// ---- the chain ------------------------------------------------------------------

const HEDGE_AFTER = 3000;
const DEADLINE = 24000;

export type Answered = { text: string; route: Route; ms: number; tried: string[] };

/** An answer from the first route that gives one, or null if none did in time. */
export async function ask(system: string, user: string): Promise<Answered | null> {
    const routes = await available();
    const t0 = Date.now();
    const tried: string[] = [];
    const { day, left } = pacific();
    return new Promise((resolve) => {
        let next = 0;
        let running = 0;
        let done = false;
        const controllers: AbortController[] = [];
        const finish = (a: Answered | null) => {
            if (done) return;
            done = true;
            controllers.forEach((c) => c.abort());
            clearTimeout(overall);
            resolve(a);
        };
        const overall = setTimeout(() => finish(null), DEADLINE);
        const launch = () => {
            if (done) return;
            if (next >= routes.length) {
                if (running === 0) finish(null);
                return;
            }
            const r = routes[next++];
            running++;
            tried.push(r.id);
            const ctrl = new AbortController();
            controllers.push(ctrl);
            const stop = setTimeout(() => ctrl.abort(), r.timeout);
            // slow? start the next big-quota route alongside (two at most)
            const hedge = setTimeout(() => {
                if (!done && running < 2 && next < routes.length && routes[next].hedge) launch();
            }, HEDGE_AFTER);
            bump(countKey(r.id, day), left + 3600).catch(() => {});
            call(r, system, user, ctrl.signal).then((a) => {
                clearTimeout(stop);
                clearTimeout(hedge);
                running--;
                if (done) return;
                if (a.ok) {
                    finish({ text: a.text, route: r, ms: Date.now() - t0, tried });
                    return;
                }
                // rest it: until the quota resets for a day's limit, a moment for
                // a busy minute, a couple of minutes for an outage, hours for a
                // model or key that's gone wrong
                const s = a.status;
                const seconds = s === 429 ? (a.daily ? left : Math.min(300, Math.max(20, a.retryAfter ?? 60))) : s === "timeout" || s === "network" || s === "empty" || (typeof s === "number" && s >= 500) ? 120 : 6 * 3600;
                rest(r, seconds, `${s}`);
                console.warn(`mission-control: ${r.id} failed (${s}) ${a.message}`);
                launch();
            });
        };
        launch();
    });
}
