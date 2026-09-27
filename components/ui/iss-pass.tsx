"use client";
import { useEffect, useRef, useState } from "react";
import type { IssPassReply } from "@/app/api/iss-pass/route";
import type { Pass } from "@/lib/iss-pass";

// When the ISS will next be visible where the visitor is (app/api/iss-pass),
// under the Deep Space Network card: a reason to step outside. Times are in
// the visitor's own time zone; the next pass can go in their calendar.

const clock = (t: number) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(t));

/** "tonight at 7:49 pm", "tomorrow morning at 5:02 am", "on Thursday evening at 6:48 pm". */
function when(t: number) {
    const d = new Date(t);
    const now = new Date();
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
    const part = d.getHours() < 12 ? "morning" : "evening";
    const day = days === 0 ? (part === "evening" ? "tonight" : "this morning") : days === 1 ? `tomorrow ${part}` : `on ${new Intl.DateTimeFormat("en", { weekday: "long" }).format(d)} ${part}`;
    return `${day} at ${clock(t)}`;
}
const minutes = (p: Pass) => Math.max(1, Math.round((p.end - p.start) / 60_000));
const bright = (p: Pass) => (p.brightness === "very bright" ? "very bright and high" : p.brightness === "bright" ? "bright" : "low in the sky");

/** The pass as a calendar event (.ics), for the visitor to save. */
function calendar(p: Pass, city: string | null) {
    const ics = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const body = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//miitdaga.dev//ISS pass//EN",
        "BEGIN:VEVENT",
        `UID:iss-${p.start}@miitdaga.dev`,
        `DTSTAMP:${ics(Date.now())}`,
        `DTSTART:${ics(p.start - 5 * 60_000)}`,
        `DTEND:${ics(p.end)}`,
        `SUMMARY:ISS pass${city ? ` over ${city}` : ""}`,
        `DESCRIPTION:The International Space Station crosses the sky from the ${p.from} to the ${p.to}\\, ${minutes(p)} min\\, up to ${p.maxElevation}° high. It looks like a bright\\, steady star moving fast. (From miitdaga.dev)`,
        "BEGIN:VALARM",
        "TRIGGER:-PT5M",
        "ACTION:DISPLAY",
        "DESCRIPTION:The ISS passes in 5 minutes",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    a.download = "iss-pass.ics";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function IssPass() {
    const [data, setData] = useState<IssPassReply | null>(null);
    const [failed, setFailed] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = box.current;
        if (!el) return;
        const io = new IntersectionObserver((e) => {
            if (!e.some((x) => x.isIntersecting)) return;
            io.disconnect();
            fetch("/api/iss-pass")
                .then((r) => (r.ok ? (r.json() as Promise<IssPassReply>) : Promise.reject()))
                .then(setData)
                .catch(() => setFailed(true));
        });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const next = data?.passes[0];
    const later = data?.passes.slice(1, 4) ?? [];
    const place = data?.city ? `over ${data.city}` : "over you";

    return (
        <div ref={box} className="mx-auto mt-4 w-full max-w-3xl px-4">
            <div className="rounded-2xl border border-white/10 bg-neutral-950/85 p-5 backdrop-blur-md md:p-7">
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300/90 sm:text-[10px]">
                    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${next ? "animate-pulse bg-sky-300" : "bg-neutral-600"}`} />
                    The ISS, over your sky
                </p>
                <div className="mt-4 min-h-[3.5rem]">
                    {next ? (
                        <p className="text-base leading-relaxed text-neutral-200 md:text-lg">
                            The International Space Station will pass {place} <span className="font-semibold text-white">{when(next.start)}</span>: {bright(next)}, {minutes(next)} {minutes(next) === 1 ? "minute" : "minutes"} long. Look <span className="font-semibold text-white">{next.from}</span>
                            {next.to !== next.from ? <>, and follow it {next.to}</> : null}.{" "}
                            <span className="text-neutral-400">It looks like a bright, steady star moving fast.</span>
                        </p>
                    ) : data?.located ? (
                        <p className="text-sm leading-relaxed text-neutral-400">The ISS won&apos;t be visible {place} in the next five days: it&apos;s passing over in daylight just now. Check back soon.</p>
                    ) : data || failed ? (
                        <p className="text-sm leading-relaxed text-neutral-500">{failed ? "Couldn't reach the ISS's orbit data just now." : "Couldn't tell where you are, so no pass times this time."}</p>
                    ) : (
                        <p className="text-sm text-neutral-500">Working out when the ISS flies over you…</p>
                    )}
                </div>
                {next && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                        {later.length ? (
                            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-400">
                                <li className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">Then</li>
                                {later.map((p) => (
                                    <li key={p.start}>
                                        {new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(p.start))} {clock(p.start)} · {minutes(p)} min · {p.from}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <span />
                        )}
                        <button type="button" onClick={() => calendar(next, data?.city ?? null)} className="rounded-full border border-sky-300/40 px-4 py-1.5 text-sm text-sky-100 transition-colors hover:border-sky-300/80 hover:bg-sky-300/10">
                            Add to calendar
                        </button>
                    </div>
                )}
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-600">From its published orbit (CelesTrak) and your approximate location · nothing is kept</p>
            </div>
        </div>
    );
}
