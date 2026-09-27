import type { Metadata } from "next";
import Link from "next/link";
import { IsroJourneys, IsroSatellites } from "./isro-client";

export const metadata: Metadata = {
    title: "ISRO",
    description: "India in space: every active Indian satellite, live on a globe, and ISRO's missions to the Moon, Mars and the Sun, replayed to scale.",
    openGraph: {
        title: "India in space · Miit Daga",
        description: "Every active Indian satellite, live, and ISRO's journeys to the Moon, Mars and the Sun, replayed to scale.",
    },
};

// India in space: its satellites, live (./satellites-globe.tsx), and ISRO's
// journeys, replayed (./journeys.tsx)
export default function IsroPage() {
    return (
        <main className="min-h-dvh bg-black text-white">
            <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8">
                <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300">
                    ← miitdaga.dev
                </Link>
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/90">India in space</p>
                <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">ISRO, live and to scale</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400 md:text-base">
                    Every Indian satellite at work right now, where it is this second, and the long, patient routes ISRO flies to reach the Moon, Mars and the Sun.
                </p>

                <section className="mt-10">
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-teal-300/80">01 · Overhead now</p>
                    <h2 className="font-display mt-1 text-2xl font-bold">India&apos;s satellites, live</h2>
                    <div className="mt-5">
                        <IsroSatellites />
                    </div>
                </section>

                <section className="mt-16">
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-amber-300/90">02 · The long way round</p>
                    <h2 className="font-display mt-1 text-2xl font-bold">ISRO&apos;s journeys, to scale</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
                        ISRO&apos;s rockets are modest, so its deep-space missions take the patient route: loop after loop round the Earth, each burn stretching the orbit further, until one last push sends the craft on its way. Every orbit here is drawn at its real size.
                    </p>
                    <div className="mt-5">
                        <IsroJourneys />
                    </div>
                </section>
            </div>
        </main>
    );
}
