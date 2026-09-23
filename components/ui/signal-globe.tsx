"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import { kolkataNow } from "@/lib/kolkata";
import { describeLocation } from "@/lib/locate";
import { LAND_COLS, LAND_MASK, LAND_ROWS, LAND_STEP } from "@/constants/land-mask";

// A slowly swaying wireframe globe with a glowing signal arc from the
// visitor's location (IP-geolocated by Vercel's edge headers, with a
// timezone-based fallback for localhost; no permission popups either way) to
// home base in Kolkata, plus a ping pulse and a mono telemetry readout.
// The night side is shaded from the sun's real position, the ISS rides its
// live orbit, and the readout says when a reply is likely.
//
// It is also something to play with:
//   Spin        drag it (flick it and it keeps going); left alone it settles
//               back to facing the signal arc
//   Continents  dot-matrix land, with city lights on the night side
//   Explore     hover anywhere for the nearest city, its local time, and how
//               far it is from Kolkata at lightspeed (3,000 cities from
//               GeoNames, CC BY 4.0, credited under the globe)
//   Ping        click: a pulse runs to Kolkata and back while the browser
//               times a real round trip to this site's nearest server
//   ISS         hover it for live altitude and speed; click to follow it
//   Home        double-click to zoom in on Kolkata: today's satellite view
//               from NASA, the weather there, the time and the reply line
const BASE = { lat: 22.57, lon: 88.36 }; // Kolkata
const LIGHTSPEED_KM_S = 299792;

// Approximate coordinates for common IANA timezones: [lat, lon]
const TZ_COORDS: Record<string, [number, number]> = {
    "America/New_York": [40.7, -74.0], "America/Chicago": [41.9, -87.6], "America/Denver": [39.7, -105.0],
    "America/Phoenix": [33.4, -112.1], "America/Los_Angeles": [34.1, -118.2], "America/Anchorage": [61.2, -149.9],
    "Pacific/Honolulu": [21.3, -157.9], "America/Toronto": [43.7, -79.4], "America/Vancouver": [49.3, -123.1],
    "America/Mexico_City": [19.4, -99.1], "America/Bogota": [4.7, -74.1], "America/Lima": [-12.0, -77.0],
    "America/Santiago": [-33.4, -70.7], "America/Sao_Paulo": [-23.6, -46.6], "America/Argentina/Buenos_Aires": [-34.6, -58.4],
    "Europe/London": [51.5, -0.1], "Europe/Dublin": [53.3, -6.3], "Europe/Lisbon": [38.7, -9.1],
    "Europe/Paris": [48.9, 2.3], "Europe/Madrid": [40.4, -3.7], "Europe/Berlin": [52.5, 13.4],
    "Europe/Rome": [41.9, 12.5], "Europe/Amsterdam": [52.4, 4.9], "Europe/Brussels": [50.8, 4.4],
    "Europe/Zurich": [47.4, 8.5], "Europe/Vienna": [48.2, 16.4], "Europe/Prague": [50.1, 14.4],
    "Europe/Warsaw": [52.2, 21.0], "Europe/Stockholm": [59.3, 18.1], "Europe/Oslo": [59.9, 10.8],
    "Europe/Copenhagen": [55.7, 12.6], "Europe/Helsinki": [60.2, 24.9], "Europe/Athens": [38.0, 23.7],
    "Europe/Istanbul": [41.0, 29.0], "Europe/Moscow": [55.8, 37.6], "Europe/Kyiv": [50.5, 30.5],
    "Africa/Cairo": [30.0, 31.2], "Africa/Lagos": [6.5, 3.4], "Africa/Nairobi": [-1.3, 36.8],
    "Africa/Johannesburg": [-26.2, 28.0], "Asia/Dubai": [25.2, 55.3], "Asia/Riyadh": [24.7, 46.7],
    "Asia/Tehran": [35.7, 51.4], "Asia/Karachi": [24.9, 67.0], "Asia/Kolkata": [22.6, 88.4],
    "Asia/Calcutta": [22.6, 88.4], "Asia/Colombo": [6.9, 79.9], "Asia/Kathmandu": [27.7, 85.3],
    "Asia/Dhaka": [23.8, 90.4], "Asia/Bangkok": [13.8, 100.5], "Asia/Jakarta": [-6.2, 106.8],
    "Asia/Singapore": [1.35, 103.8], "Asia/Kuala_Lumpur": [3.1, 101.7], "Asia/Manila": [14.6, 121.0],
    "Asia/Hong_Kong": [22.3, 114.2], "Asia/Shanghai": [31.2, 121.5], "Asia/Taipei": [25.0, 121.6],
    "Asia/Seoul": [37.6, 127.0], "Asia/Tokyo": [35.7, 139.7], "Australia/Perth": [-31.9, 115.9],
    "Australia/Brisbane": [-27.5, 153.0], "Australia/Sydney": [-33.9, 151.2], "Australia/Melbourne": [-37.8, 145.0],
    "Pacific/Auckland": [-36.8, 174.8],
};

// Some systems still report legacy IANA names (Asia/Calcutta, Europe/Kiev);
// show the modern city name regardless
const CITY_RENAMES: Record<string, string> = {
    Calcutta: "Kolkata",
    Bombay: "Mumbai",
    Kiev: "Kyiv",
    Saigon: "Ho Chi Minh City",
    Rangoon: "Yangon",
};

type Vec3 = [number, number, number];

const toVec = (lat: number, lon: number): Vec3 => {
    const la = (lat * Math.PI) / 180;
    const lo = (lon * Math.PI) / 180;
    return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
};
const rotY = (v: Vec3, th: number): Vec3 => [
    v[0] * Math.cos(th) + v[2] * Math.sin(th),
    v[1],
    -v[0] * Math.sin(th) + v[2] * Math.cos(th),
];
const slerp = (a: Vec3, b: Vec3, t: number): Vec3 => {
    const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const om = Math.acos(dot);
    if (om < 1e-4) return a;
    const sa = Math.sin((1 - t) * om) / Math.sin(om);
    const sb = Math.sin(t * om) / Math.sin(om);
    return [sa * a[0] + sb * b[0], sa * a[1] + sb * b[1], sa * a[2] + sb * b[2]];
};
const haversineKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
    const r = Math.PI / 180;
    const dLat = (bLat - aLat) * r;
    const dLon = (bLon - aLon) * r;
    const h =
        Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
};

// Where the sun is overhead right now: declination from the day of the year,
// longitude from UTC. Ignores the equation of time, so the terminator can sit
// a few degrees off, which at this size is under a pixel.
const sunVector = (d: Date): Vec3 => {
    const dayOfYear = (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000;
    const declination = 23.44 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
    const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60;
    return toVec(declination, (12 - utcHours) * 15);
};

// Resolution of the night overlay, drawn per pixel then scaled up smoothly
const NIGHT_RES = 96;
// The ISS orbits about 420 km up: 1.066 Earth radii
const ISS_LIFT = 1.066;

const SIZE = 280;
const R = SIZE * 0.4;
const CX = SIZE / 2;
const CY = SIZE / 2;
const ZOOM_HOME = 1.9;
const FOLLOW_MS = 25000;
// Left alone this long after a spin, it drifts back to the arc
const SETTLE_MS = 5000;

const rotX = (v: Vec3, ph: number): Vec3 => [
    v[0],
    v[1] * Math.cos(ph) - v[2] * Math.sin(ph),
    v[1] * Math.sin(ph) + v[2] * Math.cos(ph),
];
const DEG = Math.PI / 180;
// The rotation that brings a place to the middle of the disc
const facing = (lat: number, lon: number) => ({ theta: lon * DEG - Math.PI / 2, phi: lat * DEG });
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// Land dots, evenly spaced: every 2° cell of land, thinned toward the poles
const LAND_DOTS: Vec3[] = (() => {
    if (typeof atob === "undefined") return [];
    const raw = atob(LAND_MASK);
    const dots: Vec3[] = [];
    for (let r = 0; r < LAND_ROWS; r++) {
        const lat = -90 + LAND_STEP / 2 + r * LAND_STEP;
        const skip = Math.max(1, Math.round(1 / Math.cos(lat * DEG)));
        for (let c = 0; c < LAND_COLS; c += skip) {
            const k = r * LAND_COLS + c;
            if (raw.charCodeAt(k >> 3) & (1 << (k & 7))) dots.push(toVec(lat, -180 + LAND_STEP / 2 + c * LAND_STEP));
        }
    }
    return dots;
})();

type City = { name: string; cc: string; lat: number; lon: number; tz: string; popK: number; v: Vec3 };
let citiesPromise: Promise<City[]> | null = null;
const loadCities = () =>
    (citiesPromise ??= fetch("/data/cities.json")
        .then((r) => r.json())
        .then((d: { tz: string[]; cities: [string, string, number, number, number, number][] }) =>
            d.cities.map(([name, cc, lat, lon, tz, popK]) => ({ name, cc, lat, lon, tz: d.tz[tz], popK, v: toVec(lat, lon) })),
        )
        .catch(() => []));

const regionName = (() => {
    try {
        const dn = new Intl.DisplayNames(["en"], { type: "region" });
        return (cc: string) => dn.of(cc) ?? cc;
    } catch {
        return (cc: string) => cc;
    }
})();
const localTime = (tz: string) => {
    try {
        return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date());
    } catch {
        return "";
    }
};
const lightMs = (km: number) => Math.max(1, Math.round((km / LIGHTSPEED_KM_S) * 1000));

// WMO weather codes, as Open-Meteo reports them
const weatherWord = (code: number) =>
    code === 0 ? "clear" : code <= 2 ? "partly cloudy" : code === 3 ? "overcast" : code <= 48 ? "fog" : code <= 57 ? "drizzle"
        : code <= 67 ? "rain" : code <= 77 ? "snow" : code <= 82 ? "showers" : "thunderstorms";

type Hover = { x: number; y: number; title: string; sub: string };
type Iss = { lat: number; lon: number; alt: number; vel: number };

export const SignalGlobe = () => {
    const reduce = useReducedMotion();
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inView = useInView(wrapRef, { margin: "-40px" });
    const [origin, setOrigin] = useState<{ lat: number; lon: number; city: string } | null>(null);
    // Live ISS position, read by the draw loop without restarting it
    const issRef = useRef<Iss | null>(null);
    // Re-renders the Kolkata clock line
    const [clock, setClock] = useState<Date | null>(null);

    // Interaction, read by the draw loop
    const view = useRef({ theta: 0, phi: 0, zoom: 1, vTheta: 0, vPhi: 0, lastTouch: -Infinity, inited: false });
    const drag = useRef<{ x: number; y: number; t: number; moved: boolean; id: number } | null>(null);
    const hoverRef = useRef<{ lat: number; lon: number } | null>(null);
    const pingRef = useRef<number | null>(null);
    const followUntil = useRef(0);
    const homeRef = useRef(false);
    const citiesRef = useRef<City[]>([]);
    const redraw = useRef<() => void>(() => {});
    const clickTimer = useRef<number | null>(null);

    const [hover, setHover] = useState<Hover | null>(null);
    const [ping, setPing] = useState<{ ms: number | null } | null>(null);
    const [following, setFollowing] = useState(false);
    const [home, setHome] = useState(false);
    const [weather, setWeather] = useState<{ temp: number; word: string; humidity: number } | null>(null);

    useEffect(() => {
        setClock(new Date());
        const id = setInterval(() => setClock(new Date()), 30000);
        return () => clearInterval(id);
    }, []);

    // Hand the visitor's city to the visitor pass, so it does not look it up again
    useEffect(() => {
        if (!origin) return;
        try {
            sessionStorage.setItem("visitor-origin", origin.city);
        } catch {
            /* ignore */
        }
    }, [origin]);

    // The city list, for the hover readout and the night lights
    useEffect(() => {
        if (!inView) return;
        loadCities().then((c) => {
            citiesRef.current = c;
            redraw.current();
        });
    }, [inView]);

    // ISS: fetch while the globe is on screen, every 15 s (every 5 s while following it)
    useEffect(() => {
        if (!inView) return;
        let alive = true;
        const poll = () =>
            fetch("https://api.wheretheiss.at/v1/satellites/25544", { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (alive && d && Number.isFinite(d.latitude) && Number.isFinite(d.longitude)) {
                        issRef.current = { lat: d.latitude, lon: d.longitude, alt: d.altitude, vel: d.velocity };
                    }
                })
                .catch(() => {});
        poll();
        const id = setInterval(poll, following ? 5000 : 15000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [inView, following]);

    // Resolve the visitor's position: IP geolocation via /api/visitor-location
    // (Vercel edge headers, city-accurate), falling back to the timezone
    // estimate on localhost or if the lookup fails
    useEffect(() => {
        const fromTimezone = (): { lat: number; lon: number; city: string } => {
            try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
                const hit = TZ_COORDS[tz];
                const raw = (tz.split("/").pop() || "your sector").replace(/_/g, " ");
                const city = CITY_RENAMES[raw] ?? raw;
                if (hit) return { lat: hit[0], lon: hit[1], city };
                // Longitude from the UTC offset (15 degrees per hour), latitude guessed
                return { lat: 20, lon: -new Date().getTimezoneOffset() / 4, city };
            } catch {
                return { lat: 20, lon: 0, city: "your sector" };
            }
        };

        let cancelled = false;
        fetch("/api/visitor-location")
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .then((d) => {
                if (cancelled) return;
                if (d && Number.isFinite(d.lat) && Number.isFinite(d.lon)) {
                    setOrigin({ lat: d.lat, lon: d.lon, city: (d.city as string) || fromTimezone().city });
                } else {
                    setOrigin(fromTimezone());
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Kolkata's weather, for the zoomed-in card
    useEffect(() => {
        if (!home || weather) return;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${BASE.lat}&longitude=${BASE.lon}&current=temperature_2m,weather_code,relative_humidity_2m`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                const c = d?.current;
                if (c && Number.isFinite(c.temperature_2m)) {
                    setWeather({ temp: Math.round(c.temperature_2m), word: weatherWord(c.weather_code), humidity: c.relative_humidity_2m });
                }
            })
            .catch(() => {});
    }, [home, weather]);

    // Escape zooms back out
    useEffect(() => {
        if (!home) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && goHome(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [home]);

    useEffect(() => {
        if (!origin || !inView) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = SIZE * dpr;
        canvas.height = SIZE * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const vFrom = toVec(origin.lat, origin.lon);
        const vTo = toVec(BASE.lat, BASE.lon);
        // Face the midpoint of the arc, then sway gently around it
        const mid = slerp(vFrom, vTo, 0.5);
        const thetaBase = Math.atan2(mid[2], mid[0]) - Math.PI / 2;
        const v = view.current;
        if (!v.inited) {
            v.theta = thetaBase;
            v.inited = true;
        }

        // Precompute grid lines
        const parallels: Vec3[][] = [];
        for (let lat = -60; lat <= 60; lat += 30) {
            const pts: Vec3[] = [];
            for (let lon = 0; lon <= 360; lon += 6) pts.push(toVec(lat, lon));
            parallels.push(pts);
        }
        const meridians: Vec3[][] = [];
        for (let lon = 0; lon < 360; lon += 30) {
            const pts: Vec3[] = [];
            for (let lat = -90; lat <= 90; lat += 6) pts.push(toVec(lat, lon));
            meridians.push(pts);
        }

        const ARC_N = 72;

        // Night overlay: an offscreen canvas coloured per pixel from each
        // point's angle to the sun, with a soft twilight band at the edge
        const nightCanvas = document.createElement("canvas");
        nightCanvas.width = NIGHT_RES;
        nightCanvas.height = NIGHT_RES;
        const nctx = nightCanvas.getContext("2d");
        const nightImg = nctx ? nctx.createImageData(NIGHT_RES, NIGHT_RES) : null;

        const draw = (t: number, dt: number) => {
            const now = performance.now();
            const home = homeRef.current;
            const follow = now < followUntil.current ? issRef.current : null;

            // ---- where the globe points this frame
            if (!drag.current) {
                let target: { theta: number; phi: number } | null = null;
                if (home) target = facing(BASE.lat, BASE.lon);
                else if (follow) target = facing(follow.lat, follow.lon);
                else if (now - v.lastTouch > SETTLE_MS) {
                    target = { theta: thetaBase + (reduce ? 0 : 0.45 * Math.sin((t * 2 * Math.PI) / 14)), phi: 0 };
                }
                if (target) {
                    const k = reduce ? 1 : 1 - Math.exp(-dt * (home || follow ? 3 : 1.2));
                    v.theta += wrapAngle(target.theta - v.theta) * k;
                    v.phi += (target.phi - v.phi) * k;
                    v.vTheta = 0;
                    v.vPhi = 0;
                } else {
                    // Coasting after a flick
                    v.theta += v.vTheta * dt;
                    v.phi = Math.max(-1.1, Math.min(1.1, v.phi + v.vPhi * dt));
                    const decay = Math.exp(-dt * 2.2);
                    v.vTheta *= decay;
                    v.vPhi *= decay;
                }
            }
            const zTarget = home ? ZOOM_HOME : 1;
            v.zoom += (zTarget - v.zoom) * (reduce ? 1 : 1 - Math.exp(-dt * 4));
            const theta = v.theta;
            const phi = v.phi;
            const Rz = R * v.zoom;
            const rot = (p: Vec3) => rotX(rotY(p, theta), phi);
            // x is negated so east falls on the right, as on a real globe seen from
            // outside. It used to be mirrored, which nothing revealed until the
            // day/night terminator put the sunrise on the wrong side.
            const project = (p: Vec3) => ({ x: CX - Rz * p[0], y: CY - Rz * p[1], z: p[2] });

            ctx.clearRect(0, 0, SIZE, SIZE);

            // Sphere body + outline
            ctx.beginPath();
            ctx.arc(CX, CY, Rz, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(45,212,191,0.035)";
            ctx.fill();
            ctx.strokeStyle = "rgba(45,212,191,0.3)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Night side
            const sunW = sunVector(new Date());
            if (nctx && nightImg) {
                const sv = rot(sunW);
                const px = nightImg.data;
                for (let j = 0; j < NIGHT_RES; j++) {
                    const y = 1 - (2 * (j + 0.5)) / NIGHT_RES;
                    for (let i = 0; i < NIGHT_RES; i++) {
                        const x = (2 * (i + 0.5)) / NIGHT_RES - 1;
                        const k = (j * NIGHT_RES + i) * 4;
                        const rr = x * x + y * y;
                        if (rr > 1) {
                            px[k + 3] = 0;
                            continue;
                        }
                        // Screen x is the negated rotated x (see project)
                        const dot = -x * sv[0] + y * sv[1] + Math.sqrt(1 - rr) * sv[2];
                        // 0 on the night side, 1 on the day side, blended across twilight.
                        // The sphere is nearly transparent over a black sky, so darkening
                        // the night side alone would not show: the day side gets a teal
                        // wash, brightest under the sun, and the night side goes navy.
                        const day = Math.min(1, Math.max(0, (dot + 0.08) / 0.16));
                        px[k] = Math.round(2 + 43 * day);
                        px[k + 1] = Math.round(6 + 206 * day);
                        px[k + 2] = Math.round(23 + 168 * day);
                        px[k + 3] = Math.round((1 - day) * 150 + day * (16 + 40 * Math.max(0, dot)));
                    }
                }
                nctx.putImageData(nightImg, 0, 0);
                ctx.save();
                ctx.beginPath();
                ctx.arc(CX, CY, Rz, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(nightCanvas, CX - Rz, CY - Rz, Rz * 2, Rz * 2);
                ctx.restore();
            }

            // Continents, as dots, dimmer on the night side
            const dotSize = 1.15 * Math.min(1.6, v.zoom);
            for (const d of LAND_DOTS) {
                const p = rot(d);
                if (p[2] < 0.04) continue;
                const lit = d[0] * sunW[0] + d[1] * sunW[1] + d[2] * sunW[2] > 0;
                ctx.fillStyle = `rgba(203,213,225,${((lit ? 0.5 : 0.22) * (0.35 + 0.65 * p[2])).toFixed(3)})`;
                ctx.fillRect(CX - Rz * p[0] - dotSize / 2, CY - Rz * p[1] - dotSize / 2, dotSize, dotSize);
            }

            // Grid
            ctx.lineWidth = 0.6;
            const drawPolyline = (pts: Vec3[], alpha: number) => {
                for (let i = 0; i < pts.length - 1; i++) {
                    const a = project(rot(pts[i]));
                    const b = project(rot(pts[i + 1]));
                    if (a.z < 0.02 || b.z < 0.02) continue;
                    ctx.strokeStyle = `rgba(45,212,191,${(alpha * (0.35 + 0.65 * Math.min(a.z, b.z))).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            };
            parallels.forEach((p, i) => drawPolyline(p, i === 2 ? 0.26 : 0.14));
            meridians.forEach((m) => drawPolyline(m, 0.14));

            // City lights on the night side, brighter for bigger cities
            for (const c of citiesRef.current) {
                if (c.v[0] * sunW[0] + c.v[1] * sunW[1] + c.v[2] * sunW[2] > -0.04) continue;
                const p = project(rot(c.v));
                if (p.z < 0.05) continue;
                const b = Math.min(1, 0.25 + Math.log10(1 + c.popK) / 4.2);
                ctx.fillStyle = `rgba(253,224,139,${(b * (0.4 + 0.6 * p.z)).toFixed(3)})`;
                const s = c.popK > 5000 ? 2 : 1.3;
                ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
            }

            // Signal arc, lifted off the surface
            for (let i = 0; i < ARC_N; i++) {
                const t0 = i / ARC_N;
                const t1 = (i + 1) / ARC_N;
                const lift0 = 1 + 0.22 * Math.sin(Math.PI * t0);
                const lift1 = 1 + 0.22 * Math.sin(Math.PI * t1);
                const s0 = slerp(vFrom, vTo, t0).map((c) => c * lift0) as Vec3;
                const s1 = slerp(vFrom, vTo, t1).map((c) => c * lift1) as Vec3;
                const a = project(rot(s0));
                const b = project(rot(s1));
                const front = a.z > 0 && b.z > 0;
                // Violet at the visitor's end fading to teal at the base
                const mix = t0;
                const cr = Math.round(167 + (45 - 167) * mix);
                const cg = Math.round(139 + (212 - 139) * mix);
                const cb = Math.round(250 + (191 - 250) * mix);
                ctx.strokeStyle = `rgba(${cr},${cg},${cb},${front ? 0.85 : 0.12})`;
                ctx.lineWidth = front ? 1.4 : 1;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }

            // Endpoint markers
            const pFrom = project(rot(vFrom));
            const pTo = project(rot(vTo));
            if (pFrom.z > 0) {
                ctx.fillStyle = "#c4b5fd";
                ctx.shadowColor = "rgba(167,139,250,0.9)";
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(pFrom.x, pFrom.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            if (pTo.z > 0) {
                ctx.fillStyle = "#5eead4";
                ctx.shadowColor = "rgba(45,212,191,1)";
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(pTo.x, pTo.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                // Beacon ring breathing around the base station
                const ring = (t % 2.6) / 2.6;
                ctx.strokeStyle = `rgba(94,234,212,${(0.7 * (1 - ring)).toFixed(3)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pTo.x, pTo.y, 4 + ring * 10, 0, Math.PI * 2);
                ctx.stroke();
            }

            // The hovered spot, with a faint line home
            const hv = hoverRef.current;
            if (hv) {
                const hp = toVec(hv.lat, hv.lon);
                const p = project(rot(hp));
                if (p.z > 0) {
                    ctx.setLineDash([2, 3]);
                    ctx.strokeStyle = "rgba(226,232,240,0.45)";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let i = 0; i <= 40; i++) {
                        const q = project(rot(slerp(hp, vTo, i / 40)));
                        if (i === 0) ctx.moveTo(q.x, q.y);
                        else ctx.lineTo(q.x, q.y);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.strokeStyle = "rgba(248,250,252,0.9)";
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // The ISS, a little above the surface, when it is on this side
            const iss = issRef.current;
            if (iss) {
                const p = project(rot(toVec(iss.lat, iss.lon).map((c) => c * ISS_LIFT) as Vec3));
                if (p.z > 0) {
                    ctx.fillStyle = "#fde68a";
                    ctx.shadowColor = "rgba(253,230,138,0.9)";
                    ctx.shadowBlur = follow ? 12 : 6;
                    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
                    ctx.shadowBlur = 0;
                    ctx.font = "8px ui-monospace, SFMono-Regular, monospace";
                    ctx.fillStyle = "rgba(253,230,138,0.85)";
                    ctx.fillText("ISS", p.x + 5, p.y - 4);
                    if (follow) {
                        ctx.strokeStyle = "rgba(253,230,138,0.6)";
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 8 + 2 * Math.sin(t * 4), 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }

            // A ping: out to Kolkata and back, with a flash at each end
            const ps = pingRef.current;
            if (ps !== null) {
                const u = (now - ps) / 1400;
                if (u >= 1) pingRef.current = null;
                else {
                    const leg = u < 0.5 ? u * 2 : 2 - u * 2;
                    const lift = 1 + 0.22 * Math.sin(Math.PI * leg);
                    const pp = project(rot(slerp(vFrom, vTo, leg).map((c) => c * lift) as Vec3));
                    if (pp.z > -0.05) {
                        ctx.fillStyle = "#fef3c7";
                        ctx.shadowColor = "rgba(252,211,77,1)";
                        ctx.shadowBlur = 12;
                        ctx.beginPath();
                        ctx.arc(pp.x, pp.y, 3.4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                    const flash = (at: { x: number; y: number; z: number }, k: number) => {
                        if (at.z <= 0 || k < 0 || k > 1) return;
                        ctx.strokeStyle = `rgba(252,211,77,${(0.9 * (1 - k)).toFixed(3)})`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(at.x, at.y, 4 + k * 18, 0, Math.PI * 2);
                        ctx.stroke();
                    };
                    flash(pTo, (u - 0.5) / 0.25);
                    flash(pFrom, (u - 0.9) / 0.1 + 0.2);
                }
            }

            // The usual ping pulse travelling along the arc
            if (!reduce && ps === null) {
                const u = (t % 2.6) / 2.6;
                const lift = 1 + 0.22 * Math.sin(Math.PI * u);
                const pv = slerp(vFrom, vTo, u).map((c) => c * lift) as Vec3;
                const pp = project(rot(pv));
                if (pp.z > -0.05) {
                    ctx.fillStyle = "#ffffff";
                    ctx.shadowColor = "rgba(153,246,228,0.95)";
                    ctx.shadowBlur = 9;
                    ctx.beginPath();
                    ctx.arc(pp.x, pp.y, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        };

        let raf = 0;
        let last = performance.now();
        const start = last;
        const frame = (now: number) => {
            draw((now - start) / 1000, Math.min(0.05, (now - last) / 1000));
            last = now;
            if (!reduce) raf = requestAnimationFrame(frame);
        };
        // With reduced motion there is no loop: interactions ask for a frame
        redraw.current = () => {
            if (reduce) requestAnimationFrame((n) => draw((n - start) / 1000, 1));
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [origin, inView, reduce]);

    // ---- pointer ----------------------------------------------------------

    // Where on Earth a point of the canvas is, or null off the disc
    const pick = (e: React.PointerEvent | React.MouseEvent) => {
        const r = canvasRef.current?.getBoundingClientRect();
        if (!r) return null;
        const v = view.current;
        const Rz = R * v.zoom;
        const sx = e.clientX - r.left;
        const sy = e.clientY - r.top;
        const x = -(sx - CX) / Rz;
        const y = -(sy - CY) / Rz;
        const rr = x * x + y * y;
        if (rr > 1) return { sx, sy, geo: null };
        const w = rotY(rotX([x, y, Math.sqrt(1 - rr)], -v.phi), -v.theta);
        return { sx, sy, geo: { lat: Math.asin(w[1]) / DEG, lon: Math.atan2(w[2], w[0]) / DEG } };
    };

    // The ISS's spot on the canvas, if it is on this side
    const issOnCanvas = () => {
        const iss = issRef.current;
        if (!iss) return null;
        const v = view.current;
        const p = rotX(rotY(toVec(iss.lat, iss.lon).map((c) => c * ISS_LIFT) as Vec3, v.theta), v.phi);
        if (p[2] <= 0) return null;
        return { x: CX - R * v.zoom * p[0], y: CY - R * v.zoom * p[1] };
    };

    const describe = (lat: number, lon: number): Hover | null => {
        const cities = citiesRef.current;
        let best: City | null = null;
        let bestKm = Infinity;
        for (const c of cities) {
            const d = haversineKm(lat, lon, c.lat, c.lon);
            if (d < bestKm) {
                bestKm = d;
                best = c;
            }
        }
        const kmHome = haversineKm(lat, lon, BASE.lat, BASE.lon);
        const far = `${kmHome.toLocaleString()} km from Kolkata · light ${lightMs(kmHome)} ms`;
        if (best && bestKm < 450) {
            const place = `${best.name}, ${regionName(best.cc)}`;
            const km = haversineKm(best.lat, best.lon, BASE.lat, BASE.lon);
            return { x: 0, y: 0, title: place, sub: `${localTime(best.tz)} there · ${km.toLocaleString()} km from Kolkata · light ${lightMs(km)} ms` };
        }
        const where = describeLocation(lat, lon);
        return { x: 0, y: 0, title: where.charAt(0).toUpperCase() + where.slice(1), sub: far };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (home) return;
        drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const d = drag.current;
        const v = view.current;
        if (d && d.id === e.pointerId) {
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) < 4) return;
            d.moved = true;
            const now = performance.now();
            const dtS = Math.max(0.008, (now - d.t) / 1000);
            const Rz = R * v.zoom;
            v.theta -= dx / Rz;
            // Phones only spin sideways, so a vertical swipe still scrolls the page
            if (e.pointerType === "mouse") v.phi = Math.max(-1.1, Math.min(1.1, v.phi + dy / Rz));
            v.vTheta = -dx / Rz / dtS;
            v.vPhi = e.pointerType === "mouse" ? dy / Rz / dtS : 0;
            v.lastTouch = now;
            followUntil.current = 0;
            if (following) setFollowing(false);
            d.x = e.clientX;
            d.y = e.clientY;
            d.t = now;
            hoverRef.current = null;
            setHover(null);
            redraw.current();
            return;
        }
        if (e.pointerType !== "mouse" || home) return;
        const p = pick(e);
        if (!p) return;
        // The ISS takes precedence when the pointer is on it
        const iss = issOnCanvas();
        if (iss && Math.hypot(p.sx - iss.x, p.sy - iss.y) < 10 && issRef.current) {
            const s = issRef.current;
            hoverRef.current = null;
            setHover({
                x: p.sx,
                y: p.sy,
                title: "International Space Station",
                sub: `${Math.round(s.alt)} km up · ${Math.round(s.vel).toLocaleString()} km/h · ${describeLocation(s.lat, s.lon)} · click to follow`,
            });
            return;
        }
        if (!p.geo) {
            hoverRef.current = null;
            setHover(null);
            return;
        }
        hoverRef.current = p.geo;
        const info = describe(p.geo.lat, p.geo.lon);
        setHover(info && { ...info, x: p.sx, y: p.sy });
        redraw.current();
    };

    const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const d = drag.current;
        drag.current = null;
        if (!d || d.moved) {
            if (d) view.current.lastTouch = performance.now();
            return;
        }
        // A click, not a spin: on the ISS it follows it; anywhere else it pings,
        // unless a second click turns it into a double-click
        const p = pick(e);
        const iss = issOnCanvas();
        if (p && iss && Math.hypot(p.sx - iss.x, p.sy - iss.y) < 12) {
            const on = !following;
            followUntil.current = on ? performance.now() + FOLLOW_MS : 0;
            setFollowing(on);
            view.current.lastTouch = performance.now();
            if (on) window.setTimeout(() => setFollowing(false), FOLLOW_MS);
            return;
        }
        // A second click (or tap) inside the window is a double: zoom home.
        // Detected here rather than with dblclick, which phones do not all send
        if (clickTimer.current) {
            window.clearTimeout(clickTimer.current);
            clickTimer.current = null;
            goHome(!home);
            return;
        }
        clickTimer.current = window.setTimeout(() => {
            clickTimer.current = null;
            sendPing();
        }, 260);
    };

    function goHome(on: boolean) {
        homeRef.current = on;
        setHome(on);
        setHover(null);
        hoverRef.current = null;
        followUntil.current = 0;
        setFollowing(false);
        view.current.lastTouch = on ? Infinity : performance.now() - SETTLE_MS + 1500;
        redraw.current();
    }

    // Time a real round trip to this site's nearest server: the best of three
    async function sendPing() {
        pingRef.current = performance.now();
        setPing({ ms: null });
        redraw.current();
        let best = Infinity;
        for (let i = 0; i < 3; i++) {
            const t0 = performance.now();
            try {
                await fetch(`/api/ping?n=${Date.now()}-${i}`, { cache: "no-store" });
                best = Math.min(best, performance.now() - t0);
            } catch {
                break;
            }
        }
        setPing({ ms: Number.isFinite(best) ? Math.round(best) : null });
        window.setTimeout(() => setPing((p) => (p && p.ms !== undefined ? null : p)), 9000);
    }

    const distance = origin ? haversineKm(origin.lat, origin.lon, BASE.lat, BASE.lon) : null;
    const rttMs = distance !== null ? Math.max(1, Math.round((distance / LIGHTSPEED_KM_S) * 1000 * 2)) : null;

    return (
        <div ref={wrapRef} className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: SIZE, height: SIZE }}>
                <canvas
                    ref={canvasRef}
                    style={{ width: SIZE, height: SIZE, touchAction: "pan-y" }}
                    className={home ? "cursor-zoom-out" : "cursor-grab active:cursor-grabbing"}
                    aria-label="Globe showing the signal path from your location to Kolkata, India. Drag to spin it, hover to explore, click to ping Kolkata, double-click to zoom in on Kolkata"
                    role="img"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={() => (drag.current = null)}
                    onPointerLeave={() => {
                        hoverRef.current = null;
                        setHover(null);
                    }}
                />

                {/* Hover readout */}
                <AnimatePresence>
                    {hover && (
                        <motion.div
                            key="hover"
                            data-globe-hover
                            className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-lg border border-white/15 bg-black/85 px-2.5 py-1.5 font-mono backdrop-blur-sm"
                            style={{ left: Math.min(Math.max(hover.x, 110), SIZE - 110), top: hover.y + 14, translateX: "-50%" }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        >
                            <p className="text-[11px] text-neutral-100">{hover.title}</p>
                            <p className="mt-0.5 text-[9.5px] leading-snug text-neutral-400">{hover.sub}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Zoomed in on Kolkata */}
                <AnimatePresence>{home && <HomeCard onClose={() => goHome(false)} weather={weather} clock={clock} />}</AnimatePresence>
            </div>

            {origin && distance !== null && (
                <div className="space-y-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    <p>
                        uplink &middot; <span className="text-violet-300/90">{origin.city}</span> →{" "}
                        <span className="text-teal-300/90">kolkata station</span>
                    </p>
                    <p className="flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
                        {distance.toLocaleString()} km &middot; rtt {rttMs} ms at lightspeed
                        {ping && (
                            <span className="text-amber-200/90" title="Timed in your browser, to this site's nearest server">
                                &middot; {ping.ms === null ? "pinging…" : `${ping.ms} ms for real`}
                            </span>
                        )}
                    </p>
                    {following && issRef.current && <p className="text-amber-200/80">tracking the iss &middot; click it to let go</p>}
                    {clock && !following && (
                        <p>
                            kolkata {kolkataNow(clock).time} &middot;{" "}
                            <span style={{ color: kolkataNow(clock).mood.color }}>{kolkataNow(clock).mood.reply}</span>
                        </p>
                    )}
                    <p className="pt-1 text-[9px] normal-case tracking-[0.12em] text-neutral-600">
                        <span className="hidden md:inline">drag to spin · click to ping · double-click for home</span>
                        <span className="md:hidden">drag to spin · tap to ping · double-tap for home</span>
                    </p>
                    <p className="text-[8.5px] normal-case tracking-[0.1em] text-neutral-700">
                        cities{" "}
                        <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-neutral-500">
                            GeoNames
                        </a>{" "}
                        · CC BY 4.0
                    </p>
                </div>
            )}
        </div>
    );
};

// ---- Kolkata, up close ----------------------------------------------------

// NASA GIBS serves each day's satellite imagery as web-map tiles. Terra passes
// over Kolkata around 10:30 local time and the tiles land a few hours later,
// so before about 1:30 PM there the latest full view is yesterday's.
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default";
const TILE_Z = 7;
const VIEW = 360; // px of the tile mosaic shown, around Kolkata
const IMG = 176; // its size on screen, so the card fits over the globe

const passDate = () => new Date(Date.now() - 8 * 3600 * 1000).toISOString().slice(0, 10);
const tileXY = (lat: number, lon: number, z: number) => {
    const n = 2 ** z;
    const la = lat * DEG;
    return { x: ((lon + 180) / 360) * n * 256, y: ((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2) * n * 256 };
};

function HomeCard({
    onClose,
    weather,
    clock,
}: {
    onClose: () => void;
    weather: { temp: number; word: string; humidity: number } | null;
    clock: Date | null;
}) {
    const [date, setDate] = useState(passDate);
    const [failed, setFailed] = useState(false);
    const c = tileXY(BASE.lat, BASE.lon, TILE_Z);
    const left = c.x - VIEW / 2;
    const top = c.y - VIEW / 2;
    const tiles: { x: number; y: number }[] = [];
    for (let tx = Math.floor(left / 256); tx <= Math.floor((left + VIEW) / 256); tx++)
        for (let ty = Math.floor(top / 256); ty <= Math.floor((top + VIEW) / 256); ty++) tiles.push({ x: tx, y: ty });
    const scale = IMG / VIEW;
    const now = clock ? kolkataNow(clock) : null;
    const [, mm, dd] = date.split("-").map(Number);
    const pretty = `${dd} ${"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[mm - 1]}`;

    return (
        <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-[196px] overflow-hidden rounded-2xl border border-white/15 bg-black/85 p-2.5 font-mono shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-md"
                initial={{ scale: 0.9, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 6 }}
                transition={{ delay: 0.25, duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-1.5 flex items-center justify-between px-0.5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-300">kolkata station</p>
                    <button type="button" onClick={onClose} aria-label="Zoom back out" className="rounded-full p-1 text-neutral-500 hover:bg-white/10 hover:text-white">
                        <IconX className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Today's view from orbit, centred on the city */}
                <div className="relative overflow-hidden rounded-lg bg-slate-900" style={{ width: IMG, height: IMG }}>
                    {!failed && (
                        <div className="absolute left-0 top-0 origin-top-left" style={{ width: VIEW, height: VIEW, transform: `scale(${scale})` }}>
                            {tiles.map((t) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    key={`${date}-${t.x}-${t.y}`}
                                    src={`${GIBS}/${date}/GoogleMapsCompatible_Level9/${TILE_Z}/${t.y}/${t.x}.jpg`}
                                    alt=""
                                    // A pixel of overlap hides the seams scaling leaves between tiles
                                    width={257}
                                    height={257}
                                    className="absolute max-w-none"
                                    style={{ left: t.x * 256 - left, top: t.y * 256 - top }}
                                    onError={() => {
                                        // Not processed yet: fall back a day, then give up
                                        const prev = new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
                                        if (prev < new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)) setFailed(true);
                                        else setDate(prev);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    {failed && <p className="absolute inset-0 flex items-center justify-center text-[10px] text-neutral-500">no clear pass lately</p>}
                    {/* Kolkata */}
                    <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,1)]" />
                    <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-amber-300/70 motion-reduce:animate-none" />
                    <span className="absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[8.5px] tracking-wide text-neutral-300">
                        from orbit · NASA · {pretty}
                    </span>
                </div>

                <div className="mt-1.5 space-y-0 px-0.5 text-[9.5px] leading-snug text-neutral-400">
                    {now && (
                        <p>
                            <span className="text-neutral-100">{now.time}</span> · <span style={{ color: now.mood.color }}>{now.mood.label}</span>
                        </p>
                    )}
                    <p>{weather ? `${weather.temp}°C · ${weather.word} · ${weather.humidity}% humidity` : "reading the weather…"}</p>
                    {now && <p className="text-neutral-500">{now.mood.reply}</p>}
                </div>
            </motion.div>
        </motion.div>
    );
}
