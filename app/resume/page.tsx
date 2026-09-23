import type { Metadata } from "next";
import { CloseButton } from "./close-button";
import { CrtMonitor } from "./crt-monitor";
import { RESUME_DOWNLOAD_URL, RESUME_DRIVE_URL, RESUME_PREVIEW_URL } from "@/lib/resume";

export const metadata: Metadata = {
    title: "Resume",
    description: "Resume of Miit Daga, Software Development Engineer.",
    alternates: { canonical: "/resume" },
};

// The resume on the site itself: the Drive file in an embedded preview, with
// download and Drive links, instead of sending visitors off to Drive. It is
// shown on an old CRT monitor on a ship's console (crt-monitor.tsx), with the
// stars out beyond it.

// A fixed sky, the same on the server and in the browser
const STARS = (() => {
    let seed = 20260923;
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
    return Array.from({ length: 90 }, () => ({ x: rand() * 100, y: rand() * 100, s: rand() < 0.12 ? 2 : 1, o: 0.25 + rand() * 0.6 }));
})();

export default function ResumePage() {
    return (
        <main className="flex min-h-dvh flex-col bg-black text-white">
            {/* Out past the console: stars and a faint nebula */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0"
                style={{
                    background:
                        "radial-gradient(70% 50% at 15% 10%, rgba(129,140,248,0.14), transparent 60%), radial-gradient(60% 45% at 90% 25%, rgba(244,114,182,0.08), transparent 60%), radial-gradient(90% 60% at 50% -10%, rgba(45,212,191,0.08), transparent 60%)",
                }}
            >
                {STARS.map((st, i) => (
                    <span
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, opacity: st.o }}
                    />
                ))}
            </div>
            {/* The console desk the monitor stands on, with a few lights */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-x-0 bottom-0 h-[18vh]"
                style={{ background: "linear-gradient(180deg, transparent, rgba(12,14,18,0.85) 35%, #0a0b0e)" }}
            >
                <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 gap-3 sm:flex">
                    {["#34d399", "#fbbf24", "#60a5fa", "#34d399", "#f472b6"].map((c, i) => (
                        <span key={i} className="h-1.5 w-6 rounded-full" style={{ background: c, opacity: 0.35, boxShadow: `0 0 8px ${c}` }} />
                    ))}
                </div>
            </div>

            <header className="relative z-10 mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pb-4 pt-6 md:px-6">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal-300/80">Crew record</p>
                    <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Miit Daga · Resume</h1>
                </div>
                <nav className="flex flex-wrap items-center gap-2">
                    <a
                        href={RESUME_DOWNLOAD_URL}
                        className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                    >
                        Download PDF
                    </a>
                    <a
                        href={RESUME_DRIVE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white"
                    >
                        Open in Drive ↗
                    </a>
                    <CloseButton className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white" />
                </nav>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-6 sm:px-4 md:px-6">
                <CrtMonitor src={RESUME_PREVIEW_URL} />
            </section>
        </main>
    );
}
