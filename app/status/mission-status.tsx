"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Status } from "@/app/api/status/route";

// Mission status: the machinery behind the site, live (app/api/status). The
// models behind Mission Control and how much of each one's free day is used,
// Redis, the outside feeds, and the site's own APIs timed from the visitor's
// browser; with the last 24 hours of response times. Refreshes every 30
// seconds while open.

// the site's own endpoints, timed from here (each a light, read-only call)
const PROBES = [
    { path: "/api/dsn", name: "Deep Space Network", what: "the live DSN card" },
    { path: "/api/iss-pass?lat=22.57&lon=88.36", name: "ISS pass", what: "the ISS card" },
    { path: "/api/space-today", name: "Today in space", what: "the arcade's daily games" },
    { path: "/api/github-repos", name: "Projects", what: "the Projects section" },
    { path: "/api/guestbook?limit=1", name: "Guestbook", what: "the radar's signatures" },
];

const dot = (ok: boolean | null) => (ok === null ? "bg-neutral-600" : ok ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]");
const ms = (n: number | null) => (n === null ? "·" : `${n} ms`);

const ago = (t: number) => {
    const m = Math.round((Date.now() - t) / 60_000);
    return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
/** What's actually known about a model's health: when it last answered, or that it hasn't been tried. */
const lastSeen = (m: Status["models"][number]) => (m.lastAnswered ? `last answered ${ago(m.lastAnswered)}` : m.used ? "tried today, no answer yet" : "not tried today");

/** A model's state in words, from why it's resting. */
function modelState(m: Status["models"][number]) {
    if (!m.keyed) return { label: "no key", tone: "text-neutral-500", ok: null };
    if (m.used >= m.cap) return { label: "out for today", tone: "text-amber-300", ok: false };
    if (m.resting) {
        const left = m.restLeft ? (m.restLeft > 3600 ? `${Math.round(m.restLeft / 3600)} h` : m.restLeft > 90 ? `${Math.round(m.restLeft / 60)} min` : `${m.restLeft} s`) : "";
        const why = m.resting === "429" ? "rate-limited" : m.resting === "timeout" ? "slow" : /^5/.test(m.resting) ? "busy upstream" : m.resting === "empty" ? "empty answer" : `error ${m.resting}`;
        return { label: `resting${left ? ` ${left}` : ""} · ${why}`, tone: "text-amber-300", ok: false };
    }
    // (ready: keyed, not resting, under its cap. Not a live check: see lastSeen)
    return { label: "ready", tone: "text-emerald-300", ok: true };
}

/** The last 24 hours of one response time, as a small line. */
function Spark({ points }: { points: (number | null)[] }) {
    const vals = points.filter((p): p is number => p !== null);
    if (vals.length < 2) return <span className="font-mono text-[10px] text-neutral-600">collecting…</span>;
    const max = Math.max(...vals, 1);
    const w = 120;
    const h = 24;
    const step = w / Math.max(1, points.length - 1);
    const d = points
        .map((p, i) => (p === null ? null : `${(i * step).toFixed(1)},${(h - (p / max) * (h - 2) - 1).toFixed(1)}`))
        .filter(Boolean)
        .join(" ");
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-[120px]" aria-hidden>
            <polyline points={d} fill="none" stroke="rgb(94 234 212)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

export function MissionStatus() {
    const [s, setS] = useState<Status | null>(null);
    const [failed, setFailed] = useState(false);
    const [probes, setProbes] = useState<Record<string, { ok: boolean; ms: number } | null>>({});

    const load = useCallback(() => {
        fetch("/api/status", { cache: "no-store" })
            .then((r) => (r.ok ? (r.json() as Promise<Status>) : Promise.reject()))
            .then((d) => (setS(d), setFailed(false)))
            .catch(() => setFailed(true));
        // the site's own APIs, one after another so they don't slow each other
        (async () => {
            for (const p of PROBES) {
                const t0 = performance.now();
                try {
                    const r = await fetch(p.path, { cache: "no-store" });
                    await r.arrayBuffer();
                    setProbes((x) => ({ ...x, [p.path]: { ok: r.ok, ms: Math.round(performance.now() - t0) } }));
                } catch {
                    setProbes((x) => ({ ...x, [p.path]: { ok: false, ms: Math.round(performance.now() - t0) } }));
                }
            }
        })();
    }, []);
    useEffect(() => {
        load();
        const id = window.setInterval(() => !document.hidden && load(), 30_000);
        return () => window.clearInterval(id);
    }, [load]);

    const keyedModels = s?.models.filter((m) => m.keyed) ?? [];
    const upModels = keyedModels.filter((m) => modelState(m).ok).length;
    const feedsDown = s?.feeds.filter((f) => !f.check.ok) ?? [];
    const probesDown = PROBES.filter((p) => probes[p.path] && !probes[p.path]!.ok);
    const allGood = s && s.redis.ok && upModels > 0 && !feedsDown.length && !probesDown.length;

    return (
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 md:px-8">
            <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300">
                ← miitdaga.dev
            </Link>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Mission status</p>
            <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">The machinery behind this site</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
                Live: the AI models behind Mission Control, the database, and the NASA and space feeds the live cards use. It refreshes every 30 seconds.
            </p>

            {/* the summary */}
            <div className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border px-5 py-4 ${!s ? "border-white/10" : allGood ? "border-emerald-400/30 bg-emerald-400/[0.04]" : "border-amber-300/30 bg-amber-300/[0.04]"}`}>
                <p className="flex items-center gap-3 text-lg font-semibold">
                    <span className={`h-2.5 w-2.5 rounded-full ${dot(s ? !!allGood : null)}`} />
                    {failed ? "Couldn't reach the status check" : !s ? "Checking the systems…" : allGood ? "All systems nominal" : "Some systems degraded"}
                </p>
                {s && (
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400">
                        {upModels} of {keyedModels.length} models ready · {s.aboard ?? "·"} {s.aboard === 1 ? "explorer" : "explorers"} aboard · {s.crashesToday ?? "·"} crash {s.crashesToday === 1 ? "report" : "reports"} today
                    </p>
                )}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Mission Control's models */}
                <section className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-400">Mission Control&apos;s models</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                        Tried in this order; a busy one rests and the next answers. &quot;Ready&quot; means no recent failure, not a live test: the first few answer nearly every question, so the rest are tried only when those are busy. The bar is today&apos;s share of its free quota.
                    </p>
                    <ul className="mt-4 space-y-2.5">
                        {(s?.models ?? []).map((m) => {
                            const st = modelState(m);
                            return (
                                <li key={m.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-sm">
                                    <span className={`h-2 w-2 rounded-full ${dot(st.ok)}`} />
                                    <span className="min-w-0">
                                        <span className="block truncate text-neutral-200">
                                            {m.label} <span className="text-xs text-neutral-500">· {lastSeen(m)}</span>
                                        </span>
                                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                            <span className="block h-full rounded-full bg-teal-300/70" style={{ width: `${Math.min(100, (m.used / m.cap) * 100)}%` }} />
                                        </span>
                                    </span>
                                    <span className={`text-right font-mono text-[10px] uppercase tracking-[0.1em] ${st.tone}`}>
                                        {st.label}
                                        <span className="block text-neutral-600">
                                            {m.used.toLocaleString("en-US")} / {m.cap.toLocaleString("en-US")}
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <div className="space-y-6">
                    {/* Redis and the feeds */}
                    <section className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
                        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-400">Database and feeds</h2>
                        <ul className="mt-4 space-y-3">
                            {s && (
                                <li className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 text-sm">
                                    <span className={`mt-1.5 h-2 w-2 rounded-full ${dot(s.redis.ok)}`} />
                                    <span>
                                        <span className="text-neutral-200">Redis (Upstash)</span>
                                        <span className="block text-xs text-neutral-500">{s.redis.ok ? `${s.redis.keys} keys · leaderboards, guestbook, counters` : s.redis.note}</span>
                                    </span>
                                    <span className="font-mono text-xs text-neutral-300">{ms(s.redis.ms)}</span>
                                </li>
                            )}
                            {(s?.feeds ?? []).map((f) => (
                                <li key={f.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 text-sm">
                                    <span className={`mt-1.5 h-2 w-2 rounded-full ${dot(f.check.ok)}`} />
                                    <span className="min-w-0">
                                        <span className="text-neutral-200">{f.name}</span>
                                        <span className="block text-xs text-neutral-500">
                                            {f.check.note} · for {f.what}
                                        </span>
                                    </span>
                                    <span className="font-mono text-xs text-neutral-300">{ms(f.check.ms)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* the site's own APIs, from here */}
                    <section className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
                        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-400">This site&apos;s APIs, timed from your browser</h2>
                        <ul className="mt-4 space-y-2.5">
                            {PROBES.map((p) => {
                                const r = probes[p.path];
                                return (
                                    <li key={p.path} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-sm">
                                        <span className={`h-2 w-2 rounded-full ${dot(r ? r.ok : null)}`} />
                                        <span className="min-w-0 truncate">
                                            <span className="text-neutral-200">{p.name}</span> <span className="text-xs text-neutral-500">· {p.what}</span>
                                        </span>
                                        <span className="font-mono text-xs text-neutral-300">{r ? `${r.ms} ms` : "·"}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    {/* the last 24 hours */}
                    <section className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
                        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-400">Response times, last 24 hours</h2>
                        <ul className="mt-4 space-y-2">
                            {(
                                [
                                    ["redis", "Redis"],
                                    ["dsn", "Deep Space Network"],
                                    ["iss", "ISS position"],
                                    ["github", "GitHub API"],
                                ] as const
                            ).map(([k, name]) => {
                                const pts = s?.history.map((h) => h[k]) ?? [];
                                const vals = pts.filter((p): p is number => p !== null).sort((a, b) => a - b);
                                const median = vals.length ? vals[Math.floor(vals.length / 2)] : null;
                                return (
                                    <li key={k} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-sm">
                                        <span className="text-neutral-300">{name}</span>
                                        <Spark points={pts} />
                                        <span className="w-16 text-right font-mono text-[10px] text-neutral-500">{median !== null ? `~${median} ms` : ""}</span>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-600">A check every few minutes while anyone has this page open</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
