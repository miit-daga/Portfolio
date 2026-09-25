import * as THREE from "three";
import { loadTexture } from "./space";

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
