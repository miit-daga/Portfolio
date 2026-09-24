"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { isMuted, setMuted, sfxOver, sfxPlace, sfxPerfect, sfxSlice } from "./sound";

// Stack the Station: build a space station above the Earth, one module at a
// time. Each module slides in over the last; tap, click or press Space to drop
// it. Whatever hangs over the edge is sliced off and tumbles away, so the
// station narrows; miss it entirely and the build is over. Land one almost
// exactly and it keeps its size ("Perfect"); five in a row and it grows back a
// little. The best station is kept in this browser.

const BEST_KEY = "arcade-stack-best";
const H = 0.5; // a module's height
const BASE = 3.2; // the hub's width and depth
const PERFECT = 0.08; // within this of the one below counts as perfect
const RANGE = 4.2; // how far a module swings either side

type Phase = "ready" | "playing" | "over";
type Hud = { score: number; best: number; phase: Phase; perfect: number; streak: number; newBest: boolean };

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
    let s = 11;
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
    g.globalAlpha = 0.5;
    g.fillStyle = "#ffffff";
    for (let i = 0; i < 70; i++) {
        g.beginPath();
        g.ellipse(rand() * 1024, rand() * 512, 20 + rand() * 90, 4 + rand() * 12, rand() * 0.4, 0, Math.PI * 2);
        g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// A module's colour: teal at the bottom, through sky blue, to violet up high
const colourAt = (n: number) => new THREE.Color().setHSL((0.47 + n * 0.012) % 1, 0.55, 0.62);

export default function StackStation({ onExit }: { onExit: () => void }) {
    const mount = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<Hud>({ score: 0, best: 0, phase: "ready", perfect: 0, streak: 0, newBest: false });
    const [muted, setMutedState] = useState(false);
    const drop = useRef<() => void>(() => {});

    useEffect(() => {
        const el = mount.current;
        if (!el) return;
        let best = 0;
        try {
            best = Number(localStorage.getItem(BEST_KEY)) || 0;
        } catch {
            /* ignore */
        }

        // ---- the scene -------------------------------------------------------
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x02030a);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);

        scene.add(new THREE.AmbientLight(0x7080a8, 0.7));
        const sun = new THREE.DirectionalLight(0xfff4e2, 2.1);
        sun.position.set(12, 20, 8);
        scene.add(sun);
        const earthGlow = new THREE.DirectionalLight(0x4f8fd6, 0.7);
        earthGlow.position.set(-4, -10, -6);
        scene.add(earthGlow);

        // Earth below, turning, with its thin rim of air
        const earth = new THREE.Mesh(new THREE.SphereGeometry(260, 64, 48), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.9 }));
        earth.position.set(0, -300, -60);
        earth.rotation.z = 0.35;
        scene.add(earth);
        const air = new THREE.Mesh(new THREE.SphereGeometry(266, 64, 48), new THREE.MeshBasicMaterial({ color: 0x5aa7ff, transparent: true, opacity: 0.18, side: THREE.BackSide }));
        air.position.copy(earth.position);
        scene.add(air);
        // Stars round everything
        const starPos = new Float32Array(1600 * 3);
        for (let i = 0; i < 1600; i++) {
            const v = new THREE.Vector3().randomDirection().multiplyScalar(1500);
            starPos.set([v.x, v.y, v.z], i * 3);
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
        scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false })));

        const station = new THREE.Group();
        scene.add(station);
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.5 });
        const panelMat = new THREE.MeshStandardMaterial({ color: 0xc28a2c, emissive: 0x3b2508, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide });

        // A module: a coloured block, a dark seam round its middle, and on
        // every fifth, a pair of gold solar arrays
        type Layer = { group: THREE.Group; w: number; d: number; x: number; z: number; y: number };
        const makeModule = (w: number, d: number, n: number) => {
            const g = new THREE.Group();
            const body = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: colourAt(n), metalness: 0.25, roughness: 0.45 }));
            body.scale.set(w, H, d);
            g.add(body);
            const seam = new THREE.Mesh(boxGeo, bandMat);
            seam.scale.set(w * 1.002, H * 0.12, d * 1.002);
            g.add(seam);
            if (n > 0 && n % 5 === 0) {
                [-1, 1].forEach((side) => {
                    const arm = new THREE.Mesh(boxGeo, bandMat);
                    arm.scale.set(0.9, 0.08, 0.08);
                    arm.position.set(side * (w / 2 + 0.45), 0, 0);
                    g.add(arm);
                    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), panelMat);
                    panel.rotation.x = -Math.PI / 2;
                    panel.position.set(side * (w / 2 + 1.7), 0, 0);
                    g.add(panel);
                });
            }
            return g;
        };

        // ---- the build -------------------------------------------------------
        let phase: Phase = "ready";
        let layers: Layer[] = [];
        let moving: (Layer & { axis: "x" | "z"; dir: number }) | null = null;
        let speed = 3.2;
        let streak = 0;
        let perfectAt = 0;
        let newBest = false;
        type Piece = { mesh: THREE.Group; v: THREE.Vector3; spin: THREE.Vector3; life: number };
        let falling: Piece[] = [];
        const camTarget = new THREE.Vector3(0, 0, 0);
        let camDist = 16;

        const clear = () => {
            station.clear();
            falling.forEach((f) => scene.remove(f.mesh));
            falling = [];
            layers = [];
            moving = null;
        };
        const addLayer = (l: Layer, n: number) => {
            l.group = makeModule(l.w, l.d, n);
            l.group.position.set(l.x, l.y, l.z);
            station.add(l.group);
            return l;
        };
        const spawnMoving = () => {
            const top = layers[layers.length - 1];
            const axis: "x" | "z" = layers.length % 2 ? "x" : "z";
            const l = addLayer({ group: null as unknown as THREE.Group, w: top.w, d: top.d, x: top.x, z: top.z, y: top.y + H }, layers.length);
            // it comes in from one side
            if (axis === "x") l.x = top.x - RANGE;
            else l.z = top.z - RANGE;
            l.group.position.set(l.x, l.y, l.z);
            moving = { ...l, axis, dir: 1 };
        };
        const score = () => Math.max(0, layers.length - 1);
        const pushHud = () => setHud({ score: score(), best, phase, perfect: perfectAt, streak, newBest });

        const begin = () => {
            clear();
            phase = "playing";
            speed = 3.2;
            streak = 0;
            newBest = false;
            // the hub
            layers.push(addLayer({ group: null as unknown as THREE.Group, w: BASE, d: BASE, x: 0, z: 0, y: 0 }, 0));
            spawnMoving();
            pushHud();
        };
        // a sliced-off piece, or the whole module when it misses, tumbling off
        const tumble = (w: number, d: number, x: number, y: number, z: number, n: number, push: THREE.Vector3) => {
            const g = makeModule(w, d, n);
            g.position.set(x, y, z);
            scene.add(g);
            falling.push({ mesh: g, v: push.clone().add(new THREE.Vector3(0, 0.6, 0)), spin: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3), life: 4 });
        };
        const place = () => {
            if (phase !== "playing") {
                begin();
                return;
            }
            if (!moving) return;
            const top = layers[layers.length - 1];
            const m = moving;
            const along = m.axis === "x" ? m.x - top.x : m.z - top.z;
            const size = m.axis === "x" ? top.w : top.d;
            const over = Math.abs(along);
            station.remove(m.group);
            if (over >= size) {
                // missed it entirely: the module falls, and that's the build
                tumble(m.w, m.d, m.x, m.y, m.z, layers.length, new THREE.Vector3(m.axis === "x" ? Math.sign(along) * 2 : 0, 0, m.axis === "z" ? Math.sign(along) * 2 : 0));
                moving = null;
                end();
                return;
            }
            let nx = m.x;
            let nz = m.z;
            let nw = m.w;
            let nd = m.d;
            if (over <= PERFECT) {
                // perfect: snapped onto the one below, and five in a row grows it back a little
                nx = top.x;
                nz = top.z;
                streak += 1;
                perfectAt = Date.now();
                if (streak >= 5) {
                    if (m.axis === "x") nw = Math.min(BASE, nw + 0.25);
                    else nd = Math.min(BASE, nd + 0.25);
                }
                sfxPerfect(streak);
            } else {
                streak = 0;
                const keep = size - over;
                const sign = Math.sign(along);
                if (m.axis === "x") {
                    nw = keep;
                    nx = top.x + along / 2;
                    const cutW = over;
                    const cutX = nx + sign * (keep / 2 + cutW / 2);
                    tumble(cutW, m.d, cutX, m.y, m.z, layers.length, new THREE.Vector3(sign * 1.5, 0, 0));
                } else {
                    nd = keep;
                    nz = top.z + along / 2;
                    const cutD = over;
                    const cutZ = nz + sign * (keep / 2 + cutD / 2);
                    tumble(m.w, cutD, m.x, m.y, cutZ, layers.length, new THREE.Vector3(0, 0, sign * 1.5));
                }
                sfxSlice();
                sfxPlace(0);
            }
            layers.push(addLayer({ group: null as unknown as THREE.Group, w: nw, d: nd, x: nx, z: nz, y: m.y }, layers.length));
            speed = Math.min(8, 3.2 + layers.length * 0.09);
            moving = null;
            spawnMoving();
            pushHud();
        };
        drop.current = place;
        const end = () => {
            phase = "over";
            const s = score();
            if (s > best) {
                best = s;
                newBest = true;
                try {
                    localStorage.setItem(BEST_KEY, String(s));
                } catch {
                    /* ignore */
                }
            }
            sfxOver();
            pushHud();
        };

        // ---- controls: a tap, a click, Space or Enter -------------------------
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === "m") {
                setMuted(!isMuted());
                setMutedState(isMuted());
                return;
            }
            if ((k === " " || k === "enter") && !e.repeat) {
                e.preventDefault();
                place();
            }
        };
        window.addEventListener("keydown", onKey);
        const cv = renderer.domElement;
        cv.style.touchAction = "manipulation";
        const onDown = () => place();
        cv.addEventListener("pointerdown", onDown);

        const fit = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            camera.aspect = w / h;
            camera.fov = w / h < 0.9 ? 55 : 40;
            camera.updateProjectionMatrix();
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);

        // ---- the loop --------------------------------------------------------
        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (document.hidden) return;
            // the sliding module, back and forth
            if (moving && phase === "playing") {
                const top = layers[layers.length - 1];
                const key = moving.axis;
                const base = key === "x" ? top.x : top.z;
                moving[key] += moving.dir * speed * dt;
                if (moving[key] > base + RANGE) moving.dir = -1;
                if (moving[key] < base - RANGE) moving.dir = 1;
                moving.group.position.set(moving.x, moving.y, moving.z);
            }
            // the pieces, tumbling away and fading
            for (const f of falling) {
                f.v.y -= 9.8 * dt * 0.6;
                f.mesh.position.addScaledVector(f.v, dt);
                f.mesh.rotation.x += f.spin.x * dt;
                f.mesh.rotation.y += f.spin.y * dt;
                f.mesh.rotation.z += f.spin.z * dt;
                f.life -= dt;
            }
            falling = falling.filter((f) => {
                if (f.life > 0) return true;
                scene.remove(f.mesh);
                return false;
            });
            // the camera: at the top of the build, and pulled back to show it all when it's over
            const topY = layers.length ? layers[layers.length - 1].y : 0;
            const height = topY + H;
            const wantY = phase === "over" ? height / 2 : topY;
            const wantDist = phase === "over" ? Math.max(16, height * 1.6 + 8) : phase === "ready" ? 18 : 16;
            camTarget.y += (wantY - camTarget.y) * Math.min(1, dt * 2.5);
            camDist += (wantDist - camDist) * Math.min(1, dt * 1.8);
            const spin = phase === "playing" ? 0 : now / 9000;
            camera.position.set(Math.cos(Math.PI / 4 + spin) * camDist, camTarget.y + camDist * 0.62, Math.sin(Math.PI / 4 + spin) * camDist);
            camera.lookAt(0, camTarget.y, 0);
            earth.rotation.y += dt * 0.01;
            renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(loop);
        // a hub to look at on the title screen
        layers.push(addLayer({ group: null as unknown as THREE.Group, w: BASE, d: BASE, x: 0, z: 0, y: 0 }, 0));
        pushHud();

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKey);
            cv.removeEventListener("pointerdown", onDown);
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

    return (
        <div className="fixed inset-0 z-50 bg-[#02030a] text-white">
            <div ref={mount} className="absolute inset-0" aria-label="Stack the Station: a 3D game" role="application" />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center p-6 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Modules</p>
                <p className="font-display text-5xl font-bold">{hud.score}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">Best {hud.best}</p>
                {hud.perfect > 0 && hud.phase === "playing" && (
                    <p key={hud.perfect} className="mt-3 animate-[arcade-hit_1.1s_ease-out_forwards] font-mono text-sm uppercase tracking-[0.3em] text-amber-300">
                        Perfect{hud.streak > 1 ? ` ×${hud.streak}` : ""}
                    </p>
                )}
            </div>

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
            {hud.phase === "playing" && (
                <p className="pointer-events-none absolute bottom-5 right-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    <span className="hidden sm:inline">Space, Enter or click to drop · M mute</span>
                    <span className="sm:hidden">Tap to drop</span>
                </p>
            )}

            {hud.phase !== "playing" && (
                // a tap anywhere starts, as well as the button
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 pb-24 sm:items-center sm:pb-6">
                    <div className="pointer-events-auto max-w-sm rounded-2xl border border-teal-400/25 bg-black/60 p-6 text-center backdrop-blur-md">
                        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">{hud.phase === "over" ? "Build over" : "Crew arcade · 02"}</p>
                        <h1 className="font-display mt-2 text-3xl font-bold">{hud.phase === "over" ? `${hud.score} modules` : "Stack the Station"}</h1>
                        {hud.phase === "over" && hud.newBest && <p className="mt-1 text-sm text-amber-300">Your tallest station yet!</p>}
                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                            Drop each module onto the one below. Whatever hangs over the edge is sliced off, so line them up. Land one exactly for a Perfect.
                        </p>
                        <button type="button" onClick={() => drop.current()} className="mt-5 rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-teal-300">
                            {hud.phase === "over" ? "Build again" : "Start building"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
