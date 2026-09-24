"use client";
import { trackEvent } from "@/lib/track";

// A slim card between the sections pointing to the crew arcade (app/arcade):
// a line on what it is, and a still from each game, each opening that game.
// The stills are the arcade cards' own, small and loaded only as it nears view.

const GAMES = [
    { id: "assist", title: "Gravity Assist", hue: "167,139,250" },
    { id: "run", title: "Asteroid Run", hue: "45,212,191" },
    { id: "stack", title: "Stack the Station", hue: "251,191,36" },
];

export function ArcadeTeaser() {
    return (
        <aside aria-label="The crew arcade" className="relative z-10 mx-auto my-4 w-full max-w-5xl px-4 md:my-8 md:px-10">
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-neutral-950/60 p-4 backdrop-blur-sm sm:p-5 md:flex-row md:items-center md:gap-6">
                <div className="md:w-64 md:shrink-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Off duty · crew arcade</p>
                    <p className="font-display mt-1.5 text-xl font-bold leading-snug text-white">Three space games, built for this site</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">Real NASA skies and planets, right in the browser. Slingshot a probe, fly, or build.</p>
                    <a
                        href="/arcade"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent("arcade_link", { from: "teaser" })}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-400 px-4 py-1.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-teal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                        ▶ Open the arcade
                    </a>
                </div>
                <div className="grid flex-1 grid-cols-3 gap-2 sm:gap-3">
                    {GAMES.map((g) => (
                        <a
                            key={g.id}
                            href={`/arcade?game=${g.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEvent("arcade_link", { from: "teaser", game: g.id })}
                            aria-label={`Play ${g.title}`}
                            className="group block focus:outline-none"
                            style={{ ["--hue" as string]: g.hue }}
                        >
                            <span className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-black transition-colors group-hover:border-[rgba(var(--hue),0.6)] group-focus-visible:border-[rgba(var(--hue),0.9)]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`/arcade/preview-${g.id}.webp`}
                                    alt=""
                                    width={960}
                                    height={440}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none"
                                />
                            </span>
                            <span className="mt-1.5 block font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-neutral-400 transition-colors group-hover:text-white sm:text-[11px] sm:tracking-[0.15em]">
                                {g.title}
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </aside>
    );
}
