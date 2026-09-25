"use client";
import { useEffect, useRef, useState } from "react";
import type { Dsn, DsnLink } from "@/app/api/dsn/route";

// The Deep Space Network, live (app/api/dsn), under the contact section's
// signal globe: the farthest conversation humans are having right now, in a
// sentence, and the others below it. The globe shows how far the visitor's
// signal to Miit travels; this shows how far a signal can. It refreshes every
// minute while in view.

const STATIONS = ["Goldstone", "Madrid", "Canberra"] as const;

function distance(km: number) {
    if (km >= 1e9) return `${(km / 1e9).toFixed(1)} billion km`;
    if (km >= 1e6) return `${(km / 1e6).toFixed(1)} million km`;
    return `${Math.round(km).toLocaleString("en-US")} km`;
}
function lightTime(s: number, long = false) {
    if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} ${long ? "seconds" : "s"}`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (!h) return long ? `${m} minute${m === 1 ? "" : "s"} ${Math.round(s % 60)} seconds` : `${m} min ${Math.round(s % 60)} s`;
    return long ? `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"}` : `${h} h ${m} min`;
}
function rate(bps: number) {
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mb/s`;
    if (bps >= 1e3) return `${Math.round(bps / 1e3)} kb/s`;
    return `${bps} b/s`;
}
const verb = (l: DsnLink) => (l.down !== null ? "hearing" : "sending commands to");

function Headline({ l }: { l: DsnLink }) {
    return (
        <p className="text-base leading-relaxed text-neutral-200 md:text-lg">
            Right now {l.station}&apos;s {l.size} m dish is {verb(l)} <span className="font-semibold text-white">{l.spacecraft}</span>
            {l.km ? <>, {distance(l.km)} out</> : null}.{" "}
            {l.light && l.light > 5 ? (
                l.down !== null ? (
                    <>The signal arriving now left it {lightTime(l.light, true)} ago. </>
                ) : (
                    <>Its signal takes {lightTime(l.light, true)} to arrive. </>
                )
            ) : null}
            <span className="text-neutral-400">Your message will reach Miit a little faster.</span>
        </p>
    );
}

export function DsnLive() {
    const [dsn, setDsn] = useState<Dsn | null>(null);
    const [failed, setFailed] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let on = true;
        let seen = false;
        const load = () => {
            if (!seen || document.hidden) return;
            fetch("/api/dsn")
                .then((r) => (r.ok ? (r.json() as Promise<Dsn>) : Promise.reject()))
                .then((d) => on && (setDsn(d), setFailed(false)))
                .catch(() => on && setFailed(true));
        };
        const io = new IntersectionObserver((e) => {
            const was = seen;
            seen = e.some((x) => x.isIntersecting);
            if (seen && !was) load();
        });
        if (box.current) io.observe(box.current);
        const id = window.setInterval(load, 60_000);
        return () => {
            on = false;
            io.disconnect();
            window.clearInterval(id);
        };
    }, []);

    const links = dsn?.links ?? [];
    const lead = links.find((l) => l.km) ?? links[0];
    const rest = links.filter((l) => l !== lead).slice(0, 6);
    const per = (s: string) => links.filter((l) => l.station === s).length;

    return (
        <div ref={box} className="mx-auto mt-16 w-full max-w-3xl px-4">
            <div className="rounded-2xl border border-white/10 bg-neutral-950/85 p-5 backdrop-blur-md md:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/90 sm:text-[10px]">
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dsn && !failed ? "animate-pulse bg-emerald-400" : "bg-neutral-600"}`} />
                        Deep Space Network · live
                    </p>
                    <div className="flex gap-2">
                        {STATIONS.map((s) => (
                            <span key={s} className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                                {s} <span className="text-neutral-200">{dsn ? per(s) : "·"}</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="mt-4 min-h-[3.5rem]">
                    {lead ? (
                        <Headline l={lead} />
                    ) : (
                        <p className="text-sm text-neutral-500">{failed ? "NASA's feed isn't answering just now. The dishes are still listening." : "Tuning in to the Deep Space Network…"}</p>
                    )}
                </div>

                {!!rest.length && (
                    <ul className="mt-5 grid gap-x-6 gap-y-2 border-t border-white/[0.07] pt-4 sm:grid-cols-2">
                        {rest.map((l) => (
                            <li key={l.code} className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="min-w-0 truncate text-neutral-300" title={l.spacecraft}>
                                    {l.spacecraft}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-neutral-500">
                                    {l.km ? `${distance(l.km)} · ${lightTime(l.light ?? 0)}` : l.down ? `${rate(l.down)} · ${l.station}` : l.station}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                    NASA&apos;s dishes in California, Spain and Australia · data from{" "}
                    <a href="https://eyes.nasa.gov/dsn/dsn.html" target="_blank" rel="noopener noreferrer" className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-400">
                        DSN Now
                    </a>
                </p>
            </div>
        </div>
    );
}
