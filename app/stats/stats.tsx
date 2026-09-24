"use client";
import { useEffect, useState } from "react";

// The tally, read with the admin key (kept for this tab only, in
// sessionStorage, never sent anywhere but /api/tally)
type Tally = { days: Record<string, Record<string, number>> };
type Problems = { days: Record<string, Record<string, number>>; latest: { at: string; game: string; kind: string; message: string; browser: string }[] };
const GAME_NAME: Record<string, string> = {
    assist: "Gravity Assist",
    run: "Asteroid Run",
    stack: "Stack the Station",
    arcade: "Arcade page",
    home: "Home page",
    desk: "Terminal desk",
    terminal: "Terminal",
    resume: "Resume",
    stats: "Stats",
    page: "Other page",
};
const KIND_NAME: Record<string, string> = {
    crash: "crashed",
    "no-webgl": "no 3D graphics",
    "load-failed": "code failed to load",
    error: "error",
    rejection: "error",
    "stuck-loading": "stuck loading",
};
const KEY = "stats-admin-key";
const DAYS = 14;

const GROUPS: { title: string; prefix: string; label?: (v: string) => string }[] = [
    { title: "Came to the arcade from", prefix: "arcade_link:from=" },
    { title: "Games opened", prefix: "arcade_game_open:game=", label: (v) => ({ run: "Asteroid Run", stack: "Stack the Station", assist: "Gravity Assist" })[v] ?? v },
    { title: "Gravity Assist missions arrived", prefix: "gravity_assist_arrived:mission=", label: (v) => `Mission ${v}` },
];
const SINGLES: [string, string][] = [
    ["asteroid_run_over", "Asteroid Runs played to the end"],
    ["stack_station_over", "Stations built to the end"],
    ["gravity_assist_daily", "Today's sky arrivals"],
];

export function Stats() {
    const [key, setKey] = useState("");
    const [tally, setTally] = useState<Tally | null>(null);
    const [problems, setProblems] = useState<Problems | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = async (k: string) => {
        setBusy(true);
        setError(null);
        try {
            const r = await fetch("/api/tally", { headers: { "x-admin-key": k }, cache: "no-store" });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error || "Rejected.");
            setTally(d);
            fetch("/api/errors", { headers: { "x-admin-key": k }, cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((p) => setProblems(p))
                .catch(() => setProblems(null));
            try {
                sessionStorage.setItem(KEY, k);
            } catch {
                /* ignore */
            }
        } catch (e) {
            setTally(null);
            setError(e instanceof Error ? e.message : "Rejected.");
        } finally {
            setBusy(false);
        }
    };
    useEffect(() => {
        try {
            const k = sessionStorage.getItem(KEY);
            if (k) load(k);
        } catch {
            /* ignore */
        }
    }, []);

    const days = Array.from({ length: DAYS }, (_, i) => new Date(Date.now() - (DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10));
    const count = (k: string, d?: string) => (d ? (tally?.days[d]?.[k] ?? 0) : days.reduce((n, dd) => n + (tally?.days[dd]?.[k] ?? 0), 0));
    const keysWith = (prefix: string) => [...new Set(days.flatMap((d) => Object.keys(tally?.days[d] ?? {}).filter((k) => k.startsWith(prefix))))];

    return (
        <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Private</p>
            <h1 className="font-display mt-1 text-3xl font-bold">The arcade, counted</h1>
            <p className="mt-2 text-sm text-neutral-400">The last {DAYS} days, by the site&apos;s own tally. Page views are in Vercel Analytics.</p>

            {!tally && (
                <form
                    className="mt-6 flex max-w-sm gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        load(key);
                    }}
                >
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="Admin key"
                        aria-label="Admin key"
                        autoComplete="current-password"
                        className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm focus:border-teal-300/60 focus:outline-none"
                    />
                    <button type="submit" disabled={busy || !key} className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50">
                        {busy ? "…" : "Open"}
                    </button>
                </form>
            )}
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

            {tally && (
                <div className="mt-8 space-y-8">
                    {/* the day-by-day of games opened */}
                    <section>
                        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Games opened, day by day</h2>
                        <div className="mt-3 flex h-28 items-end gap-1">
                            {days.map((d) => {
                                const n = count("arcade_game_open", d);
                                const max = Math.max(1, ...days.map((dd) => count("arcade_game_open", dd)));
                                return (
                                    <div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${d}: ${n}`}>
                                        <span className="font-mono text-[10px] text-neutral-500">{n || ""}</span>
                                        <div className="w-full rounded-t bg-teal-400/70" style={{ height: `${(n / max) * 80}px`, minHeight: n ? 2 : 0 }} />
                                        <span className="font-mono text-[9px] text-neutral-600">{d.slice(8)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-3">
                        {SINGLES.map(([k, label]) => (
                            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                <p className="font-display text-3xl font-bold">{count(k)}</p>
                                <p className="mt-1 text-xs text-neutral-400">{label}</p>
                            </div>
                        ))}
                    </section>

                    {/* what went wrong, from the arcade's own reports */}
                    <section>
                        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Problems, last 14 days</h2>
                        {(() => {
                            const totals = new Map<string, number>();
                            for (const d of Object.values(problems?.days ?? {})) for (const [k, n] of Object.entries(d)) totals.set(k, (totals.get(k) ?? 0) + n);
                            const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
                            if (!problems) return <p className="mt-2 text-sm text-neutral-500">Couldn&apos;t read the reports.</p>;
                            if (!rows.length) return <p className="mt-2 text-sm text-emerald-300/80">None reported. All clear.</p>;
                            return (
                                <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-rose-300/20">
                                    {rows.map(([k, n]) => {
                                        const [game, kind, message, browser] = k.split("|");
                                        return (
                                            <li key={k} className="flex items-start justify-between gap-4 px-4 py-2 text-sm">
                                                <span className="min-w-0">
                                                    <span className="text-rose-200">{GAME_NAME[game] ?? game}: {KIND_NAME[kind] ?? kind}</span>
                                                    <span className="block truncate font-mono text-xs text-neutral-400" title={message}>
                                                        {message}
                                                    </span>
                                                    <span className="block text-xs text-neutral-500">{browser}</span>
                                                </span>
                                                <span className="font-mono text-neutral-300">{n}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            );
                        })()}
                        {!!problems?.latest.length && (
                            <details className="mt-2 text-xs text-neutral-400">
                                <summary className="cursor-pointer">Latest {Math.min(10, problems.latest.length)}, with times</summary>
                                <ul className="mt-1 space-y-1 font-mono">
                                    {problems.latest.slice(0, 10).map((e, i) => (
                                        <li key={i}>
                                            {new Date(e.at).toLocaleString()} · {GAME_NAME[e.game] ?? e.game} · {KIND_NAME[e.kind] ?? e.kind} · {e.browser}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </section>

                    {GROUPS.map((g) => {
                        const ks = keysWith(g.prefix).sort((a, b) => count(b) - count(a));
                        return (
                            <section key={g.prefix}>
                                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">{g.title}</h2>
                                {ks.length ? (
                                    <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
                                        {ks.map((k) => {
                                            const v = k.slice(g.prefix.length);
                                            return (
                                                <li key={k} className="flex justify-between px-4 py-2 text-sm">
                                                    <span className="text-neutral-200">{g.label ? g.label(v) : v}</span>
                                                    <span className="font-mono text-neutral-400">{count(k)}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-sm text-neutral-500">Nothing yet.</p>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
