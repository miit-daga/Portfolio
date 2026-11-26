import type React from "react";
import Link from "next/link";

// The layout of the site's privacy policy and terms (app/privacy, app/terms):
// the engineering log's plain page, with headed sections.

export const LEGAL_UPDATED = "26 November 2026";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: React.ReactNode; children: React.ReactNode }) {
    return (
        <main className="min-h-dvh bg-black text-white">
            <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 md:px-8">
                <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300">
                    ← miitdaga.dev
                </Link>
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">{eyebrow}</p>
                <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">{title}</h1>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">Last updated {LEGAL_UPDATED}</p>
                <div className="mt-6 text-sm leading-relaxed text-neutral-300 md:text-base">{intro}</div>
                <div className="mt-10 space-y-10">{children}</div>
                <p className="mt-14 border-t border-white/10 pt-6 text-sm text-neutral-500">
                    Questions: <a href="mailto:miitcodes27@gmail.com" className="text-teal-300/90 hover:text-teal-200">miitcodes27@gmail.com</a> · Miit Daga, Kolkata, India ·{" "}
                    <Link href="/privacy" className="hover:text-neutral-300">Privacy</Link> ·{" "}
                    <Link href="/terms" className="hover:text-neutral-300">Terms</Link>
                </p>
            </div>
        </main>
    );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="font-display text-xl font-bold text-white md:text-2xl">{title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-300 md:text-base [&_a]:text-teal-300/90 [&_a:hover]:text-teal-200 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white">
                {children}
            </div>
        </section>
    );
}

export function Sub({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="mt-5 font-semibold text-neutral-100">{title}</h3>
            <div className="mt-1.5 space-y-3">{children}</div>
        </div>
    );
}
