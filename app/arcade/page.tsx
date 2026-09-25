import type { Metadata } from "next";
import Link from "next/link";
import { CloseButton } from "../resume/close-button";
import { MusicButton } from "./music-button";
import { Arcade } from "./arcade";
import { decodeChallenge, flyChallenge, nameOf } from "./challenge";

const base: Metadata = {
    title: "Arcade",
    description: "Three small 3D space games: Gravity Assist, Asteroid Run, and Stack the Station.",
    alternates: { canonical: "/arcade" },
    // (the share picture is opengraph-image.jpg, beside this file)
    openGraph: {
        type: "website",
        url: "/arcade",
        siteName: "Miit Daga",
        title: "Crew arcade · Miit Daga",
        description: "Three space games made for this site: Asteroid Run, Stack the Station and Gravity Assist, with real NASA skies. In the browser, on any screen.",
    },
    twitter: {
        card: "summary_large_image",
        creator: "@miit_daga",
        title: "Crew arcade · Miit Daga",
        description: "Three space games made for this site: Asteroid Run, Stack the Station and Gravity Assist, with real NASA skies.",
    },
};

// A challenge link (?game=assist&c=...) gets its own title and picture, the
// friend's course and time (arcade/challenge-image), so the link itself makes
// the case in a chat; the shot is flown again to time it. Any other link gets
// the arcade's own (the share picture is opengraph-image.jpg, beside this file)
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
    const { c: code } = await searchParams;
    const c = typeof code === "string" ? decodeChallenge(code) : null;
    const flown = c ? flyChallenge(c) : null;
    if (!c || !flown) return base;
    const time = `${flown.flight.flight.toFixed(2)} s`;
    const title = `Beat ${time} · Gravity Assist challenge`;
    const description = `A friend reached ${nameOf(flown.level.bodies[flown.level.target])} in ${time} on ${flown.label}. Their course is in gold: can you beat their time?`;
    const image = { url: `/arcade/challenge-image?c=${code}`, width: 1200, height: 630, alt: `${flown.label}: a friend's course, and ${time} to beat` };
    return {
        ...base,
        title,
        description,
        openGraph: { ...base.openGraph, url: `/arcade?game=assist&c=${code}`, title, description, images: [image] },
        twitter: { ...base.twitter, title, description, images: [image.url] },
    };
}

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
            <header className="relative z-10 mx-auto flex w-full max-w-5xl flex-wrap lg:max-w-6xl items-center justify-between gap-4 px-4 pb-6 pt-6 md:px-6">
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Crew arcade</p>
                    <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                        <Link href="/" className="transition-colors hover:text-teal-200">Miit Daga</Link> · Arcade
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <MusicButton className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white" />
                    <CloseButton className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white" />
                </div>
            </header>
            <Arcade />
            <p className="relative z-10 mx-auto mt-auto w-full max-w-5xl px-4 pb-6 lg:max-w-6xl font-mono text-[11px] text-neutral-600 md:px-6">
                The Earth, its city lights and the sky are NASA imagery: Blue Marble, Black Marble, and the Scientific Visualization Studio&apos;s Deep Star Maps. Mercury, Venus, Mars, Jupiter, Saturn, Uranus and Neptune are from Solar System Scope, under CC BY 4.0. Today's sky places the planets with JPL's orbital elements. The music is &ldquo;Ambient Relaxing Loop&rdquo; by isaiah658, in the public domain (CC0).
            </p>
        </main>
    );
}
