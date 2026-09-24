"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { isMuted, setEngine, setMuted, sfxBoost, sfxCollect, sfxHit, sfxOver, sfxShield, sfxSmash, sfxStar, stopEngine } from "./sound";

// Asteroid Run: fly a small ship forward through an asteroid field, dodging
// rocks and picking up glowing fragments. It gets faster the longer you last.
// Now and then, once a shield is down, a blue shield ring comes by: flying
// through it restores one. Rarer still, two power-ups: a golden star makes
// the ship invincible for a few seconds (rocks shatter on it), and a violet
// arrow boosts it forward, fast and untouchable, for double the distance.
// Arrow keys or WASD, or the mouse; on a phone, drag anywhere. Three hits and
// the run is over. The best score is kept in this browser.

const BEST_KEY = "arcade-run-best";
const BOUNDS = { x: 6.5, y: 3.6 };
const SHIELDS = 3;
const ROCKS = 70;
const FRAGS = 8;
const FAR = -190;

type Phase = "ready" | "playing" | "over";
type Power = "star" | "boost";
const POWER_TIME: Record<Power, number> = { star: 6, boost: 4 };
const POWER_NAME: Record<Power, string> = { star: "Invincible", boost: "Boost" };
type Hud = { score: number; shields: number; speed: number; best: number; phase: Phase; hitAt: number; newBest: boolean; shieldAt: number; power: Power | null; powerLeft: number };

// A lumpy rock: an icosahedron with its corners pushed in and out, the same
// corner moved the same way on every face that shares it
function rockGeometry(seed: number) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const key = (x: number, y: number, z: number) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    const push = new Map<string, number>();
    let s = seed;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < pos.count; i++) {
        const k = key(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (!push.has(k)) push.set(k, 0.72 + rand() * 0.5);
        const f = push.get(k)!;
        pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f * 0.85, pos.getZ(i) * f);
    }
    g.computeVertexNormals();
    return g;
}

export default function AsteroidRun({ onExit }: { onExit: () => void }) {
    const mount = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<Hud>({ score: 0, shields: SHIELDS, speed: 0, best: 0, phase: "ready", hitAt: 0, newBest: false, shieldAt: 0, power: null, powerLeft: 0 });
    const [muted, setMutedState] = useState(false);
    const start = useRef<() => void>(() => {});

    useEffect(() => {
        const el = mount.current;
        if (!el) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let best = 0;
        try {
            best = Number(localStorage.getItem(BEST_KEY)) || 0;
        } catch {
            /* ignore */
        }

        // ---- the scene -------------------------------------------------------
        const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x03040a);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x03040a, 60, 185);
        const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
        camera.position.set(0, 1.4, 7.5);

        scene.add(new THREE.AmbientLight(0x8090c0, 0.55));
        const sun = new THREE.DirectionalLight(0xfff1dd, 1.6);
        sun.position.set(6, 9, 5);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x2dd4bf, 0.6);
        rim.position.set(-6, -3, -8);
        scene.add(rim);

        // Stars, streaming past
        const STAR_COUNT = 1400;
        const starPos = new Float32Array(STAR_COUNT * 3);
        for (let i = 0; i < STAR_COUNT; i++) {
            starPos[i * 3] = (Math.random() - 0.5) * 160;
            starPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
            starPos[i * 3 + 2] = FAR - 60 + Math.random() * 280;
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false }));
        scene.add(stars);

        // The ship: a pointed hull, swept wings, fins and a glowing engine
        const ship = new THREE.Group();
        const hullMat = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.55, roughness: 0.35, flatShading: true });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, emissive: 0x0d9488, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.4, flatShading: true });
        const hull = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.9, 6), hullMat);
        hull.rotation.x = -Math.PI / 2;
        ship.add(hull);
        const wingGeo = new THREE.BufferGeometry();
        wingGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, -0.5, 1.25, 0, 0.55, 0, 0, 0.6, 0, 0, -0.5, 0, 0, 0.6, -1.25, 0, 0.55]), 3));
        wingGeo.computeVertexNormals();
        const wings = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide, flatShading: true }));
        ship.add(wings);
        [-1, 1].forEach((sgn) => {
            const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.5), accentMat);
            tip.position.set(1.2 * sgn, 0.08, 0.45);
            ship.add(tip);
        });
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.55), accentMat);
        fin.position.set(0, 0.24, 0.55);
        ship.add(fin);
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0e7490, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.1 }));
        canopy.scale.set(1, 0.8, 1.8);
        canopy.position.set(0, 0.12, -0.1);
        ship.add(canopy);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 10), flameMat);
        flame.rotation.x = Math.PI / 2;
        flame.position.set(0, 0, 1.3);
        ship.add(flame);
        const engineLight = new THREE.PointLight(0xfbbf24, 2.5, 6);
        engineLight.position.set(0, 0, 1.4);
        ship.add(engineLight);
        scene.add(ship);

        // The rocks, reused as they pass
        const rockGeos = [11, 23, 37, 51, 67].map(rockGeometry);
        const rockMats = [0x8b7d6b, 0x6b6f78, 0x9a8778, 0x5c5f66].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0.05, flatShading: true }));
        type Rock = { mesh: THREE.Mesh; r: number; spin: THREE.Vector3; live: boolean };
        const rocks: Rock[] = [];
        for (let i = 0; i < ROCKS; i++) {
            const mesh = new THREE.Mesh(rockGeos[i % rockGeos.length], rockMats[i % rockMats.length]);
            mesh.visible = false;
            scene.add(mesh);
            rocks.push({ mesh, r: 1, spin: new THREE.Vector3(), live: false });
        }
        // The fragments: small glowing gems
        const fragMat = new THREE.MeshStandardMaterial({ color: 0x99f6e4, emissive: 0x2dd4bf, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.2, flatShading: true });
        const fragGeo = new THREE.OctahedronGeometry(0.42);
        type Frag = { mesh: THREE.Mesh; live: boolean };
        const frags: Frag[] = [];
        for (let i = 0; i < FRAGS; i++) {
            const mesh = new THREE.Mesh(fragGeo, fragMat);
            mesh.visible = false;
            scene.add(mesh);
            frags.push({ mesh, live: false });
        }

        // The shield ring: rare, sky blue, with a white plus in it
        const shieldRing = new THREE.Group();
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.25 });
        shieldRing.add(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.13, 12, 36), ringMat));
        const plusMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        shieldRing.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.12), plusMat));
        shieldRing.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.12), plusMat));
        shieldRing.add(new THREE.PointLight(0x38bdf8, 3, 7));
        shieldRing.visible = false;
        scene.add(shieldRing);
        let ringLive = false;
        let ringTimer = 0;
        let shieldAt = 0;
        const nextRing = () => 14 + Math.random() * 10;

        // The power-ups. A golden star (two interlocked tetrahedra) for
        // invincibility, a violet double arrow for the boost
        const starPickup = new THREE.Group();
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xf59e0b, emissiveIntensity: 1.5, metalness: 0.4, roughness: 0.25, flatShading: true });
        const tetra = new THREE.TetrahedronGeometry(0.62);
        const t1 = new THREE.Mesh(tetra, goldMat);
        const t2 = new THREE.Mesh(tetra, goldMat);
        t2.rotation.set(Math.PI, 0, Math.PI / 2);
        starPickup.add(t1, t2, new THREE.PointLight(0xfbbf24, 3, 7));
        const arrowPickup = new THREE.Group();
        const violetMat = new THREE.MeshStandardMaterial({ color: 0xe9d5ff, emissive: 0xa855f7, emissiveIntensity: 1.6, metalness: 0.3, roughness: 0.3, side: THREE.DoubleSide });
        const chevron = new THREE.Shape();
        chevron.moveTo(-0.55, -0.35);
        chevron.lineTo(0, 0.2);
        chevron.lineTo(0.55, -0.35);
        chevron.lineTo(0.55, -0.05);
        chevron.lineTo(0, 0.5);
        chevron.lineTo(-0.55, -0.05);
        chevron.closePath();
        const chevGeo = new THREE.ExtrudeGeometry(chevron, { depth: 0.14, bevelEnabled: false });
        [0, 0.42].forEach((dy) => {
            const c = new THREE.Mesh(chevGeo, violetMat);
            c.position.y = dy - 0.3;
            arrowPickup.add(c);
        });
        arrowPickup.add(new THREE.PointLight(0xa855f7, 3, 7));
        [starPickup, arrowPickup].forEach((g) => {
            g.visible = false;
            scene.add(g);
        });
        const pickups: Record<Power, THREE.Group> = { star: starPickup, boost: arrowPickup };
        let pickupLive: Power | null = null;
        let pickupTimer = 0;
        const nextPickup = () => 18 + Math.random() * 12;
        // the one running now, and how long it has left
        let power: Power | null = null;
        let powerLeft = 0;
        // the ship's glow while one runs
        const auraMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
        const aura = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16), auraMat);
        aura.scale.set(1.25, 0.7, 1.35);
        aura.visible = false;
        ship.add(aura);
        let baseFov = 62;

        // ---- the run ---------------------------------------------------------
        let phase: Phase = "ready";
        let speed = 0;
        let time = 0;
        let distance = 0;
        let bonus = 0;
        let shields = SHIELDS;
        let invulnerable = 0;
        let rockTimer = 0;
        let fragTimer = 0;
        let shake = 0;
        let newBest = false;
        const vel = { x: 0, y: 0 };
        const shipPos = { x: 0, y: 0 };

        const clearField = () => {
            rocks.forEach((r) => ((r.live = false), (r.mesh.visible = false)));
            frags.forEach((f) => ((f.live = false), (f.mesh.visible = false)));
            ringLive = false;
            shieldRing.visible = false;
            pickupLive = null;
            starPickup.visible = arrowPickup.visible = false;
            power = null;
            powerLeft = 0;
            aura.visible = false;
        };
        const spawnRock = (aimed: boolean) => {
            const r = rocks.find((x) => !x.live);
            if (!r) return;
            const scale = 0.7 + Math.random() * 1.7;
            r.r = scale * 0.92;
            r.mesh.scale.setScalar(scale);
            const x = aimed ? shipPos.x + (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * (BOUNDS.x * 2 + 6);
            const y = aimed ? shipPos.y + (Math.random() - 0.5) * 1.5 : (Math.random() - 0.5) * (BOUNDS.y * 2 + 4);
            r.mesh.position.set(x, y, FAR - Math.random() * 20);
            r.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
            r.spin.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6);
            r.live = true;
            r.mesh.visible = true;
        };
        const spawnFrag = () => {
            const f = frags.find((x) => !x.live);
            if (!f) return;
            f.mesh.position.set((Math.random() - 0.5) * BOUNDS.x * 1.8, (Math.random() - 0.5) * BOUNDS.y * 1.8, FAR);
            f.live = true;
            f.mesh.visible = true;
        };
        const score = () => Math.floor(distance / 10) + bonus;
        const pushHud = () =>
            setHud({ score: score(), shields, speed: Math.round(speed * (power === "boost" ? 2.2 : 1) * 36), best, phase, hitAt: invulnerable > 0.9 ? Date.now() : 0, newBest, shieldAt, power, powerLeft });

        const begin = () => {
            clearField();
            phase = "playing";
            speed = 26;
            time = distance = bonus = 0;
            shields = SHIELDS;
            invulnerable = 1;
            rockTimer = fragTimer = 0;
            ringTimer = nextRing();
            pickupTimer = nextPickup();
            shieldAt = 0;
            newBest = false;
            shipPos.x = shipPos.y = vel.x = vel.y = 0;
            for (let i = 0; i < 14; i++) {
                spawnRock(false);
                const r = rocks.filter((x) => x.live).at(-1);
                if (r) r.mesh.position.z = FAR + i * 12;
            }
            setEngine(0.05, 0.3);
            pushHud();
        };
        start.current = begin;
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
            stopEngine();
            pushHud();
        };

        // ---- controls --------------------------------------------------------
        const keys = new Set<string>();
        const aim = { x: 0, y: 0, active: false };
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
            if (e.type === "keydown") {
                if ((k === " " || k === "enter") && phase !== "playing") begin();
                if (k === "m") {
                    setMuted(!isMuted());
                    setMutedState(isMuted());
                }
                keys.add(k);
                aim.active = false;
            } else keys.delete(k);
        };
        // the mouse, or a finger: the ship heads for where it points
        const toAim = (cx: number, cy: number) => {
            const r = renderer.domElement.getBoundingClientRect();
            aim.x = ((cx - r.left) / r.width - 0.5) * 2 * BOUNDS.x * 1.15;
            aim.y = -((cy - r.top) / r.height - 0.5) * 2 * BOUNDS.y * 1.25;
            aim.active = true;
        };
        let dragFrom: { x: number; y: number; sx: number; sy: number } | null = null;
        const onPointer = (e: PointerEvent) => {
            if (e.pointerType === "mouse") {
                if (e.type === "pointermove") toAim(e.clientX, e.clientY);
                if (e.type === "pointerdown" && phase !== "playing") begin();
                return;
            }
            // touch: drag moves the ship relative to where the finger went down
            if (e.type === "pointerdown") {
                if (phase !== "playing") begin();
                dragFrom = { x: e.clientX, y: e.clientY, sx: shipPos.x, sy: shipPos.y };
            } else if (e.type === "pointermove" && dragFrom) {
                const r = renderer.domElement.getBoundingClientRect();
                aim.x = dragFrom.sx + ((e.clientX - dragFrom.x) / r.width) * BOUNDS.x * 3.2;
                aim.y = dragFrom.sy - ((e.clientY - dragFrom.y) / r.height) * BOUNDS.y * 3.2;
                aim.active = true;
            } else if (e.type === "pointerup" || e.type === "pointercancel") dragFrom = null;
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKey);
        const cv = renderer.domElement;
        cv.style.touchAction = "none";
        ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach((t) => cv.addEventListener(t, onPointer as EventListener));

        // ---- size ------------------------------------------------------------
        const fit = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            camera.aspect = w / h;
            // narrow screens see the same width of the field
            baseFov = w / h < 0.9 ? 78 : 62;
            camera.fov = baseFov;
            camera.updateProjectionMatrix();
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);

        // ---- the loop --------------------------------------------------------
        let raf = 0;
        let last = performance.now();
        let hudTimer = 0;
        const tmp = new THREE.Vector3();
        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (document.hidden) return;
            const playing = phase === "playing";

            // steering
            let tx = 0;
            let ty = 0;
            if (keys.has("arrowleft") || keys.has("a")) tx -= 1;
            if (keys.has("arrowright") || keys.has("d")) tx += 1;
            if (keys.has("arrowup") || keys.has("w")) ty += 1;
            if (keys.has("arrowdown") || keys.has("s")) ty -= 1;
            if (playing) {
                if (aim.active && !tx && !ty) {
                    vel.x += ((aim.x - shipPos.x) * 6 - vel.x) * Math.min(1, dt * 8);
                    vel.y += ((aim.y - shipPos.y) * 6 - vel.y) * Math.min(1, dt * 8);
                } else {
                    vel.x += (tx * 11 - vel.x) * Math.min(1, dt * 7);
                    vel.y += (ty * 9 - vel.y) * Math.min(1, dt * 7);
                }
                shipPos.x = THREE.MathUtils.clamp(shipPos.x + vel.x * dt, -BOUNDS.x, BOUNDS.x);
                shipPos.y = THREE.MathUtils.clamp(shipPos.y + vel.y * dt, -BOUNDS.y, BOUNDS.y);
                time += dt;
                speed = Math.min(88, 26 + time * 1.15);
                // a boost: over twice as fast, and its distance counts double
                distance += speed * dt * (power === "boost" ? 4.4 : 1);
                if (power) {
                    powerLeft -= dt;
                    if (powerLeft <= 0) {
                        power = null;
                        aura.visible = false;
                        invulnerable = Math.max(invulnerable, 0.8);
                        pushHud();
                    }
                }
                invulnerable = Math.max(0, invulnerable - dt);
                setEngine(0.05, speed / 88);
            } else {
                // idle: the ship drifts gently in the middle
                shipPos.x += (Math.sin(now / 1400) * 1.2 - shipPos.x) * dt;
                shipPos.y += (Math.cos(now / 1700) * 0.5 - shipPos.y) * dt;
                vel.x = vel.y = 0;
                speed += ((phase === "over" ? 6 : 14) - speed) * dt;
            }
            ship.position.set(shipPos.x, shipPos.y, 0);
            ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, -vel.x * 0.07, 0.15);
            ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, vel.y * 0.04, 0.15);
            ship.visible = !(playing && invulnerable > 0 && Math.floor(now / 90) % 2 === 0);
            flame.scale.set(1, 0.7 + Math.random() * 0.5 + speed / 90, 1);
            flameMat.opacity = 0.65 + Math.random() * 0.3;

            // the field comes at you
            const dz = speed * dt * (power === "boost" ? 2.2 : 1);
            // the boost widens the view; the aura flickers in its last second
            const fovTo = baseFov + (power === "boost" ? 16 : 0);
            if (Math.abs(camera.fov - fovTo) > 0.05) {
                camera.fov += (fovTo - camera.fov) * Math.min(1, dt * 5);
                camera.updateProjectionMatrix();
            }
            if (power) {
                auraMat.color.set(power === "star" ? 0xfbbf24 : 0xa855f7);
                aura.visible = powerLeft > 1 || Math.floor(now / 110) % 2 === 0;
                aura.rotation.z += dt * 2;
                auraMat.opacity = 0.2 + Math.sin(now / 90) * 0.08;
            }
            for (let i = 0; i < STAR_COUNT; i++) {
                const z = starPos[i * 3 + 2] + dz * (power === "boost" ? 2.4 : 1.6);
                starPos[i * 3 + 2] = z > 20 ? FAR - 60 : z;
            }
            starGeo.attributes.position.needsUpdate = true;
            if (playing) {
                rockTimer -= dt;
                if (rockTimer <= 0) {
                    spawnRock(Math.random() < 0.28 + Math.min(0.3, time / 120));
                    rockTimer = Math.max(0.08, 0.42 - time / 150);
                }
                fragTimer -= dt;
                if (fragTimer <= 0) {
                    spawnFrag();
                    fragTimer = 2.2 + Math.random() * 1.6;
                }
            }
            for (const r of rocks) {
                if (!r.live) continue;
                r.mesh.position.z += dz;
                r.mesh.rotation.x += r.spin.x * dt;
                r.mesh.rotation.y += r.spin.y * dt;
                r.mesh.rotation.z += r.spin.z * dt;
                if (r.mesh.position.z > 12) {
                    r.live = false;
                    r.mesh.visible = false;
                    continue;
                }
                // invincible or boosting: rocks shatter on the ship, for points
                if (playing && power && Math.abs(r.mesh.position.z) < r.r + 0.8) {
                    tmp.set(shipPos.x, shipPos.y, 0);
                    if (tmp.distanceTo(r.mesh.position) < r.r + 0.7) {
                        r.live = false;
                        r.mesh.visible = false;
                        bonus += 25;
                        shake = reduce ? 0 : 0.15;
                        sfxSmash();
                    }
                    continue;
                }
                if (playing && invulnerable <= 0 && Math.abs(r.mesh.position.z) < r.r + 0.8) {
                    tmp.set(shipPos.x, shipPos.y, 0);
                    if (tmp.distanceTo(r.mesh.position) < r.r + 0.55) {
                        shields -= 1;
                        invulnerable = 1.4;
                        shake = reduce ? 0 : 0.5;
                        r.live = false;
                        r.mesh.visible = false;
                        sfxHit();
                        if (shields <= 0) end();
                        else pushHud();
                    }
                }
            }
            for (const f of frags) {
                if (!f.live) continue;
                f.mesh.position.z += dz;
                f.mesh.rotation.y += dt * 2.4;
                f.mesh.rotation.x += dt * 1.1;
                if (f.mesh.position.z > 12) {
                    f.live = false;
                    f.mesh.visible = false;
                    continue;
                }
                if (playing && Math.abs(f.mesh.position.z) < 1.2) {
                    tmp.set(shipPos.x, shipPos.y, 0);
                    if (tmp.distanceTo(f.mesh.position) < 1.25) {
                        bonus += 50;
                        f.live = false;
                        f.mesh.visible = false;
                        sfxCollect();
                    }
                }
            }

            // the shield ring: counts down only while a shield is down
            if (playing && !ringLive && shields < SHIELDS) {
                ringTimer -= dt;
                if (ringTimer <= 0) {
                    shieldRing.position.set((Math.random() - 0.5) * BOUNDS.x * 1.6, (Math.random() - 0.5) * BOUNDS.y * 1.6, FAR);
                    ringLive = true;
                    shieldRing.visible = true;
                    ringTimer = nextRing();
                }
            }
            if (ringLive) {
                shieldRing.position.z += dz;
                shieldRing.rotation.y += dt * 1.8;
                ringMat.emissiveIntensity = 1.3 + Math.sin(now / 160) * 0.5;
                if (shieldRing.position.z > 12) {
                    ringLive = false;
                    shieldRing.visible = false;
                } else if (playing && Math.abs(shieldRing.position.z) < 1.3) {
                    tmp.set(shipPos.x, shipPos.y, 0);
                    if (tmp.distanceTo(shieldRing.position) < 1.5) {
                        ringLive = false;
                        shieldRing.visible = false;
                        shields = Math.min(SHIELDS, shields + 1);
                        shieldAt = Date.now();
                        sfxShield();
                        pushHud();
                    }
                }
            }

            // the power-ups: one at a time, never while one is running
            if (playing && !pickupLive && !power) {
                pickupTimer -= dt;
                if (pickupTimer <= 0) {
                    pickupLive = Math.random() < 0.5 ? "star" : "boost";
                    pickups[pickupLive].position.set((Math.random() - 0.5) * BOUNDS.x * 1.5, (Math.random() - 0.5) * BOUNDS.y * 1.5, FAR);
                    pickups[pickupLive].visible = true;
                    pickupTimer = nextPickup();
                }
            }
            if (pickupLive) {
                const g = pickups[pickupLive];
                g.position.z += dz;
                g.rotation.y += dt * 2.2;
                if (pickupLive === "star") g.rotation.x += dt * 1.3;
                if (g.position.z > 12) {
                    g.visible = false;
                    pickupLive = null;
                } else if (playing && Math.abs(g.position.z) < 1.3) {
                    tmp.set(shipPos.x, shipPos.y, 0);
                    if (tmp.distanceTo(g.position) < 1.5) {
                        power = pickupLive;
                        powerLeft = POWER_TIME[power];
                        g.visible = false;
                        pickupLive = null;
                        aura.visible = true;
                        if (power === "star") sfxStar();
                        else sfxBoost();
                        pushHud();
                    }
                }
            }

            // the camera follows, a little behind and above
            camera.position.x += (shipPos.x * 0.55 - camera.position.x) * Math.min(1, dt * 4);
            camera.position.y += (1.4 + shipPos.y * 0.45 - camera.position.y) * Math.min(1, dt * 4);
            if (shake > 0) {
                camera.position.x += (Math.random() - 0.5) * shake;
                camera.position.y += (Math.random() - 0.5) * shake;
                shake = Math.max(0, shake - dt * 1.4);
            }
            camera.lookAt(shipPos.x * 0.35, shipPos.y * 0.3, -20);
            renderer.render(scene, camera);

            hudTimer -= dt;
            if (playing && hudTimer <= 0) {
                hudTimer = 0.1;
                pushHud();
            }
        };
        raf = requestAnimationFrame(loop);
        pushHud();

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            stopEngine();
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                m.geometry?.dispose();
                const mat = m.material as THREE.Material | THREE.Material[] | undefined;
                if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
                else mat?.dispose();
            });
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-[#03040a] text-white">
            <div ref={mount} className="absolute inset-0" aria-label="Asteroid Run: a 3D game" role="application" />
            {/* a red flash when hit */}
            {hud.hitAt > 0 && <div key={hud.hitAt} className="pointer-events-none absolute inset-0 animate-[arcade-hit_0.5s_ease-out_forwards] bg-rose-500/25" />}
            {/* and a blue one, and a word, when a shield comes back */}
            {hud.shieldAt > 0 && (
                <div key={hud.shieldAt} className="pointer-events-none absolute inset-0 flex animate-[arcade-hit_1.2s_ease-out_forwards] items-center justify-center bg-sky-400/10">
                    <span className="font-mono text-sm uppercase tracking-[0.3em] text-sky-200">+1 shield</span>
                </div>
            )}

            {/* HUD */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 font-mono text-xs uppercase tracking-[0.2em] sm:p-6">
                <div>
                    <p className="text-teal-300/80">Score</p>
                    <p className="text-2xl font-bold tracking-normal text-white">{hud.score.toLocaleString()}</p>
                    <p className="mt-1 text-neutral-500">Best {hud.best.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-teal-300/80">Shields</p>
                    <p className="mt-1 flex justify-end gap-1.5">
                        {Array.from({ length: SHIELDS }, (_, i) => (
                            <span key={i} className={`block h-2.5 w-6 rounded-sm ${i < hud.shields ? "bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]" : "bg-white/10"}`} />
                        ))}
                    </p>
                    <p className="mt-2 text-neutral-500">{hud.speed.toLocaleString()} km/s</p>
                </div>
            </div>

            {/* the power-up running now, and its time */}
            {hud.phase === "playing" && hud.power && (
                <div className="pointer-events-none absolute left-1/2 top-4 w-48 -translate-x-1/2 text-center font-mono text-[11px] uppercase tracking-[0.25em] sm:top-6">
                    <p className={hud.power === "star" ? "text-amber-300" : "text-violet-300"}>{POWER_NAME[hud.power]}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className={`h-full ${hud.power === "star" ? "bg-amber-300" : "bg-violet-400"} ${hud.powerLeft < 1 ? "animate-pulse" : ""}`}
                            style={{ width: `${Math.max(0, (hud.powerLeft / POWER_TIME[hud.power]) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* the buttons */}
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

            {/* the title, and game over */}
            {/* a tap or click anywhere (or the button) launches */}
            {hud.phase !== "playing" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="max-w-sm rounded-2xl border border-teal-400/25 bg-black/60 p-6 text-center backdrop-blur-md">
                        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">{hud.phase === "over" ? "Run over" : "Crew arcade · 01"}</p>
                        <h1 className="font-display mt-2 text-3xl font-bold">{hud.phase === "over" ? `${hud.score.toLocaleString()} points` : "Asteroid Run"}</h1>
                        {hud.phase === "over" && hud.newBest && <p className="mt-1 text-sm text-amber-300">A new best!</p>}
                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                            Dodge the rocks, grab the glowing fragments for points. A blue ring restores a lost shield, a golden star makes you invincible, and a violet arrow boosts you forward. It gets faster the longer you last.
                        </p>
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                            <span className="hidden sm:inline">Arrows / WASD or the mouse · M to mute</span>
                            <span className="sm:hidden">Drag anywhere to steer</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => start.current()}
                            className="pointer-events-auto mt-5 rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-teal-300"
                        >
                            {hud.phase === "over" ? "Fly again" : "Launch"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
