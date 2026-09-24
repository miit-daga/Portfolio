"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { trackEvent } from "@/lib/track";

// The arcade: two 3D games, each in its own chunk with three.js, loaded only
// when it is opened, so nothing here costs the rest of the site anything.
// ?game=run, ?game=stack or ?game=assist opens one straight away.

const AsteroidRun = dynamic(() => import("./asteroid-run"), { ssr: false, loading: () => <Loading /> });
const StackStation = dynamic(() => import("./stack-station"), { ssr: false, loading: () => <Loading /> });
const GravityAssist = dynamic(() => import("./gravity-assist"), { ssr: false, loading: () => <Loading /> });

function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
            <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-teal-300/80">Fuelling up…</p>
        </div>
    );
}

type Game = "run" | "stack" | "assist";
const GAMES: { id: Game; no: string; title: string; blurb: string; how: string; best: string; bestKey: string; hue: string }[] = [
    {
        id: "assist",
        no: "01",
        title: "Gravity Assist",
        blurb: "Send a probe from Earth to other worlds, bending its path round the planets on the way, and catch a moving one to be flung on faster, as Voyager was. Fifteen missions in the solar system, ISRO's Chandrayaan-3 and Mangalyaan among them, ten in deep space round black holes, and a mission of the day in the real sky.",
        how: "Drag back to aim, let go to launch · the same on a phone",
        best: "Stars",
        bestKey: "arcade-assist-stars",
        hue: "167,139,250",
    },
    {
        id: "run",
        no: "02",
        title: "Asteroid Run",
        blurb: "Fly through an asteroid field, dodge the rocks and grab the glowing fragments. Look out for shield rings, invincibility stars and boosts. It gets faster the longer you last.",
        how: "Arrows, WASD or the mouse · drag on a phone",
        best: "Best",
        bestKey: "arcade-run-best",
        hue: "45,212,191",
    },
    {
        id: "stack",
        no: "03",
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
        if (q === "run" || q === "stack" || q === "assist") {
            setGame(q);
            trackEvent("arcade_game_open", { game: q, via: "link" });
        }
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
        if (g) trackEvent("arcade_game_open", { game: g, via: "card" });
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
    if (game === "assist") return <GravityAssist onExit={() => open(null)} />;

    return (
        <section className="relative z-10 mx-auto grid w-full max-w-5xl gap-5 px-4 pb-10 md:grid-cols-2 md:px-6 lg:max-w-6xl lg:grid-cols-3">
            {GAMES.map((g) => (
                <button
                    key={g.id}
                    type="button"
                    onClick={() => open(g.id)}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 p-6 text-left transition-colors hover:border-[rgba(var(--hue),0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--hue),0.7)]"
                    style={{ ["--hue" as string]: g.hue }}
                >
                    {/* a glimpse of the game: a still from it */}
                    <div className="relative mb-6 h-40 overflow-hidden rounded-2xl bg-black" aria-hidden>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`/arcade/preview-${g.id}.webp`}
                            alt=""
                            width={960}
                            height={440}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
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
