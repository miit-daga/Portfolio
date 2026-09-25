"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { trackEvent } from "@/lib/track";
import { NoWebGL } from "./no-webgl";
import { reportError } from "@/lib/report-error";
import { Board } from "./board";
import { isMuted, setEngine, setMuted, sfxCollect, sfxHit, sfxOver, sfxShield, stopEngine } from "./sound";
import { FullscreenButton } from "./fullscreen";
import { alignStars, rockGeometry, rockMaterial, seededRandom, skyTexture, spaceEnvironment, starPoints, todayKey } from "./space";
import { buildShip } from "./ship";

// Free flight: Asteroid Run's ship, loose in an asteroid field that surrounds
// it, to fly anywhere. The mouse steers the nose (the pointer is locked to the
// game while flying, so it can't wander off), and so do WASD and the arrow
// keys, as in Asteroid Run; hold Shift (or the mouse button) to go faster and
// Space to slow down. On a phone, drag to steer and hold the arrows for speed. The field is all round the ship and keeps coming as it flies: rocks
// that fall far behind are placed again ahead. Gold rings, one at a time, are
// for flying through: points, and every fifth restores a lost shield. A radar
// shows what's near, behind in amber. The score is the distance flown and the
// rings; three hits and it's over. Today's field is seeded by the date, with
// today's real asteroids from NASA crossing the way.

const BEST_KEY = "arcade-flight-best";
const SHIELDS = 3;
const ROCKS = 280;
// rocks live within this far of the ship; beyond it they're placed again ahead
const FIELD = 115;
const SHIP_R = 0.85;
const CRUISE = 20;
const FAST = 46;
const SLOW = 6;
const RING_R = 3.4;
const RADAR_RANGE = 70;

type Phase = "ready" | "playing" | "over";
type Neo = { name: string; d: number; v: number; ld: number; hazardous: boolean };
const neoLabel = (n: Neo) => `${n.name} · ≈${n.d} m · ${n.v} km/s${n.hazardous ? " · potentially hazardous" : ""}`;
type Hud = { score: number; best: number; shields: number; speed: number; rings: number; phase: Phase; hitAt: number; newBest: boolean; shieldAt: number; daily: boolean; dodged: Neo[]; hitBy: Neo | null };

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export default function FreeFlight({ onExit, onRunner }: { onExit: () => void; onRunner?: () => void }) {
    const mount = useRef<HTMLDivElement>(null);
    const radar = useRef<HTMLCanvasElement>(null);
    const reticle = useRef<HTMLDivElement>(null);
    const ringMark = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<Hud>({ score: 0, best: 0, shields: SHIELDS, speed: 0, rings: 0, phase: "ready", hitAt: 0, newBest: false, shieldAt: 0, daily: false, dodged: [], hitBy: null });
    const [muted, setMutedState] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [noGl, setNoGl] = useState(false);
    const start = useRef<(daily?: boolean) => void>(() => {});
    const lock = useRef<() => void>(() => {});
    // the phone's speed buttons: +1 faster, -1 slower
    const thrust = useRef<0 | 1 | -1>(0);
    const [neos, setNeos] = useState<Neo[] | null>(null);
    const [passing, setPassing] = useState<{ neo: Neo; at: number } | null>(null);
    useEffect(() => {
        if (!passing) return;
        const id = window.setTimeout(() => setPassing(null), 4500);
        return () => window.clearTimeout(id);
    }, [passing]);

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
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, powerPreference: "high-performance" });
        } catch (e) {
            reportError("flight", "no-webgl", e);
            setNoGl(true);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.classList.add("game-canvas");
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x000000, 60, FIELD + 10);
        const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 600);
        let ready = false;
        const manager = new THREE.LoadingManager(() => {
            ready = true;
            setLoaded(true);
        });
        // (as in the other games: a stalled download doesn't hold the loading
        // screen for ever, and it's reported, with what was still loading)
        const waiting = new Set<string>();
        const itemStart = manager.itemStart.bind(manager);
        const itemEnd = manager.itemEnd.bind(manager);
        manager.itemStart = (url) => {
            waiting.add(url.split("/").pop() ?? url);
            itemStart(url);
        };
        manager.itemEnd = (url) => {
            waiting.delete(url.split("/").pop() ?? url);
            itemEnd(url);
        };
        const giveUp = window.setTimeout(() => {
            if (!ready) reportError("flight", "stuck-loading", `still loading: ${[...waiting].join(", ") || "?"}`);
            setLoaded(true);
        }, 12_000);
        const loader = new THREE.TextureLoader(manager);

        // The real sky, all the way round: here you can turn to see any of it
        const sky = skyTexture(renderer, loader);
        scene.background = sky;
        scene.backgroundIntensity = 0.7;
        scene.backgroundRotation.set(2.503, 0.244, -3.006);
        const stars = starPoints(350, manager);
        alignStars(stars, scene.backgroundRotation);
        (stars.material as THREE.ShaderMaterial).uniforms.uScale.value = renderer.getPixelRatio();
        scene.add(stars);

        const SUN = new THREE.Vector3(6, 7, 5).normalize();
        scene.add(new THREE.AmbientLight(0x8090c0, 0.1));
        const sun = new THREE.DirectionalLight(0xfff4e6, 3.4);
        sun.position.copy(SUN);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x9fb8ff, 0.35);
        rim.position.set(-6, -3, -8);
        scene.add(rim);
        const env = spaceEnvironment(renderer, SUN);
        scene.environment = env.texture;

        // ---- the ship --------------------------------------------------------
        // `craft` carries where the ship is and which way it points; the ship
        // inside it only banks into turns, for the look of it
        const { ship, flame, flameMat, engineGlow } = buildShip();
        const craft = new THREE.Group();
        craft.add(ship);
        scene.add(craft);
        const pos = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const fwd = new THREE.Vector3(0, 0, -1);
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3(1, 0, 0);
        const orient = () => {
            fwd.set(0, 0, -1).applyQuaternion(q);
            up.copy(Y).applyQuaternion(q);
            right.copy(X).applyQuaternion(q);
        };

        // ---- the field -------------------------------------------------------
        let rnd = Math.random;
        let daily = false;
        const rockGeos = [11, 23, 37, 52, 67, 81, 94, 106].map(rockGeometry);
        const rockMat = rockMaterial();
        const hazardMat = rockMaterial();
        hazardMat.emissive.set(0x991b1b);
        hazardMat.emissiveIntensity = 0.8;
        type Rock = { mesh: THREE.Mesh; r: number; spin: THREE.Vector3; drift: THREE.Vector3; live: boolean; neo?: Neo; near?: boolean };
        const makeRock = (i: number): Rock => {
            const mesh = new THREE.Mesh(rockGeos[i % rockGeos.length], rockMat);
            mesh.visible = false;
            scene.add(mesh);
            return { mesh, r: 1, spin: new THREE.Vector3(), drift: new THREE.Vector3(), live: false };
        };
        const rocks: Rock[] = Array.from({ length: ROCKS }, (_, i) => makeRock(i));
        // today's real asteroids, one at a time across the way
        const named: Rock[] = Array.from({ length: 8 }, (_, i) => makeRock(i * 3));
        const dir = new THREE.Vector3();
        const tmp = new THREE.Vector3();
        const tmp2 = new THREE.Vector3();
        const hide = (k: Rock) => {
            k.live = false;
            k.mesh.visible = false;
        };
        // A rock somewhere: all round the ship at the start (not right in its
        // way), and after that mostly ahead, where it's going
        const place = (k: Rock, around: boolean) => {
            let dist = 0;
            for (let tries = 0; tries < 6; tries++) {
                dir.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
                if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
                dir.normalize();
                if (around) {
                    dist = 22 + Math.cbrt(rnd()) * (FIELD - 22);
                    // (a clear way ahead at the start)
                    if (dir.dot(fwd) > 0.85 && dist < 90) continue;
                } else {
                    dir.multiplyScalar(0.75).add(fwd).normalize();
                    dist = FIELD * (0.78 + rnd() * 0.22);
                }
                break;
            }
            k.mesh.position.copy(pos).addScaledVector(dir, dist);
            // mostly small, now and then a big one
            const s = 0.7 + Math.pow(rnd(), 2.3) * 4.4;
            k.r = s * 0.9;
            k.mesh.scale.setScalar(s);
            k.mesh.material = rockMat;
            k.mesh.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
            k.spin.set((rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6);
            k.drift.set((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4);
            k.neo = undefined;
            k.near = false;
            k.live = true;
            k.mesh.visible = true;
        };
        let active = 160;

        let todays: Neo[] = [];
        let neoNext = 0;
        let neoTimer = 0;
        let dodged: Neo[] = [];
        let hitBy: Neo | null = null;
        fetch("/api/space-today")
            .then((r) => r.json())
            .then((d: { asteroids?: Neo[] | null }) => {
                todays = Array.isArray(d?.asteroids) ? d.asteroids.slice(0, 8) : [];
                setNeos(todays);
            })
            .catch(() => setNeos([]));
        // One of today's asteroids: ahead and off to one side, drifting across
        // the ship's way; sized from its real diameter, red if hazardous
        const spawnNamed = () => {
            const n = todays[neoNext];
            const k = named[neoNext];
            neoNext += 1;
            if (!n || !k) return;
            const scale = (1.8 + 1.6 * Math.min(1, Math.max(0, (Math.log10(Math.max(1, n.d)) - 1.3) / 1.4))) * 1.5;
            const side = rnd() < 0.5 ? -1 : 1;
            k.mesh.position.copy(pos).addScaledVector(fwd, 95).addScaledVector(right, side * (16 + rnd() * 8)).addScaledVector(up, (rnd() - 0.5) * 14);
            tmp.copy(pos).addScaledVector(fwd, 70).sub(k.mesh.position).normalize();
            k.drift.copy(tmp).multiplyScalar(7);
            k.r = scale * 0.92;
            k.mesh.scale.setScalar(scale);
            k.mesh.material = n.hazardous ? hazardMat : rockMat;
            k.mesh.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
            k.spin.set((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5);
            k.neo = n;
            k.near = false;
            k.live = true;
            k.mesh.visible = true;
            setPassing({ neo: n, at: Date.now() });
        };

        // Dust near the ship, streaking past: the sense of speed and direction
        const DUST = 360;
        const DUST_R = 42;
        const dustPts = Array.from({ length: DUST }, () => new THREE.Vector3());
        const dustPos = new Float32Array(DUST * 6);
        const dustCol = new Float32Array(DUST * 6);
        const placeDust = (p: THREE.Vector3, ahead: boolean) => {
            dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
            if (ahead) dir.add(fwd).normalize();
            p.copy(pos).addScaledVector(dir, (ahead ? 0.8 + Math.random() * 0.2 : Math.random()) * DUST_R);
        };
        for (let i = 0; i < DUST; i++) {
            placeDust(dustPts[i], false);
            const b = 0.35 + Math.random() * 0.4;
            dustCol.set([b, b * 1.04, b * 1.12, 0, 0, 0], i * 6);
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
        dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
        const dust = new THREE.LineSegments(dustGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        dust.frustumCulled = false;
        scene.add(dust);

        // The gold ring, one at a time, somewhere ahead
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xf59e0b, emissiveIntensity: 1.3, metalness: 0.35, roughness: 0.3 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.24, 14, 56), ringMat);
        ring.add(new THREE.PointLight(0xfbbf24, 4, 14));
        scene.add(ring);
        const ringNormal = new THREE.Vector3();
        let ringSide = 0;
        const ringSideNow = () => tmp.copy(pos).sub(ring.position).dot(ringNormal);
        const placeRing = () => {
            dir.copy(fwd).add(tmp2.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.75)).normalize();
            ring.position.copy(pos).addScaledVector(dir, 70 + rnd() * 30);
            ring.lookAt(pos);
            ringNormal.copy(Z).applyQuaternion(ring.quaternion);
            ringSide = ringSideNow();
        };

        // ---- the flight ------------------------------------------------------
        let phase: Phase = "ready";
        let speed = CRUISE;
        let distance = 0;
        let bonus = 0;
        let rings = 0;
        let time = 0;
        let shields = SHIELDS;
        let invulnerable = 0;
        let shieldAt = 0;
        let newBest = false;
        let shake = 0;
        let bank = 0;
        const score = () => Math.floor(distance / 10) + bonus;
        const pushHud = () =>
            setHud({ score: score(), best, shields, speed: Math.round(speed * 36), rings, phase, hitAt: invulnerable > 1.2 ? Date.now() : 0, newBest, shieldAt, daily, dodged: dodged.slice(), hitBy });

        // the field all round, for the title screen and each flight
        const setField = () => {
            [...rocks, ...named].forEach(hide);
            for (let i = 0; i < active; i++) place(rocks[i], true);
            placeRing();
        };
        const begin = (asDaily = daily) => {
            daily = asDaily;
            rnd = daily ? seededRandom(`flight:${todayKey()}`) : Math.random;
            q.identity();
            orient();
            speed = CRUISE;
            distance = bonus = rings = time = 0;
            shields = SHIELDS;
            // a moment's grace at the start
            invulnerable = 2;
            shieldAt = 0;
            newBest = false;
            active = 160;
            neoNext = 0;
            neoTimer = 8;
            dodged = [];
            hitBy = null;
            setField();
            phase = "playing";
            setEngine(0.05, 0.3);
            pushHud();
        };
        start.current = begin;
        const end = () => {
            phase = "over";
            unlockPointer();
            const s = score();
            trackEvent("free_flight_over", { score: s, seconds: Math.round(time) });
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
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement | null)?.closest?.("input, textarea")) return;
            const k = e.key.toLowerCase();
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
            if (e.type === "keydown") {
                if ((k === " " || k === "enter") && phase !== "playing") begin();
                if (k === "m") {
                    setMuted(!isMuted());
                    setMutedState(isMuted());
                }
                keys.add(k);
            } else keys.delete(k);
        };
        // The mouse: while flying, the pointer is locked to the game and its
        // movement turns the nose. Unlocked (after Esc), the nose turns toward
        // wherever the pointer is, away from the middle of the screen.
        const cv = renderer.domElement;
        const locked = () => document.pointerLockElement === cv;
        const lockPointer = () => {
            if (locked() || !cv.requestPointerLock) return;
            try {
                const p = cv.requestPointerLock() as unknown as Promise<void> | undefined;
                p?.catch?.(() => {});
            } catch {
                /* not allowed here: steer with the pointer instead */
            }
        };
        const unlockPointer = () => {
            if (locked()) document.exitPointerLock();
        };
        lock.current = lockPointer;
        let mouseDX = 0;
        let mouseDY = 0;
        // the mouse button, held while the pointer is locked: faster
        let mouseHeld = false;
        const aim = { x: 0, y: 0, on: false };
        let touch: { id: number; x0: number; y0: number; x: number; y: number } | null = null;
        const onPointer = (e: PointerEvent) => {
            if (e.pointerType === "mouse") {
                if (e.type === "pointerdown") {
                    if (phase !== "playing") begin();
                    else if (locked()) mouseHeld = true;
                    lockPointer();
                } else if (e.type === "pointerup" || e.type === "pointercancel") mouseHeld = false;
                else if (e.type === "pointermove") {
                    if (locked()) {
                        mouseDX += e.movementX;
                        mouseDY += e.movementY;
                    } else {
                        const r = cv.getBoundingClientRect();
                        aim.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
                        aim.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
                        aim.on = true;
                    }
                } else if (e.type === "pointerleave") aim.on = false;
                return;
            }
            // a finger: drag from where it went down, like a joystick
            if (e.type === "pointerdown") {
                if (phase !== "playing") begin();
                touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
            } else if (touch && e.pointerId === touch.id) {
                if (e.type === "pointermove") {
                    touch.x = e.clientX;
                    touch.y = e.clientY;
                } else if (e.type === "pointerup" || e.type === "pointercancel") touch = null;
            }
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKey);
        cv.style.touchAction = "none";
        const pointerEvents = ["pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave"];
        pointerEvents.forEach((t) => cv.addEventListener(t, onPointer as EventListener));

        // ---- size ------------------------------------------------------------
        let baseFov = 66;
        const fit = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            camera.aspect = w / h;
            baseFov = w / h < 0.9 ? 80 : 66;
            camera.updateProjectionMatrix();
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);

        // ---- the radar -------------------------------------------------------
        const radarCtx = radar.current?.getContext("2d") ?? null;
        const qInv = new THREE.Quaternion();
        const drawRadar = () => {
            const c = radar.current;
            if (!c || !radarCtx) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const size = c.clientWidth;
            if (c.width !== Math.round(size * dpr)) {
                c.width = c.height = Math.round(size * dpr);
            }
            const R = (size / 2) * dpr;
            radarCtx.setTransform(1, 0, 0, 1, 0, 0);
            radarCtx.clearRect(0, 0, c.width, c.height);
            radarCtx.fillStyle = "rgba(0,0,0,0.45)";
            radarCtx.beginPath();
            radarCtx.arc(R, R, R - dpr, 0, Math.PI * 2);
            radarCtx.fill();
            radarCtx.strokeStyle = "rgba(255,255,255,0.18)";
            radarCtx.lineWidth = dpr;
            radarCtx.stroke();
            radarCtx.beginPath();
            radarCtx.arc(R, R, R * 0.5, 0, Math.PI * 2);
            radarCtx.moveTo(R, dpr * 3);
            radarCtx.lineTo(R, c.height - dpr * 3);
            radarCtx.moveTo(dpr * 3, R);
            radarCtx.lineTo(c.width - dpr * 3, R);
            radarCtx.strokeStyle = "rgba(255,255,255,0.07)";
            radarCtx.stroke();
            qInv.copy(q).invert();
            const dot = (p: THREE.Vector3, rr: number, colour: string) => {
                tmp.copy(p).sub(pos).applyQuaternion(qInv);
                const d = Math.hypot(tmp.x, tmp.z);
                if (d > RADAR_RANGE || Math.abs(tmp.y) > RADAR_RANGE) return;
                const x = R + (tmp.x / RADAR_RANGE) * (R - 4 * dpr);
                const y = R + (tmp.z / RADAR_RANGE) * (R - 4 * dpr);
                radarCtx.globalAlpha = 1 - (Math.abs(tmp.y) / RADAR_RANGE) * 0.7;
                radarCtx.fillStyle = colour === "behind" ? (tmp.z > 0 ? "#fbbf24" : "#e2e8f0") : colour;
                radarCtx.beginPath();
                radarCtx.arc(x, y, Math.max(1.2, Math.min(4, rr * 0.8)) * dpr, 0, Math.PI * 2);
                radarCtx.fill();
            };
            for (const k of rocks) if (k.live) dot(k.mesh.position, k.r, "behind");
            for (const k of named) if (k.live) dot(k.mesh.position, k.r, k.neo?.hazardous ? "#f87171" : "#7dd3fc");
            dot(ring.position, 3, "#fde68a");
            radarCtx.globalAlpha = 1;
            // the ship, in the middle, nose up
            radarCtx.fillStyle = "#ffffff";
            radarCtx.beginPath();
            radarCtx.moveTo(R, R - 5 * dpr);
            radarCtx.lineTo(R + 3.5 * dpr, R + 4 * dpr);
            radarCtx.lineTo(R - 3.5 * dpr, R + 4 * dpr);
            radarCtx.closePath();
            radarCtx.fill();
        };

        // Where the nose points, and where the ring is (an arrow at the edge of
        // the screen when it's off it)
        const screen = new THREE.Vector3();
        const markHeading = () => {
            const r = reticle.current;
            const w = el.clientWidth;
            const h = el.clientHeight;
            if (r) {
                screen.copy(pos).addScaledVector(fwd, 60).project(camera);
                r.style.transform = `translate(${((screen.x + 1) / 2) * w}px, ${((1 - screen.y) / 2) * h}px) translate(-50%, -50%)`;
            }
            const m = ringMark.current;
            if (!m) return;
            tmp.copy(ring.position).applyMatrix4(camera.matrixWorldInverse);
            const inFront = tmp.z < 0;
            screen.copy(ring.position).project(camera);
            let sx = screen.x;
            let sy = screen.y;
            if (inFront && Math.abs(sx) < 0.92 && Math.abs(sy) < 0.88) {
                m.dataset.edge = "";
                m.style.transform = `translate(${((sx + 1) / 2) * w}px, ${((1 - sy) / 2) * h}px) translate(-50%, -50%)`;
                return;
            }
            // off screen: point toward it, from the edge
            if (!inFront) {
                sx = tmp.x;
                sy = tmp.y;
            }
            const a = Math.atan2(sy, sx);
            const ex = Math.cos(a) * 0.86;
            const ey = Math.sin(a) * 0.8;
            m.dataset.edge = "1";
            m.style.transform = `translate(${((ex + 1) / 2) * w}px, ${((1 - ey) / 2) * h}px) translate(-50%, -50%) rotate(${-a}rad)`;
        };

        // ---- the loop --------------------------------------------------------
        let raf = 0;
        let last = performance.now();
        let hudTimer = 0;
        const qTurn = new THREE.Quaternion();
        const camTarget = new THREE.Vector3();
        const lookAt = new THREE.Vector3();
        setField();
        camera.position.copy(pos).addScaledVector(up, 1.7).addScaledVector(fwd, -6.5);
        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (document.hidden) return;
            const playing = phase === "playing";

            // steering: the mouse's movement (locked), the pointer's place
            // (unlocked), a finger's drag, WASD and the arrow keys
            let yaw = 0;
            let pitch = 0;
            if (playing) {
                if (locked()) {
                    yaw -= mouseDX * 0.0022;
                    pitch -= mouseDY * 0.0022;
                } else if (aim.on) {
                    const dead = (v: number) => (Math.sign(v) * Math.max(0, Math.abs(v) - 0.08)) / 0.92;
                    yaw -= dead(aim.x) * 1.5 * dt;
                    pitch -= dead(aim.y) * 1.2 * dt;
                }
                if (touch) {
                    const r = cv.getBoundingClientRect();
                    yaw -= THREE.MathUtils.clamp((touch.x - touch.x0) / (r.width * 0.18), -1, 1) * 1.6 * dt;
                    pitch -= THREE.MathUtils.clamp((touch.y - touch.y0) / (r.height * 0.18), -1, 1) * 1.3 * dt;
                }
                if (keys.has("arrowleft") || keys.has("a")) yaw += 1.3 * dt;
                if (keys.has("arrowright") || keys.has("d")) yaw -= 1.3 * dt;
                if (keys.has("arrowup") || keys.has("w")) pitch += 1.1 * dt;
                if (keys.has("arrowdown") || keys.has("s")) pitch -= 1.1 * dt;
            }
            mouseDX = mouseDY = 0;
            yaw = THREE.MathUtils.clamp(yaw, -0.25, 0.25);
            pitch = THREE.MathUtils.clamp(pitch, -0.25, 0.25);
            q.multiply(qTurn.setFromAxisAngle(Y, yaw)).multiply(qTurn.setFromAxisAngle(X, pitch));
            // a gentle hand on the roll, back toward level, unless pointing
            // nearly straight up or down, so the view doesn't slowly tip over
            orient();
            if (Math.abs(fwd.y) < 0.85) {
                const roll = -Math.atan2(right.y, up.y);
                q.multiply(qTurn.setFromAxisAngle(Z, roll * Math.min(1, dt * 1.4)));
            }
            q.normalize();
            orient();

            // speed: Shift or the mouse button faster, Space slower, cruising otherwise
            const want = keys.has("shift") || mouseHeld || thrust.current === 1 ? FAST : (keys.has(" ") && playing) || thrust.current === -1 ? SLOW : CRUISE;
            if (playing) {
                speed += (want - speed) * Math.min(1, dt * 1.6);
                time += dt;
                distance += speed * dt;
                invulnerable = Math.max(0, invulnerable - dt);
                // the field thickens as the flight goes on
                active = Math.min(ROCKS, Math.floor(160 + time * 1.5));
                setEngine(0.05, speed / FAST);
            } else speed += ((phase === "over" ? 4 : 8) - speed) * dt;
            pos.addScaledVector(fwd, speed * dt);
            craft.position.copy(pos);
            craft.quaternion.copy(q);
            bank = THREE.MathUtils.lerp(bank, THREE.MathUtils.clamp((yaw / Math.max(dt, 0.001)) * 0.35, -0.7, 0.7), 0.12);
            ship.rotation.z = bank;
            ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, THREE.MathUtils.clamp((pitch / Math.max(dt, 0.001)) * 0.12, -0.3, 0.3), 0.12);
            ship.visible = !(playing && invulnerable > 0 && Math.floor(now / 90) % 2 === 0);
            flame.scale.set(1, 0.7 + Math.random() * 0.4 + speed / 40, 1);
            flameMat.opacity = 0.55 + Math.random() * 0.3;
            engineGlow.scale.setScalar(1 + Math.random() * 0.2 + speed / 80);

            // the chase camera: behind and a little above, following the turns
            camTarget.copy(pos).addScaledVector(up, 1.7).addScaledVector(fwd, -6.5);
            camera.position.lerp(camTarget, 1 - Math.exp(-dt * 9));
            camera.up.lerp(up, 1 - Math.exp(-dt * 6)).normalize();
            lookAt.copy(pos).addScaledVector(fwd, 20).addScaledVector(up, 0.6);
            if (shake > 0) {
                camera.position.x += (Math.random() - 0.5) * shake;
                camera.position.y += (Math.random() - 0.5) * shake;
                shake = Math.max(0, shake - dt * 1.6);
            }
            camera.lookAt(lookAt);
            const fovTo = baseFov + Math.max(0, speed - CRUISE) * 0.3;
            if (Math.abs(camera.fov - fovTo) > 0.05) {
                camera.fov += (fovTo - camera.fov) * Math.min(1, dt * 4);
                camera.updateProjectionMatrix();
            }
            stars.position.copy(camera.position);

            // the dust: streaks along the way you're going
            const streak = Math.min(6, 0.1 + speed * 0.06);
            for (let i = 0; i < DUST; i++) {
                const p = dustPts[i];
                if (p.distanceToSquared(pos) > DUST_R * DUST_R) placeDust(p, true);
                dustPos[i * 6] = p.x;
                dustPos[i * 6 + 1] = p.y;
                dustPos[i * 6 + 2] = p.z;
                dustPos[i * 6 + 3] = p.x - fwd.x * streak;
                dustPos[i * 6 + 4] = p.y - fwd.y * streak;
                dustPos[i * 6 + 5] = p.z - fwd.z * streak;
            }
            dustGeo.attributes.position.needsUpdate = true;

            // the rocks: drifting, turning; placed again ahead once far behind
            for (let i = 0; i < ROCKS; i++) {
                const k = rocks[i];
                if (!k.live) {
                    if (i < active && playing) place(k, false);
                    continue;
                }
                k.mesh.position.addScaledVector(k.drift, dt);
                k.mesh.rotation.x += k.spin.x * dt;
                k.mesh.rotation.y += k.spin.y * dt;
                k.mesh.rotation.z += k.spin.z * dt;
                const d = k.mesh.position.distanceTo(pos);
                if (d > FIELD * 1.08) {
                    if (i < active) place(k, false);
                    else hide(k);
                    continue;
                }
                if (playing && invulnerable <= 0 && d < k.r + SHIP_R) {
                    hit(k);
                    place(k, false);
                }
            }
            if (playing && daily && neoNext < todays.length) {
                neoTimer -= dt;
                if (neoTimer <= 0) {
                    spawnNamed();
                    neoTimer = 12;
                }
            }
            for (const k of named) {
                if (!k.live) continue;
                k.mesh.position.addScaledVector(k.drift, dt);
                k.mesh.rotation.x += k.spin.x * dt;
                k.mesh.rotation.y += k.spin.y * dt;
                const d = k.mesh.position.distanceTo(pos);
                if (d < 40) k.near = true;
                if (d > FIELD * 1.08) {
                    // (got past one of today's real asteroids)
                    if (k.neo && k.near && playing) dodged.push(k.neo);
                    hide(k);
                    continue;
                }
                if (playing && invulnerable <= 0 && d < k.r + SHIP_R) {
                    if (k.neo) hitBy = k.neo;
                    hit(k);
                    hide(k);
                }
            }

            // the ring: through it for points; a missed one goes, and another comes
            ring.rotation.z += dt * 0.6;
            ringMat.emissiveIntensity = 1.1 + Math.sin(now / 180) * 0.4;
            const sideNow = ringSideNow();
            if (playing && Math.sign(sideNow) !== Math.sign(ringSide)) {
                tmp.copy(pos).sub(ring.position);
                tmp.addScaledVector(ringNormal, -tmp.dot(ringNormal));
                if (tmp.length() < RING_R - 0.15) {
                    rings += 1;
                    bonus += 100;
                    sfxCollect();
                    if (rings % 5 === 0 && shields < SHIELDS) {
                        shields += 1;
                        shieldAt = Date.now();
                        sfxShield();
                    }
                    placeRing();
                    pushHud();
                }
            }
            ringSide = ringSideNow();
            tmp.copy(ring.position).sub(pos);
            if (tmp.length() > 230 || tmp.dot(fwd) < -30) placeRing();

            hudTimer -= dt;
            if (playing && hudTimer <= 0) {
                hudTimer = 0.25;
                pushHud();
            }
            drawRadar();
            if (ready) renderer.render(scene, camera);
            markHeading();
        };
        const hit = (k: Rock) => {
            shields -= 1;
            invulnerable = 1.6;
            speed *= 0.4;
            shake = reduce ? 0 : 0.6;
            sfxHit();
            void k;
            if (shields <= 0) end();
            else pushHud();
        };
        raf = requestAnimationFrame(loop);
        pushHud();

        return () => {
            window.clearTimeout(giveUp);
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            pointerEvents.forEach((t) => cv.removeEventListener(t, onPointer as EventListener));
            unlockPointer();
            stopEngine();
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                m.geometry?.dispose();
                const mat = m.material as (THREE.Material & { map?: THREE.Texture | null }) | undefined;
                mat?.map?.dispose();
                mat?.dispose();
            });
            sky.dispose();
            env.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    if (noGl) return <NoWebGL onExit={onExit} title="Free flight" />;
    const playing = hud.phase === "playing";
    const launch = (daily: boolean) => (e: React.MouseEvent) => {
        start.current(daily);
        if ((e.nativeEvent as PointerEvent).pointerType === "mouse") lock.current();
    };
    return (
        <div className="fixed inset-0 z-50 bg-black text-white">
            <div ref={mount} className={`absolute inset-0 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`} aria-label="Free flight: a 3D game" role="application" />
            {!loaded && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-teal-300/80">Fuelling up…</p>
                </div>
            )}
            {hud.hitAt > 0 && <div key={hud.hitAt} className="pointer-events-none absolute inset-0 animate-[arcade-hit_0.5s_ease-out_forwards] bg-rose-500/25" />}
            {hud.shieldAt > 0 && (
                <div key={hud.shieldAt} className="pointer-events-none absolute inset-0 flex animate-[arcade-hit_1.2s_ease-out_forwards] items-center justify-center bg-sky-400/10">
                    <span className="font-mono text-sm uppercase tracking-[0.3em] text-sky-200">+1 shield</span>
                </div>
            )}

            {/* where the nose points, and the ring (or an arrow toward it) */}
            <div ref={reticle} aria-hidden className={`pointer-events-none absolute left-0 top-0 h-6 w-6 ${playing ? "" : "hidden"}`}>
                <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" strokeLinecap="round">
                    <path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="#000" strokeOpacity="0.5" strokeWidth="3" />
                    <path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="#e2e8f0" strokeWidth="1.5" />
                </svg>
            </div>
            <div ref={ringMark} aria-hidden className={`group pointer-events-none absolute left-0 top-0 h-8 w-8 ${playing ? "" : "hidden"}`}>
                <svg viewBox="0 0 32 32" className="h-full w-full group-data-[edge='1']:hidden" fill="none">
                    <path d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <svg viewBox="0 0 32 32" className="hidden h-full w-full group-data-[edge='1']:block" fill="none">
                    <path d="M8 8l14 8-14 8" stroke="#000" strokeOpacity="0.5" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M8 8l14 8-14 8" stroke="#fbbf24" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
            </div>

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
                    <p className="mt-1 text-amber-300/90">Rings {hud.rings}</p>
                </div>
            </div>

            {playing && passing && (
                <div key={passing.at} className="pointer-events-none absolute inset-x-0 top-24 flex animate-[arcade-hit_4.5s_ease-in_forwards] justify-center px-4 sm:top-28">
                    <p className={`rounded-full border bg-black/60 px-4 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.15em] backdrop-blur ${passing.neo.hazardous ? "border-rose-400/50 text-rose-200" : "border-sky-300/40 text-sky-100"}`}>
                        Real asteroid, passing Earth today · {neoLabel(passing.neo)}
                    </p>
                </div>
            )}

            {/* the radar: what's near, behind in amber */}
            <div className="pointer-events-none absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
                <canvas ref={radar} aria-hidden className="block h-28 w-28 sm:h-32 sm:w-32" />
            </div>

            {/* on a phone: hold for speed */}
            {playing && (
                <div className="absolute bottom-40 right-4 hidden flex-col gap-2 [@media(pointer:coarse)]:flex">
                    {([1, -1] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            aria-label={t === 1 ? "Faster" : "Slower"}
                            onPointerDown={() => (thrust.current = t)}
                            onPointerUp={() => (thrust.current = 0)}
                            onPointerLeave={() => (thrust.current = 0)}
                            onPointerCancel={() => (thrust.current = 0)}
                            className="h-14 w-14 touch-none rounded-full border border-white/20 bg-black/50 text-lg text-neutral-100 backdrop-blur active:bg-white/15"
                        >
                            {t === 1 ? "▲" : "▼"}
                        </button>
                    ))}
                </div>
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
                <FullscreenButton className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:border-white/30 hover:text-white" />
            </div>

            {hud.phase !== "playing" && loaded && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="max-w-sm rounded-2xl border border-amber-300/25 bg-black/60 p-6 text-center backdrop-blur-md">
                        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/80">{hud.phase === "over" ? (hud.daily ? "Flight over · today's field" : "Flight over") : "Asteroid Run · free flight"}</p>
                        <h1 className="font-display mt-2 text-3xl font-bold">{hud.phase === "over" ? `${hud.score.toLocaleString()} points` : "Free flight"}</h1>
                        {hud.phase === "over" && hud.newBest && <p className="mt-1 text-sm text-amber-300">A new best!</p>}
                        {hud.phase === "over" && (
                            <div className="pointer-events-auto">
                                {hud.daily ? (
                                    <Board key="daily" game="flight-daily" day={todayKey()} score={hud.score} title="Today's field" />
                                ) : (
                                    <Board key="all" game="free-flight" score={hud.score} />
                                )}
                            </div>
                        )}
                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                            Fly anywhere: the asteroid field is all round you. Go faster for more distance, fly through the gold rings for points (every fifth restores a shield), and watch the radar for what&apos;s behind you, in amber.
                        </p>
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                            <span className="hidden sm:inline">Mouse, WASD or arrows steer · hold Shift or click faster · Space slower · Esc frees the mouse · M mute</span>
                            <span className="sm:hidden">Drag to steer · hold ▲ ▼ for speed</span>
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <button type="button" onClick={launch(hud.phase === "over" ? hud.daily : false)} className="pointer-events-auto rounded-full bg-amber-300 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-200">
                                {hud.phase === "over" ? "Fly again" : "Launch"}
                            </button>
                            <button type="button" onClick={launch(!(hud.phase === "over" && hud.daily))} className="pointer-events-auto rounded-full border border-amber-300/40 px-5 py-2.5 text-sm text-amber-200 hover:border-amber-300/70">
                                {hud.phase === "over" && hud.daily ? "Fly the open field" : "Today's field"}
                            </button>
                        </div>
                        {onRunner && (
                            <button type="button" onClick={onRunner} className="pointer-events-auto mt-3 text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline">
                                ← Back to Asteroid Run
                            </button>
                        )}
                        {hud.phase !== "over" && !!neos?.length && (
                            <p className="mt-3 text-xs leading-snug text-sky-200/80">
                                Today&apos;s field brings the {neos.length} real asteroids passing Earth today, from NASA, across your way.
                            </p>
                        )}
                        {hud.phase === "over" && hud.daily && !!neos?.length && (
                            <p className="mt-3 text-xs leading-snug text-sky-200/90">
                                {hud.dodged.length
                                    ? `You flew past ${hud.dodged.length} of today's ${neos.length} real asteroids${hud.dodged.some((n) => n.hazardous) ? ", potentially hazardous ones among them" : ""}.`
                                    : hud.hitBy
                                      ? `${hud.hitBy.name}, one of today's real asteroids (≈${hud.hitBy.d} m), got you. It passed Earth today at ${hud.hitBy.v} km/s.`
                                      : `You didn't meet any of today's ${neos.length} real asteroids this time: the first crosses 8 seconds in.`}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
