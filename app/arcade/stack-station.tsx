"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { trackEvent } from "@/lib/track";
import { NoWebGL } from "./no-webgl";
import { reportError } from "@/lib/report-error";
import { Board } from "./board";
import { isMuted, setMuted, sfxOver, sfxPlace, sfxPerfect, sfxSlice } from "./sound";
import { FullscreenButton } from "./fullscreen";
import { alignStars, fbm, loadTexture, normalMap, perlin, sharpen, skyTexture, spaceEnvironment, starPoints, todayKey } from "./space";
import { subscribeIss } from "@/lib/iss";
import { BASE, H, drop as dropModule, movingAt, newStack, roundTime, type Stack } from "./stack-sim";

// Stack the Station: build a space station above the Earth, one module at a
// time. Each module slides in over the last; tap, click or press Space to drop
// it. Whatever hangs over the edge is sliced off and tumbles away, so the
// station narrows; miss it entirely and the build is over. Land one almost
// exactly and it keeps its size ("Perfect"); five in a row and it grows back a
// little. The best station is kept in this browser.

const BEST_KEY = "arcade-stack-best";
// (the rules, and the sizes, are in stack-sim.ts, shared with the server)

// The Earth: seen from high orbit, so its curve shows, and filling the view
// below and ahead. It sits along the camera's line of sight, 50° down.
const EARTH_R = 600;
const EARTH_AT = new THREE.Vector3(-Math.SQRT1_2 * Math.cos(0.87), -Math.sin(0.87), -Math.SQRT1_2 * Math.cos(0.87)).multiplyScalar(EARTH_R * 2);
// The sun, from over the right shoulder: it lights the station's near faces
// and top, and sets along the Earth's far left edge
const SUN = new THREE.Vector3(0.8, 0.5, 0.36).normalize();

// Today's station floats over wherever the real ISS is right now, in real
// daylight or darkness, under today's real aurora
/** Where a place is on the Earth's sphere (in the Earth's own frame). */
const placeOnEarth = (lat: number, lon: number) => {
    const phi = ((lon + 180) / 360) * Math.PI * 2;
    const theta = ((90 - lat) / 180) * Math.PI;
    return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
};
/** Where the Sun is overhead at a moment (the usual low-precision series: to a fraction of a degree). */
function subsolar(date: Date) {
    const n = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
    const R = Math.PI / 180;
    const L = 280.46 + 0.9856474 * n;
    const g = (357.528 + 0.9856003 * n) * R;
    const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R;
    const eps = (23.439 - 4e-7 * n) * R;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / R;
    const gmst = 280.46061837 + 360.98564736629 * n;
    return { lat: dec / R, lon: ((((ra - gmst) % 360) + 540) % 360) - 180 };
}
/** The Earth's turn that puts a place under the station (and the Sun, if given, where it really is). */
function earthTurn(lat: number, lon: number, sun: { lat: number; lon: number } | null) {
    const nL = placeOnEarth(lat, lon);
    const nW = EARTH_AT.clone().normalize().negate();
    let tL: THREE.Vector3;
    let tW: THREE.Vector3;
    const north = () => {
        const phi = ((lon + 180) / 360) * Math.PI * 2;
        const theta = ((90 - lat) / 180) * Math.PI;
        tL = new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.sin(theta), -Math.sin(phi) * Math.cos(theta));
        tW = new THREE.Vector3(0, 1, 0).addScaledVector(nW, -nW.y).normalize();
    };
    if (sun) {
        const sL = placeOnEarth(sun.lat, sun.lon);
        tL = sL.addScaledVector(nL, -sL.dot(nL));
        tW = SUN.clone().addScaledVector(nW, -SUN.dot(nW));
        if (tL.lengthSq() < 1e-6 || tW.lengthSq() < 1e-6) north();
        else {
            tL.normalize();
            tW.normalize();
        }
    } else north();
    const local = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(tL!, nL), tL!, nL);
    const world = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(tW!, nW), tW!, nW);
    return new THREE.Quaternion().setFromRotationMatrix(world.multiply(local.transpose()));
}
// The aurora: an oval round each magnetic pole, wider and brighter as the
// planetary K index rises (quiet below 4, a storm from 5), on the night side
/** The K index, in words (NOAA's scale: G1 to G5 are storms). */
const kpWords = (kp: number) =>
    kp >= 9 ? "an extreme geomagnetic storm (G5)" : kp >= 8 ? "a severe geomagnetic storm (G4)" : kp >= 7 ? "a strong geomagnetic storm (G3)" : kp >= 6 ? "a moderate geomagnetic storm (G2)" : kp >= 5 ? "a minor geomagnetic storm (G1)" : kp >= 4 ? "unsettled" : "quiet";
const auroraFrag = /* glsl */ `
    uniform float uKp;
    uniform float uTime;
    uniform vec3 uMagN;
    uniform vec3 uMagS;
    uniform vec3 uSun;
    varying vec3 vP;
    varying vec3 vN;
    float band(vec3 pole, float colat, float width) {
        float a = acos(clamp(dot(vP, pole), -1.0, 1.0));
        return exp(-pow((a - colat) / width, 2.0));
    }
    void main() {
        float colat = radians(17.0 + 1.6 * uKp);
        float width = radians(2.2 + 0.5 * uKp);
        float b = band(uMagN, colat, width) + band(uMagS, colat, width);
        // curtains: a slow ripple along the oval
        float ripple = 0.55 + 0.45 * sin(uTime * 0.9 + vP.x * 23.0 + vP.z * 17.0) * sin(uTime * 0.37 + vP.y * 31.0);
        float night = smoothstep(0.15, -0.25, dot(normalize(vN), normalize(uSun)));
        float strength = clamp((uKp - 1.0) / 5.0, 0.1, 1.0);
        vec3 c = mix(vec3(0.15, 1.0, 0.45), vec3(0.75, 0.3, 0.9), smoothstep(0.6, 1.0, b) * 0.35);
        gl_FragColor = vec4(c * b * ripple * night * strength * 1.8, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;

type Phase = "ready" | "playing" | "over";
type Hud = { drops: number[]; daily: boolean; score: number; best: number; phase: Phase; perfect: number; streak: number; newBest: boolean };

// ---- the station's skins, drawn once --------------------------------------

const TEX = 256; // one texture covers one unit of the station
function canvasTex(draw: (img: ImageData) => void) {
    const c = document.createElement("canvas");
    c.width = c.height = TEX;
    const g = c.getContext("2d")!;
    const img = g.createImageData(TEX, TEX);
    draw(img);
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// White thermal blankets, quilted in squares: each square puffs up between
// its stitches, and a few are a little newer or older than the rest
function blanket() {
    const n = perlin(7);
    const h = new Float32Array(TEX * TEX);
    const Q = TEX / 2;
    const shade = [1, 0.96, 0.99, 0.94];
    const map = canvasTex((img) => {
        for (let y = 0; y < TEX; y++)
            for (let x = 0; x < TEX; x++) {
                const u = (x % Q) / Q;
                const v = (y % Q) / Q;
                const puff = Math.pow(Math.sin(Math.PI * u) * Math.sin(Math.PI * v), 0.35);
                const wrinkle = fbm(n, x / 32, y / 32, 0, 3, TEX / 32);
                const k = y * TEX + x;
                h[k] = puff * 0.8 + wrinkle * 0.35;
                const b = (0.8 + 0.2 * puff + wrinkle * 0.12) * shade[Math.floor(x / Q) + 2 * Math.floor(y / Q)];
                img.data[k * 4] = 236 * b;
                img.data[k * 4 + 1] = 233 * b;
                img.data[k * 4 + 2] = 225 * b;
                img.data[k * 4 + 3] = 255;
            }
    });
    return { map, normal: normalMap(h, TEX, 6) };
}
// Bare aluminium panels: bolted plates with recessed seams, each plate a
// slightly different grey, and faint brushing
function plates() {
    const n = perlin(19);
    const h = new Float32Array(TEX * TEX);
    const map = canvasTex((img) => {
        for (let y = 0; y < TEX; y++)
            for (let x = 0; x < TEX; x++) {
                const px = x % (TEX / 2);
                const py = y % (TEX / 4);
                const seam = px < 2 || py < 2;
                const rivet = (Math.hypot(px - 8, py - 8) < 2.2 || Math.hypot(px - (TEX / 2 - 8), py - 8) < 2.2) && !seam;
                const plate = Math.floor(x / (TEX / 2)) * 5 + Math.floor(y / (TEX / 4)) * 3;
                const brush = n(x / 64, y / 2, 0, TEX / 64) * 0.06;
                const k = y * TEX + x;
                h[k] = seam ? 0 : rivet ? 1 : 0.6 + brush;
                const b = seam ? 0.45 : (0.86 + (plate % 5) * 0.03 + brush) * (rivet ? 1.1 : 1);
                img.data[k * 4] = 196 * b;
                img.data[k * 4 + 1] = 200 * b;
                img.data[k * 4 + 2] = 206 * b;
                img.data[k * 4 + 3] = 255;
            }
    });
    return { map, normal: normalMap(h, TEX, 3) };
}
// Gold foil, crinkled
function foil() {
    const n = perlin(31);
    const h = new Float32Array(TEX * TEX);
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) h[y * TEX + x] = 1 - Math.abs(fbm(n, x / 40, y / 40, 0, 4, TEX / 40));
    return normalMap(h, TEX, 5);
}
// A solar array: dark blue cells in a silver grid, a little lighter at the
// middle of each cell
function cells() {
    return canvasTex((img) => {
        const C = TEX / 8;
        for (let y = 0; y < TEX; y++)
            for (let x = 0; x < TEX; x++) {
                const cx = x % C;
                const cy = y % C;
                const gap = cx < 2 || cy < 2;
                const k = (y * TEX + x) * 4;
                const glow = 1 - Math.hypot(cx - C / 2, cy - C / 2) / C;
                img.data[k] = gap ? 170 : 18 + glow * 14;
                img.data[k + 1] = gap ? 172 : 30 + glow * 18;
                img.data[k + 2] = gap ? 178 : 70 + glow * 30;
                img.data[k + 3] = 255;
            }
    });
}

// A box whose texture keeps its size on every face, however it's cut
function sizedBox(w: number, h: number, d: number) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    // faces, in order: +x, -x, +y, -y, +z, -z; four corners each
    const size = [
        [d, h],
        [d, h],
        [w, d],
        [w, d],
        [w, h],
        [w, h],
    ];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) uv.setXY(f * 4 + i, uv.getX(f * 4 + i) * size[f][0], uv.getY(f * 4 + i) * size[f][1]);
    return g;
}

// ---- the Earth -------------------------------------------------------------

// Day and night in one: the Blue Marble lit by the sun, the city lights where
// it's dark, clouds (drifting a little faster than the ground) and their
// shadows, the sun's glint off the oceans, and the blue haze of the air
// thickening toward the edge
const earthVert = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vW;
    void main() {
        vUv = uv;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
    }`;
const earthFrag = /* glsl */ `
    uniform sampler2D uDay;
    uniform sampler2D uNight;
    uniform sampler2D uWater;
    uniform sampler2D uClouds;
    uniform vec3 uSun;
    uniform float uCloudShift;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vW;
    void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        vec3 L = normalize(uSun);
        float ndl = dot(N, L);
        float day = smoothstep(-0.08, 0.2, ndl);
        vec2 cuv = vUv + vec2(uCloudShift, 0.0);
        // (thin cloud thinned further: the map is a busy day's)
        float cloud = pow(texture2D(uClouds, cuv).r, 1.6) * 0.9;
        float shadow = pow(texture2D(uClouds, cuv + vec2(0.0012, 0.0006)).r, 1.6) * 0.9;
        float water = texture2D(uWater, vUv).r;
        vec3 ground = texture2D(uDay, vUv).rgb;
        vec3 col = ground * max(ndl, 0.0) * 2.1 * (1.0 - shadow * 0.5);
        // the sun on the sea: a tight glint and a broad sheen
        vec3 Hv = normalize(L + V);
        float nh = max(dot(N, Hv), 0.0);
        col += water * (pow(nh, 180.0) * 2.2 + pow(nh, 14.0) * 0.08) * vec3(1.0, 0.92, 0.8) * day * (1.0 - cloud);
        // clouds, going warm at the line between day and night
        vec3 sunTint = mix(vec3(1.0, 0.55, 0.3), vec3(1.0), smoothstep(0.0, 0.35, ndl));
        col = mix(col, sunTint * max(ndl + 0.05, 0.0) * 2.0, cloud * 0.92);
        // the cities, where the sun has set
        vec3 lights = texture2D(uNight, vUv).rgb;
        col += lights * lights * vec3(1.0, 0.78, 0.5) * 3.2 * (1.0 - day) * (1.0 - cloud * 0.85);
        // the air: a blue haze, thickest toward the edge
        float edge = pow(1.0 - max(dot(N, V), 0.0), 2.5);
        col = mix(col, vec3(0.32, 0.58, 1.0) * 1.3 * day, clamp(edge * 0.75 + 0.06, 0.0, 1.0) * smoothstep(-0.2, 0.3, ndl));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;
// The glow of the air round the Earth's edge, against space: the density of
// air along each line of sight (it thins with height), lit blue by day and
// orange along the line where the sun is setting
const airFrag = /* glsl */ `
    uniform vec3 uCenter;
    uniform float uR;
    uniform float uH;
    uniform vec3 uSun;
    varying vec3 vW;
    void main() {
        vec3 rd = normalize(vW - cameraPosition);
        vec3 oc = uCenter - cameraPosition;
        vec3 p = cameraPosition + rd * max(dot(oc, rd), 0.0);
        float h = max(length(p - uCenter) - uR, 0.0);
        float dens = exp(-h / uH);
        float s = dot(normalize(p - uCenter), normalize(uSun));
        vec3 c = mix(vec3(1.0, 0.45, 0.2), vec3(0.3, 0.6, 1.0), smoothstep(-0.05, 0.3, s));
        gl_FragColor = vec4(c * dens * smoothstep(-0.3, 0.15, s) * 1.6, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;

export default function StackStation({ onExit }: { onExit: () => void }) {
    const mount = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<Hud>({ drops: [], daily: false, score: 0, best: 0, phase: "ready", perfect: 0, streak: 0, newBest: false });
    const [muted, setMutedState] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [noGl, setNoGl] = useState(false);
    const drop = useRef<() => void>(() => {});
    const start = useRef<(daily?: boolean) => void>(() => {});
    // today's space: the space weather, and the people up there now
    const [space, setSpace] = useState<{ kp: number | null; people: number | null } | null>(null);
    // where the real ISS is, under today's station
    const [over, setOver] = useState<{ lat: number; lon: number; shadow: boolean } | null>(null);

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
        // (no 3D graphics in this browser: say so, rather than crash)
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        } catch (e) {
            reportError("stack", "no-webgl", e);
            setNoGl(true);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.classList.add("game-canvas");
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
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
            if (!ready) reportError("stack", "stuck-loading", `still loading: ${[...waiting].join(", ") || "?"}`);
            setLoaded(true);
        }, 12_000);
        const loader = new THREE.TextureLoader(manager);

        // The sky: the real one, with the Milky Way arching up behind the station
        const sky = skyTexture(renderer, loader);
        scene.background = sky;
        scene.backgroundIntensity = 0.55;
        scene.backgroundRotation.set(-2.966, -0.592, 1.616);
        const stars = starPoints(4000, manager);
        alignStars(stars, scene.backgroundRotation);
        const starMat = stars.material as THREE.ShaderMaterial;
        starMat.uniforms.uScale.value = renderer.getPixelRatio();
        starMat.uniforms.uBright.value = 0.8;
        scene.add(stars);

        // Light: the sun, hard and white, with shadows; the Earth's blue glow
        // from below; and almost nothing else, as in space
        const ambient = new THREE.AmbientLight(0x8090b0, 0.12);
        scene.add(ambient);
        // (where the sunlight comes from: fixed, or on today's station the real Sun)
        const sunDir = SUN.clone();
        const sun = new THREE.DirectionalLight(0xfff6ea, 3.2);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.02;
        sun.shadow.camera.near = 1;
        scene.add(sun, sun.target);
        const earthShine = new THREE.DirectionalLight(0x6f9fe0, 0.55);
        earthShine.position.copy(EARTH_AT).normalize();
        scene.add(earthShine);
        // Reflections for the metal: black space above, the blue Earth below
        // and ahead, and the sun
        const env = spaceEnvironment(renderer, SUN, { dir: EARTH_AT, colour: new THREE.Color(0.3, 0.45, 0.7), cos: 0.88 });
        scene.environment = env.texture;

        // The Earth, turning slowly, with its air. On a desktop that can take
        // it, the day side sharpens to 8K and the city lights to 4K once
        // they've loaded, and the clouds to 8K, kept as one channel (the
        // shader reads only their red), so they take no more memory than now
        const sharp = (t: THREE.Texture, file: string) => (sharpen(renderer, t, file), t);
        const sharpGrey = (t: THREE.Texture, file: string) => (sharpen(renderer, t, file, true, true), t);
        const earthMat = new THREE.ShaderMaterial({
            uniforms: {
                uDay: { value: sharp(loadTexture(renderer, loader, "earth-day.jpg"), "earth-day-8k.webp") },
                uNight: { value: sharp(loadTexture(renderer, loader, "earth-night.jpg"), "earth-night-4k.jpg") },
                uWater: { value: loadTexture(renderer, loader, "earth-water.jpg", false) },
                uClouds: { value: sharpGrey(loadTexture(renderer, loader, "earth-clouds.jpg", false), "earth-clouds-8k.webp") },
                uSun: { value: sunDir },
                uCloudShift: { value: 0 },
            },
            vertexShader: earthVert,
            fragmentShader: earthFrag,
        });
        const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 160, 120), earthMat);
        // turned so that Kolkata faces the station, with north toward the horizon;
        // on today's station, turned to wherever the real ISS is, with the real Sun
        earth.quaternion.copy(earthTurn(22.57, 88.36, null));
        scene.add(earth);
        let live = false;
        const liveTurn = new THREE.Quaternion();
        let liveSnap = true;
        let haveFix = false;
        const sunLocal = new THREE.Vector3(); // the Sun's overhead point, on the Earth's own sphere
        const upW = EARTH_AT.clone().normalize().negate();
        let stopIss: (() => void) | null = null;
        const followIss = (on: boolean) => {
            stopIss?.();
            stopIss = null;
            live = on;
            if (!on) {
                earth.quaternion.copy(earthTurn(22.57, 88.36, null));
                sunDir.copy(SUN);
                sun.intensity = 3.2;
                ambient.intensity = 0.12;
                setOver(null);
                aurora.visible = false;
                return;
            }
            liveSnap = true;
            haveFix = false;
            aurora.visible = true;
            stopIss = subscribeIss(5000, (fix) => {
                const ss = subsolar(new Date());
                liveTurn.copy(earthTurn(fix.latitude, fix.longitude, ss));
                sunLocal.copy(placeOnEarth(ss.lat, ss.lon));
                haveFix = true;
                // is the real ISS in Earth's shadow? (the Sun more than ~20 degrees below its horizon)
                const shadow = placeOnEarth(fix.latitude, fix.longitude).dot(sunLocal) < -0.34;
                setOver({ lat: fix.latitude, lon: fix.longitude, shadow });
                // (for checking: where the Earth has been turned to)
                el.dataset.iss = `${fix.latitude.toFixed(1)},${fix.longitude.toFixed(1)}`;
            });
        };
        // the aurora, riding on the Earth (so its poles turn with it)
        const auroraMat = new THREE.ShaderMaterial({
            uniforms: {
                uKp: { value: 2 },
                uTime: { value: 0 },
                uMagN: { value: placeOnEarth(80.7, -72.7) },
                uMagS: { value: placeOnEarth(-80.7, 107.3) },
                uSun: { value: sunDir },
            },
            vertexShader: "varying vec3 vP; varying vec3 vN; void main(){ vP = normalize(position); vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader: auroraFrag,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const aurora = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.004, 128, 64), auroraMat);
        aurora.visible = false;
        earth.add(aurora);
        fetch("/api/space-today")
            .then((r) => r.json())
            .then((d: { kp?: number | null; people?: number | null }) => {
                const kp = typeof d?.kp === "number" ? d.kp : null;
                if (kp !== null) auroraMat.uniforms.uKp.value = kp;
                setSpace({ kp, people: typeof d?.people === "number" ? d.people : null });
            })
            .catch(() => setSpace({ kp: null, people: null }));
        const airMat = new THREE.ShaderMaterial({
            uniforms: { uCenter: { value: new THREE.Vector3() }, uR: { value: EARTH_R }, uH: { value: EARTH_R * 0.012 }, uSun: { value: sunDir } },
            vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
            fragmentShader: airFrag,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const air = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.06, 160, 120), airMat);
        scene.add(air);

        // ---- the station -----------------------------------------------------
        const station = new THREE.Group();
        scene.add(station);
        const white = blanket();
        const grey = plates();
        const foilNormal = foil();
        const cellMap = cells();
        const skins = {
            blanket: new THREE.MeshStandardMaterial({ map: white.map, normalMap: white.normal, roughness: 0.85, metalness: 0, envMapIntensity: 0.6 }),
            plates: new THREE.MeshStandardMaterial({ map: grey.map, normalMap: grey.normal, roughness: 0.5, metalness: 0.3, envMapIntensity: 1.5 }),
            foil: new THREE.MeshStandardMaterial({ color: 0xd9a441, normalMap: foilNormal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.34, metalness: 0.8, envMapIntensity: 2 }),
        };
        const metal = new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.35, metalness: 0.8, envMapIntensity: 2 });
        const rail = new THREE.MeshStandardMaterial({ color: 0xd4a53a, roughness: 0.5, metalness: 0.3 });
        const box = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.7, metalness: 0.1 });
        const array = new THREE.MeshStandardMaterial({ map: cellMap, roughness: 0.22, metalness: 0.4 });
        const backing = new THREE.MeshStandardMaterial({ color: 0xa8854c, roughness: 0.6, metalness: 0.3 });
        const sharedMats: THREE.Material[] = [...Object.values(skins), metal, rail, box, array, backing];

        // A module, merged into a few meshes: its skin (blankets, bare plates
        // or gold foil), metal rings at its ends, handrails and boxes on its
        // sides, and on every fifth, a pair of solar wings on a mast
        type Layer = { group: THREE.Group; w: number; d: number; x: number; z: number; y: number };
        const skinOf = (n: number) => (n % 7 === 3 ? skins.foil : n % 2 ? skins.plates : skins.blanket);
        const makeModule = (w: number, d: number, n: number) => {
            const g = new THREE.Group();
            const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
            const put = (mat: THREE.Material, geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
                geo.translate(x, y, z);
                if (!parts.has(mat)) parts.set(mat, []);
                parts.get(mat)!.push(geo);
            };
            put(skinOf(n), sizedBox(w, H * 0.86, d), 0, 0, 0);
            // the rings: a frame round each end, the skin showing inside it
            const rh = H * 0.07;
            [-1, 1].forEach((s) => {
                const y = s * H * 0.465;
                [-1, 1].forEach((e) => {
                    put(metal, sizedBox(w + 0.04, rh, 0.08), 0, y, e * (d / 2 - 0.02));
                    put(metal, sizedBox(0.08, rh, d + 0.04), e * (w / 2 - 0.02), y, 0);
                });
            });
            // the fittings: the same for the same module, different round the station
            let seed = n * 7919 + 17;
            const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
            const sides: [number, number, boolean][] = [
                [0, d / 2, true],
                [0, -d / 2, true],
                [w / 2, 0, false],
                [-w / 2, 0, false],
            ];
            for (const [sx, sz, alongX] of sides) {
                const len = alongX ? w : d;
                if (len < 0.7) continue;
                const out = (sx || sz) > 0 ? 1 : -1;
                if (rand() < 0.7) {
                    // a handrail on two standoffs
                    const rl = len * (0.3 + rand() * 0.3);
                    const at = (rand() - 0.5) * (len - rl - 0.2);
                    const yy = (rand() - 0.5) * H * 0.4;
                    const off = 0.07;
                    if (alongX) {
                        put(rail, new THREE.BoxGeometry(rl, 0.025, 0.025), at, yy, sz + out * off);
                        [-1, 1].forEach((e) => put(rail, new THREE.BoxGeometry(0.02, 0.02, off), at + (e * rl) / 2.2, yy, sz + (out * off) / 2));
                    } else {
                        put(rail, new THREE.BoxGeometry(0.025, 0.025, rl), sx + out * off, yy, at);
                        [-1, 1].forEach((e) => put(rail, new THREE.BoxGeometry(off, 0.02, 0.02), sx + (out * off) / 2, yy, at + (e * rl) / 2.2));
                    }
                }
                if (rand() < 0.55) {
                    // a box of equipment bolted on
                    const bw = 0.18 + rand() * 0.2;
                    const bh = 0.12 + rand() * 0.1;
                    const at = (rand() - 0.5) * (len - bw - 0.2);
                    if (alongX) put(box, sizedBox(bw, bh, 0.07), at, (rand() - 0.5) * 0.08, sz + out * 0.035);
                    else put(box, sizedBox(0.07, bh, bw), sx + out * 0.035, (rand() - 0.5) * 0.08, at);
                }
            }
            if (n > 0 && n % 5 === 0) {
                [-1, 1].forEach((side) => {
                    const root = side * (w / 2);
                    put(metal, new THREE.BoxGeometry(1.1, 0.06, 0.06), root + side * 0.55, 0, 0);
                    // the wing: cells on top, the tan backing below, and a frame
                    const wing = new THREE.PlaneGeometry(2.6, 1.1);
                    wing.rotateX(-Math.PI / 2);
                    const uv = wing.getAttribute("uv") as THREE.BufferAttribute;
                    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.6, uv.getY(i) * 1.1);
                    put(array, wing, root + side * 2.4, 0.012, 0);
                    const back = new THREE.PlaneGeometry(2.6, 1.1);
                    back.rotateX(Math.PI / 2);
                    put(backing, back, root + side * 2.4, -0.012, 0);
                    put(metal, new THREE.BoxGeometry(2.66, 0.03, 0.04), root + side * 2.4, 0, 0.57);
                    put(metal, new THREE.BoxGeometry(2.66, 0.03, 0.04), root + side * 2.4, 0, -0.57);
                });
            }
            for (const [mat, geos] of parts) {
                const merged = mergeGeometries(geos);
                geos.forEach((x) => x.dispose());
                const mesh = new THREE.Mesh(merged, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                g.add(mesh);
            }
            return g;
        };
        const disposeGroup = (g: THREE.Object3D) => g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());

        // ---- the build -------------------------------------------------------
        let phase: Phase = "ready";
        // the meshes of the station as built, and the one sliding in; the
        // build itself, and its rules, are the sim's
        let layers: Layer[] = [];
        let moving: { group: THREE.Group; since: number } | null = null;
        let sim: Stack = newStack();
        let drops: number[] = [];
        let streak = 0;
        let perfectAt = 0;
        let newBest = false;
        type Piece = { mesh: THREE.Group; v: THREE.Vector3; spin: THREE.Vector3; life: number };
        let falling: Piece[] = [];
        const camTarget = new THREE.Vector3(0, 0, 0);
        let camDist = 16;
        let turn = 0;

        const clear = () => {
            station.children.slice().forEach((c) => {
                station.remove(c);
                disposeGroup(c);
            });
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
        // Today's station: which side each module comes in from, and how fast
        // it slides, seeded by the date (in the sim), so everyone builds the same one
        let daily = false;
        const clock = () => performance.now() / 1000;
        const spawnMoving = () => {
            const at = movingAt(sim, 0);
            const group = makeModule(at.w, at.d, sim.layers.length);
            group.position.set(at.x, at.y, at.z);
            station.add(group);
            moving = { group, since: clock() };
        };
        const score = () => Math.max(0, sim.layers.length - 1);
        const pushHud = () => setHud({ drops: phase === "over" ? drops.slice() : [], daily, score: score(), best, phase, perfect: perfectAt, streak, newBest });

        const begin = (asDaily = daily) => {
            if (asDaily !== live) followIss(asDaily);
            daily = asDaily;
            sim = newStack(daily ? todayKey() : null);
            drops = [];
            clear();
            phase = "playing";
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
            station.add(g);
            falling.push({ mesh: g, v: push.clone().add(new THREE.Vector3(0, 0.6, 0)), spin: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3), life: 4 });
        };
        const place = () => {
            if (phase !== "playing") {
                begin();
                return;
            }
            if (!moving) return;
            // when, to the millisecond (the same rounding the server replays with)
            const t = roundTime(clock() - moving.since);
            drops.push(t);
            station.remove(moving.group);
            disposeGroup(moving.group);
            moving = null;
            const n = sim.layers.length;
            const r = dropModule(sim, t);
            const push = (axis: "x" | "z", sign: number, k: number) => new THREE.Vector3(axis === "x" ? sign * k : 0, 0, axis === "z" ? sign * k : 0);
            if (r.kind === "miss") {
                // missed it entirely: the module falls, and that's the build
                tumble(r.at.w, r.at.d, r.at.x, r.at.y, r.at.z, n, push(r.axis, r.sign, 2));
                end();
                return;
            }
            if (r.kind === "perfect") {
                streak = r.streak;
                perfectAt = Date.now();
                sfxPerfect(streak);
            } else {
                streak = 0;
                tumble(r.cut.w, r.cut.d, r.cut.x, r.cut.y, r.cut.z, n, push(r.axis, r.sign, 1.5));
                sfxSlice();
                sfxPlace(0);
            }
            layers.push(addLayer({ group: null as unknown as THREE.Group, ...r.placed }, n));
            spawnMoving();
            pushHud();
        };
        drop.current = place;
        start.current = (d?: boolean) => begin(d);
        const end = () => {
            phase = "over";
            const s = score();
            trackEvent("stack_station_over", { modules: s });
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
            // (not while signing the leaderboard)
            if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
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
        let shadowSize = 0;
        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (document.hidden) return;
            // the sliding module, back and forth
            if (moving && phase === "playing" && sim.moving) {
                const at = movingAt(sim, clock() - moving.since);
                moving.group.position.set(at.x, at.y, at.z);
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
                station.remove(f.mesh);
                disposeGroup(f.mesh);
                return false;
            });
            // the camera: at the top of the build, and pulled back to show it all when it's over
            const topY = layers.length ? layers[layers.length - 1].y : 0;
            const height = topY + H;
            const wantY = phase === "over" ? height / 2 : topY;
            const wantDist = phase === "over" ? Math.max(16, height * 1.6 + 8) : phase === "ready" ? 18 : 16;
            camTarget.y += (wantY - camTarget.y) * Math.min(1, dt * 2.5);
            camDist += (wantDist - camDist) * Math.min(1, dt * 1.8);
            camera.position.set(Math.cos(Math.PI / 4) * camDist, camTarget.y + camDist * 0.62, Math.sin(Math.PI / 4) * camDist);
            camera.lookAt(0, camTarget.y, 0);
            // between builds the station turns slowly in the sunlight; while
            // building it comes back square to the camera
            if (phase === "playing") turn -= turn * Math.min(1, dt * 4);
            else turn += dt / 9;
            station.rotation.y = turn;
            // the sun's shadows, over whatever is in view
            const size = Math.max(9, camDist * 0.75);
            if (Math.abs(size - shadowSize) > 0.5) {
                shadowSize = size;
                const c = sun.shadow.camera;
                c.left = c.bottom = -size;
                c.right = c.top = size;
                c.far = size * 4 + 60;
                c.updateProjectionMatrix();
            }
            sun.target.position.set(0, camTarget.y, 0);
            sun.position.copy(sunDir).multiplyScalar(size * 2 + 30).add(sun.target.position);
            // the Earth and the sky stay where they are as the build rises
            earth.position.copy(EARTH_AT).add(camTarget);
            air.position.copy(earth.position);
            airMat.uniforms.uCenter.value.copy(earth.position);
            stars.position.copy(camera.position);
            if (live) {
                // (the ISS moves on: the Earth turns after it, smoothly)
                if (haveFix) {
                    if (liveSnap) earth.quaternion.copy(liveTurn);
                    else earth.quaternion.slerp(liveTurn, Math.min(1, dt * 0.8));
                    liveSnap = false;
                    // the real Sun, where it is from here; in Earth's shadow the
                    // station dims too (a soft fill stays, so it can be played)
                    sunDir.copy(sunLocal).applyQuaternion(earth.quaternion).normalize();
                    const lit = THREE.MathUtils.smoothstep(sunDir.dot(upW), -0.42, -0.26);
                    sun.intensity += (0.35 + 2.85 * lit - sun.intensity) * Math.min(1, dt * 2);
                    ambient.intensity = 0.12 + 0.25 * (1 - lit);
                }
                auroraMat.uniforms.uTime.value = now / 1000;
            } else earth.rotateY(dt * 0.004);
            earthMat.uniforms.uCloudShift.value += dt * 0.0004;
            renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(loop);
        // a hub to look at on the title screen
        layers.push(addLayer({ group: null as unknown as THREE.Group, w: BASE, d: BASE, x: 0, z: 0, y: 0 }, 0));
        pushHud();

        return () => {
            stopIss?.();
            window.clearTimeout(giveUp);
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener("keydown", onKey);
            cv.removeEventListener("pointerdown", onDown);
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                m.geometry?.dispose();
                const mat = m.material as THREE.Material | undefined;
                if (mat && !sharedMats.includes(mat)) mat.dispose();
            });
            Object.values(earthMat.uniforms).forEach((u) => (u.value as THREE.Texture)?.isTexture && (u.value as THREE.Texture).dispose());
            [white.map, white.normal, grey.map, grey.normal, foilNormal, cellMap].forEach((t) => t.dispose());
            sharedMats.forEach((m) => m.dispose());
            sky.dispose();
            env.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    if (noGl) return <NoWebGL onExit={onExit} title="Stack the Station" />;
    return (
        <div className="fixed inset-0 z-50 bg-black text-white">
            <div ref={mount} className={`absolute inset-0 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`} aria-label="Stack the Station: a 3D game" role="application" />
            {!loaded && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-teal-300/80">Fuelling up…</p>
                </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center p-6 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Modules</p>
                <p className="font-display text-5xl font-bold">{hud.score}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">Best {hud.best}</p>
                {hud.daily && over && (
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-sky-200/80">
                        The real ISS is over {Math.abs(over.lat).toFixed(1)}° {over.lat >= 0 ? "N" : "S"}, {Math.abs(over.lon).toFixed(1)}° {over.lon >= 0 ? "E" : "W"}
                        {over.shadow ? " · in Earth's shadow" : " · in sunlight"}
                    </p>
                )}
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
                <FullscreenButton className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:border-white/30 hover:text-white" />
            </div>
            {hud.phase === "playing" && (
                <p className="pointer-events-none absolute bottom-5 right-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    <span className="hidden sm:inline">Space, Enter or click to drop · M mute</span>
                    <span className="sm:hidden">Tap to drop</span>
                </p>
            )}

            {hud.phase !== "playing" && loaded && (
                // a tap anywhere starts, as well as the button
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 pb-24 sm:items-center sm:pb-6">
                    <div className="pointer-events-auto max-w-sm rounded-2xl border border-teal-400/25 bg-black/60 p-6 text-center backdrop-blur-md">
                        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">{hud.phase === "over" ? (hud.daily ? "Build over · today's station" : "Build over") : "Crew arcade · 03"}</p>
                        <h1 className="font-display mt-2 text-3xl font-bold">{hud.phase === "over" ? `${hud.score} modules` : "Stack the Station"}</h1>
                        {hud.phase === "over" && hud.newBest && <p className="mt-1 text-sm text-amber-300">Your tallest station yet!</p>}
                        {hud.phase === "over" &&
                            (hud.daily ? (
                                <Board key="daily" game="stack-daily" day={todayKey()} score={hud.score} drops={hud.drops} title="Today's station" format={(n) => `${n} ${n === 1 ? "module" : "modules"}`} />
                            ) : (
                                <Board key="all" game="stack-station" score={hud.score} drops={hud.drops} format={(n) => `${n} ${n === 1 ? "module" : "modules"}`} />
                            ))}
                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                            Drop each module onto the one below. Whatever hangs over the edge is sliced off, so line them up. Land one exactly for a Perfect.
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <button type="button" onClick={() => start.current(hud.phase === "over" ? undefined : false)} className="rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-teal-300">
                                {hud.phase === "over" ? "Build again" : "Start building"}
                            </button>
                            {/* the same station for everyone today, with its own board */}
                            <button
                                type="button"
                                onClick={() => start.current(!(hud.phase === "over" && hud.daily))}
                                className="rounded-full border border-teal-300/40 px-5 py-2.5 text-sm text-teal-200 hover:border-teal-300/70"
                            >
                                {hud.phase === "over" && hud.daily ? "Build the open one" : "Today's station"}
                            </button>
                        </div>
                        {hud.phase !== "over" && (
                            <p className="mt-3 text-xs leading-snug text-sky-200/80">
                                Today&apos;s station floats over wherever the real ISS is right now, in real daylight or darkness
                                {space?.kp != null ? `, under today's aurora: space weather is ${kpWords(space.kp)} (Kp ${space.kp})` : ""}.
                                {space?.people ? ` ${space.people} people are in space right now: stack ${space.people} to fit them all.` : ""}
                            </p>
                        )}
                        {hud.phase === "over" && hud.daily && !!space?.people && (
                            <p className={`mt-3 text-xs leading-snug ${hud.score >= space.people ? "text-emerald-300" : "text-sky-200/80"}`}>
                                {hud.score >= space.people
                                    ? `Everyone aboard: ${space.people} people are in space right now, and your station holds them all.`
                                    : `${space.people} people are in space right now: ${space.people - hud.score} more ${space.people - hud.score === 1 ? "module" : "modules"} to fit them all.`}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
