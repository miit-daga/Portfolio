"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// The time machine: how this site grew, one version at a time. Each stop runs
// that version live, in a browser frame (each is still deployed, on its own
// Vercel project): only the one selected loads, at a desktop's 1440 px width
// scaled to fit (on a phone, at the phone's own width, as it looked there).
// A still of its first screen (public/time-machine/*.jpg) shows until it has
// loaded. With it, what changed and a link to open it. The bars over the
// slider are each version's page length, so the growth shows at a glance.
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
    /** what the frame loads */
    frame: string;
    /** a word on getting past its launch screen, if it has one */
    hint?: string;
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
        frame: "https://portfolio-march-2025-two.vercel.app",
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
        frame: "https://portfolio-may-2025-eight.vercel.app",
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
        frame: "https://portfolio-june-2025-ashen.vercel.app",
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
        frame: "https://portfolio-august-2025.vercel.app",
        hint: "Click Blast off to enter",
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
        frame: "https://portfolio-november-2025.vercel.app",
        hint: "Click Begin journey to enter",
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
        // (the terminal's embed mode: straight to the site, past the entry screen)
        frame: "/?embed=1",
        host: "miitdaga.dev",
        commits: "251 commits since",
        height: 13653,
        what: "The crew arcade with three 3D games, Mission Control to ask about my work, live NASA data, the flight-path minimap, and research cards that explain themselves.",
    },
];
const TALLEST = Math.max(...VERSIONS.map((v) => v.height));
const DESKTOP = 1440;

/** One version, running live, sized as a desktop would see it (or a phone, on a phone). */
function LiveScreen({ v }: { v: Version }) {
    const box = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const el = box.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    // on a phone, the version as it looked on a phone; otherwise a desktop's width, scaled down
    const phone = size.w > 0 && size.w < 700;
    const scale = phone || !size.w ? 1 : size.w / DESKTOP;
    const width = phone ? size.w : DESKTOP;
    const height = size.h / scale;
    return (
        <div ref={box} className="relative h-[62vh] overflow-hidden bg-black md:h-[68vh]">
            {size.w > 0 && (
                <iframe
                    src={v.frame}
                    title={`miitdaga.dev as it was in ${v.month}, running live`}
                    onLoad={() => window.setTimeout(() => setLoaded(true), 700)}
                    className="absolute left-0 top-0 origin-top-left border-0"
                    style={{ width, height, transform: `scale(${scale})` }}
                />
            )}
            {/* its first screen, until the live version has loaded */}
            <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${loaded ? "opacity-0" : "opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {!phone && <img src={`/time-machine/${v.id}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}
                <p className="relative animate-pulse rounded-full bg-black/70 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-teal-200 backdrop-blur">Loading {v.month}…</p>
            </div>
        </div>
    );
}

/** A slim arrow in the page's margin to the version before or after, its month beside it (wide screens). */
function Neighbour({ side, v, onGo }: { side: "left" | "right"; v: Version | undefined; onGo: () => void }) {
    if (!v) return null;
    return (
        <button
            type="button"
            onClick={onGo}
            aria-label={`${side === "left" ? "Earlier" : "Later"}: ${v.month}`}
            className={`group fixed top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 text-neutral-500 transition-colors hover:text-teal-300 xl:flex ${side === "left" ? "left-8 2xl:left-14" : "right-8 2xl:right-14"}`}
        >
            <svg
                width="18"
                height="34"
                viewBox="0 0 18 34"
                fill="none"
                aria-hidden
                className={`transition-transform duration-200 ${side === "left" ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`}
            >
                <path d={side === "left" ? "M15 2 3 17l12 15" : "M3 2l12 15L3 32"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{v.month}</span>
        </button>
    );
}

export function TimeMachine() {
    const [at, setAt] = useState(0);
    const v = VERSIONS[at];

    // the neighbours' stills load ahead, so moving along shows something at once
    useEffect(() => {
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
            {/* to the version before or after: arrows in the margins */}
            <Neighbour side="left" v={VERSIONS[at - 1]} onGo={() => setAt(at - 1)} />
            <Neighbour side="right" v={VERSIONS[at + 1]} onGo={() => setAt(at + 1)} />
            <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300">
                ← miitdaga.dev
            </Link>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Time machine</p>
            <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">How this site grew</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
                From its first launch in March 2025 to today, one version at a time. Drag through the months: each one runs live below, so scroll it, click around, play with it.
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

            {/* the same, on a narrower screen, where the margins are too thin for the arrows */}
            <div className="mt-5 flex justify-between gap-3 xl:hidden">
                {VERSIONS[at - 1] ? (
                    <button type="button" onClick={() => setAt(at - 1)} className="rounded-full border border-teal-300/30 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-teal-100 transition-colors hover:border-teal-300/70">
                        ‹ {VERSIONS[at - 1].month}
                    </button>
                ) : (
                    <span />
                )}
                {VERSIONS[at + 1] && (
                    <button type="button" onClick={() => setAt(at + 1)} className="rounded-full border border-teal-300/30 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-teal-100 transition-colors hover:border-teal-300/70">
                        {VERSIONS[at + 1].month} ›
                    </button>
                )}
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
                    {v.hint && <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-200/80 sm:inline">{v.hint}</span>}
                </div>
                {/* (keyed, so moving on starts the next version fresh, and only one runs at a time) */}
                <LiveScreen key={v.id} v={v} />
            </div>
            <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Each version runs live · scroll and click inside it<span className="hidden sm:inline"> · ← → to move through time</span></p>
        </div>
    );
}
