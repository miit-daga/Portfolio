import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS } from "../posts";

// One post of the engineering log (../posts.tsx), built ahead of time

export function generateStaticParams() {
    return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = POSTS.find((p) => p.slug === slug);
    if (!post) return {};
    return { title: post.title, description: post.summary, openGraph: { title: `${post.title} · Miit Daga`, description: post.summary, type: "article" } };
}

const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function LogPost({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const i = POSTS.findIndex((p) => p.slug === slug);
    if (i < 0) notFound();
    const post = POSTS[i];
    const next = POSTS[(i + 1) % POSTS.length];
    return (
        <main className="min-h-dvh bg-black text-white">
            <article className="mx-auto max-w-2xl px-4 pb-20 pt-8 md:px-8">
                <Link href="/log" className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300">
                    ← Engineering log
                </Link>
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-teal-300/80">
                    {date(post.date)} · {post.minutes} min read
                </p>
                <h1 className="font-display mt-2 text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-400">{post.summary}</p>
                <div className="mt-6 border-t border-white/10 pt-2 text-[15px] md:text-base">{post.body}</div>
                <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
                    <p className="text-sm text-neutral-400">
                        By Miit Daga ·{" "}
                        <Link href="/" className="text-teal-300 hover:text-teal-200">
                            miitdaga.dev
                        </Link>
                    </p>
                    {next.slug !== post.slug && (
                        <Link href={`/log/${next.slug}`} className="text-sm text-neutral-300 transition-colors hover:text-teal-200">
                            Next: {next.title} →
                        </Link>
                    )}
                </div>
            </article>
        </main>
    );
}
