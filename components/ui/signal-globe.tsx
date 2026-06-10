"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

// A slowly swaying wireframe globe with a glowing signal arc from the
// visitor's rough location (estimated from their timezone, no permission
// popups) to home base in Kolkata, plus a ping pulse and a mono telemetry
// readout.
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

const SIZE = 280;
const R = SIZE * 0.4;
const CX = SIZE / 2;
const CY = SIZE / 2;

export const SignalGlobe = () => {
    const reduce = useReducedMotion();
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inView = useInView(wrapRef, { margin: "-40px" });
    const [origin, setOrigin] = useState<{ lat: number; lon: number; city: string } | null>(null);

    // Resolve the visitor's rough position from their timezone
    useEffect(() => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
            const hit = TZ_COORDS[tz];
            const raw = (tz.split("/").pop() || "your sector").replace(/_/g, " ");
            const city = CITY_RENAMES[raw] ?? raw;
            if (hit) {
                setOrigin({ lat: hit[0], lon: hit[1], city });
            } else {
                // Longitude from the UTC offset (15 degrees per hour), latitude guessed
                const lon = -new Date().getTimezoneOffset() / 4;
                setOrigin({ lat: 20, lon, city });
            }
        } catch {
            setOrigin({ lat: 20, lon: 0, city: "your sector" });
        }
    }, []);

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

        const project = (v: Vec3) => ({ x: CX + R * v[0], y: CY - R * v[1], z: v[2] });

        // Sampled grid polyline; drawn segment by segment so back-facing parts drop out
        const drawPolyline = (pts: Vec3[], theta: number, alpha: number) => {
            for (let i = 0; i < pts.length - 1; i++) {
                const a = project(rotY(pts[i], theta));
                const b = project(rotY(pts[i + 1], theta));
                if (a.z < 0.02 || b.z < 0.02) continue;
                ctx.strokeStyle = `rgba(45,212,191,${(alpha * (0.35 + 0.65 * Math.min(a.z, b.z))).toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        };

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

        const draw = (t: number) => {
            const theta = thetaBase + (reduce ? 0 : 0.45 * Math.sin((t * 2 * Math.PI) / 14));
            ctx.clearRect(0, 0, SIZE, SIZE);

            // Sphere body + outline
            ctx.beginPath();
            ctx.arc(CX, CY, R, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(45,212,191,0.035)";
            ctx.fill();
            ctx.strokeStyle = "rgba(45,212,191,0.3)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.lineWidth = 0.6;
            parallels.forEach((p, i) => drawPolyline(p, theta, i === 2 ? 0.3 : 0.18));
            meridians.forEach((m) => drawPolyline(m, theta, 0.18));

            // Signal arc, lifted off the surface
            for (let i = 0; i < ARC_N; i++) {
                const t0 = i / ARC_N;
                const t1 = (i + 1) / ARC_N;
                const lift0 = 1 + 0.22 * Math.sin(Math.PI * t0);
                const lift1 = 1 + 0.22 * Math.sin(Math.PI * t1);
                const s0 = slerp(vFrom, vTo, t0).map((c) => c * lift0) as Vec3;
                const s1 = slerp(vFrom, vTo, t1).map((c) => c * lift1) as Vec3;
                const a = project(rotY(s0, theta));
                const b = project(rotY(s1, theta));
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
            const pFrom = project(rotY(vFrom, theta));
            const pTo = project(rotY(vTo, theta));
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

            // Ping pulse travelling along the arc
            if (!reduce) {
                const u = (t % 2.6) / 2.6;
                const lift = 1 + 0.22 * Math.sin(Math.PI * u);
                const pv = slerp(vFrom, vTo, u).map((c) => c * lift) as Vec3;
                const pp = project(rotY(pv, theta));
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
        const start = performance.now();
        const frame = (now: number) => {
            draw((now - start) / 1000);
            if (!reduce) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [origin, inView, reduce]);

    const distance = origin ? haversineKm(origin.lat, origin.lon, BASE.lat, BASE.lon) : null;
    const rttMs = distance !== null ? Math.max(1, Math.round((distance / LIGHTSPEED_KM_S) * 1000 * 2)) : null;

    return (
        <div ref={wrapRef} className="flex flex-col items-center gap-4">
            <canvas
                ref={canvasRef}
                style={{ width: SIZE, height: SIZE }}
                aria-label="Wireframe globe showing the signal path from your location to Kolkata, India"
                role="img"
            />
            {origin && distance !== null && (
                <div className="space-y-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    <p>
                        uplink &middot; <span className="text-violet-300/90">{origin.city}</span> →{" "}
                        <span className="text-teal-300/90">kolkata station</span>
                    </p>
                    <p className="flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
                        {distance.toLocaleString()} km &middot; rtt {rttMs} ms at lightspeed
                    </p>
                </div>
            )}
        </div>
    );
};
