// The ISS's position, from wheretheiss.at, shared. The sky's drifting station
// (components/ui/animated-background.tsx) and the contact globe
// (components/ui/signal-globe.tsx) each ask for it at their own pace; one
// poll runs at the fastest pace anyone currently wants, and everyone is told
// what it brings, instead of each polling on its own timer.

export type IssFix = {
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
    visibility?: string;
};

const URL = "https://api.wheretheiss.at/v1/satellites/25544";

type Sub = { every: number; onFix: (fix: IssFix) => void };
const subs = new Set<Sub>();
let last: { at: number; fix: IssFix } | null = null;
let inflight: Promise<IssFix | null> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function fetchFix(): Promise<IssFix | null> {
    if (inflight) return inflight;
    inflight = fetch(URL, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
            if (d && Number.isFinite(d.latitude) && Number.isFinite(d.longitude)) {
                last = { at: Date.now(), fix: d as IssFix };
                subs.forEach((s) => s.onFix(last!.fix));
                return last.fix;
            }
            return null;
        })
        .catch(() => null)
        .finally(() => {
            inflight = null;
        });
    return inflight;
}

// Next poll: as soon as the most eager subscriber's interval has passed since
// the last fix. A hidden tab waits, and polls again once it is looked at.
function schedule() {
    clearTimeout(timer);
    if (!subs.size) return;
    const every = Math.min(...[...subs].map((s) => s.every));
    const wait = last ? Math.max(0, last.at + every - Date.now()) : 0;
    timer = setTimeout(() => {
        if (typeof document !== "undefined" && document.hidden) {
            const resume = () => {
                document.removeEventListener("visibilitychange", resume);
                schedule();
            };
            document.addEventListener("visibilitychange", resume);
            return;
        }
        fetchFix().finally(schedule);
    }, wait);
}

/** Be told the ISS's position every `every` ms (or sooner, if someone else wants it sooner). */
export function subscribeIss(every: number, onFix: (fix: IssFix) => void): () => void {
    const sub: Sub = { every, onFix };
    subs.add(sub);
    // a fix fresh enough for this subscriber is handed over at once
    if (last && Date.now() - last.at < every) onFix(last.fix);
    schedule();
    return () => {
        subs.delete(sub);
        schedule();
    };
}

/** The position now: the shared fix if it is at most `maxAge` ms old, otherwise a fresh one. */
export function issNow(maxAge = 10000): Promise<IssFix | null> {
    if (last && Date.now() - last.at < maxAge) return Promise.resolve(last.fix);
    return fetchFix();
}
