"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as A from "astronomy-engine";
import type { SunNow } from "@/app/api/sun/route";
import { VIEWS } from "@/lib/sun-views";

// The Sun, today, under the ISS card in the contact section:
// - its latest picture from NASA's Solar Dynamics Observatory, in three
//   wavelengths, saying how old it is (app/api/sun), and the week's flares
// - how long its light took to reach you, from today's real Earth-Sun
//   distance, and the year's closest and farthest (astronomy-engine)
// - the next solar eclipse you can see from where you are, and how much of
//   the Sun it covers there
// and a pointer to Aditya-L1, ISRO's Sun watcher, on the ISRO page.

const C_KM_S = 299_792.458;
const AU_KM = 149_597_870.7;
const KOLKATA = { lat: 22.57, lon: 88.36, city: "Kolkata" };

const ago = (t: number) => {
    const m = Math.round((Date.now() - t) / 60_000);
    if (m < 60) return `${Math.max(1, m)} min ago`;
    const h = Math.round(m / 60);
    return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};
const mmss = (s: number) => `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

type Eclipse = { when: Date; kind: string; covered: number; altitude: number; city: string; guessed: boolean };

export function SunToday() {
    const [sun, setSun] = useState<SunNow | null>(null);
    const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("HMIIC");
    const [loadedImg, setLoadedImg] = useState<string | null>(null);
    const [eclipse, setEclipse] = useState<Eclipse | null>(null);
    const [now, setNow] = useState(() => new Date());
    const box = useRef<HTMLDivElement>(null);
    const [seen, setSeen] = useState(false);

    // only once in view
    useEffect(() => {
        const el = box.current;
        if (!el) return;
        const io: IntersectionObserver = new IntersectionObserver((e) => {
            if (!e.some((x) => x.isIntersecting)) return;
            setSeen(true);
            io.disconnect();
        });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!seen) return;
        fetch("/api/sun")
            .then((r) => (r.ok ? (r.json() as Promise<SunNow>) : Promise.reject()))
            .then(setSun)
            .catch(() => {});
        // where you are, for the eclipse (Kolkata if it can't tell)
        fetch("/api/visitor-location")
            .then((r) => r.json())
            .catch(() => ({}))
            .then((d: { lat?: number | null; lon?: number | null; city?: string | null }) => {
                const where = typeof d?.lat === "number" && typeof d?.lon === "number" ? { lat: d.lat, lon: d.lon, city: d.city ?? null, guessed: false } : { ...KOLKATA, guessed: true };
                const obs = new A.Observer(where.lat, where.lon, 0);
                let e = A.SearchLocalSolarEclipse(new Date(), obs);
                // (skip grazing ones: under 1% covered, or the Sun below the horizon at its greatest)
                for (let i = 0; i < 12 && (e.obscuration < 0.01 || e.peak.altitude < 1); i++) e = A.NextLocalSolarEclipse(e.peak.time, obs);
                setEclipse({ when: e.peak.time.date, kind: e.kind, covered: e.obscuration, altitude: e.peak.altitude, city: where.city ?? "where you are", guessed: where.guessed });
            });
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, [seen]);

    // the light's journey: today, and this year's closest and farthest
    const light = useMemo(() => {
        const km = A.GeoVector(A.Body.Sun, now, true).Length() * AU_KM;
        return { km, s: km / C_KM_S };
    }, [now]);
    const apsides = useMemo(() => {
        const first = A.SearchPlanetApsis(A.Body.Earth, new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
        const second = A.NextPlanetApsis(A.Body.Earth, first);
        const [peri, aph] = first.kind === A.ApsisKind.Pericenter ? [first, second] : [second, first];
        return { peri: { when: peri.time.date, s: (peri.dist_au * AU_KM) / C_KM_S }, aph: { when: aph.time.date, s: (aph.dist_au * AU_KM) / C_KM_S } };
        // (the year's, worked out once)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [now.getUTCFullYear()]);

    const img = sun?.images.find((i) => i.id === view);
    const v = VIEWS.find((x) => x.id === view)!;
    const stale = img?.at ? Date.now() - img.at > 36 * 3600_000 : false;
    const days = eclipse ? Math.ceil((eclipse.when.getTime() - Date.now()) / 86_400_000) : 0;

    return (
        <div ref={box} className="mx-auto mt-4 w-full max-w-3xl px-4">
            <div className="rounded-2xl border border-white/10 bg-neutral-950/85 p-5 backdrop-blur-md md:p-7">
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/90 sm:text-[10px]">
                    <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
                    The Sun, today
                </p>

                <div className="mt-4 grid gap-5 sm:grid-cols-[200px_1fr]">
                    {/* the picture */}
                    <div>
                        <div className="relative aspect-square overflow-hidden rounded-full bg-black shadow-[0_0_40px_rgba(251,191,36,0.25)]">
                            {img && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={img.url} src={img.url} alt={`The Sun in ${v.label.toLowerCase()}, from NASA's Solar Dynamics Observatory`} onLoad={() => setLoadedImg(img.url)} className={`h-full w-full scale-[1.14] object-cover transition-opacity duration-500 ${loadedImg === img.url ? "opacity-100" : "opacity-0"}`} />
                            )}
                        </div>
                        <div className="mt-3 flex flex-wrap justify-center gap-1">
                            {VIEWS.map((x) => (
                                <button key={x.id} type="button" onClick={() => setView(x.id)} className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] ${view === x.id ? "border-amber-300/60 bg-amber-300/10 text-amber-100" : "border-white/10 text-neutral-500 hover:text-neutral-300"}`}>
                                    {x.id === "HMIIC" ? "Visible" : x.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 text-sm leading-relaxed text-neutral-300 md:text-[15px]">
                        <p>
                            <span className="text-white">{v.label}</span>: {v.about}.{" "}
                            <span className="text-neutral-500">
                                {img?.at ? `Taken ${ago(img.at)} by NASA's Solar Dynamics Observatory${stale ? ", whose latest pictures are running late" : ""}.` : "From NASA's Solar Dynamics Observatory."}
                            </span>
                        </p>
                        {sun && sun.flaresThisWeek !== null && (
                            <p>
                                {sun.flaresThisWeek ? (
                                    <>
                                        <span className="text-white">{sun.flaresThisWeek} solar {sun.flaresThisWeek === 1 ? "flare" : "flares"}</span> of class C or stronger this week
                                        {sun.strongestFlare && <>, the strongest {sun.strongestFlare.cls} on {day(new Date(sun.strongestFlare.at))}</>}
                                        {sun.latestFlare && <>; the latest {ago(Date.parse(sun.latestFlare.at))}</>}.{" "}
                                    </>
                                ) : (
                                    <>A quiet week: no flares of class C or stronger. </>
                                )}
                                <span className="text-neutral-500">Classes run A, B, C, M, X, each ten times stronger than the last.</span>
                            </p>
                        )}
                        <p>
                            The sunlight reaching you left the Sun <span className="font-mono text-amber-100">{mmss(light.s)}</span> ago, across {(light.km / 1e6).toFixed(1)} million km.{" "}
                            <span className="text-neutral-500">
                                This year it&apos;s quickest on {day(apsides.peri.when)} ({mmss(apsides.peri.s)}) and slowest on {day(apsides.aph.when)} ({mmss(apsides.aph.s)}).
                            </span>
                        </p>
                        {eclipse && (
                            <p>
                                The next solar eclipse you can see from {eclipse.city} is on <span className="text-white">{eclipse.when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>, in {days.toLocaleString("en-US")} days: {eclipse.kind === "total" ? "a total eclipse" : eclipse.kind === "annular" ? "an annular eclipse, a ring of fire" : "a partial eclipse"}, the Moon covering{" "}
                                {Math.max(1, Math.round(eclipse.covered * 100))}% of the Sun at its greatest, {eclipse.when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}, with the Sun {Math.round(eclipse.altitude)}° up.{" "}
                                <span className="text-neutral-500">{eclipse.guessed ? "(Worked out for Kolkata: your location wasn't available.) " : ""}Never look at the Sun without eclipse glasses.</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-600">Pictures: NASA SDO · flares: NOAA SWPC · positions: astronomy-engine</p>
                    <a href="/isro" className="text-sm text-amber-200/90 transition-colors hover:text-amber-100">
                        India&apos;s Aditya-L1 watches the Sun from L1 →
                    </a>
                </div>
            </div>
        </div>
    );
}
