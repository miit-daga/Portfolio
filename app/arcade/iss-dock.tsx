"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { issNow } from "@/lib/iss";
import { isMuted, setMuted, sfxBeep, sfxDocked, sfxOver, sfxPuff } from "./sound";

// Dock with the ISS: a capsule's view of the station's forward port, and its
// thrusters. Nudge left, right, up and down to line up, and forward to close;
// the capsule keeps drifting as it would in orbit, so every nudge has to be
// taken back out. Touch the port gently (under 0.3 m/s), within 25 cm of its
// centre, before the fuel runs out. The best docking is kept in this browser.

const BEST_KEY = "arcade-dock-best";
const START_RANGE = 45;
const LATERAL_ACCEL = 0.16; // m/s² while a side thruster fires
const AXIAL_ACCEL = 0.12;
const FUEL_PER_SECOND = 2.2; // % per second of firing
const SOFT = { rate: 0.3, offset: 0.25 };

type Phase = "ready" | "flying" | "docked" | "failed";
type Hud = { range: number; rate: number; x: number; y: number; vx: number; vy: number; fuel: number; time: number; phase: Phase; why: string; best: number | null; iss: string };

const fmt = (v: number, d = 2) => (v >= 0 ? "+" : "") + v.toFixed(d);

// Earth, painted once: oceans, loose continents and cloud bands
function earthTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d")!;
    const sea = g.createLinearGradient(0, 0, 0, 512);
    sea.addColorStop(0, "#0b3a6e");
    sea.addColorStop(1, "#0e4f8f");
    g.fillStyle = sea;
    g.fillRect(0, 0, 1024, 512);
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
        const x = rand() * 1024;
        const y = 80 + rand() * 350;
        g.fillStyle = rand() < 0.5 ? "#2f6b3a" : "#6b5b3a";
        g.beginPath();
        for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2;
            const r = 30 + rand() * 60;
            g.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 0.7);
        }
        g.fill();
    }
    g.globalAlpha = 0.55;
    for (let i = 0; i < 70; i++) {
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.ellipse(rand() * 1024, rand() * 512, 20 + rand() * 90, 4 + rand() * 12, rand() * 0.4, 0, Math.PI * 2);
        g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
}

// A solar array: gold cells in a grid, on a thin frame
function arrayTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#6b4a12";
    g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 16)
        for (let x = 0; x < 64; x += 16) {
            g.fillStyle = (x + y) % 32 ? "#c28a2c" : "#b07a22";
            g.fillRect(x + 1, y + 1, 14, 14);
        }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// The station, built of simple shapes, its forward docking port at the
// origin facing +z, the way the capsule comes in
function buildStation() {
    const iss = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, metalness: 0.35, roughness: 0.55 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.6, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, metalness: 0.5, roughness: 0.6 });
    const cells = new THREE.MeshStandardMaterial({ map: arrayTexture(), metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide });
    const cyl = (r: number, len: number, mat: THREE.Material, z: number, x = 0, y = 0) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), mat);
        m.rotation.x = Math.PI / 2;
        m.position.set(x, y, z);
        iss.add(m);
        return m;
    };
    // the docking port: an adapter ring, and the target on a standoff
    const port = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 40), grey);
    iss.add(port);
    cyl(0.75, 0.8, grey, -0.4);
    const standoff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), dark);
    standoff.rotation.x = Math.PI / 2;
    standoff.position.set(0, 1.25, -0.2);
    iss.add(standoff);
    const targetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.02), targetMat);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.34, 0.02), targetMat);
    [crossH, crossV].forEach((m) => {
        m.position.set(0, 1.25, 0.06);
        iss.add(m);
    });
    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), dark);
    plate.position.set(0, 1.25, 0.04);
    iss.add(plate);
    // guide lights round the port
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22c55e : 0xf43f5e }));
        l.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.05);
        iss.add(l);
    }
    // the node and the modules behind it
    cyl(2.1, 5.5, white, -3.5);
    cyl(2.1, 7, white, -10);
    cyl(2.2, 8, white, -18);
    cyl(1.6, 5, white, -25);
    cyl(1.2, 3.5, white, -12, 4.6, 0).rotation.z = Math.PI / 2;
    // the truss across, and its arrays
    const truss = new THREE.Mesh(new THREE.BoxGeometry(92, 1.4, 1.4), grey);
    truss.position.set(0, 3.4, -14);
    iss.add(truss);
    [-1, 1].forEach((side) =>
        [30, 42].forEach((x) =>
            [-1, 1].forEach((up) => {
                const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 34), cells);
                panel.position.set(side * x, 3.4 + up * 18.5, -14);
                panel.rotation.y = 0.35 * side;
                iss.add(panel);
            }),
        ),
    );
    // radiators, white and edge-on
    [-14, 14].forEach((x) => {
        const rad = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 12), white);
        rad.position.set(x, 3.4, -6);
        iss.add(rad);
    });
    return { iss, port };
}

export default function IssDock({ onExit }: { onExit: () => void }) {
    const mount = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<Hud>({ range: START_RANGE, rate: 0, x: 0, y: 0, vx: 0, vy: 0, fuel: 100, time: 0, phase: "ready", why: "", best: null, iss: "" });
    const [muted, setMutedState] = useState(false);
    const control = useRef<{ start: () => void; press: (k: string, on: boolean) => void }>({ start: () => {}, press: () => {} });

    useEffect(() => {
        const el = mount.current;
        if (!el) return;
        let best: number | null = null;
        try {
            const b = localStorage.getItem(BEST_KEY);
            if (b) best = Number(b);
        } catch {
            /* ignore */
        }
        let iss = "";
        // where the real one is now (lib/iss.ts)
        issNow(60000).then((fix) => {
            if (!fix) return;
            const lat = `${Math.abs(fix.latitude).toFixed(1)}°${fix.latitude >= 0 ? "N" : "S"}`;
            const lon = `${Math.abs(fix.longitude).toFixed(1)}°${fix.longitude >= 0 ? "E" : "W"}`;
            iss = `The real ISS is over ${lat} ${lon} right now, at ${Math.round(fix.altitude)} km`;
        });

        // ---- the scene -------------------------------------------------------
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 20000);

        scene.add(new THREE.AmbientLight(0x6f7fa0, 0.45));
        const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
        sun.position.set(30, 40, 60);
        scene.add(sun);
        const earthLight = new THREE.DirectionalLight(0x4f8fd6, 0.6);
        earthLight.position.set(0, -50, 0);
        scene.add(earthLight);

        const { iss: station } = buildStation();
        scene.add(station);

        // Earth below, turning slowly, and its thin blue rim of air
        const earth = new THREE.Mesh(new THREE.SphereGeometry(4200, 64, 48), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.9, metalness: 0 }));
        earth.position.set(0, -4700, -1200);
        scene.add(earth);
        const air = new THREE.Mesh(new THREE.SphereGeometry(4290, 64, 48), new THREE.MeshBasicMaterial({ color: 0x5aa7ff, transparent: true, opacity: 0.16, side: THREE.BackSide }));
        air.position.copy(earth.position);
        scene.add(air);

        const starPos = new Float32Array(1800 * 3);
        for (let i = 0; i < 1800; i++) {
            const v = new THREE.Vector3().randomDirection().multiplyScalar(9000);
            starPos.set([v.x, Math.abs(v.y) * 0.8 + 400, v.z], i * 3);
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
        scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));

        // ---- the flight -----------------------------------------------------
        let phase: Phase = "ready";
        const pos = new THREE.Vector3();
        const vel = new THREE.Vector3();
        let fuel = 100;
        let time = 0;
        let why = "";
        const firing = new Set<string>();
        let puff = 0;

        const reset = () => {
            pos.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, START_RANGE);
            vel.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.1, -0.05);
            fuel = 100;
            time = 0;
            why = "";
        };
        reset();
        const pushHud = () =>
            setHud({ range: pos.z, rate: -vel.z, x: pos.x, y: pos.y, vx: vel.x, vy: vel.y, fuel, time, phase, why, best, iss });
        const begin = () => {
            reset();
            phase = "flying";
            sfxBeep(true);
            pushHud();
        };
        const finish = (ok: boolean, reason: string) => {
            phase = ok ? "docked" : "failed";
            why = reason;
            firing.clear();
            if (ok) {
                sfxDocked();
                // lower is better: time, with fuel left worth a second a per cent
                const scoreNow = Math.round(time - fuel);
                if (best === null || scoreNow < best) {
                    best = scoreNow;
                    try {
                        localStorage.setItem(BEST_KEY, String(scoreNow));
                    } catch {
                        /* ignore */
                    }
                }
            } else sfxOver();
            pushHud();
        };

        // ---- controls: WASD / arrows to the sides, E or Space to close, Q or Shift to back off
        const KEYMAP: Record<string, string> = {
            arrowleft: "left", a: "left", arrowright: "right", d: "right", arrowup: "up", w: "up", arrowdown: "down", s: "down",
            e: "fwd", " ": "fwd", q: "back", shift: "back",
        };
        const press = (k: string, on: boolean) => {
            if (on && phase !== "flying") {
                begin();
                return;
            }
            if (on) firing.add(k);
            else firing.delete(k);
        };
        control.current = { start: begin, press };
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === "m" && e.type === "keydown") {
                setMuted(!isMuted());
                setMutedState(isMuted());
                return;
            }
            if (k === "enter" && e.type === "keydown" && phase !== "flying") return begin();
            const t = KEYMAP[k];
            if (!t) return;
            e.preventDefault();
            if (e.type === "keydown" && !e.repeat) press(t, true);
            if (e.type === "keyup") press(t, false);
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKey);
        const onBlur = () => firing.clear();
        window.addEventListener("blur", onBlur);

        const fit = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            camera.aspect = w / h;
            camera.fov = w / h < 0.9 ? 70 : 50;
            camera.updateProjectionMatrix();
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);

        // ---- the loop --------------------------------------------------------
        let raf = 0;
        let last = performance.now();
        let hudTimer = 0;
        let warned = false;
        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (document.hidden) return;
            if (phase === "flying") {
                time += dt;
                const burn = firing.size > 0 && fuel > 0;
                if (burn) {
                    if (firing.has("left")) vel.x -= LATERAL_ACCEL * dt;
                    if (firing.has("right")) vel.x += LATERAL_ACCEL * dt;
                    if (firing.has("up")) vel.y += LATERAL_ACCEL * dt;
                    if (firing.has("down")) vel.y -= LATERAL_ACCEL * dt;
                    if (firing.has("fwd")) vel.z -= AXIAL_ACCEL * dt;
                    if (firing.has("back")) vel.z += AXIAL_ACCEL * dt;
                    fuel = Math.max(0, fuel - FUEL_PER_SECOND * dt * firing.size);
                    puff -= dt;
                    if (puff <= 0) {
                        sfxPuff();
                        puff = 0.18;
                    }
                }
                pos.addScaledVector(vel, dt);
                if (!warned && pos.z < 8 && -vel.z > SOFT.rate) {
                    warned = true;
                    sfxBeep();
                }
                // contact with the port
                if (pos.z <= 0.3) {
                    const off = Math.hypot(pos.x, pos.y);
                    const rate = -vel.z;
                    if (rate > SOFT.rate) finish(false, `Hit the port at ${rate.toFixed(2)} m/s. Under ${SOFT.rate} is a soft capture.`);
                    else if (off > SOFT.offset) finish(false, `Touched ${(off * 100).toFixed(0)} cm off centre. Within ${SOFT.offset * 100} cm to capture.`);
                    else finish(true, `Soft capture at ${rate.toFixed(2)} m/s, ${(off * 100).toFixed(0)} cm off centre.`);
                    pos.z = Math.max(pos.z, 0.3);
                    vel.set(0, 0, 0);
                    warned = false;
                } else if (pos.z > START_RANGE + 25) finish(false, "Drifted too far from the station.");
                else if (Math.hypot(pos.x, pos.y) > 18) finish(false, "Drifted out of the approach corridor.");
                else if (fuel <= 0 && -vel.z <= 0.002) finish(false, "Out of fuel, and not closing on the port.");
            }
            // the capsule's view: looking straight ahead along -z
            camera.position.copy(pos);
            camera.lookAt(pos.x, pos.y, pos.z - 10);
            earth.rotation.y += dt * 0.004;
            renderer.render(scene, camera);
            hudTimer -= dt;
            if (hudTimer <= 0) {
                hudTimer = 0.08;
                if (phase === "flying" || phase === "ready") pushHud();
            }
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            window.removeEventListener("blur", onBlur);
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                m.geometry?.dispose();
                const mat = m.material as (THREE.Material & { map?: THREE.Texture }) | undefined;
                mat?.map?.dispose();
                mat?.dispose?.();
            });
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    const ok = (v: number, lim: number) => (Math.abs(v) <= lim ? "text-emerald-300" : "text-amber-300");
    const hold = (k: string) => ({
        onPointerDown: (e: React.PointerEvent) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            control.current.press(k, true);
        },
        onPointerUp: () => control.current.press(k, false),
        onPointerCancel: () => control.current.press(k, false),
    });
    const pad = "flex h-12 w-12 select-none items-center justify-center rounded-full border border-white/20 bg-black/50 text-lg text-white backdrop-blur active:bg-teal-400/30";

    return (
        <div className="fixed inset-0 z-50 bg-black text-white">
            <div ref={mount} className="absolute inset-0" aria-label="Dock with the ISS: a 3D game" role="application" />
            {/* the capsule's window: dark round the edge */}
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 75% 70% at 50% 50%, transparent 62%, rgba(0,0,0,0.85) 100%)" }} />
            {/* boresight: line the port's target cross up on this */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-emerald-300/60" />
                <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-300/60" />
                <span className="absolute inset-6 rounded-full border border-emerald-300/60" />
            </div>

            {/* readouts */}
            <div className="pointer-events-none absolute left-4 top-4 space-y-1 font-mono text-xs uppercase tracking-[0.15em] sm:left-6 sm:top-6 sm:text-sm">
                <p className="text-teal-300/80">Range <span className="text-white">{hud.range.toFixed(1)} m</span></p>
                <p className="text-teal-300/80">Rate <span className={hud.rate > SOFT.rate ? "text-amber-300" : "text-white"}>{hud.rate.toFixed(2)} m/s</span></p>
                <p className="text-teal-300/80">X <span className={ok(hud.x, SOFT.offset)}>{fmt(hud.x)} m</span> <span className="text-neutral-500">{fmt(hud.vx, 2)}</span></p>
                <p className="text-teal-300/80">Y <span className={ok(hud.y, SOFT.offset)}>{fmt(hud.y)} m</span> <span className="text-neutral-500">{fmt(hud.vy, 2)}</span></p>
            </div>
            <div className="pointer-events-none absolute right-4 top-4 w-32 text-right font-mono text-xs uppercase tracking-[0.15em] sm:right-6 sm:top-6 sm:text-sm">
                <p className="text-teal-300/80">Fuel {Math.round(hud.fuel)}%</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full ${hud.fuel > 25 ? "bg-teal-300" : "bg-amber-400"}`} style={{ width: `${hud.fuel}%` }} />
                </div>
                <p className="mt-2 text-neutral-500">{Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, "0")}</p>
            </div>

            {/* touch thrusters */}
            {hud.phase === "flying" && (
                <>
                    <div className="absolute bottom-20 left-4 grid grid-cols-3 gap-1 sm:hidden" aria-label="Side thrusters">
                        <span />
                        <button type="button" aria-label="Thrust up" className={pad} {...hold("up")}>↑</button>
                        <span />
                        <button type="button" aria-label="Thrust left" className={pad} {...hold("left")}>←</button>
                        <span />
                        <button type="button" aria-label="Thrust right" className={pad} {...hold("right")}>→</button>
                        <span />
                        <button type="button" aria-label="Thrust down" className={pad} {...hold("down")}>↓</button>
                        <span />
                    </div>
                    <div className="absolute bottom-20 right-4 flex flex-col gap-2 sm:hidden">
                        <button type="button" aria-label="Thrust forward" className={`${pad} w-20 rounded-2xl text-xs`} {...hold("fwd")}>FWD</button>
                        <button type="button" aria-label="Thrust back" className={`${pad} w-20 rounded-2xl text-xs`} {...hold("back")}>BACK</button>
                    </div>
                </>
            )}

            <div className="absolute bottom-4 left-4 flex gap-2 sm:bottom-6 sm:left-6">
                <button type="button" onClick={onExit} className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm text-neutral-200 backdrop-blur hover:border-white/30 hover:text-white">
                    ← Arcade
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMuted(!isMuted());
                        setMutedState(isMuted());
                    }}
                    aria-label={muted ? "Sound on" : "Mute"}
                    className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:border-white/30 hover:text-white"
                >
                    {muted ? "🔇" : "🔊"}
                </button>
            </div>
            <p className="pointer-events-none absolute bottom-5 right-6 hidden font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 sm:block">
                WASD / arrows · E forward · Q back · M mute
            </p>

            {hud.phase !== "flying" && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="max-w-sm rounded-2xl border border-teal-400/25 bg-black/65 p-6 text-center backdrop-blur-md">
                        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">
                            {hud.phase === "docked" ? "Docked" : hud.phase === "failed" ? "Abort" : "Crew arcade · 02"}
                        </p>
                        <h1 className="font-display mt-2 text-3xl font-bold">
                            {hud.phase === "docked" ? "Welcome aboard" : hud.phase === "failed" ? "Missed" : "Dock with the ISS"}
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                            {hud.phase === "ready"
                                ? "Line the white cross up in the green sight and close in gently. Every nudge keeps you drifting until you take it back out. Touch the port under 0.3 m/s, within 25 cm of its centre."
                                : hud.why}
                        </p>
                        {hud.phase === "docked" && (
                            <p className="mt-2 font-mono text-xs text-neutral-400">
                                {Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, "0")} · {Math.round(hud.fuel)}% fuel left
                            </p>
                        )}
                        {hud.best !== null && <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">Best score {hud.best} (time minus fuel, lower wins)</p>}
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                            <span className="hidden sm:inline">WASD / arrows to the sides · E closer · Q back</span>
                            <span className="sm:hidden">Thrusters on screen</span>
                        </p>
                        <button type="button" onClick={() => control.current.start()} className="mt-5 rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-teal-300">
                            {hud.phase === "ready" ? "Begin approach" : "Try again"}
                        </button>
                        {hud.iss && <p className="mt-4 text-[11px] text-neutral-500">{hud.iss}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
