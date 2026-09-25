import * as THREE from "three";
import { glowTexture, loadTexture } from "./space";

// The worlds past the Earth on Asteroid Run's tour (the Earth itself is
// earth.ts): the Moon, Mars, Jupiter, Saturn with its rings, Uranus, Neptune
// and Pluto, each its real map (Solar System Scope; the Moon, NASA's LROC;
// Pluto, New Horizons' global colour map, NASA PIA19956, whose unphotographed
// half is filled with a plain terrain colour, blended in at the edges) lit
// by a sun that turns as the run goes round it, so each has its day and night
// side, with a thin glow of air at the rim where it has any. Each fades in from
// far off and out again as it's left behind.

export type WorldKey = "moon" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";

const MAPS: Record<WorldKey, string> = {
    moon: "planet-moon.jpg",
    mars: "planet-mars.jpg",
    jupiter: "planet-jupiter.jpg",
    saturn: "planet-saturn.jpg",
    uranus: "planet-uranus.jpg",
    neptune: "planet-neptune.jpg",
    pluto: "planet-pluto.jpg",
};
// the colour and strength of each one's air at the rim (as Gravity Assist draws them)
const AIR: Partial<Record<WorldKey, [number, number, number, number]>> = {
    mars: [1, 0.65, 0.45, 0.35],
    jupiter: [0.95, 0.85, 0.7, 0.35],
    saturn: [0.95, 0.88, 0.7, 0.3],
    uranus: [0.6, 0.9, 1, 0.7],
    neptune: [0.4, 0.7, 1, 0.9],
    // (Pluto's thin air: the blue haze New Horizons saw layered over it)
    pluto: [0.55, 0.72, 1, 0.3],
};
// turned so a world's best-known face greets the way in (Pluto: its heart)
const FACE: Partial<Record<WorldKey, number>> = { pluto: -Math.PI / 2 };

const vert = /* glsl */ `
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
const frag = /* glsl */ `
    uniform sampler2D uMap;
    uniform vec3 uSun;
    uniform vec4 uAir;
    uniform float uAlpha;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vW;
    void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        float ndl = dot(N, normalize(uSun));
        vec3 ground = texture2D(uMap, vUv).rgb;
        // lit by the sun, with the faintest light on the night side
        vec3 col = ground * (max(ndl, 0.0) * 1.9 + 0.012);
        // the air, thickest toward the edge, on the sunlit side
        float edge = pow(1.0 - max(dot(N, V), 0.0), 2.5);
        col = mix(col, uAir.rgb * 1.3 * smoothstep(-0.15, 0.35, ndl), clamp(edge * 0.8 * uAir.a, 0.0, 1.0));
        gl_FragColor = vec4(col, uAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;

/** One world of the tour, `radius` across, lit from `sun` (a world direction, turned by the caller). */
export function buildWorld(renderer: THREE.WebGLRenderer, key: WorldKey, radius: number, sun: THREE.Vector3) {
    let loaded = false;
    const manager = new THREE.LoadingManager(() => (loaded = true));
    const loader = new THREE.TextureLoader(manager);
    const air = AIR[key] ?? [0, 0, 0, 0];
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uMap: { value: loadTexture(renderer, loader, MAPS[key]) },
            uSun: { value: sun },
            uAir: { value: new THREE.Vector4(...air) },
            uAlpha: { value: 1 },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
    });
    const group = new THREE.Group();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
    globe.rotation.y = FACE[key] ?? 0;
    group.add(globe);
    // Saturn's rings, in its equator: the real ring's colour and gaps, from the inside out
    let ringMat: THREE.MeshBasicMaterial | null = null;
    if (key === "saturn") {
        const inner = radius * 1.24;
        const outer = radius * 2.27;
        const rg = new THREE.RingGeometry(inner, outer, 180, 1);
        const uv = rg.getAttribute("uv") as THREE.BufferAttribute;
        const p = rg.getAttribute("position") as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, (Math.hypot(p.getX(k), p.getY(k)) - inner) / (outer - inner), 0.5);
        const tex = loadTexture(renderer, loader, "saturn-ring.png");
        ringMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, color: 0xd8cfbd, fog: false });
        const ring = new THREE.Mesh(rg, ringMat);
        // in the equator, tilted toward the way in (as Saturn's are, some
        // 27 degrees), so it's seen as a ring and not edge on
        ring.rotation.x = -Math.PI / 2 + 0.47;
        group.add(ring);
    }
    return {
        group,
        radius,
        ready: () => loaded,
        setAlpha(a: number) {
            mat.uniforms.uAlpha.value = a;
            globe.visible = a > 0.001;
            if (ringMat) ringMat.opacity = a;
        },
        /** turning slowly on its own axis */
        update(dt: number) {
            globe.rotation.y += dt * 0.03;
        },
        dispose() {
            (mat.uniforms.uMap.value as THREE.Texture).dispose();
            ringMat?.map?.dispose();
        },
    };
}
export type World = ReturnType<typeof buildWorld>;

// ---- the last two stops: the Sun, and a black hole --------------------------
// Their looks are Gravity Assist's (its shaders, copied, so that game is left
// as it is), with a fade in and out for the tour.

// A black hole's accretion disk: gas swirling in, faster toward the middle,
// white-hot at its inner edge and cooling to orange, and brighter on the side
// coming toward you (the pattern is read round a circle, so it has no seam)
const diskFrag = /* glsl */ `
    uniform float uTime;
    uniform float uAlpha;
    uniform float uIn;
    uniform float uOut;
    varying vec2 vP;
    float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
    }
    void main() {
        float r = length(vP);
        float t = clamp((r - uIn) / (uOut - uIn), 0.0, 1.0);
        float a = atan(vP.y, vP.x);
        float turn = a - uTime * (0.9 / (0.25 + t));
        vec2 c = vec2(cos(turn), sin(turn));
        float streak = n2(c * 3.0 + r * 1.4) * 0.6 + n2(c * 7.0 + r * 3.1) * 0.4;
        float heat = pow(1.0 - t, 2.2);
        vec3 col = mix(vec3(1.0, 0.33, 0.05), vec3(1.0, 0.93, 0.78), heat);
        float doppler = 0.5 + 0.5 * sin(a + 0.7);
        float edge = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.7, 1.0, t));
        gl_FragColor = vec4(col * (0.18 + heat * 1.2) * (0.35 + streak) * (0.12 + doppler * 1.25) * edge * uAlpha, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;
// The Sun: churning granules, darker toward its edge, far brighter than anything else
const sunFrag = /* glsl */ `
    uniform float uTime;
    uniform float uAlpha;
    uniform float uClose;
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
        // close over it, finer granules, and deeper between them
        float fine = n3(p * 70.0 + uTime * 0.25) * 0.6 + n3(p * 180.0 - uTime * 0.4) * 0.4;
        g = mix(g, g * 0.45 + fine * 0.55, uClose);
        vec3 limb = mix(vec3(1.0, 0.3, 0.04), vec3(1.0, 0.72, 0.3), pow(mu, 0.6));
        vec3 c = limb * mix(mix(0.7, 0.35, uClose), 1.35, g * g * 1.4) * (0.45 + 0.55 * pow(mu, 0.5)) * mix(1.05, 0.9, uClose);
        vec3 hot = mix(vec3(0.8, 0.14, 0.01), vec3(1.5, 0.92, 0.38), smoothstep(0.3, 0.78, g)) * (0.55 + 0.45 * pow(mu, 0.4));
        c = mix(c, hot, uClose);
        gl_FragColor = vec4(c, uAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }`;

const SUN_VERT = "varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";

/** The Sun, `radius` across: churning granules, its glow, and the corona beyond. */
export function buildSun(radius: number) {
    const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uClose: { value: 0 } }, vertexShader: SUN_VERT, fragmentShader: sunFrag, transparent: true });
    const group = new THREE.Group();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
    group.add(globe);
    const warm = glowTexture("rgba(255,190,110,1)", "rgba(255,110,20,0)");
    const glows = (
        [
            [2.4, 1],
            [3.4, 0.7],
            [5.5, 0.4],
        ] as const
    ).map(([k, o]) => {
        const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: warm, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: o }));
        g.scale.setScalar(radius * k);
        g.userData.o = o;
        group.add(g);
        return g;
    });
    let t = 0;
    let alpha = 1;
    return {
        group,
        radius,
        ready: () => true,
        setAlpha(a: number) {
            alpha = a;
            mat.uniforms.uAlpha.value = a;
            globe.visible = a > 0.001;
        },
        update(dt: number) {
            t += dt;
            mat.uniforms.uTime.value = t;
            globe.rotation.y += dt * 0.02;
            // the glow is for seeing it from afar: close in (the view from the
            // game's camera, near the origin) it would fill the screen
            const far = THREE.MathUtils.smoothstep(group.position.length(), radius * 1.6, radius * 5);
            glows.forEach((g) => ((g.material as THREE.SpriteMaterial).opacity = g.userData.o * alpha * far));
            mat.uniforms.uClose.value = 1 - far;
        },
        dispose() {
            warm.dispose();
        },
    };
}

/** A black hole: its shadow `radius` across, the accretion disk round it, and its photon ring. */
export function buildBlackHole(radius: number) {
    const group = new THREE.Group();
    // the shadow, black
    const hole = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, fog: false }));
    group.add(hole);
    // the disk, in its equator, tilted toward the way in so it's seen as a disk
    const inner = radius * 1.35;
    const outer = radius * 3.8;
    const hot = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uIn: { value: inner }, uOut: { value: outer } },
        vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: diskFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
    const disk = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 180, 8), hot);
    disk.rotation.x = -Math.PI / 2 + 0.35;
    group.add(disk);
    // light bent all the way round: a thin bright circle round the shadow
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.6, "rgba(0,0,0,0)");
    grad.addColorStop(0.69, "rgba(255,236,200,0.95)");
    grad.addColorStop(0.75, "rgba(255,160,70,0.45)");
    grad.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const ringTex = new THREE.CanvasTexture(c);
    ringTex.colorSpace = THREE.SRGBColorSpace;
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    ring.scale.setScalar(radius * 3.6);
    group.add(ring);
    let t = 0;
    return {
        group,
        radius,
        ready: () => true,
        setAlpha(a: number) {
            (hole.material as THREE.MeshBasicMaterial).opacity = a;
            hot.uniforms.uAlpha.value = a;
            (ring.material as THREE.SpriteMaterial).opacity = a;
            group.visible = a > 0.001;
        },
        update(dt: number) {
            t += dt;
            hot.uniforms.uTime.value = t;
        },
        dispose() {
            ringTex.dispose();
        },
    };
}

/** Any stop on the tour, by its key. */
export function buildStop(renderer: THREE.WebGLRenderer, key: string, radius: number, sun: THREE.Vector3) {
    if (key === "sun") return buildSun(radius);
    if (key === "blackhole") return buildBlackHole(radius);
    return buildWorld(renderer, key as WorldKey, radius, sun);
}
export type Stop = ReturnType<typeof buildStop>;
