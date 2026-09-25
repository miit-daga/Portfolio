"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { trackEvent } from "@/lib/track";
import { NoWebGL } from "./no-webgl";
import { reportError } from "@/lib/report-error";
import { Board } from "./board";
import { isMuted, setEngine, setMuted, sfxBoost, sfxCollect, sfxHit, sfxOver, sfxShield, sfxSmash, sfxStar, stopEngine } from "./sound";
import { FullscreenButton } from "./fullscreen";
import { alignStars, glowTexture, loadTexture, rockGeometry, rockMaterial, skyTexture, spaceEnvironment, starPoints, todayKey } from "./space";
import { encodeTape } from "./tape";
import { buildEarth } from "./earth";
import { buildStop, type Stop } from "./worlds";
// The run's rules: a seeded simulation, stepped here and replayed by the server
// to score a posted run (the leaderboard doesn't take the browser's word for it)
import { BOUNDS, DT, FAR, FRAGS, INPUT_EVERY, POWER_TIME, ROCKS, SHIELDS, TAPE_DELTA, TOUR, TOUR_FIRST, TOUR_GAP, TOUR_IN, TOUR_OUT, neoScale, newRun, runScore, sample, stepRun, type Power, type Run, type RunEvent, type RunNeo, type Thing, type TourStage } from "./run-sim";

// Asteroid Run: fly a small ship forward through an asteroid field, dodging
// rocks and picking up glowing fragments. It gets faster the longer you last.
// Once a shield is down, a blue shield ring comes by within a few seconds, and
// then now and then while one is still down: flying through it restores one. Rarer still, two power-ups: a golden star makes
// the ship invincible for a few seconds (rocks shatter on it), and a violet
// arrow boosts it forward, fast and untouchable, for double the distance.
// Arrow keys or WASD, or the mouse; on a phone, drag anywhere. Three hits and
// the run is over. The best score is kept in this browser.

const BEST_KEY = "arcade-run-best";

type Phase = "ready" | "intro" | "playing" | "over";
// The opening flyby plays on the first launch of a visit (not on every retry)
let flownBy = false;
// the Earth for it: its radius, and the ship's loop round it (from its centre)
const EARTH_R = 24;
const ORBIT_R = 34;
const ORBIT_S = 7;
const SETTLE_S = 1.6;
// Some way into a run the course goes round the worlds, one after another
// (the tour: TOUR in run-sim.ts, which times it, since the grace leaving each
// orbit decides hits). Each comes in from far ahead, a point that grows,
// swings in under the ship, the run goes once round it (the sky wheeling,
// through its day and night), and leaving it the camera swings round in front
// of the ship, in slow motion, as it falls away behind.
const SWING_S = 0.8;
const HOLD_S = 2.6;
const SLOW_MO = 0.2;
const X_AXIS = new THREE.Vector3(1, 0, 0);
// the Sun's glare at each world: smaller the further out
// the journey bar's stops: each one's colour, and size
const DOT: Record<string, [string, number]> = {
    earth: ["#60a5fa", 8],
    moon: ["#d4d4d4", 5],
    mars: ["#f0845a", 6],
    jupiter: ["#d8b48c", 11],
    saturn: ["#e8d4a2", 10],
    uranus: ["#a5e9f0", 8],
    neptune: ["#5b8def", 8],
    pluto: ["#d9c4a8", 5],
    sun: ["#fbbf24", 12],
    blackhole: ["#000000", 10],
};
const GLARE: Record<string, number> = { earth: 300, moon: 300, mars: 230, jupiter: 130, saturn: 100, uranus: 75, neptune: 60, pluto: 45, sun: 0, blackhole: 22 };
const POWER_NAME: Record<Power, string> = { star: "Invincible", boost: "Boost" };
// Today's real asteroids, from NASA (app/api/space-today)
type Neo = { name: string; d: number; v: number; ld: number; hazardous: boolean };
const neoLabel = (n: Neo) => `${n.name} · ≈${n.d} m · ${n.v} km/s${n.hazardous ? " · potentially hazardous" : ""}`;
type Hud = { dodged: Neo[]; hitBy: Neo | null; coming: Neo | null; daily: boolean; score: number; shields: number; speed: number; best: number; phase: Phase; hitAt: number; newBest: boolean; shieldAt: number; power: Power | null; powerLeft: number; leg: number };

export default function AsteroidRun({ onExit, onFlight }: { onExit: () => void; onFlight?: () => void }) {
    const mount = useRef<HTMLDivElement>(null);
    // where the ship is steering while the pointer is locked (there's no pointer then)
    const sight = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<Hud>({ dodged: [], hitBy: null, coming: null, daily: false, score: 0, shields: SHIELDS, speed: 0, best: 0, phase: "ready", hitAt: 0, newBest: false, shieldAt: 0, power: null, powerLeft: 0, leg: -1 });
    const [muted, setMutedState] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [noGl, setNoGl] = useState(false);
    const start = useRef<(daily?: boolean) => void>(() => {});
    // the last run, as the server replays it: its seed, day, tape and today's asteroids
    const [record, setRecord] = useState<{ seed: number; day: string | null; tape: string; neos: RunNeo[]; token?: string } | null>(null);
    // the launch buttons lock the pointer too, when clicked with a mouse
    const lock = useRef<(at: { x: number; y: number }) => void>(() => {});
    // today's asteroids, and the one passing now (its caption)
    const [neos, setNeos] = useState<Neo[] | null>(null);
    const [passing, setPassing] = useState<{ neo: Neo; at: number } | null>(null);
    // a line on the pass round the Earth ("Earth ahead"), for a few seconds
    const [note, setNote] = useState<{ text: string; at: number } | null>(null);
    // the slow-motion shot from the front: bars top and bottom, like a film
    const [cinema, setCinema] = useState(false);
    useEffect(() => {
        if (!note) return;
        const id = window.setTimeout(() => setNote(null), 3500);
        return () => window.clearTimeout(id);
    }, [note]);
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
        // (no 3D graphics in this browser: say so, rather than crash)
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, powerPreference: "high-performance" });
        } catch (e) {
            reportError("run", "no-webgl", e);
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
        // far rocks come out of the dark
        scene.fog = new THREE.Fog(0x000000, 70, 185);
        // (seeing far: the Earth, the Moon and the Sun on the pass round the Earth)
        const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 6000);
        camera.position.set(0, 1.4, 7.5);
        let ready = false;
        const manager = new THREE.LoadingManager(() => {
            ready = true;
            setLoaded(true);
        });
        // (a stalled download mustn't leave it on the loading screen: after a
        // while it opens anyway, and anything late appears when it arrives;
        // and it's reported, with what was still loading)
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
            if (!ready) reportError("run", "stuck-loading", `still loading: ${[...waiting].join(", ") || "?"}`);
            setLoaded(true);
        }, 12_000);
        const loader = new THREE.TextureLoader(manager);

        // The sky: the real one, the Milky Way across the way ahead. It is
        // so far off that flying doesn't move it.
        const sky = skyTexture(renderer, loader);
        scene.background = sky;
        scene.backgroundIntensity = 0.7;
        scene.backgroundRotation.set(2.503, 0.244, -3.006);
        const stars = starPoints(350, manager);
        alignStars(stars, scene.backgroundRotation);
        (stars.material as THREE.ShaderMaterial).uniforms.uScale.value = renderer.getPixelRatio();
        scene.add(stars);

        // Light: the sun, hard, from over the right shoulder; a faint cold
        // glow from the other side; and reflections of the sun for the ship
        const SUN = new THREE.Vector3(6, 7, 5).normalize();
        scene.add(new THREE.AmbientLight(0x8090c0, 0.08));
        const SUNLIGHT = new THREE.Color(0xfff4e6);
        const SUN_WARM = new THREE.Color(0xffa04a);
        const sun = new THREE.DirectionalLight(SUNLIGHT, 3.4);
        sun.position.copy(SUN);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x9fb8ff, 0.35);
        rim.position.set(-6, -3, -8);
        scene.add(rim);
        const env = spaceEnvironment(renderer, SUN);
        scene.environment = env.texture;
        // The Earth: for the opening flyby, and the pass round it in the run.
        // Lit from ahead and above at first, so going round it crosses the
        // night side and its city lights and comes back into the sunrise. Its
        // pictures load quietly in the background, not holding up the game
        // (the tour's worlds come in lit: the sun over the ship's shoulder, behind
        // it; going round, each turns through its night side and back to day)
        const SUN0 = new THREE.Vector3(0.35, 0.5, -0.8).normalize();
        const TOUR_SUN = new THREE.Vector3(0.45, 0.55, 0.7).normalize();
        const earthSun = SUN0.clone();
        const earthFx = buildEarth(renderer, EARTH_R, earthSun);
        earthFx.group.visible = false;
        scene.add(earthFx.group);
        // What goes round with the sky: the Moon, out beyond, and the Sun's
        // glare (both rise and set as the ship goes round, and the glare goes
        // behind the Earth at sunset); and a few satellites, crossing the globe
        const beyond = new THREE.Group();
        beyond.visible = false;
        scene.add(beyond);
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(26, 48, 32),
            new THREE.MeshStandardMaterial({ map: loadTexture(renderer, new THREE.TextureLoader(), "planet-moon.jpg"), roughness: 1, metalness: 0, fog: false }),
        );
        (moon.material as THREE.MeshStandardMaterial).transparent = true;
        moon.position.set(-380, 260, -820);
        beyond.add(moon);
        const sunGlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,250,235,1)", "rgba(255,190,110,0)"), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
        sunGlare.position.copy(TOUR_SUN).multiplyScalar(1600);
        sunGlare.scale.setScalar(300);
        beyond.add(sunGlare);
        const satMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,1)", "rgba(190,215,255,0)"), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true });
        const sats = Array.from({ length: 5 }, (_, i) => {
            const pivot = new THREE.Group();
            pivot.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            const s = new THREE.Sprite(satMat);
            s.scale.setScalar(0.3);
            s.position.set(EARTH_R * (1.07 + i * 0.025), 0, 0);
            pivot.add(s);
            earthFx.group.add(pivot);
            return { pivot, speed: 0.2 + Math.random() * 0.3 };
        });
        // the worlds past the Earth, each made (its pictures fetched) when the one before it comes in
        const worlds: (Stop | null)[] = TOUR.map(() => null);
        const worldAt = (i: number) => {
            if (i <= 0 || i >= TOUR.length) return null;
            if (!worlds[i]) {
                const w = buildStop(renderer, TOUR[i].key, TOUR[i].r, earthSun);
                w.group.visible = false;
                scene.add(w.group);
                worlds[i] = w;
            }
            return worlds[i];
        };

        // Dust, streaking past: the only thing near enough to show the speed
        const DUST = 420;
        const dustPos = new Float32Array(DUST * 6);
        const dustCol = new Float32Array(DUST * 6);
        const placeDust = (i: number, z: number) => {
            const x = (Math.random() - 0.5) * 60;
            const y = (Math.random() - 0.5) * 36;
            dustPos.set([x, y, z, x, y, z], i * 6);
        };
        for (let i = 0; i < DUST; i++) {
            placeDust(i, FAR + Math.random() * (12 - FAR));
            const b = 0.35 + Math.random() * 0.4;
            dustCol.set([b, b * 1.04, b * 1.12, 0, 0, 0], i * 6);
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
        dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
        const dust = new THREE.LineSegments(dustGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        dust.frustumCulled = false;
        scene.add(dust);

        // The ship: a smooth hull, swept wings with some thickness, fins, a
        // dark glass canopy, and an engine burning blue
        const ship = new THREE.Group();
        const hullMat = new THREE.MeshPhysicalMaterial({ color: 0xe6eaef, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.18 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, emissive: 0x0d9488, emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.35 });
        const hullProfile = [
            [0, -1.05],
            [0.07, -0.92],
            [0.17, -0.62],
            [0.26, -0.2],
            [0.3, 0.3],
            [0.29, 0.72],
            [0.23, 0.92],
            [0, 0.92],
        ].map(([r, y]) => new THREE.Vector2(r, y));
        const hullGeo = new THREE.LatheGeometry(hullProfile, 28);
        hullGeo.rotateX(Math.PI / 2);
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.scale.set(1, 0.8, 1);
        ship.add(hull);
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, -0.45);
        wingShape.lineTo(1.25, 0.5);
        wingShape.lineTo(1.25, 0.62);
        wingShape.lineTo(0, 0.62);
        wingShape.lineTo(-1.25, 0.62);
        wingShape.lineTo(-1.25, 0.5);
        wingShape.closePath();
        const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2 });
        wingGeo.rotateX(Math.PI / 2);
        wingGeo.translate(0, 0.02, 0);
        const wings = new THREE.Mesh(wingGeo, new THREE.MeshPhysicalMaterial({ color: 0xb4bcc8, metalness: 0.55, roughness: 0.35, clearcoat: 0.6 }));
        ship.add(wings);
        [-1, 1].forEach((sgn) => {
            const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.5), accentMat);
            tip.position.set(1.22 * sgn, 0.08, 0.4);
            ship.add(tip);
        });
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.5), accentMat);
        fin.position.set(0, 0.26, 0.55);
        ship.add(fin);
        const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshPhysicalMaterial({ color: 0x0b1726, metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2 }),
        );
        canopy.scale.set(1, 0.75, 1.9);
        canopy.position.set(0, 0.14, -0.15);
        ship.add(canopy);
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.26, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a3f47, metalness: 0.9, roughness: 0.4, side: THREE.DoubleSide }));
        nozzle.rotation.x = Math.PI / 2;
        nozzle.position.set(0, 0, 1.0);
        ship.add(nozzle);
        // the exhaust: a white-hot core in a blue plume, and its glow
        const flameMat = new THREE.MeshBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
        const flame = new THREE.Group();
        const plume = new THREE.Mesh(new THREE.ConeGeometry(0.19, 1.1, 16, 1, true), flameMat);
        const core = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        // (a cone's point is its +y end: turned so that trails behind)
        plume.position.y = 0.55;
        core.position.y = 0.3;
        flame.add(plume, core);
        flame.rotation.x = Math.PI / 2;
        flame.position.set(0, 0, 1.12);
        ship.add(flame);
        const glowTex = glowTexture("rgba(160,215,255,1)", "rgba(60,140,255,0)");
        const engineGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        engineGlow.scale.setScalar(1.1);
        engineGlow.position.set(0, 0, 1.15);
        ship.add(engineGlow);
        const engineLight = new THREE.PointLight(0x7cc8ff, 2.5, 6);
        engineLight.position.set(0, 0, 1.4);
        ship.add(engineLight);
        scene.add(ship);

        // The rocks, reused as they pass
        const rockGeos = [11, 23, 37, 52, 67, 81, 94, 106].map(rockGeometry);
        const rockMat = rockMaterial();
        type Rock = { mesh: THREE.Mesh; r: number; spin: THREE.Vector3; live: boolean; neo?: Neo };
        const rocks: Rock[] = [];
        for (let i = 0; i < ROCKS; i++) {
            const mesh = new THREE.Mesh(rockGeos[i % rockGeos.length], rockMat);
            mesh.visible = false;
            scene.add(mesh);
            rocks.push({ mesh, r: 1, spin: new THREE.Vector3(), live: false });
        }
        // Today's field brings today's real asteroids (NASA's list of those
        // passing Earth today), one after another, each sized from its real
        // diameter; the potentially hazardous ones glow red
        const hazardMat = rockMaterial();
        hazardMat.emissive.set(0x991b1b);
        hazardMat.emissiveIntensity = 0.8;
        const named: Rock[] = [];
        for (let i = 0; i < 8; i++) {
            const mesh = new THREE.Mesh(rockGeos[(i * 3) % rockGeos.length], rockMat);
            mesh.visible = false;
            scene.add(mesh);
            named.push({ mesh, r: 1, spin: new THREE.Vector3(), live: false });
        }
        let todays: Neo[] = [];
        // the ones this run was given (today's field)
        let runNeos: Neo[] = [];
        let dodged: Neo[] = [];
        let hitBy: Neo | null = null;
        fetch("/api/space-today")
            .then((r) => r.json())
            .then((d: { asteroids?: Neo[] | null }) => {
                todays = Array.isArray(d?.asteroids) ? d.asteroids.slice(0, 8) : [];
                setNeos(todays);
            })
            .catch(() => setNeos([]));
        // one of them coming (the run puts it where it goes): its look, sized
        // from its real diameter, red if potentially hazardous
        const styleNamed = (i: number) => {
            const n = runNeos[i];
            const r = named[i];
            if (!n || !r) return;
            r.neo = n;
            r.mesh.material = n.hazardous ? hazardMat : rockMat;
            r.mesh.scale.setScalar(neoScale(n.d));
            setPassing({ neo: n, at: Date.now() });
        };
        // The fragments: small glowing gems
        const fragMat = new THREE.MeshStandardMaterial({ color: 0x99f6e4, emissive: 0x2dd4bf, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.2, flatShading: true });
        const fragGeo = new THREE.OctahedronGeometry(0.42);
        type Frag = { mesh: THREE.Mesh; live: boolean };
        const frags: Frag[] = [];
        const fragGlow = new THREE.SpriteMaterial({ map: glowTexture("rgba(94,234,212,1)", "rgba(45,212,191,0)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 });
        for (let i = 0; i < FRAGS; i++) {
            const mesh = new THREE.Mesh(fragGeo, fragMat);
            const glow = new THREE.Sprite(fragGlow);
            glow.scale.setScalar(2.2);
            mesh.add(glow);
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
        let shieldAt = 0;
        // The run itself (run-sim.ts): the rocks, fragments, rings, power-ups
        // and today's asteroids, where and when, from a seeded simulation;
        // on today's field it's seeded by the date, so everyone flies the same
        // one. This draws it (the dust, the spin and the flicker are its own)
        let daily = false;

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
        // each glowing softly in its colour
        const halo = (g: THREE.Group, inner: string, outer: string, size: number) => {
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(inner, outer), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75 }));
            sprite.scale.setScalar(size);
            g.add(sprite);
        };
        halo(starPickup, "rgba(253,224,71,1)", "rgba(245,158,11,0)", 3);
        halo(arrowPickup, "rgba(216,180,254,1)", "rgba(168,85,247,0)", 3);
        halo(shieldRing, "rgba(125,211,252,1)", "rgba(56,189,248,0)", 3.4);
        const pickups: Record<Power, THREE.Group> = { star: starPickup, boost: arrowPickup };
        // the ship's glow while one runs
        const auraMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
        const aura = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16), auraMat);
        aura.scale.set(1.25, 0.7, 1.35);
        aura.visible = false;
        ship.add(aura);
        let baseFov = 62;

        // ---- the run ---------------------------------------------------------
        let phase: Phase = "ready";
        let sim: Run | null = null;
        let seed = 0;
        let runDay: string | null = null;
        // The open field's seed comes from the server, signed (lib/run-seed.ts),
        // fetched ahead so a run never waits for it; the post carries it back
        let dealt: { seed: number; token: string } | null = null;
        let runToken: string | undefined;
        const fetchSeed = () =>
            fetch("/api/run-seed?game=run", { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { seed?: unknown; token?: unknown } | null) => {
                    if (d && typeof d.seed === "number" && typeof d.token === "string") dealt = { seed: d.seed, token: d.token };
                })
                .catch(() => {});
        fetchSeed();
        let tape: number[][] = [];
        let current = sample(0, 0, false, 0, 0);
        let acc = 0;
        // the field's speed as drawn: the run's while it's on, easing off after
        let speed = 14;
        let shake = 0;
        let newBest = false;
        const vel = { x: 0, y: 0 };
        const shipPos = { x: 0, y: 0 };
        const powerNow = (): Power | null => (phase === "playing" && sim ? sim.power : null);

        // how far along the journey, for its bar: each stop at a whole number,
        // -1 the launch and TOUR.length open space past the last
        const journey = (s: Run) => {
            const { index: i, stage, t } = s.tour;
            if (stage === "done") return TOUR.length;
            if (stage === "in") return i - 0.5 + 0.5 * Math.min(1, t / TOUR_IN);
            if (stage === "round") return i;
            if (stage === "out") return i + 0.1 * Math.min(1, t / TOUR_OUT);
            const from = i === 0 ? -1 : i - 0.9;
            return from + (i - 0.5 - from) * Math.min(1, t / (i === 0 ? TOUR_FIRST : TOUR_GAP));
        };
        const pushHud = () => {
            const s = sim;
            const power = powerNow();
            setHud({
                dodged: dodged.slice(),
                hitBy,
                coming: named.find((r) => r.live)?.neo ?? null,
                daily,
                score: s ? runScore(s) : 0,
                shields: s ? s.shields : SHIELDS,
                speed: Math.round(speed * (power === "boost" ? 2.2 : 1) * 36),
                best,
                phase,
                hitAt: s && phase === "playing" && s.invulnerable > 0.9 ? Date.now() : 0,
                newBest,
                shieldAt,
                power,
                powerLeft: s ? s.powerLeft : 0,
                leg: s ? journey(s) : -1,
            });
        };

        const begin = (asDaily = daily) => {
            daily = asDaily;
            runDay = daily ? todayKey() : null;
            runNeos = daily ? todays.slice(0, 8) : [];
            // (without one, offline say, it flies on a seed of its own, which the board can't check)
            const d = daily ? null : dealt;
            if (!daily) {
                dealt = null;
                fetchSeed();
            }
            seed = d ? d.seed : (Math.random() * 4294967296) >>> 0;
            runToken = d?.token;
            sim = newRun(seed, runDay, runNeos.map((n) => ({ d: n.d, v: n.v, h: n.hazardous })));
            tape = [];
            acc = 0;
            [...rocks, ...named].forEach((r) => {
                r.live = false;
                r.mesh.visible = false;
                r.neo = undefined;
                r.mesh.material = rockMat;
            });
            frags.forEach((f) => ((f.live = false), (f.mesh.visible = false)));
            shieldRing.visible = false;
            starPickup.visible = arrowPickup.visible = false;
            aura.visible = false;
            resetPass();
            dodged = [];
            hitBy = null;
            shieldAt = 0;
            newBest = false;
            phase = "playing";
            speed = sim.speed;
            placeSight();
            setEngine(0.05, 0.3);
            pushHud();
        };
        // ---- the flyby -------------------------------------------------------
        // The first launch of a visit opens like a film: the ship loops once
        // round the Earth, the camera out in space, then comes back round to
        // where the run starts and heads off into the field as the camera
        // swings in behind it. Any key, click or tap skips it. Scenery only:
        // the run (and its simulation) starts after it.
        let intro: { t: number; daily: boolean } | null = null;
        const launch = (asDaily = daily) => {
            if (phase === "playing" || phase === "intro") return;
            if (!flownBy && !reduce && earthFx.ready()) {
                flownBy = true;
                phase = "intro";
                intro = { t: 0, daily: asDaily };
                [...rocks, ...named, ...frags].forEach((r) => (r.mesh.visible = false));
                shieldRing.visible = starPickup.visible = arrowPickup.visible = false;
                resetPass();
                earthFx.setScale(1);
                earthFx.setAlpha(1);
                earthFx.group.position.set(0, -ORBIT_R, 0);
                earthFx.group.visible = true;
                dust.visible = false;
                setEngine(0.05, 0.25);
                pushHud();
                return;
            }
            begin(asDaily);
        };
        const skipIntro = () => {
            if (intro) intro.t = Math.max(intro.t, ORBIT_S + SETTLE_S);
        };
        const finishIntro = () => {
            const d = intro ? intro.daily : daily;
            intro = null;
            earthFx.group.visible = false;
            dust.visible = true;
            chaseCam.set(0, 1.4, 7.5);
            ship.up.set(0, 1, 0);
            ship.rotation.set(0, 0, 0);
            begin(d);
        };
        // the run's camera: where the chase has it, and the swing round in front
        const chaseCam = camera.position.clone();
        const camLook = new THREE.Vector3();
        const arcCam = new THREE.Vector3();
        const shipAt = new THREE.Vector3();
        const camFrom = new THREE.Vector3();
        const lookFrom = new THREE.Vector3();
        const radial = new THREE.Vector3();
        const along = new THREE.Vector3();
        const wide = new THREE.Vector3();
        const chase = new THREE.Vector3();
        const lookWide = new THREE.Vector3();
        const lookChase = new THREE.Vector3();
        const upNow = new THREE.Vector3();
        const flyby = (dt: number) => {
            if (!intro) return;
            intro.t += dt;
            const t = intro.t;
            earthFx.update(dt);
            const cy = earthFx.group.position.y;
            if (t < ORBIT_S) {
                // once round, easing in and out, ending where the run begins
                const u = t / ORBIT_S;
                const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
                const th = -2 * Math.PI * (1 - e);
                const c = Math.cos(th);
                const sn = Math.sin(th);
                radial.set(0, c, -sn);
                along.set(0, -sn, -c);
                ship.position.set(0, cy, 0).addScaledVector(radial, ORBIT_R);
                // nose along the orbit, back to the Earth below
                ship.up.copy(radial);
                ship.lookAt(ship.position.x - along.x, ship.position.y - along.y, ship.position.z - along.z);
                // the camera: wide from the side at first, then in behind the
                // ship, riding along over the horizon for the rest of the loop
                wide.set(40, cy + 10, 26);
                lookWide.set(0, cy, 0).lerp(ship.position, 0.7);
                chase.copy(ship.position).addScaledVector(radial, 5).addScaledVector(along, -9).add(new THREE.Vector3(2.6, 0, 0));
                // (looking down toward the horizon: the Earth's curve fills the lower frame, the ship above it)
                lookChase.copy(ship.position).addScaledVector(along, 12).addScaledVector(radial, -16);
                const w = Math.min(1, Math.max(0, (u - 0.15) / 0.3));
                const ws = w * w * (3 - 2 * w);
                camera.position.lerpVectors(wide, chase, ws);
                // (never close enough to the ground for the map to blur)
                const off = camera.position.clone().sub(new THREE.Vector3(0, cy, 0));
                if (off.length() < ORBIT_R + 3) camera.position.set(0, cy, 0).addScaledVector(off.normalize(), ORBIT_R + 3);
                lookFrom.lerpVectors(lookWide, lookChase, ws);
                upNow.set(0, 1, 0).lerp(radial, ws).normalize();
                camera.up.copy(upNow);
                camera.lookAt(lookFrom);
                camFrom.copy(camera.position);
                setEngine(0.05, 0.25 + u * 0.2);
            } else {
                // off into the field: the camera settles behind, the Earth drops away
                const k = Math.min(1, (t - ORBIT_S) / SETTLE_S);
                const ease = k * k * (3 - 2 * k);
                ship.up.set(0, 1, 0);
                ship.position.set(0, 0, 0);
                ship.rotation.set(0, 0, 0);
                earthFx.group.position.y = -ORBIT_R - ease * ease * 80;
                camera.position.lerpVectors(camFrom, new THREE.Vector3(0, 1.4, 7.5), ease);
                camera.up.set(0, 1, 0);
                camera.lookAt(lookFrom.lerp(new THREE.Vector3(0, 0, -20), Math.min(1, ease * 1.5)));
                dust.visible = k > 0.3;
                if (k >= 1) finishIntro();
            }
        };
        // ---- the tour past the worlds ----------------------------------------
        // Drawn from the run's own tour (run-sim.ts): where the world is, how far
        // round it the run has gone, its fade in and out. The camera's swing
        // leaving orbit, and the slow motion, run in real time.
        const skyBase = new THREE.Quaternion().setFromEuler(scene.backgroundRotation);
        const qTurn = new THREE.Quaternion();
        const where = new THREE.Vector3();
        const farIn = new THREE.Vector3();
        const round = new THREE.Vector3();
        const out = new THREE.Vector3();
        // which world is on screen (-1: none)
        let shown = -1;
        // how far the camera has tilted down to take the world in
        let passWeight = 0;
        // how fast the run goes: 1, or slow motion for the shot leaving orbit
        let timeScale = 1;
        // leaving orbit, in real time: the camera's swing round the ship (0 behind, pi in front)
        let swing: { t: number; phi: number } | null = null;
        let filmBars = false;
        const bars = (on: boolean) => {
            if (on !== filmBars) {
                filmBars = on;
                setCinema(on);
            }
        };
        const smooth = (x: number) => x * x * (3 - 2 * x);
        const say = (text: string) => setNote({ text, at: Date.now() });
        const title = (name: string) => name[0].toUpperCase() + name.slice(1);
        // how far round the world: the ground under the ship, the sun on it, and the sky
        const turnWorld = (g: THREE.Object3D | null, a: number) => {
            if (g) g.rotation.x = a;
            earthSun.copy(shown === -1 ? SUN0 : TOUR_SUN).applyAxisAngle(X_AXIS, a);
            qTurn.setFromAxisAngle(X_AXIS, a);
            beyond.quaternion.copy(qTurn);
            scene.backgroundRotation.setFromQuaternion(qTurn.clone().multiply(skyBase));
            alignStars(stars, scene.backgroundRotation);
        };
        // its path: first seen far ahead, a little left; under the ship going
        // round; falling away behind as it's left
        const pathOf = (i: number) => {
            const w = TOUR[i];
            const d = 2600 + w.r * 2;
            farIn.set(-0.26 * d, -0.06 * d, -d);
            round.set(0, -(w.r + w.alt), -20);
            out.set(0.25 * (w.r + w.alt), -(w.r + w.alt) - 140, 900 + w.r * 2);
        };
        // the ship in the Sun's light, going round it: warmer, and brighter
        const warmth = (k: number) => {
            sun.color.copy(SUNLIGHT).lerp(SUN_WARM, k * 0.75);
            sun.intensity = 3.4 + k * 1.6;
        };
        const hideTour = () => {
            if (shown === 0) earthFx.group.visible = false;
            else if (shown > 0) worlds[shown]!.group.visible = false;
            beyond.visible = false;
            warmth(0);
            shown = -1;
            passWeight = 0;
            turnWorld(null, 0);
        };
        const resetPass = () => {
            hideTour();
            swing = null;
            timeScale = 1;
            bars(false);
        };
        // what the tour says happened
        const onTour = (stage: TourStage, i: number) => {
            if (stage === "done") say("Into deep space · on and on");
            if (i >= TOUR.length) return;
            if (stage === "in") {
                worldAt(i + 1);
                const key = TOUR[i].key;
                say(key === "sun" ? "Back in toward the Sun" : key === "blackhole" ? "A black hole ahead · keep clear of the disk" : `${title(TOUR[i].name)} ahead`);
            } else if (stage === "round") say(`In orbit · once round ${TOUR[i].name}`);
            else if (stage === "out") {
                swing = { t: 0, phi: 0 };
                say(`Once round · leaving ${TOUR[i].name}`);
            }
        };
        // the world, where the tour has it
        const drawTour = (s: Run, dt: number) => {
            const tr = s.tour;
            const i = tr.index;
            const on = (tr.stage === "in" || tr.stage === "round" || tr.stage === "out") && i < TOUR.length;
            const body = !on ? null : i === 0 ? earthFx : worldAt(i);
            if (!body || !body.ready()) {
                if (shown !== -1) hideTour();
                return;
            }
            if (shown !== i) {
                hideTour();
                shown = i;
            }
            const w = TOUR[i];
            pathOf(i);
            let alpha = 1;
            let angle = 0;
            if (tr.stage === "in") {
                const p = Math.min(1, tr.t / TOUR_IN);
                where.lerpVectors(farIn, round, smooth(p));
                alpha = smooth(Math.min(1, p / 0.35));
                passWeight = smooth(p);
            } else if (tr.stage === "round") {
                where.copy(round);
                angle = tr.dist / (w.r + w.alt);
                passWeight = 1;
            } else {
                const q = Math.min(1, tr.t / TOUR_OUT);
                where.lerpVectors(round, out, smooth(q));
                angle = Math.PI * 2;
                alpha = 1 - smooth(Math.max(0, (q - 0.55) / 0.45));
                passWeight = 1 - smooth(q);
            }
            if (i === 0) earthFx.setScale(w.r / EARTH_R);
            body.group.position.copy(where);
            body.group.visible = true;
            body.setAlpha(alpha);
            body.update(dt);
            if (i === 0) sats.forEach((sat) => (sat.pivot.rotation.z += dt * sat.speed));
            beyond.visible = true;
            beyond.position.copy(where);
            moon.visible = i === 0;
            (moon.material as THREE.MeshStandardMaterial).opacity = alpha;
            sunGlare.scale.setScalar(GLARE[w.key] ?? 100);
            warmth(w.key === "sun" ? alpha : 0);
            (sunGlare.material as THREE.SpriteMaterial).opacity = alpha;
            turnWorld(body.group, angle);
        };
        // leaving orbit: the camera round to the front of the ship and on round
        // to behind again; the run slows to a fifth while it's in front
        const updateSwing = (realDt: number) => {
            if (!swing) return;
            swing.t += realDt;
            const t = swing.t;
            swing.phi =
                t < SWING_S ? Math.PI * smooth(t / SWING_S)
                : t < SWING_S + HOLD_S ? Math.PI
                : t < 2 * SWING_S + HOLD_S ? Math.PI * (1 + smooth((t - SWING_S - HOLD_S) / SWING_S))
                : 0;
            timeScale = 1 - (1 - SLOW_MO) * ((1 - Math.cos(swing.phi)) / 2);
            bars(swing.phi > 0.05 && swing.phi < Math.PI * 2 - 0.05);
            if (t >= 2 * SWING_S + HOLD_S) {
                swing = null;
                timeScale = 1;
                bars(false);
            }
        };
        start.current = launch;
        const end = () => {
            phase = "over";
            // (back to full speed at once, the camera behind; the world stays where it was)
            swing = null;
            timeScale = 1;
            bars(false);
            // the pointer back, for the buttons and the board
            unlockPointer();
            const s = sim ? runScore(sim) : 0;
            trackEvent("asteroid_run_over", { score: s, seconds: Math.round(sim?.time ?? 0) });
            if (s > best) {
                best = s;
                newBest = true;
                try {
                    localStorage.setItem(BEST_KEY, String(s));
                } catch {
                    /* ignore */
                }
            }
            if (sim) setRecord({ seed, day: runDay, tape: encodeTape(tape, TAPE_DELTA), neos: sim.neos, token: runToken });
            aura.visible = false;
            sfxOver();
            stopEngine();
            pushHud();
        };
        // what the run says happened: the sounds, flashes and captions
        const handle = (events: RunEvent[]) => {
            for (const e of events) {
                if (e.kind === "hit") {
                    if (e.neo !== null) hitBy = runNeos[e.neo] ?? null;
                    shake = reduce ? 0 : 0.5;
                    sfxHit();
                    pushHud();
                } else if (e.kind === "smash") {
                    shake = reduce ? 0 : 0.15;
                    sfxSmash();
                } else if (e.kind === "fragment") sfxCollect();
                else if (e.kind === "shield") {
                    shieldAt = Date.now();
                    sfxShield();
                    pushHud();
                } else if (e.kind === "power") {
                    aura.visible = true;
                    if (e.power === "star") sfxStar();
                    else sfxBoost();
                    pushHud();
                } else if (e.kind === "powerEnd") {
                    aura.visible = false;
                    pushHud();
                } else if (e.kind === "neo") styleNamed(e.index);
                else if (e.kind === "passed") {
                    const n = runNeos[e.neo];
                    if (n) dodged.push(n);
                } else if (e.kind === "tour") onTour(e.stage, e.index);
                else if (e.kind === "over") end();
            }
        };
        // a rock where the run has it; one just come gets a spin of its own
        const show = (k: { mesh: THREE.Mesh; spin: THREE.Vector3; live: boolean }, t: Thing) => {
            if (t.live && !k.live) {
                k.mesh.scale.setScalar(t.r / 0.92);
                k.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
                k.spin.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6);
            }
            k.live = t.live;
            k.mesh.visible = t.live;
            if (t.live) k.mesh.position.set(t.x, t.y, t.z);
        };

        // ---- controls --------------------------------------------------------
        const keys = new Set<string>();
        const aim = { x: 0, y: 0, active: false };
        const onKey = (e: KeyboardEvent) => {
            // (not while signing the leaderboard)
            if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
            const k = e.key.toLowerCase();
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
            if (e.type === "keydown") {
                if (phase === "intro") {
                    if (k !== "m") skipIntro();
                } else if ((k === " " || k === "enter") && phase !== "playing") launch();
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
        // With a mouse, a run locks the pointer to the game (Pointer Lock), so
        // steering can't carry it off the field or out of the window; the
        // mouse's movement moves a sight, kept inside the game, that the ship
        // heads for. Esc (the browser's) or the run ending lets it go.
        const locked = () => document.pointerLockElement === renderer.domElement;
        const sightAt = { x: 0, y: 0 };
        const placeSight = () => {
            const s = sight.current;
            if (!s) return;
            s.style.display = locked() && phase === "playing" ? "block" : "none";
            s.style.left = `${sightAt.x}px`;
            s.style.top = `${sightAt.y}px`;
        };
        const lockPointer = () => {
            if (locked() || !renderer.domElement.requestPointerLock) return;
            try {
                const p = renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
                p?.catch?.(() => {});
            } catch {
                /* not allowed here: steer with the pointer as before */
            }
        };
        const unlockPointer = () => {
            if (locked()) document.exitPointerLock();
        };
        document.addEventListener("pointerlockchange", placeSight);
        lock.current = (at) => {
            sightAt.x = at.x;
            sightAt.y = at.y;
            lockPointer();
        };
        let dragFrom: { x: number; y: number; sx: number; sy: number } | null = null;
        const onPointer = (e: PointerEvent) => {
            if (e.pointerType === "mouse") {
                if (e.type === "pointermove") {
                    if (locked()) {
                        const r = renderer.domElement.getBoundingClientRect();
                        // kept a little inside the edges, so the sight stays in view
                        sightAt.x = Math.min(r.right - 14, Math.max(r.left + 14, sightAt.x + e.movementX));
                        sightAt.y = Math.min(r.bottom - 14, Math.max(r.top + 14, sightAt.y + e.movementY));
                        toAim(sightAt.x, sightAt.y);
                        placeSight();
                    } else toAim(e.clientX, e.clientY);
                }
                if (e.type === "pointerdown") {
                    if (phase === "intro") skipIntro();
                    else if (phase !== "playing") launch();
                    if (!locked()) {
                        sightAt.x = e.clientX;
                        sightAt.y = e.clientY;
                    }
                    lockPointer();
                }
                return;
            }
            // touch: drag moves the ship relative to where the finger went down
            if (e.type === "pointerdown") {
                if (phase === "intro") skipIntro();
                else if (phase !== "playing") launch();
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
            const realDt = Math.min(0.05, (now - last) / 1000);
            // the run's own time: slowed for the shot leaving orbit
            const dt = realDt * timeScale;
            last = now;
            if (document.hidden) return;
            const playing = phase === "playing";

            // the run: stepped at its fixed rate, the input sampled into its tape
            if (playing && sim) {
                acc += dt;
                let n = 0;
                while (acc >= DT && n < 24 && phase === "playing" && !sim.over) {
                    const fresh = sim.step % INPUT_EVERY === 0;
                    if (fresh) {
                        let tx = 0;
                        let ty = 0;
                        if (keys.has("arrowleft") || keys.has("a")) tx -= 1;
                        if (keys.has("arrowright") || keys.has("d")) tx += 1;
                        if (keys.has("arrowup") || keys.has("w")) ty += 1;
                        if (keys.has("arrowdown") || keys.has("s")) ty -= 1;
                        current = sample(tx, ty, aim.active, aim.x, aim.y);
                        tape.push(current);
                    }
                    handle(stepRun(sim, fresh ? current : null));
                    acc -= DT;
                    n += 1;
                }
                // (far behind, after a stall: the lost time goes, rather than racing to catch up)
                if (n >= 24) acc = 0;
            }
            const running = phase === "playing" && !!sim;
            const power = powerNow();
            if (running && sim) {
                shipPos.x = sim.ship.x;
                shipPos.y = sim.ship.y;
                vel.x = sim.ship.vx;
                vel.y = sim.ship.vy;
                speed = sim.speed;
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
            ship.visible = !(running && sim && sim.invulnerable > 0 && Math.floor(now / 90) % 2 === 0);
            flame.scale.set(1, 0.7 + Math.random() * 0.4 + speed / 90 + (power === "boost" ? 0.8 : 0), 1);
            flameMat.opacity = 0.55 + Math.random() * 0.3;
            engineGlow.scale.setScalar(1 + Math.random() * 0.2 + (power === "boost" ? 0.6 : 0));

            // the field comes at you
            const dz = speed * dt * (power === "boost" ? 2.2 : 1);
            // the boost widens the view; the aura flickers in its last second
            const fovTo = baseFov + (power === "boost" ? 16 : 0);
            if (Math.abs(camera.fov - fovTo) > 0.05) {
                camera.fov += (fovTo - camera.fov) * Math.min(1, dt * 5);
                camera.updateProjectionMatrix();
            }
            if (power && sim) {
                auraMat.color.set(power === "star" ? 0xfbbf24 : 0xa855f7);
                aura.visible = sim.powerLeft > 1 || Math.floor(now / 110) % 2 === 0;
                aura.rotation.z += dt * 2;
                auraMat.opacity = 0.2 + Math.sin(now / 90) * 0.08;
            } else if (running && sim && sim.grace > 0) {
                // leaving orbit: nothing hits the ship, and a soft blue glow says so
                auraMat.color.set(0x7dd3fc);
                aura.visible = sim.grace > 0.8 || Math.floor(now / 110) % 2 === 0;
                aura.rotation.z += dt * 2;
                auraMat.opacity = 0.14 + Math.sin(now / 140) * 0.05;
            } else aura.visible = false;
            // the dust streaks: longer the faster you go
            const streak = Math.min(12, 0.15 + (dz / Math.max(dt, 0.001)) * 0.045);
            for (let i = 0; i < DUST; i++) {
                const z = dustPos[i * 6 + 2] + dz;
                if (z > 12) placeDust(i, FAR - Math.random() * 30);
                else {
                    dustPos[i * 6 + 2] = z;
                    dustPos[i * 6 + 5] = z - streak;
                }
            }
            dustGeo.attributes.position.needsUpdate = true;
            stars.position.copy(camera.position);

            if (running && sim) {
                // everything where the run has it
                sim.rocks.forEach((t, i) => show(rocks[i], t));
                sim.named.forEach((t, i) => show(named[i], t));
                sim.frags.forEach((t, i) => {
                    const f = frags[i];
                    f.live = t.live;
                    f.mesh.visible = t.live;
                    if (t.live) f.mesh.position.set(t.x, t.y, t.z);
                });
                shieldRing.visible = sim.ring.live;
                if (sim.ring.live) shieldRing.position.set(sim.ring.x, sim.ring.y, sim.ring.z);
                const pk = sim.pickup;
                starPickup.visible = pk.live && pk.kind === "star";
                arrowPickup.visible = pk.live && pk.kind === "boost";
                if (pk.live && pk.kind) pickups[pk.kind].position.set(pk.x, pk.y, pk.z);
            } else {
                // between runs: whatever was coming keeps coming, and goes
                const drift = (o: THREE.Object3D) => {
                    if (!o.visible) return;
                    o.position.z += dz;
                    if (o.position.z > 12) o.visible = false;
                };
                [...rocks, ...named, ...frags].forEach((r) => drift(r.mesh));
                [shieldRing, starPickup, arrowPickup].forEach(drift);
            }
            // turning and glowing, for the look of it
            for (const r of [...rocks, ...named]) {
                if (!r.mesh.visible) continue;
                r.mesh.rotation.x += r.spin.x * dt;
                r.mesh.rotation.y += r.spin.y * dt;
                r.mesh.rotation.z += r.spin.z * dt;
            }
            for (const f of frags) {
                if (!f.mesh.visible) continue;
                f.mesh.rotation.y += dt * 2.4;
                f.mesh.rotation.x += dt * 1.1;
            }
            if (shieldRing.visible) {
                shieldRing.rotation.y += dt * 1.8;
                ringMat.emissiveIntensity = 1.3 + Math.sin(now / 160) * 0.5;
            }
            starPickup.rotation.y += dt * 2.2;
            starPickup.rotation.x += dt * 1.3;
            arrowPickup.rotation.y += dt * 2.2;

            if (phase === "intro") flyby(dt);
            else {
                // the pass round the Earth, some way into a run
                // the tour past the worlds, as the run has it
                updateSwing(realDt);
                if (sim && phase !== "ready") drawTour(sim, dt);
                // the camera follows, a little behind and above (and on the pass,
                // a little higher, tilted down to take the Earth in)
                chaseCam.x += (shipPos.x * 0.55 - chaseCam.x) * Math.min(1, realDt * 4);
                chaseCam.y += (1.4 + passWeight * 1.2 + shipPos.y * 0.45 - chaseCam.y) * Math.min(1, realDt * 4);
                chaseCam.z = 7.5;
                camLook.set(shipPos.x * 0.35, shipPos.y * 0.3 - passWeight * 5, -20);
                const phi = swing ? swing.phi : 0;
                if (phi > 0) {
                    // leaving orbit: round the ship to its front, looking back at it
                    const r = 7.5;
                    arcCam.set(shipPos.x + Math.sin(phi) * r, shipPos.y + 1.2 + Math.sin(phi / 2) * 1.2, Math.cos(phi) * r);
                    const w = Math.min(1, phi / 0.35, (Math.PI * 2 - phi) / 0.35);
                    camera.position.lerpVectors(chaseCam, arcCam, w);
                    camLook.lerp(shipAt.set(shipPos.x, shipPos.y + 0.3, 0), (1 - Math.cos(phi)) / 2);
                } else camera.position.copy(chaseCam);
                if (shake > 0) {
                    camera.position.x += (Math.random() - 0.5) * shake;
                    camera.position.y += (Math.random() - 0.5) * shake;
                    shake = Math.max(0, shake - realDt * 1.4);
                }
                camera.lookAt(camLook);
            }
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
            window.clearTimeout(giveUp);
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            document.removeEventListener("pointerlockchange", placeSight);
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
            earthFx.dispose();
            worlds.forEach((w) => w?.dispose());
            env.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    if (noGl) return <NoWebGL onExit={onExit} title="Asteroid Run" />;
    return (
        <div className="fixed inset-0 z-50 bg-black text-white">
            <div ref={mount} className={`absolute inset-0 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`} aria-label="Asteroid Run: a 3D game" role="application" />
            {/* the sight, while the pointer is locked to the game */}
            <div ref={sight} aria-hidden className="pointer-events-none absolute z-10 hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2">
                <svg viewBox="0 0 28 28" className="h-full w-full" fill="none" strokeLinecap="round">
                    <circle cx="14" cy="14" r="8" stroke="#000" strokeOpacity="0.5" strokeWidth="3.4" />
                    <circle cx="14" cy="14" r="8" stroke="#e2e8f0" strokeWidth="1.6" />
                    <path d="M14 1.5v5M14 21.5v5M1.5 14h5M21.5 14h5" stroke="#e2e8f0" strokeWidth="1.6" />
                    <circle cx="14" cy="14" r="1.6" fill="#fbbf24" />
                </svg>
            </div>
            {!loaded && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-teal-300/80">Fuelling up…</p>
                </div>
            )}
            {/* a red flash when hit */}
            {hud.hitAt > 0 && <div key={`hit-${hud.hitAt}`} className="pointer-events-none absolute inset-0 animate-[arcade-hit_0.5s_ease-out_forwards] bg-rose-500/25" />}
            {/* and a blue one, and a word, when a shield comes back */}
            {hud.shieldAt > 0 && (
                <div key={`shield-${hud.shieldAt}`} className="pointer-events-none absolute inset-0 flex animate-[arcade-hit_1.2s_ease-out_forwards] items-center justify-center bg-sky-400/10">
                    <span className="font-mono text-sm uppercase tracking-[0.3em] text-sky-200">+1 shield</span>
                </div>
            )}

            {/* the slow-motion shot leaving orbit: bars top and bottom, like a film */}
            <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-[9vh] bg-black transition-transform duration-500 ${cinema ? "translate-y-0" : "-translate-y-full"}`} />
            <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-[9vh] bg-black transition-transform duration-500 ${cinema ? "translate-y-0" : "translate-y-full"}`} />

            {/* the flyby: how to skip it */}
            {hud.phase === "intro" && (
                <p className="pointer-events-none absolute inset-x-0 bottom-20 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-400 sm:bottom-8">Click, tap or any key to skip</p>
            )}

            {/* HUD */}
            <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 font-mono text-xs uppercase tracking-[0.2em] transition-opacity duration-500 sm:p-6 ${hud.phase === "intro" ? "opacity-0" : ""}`}>
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

            {/* one of today's real asteroids, coming */}
            {hud.phase === "playing" && passing && (
                <div key={`neo-${passing.at}`} className="pointer-events-none absolute inset-x-0 top-24 flex animate-[arcade-hit_4.5s_ease-in_forwards] justify-center px-4 sm:top-28">
                    <p className={`rounded-full border bg-black/60 px-4 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.15em] backdrop-blur ${passing.neo.hazardous ? "border-rose-400/50 text-rose-200" : "border-sky-300/40 text-sky-100"}`}>
                        Real asteroid, passing Earth today · {neoLabel(passing.neo)}
                    </p>
                </div>
            )}

            {/* the pass round the Earth: where you are */}
            {hud.phase === "playing" && note && (
                <div key={`note-${note.at}`} className="pointer-events-none absolute inset-x-0 top-36 flex animate-[arcade-hit_3.5s_ease-in_forwards] justify-center px-4 sm:top-40">
                    <p className="rounded-full border border-sky-300/30 bg-black/50 px-4 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-sky-100 backdrop-blur">{note.text}</p>
                </div>
            )}

            {/* the journey: every stop, and how far along it the ship is */}
            {(hud.phase === "playing" || hud.phase === "over") && hud.leg >= -1 && (
                <Journey leg={hud.leg} hidden={cinema} />
            )}

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
                <FullscreenButton className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:border-white/30 hover:text-white" />
            </div>

            {/* the title, and game over */}
            {/* a tap or click anywhere (or the button) launches */}
            {(hud.phase === "ready" || hud.phase === "over") && loaded && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="max-w-sm rounded-2xl border border-teal-400/25 bg-black/60 p-6 text-center backdrop-blur-md">
                        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">{hud.phase === "over" ? (hud.daily ? "Run over · today's field" : "Run over") : "Crew arcade · 02"}</p>
                        <h1 className="font-display mt-2 text-3xl font-bold">{hud.phase === "over" ? `${hud.score.toLocaleString()} points` : "Asteroid Run"}</h1>
                        {hud.phase === "over" && hud.newBest && <p className="mt-1 text-sm text-amber-300">A new best!</p>}
                        {hud.phase === "over" && (
                            <div className="pointer-events-auto">
                                {hud.daily ? (
                                    <Board key="daily" game="run-daily" day={record?.day ?? todayKey()} score={hud.score} run={record ?? undefined} title="Today's field" />
                                ) : (
                                    <Board key="all" game="asteroid-run" score={hud.score} run={record ?? undefined} />
                                )}
                            </div>
                        )}
                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                            Dodge the rocks, grab the glowing fragments for points. A blue ring restores a lost shield, a golden star makes you invincible, and a violet arrow boosts you forward. It gets faster the longer you last.
                        </p>
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                            <span className="hidden sm:inline">Arrows / WASD or the mouse · Esc frees the mouse · M to mute</span>
                            <span className="sm:hidden">Drag anywhere to steer</span>
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    start.current(hud.phase === "over" ? undefined : false);
                                    if ((e.nativeEvent as PointerEvent).pointerType === "mouse") lock.current({ x: e.clientX, y: e.clientY });
                                }}
                                className="pointer-events-auto rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-teal-300"
                            >
                                {hud.phase === "over" ? "Fly again" : "Launch"}
                            </button>
                            {/* the same field for everyone today, with today's real asteroids, and its own board */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    start.current(!(hud.phase === "over" && hud.daily));
                                    if ((e.nativeEvent as PointerEvent).pointerType === "mouse") lock.current({ x: e.clientX, y: e.clientY });
                                }}
                                className="pointer-events-auto rounded-full border border-teal-300/40 px-5 py-2.5 text-sm text-teal-200 hover:border-teal-300/70"
                            >
                                {hud.phase === "over" && hud.daily ? "Play the open field" : "Today's field"}
                            </button>
                        </div>
                        {/* the same ship, loose in a field all round it */}
                        {onFlight && (
                            <button type="button" onClick={onFlight} className="pointer-events-auto mt-3 text-xs text-amber-200/90 underline-offset-4 hover:text-amber-100 hover:underline">
                                Try Free flight: fly anywhere →
                            </button>
                        )}
                        {hud.phase !== "over" && !!neos?.length && (
                            <p className="mt-3 text-xs leading-snug text-sky-200/80">
                                Today&apos;s field brings the {neos.length} real asteroids passing Earth today, from NASA
                                {neos.some((n) => n.hazardous) ? `, ${neos.filter((n) => n.hazardous).length} of them potentially hazardous` : ""}.
                            </p>
                        )}
                        {hud.phase === "over" && hud.daily && !!neos?.length && (
                            <p className="mt-3 text-xs leading-snug text-sky-200/90">
                                {hud.dodged.length
                                    ? (() => {
                                          const n = hud.dodged.reduce((a, b) => (b.d > a.d ? b : a));
                                          const more = hud.dodged.length - 1;
                                          return `You got past ${n.name} (≈${n.d} m${n.hazardous ? ", potentially hazardous" : ""}), which passed Earth today at ${n.v} km/s, ${Math.round(n.ld)} times the Moon's distance away${more ? `, and ${more} more of today's ${neos.length}` : ""}.`;
                                      })()
                                    : hud.hitBy
                                      ? `${hud.hitBy.name}, one of today's real asteroids (≈${hud.hitBy.d} m${hud.hitBy.hazardous ? ", potentially hazardous" : ""}), got you. It passed Earth today at ${hud.hitBy.v} km/s, ${Math.round(hud.hitBy.ld)} times the Moon's distance away.`
                                      : hud.coming
                                        ? `${hud.coming.name}, one of today's real asteroids (≈${hud.coming.d} m), was still on its way when your run ended. It passed Earth today at ${hud.coming.v} km/s.`
                                        : `You didn't reach any of today's ${neos.length} real asteroids this time: the first comes 8 seconds in.`}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/** The journey bar: the stops in order, the way already come lit, and the ship. */
function Journey({ leg, hidden }: { leg: number; hidden: boolean }) {
    // launch at the left, open space (after the last stop) at the right
    const x = (p: number) => `${((p + 1) / (TOUR.length + 1)) * 100}%`;
    const next = Math.min(TOUR.length, Math.ceil(leg - 0.05));
    const label = next >= TOUR.length ? "Deep space" : TOUR[next].key === "blackhole" ? "Black hole" : TOUR[next].name[0].toUpperCase() + TOUR[next].name.slice(1);
    return (
        <div aria-hidden className={`pointer-events-none absolute bottom-[4.75rem] left-1/2 w-[min(560px,calc(100%-2.5rem))] -translate-x-1/2 transition-opacity duration-500 md:bottom-7 ${hidden ? "opacity-0" : ""}`}>
            {/* (a dark backing, to read over the Sun) */}
            <div className="absolute -inset-x-4 -inset-y-2 rounded-2xl bg-black/35 backdrop-blur-[2px]" />
            <div className="relative h-4">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
                <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-sky-300/60 transition-[width] duration-100 ease-linear" style={{ width: x(leg) }} />
                {TOUR.map((w, i) => {
                    const [colour, size] = DOT[w.key];
                    const hole = w.key === "blackhole";
                    return (
                        <span
                            key={w.key}
                            className={`absolute top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-500 ${leg >= i - 0.02 ? "opacity-100" : "opacity-45"}`}
                            style={{
                                left: x(i),
                                width: size,
                                height: size,
                                background: colour,
                                boxShadow: hole ? "0 0 0 1.5px #fb923c, 0 0 6px rgba(251,146,60,0.7)" : w.key === "sun" ? "0 0 8px rgba(251,191,36,0.9)" : undefined,
                            }}
                        />
                    );
                })}
                <span className={`absolute top-1/2 -translate-y-1/2 translate-x-1 font-mono text-[12px] leading-none ${leg >= TOUR.length ? "text-sky-200" : "text-neutral-500"}`} style={{ right: 0 }}>
                    ∞
                </span>
                {/* the ship */}
                <svg viewBox="0 0 12 10" className="absolute top-1/2 h-2.5 w-3 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_4px_rgba(125,211,252,0.9)] transition-[left] duration-100 ease-linear" style={{ left: x(Math.min(leg, TOUR.length)) }}>
                    <path d="M12 5 L0 0 L3 5 L0 10 Z" fill="#e0f2fe" />
                </svg>
            </div>
            <p className="relative mt-1 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-300">
                {leg >= TOUR.length ? "Deep space · on and on" : Math.abs(leg - next) < 0.02 ? `Going round ${TOUR[next].name}` : `Next · ${label}`}
            </p>
        </div>
    );
}
