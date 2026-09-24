"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { isMuted, setMuted, sfxArrive, sfxFlyby, sfxHit, sfxLaunch, sfxOver } from "./sound";
import { alignStars, glowTexture, loadTexture, rockGeometry, rockMaterial, skyTexture, starPoints } from "./space";
import { BOUNDS, LEVELS, VMAX, bodyAt, captureRadius, flybyRadius, launch, step, type Body, type Kind, type Level, type Probe } from "./assist-sim";

// Gravity Assist: send a probe from Earth to another world, bending its path
// round the planets on the way. Drag back from anywhere to aim (the further,
// the faster), and let go to launch; the dotted line shows where the first
// stretch will go. Later missions have planets moving round the Sun, and ask
// for flybys on the way. Eight missions, each with up to three stars for
// arriving in few launches. The physics is in assist-sim.ts.

const PROGRESS_KEY = "arcade-assist";
const STARS_KEY = "arcade-assist-stars"; // the total, for the arcade's card
const KMS = 2.2; // the probe's speed, shown in km/s
const FULL_PULL = 0.3; // a pull this much of the screen's shorter side is full power

type Phase = "menu" | "aim" | "flying" | "done";
type Result = { kind: "arrived" | "crashed" | "lost"; body?: string; stars?: number; top?: number };
type Hud = { phase: Phase; level: number; launches: number; power: number; speed: number; result: Result | null; stars: number[]; passed: number };

const NAMES: Record<Kind, string> = { sun: "the Sun", earth: "Earth", moon: "the Moon", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", neptune: "Neptune", rock: "an asteroid" };
const MAPS: Partial<Record<Kind, string>> = {
    earth: "planet-earth.jpg",
    mars: "planet-mars.jpg",
    jupiter: "planet-jupiter.jpg",
    saturn: "planet-saturn.jpg",
    neptune: "planet-neptune.jpg",
};
// each world's air, if it has any to speak of, and its tilt
const AIR: Partial<Record<Kind, [number, number, number, number]>> = {
    earth: [0.35, 0.6, 1, 1],
    neptune: [0.4, 0.7, 1, 0.9],
    jupiter: [0.95, 0.85, 0.7, 0.35],
    saturn: [0.95, 0.88, 0.7, 0.3],
    mars: [1, 0.65, 0.45, 0.35],
};
const TILT: Partial<Record<Kind, number>> = { earth: 0.41, mars: 0.44, jupiter: 0.05, saturn: 0.47, neptune: 0.49, moon: 0.03 };

// the simulation's plane (x across, y up) in the scene: y becomes -z
const toWorld = (x: number, y: number, v = new THREE.Vector3()) => v.set(x, 0, -y);

function loadProgress(): number[] {
    try {
        const s = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]");
        if (Array.isArray(s)) return LEVELS.map((_, i) => Number(s[i]) || 0);
    } catch {
        /* ignore */
    }
    return LEVELS.map(() => 0);
}
const unlocked = (stars: number[], i: number) => i === 0 || stars[i - 1] > 0;

// The glow of a world's air against space: the density of air along each line
// of sight, thinning with height, lit on the side toward the sun
const airFrag = /* glsl */ `
    uniform vec3 uCenter;
    uniform float uR;
    uniform vec3 uSun;
    uniform vec4 uColour;
    varying vec3 vW;
    void main() {
        vec3 rd = normalize(vW - cameraPosition);
        vec3 oc = uCenter - cameraPosition;
        vec3 p = cameraPosition + rd * max(dot(oc, rd), 0.0);
        float h = max(length(p - uCenter) - uR, 0.0);
        float dens = exp(-h / (uR * 0.05));
        float s = dot(normalize(p - uCenter), normalize(uSun - uCenter));
        gl_FragColor = vec4(uColour.rgb * dens * smoothstep(-0.35, 0.25, s) * uColour.a * 1.4, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;
// The Sun: churning granules, darker toward its edge, far brighter than anything else
const sunFrag = /* glsl */ `
    uniform float uTime;
    varying vec3 vP;
    varying vec3 vN;
    varying vec3 vW;
    float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n3(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }
    void main() {
        float mu = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0);
        vec3 p = normalize(vP);
        float g = n3(p * 3.0 + uTime * 0.06) * 0.55 + n3(p * 9.0 - uTime * 0.1) * 0.3 + n3(p * 24.0 + uTime * 0.2) * 0.15;
        vec3 limb = mix(vec3(1.0, 0.3, 0.04), vec3(1.0, 0.72, 0.3), pow(mu, 0.6));
        vec3 c = limb * mix(0.7, 1.35, g * g * 1.4) * (0.45 + 0.55 * pow(mu, 0.5)) * 1.05;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;

export default function GravityAssist({ onExit }: { onExit: () => void }) {
    const mount = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<Hud>({ phase: "menu", level: 0, launches: 0, power: 0, speed: 0, result: null, stars: LEVELS.map(() => 0), passed: 0 });
    const [muted, setMutedState] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const api = useRef<{ open: (i: number) => void; begin: () => void; retry: () => void; next: () => void; menu: () => void }>({ open() {}, begin() {}, retry() {}, next() {}, menu() {} });

    useEffect(() => {
        const el = mount.current;
        if (!el) return;
        let stars = loadProgress();

        // ---- the scene -------------------------------------------------------
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 1, 3000);
        const manager = new THREE.LoadingManager(() => setLoaded(true));
        const loader = new THREE.TextureLoader(manager);

        const sky = skyTexture(renderer, loader);
        scene.background = sky;
        scene.backgroundIntensity = 0.6;
        scene.backgroundRotation.set(2.411, 1.018, 1.482);
        const starField = starPoints(2500, manager);
        alignStars(starField, scene.backgroundRotation);
        (starField.material as THREE.ShaderMaterial).uniforms.uScale.value = renderer.getPixelRatio();
        scene.add(starField);

        const maps = new Map<Kind, THREE.Texture>();
        (Object.keys(MAPS) as Kind[]).forEach((k) => maps.set(k, loadTexture(renderer, loader, MAPS[k]!)));
        const ringTex = loadTexture(renderer, loader, "saturn-ring.png");
        const glowWarm = glowTexture("rgba(255,190,110,1)", "rgba(255,110,20,0)");
        const glowProbe = glowTexture("rgba(220,245,255,1)", "rgba(120,200,255,0)");
        const glowBang = glowTexture("rgba(255,230,190,1)", "rgba(255,110,40,0)");
        const rockGeos = [5, 17, 29, 43].map(rockGeometry);
        const rockMat = rockMaterial();
        const planetGeo = new THREE.SphereGeometry(1, 96, 48);
        const airGeo = new THREE.SphereGeometry(1.25, 64, 32);

        scene.add(new THREE.AmbientLight(0x8090b0, 0.05));
        // when the Sun isn't in a mission, it is off to the left
        const farSun = new THREE.DirectionalLight(0xfff4e6, 3.2);
        farSun.position.set(-0.8, 0.55, 0.25);
        scene.add(farSun);
        const sunLight = new THREE.PointLight(0xfff1e0, 3.6, 0, 0);
        scene.add(sunLight);

        // ---- a mission's worlds ---------------------------------------------
        type Shown = { body: Body; group: THREE.Group; spin?: THREE.Object3D; air?: THREE.ShaderMaterial; ring?: THREE.LineLoop; ringMat?: THREE.LineDashedMaterial };
        let level: Level = LEVELS[0];
        let levelIndex = 0;
        let shown: Shown[] = [];
        const world = new THREE.Group();
        scene.add(world);
        const sunPos = new THREE.Vector3(-1000, 700, -300);
        const tmp = new THREE.Vector3();
        const circle = (r: number, mat: THREE.LineBasicMaterial | THREE.LineDashedMaterial) => {
            const pts = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * r, 0.02, Math.sin((i / 128) * Math.PI * 2) * r));
            const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
            line.computeLineDistances();
            return line;
        };
        const clearWorld = () => {
            world.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.geometry && m.geometry !== planetGeo && m.geometry !== airGeo && !rockGeos.includes(m.geometry)) m.geometry.dispose();
                const mat = m.material as THREE.Material | undefined;
                if (mat && mat !== rockMat) mat.dispose();
            });
            world.clear();
            shown = [];
        };
        const build = (i: number) => {
            clearWorld();
            levelIndex = i;
            level = LEVELS[i];
            const sun = level.bodies.find((b) => b.kind === "sun");
            farSun.visible = !sun;
            sunLight.visible = !!sun;
            if (sun) toWorld(sun.at![0], sun.at![1], sunPos).setY(0);
            else sunPos.set(-1000, 700, -300);
            sunLight.position.copy(sunPos);
            level.bodies.forEach((b, bi) => {
                const group = new THREE.Group();
                const s: Shown = { body: b, group };
                if (b.kind === "rock") {
                    const m = new THREE.Mesh(rockGeos[bi % rockGeos.length], rockMat);
                    m.scale.setScalar(b.r * 1.1);
                    m.rotation.set(bi, bi * 2, bi * 3);
                    group.add(m);
                    s.spin = m;
                } else if (b.kind === "sun") {
                    const m = new THREE.Mesh(
                        planetGeo,
                        new THREE.ShaderMaterial({
                            uniforms: { uTime: { value: 0 } },
                            vertexShader: "varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
                            fragmentShader: sunFrag,
                        }),
                    );
                    m.scale.setScalar(b.r);
                    group.add(m);
                    s.spin = m;
                    // its glow, and the faint corona beyond
                    [
                        [2.4, 1],
                        [3.4, 0.8],
                        [5.5, 0.6],
                        [13, 0.32],
                    ].forEach(([k, o]) => {
                        const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWarm, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o }));
                        g.scale.setScalar(b.r * k);
                        group.add(g);
                    });
                } else {
                    const axis = new THREE.Group();
                    axis.rotation.z = TILT[b.kind] ?? 0;
                    const m = new THREE.Mesh(planetGeo, new THREE.MeshStandardMaterial({ map: maps.get(b.kind), roughness: 1, metalness: 0 }));
                    m.scale.setScalar(b.r);
                    axis.add(m);
                    group.add(axis);
                    s.spin = m;
                    if (b.kind === "saturn") {
                        const inner = b.r * 1.24;
                        const outer = b.r * 2.3;
                        const rg = new THREE.RingGeometry(inner, outer, 160, 1);
                        const uv = rg.getAttribute("uv") as THREE.BufferAttribute;
                        const p = rg.getAttribute("position") as THREE.BufferAttribute;
                        for (let k = 0; k < uv.count; k++) uv.setXY(k, (Math.hypot(p.getX(k), p.getY(k)) - inner) / (outer - inner), 0.5);
                        const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }));
                        ring.rotation.x = -Math.PI / 2;
                        axis.add(ring);
                    }
                    const air = AIR[b.kind];
                    if (air) {
                        const mat = new THREE.ShaderMaterial({
                            uniforms: { uCenter: { value: new THREE.Vector3() }, uR: { value: b.r }, uSun: { value: sunPos }, uColour: { value: new THREE.Vector4(...air) } },
                            vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
                            fragmentShader: airFrag,
                            side: THREE.BackSide,
                            transparent: true,
                            depthWrite: false,
                            blending: THREE.AdditiveBlending,
                        });
                        const a = new THREE.Mesh(airGeo, mat);
                        a.scale.setScalar(b.r);
                        group.add(a);
                        s.air = mat;
                    }
                }
                // the target's capture ring, and the rings of flybys still to make
                if (bi === level.target) group.add(circle(captureRadius(b.r), new THREE.LineDashedMaterial({ color: 0x5eead4, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.7 })));
                if (level.flyby?.includes(bi)) {
                    s.ringMat = new THREE.LineDashedMaterial({ color: 0xfbbf24, dashSize: 0.6, gapSize: 0.8, transparent: true, opacity: 0.6 });
                    s.ring = circle(flybyRadius(b.r), s.ringMat);
                    group.add(s.ring);
                }
                world.add(group);
                // and the path of anything in orbit
                if (b.orbit) {
                    const o = circle(b.orbit.R, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }));
                    toWorld(b.orbit.around[0], b.orbit.around[1], o.position);
                    world.add(o);
                }
                shown.push(s);
            });
            fit();
        };

        // ---- the probe, its path, and the aim --------------------------------
        const probeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowProbe, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        probeGlow.scale.setScalar(2.2);
        probeGlow.visible = false;
        scene.add(probeGlow);
        const bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowBang, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        bang.visible = false;
        scene.add(bang);
        let bangAge = 0;
        const trailMat = new LineMaterial({ color: 0x9fe8ff, linewidth: 2.5, transparent: true, opacity: 0.9, depthWrite: false });
        const ghostMat = new LineMaterial({ color: 0x8090a0, linewidth: 1.5, transparent: true, opacity: 0.35, depthWrite: false });
        const aimMat = new LineMaterial({ color: 0x5eead4, linewidth: 3, transparent: true, opacity: 0.95, depthWrite: false });
        let trail: Line2 | null = null;
        let ghost: Line2 | null = null;
        let aimLine: Line2 | null = null;
        const makeLine = (pts: number[], mat: LineMaterial) => {
            const g = new LineGeometry();
            g.setPositions(pts);
            const l = new Line2(g, mat);
            l.computeLineDistances();
            scene.add(l);
            return l;
        };
        const drop = (l: Line2 | null) => {
            if (!l) return null;
            scene.remove(l);
            l.geometry.dispose();
            return null;
        };
        // the dotted line ahead: where the first stretch of the flight goes
        const DOTS = 60;
        const dotPos = new Float32Array(DOTS * 3);
        const dotCol = new Float32Array(DOTS * 3);
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
        dotGeo.setAttribute("color", new THREE.BufferAttribute(dotCol, 3));
        const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ map: glowProbe, size: 7, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        dots.frustumCulled = false;
        scene.add(dots);

        // ---- play -------------------------------------------------------------
        let phase: Phase = "menu";
        let t = 0;
        let angle = 0;
        let power = 0.55;
        let probe: Probe | null = null;
        let launches = 0;
        let result: Result | null = null;
        let path: number[] = [];
        let fast = false;
        let stepAcc = 0;
        let sinceTrail = 0;
        const pushHud = () =>
            setHud({
                phase,
                level: levelIndex,
                launches,
                power,
                speed: probe ? Math.hypot(probe.vx, probe.vy) * KMS : power * VMAX * KMS,
                result,
                stars: stars.slice(),
                passed: probe ? (level.flyby ?? []).filter((k) => probe!.passed[k]).length : 0,
            });
        // the first aim: straight at the target, at a middling speed
        const aimAtTarget = () => {
            const e = bodyAt(level.bodies[level.start], t);
            const g = bodyAt(level.bodies[level.target], t);
            angle = Math.atan2(g[1] - e[1], g[0] - e[0]);
            power = 0.55;
        };
        const open = (i: number) => {
            build(i);
            phase = "menu";
            probe = null;
            result = null;
            t = 0;
            launches = 0;
            trail = drop(trail);
            ghost = drop(ghost);
            aimAtTarget();
            pushHud();
        };
        const begin = () => {
            phase = "aim";
            result = null;
            pushHud();
        };
        const retry = () => {
            // the last attempt stays, faintly, to learn from
            if (path.length > 6) {
                ghost = drop(ghost);
                ghost = makeLine(path, ghostMat);
            }
            trail = drop(trail);
            path = [];
            probe = null;
            probeGlow.visible = false;
            result = null;
            phase = "aim";
            pushHud();
        };
        const next = () => {
            const n = Math.min(LEVELS.length - 1, levelIndex + 1);
            open(n);
            begin();
        };
        const fire = () => {
            if (phase !== "aim") return;
            probe = launch(level, angle, power, t);
            launches += 1;
            phase = "flying";
            path = [];
            trail = drop(trail);
            aimLine = drop(aimLine);
            probeGlow.visible = true;
            stepAcc = 0;
            sfxLaunch(power);
            pushHud();
        };
        const finish = () => {
            const p = probe!;
            const hit = p.hit >= 0 ? level.bodies[p.hit] : null;
            if (p.state === "arrived") {
                const s = launches <= level.par ? 3 : launches <= level.par + 2 ? 2 : 1;
                if (s > stars[levelIndex]) {
                    stars[levelIndex] = s;
                    try {
                        localStorage.setItem(PROGRESS_KEY, JSON.stringify(stars));
                        localStorage.setItem(STARS_KEY, String(stars.reduce((a, b) => a + b, 0)));
                    } catch {
                        /* ignore */
                    }
                }
                result = { kind: "arrived", body: NAMES[level.bodies[level.target].kind], stars: s, top: p.fastest * KMS };
                sfxArrive();
            } else if (p.state === "crashed") {
                result = { kind: "crashed", body: hit ? NAMES[hit.kind] : "" };
                bang.visible = true;
                bangAge = 0;
                toWorld(p.x, p.y, bang.position);
                probeGlow.visible = false;
                sfxHit();
            } else {
                result = { kind: "lost" };
                sfxOver();
            }
            phase = "done";
            pushHud();
        };
        api.current = { open, begin, retry, next, menu: () => open(levelIndex) };

        // ---- controls ---------------------------------------------------------
        const ray = new THREE.Raycaster();
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const onPlane = (cx: number, cy: number, out: THREE.Vector3) => {
            const r = renderer.domElement.getBoundingClientRect();
            ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
            return ray.ray.intersectPlane(plane, out);
        };
        let drag: { px: number; py: number; at: THREE.Vector3 } | null = null;
        const cur = new THREE.Vector3();
        const onDown = (e: PointerEvent) => {
            if (phase === "aim") {
                const at = new THREE.Vector3();
                if (!onPlane(e.clientX, e.clientY, at)) return;
                drag = { px: e.clientX, py: e.clientY, at };
                renderer.domElement.setPointerCapture(e.pointerId);
            } else if (phase === "flying") fast = true;
        };
        const onMove = (e: PointerEvent) => {
            if (!drag || phase !== "aim") return;
            if (!onPlane(e.clientX, e.clientY, cur)) return;
            // pulled back from where the finger went down: launch the other way
            const dx = drag.at.x - cur.x;
            const dy = -(drag.at.z - cur.z);
            const px = Math.hypot(e.clientX - drag.px, e.clientY - drag.py);
            if (px < 6) return;
            angle = Math.atan2(dy, dx);
            const r = renderer.domElement.getBoundingClientRect();
            power = THREE.MathUtils.clamp(px / (Math.min(r.width, r.height) * FULL_PULL), 0.1, 1);
            pushHud();
        };
        const onUp = () => {
            fast = false;
            if (!drag) return;
            const moved = Math.hypot(cur.x - drag.at.x, cur.z - drag.at.z) > 0.01;
            drag = null;
            if (moved) fire();
        };
        const cv = renderer.domElement;
        cv.style.touchAction = "none";
        cv.addEventListener("pointerdown", onDown);
        cv.addEventListener("pointermove", onMove);
        cv.addEventListener("pointerup", onUp);
        cv.addEventListener("pointercancel", onUp);
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (e.type === "keyup") {
                if (k === " " || k === "f") fast = false;
                return;
            }
            if (k === "m") {
                setMuted(!isMuted());
                setMutedState(isMuted());
                return;
            }
            if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
            if (phase === "aim") {
                const fine = e.shiftKey ? 0.2 : 1;
                if (k === "arrowleft") angle += (fine * Math.PI) / 180;
                if (k === "arrowright") angle -= (fine * Math.PI) / 180;
                if (k === "arrowup") power = Math.min(1, power + 0.02 * fine);
                if (k === "arrowdown") power = Math.max(0.1, power - 0.02 * fine);
                if ((k === " " || k === "enter") && !e.repeat) fire();
                pushHud();
            } else if (phase === "flying") {
                if (k === " " || k === "f") fast = true;
                if (k === "r") retry();
            } else if (phase === "done" && (k === " " || k === "enter" || k === "r") && !e.repeat) {
                if (result?.kind === "arrived" && k !== "r" && levelIndex < LEVELS.length - 1) next();
                else retry();
            } else if (phase === "menu" && (k === " " || k === "enter") && !e.repeat) begin();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKey);

        // ---- the view: the whole mission in frame, tilted a little ------------
        const fit = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            camera.aspect = w / h;
            [trailMat, ghostMat, aimMat].forEach((m) => m.resolution.set(w, h));
            // what must be seen: every body with its rings, and every orbit
            let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
            const add = (x: number, y: number, r: number) => {
                x0 = Math.min(x0, x - r);
                x1 = Math.max(x1, x + r);
                y0 = Math.min(y0, y - r);
                y1 = Math.max(y1, y + r);
            };
            for (const b of level.bodies) {
                if (b.orbit) add(b.orbit.around[0], b.orbit.around[1], b.orbit.R + b.r * 2);
                else add(b.at![0], b.at![1], level.flyby?.includes(level.bodies.indexOf(b)) ? flybyRadius(b.r) : b.kind === "sun" ? b.r * 2 : captureRadius(b.r));
            }
            // on a tall screen the view turns, so the long way runs up it
            const tall = w / h < 0.9;
            const pitch = (62 * Math.PI) / 180;
            const back = tall ? new THREE.Vector3(-Math.cos(pitch), Math.sin(pitch), 0) : new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch));
            camera.up.set(tall ? 1 : 0, tall ? 0 : 1, 0);
            camera.fov = 36;
            camera.updateProjectionMatrix();
            // room for the words at the top and the buttons below
            const top = 1 - 220 / h;
            const bottom = -1 + 130 / h;
            const centre = new THREE.Vector3();
            const frame = (extra: [number, number][]) => {
                let a0 = x0, a1 = x1, b0 = y0, b1 = y1;
                for (const [x, y] of extra) {
                    a0 = Math.min(a0, x);
                    a1 = Math.max(a1, x);
                    b0 = Math.min(b0, y);
                    b1 = Math.max(b1, y);
                }
                toWorld((a0 + a1) / 2, (b0 + b1) / 2, centre);
                const corners = [
                    [a0, b0],
                    [a0, b1],
                    [a1, b0],
                    [a1, b1],
                ].map(([x, y]) => toWorld(x, y, new THREE.Vector3()));
                let lo = 20;
                let hi = 800;
                for (let k = 0; k < 30; k++) {
                    const d = (lo + hi) / 2;
                    camera.position.copy(centre).addScaledVector(back, d);
                    camera.lookAt(centre);
                    camera.updateMatrixWorld();
                    const ok = corners.every((c) => {
                        tmp.copy(c).project(camera);
                        return Math.abs(tmp.x) < 0.94 && tmp.y < top && tmp.y > bottom;
                    });
                    if (ok) hi = d;
                    else lo = d;
                }
                camera.position.copy(centre).addScaledVector(back, hi);
                camera.lookAt(centre);
                camera.updateMatrixWorld();
            };
            frame([]);
            // and room behind Earth for a full-strength pull with the mouse:
            // pulling back goes away from the rest of the mission, so the
            // frame takes in a pull's length that way (and 40° either side),
            // measured in pixels at the current zoom, a few times over
            const [ex, ey] = level.bodies[level.start].at!;
            let ox = ex - (x0 + x1) / 2;
            let oy = ey - (y0 + y1) / 2;
            const ol = Math.hypot(ox, oy) || 1;
            ox /= ol;
            oy /= ol;
            for (let pass = 0; pass < 3; pass++) {
                const a = toWorld(ex, ey, new THREE.Vector3()).project(camera);
                const b = toWorld(ex + 1, ey, new THREE.Vector3()).project(camera);
                const perUnit = Math.hypot(((b.x - a.x) * w) / 2, ((b.y - a.y) * h) / 2);
                const reach = (FULL_PULL * Math.min(w, h) + 24) / perUnit;
                frame(
                    [-0.7, 0, 0.7].map((t): [number, number] => [
                        ex + (ox * Math.cos(t) - oy * Math.sin(t)) * reach,
                        ey + (ox * Math.sin(t) + oy * Math.cos(t)) * reach,
                    ]),
                );
            }
            starField.position.copy(camera.position);
        };
        const ro = new ResizeObserver(fit);
        ro.observe(el);

        // ---- the loop ---------------------------------------------------------
        let raf = 0;
        let last = performance.now();
        let hudTimer = 0;
        const bp: [number, number] = [0, 0];
        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (document.hidden) return;
            if (phase === "flying" && probe) {
                stepAcc += dt * (fast ? 3 : 1);
                const before = probe.passed.slice();
                while (stepAcc > 0 && probe.state === "flying") {
                    step(level, probe);
                    stepAcc -= 1 / 120;
                    if (++sinceTrail >= 3) {
                        sinceTrail = 0;
                        path.push(probe.x, 0.05, -probe.y);
                    }
                }
                t = probe.t;
                if ((level.flyby ?? []).some((k) => probe!.passed[k] && !before[k])) {
                    sfxFlyby();
                    pushHud();
                }
                toWorld(probe.x, probe.y, probeGlow.position).setY(0.1);
                if (path.length >= 6) {
                    trail = drop(trail);
                    trail = makeLine(path.concat([probe.x, 0.05, -probe.y]), trailMat);
                }
                if (probe.state !== "flying") finish();
                hudTimer -= dt;
                if (hudTimer <= 0) {
                    hudTimer = 0.1;
                    pushHud();
                }
            } else if (phase !== "done") t += dt;
            // the worlds, where they are now, turning
            for (const s of shown) {
                bodyAt(s.body, t, bp);
                toWorld(bp[0], bp[1], s.group.position);
                if (s.spin) s.spin.rotation.y += dt * (s.body.kind === "rock" ? 0.4 : s.body.kind === "sun" ? 0.02 : 0.12);
                if (s.air) (s.air.uniforms.uCenter.value as THREE.Vector3).copy(s.group.position);
                if (s.body.kind === "sun") (((s.spin as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uTime.value = now / 1000);
                if (s.ringMat && probe) s.ringMat.color.set(probe.passed[level.bodies.indexOf(s.body)] ? 0x86efac : 0xfbbf24);
                if (s.ringMat && !probe) s.ringMat.color.set(0xfbbf24);
            }
            // aiming: the arrow from Earth, and the dotted path ahead
            let n = 0;
            if (phase === "aim" || phase === "menu") {
                const e = bodyAt(level.bodies[level.start], t);
                const r0 = level.bodies[level.start].r + 0.5;
                const len = r0 + 2 + power * 7;
                aimLine = drop(aimLine);
                if (phase === "aim")
                    aimLine = makeLine([e[0] + Math.cos(angle) * r0, 0.08, -(e[1] + Math.sin(angle) * r0), e[0] + Math.cos(angle) * len, 0.08, -(e[1] + Math.sin(angle) * len)], aimMat);
                const p = launch(level, angle, power, t);
                let dist = 0;
                let px = p.x;
                let py = p.y;
                for (let k = 0; k < 900 && p.state === "flying" && n < DOTS && dist < 34; k++) {
                    step(level, p);
                    dist += Math.hypot(p.x - px, p.y - py);
                    px = p.x;
                    py = p.y;
                    if (k % 5 === 4) {
                        dotPos.set([p.x, 0.06, -p.y], n * 3);
                        const f = (1 - dist / 34) * (phase === "aim" ? 1 : 0.4);
                        dotCol.set([0.62 * f, 0.9 * f, 1 * f], n * 3);
                        n++;
                    }
                }
            } else aimLine = drop(aimLine);
            dotGeo.setDrawRange(0, n);
            dotGeo.attributes.position.needsUpdate = true;
            dotGeo.attributes.color.needsUpdate = true;
            // a crash: a flash that swells and fades
            if (bang.visible) {
                bangAge += dt;
                bang.scale.setScalar(2 + bangAge * 14);
                (bang.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - bangAge / 0.7);
                if (bangAge > 0.7) bang.visible = false;
            }
            probeGlow.scale.setScalar(2 + Math.sin(now / 120) * 0.25);
            renderer.render(scene, camera);
        };
        // start where the player left off
        const first = stars.findIndex((s) => s === 0);
        open(first === -1 ? 0 : first);
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            cv.removeEventListener("pointerdown", onDown);
            cv.removeEventListener("pointermove", onMove);
            cv.removeEventListener("pointerup", onUp);
            cv.removeEventListener("pointercancel", onUp);
            clearWorld();
            [trail, ghost, aimLine].forEach(drop);
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                m.geometry?.dispose();
                (m.material as THREE.Material | undefined)?.dispose?.();
            });
            [trailMat, ghostMat, aimMat, rockMat].forEach((m) => m.dispose());
            [planetGeo, airGeo, ...rockGeos].forEach((g) => g.dispose());
            [...maps.values(), ringTex, glowWarm, glowProbe, glowBang, sky].forEach((x) => x.dispose());
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    const L = LEVELS[hud.level];
    const total = hud.stars.reduce((a, b) => a + b, 0);
    const flybys = L.flyby?.length ?? 0;
    return (
        <div className="fixed inset-0 z-50 bg-black text-white">
            <div ref={mount} className={`absolute inset-0 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`} aria-label="Gravity Assist: a 3D game" role="application" />
            {!loaded && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-teal-300/80">Fuelling up…</p>
                </div>
            )}

            {/* the mission, and how it's going */}
            {hud.phase !== "menu" && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-6">
                    <div className="max-w-md">
                        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet-300/90">
                            Mission {hud.level + 1} of {LEVELS.length}
                        </p>
                        <p className="font-display mt-1 text-xl font-bold sm:text-2xl">{L.name}</p>
                        <p className="mt-1 text-sm leading-snug text-neutral-300">{L.brief}</p>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                        <p>
                            Launches <span className="text-white">{hud.launches}</span>
                        </p>
                        <p className="mt-1">Par {L.par}</p>
                        {flybys > 0 && (
                            <p className="mt-1">
                                Flybys <span className={hud.passed === flybys ? "text-emerald-300" : "text-amber-300"}>{hud.passed}</span>/{flybys}
                            </p>
                        )}
                        <p className="mt-2 text-sm tracking-normal text-white">{hud.speed.toFixed(1)} km/s</p>
                    </div>
                </div>
            )}

            <div className="absolute bottom-4 left-4 flex gap-2 sm:bottom-6 sm:left-6">
                <button type="button" onClick={onExit} className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm text-neutral-200 backdrop-blur hover:border-white/30 hover:text-white">
                    ← Arcade
                </button>
                {hud.phase !== "menu" && (
                    <button type="button" onClick={() => api.current.menu()} className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm text-neutral-200 backdrop-blur hover:border-white/30 hover:text-white">
                        Missions
                    </button>
                )}
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
            {(hud.phase === "aim" || hud.phase === "flying") && (
                <p className="pointer-events-none absolute bottom-16 right-4 text-right font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 sm:bottom-5 sm:right-6">
                    {hud.phase === "aim" ? (
                        <>
                            <span className="hidden sm:inline">Drag back to aim, let go to launch · or arrows and Space</span>
                            <span className="sm:hidden">Drag back, let go</span>
                            <span className="ml-3 text-teal-300">{Math.round(hud.power * 100)}%</span>
                        </>
                    ) : (
                        <>
                            <span className="hidden sm:inline">Hold Space or press to speed up · R to try again</span>
                            <span className="sm:hidden">Hold to speed up</span>
                        </>
                    )}
                </p>
            )}

            {/* the missions */}
            {hud.phase === "menu" && loaded && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-y-auto p-4 pb-20 sm:items-center sm:p-6">
                    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-violet-400/25 bg-black/65 p-5 backdrop-blur-md sm:p-6">
                        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-violet-300/90">Crew arcade · 03</p>
                        <h1 className="font-display mt-2 text-3xl font-bold">Gravity Assist</h1>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                            Send a probe from Earth to another world, bending its path round the planets on the way. Drag back to aim, and let go to launch. A planet on the move can fling you on faster.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {LEVELS.map((l, i) => {
                                const open = unlocked(hud.stars, i);
                                return (
                                    <button
                                        key={l.name}
                                        type="button"
                                        disabled={!open}
                                        onClick={() => api.current.open(i)}
                                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                                            i === hud.level ? "border-violet-300/70 bg-violet-400/10" : "border-white/10 hover:border-white/25"
                                        } ${open ? "" : "cursor-not-allowed opacity-40"}`}
                                    >
                                        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">{i + 1}</span>
                                        <span className="block text-sm text-white">{l.name}</span>
                                        <span className="block text-xs tracking-widest text-amber-300" aria-label={`${hud.stars[i]} of 3 stars`}>
                                            {"★".repeat(hud.stars[i])}
                                            <span className="text-white/15">{"★".repeat(3 - hud.stars[i])}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-5 flex items-center justify-between">
                            <button type="button" onClick={() => api.current.begin()} className="rounded-full bg-violet-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-violet-300">
                                Mission {hud.level + 1}: {L.name}
                            </button>
                            <span className="font-mono text-xs text-neutral-400">★ {total}/{LEVELS.length * 3}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* how it went */}
            {hud.phase === "done" && hud.result && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4 pb-20 sm:items-center sm:p-6">
                    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-violet-400/25 bg-black/65 p-6 text-center backdrop-blur-md">
                        {hud.result.kind === "arrived" ? (
                            <>
                                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-300">Arrived</p>
                                <h2 className="font-display mt-2 text-3xl font-bold">You made it to {hud.result.body}</h2>
                                <p className="mt-2 text-2xl tracking-widest text-amber-300">
                                    {"★".repeat(hud.result.stars ?? 1)}
                                    <span className="text-white/15">{"★".repeat(3 - (hud.result.stars ?? 1))}</span>
                                </p>
                                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                                    {hud.launches} {hud.launches === 1 ? "launch" : "launches"} · par {L.par} · top speed {hud.result.top?.toFixed(1)} km/s
                                </p>
                                <p className="mt-3 text-sm leading-relaxed text-neutral-300">{L.fact}</p>
                                <div className="mt-5 flex justify-center gap-2">
                                    <button type="button" onClick={() => api.current.retry()} className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-neutral-200 hover:border-white/40">
                                        Fly it again
                                    </button>
                                    {hud.level < LEVELS.length - 1 ? (
                                        <button type="button" onClick={() => api.current.next()} className="rounded-full bg-violet-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-violet-300">
                                            Next mission
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => api.current.menu()} className="rounded-full bg-violet-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-violet-300">
                                            All missions
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-rose-300">Signal lost</p>
                                <h2 className="font-display mt-2 text-2xl font-bold">{hud.result.kind === "crashed" ? `The probe hit ${hud.result.body}` : "The probe drifted off into deep space"}</h2>
                                <p className="mt-2 text-sm text-neutral-400">Your last path stays on the map, faintly.</p>
                                <button type="button" onClick={() => api.current.retry()} className="mt-5 rounded-full bg-violet-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-violet-300">
                                    Try again
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
