import type { Metadata } from "next";
import { CloseButton } from "../resume/close-button";
import { Arcade } from "./arcade";

export const metadata: Metadata = {
    title: "Arcade",
    description: "Two small 3D space games: Asteroid Run, and Stack the Station.",
    alternates: { canonical: "/arcade" },
};

// A fixed sky, the same on the server and in the browser
const STARS = (() => {
    let seed = 20260924;
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
    return Array.from({ length: 90 }, () => ({ x: rand() * 100, y: rand() * 100, s: rand() < 0.12 ? 2 : 1, o: 0.25 + rand() * 0.6 }));
})();

export default function ArcadePage() {
    return (
        <main className="relative flex min-h-dvh flex-col bg-black text-white">
            <div aria-hidden className="pointer-events-none fixed inset-0">
                {STARS.map((s, i) => (
                    <span key={i} className="absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o }} />
                ))}
            </div>
            <header className="relative z-10 mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pb-6 pt-6 md:px-6">
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Crew arcade</p>
                    <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Miit Daga · Arcade</h1>
                </div>
                <CloseButton className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white" />
            </header>
            <Arcade />
        </main>
    );
}
