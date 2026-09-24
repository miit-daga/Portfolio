"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The arcade: two 3D games, each in its own chunk with three.js, loaded only
// when it is opened, so nothing here costs the rest of the site anything.
// ?game=run or ?game=dock opens one straight away (the command menu does).

const AsteroidRun = dynamic(() => import("./asteroid-run"), { ssr: false, loading: () => <Loading /> });
const IssDock = dynamic(() => import("./iss-dock"), { ssr: false, loading: () => <Loading /> });

function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
            <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-teal-300/80">Fuelling up…</p>
        </div>
    );
}

type Game = "run" | "dock";
const GAMES: { id: Game; no: string; title: string; blurb: string; how: string; best: string; bestKey: string; hue: string }[] = [
    {
        id: "run",
        no: "01",
        title: "Asteroid Run",
        blurb: "Fly through an asteroid field, dodge the rocks and grab the glowing fragments. A rare blue ring restores a lost shield. It gets faster the longer you last.",
        how: "Arrows, WASD or the mouse · drag on a phone",
        best: "Best",
        bestKey: "arcade-run-best",
        hue: "45,212,191",
    },
    {
        id: "dock",
        no: "02",
        title: "Dock with the ISS",
        blurb: "Pilot a capsule to the station's forward port. Line up, close in gently, and don't run out of fuel. Newton does not forgive.",
        how: "WASD to the sides, E and Q to close · thrusters on screen on a phone",
        best: "Best score",
        bestKey: "arcade-dock-best",
        hue: "251,191,36",
    },
];

export function Arcade() {
    const [game, setGame] = useState<Game | null>(null);
    const [bests, setBests] = useState<Record<string, string | null>>({});

    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get("game");
        if (q === "run" || q === "dock") setGame(q);
    }, []);
    // the scores, read again each time a game is closed
    useEffect(() => {
        if (game) return;
        try {
            setBests(Object.fromEntries(GAMES.map((g) => [g.id, localStorage.getItem(g.bestKey)])));
        } catch {
            /* ignore */
        }
    }, [game]);
    const open = (g: Game | null) => {
        setGame(g);
        window.history.replaceState(null, "", g ? `/arcade?game=${g}` : "/arcade");
    };
    // Esc leaves a game for the arcade
    useEffect(() => {
        if (!game) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && open(null);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [game]);

    if (game === "run") return <AsteroidRun onExit={() => open(null)} />;
    if (game === "dock") return <IssDock onExit={() => open(null)} />;

    return (
        <section className="relative z-10 mx-auto grid w-full max-w-5xl gap-5 px-4 pb-10 md:grid-cols-2 md:px-6">
            {GAMES.map((g) => (
                <button
                    key={g.id}
                    type="button"
                    onClick={() => open(g.id)}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 p-6 text-left transition-colors hover:border-[rgba(var(--hue),0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--hue),0.7)]"
                    style={{ ["--hue" as string]: g.hue }}
                >
                    {/* a glimpse of the game */}
                    <div className="relative mb-6 h-40 overflow-hidden rounded-2xl bg-black" aria-hidden>
                        {g.id === "run" ? <RunPreview /> : <DockPreview />}
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: `rgb(${g.hue})` }}>
                        Game {g.no} · 3D
                    </p>
                    <h2 className="font-display mt-2 text-2xl font-bold text-white">{g.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-300">{g.blurb}</p>
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500">{g.how}</p>
                    <div className="mt-5 flex items-center justify-between">
                        <span className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-950 transition-transform group-hover:scale-105" style={{ background: `rgb(${g.hue})` }}>
                            Play
                        </span>
                        {bests[g.id] && (
                            <span className="font-mono text-xs text-neutral-400">
                                {g.best} {Number(bests[g.id]).toLocaleString()}
                            </span>
                        )}
                    </div>
                </button>
            ))}
        </section>
    );
}

// Previews in CSS: streaking stars and rocks for the run, the port's cross for the dock
function RunPreview() {
    return (
        <>
            {Array.from({ length: 18 }, (_, i) => (
                <span
                    key={i}
                    className="absolute left-1/2 top-1/2 block h-px w-10 origin-left animate-[arcade-streak_1.6s_linear_infinite] bg-gradient-to-r from-transparent to-white motion-reduce:animate-none"
                    style={{ rotate: `${(i * 360) / 18}deg`, animationDelay: `${(i % 6) * -0.27}s` }}
                />
            ))}
            <span className="absolute left-[30%] top-[35%] block h-6 w-7 rounded-[40%_55%_45%_60%] bg-stone-500" />
            <span className="absolute right-[26%] top-[55%] block h-9 w-8 rounded-[55%_40%_60%_45%] bg-stone-600" />
            <span className="absolute left-1/2 top-[62%] block h-0 w-0 -translate-x-1/2 border-x-[14px] border-b-[22px] border-x-transparent border-b-slate-200" />
        </>
    );
}
function DockPreview() {
    return (
        <>
            <div className="absolute inset-x-0 bottom-[-60%] h-[90%] rounded-[50%] bg-gradient-to-b from-sky-500/60 to-blue-900" />
            <div className="absolute left-1/2 top-[40%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-slate-400 bg-slate-200/90">
                <span className="absolute left-1/2 top-1/2 h-6 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-slate-800" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 bg-slate-800" />
            </div>
            <span className="absolute left-[8%] top-[34%] block h-3 w-[28%] bg-amber-600/80" />
            <span className="absolute right-[8%] top-[34%] block h-3 w-[28%] bg-amber-600/80" />
            <div className="absolute left-1/2 top-[40%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/70" />
        </>
    );
}
