"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The arcade: two 3D games, each in its own chunk with three.js, loaded only
// when it is opened, so nothing here costs the rest of the site anything.
// ?game=run or ?game=stack opens one straight away (the command menu does).

const AsteroidRun = dynamic(() => import("./asteroid-run"), { ssr: false, loading: () => <Loading /> });
const StackStation = dynamic(() => import("./stack-station"), { ssr: false, loading: () => <Loading /> });

function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
            <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-teal-300/80">Fuelling up…</p>
        </div>
    );
}

type Game = "run" | "stack";
const GAMES: { id: Game; no: string; title: string; blurb: string; how: string; best: string; bestKey: string; hue: string }[] = [
    {
        id: "run",
        no: "01",
        title: "Asteroid Run",
        blurb: "Fly through an asteroid field, dodge the rocks and grab the glowing fragments. Look out for shield rings, invincibility stars and boosts. It gets faster the longer you last.",
        how: "Arrows, WASD or the mouse · drag on a phone",
        best: "Best",
        bestKey: "arcade-run-best",
        hue: "45,212,191",
    },
    {
        id: "stack",
        no: "02",
        title: "Stack the Station",
        blurb: "Build a space station above the Earth, one module at a time. Whatever hangs over the edge is sliced off, so line them up. Land one exactly for a Perfect.",
        how: "Space, Enter or click · tap on a phone",
        best: "Tallest",
        bestKey: "arcade-stack-best",
        hue: "251,191,36",
    },
];

export function Arcade() {
    const [game, setGame] = useState<Game | null>(null);
    const [bests, setBests] = useState<Record<string, string | null>>({});

    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get("game");
        // (the docking game this replaced was ?game=dock)
        if (q === "run" || q === "stack") setGame(q);
        else if (q === "dock") {
            setGame("stack");
            window.history.replaceState(null, "", "/arcade?game=stack");
        }
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
    if (game === "stack") return <StackStation onExit={() => open(null)} />;

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
                        {g.id === "run" ? <RunPreview /> : <StackPreview />}
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

// Previews in CSS: streaking stars and rocks for the run, and for the stack, modules over the Earth
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
function StackPreview() {
    // a few modules, narrowing as they go up, and one sliding in
    const mods = [
        { w: 46, x: 0, c: "#e9e6df" },
        { w: 42, x: 2, c: "#b9bec6" },
        { w: 38, x: 3, c: "#e9e6df" },
        { w: 34, x: 1, c: "#d9a441" },
    ];
    return (
        <>
            <div className="absolute inset-x-0 bottom-[-70%] h-[100%] rounded-[50%] bg-gradient-to-b from-sky-500/50 to-blue-900" />
            {mods.map((m, i) => (
                <span key={i} className="absolute left-1/2 block h-4 rounded-[3px]" style={{ width: `${m.w}%`, bottom: `${22 + i * 15}%`, marginLeft: `${-m.w / 2 + m.x}%`, background: m.c }} />
            ))}
            <span className="absolute left-1/2 block h-4 w-[34%] animate-[arcade-slide_2.4s_ease-in-out_infinite_alternate] rounded-[3px] bg-slate-300 motion-reduce:animate-none" style={{ bottom: `${22 + 4 * 15}%`, marginLeft: "-17%" }} />
        </>
    );
}
