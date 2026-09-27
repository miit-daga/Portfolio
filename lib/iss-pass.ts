import { degreesLat, degreesLong, ecfToLookAngles, eciToEcf, gstime, propagate, twoline2satrec } from "satellite.js";

// When the ISS will next be visible from a place (app/api/iss-pass). It's
// visible to the eye only when three things line up: it's above the
// horizon (10 degrees, clear of trees and buildings), it's in sunlight, and
// the sky where you stand is dark (the Sun at least 6 degrees below the
// horizon). So it shows only for a few minutes just after dusk or before
// dawn. Its position comes from its published orbit (a TLE, from CelesTrak)
// through SGP4 (satellite.js); the Sun's from the usual low-precision series,
// good to a fraction of a degree, plenty for this.

const R_EARTH = 6371;
const RAD = Math.PI / 180;
const STEP_S = 20;
const MIN_ELEVATION = 10;

export type Pass = {
    /** when it becomes visible, reaches its highest, and fades (ms) */
    start: number;
    peak: number;
    end: number;
    /** degrees above the horizon at its highest */
    maxElevation: number;
    /** compass directions, where it appears and where it goes */
    from: string;
    to: string;
    brightness: "very bright" | "bright" | "low";
};

/** The Sun: its direction in the Earth-centred frame, and the point on Earth it's overhead (also the ISRO page's globe). */
export function sun(date: Date) {
    const n = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
    const L = 280.46 + 0.9856474 * n;
    const g = (357.528 + 0.9856003 * n) * RAD;
    const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 4e-7 * n) * RAD;
    const dir = { x: Math.cos(lambda), y: Math.cos(eps) * Math.sin(lambda), z: Math.sin(eps) * Math.sin(lambda) };
    const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
    const gmst = (280.46061837 + 360.98564736629 * n) * RAD;
    return { dir, dec, lon: ra - gmst };
}

/** How high the Sun is (degrees) where someone stands. */
function sunElevation(latR: number, lonR: number, date: Date) {
    const s = sun(date);
    const h = lonR - s.lon;
    return Math.asin(Math.sin(latR) * Math.sin(s.dec) + Math.cos(latR) * Math.cos(s.dec) * Math.cos(h)) / RAD;
}

/** Whether the station is in sunlight, not in the Earth's shadow (a cylinder behind the Earth). */
function sunlit(p: { x: number; y: number; z: number }, date: Date) {
    const s = sun(date).dir;
    const along = p.x * s.x + p.y * s.y + p.z * s.z;
    if (along > 0) return true;
    const r2 = p.x * p.x + p.y * p.y + p.z * p.z;
    return Math.sqrt(Math.max(0, r2 - along * along)) > R_EARTH;
}

const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
const compass = (azR: number) => COMPASS[Math.round(((azR / RAD + 360) % 360) / 45) % 8];

/** The visible passes over a place in the next `days` days, soonest first. */
export function visiblePasses(tle: [string, string], lat: number, lon: number, from = new Date(), days = 5, max = 4): Pass[] {
    const sat = twoline2satrec(tle[0], tle[1]);
    const observer = { latitude: lat * RAD, longitude: lon * RAD, height: 0.05 };
    const passes: Pass[] = [];
    let cur: { start: number; peak: number; end: number; maxEl: number; fromAz: number; toAz: number } | null = null;
    const t0 = from.getTime();
    for (let t = t0; t < t0 + days * 86_400_000 && passes.length < max; t += STEP_S * 1000) {
        const date = new Date(t);
        const pv = propagate(sat, date);
        const pos = pv?.position;
        let visible = false;
        let el = 0;
        let az = 0;
        if (pos && typeof pos !== "boolean") {
            const look = ecfToLookAngles(observer, eciToEcf(pos, gstime(date)));
            el = look.elevation / RAD;
            az = look.azimuth;
            visible = el >= MIN_ELEVATION && sunElevation(observer.latitude, observer.longitude, date) <= -6 && sunlit(pos, date);
        }
        if (visible) {
            if (!cur) cur = { start: t, peak: t, end: t, maxEl: el, fromAz: az, toAz: az };
            cur.end = t;
            cur.toAz = az;
            if (el > cur.maxEl) {
                cur.maxEl = el;
                cur.peak = t;
            }
        } else if (cur) {
            // (a glimpse under a minute isn't worth going outside for)
            if (cur.end - cur.start >= 60_000) {
                passes.push({
                    start: cur.start,
                    peak: cur.peak,
                    end: cur.end,
                    maxElevation: Math.round(cur.maxEl),
                    from: compass(cur.fromAz),
                    to: compass(cur.toAz),
                    brightness: cur.maxEl >= 60 ? "very bright" : cur.maxEl >= 30 ? "bright" : "low",
                });
            }
            cur = null;
        }
    }
    return passes;
}

/** Where the station is right now, for a sanity check. */
export function whereNow(tle: [string, string], date = new Date()) {
    const pv = propagate(twoline2satrec(tle[0], tle[1]), date);
    const pos = pv?.position;
    if (!pos || typeof pos === "boolean") return null;
    const gd = (() => {
        const ecf = eciToEcf(pos, gstime(date));
        const lonR = Math.atan2(ecf.y, ecf.x);
        const latR = Math.atan2(ecf.z, Math.hypot(ecf.x, ecf.y));
        return { lat: degreesLat(latR), lon: degreesLong(lonR) };
    })();
    return gd;
}
