import type { Metadata } from "next";
import { CloseButton } from "./close-button";
import { RESUME_DOWNLOAD_URL, RESUME_DRIVE_URL, RESUME_PREVIEW_URL } from "@/lib/resume";

export const metadata: Metadata = {
    title: "Resume",
    description: "Resume of Miit Daga, Software Development Engineer.",
    alternates: { canonical: "/resume" },
};

// The resume on the site itself: the Drive file in an embedded preview, with
// download and Drive links, instead of sending visitors off to Drive.
export default function ResumePage() {
    return (
        <main className="flex min-h-dvh flex-col bg-black text-white">
            {/* A faint sky, without the main page's heavier backdrop */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0"
                style={{
                    background:
                        "radial-gradient(90% 60% at 50% -10%, rgba(45,212,191,0.12), transparent 60%), radial-gradient(70% 50% at 100% 110%, rgba(129,140,248,0.10), transparent 60%)",
                }}
            />

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

            <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-6 md:px-6">
                <div className="relative min-h-[75dvh] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-[0_0_40px_rgba(45,212,191,0.08)]">
                    {/* Shows until the preview paints over it */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-300 motion-reduce:animate-none" />
                        <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500">Loading resume</p>
                        <p className="max-w-xs text-xs text-neutral-600">
                            If it does not appear, use Download PDF above.
                        </p>
                    </div>
                    <iframe
                        src={RESUME_PREVIEW_URL}
                        title="Miit Daga resume"
                        // Fills the whole panel: sized by h-full alone it stopped at
                        // 75dvh while the panel grew, leaving a dark band that
                        // cut the resume off
                        className="absolute inset-0 block h-full w-full"
                        allow="autoplay"
                        loading="eager"
                    />
                </div>
            </section>
        </main>
    );
}
