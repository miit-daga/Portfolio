"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ecfToLookAngles, eciToEcf, gstime, json2satrec, propagate, type SatRec } from "satellite.js";
import { buildEarth } from "@/app/arcade/earth";
import { starPoints } from "@/app/arcade/space";
import { sun } from "@/lib/iss-pass";
import { CATEGORY, SATELLITES, SITES, type Category, type Satellite } from "@/lib/isro/satellites";
import type { Omm } from "@/app/api/isro/satellites/route";

// India's active satellites, live, on a globe (for app/isro). Their orbits
// come from app/api/isro/satellites; where each one is, this moment, is
// worked out here in the browser with SGP4 (satellite.js), 60 times a
// second. The globe is Earth-fixed (a satellite sits over the country it's
// over) and lit by the real Sun. Time can run faster, to watch NavIC's
// satellites trace their figure-eights over India.

const R_KM = 6371;
const RAD = Math.PI / 180;
const SPEEDS = [1, 120, 1200] as const;

type Live = { sat: Satellite; rec: SatRec; periodMin: number };
type Now = { lat: number; lon: number; alt: number; speed: number; up: boolean | null; elevation: number | null };

/** Earth-fixed km to the scene (Earth radius 1; y is north; longitude 0 on +x, 90° east on -z, as the texture wraps). */
const toScene = (p: { x: number; y: number; z: number }, out = new THREE.Vector3()) => out.set(p.x / R_KM, p.z / R_KM, -p.y / R_KM);

/** Where a satellite is at a moment, Earth-fixed km, or null if its orbit can't be worked out. */
function whereAt(rec: SatRec, date: Date) {
    const pv = propagate(rec, date);
    const p = pv?.position;
    const v = pv?.velocity;
    if (!p || typeof p === "boolean" || !v || typeof v === "boolean") return null;
    return { ecf: eciToEcf(p, gstime(date)), speed: Math.hypot(v.x, v.y, v.z) };
}

export function SatellitesGlobe() {
    const mount = useRef<HTMLDivElement>(null);
    const [live, setLive] = useState<Live[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [hidden, setHidden] = useState<Set<Category>>(new Set());
    const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
    const [zoom, setZoom] = useState<"ring" | "close">("ring");
    const [me, setMe] = useState<{ lat: number; lon: number; city: string | null } | null>(null);
    const [now, setNow] = useState<Now | null>(null);
    const [overhead, setOverhead] = useState<number | null>(null);
    const [nextPass, setNextPass] = useState<string | null>(null);
    const state = useRef({ selected, hidden, speed, zoom, me, simT: Date.now(), last: performance.now() });
    state.current.selected = selected;
    state.current.hidden = hidden;
    state.current.me = me;

    // the orbits, and the visitor's rough location (for "above your horizon")
    useEffect(() => {
        fetch("/api/isro/satellites")
            .then((r) => (r.ok ? (r.json() as Promise<{ sats: Omm[] }>) : Promise.reject()))
            .then((d) => {
                const byId = new Map(d.sats.map((o) => [Number(o.NORAD_CAT_ID), o]));
                const out: Live[] = [];
                for (const sat of SATELLITES) {
                    const o = byId.get(sat.norad);
                    if (!o) continue;
                    try {
                        const rec = json2satrec(o as never);
                        out.push({ sat, rec, periodMin: 1440 / Number(o.MEAN_MOTION) });
                    } catch {
                        /* skip one that won't parse */
                    }
                }
                setLive(out);
            })
            .catch(() => setFailed(true));
        fetch("/api/visitor-location")
            .then((r) => r.json())
            .then((d: { lat: number | null; lon: number | null; city: string | null }) => d.lat !== null && d.lon !== null && setMe({ lat: d.lat, lon: d.lon, city: d.city }))
            .catch(() => {});
    }, []);

    // speed and zoom, handed to the running scene
    useEffect(() => {
        state.current.simT = state.current.simT + 0;
        state.current.speed = speed;
    }, [speed]);
    useEffect(() => {
        state.current.zoom = zoom;
    }, [zoom]);

    // the scene
    useEffect(() => {
        const el = mount.current;
        if (!el || !live) return;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true });
        } catch {
            setFailed(true);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
        const manager = new THREE.LoadingManager();
        scene.add(starPoints(90, manager));

        // the Earth, lit by the real Sun (its direction, Earth-fixed)
        const sunDir = new THREE.Vector3(1, 0, 0);
        const earth = buildEarth(renderer, 1, sunDir);
        scene.add(earth.group);

        // the geostationary ring, faint, for scale
        const ringPts = Array.from({ length: 181 }, (_, i) => {
            const a = (i / 180) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 6.6107, 0, Math.sin(a) * 6.6107);
        });
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12 }));
        scene.add(ring);

        // the satellites: one point each, in its category's colour
        const n = live.length;
        const pos = new Float32Array(n * 3);
        const col = new Float32Array(n * 3);
        live.forEach((l, i) => {
            const c = new THREE.Color(CATEGORY[l.sat.category].colour);
            col.set([c.r, c.g, c.b], i * 3);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        const dotTex = (() => {
            const c = document.createElement("canvas");
            c.width = c.height = 64;
            const g = c.getContext("2d")!;
            const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, "rgba(255,255,255,1)");
            grad.addColorStop(0.35, "rgba(255,255,255,0.9)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
            return new THREE.CanvasTexture(c);
        })();
        const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 11, sizeAttenuation: false, vertexColors: true, map: dotTex, transparent: true, depthWrite: false }));
        scene.add(points);

        // the selected one: a ring round it, and its path over one orbit
        const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: (() => {
                    const c = document.createElement("canvas");
                    c.width = c.height = 64;
                    const g = c.getContext("2d")!;
                    g.strokeStyle = "white";
                    g.lineWidth = 4;
                    g.beginPath();
                    g.arc(32, 32, 24, 0, Math.PI * 2);
                    g.stroke();
                    return new THREE.CanvasTexture(c);
                })(),
                depthTest: false,
                sizeAttenuation: false,
            }),
        );
        halo.scale.setScalar(0.05);
        halo.visible = false;
        scene.add(halo);
        const path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
        scene.add(path);
        let pathFor: number | null = null;
        let pathAt = 0;

        // where the visitor is
        const home = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
        home.visible = false;
        scene.add(home);

        // looking at India to start with
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 1.4;
        controls.maxDistance = 40;
        const india = toScene({ x: Math.cos(20 * RAD) * Math.cos(80 * RAD) * R_KM, y: Math.cos(20 * RAD) * Math.sin(80 * RAD) * R_KM, z: Math.sin(20 * RAD) * R_KM });
        camera.position.copy(india.clone().normalize().multiplyScalar(13));
        let wantDist: number | null = null;
        let lastZoom = state.current.zoom;

        const fit = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);

        // picking a satellite
        const ray = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        let downAt: { x: number; y: number } | null = null;
        const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
        const onUp = (e: PointerEvent) => {
            if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
            const r = renderer.domElement.getBoundingClientRect();
            ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
            ray.setFromCamera(ndc, camera);
            ray.params.Points = { threshold: camera.position.length() * 0.012 };
            const hits = ray.intersectObject(points).filter((h) => h.index !== undefined && !state.current.hidden.has(live[h.index!].sat.category));
            setSelected(hits.length ? live[hits[0].index!].sat.norad : null);
        };
        renderer.domElement.addEventListener("pointerdown", onDown);
        renderer.domElement.addEventListener("pointerup", onUp);

        let raf = 0;
        let panelAt = 0;
        const tmp = new THREE.Vector3();
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const t = performance.now();
            const s = state.current;
            s.simT += (t - s.last) * s.speed;
            s.last = t;
            const date = new Date(s.simT);

            // the Sun, where it is, Earth-fixed
            const sn = sun(date);
            sunDir.set(Math.cos(sn.dec) * Math.cos(sn.lon), Math.sin(sn.dec), -Math.cos(sn.dec) * Math.sin(sn.lon));

            // every satellite, now
            let selIndex = -1;
            live.forEach((l, i) => {
                const w = s.hidden.has(l.sat.category) ? null : whereAt(l.rec, date);
                if (w) toScene(w.ecf, tmp);
                else tmp.set(0, 0, 0);
                pos[i * 3] = tmp.x;
                pos[i * 3 + 1] = tmp.y;
                pos[i * 3 + 2] = tmp.z;
                if (l.sat.norad === s.selected && w) selIndex = i;
            });
            geo.attributes.position.needsUpdate = true;
            geo.computeBoundingSphere();

            // the selected one's ring and path (the path redrawn every few seconds of real time)
            if (selIndex >= 0) {
                const l = live[selIndex];
                halo.visible = true;
                halo.position.set(pos[selIndex * 3], pos[selIndex * 3 + 1], pos[selIndex * 3 + 2]);
                if (pathFor !== l.sat.norad || t - pathAt > 4000) {
                    pathFor = l.sat.norad;
                    pathAt = t;
                    const steps = 240;
                    const span = Math.min(l.periodMin, 1440) * 60_000;
                    const pts: THREE.Vector3[] = [];
                    for (let k = 0; k <= steps; k++) {
                        const w = whereAt(l.rec, new Date(s.simT + (k / steps) * span));
                        if (w) pts.push(toScene(w.ecf));
                    }
                    path.geometry.dispose();
                    path.geometry = new THREE.BufferGeometry().setFromPoints(pts);
                }
                path.visible = true;
            } else {
                halo.visible = false;
                path.visible = false;
                pathFor = null;
            }

            // the visitor's place
            if (s.me) {
                const la = s.me.lat * RAD;
                const lo = s.me.lon * RAD;
                toScene({ x: Math.cos(la) * Math.cos(lo) * R_KM * 1.004, y: Math.cos(la) * Math.sin(lo) * R_KM * 1.004, z: Math.sin(la) * R_KM * 1.004 }, home.position);
                home.visible = true;
            }

            // the zoom buttons: glide in or out along the current view
            if (s.zoom !== lastZoom) {
                lastZoom = s.zoom;
                wantDist = s.zoom === "close" ? 3.6 : 13;
            }
            if (wantDist !== null) {
                const d = camera.position.length();
                const nd = d + (wantDist - d) * 0.12;
                camera.position.multiplyScalar(nd / d);
                if (Math.abs(nd - wantDist) < 0.01) wantDist = null;
            }

            // the numbers in the panel, twice a second
            if (t - panelAt > 500) {
                panelAt = t;
                const observer = s.me ? { latitude: s.me.lat * RAD, longitude: s.me.lon * RAD, height: 0 } : null;
                let above = 0;
                let selNow: Now | null = null;
                for (const l of live) {
                    const w = whereAt(l.rec, date);
                    if (!w) continue;
                    const look = observer ? ecfToLookAngles(observer, w.ecf) : null;
                    if (look && look.elevation > 0) above++;
                    if (l.sat.norad === s.selected) {
                        const r = Math.hypot(w.ecf.x, w.ecf.y, w.ecf.z);
                        selNow = {
                            lat: Math.asin(w.ecf.z / r) / RAD,
                            lon: Math.atan2(w.ecf.y, w.ecf.x) / RAD,
                            alt: r - R_KM,
                            speed: w.speed,
                            up: look ? look.elevation > 0 : null,
                            elevation: look ? look.elevation / RAD : null,
                        };
                    }
                }
                setOverhead(observer ? above : null);
                setNow(selNow);
            }

            earth.update(0);
            earth.earth.rotation.y = 0;
            controls.update();
            renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            renderer.domElement.removeEventListener("pointerdown", onDown);
            renderer.domElement.removeEventListener("pointerup", onUp);
            controls.dispose();
            earth.dispose();
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                m.geometry?.dispose();
                const mat = m.material as THREE.Material | THREE.Material[] | undefined;
                (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
            });
            dotTex.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, [live]);

    // for a low satellite, when it next rises above 10° where the visitor is
    const sel = live?.find((l) => l.sat.norad === selected) ?? null;
    useEffect(() => {
        setNextPass(null);
        if (!sel || !me || sel.periodMin > 600) return;
        const id = window.setTimeout(() => {
            const observer = { latitude: me.lat * RAD, longitude: me.lon * RAD, height: 0 };
            const t0 = state.current.simT;
            for (let t = t0; t < t0 + 36 * 3600_000; t += 30_000) {
                const w = whereAt(sel.rec, new Date(t));
                if (w && ecfToLookAngles(observer, w.ecf).elevation > 10 * RAD) {
                    setNextPass(t - t0 < 60_000 ? "overhead now" : `next above you ${new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(t))}`);
                    return;
                }
            }
            setNextPass("not above you in the next day and a half");
        }, 50);
        return () => window.clearTimeout(id);
    }, [sel, me]);

    const counts = useMemo(() => {
        const c: Partial<Record<Category, number>> = {};
        live?.forEach((l) => (c[l.sat.category] = (c[l.sat.category] ?? 0) + 1));
        return c;
    }, [live]);
    const toggle = (c: Category) =>
        setHidden((h) => {
            const n = new Set(h);
            if (n.has(c)) n.delete(c);
            else n.add(c);
            return n;
        });

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div ref={mount} className="h-[58vh] min-h-[380px] w-full cursor-grab active:cursor-grabbing md:h-[640px]" aria-label="India's satellites on a globe, live" role="img" />
                {!live && (
                    <p className="absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">{failed ? "Couldn't load the satellites just now" : "Fetching India's satellites…"}</p>
                )}
                {live && (
                    <>
                        <div className="absolute left-3 top-3 flex gap-1.5">
                            {(["ring", "close"] as const).map((z) => (
                                <button key={z} type="button" onClick={() => setZoom(z)} className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] backdrop-blur ${zoom === z ? "border-teal-300/60 bg-teal-300/15 text-teal-100" : "border-white/15 bg-black/50 text-neutral-400 hover:text-white"}`}>
                                    {z === "ring" ? "Whole view" : "Close to Earth"}
                                </button>
                            ))}
                        </div>
                        <div className="absolute right-3 top-3 flex gap-1.5">
                            {SPEEDS.map((sp) => (
                                <button key={sp} type="button" onClick={() => setSpeed(sp)} className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] backdrop-blur ${speed === sp ? "border-amber-300/60 bg-amber-300/15 text-amber-100" : "border-white/15 bg-black/50 text-neutral-400 hover:text-white"}`}>
                                    {sp === 1 ? "Live" : `×${sp}`}
                                </button>
                            ))}
                        </div>
                        <p className="pointer-events-none absolute bottom-3 left-3 right-3 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                            {speed === 1 ? "Live, right now" : `Time ×${speed}`} · drag to turn · scroll or pinch to zoom · tap a satellite
                        </p>
                    </>
                )}
            </div>

            <aside className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                        {live ? `${live.length} active satellites` : "Satellites"}
                        {overhead !== null && <span className="text-teal-200"> · {overhead} above {me?.city ?? "you"} now</span>}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                        {(Object.keys(CATEGORY) as Category[])
                            .filter((c) => counts[c])
                            .map((c) => (
                                <li key={c}>
                                    <button type="button" onClick={() => toggle(c)} className={`flex w-full items-center gap-2.5 text-left text-sm transition-opacity ${hidden.has(c) ? "opacity-35" : ""}`}>
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY[c].colour }} />
                                        <span className="flex-1 text-neutral-200">{CATEGORY[c].label}</span>
                                        <span className="font-mono text-xs text-neutral-500">{counts[c]}</span>
                                    </button>
                                </li>
                            ))}
                    </ul>
                    <p className="mt-3 text-[11px] leading-snug text-neutral-500">Tap a category to hide it. Orbits from CelesTrak, positions worked out live in your browser.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
                    {sel ? (
                        <>
                            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: CATEGORY[sel.sat.category].colour }}>
                                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY[sel.sat.category].colour }} />
                                {CATEGORY[sel.sat.category].label}
                            </p>
                            <h3 className="font-display mt-1 text-lg font-bold text-white">{sel.sat.name}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-neutral-300">{sel.sat.note ?? CATEGORY[sel.sat.category].about}</p>
                            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                {sel.sat.operator && (
                                    <>
                                        <dt className="text-neutral-500">Run by</dt>
                                        <dd className="text-neutral-200">{sel.sat.operator}</dd>
                                    </>
                                )}
                                <dt className="text-neutral-500">Launched</dt>
                                <dd className="text-neutral-200">
                                    {new Date(`${sel.sat.launched}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, from {SITES[sel.sat.site]}
                                </dd>
                                <dt className="text-neutral-500">One orbit</dt>
                                <dd className="text-neutral-200">{sel.periodMin > 1000 ? `${(sel.periodMin / 60).toFixed(1)} hours (it keeps pace with the Earth)` : `${Math.round(sel.periodMin)} minutes`}</dd>
                                {now && (
                                    <>
                                        <dt className="text-neutral-500">Now</dt>
                                        <dd className="text-neutral-200">
                                            {Math.round(now.alt).toLocaleString("en-US")} km up, {now.speed.toFixed(1)} km/s, over {Math.abs(now.lat).toFixed(1)}°{now.lat >= 0 ? "N" : "S"} {Math.abs(now.lon).toFixed(1)}°{now.lon >= 0 ? "E" : "W"}
                                        </dd>
                                    </>
                                )}
                                {now && now.up !== null && (
                                    <>
                                        <dt className="text-neutral-500">From you</dt>
                                        <dd className="text-neutral-200">
                                            {now.up ? `above your horizon, ${Math.round(now.elevation!)}° up` : "below your horizon"}
                                            {nextPass && !now.up ? ` · ${nextPass}` : ""}
                                        </dd>
                                    </>
                                )}
                            </dl>
                            <button type="button" onClick={() => setSelected(null)} className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-300">
                                Clear
                            </button>
                        </>
                    ) : (
                        <p className="text-sm leading-relaxed text-neutral-400">
                            Tap a satellite to see what it does. The cluster high over India is the geostationary fleet: communication, weather, and NavIC, whose tilted orbits trace figure-eights (try ×1200). The fast ones close in are the Earth observers, sweeping pole to pole.
                        </p>
                    )}
                </div>
            </aside>
        </div>
    );
}
