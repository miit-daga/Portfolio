import { NextResponse } from "next/server";
import * as A from "astronomy-engine";

// Where the planets are today, for the solar system in the site's background
// (lib/solar-system.ts): each one's heliocentric ecliptic longitude (its true
// angle round the Sun), its distance from the Earth, and the Moon's
// geocentric longitude (for its place round the Earth, and so its phase).
// Worked out here so the page doesn't carry the ephemeris; an hour's cache.

export const dynamic = "force-dynamic";

const BODIES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn"] as const;

export type SolarNow = {
    at: number;
    planets: { name: (typeof BODIES)[number]; lon: number; fromEarthAu: number | null }[];
    moonLon: number;
};

let cached: { at: number; v: SolarNow } | null = null;

export async function GET() {
    if (!cached || Date.now() - cached.at > 3600_000) {
        const now = new Date();
        const v: SolarNow = {
            at: now.getTime(),
            planets: BODIES.map((name) => ({
                name,
                lon: A.EclipticLongitude(A.Body[name], now),
                fromEarthAu: name === "Earth" ? null : A.GeoVector(A.Body[name], now, true).Length(),
            })),
            moonLon: A.EclipticGeoMoon(now).lon,
        };
        cached = { at: Date.now(), v };
    }
    return NextResponse.json(cached.v, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
