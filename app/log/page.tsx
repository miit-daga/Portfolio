import type { Metadata } from "next";
import Link from "next/link";
import { POSTS } from "./posts";

export const metadata: Metadata = {
    title: "Engineering log",
    description: "Short write-ups of problems solved building this site: replayed scores, a free-model fallback chain, deploying old versions, predicting ISS passes.",
    openGraph: {
        title: "Engineering log · Miit Daga",
        description: "Short write-ups of problems solved building this site.",
    },
};

const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// The engineering log: its posts, newest first (./posts.tsx)
export default function LogPage() {
    const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
    return (
        <main className="min-h-dvh bg-black text-white">
            <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 md:px-8">
                <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300">
                    ← miitdaga.dev
                </Link>
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Engineering log</p>
                <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">How this site is built</h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400 md:text-base">Short write-ups of the interesting problems behind the things you can play with here.</p>
                <ul className="mt-10 space-y-4">
                    {posts.map((p) => (
                        <li key={p.slug}>
                            <Link href={`/log/${p.slug}`} className="group block rounded-2xl border border-white/10 bg-neutral-950/70 p-5 transition-colors hover:border-teal-300/40 hover:bg-white/[0.03]">
                                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                                    {date(p.date)} · {p.minutes} min read · {p.tags.join(" · ")}
                                </p>
                                <h2 className="font-display mt-1.5 text-xl font-bold text-white transition-colors group-hover:text-teal-200">{p.title}</h2>
                                <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{p.summary}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </main>
    );
}
