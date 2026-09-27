"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// The time machine: how this site grew, one version at a time. Each stop is
// the whole page as it was (public/time-machine/*.jpg, stitched from
// screenshots of that version scrolled top to bottom, at 1440 wide), in a
// browser frame you can scroll inside, with what changed and a link to that
// version, still live on its own Vercel project. The bars over the slider
// are each version's page length, so the growth shows at a glance.
//
// The old versions are the last commit of each month that changed how the
// site looks (April and July 2025 changed only text, so they're left out).
// Their Next.js was updated from 15.2.4 to 15.2.8 to deploy (Vercel blocks
// the older, vulnerable one); nothing visible changed.

type Version = {
    id: string;
    month: string;
    title: string;
    /** the version's own live site, or null for today */
    url: string | null;
    host: string;
    commits: string;
    /** the page's length at 1440 px wide, for the bars */
    height: number;
    what: string;
};

const VERSIONS: Version[] = [
    {
        id: "2025-03",
        month: "Mar 2025",
        title: "First launch",
        url: "https://portfolio-march-2025-two.vercel.app",
        host: "portfolio-march-2025-two.vercel.app",
        commits: "9 commits, in a week",
        height: 4586,
        what: "A gradient hero, a short About, projects pulled live from GitHub, and the first publications.",
    },
    {
        id: "2025-05",
        month: "May 2025",
        title: "Work Experience",
        url: "https://portfolio-may-2025-eight.vercel.app",
        host: "portfolio-may-2025-eight.vercel.app",
        commits: "14 commits since",
        height: 5826,
        what: "The Work Experience timeline arrives, with publication cards that link out, social icons and a calmer gradient.",
    },
    {
        id: "2025-06",
        month: "Jun 2025",
        title: "The full picture",
        url: "https://portfolio-june-2025-ashen.vercel.app",
        host: "portfolio-june-2025-ashen.vercel.app",
        commits: "19 commits since",
        height: 9624,
        what: "Education, Skills & Achievements and a Contact section join; the site moves to Next.js 15 and gets tuned for phones.",
    },
    {
        id: "2025-08",
        month: "Aug 2025",
        title: "Ready for liftoff",
        url: "https://portfolio-august-2025.vercel.app",
        host: "portfolio-august-2025.vercel.app",
        commits: "7 commits since",
        height: 9764,
        what: "A launch screen with a rocket before the site, analytics, and a faster first paint.",
    },
    {
        id: "2025-11",
        month: "Nov 2025",
        title: "Into the cosmos",
        url: "https://portfolio-november-2025.vercel.app",
        host: "portfolio-november-2025.vercel.app",
        commits: "18 commits since",
        height: 9889,
        what: "A full redesign: a portrait in the hero, 3D interactions, terminal mode, the Big Crunch easter egg, a 404 game and a back-to-top rocket.",
    },
    {
        id: "now",
        month: "Today",
        title: "Mission control",
        url: null,
        host: "miitdaga.dev",
        commits: "251 commits since",
        height: 13653,
        what: "The crew arcade with three 3D games, Mission Control to ask about my work, live NASA data, the flight-path minimap, and research cards that explain themselves.",
    },
];
const TALLEST = Math.max(...VERSIONS.map((v) => v.height));

export function TimeMachine() {
    const [at, setAt] = useState(0);
    const v = VERSIONS[at];
    const screen = useRef<HTMLDivElement>(null);

    // a new version starts at its top; its neighbours load ahead of time
    useEffect(() => {
        screen.current?.scrollTo({ top: 0 });
        [at - 1, at + 1].forEach((i) => {
            if (VERSIONS[i]) new Image().src = `/time-machine/${VERSIONS[i].id}.jpg`;
        });
    }, [at]);
    // ← and → move through time from anywhere on the page (the slider itself handles them when focused)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
            if (e.key === "ArrowLeft") setAt((i) => Math.max(0, i - 1));
            if (e.key === "ArrowRight") setAt((i) => Math.min(VERSIONS.length - 1, i + 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 md:px-8">
            <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300">
                ← miitdaga.dev
            </Link>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Time machine</p>
            <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">How this site grew</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
                From its first launch in March 2025 to today, one version at a time. Drag through the months, scroll inside the screen, and open any version: they&apos;re all still live.
            </p>

            {/* the slider, with each version's page length as a bar */}
            <div className="mt-8">
                <div className="relative mx-3 flex h-16 items-end justify-between" aria-hidden>
                    {VERSIONS.map((x, i) => (
                        <button
                            key={x.id}
                            type="button"
                            tabIndex={-1}
                            onClick={() => setAt(i)}
                            title={`${x.month}: page ${x.height.toLocaleString("en-US")} px long`}
                            className={`w-3 rounded-t-sm transition-colors ${i <= at ? "bg-teal-300/70" : "bg-white/15 hover:bg-white/25"}`}
                            style={{ height: `${(x.height / TALLEST) * 100}%` }}
                        />
                    ))}
                </div>
                <input
                    type="range"
                    min={0}
                    max={VERSIONS.length - 1}
                    step={1}
                    value={at}
                    onChange={(e) => setAt(Number(e.target.value))}
                    aria-label="Version of the site"
                    aria-valuetext={`${v.month}: ${v.title}`}
                    className="mt-1 w-full cursor-pointer accent-teal-300"
                />
                <div className="mx-3 mt-1 flex justify-between">
                    {VERSIONS.map((x, i) => (
                        <button
                            key={x.id}
                            type="button"
                            onClick={() => setAt(i)}
                            // (the ends pinned to the edges, the rest centred on their bars; on a phone only the ends and the one selected are named)
                            className={`flex w-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] transition-colors sm:text-[11px] ${i === 0 ? "justify-start" : i === VERSIONS.length - 1 ? "justify-end" : "justify-center"} ${i === at ? "text-teal-200" : "text-neutral-500 hover:text-neutral-300"}`}
                        >
                            <span className={i !== 0 && i !== at && i !== VERSIONS.length - 1 ? "hidden sm:inline" : ""}>{x.month}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* what changed */}
            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                        {v.month} · {v.commits}
                    </p>
                    <h2 className="font-display mt-1 text-2xl font-bold">{v.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-300 md:text-base">{v.what}</p>
                </div>
                {v.url ? (
                    <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-full border border-teal-300/40 px-4 py-2 text-sm text-teal-100 transition-colors hover:border-teal-300/80 hover:bg-teal-300/10"
                    >
                        Open this version ↗
                    </a>
                ) : (
                    <Link href="/" className="shrink-0 rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-teal-300">
                        You&apos;re here: back to the site
                    </Link>
                )}
            </div>

            {/* the page as it was, in a browser frame */}
            <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-[0_0_40px_rgba(45,212,191,0.08)]">
                <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="flex gap-1.5" aria-hidden>
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                    </span>
                    <span className="min-w-0 flex-1 truncate rounded-md bg-black/40 px-3 py-1 font-mono text-[11px] text-neutral-400">{v.host}</span>
                </div>
                <div ref={screen} className="h-[62vh] overflow-y-auto overscroll-contain md:h-[68vh]">
                    {/* (a plain img: each is already sized for this frame, and a stitched page is too tall for the image optimiser) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img key={v.id} src={`/time-machine/${v.id}.jpg`} alt={`miitdaga.dev in ${v.month}, the whole page top to bottom`} className="block w-full animate-in fade-in duration-500" />
                </div>
            </div>
            <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Scroll inside the screen to see the whole page · ← → to move through time</p>
        </div>
    );
}
