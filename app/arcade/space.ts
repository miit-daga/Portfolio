import * as THREE from "three";

// What both arcade games share: the real sky, and the tools for making
// things look real. The imagery is NASA's, in the public domain: the sky is the
// Scientific Visualization Studio's Deep Star Maps 2020 (Gaia, Hipparcos and
// Tycho-2 stars, with the Milky Way), the Earth is Blue Marble Next
// Generation with its clouds, and the city lights are Black Marble 2016.

const ASSET = "/arcade/";

/** A texture from public/arcade, as sharp as the GPU allows at a slant. */
export function loadTexture(renderer: THREE.WebGLRenderer, loader: THREE.TextureLoader, file: string, colour = true) {
    const t = loader.load(ASSET + file);
    t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
}

/** The whole sky, for scene.background: stars and the Milky Way. */
export function skyTexture(renderer: THREE.WebGLRenderer, loader: THREE.TextureLoader) {
    const t = loadTexture(renderer, loader, "sky.jpg");
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
}

/**
 * The 7,000 brightest stars of the same map, drawn again as points so they
 * stay pin-sharp at any screen size (the sky picture alone softens them). Each
 * star is 8 bytes in stars.bin: its pixel on the 8192 x 4096 map (x and y,
 * two bytes each), its brightness, and its colour.
 */
export function starPoints(radius: number, manager: THREE.LoadingManager) {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.ShaderMaterial({
        uniforms: { uScale: { value: 1 }, uBright: { value: 1 } },
        vertexShader: /* glsl */ `
            attribute float mag;
            attribute vec3 tint;
            uniform float uScale;
            varying float vMag;
            varying vec3 vTint;
            void main() {
                vMag = mag;
                vTint = tint;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = (1.5 + mag * mag * 3.5) * uScale;
            }`,
        fragmentShader: /* glsl */ `
            uniform float uBright;
            varying float vMag;
            varying vec3 vTint;
            void main() {
                vec2 p = gl_PointCoord - 0.5;
                float a = exp(-dot(p, p) * 22.0);
                if (a < 0.02) discard;
                gl_FragColor = vec4(vTint * (0.25 + vMag * vMag * 1.3) * uBright * a, 1.0);
            }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = -1;
    const url = ASSET + "stars.bin";
    manager.itemStart(url);
    fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => {
            const b = new Uint8Array(buf);
            const n = Math.floor(b.length / 8);
            const pos = new Float32Array(n * 3);
            const mag = new Float32Array(n);
            const tint = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) {
                const o = i * 8;
                // the same direction three.js reads the sky picture from
                const u = (b[o] + b[o + 1] * 256 + 0.5) / 8192;
                const v = 1 - (b[o + 2] + b[o + 3] * 256 + 0.5) / 4096;
                const lon = (u - 0.5) * Math.PI * 2;
                const lat = (v - 0.5) * Math.PI;
                pos[i * 3] = Math.cos(lat) * Math.cos(lon) * radius;
                pos[i * 3 + 1] = Math.sin(lat) * radius;
                pos[i * 3 + 2] = Math.cos(lat) * Math.sin(lon) * radius;
                mag[i] = b[o + 4] / 255;
                tint[i * 3] = b[o + 5] / 255;
                tint[i * 3 + 1] = b[o + 6] / 255;
                tint[i * 3 + 2] = b[o + 7] / 255;
            }
            geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            geo.setAttribute("mag", new THREE.BufferAttribute(mag, 1));
            geo.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
        })
        .catch(() => {})
        .finally(() => manager.itemEnd(url));
    return points;
}

/**
 * Turns the star points to match scene.background under a rotation: three.js
 * turns the background by the opposite angles, so the points follow suit.
 */
export function alignStars(points: THREE.Points, rotation: THREE.Euler) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-rotation.x, -rotation.y, -rotation.z, rotation.order));
    points.quaternion.setFromRotationMatrix(m.invert());
}

/**
 * What shiny things reflect in space: black, but for the sun, a faint glow of
 * starlight all round and, if there is one nearby, a planet's lit face in its
 * direction (`cos` is the cosine of its angular radius). Returns the map for
 * scene.environment, and a function to free it.
 */
export function spaceEnvironment(renderer: THREE.WebGLRenderer, sun: THREE.Vector3, planet?: { dir: THREE.Vector3; colour: THREE.Color; cos: number }) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const scene = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 32, 16);
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            uSun: { value: sun.clone().normalize() },
            uPlanet: { value: planet ? planet.dir.clone().normalize() : new THREE.Vector3(0, -1, 0) },
            uColour: { value: planet ? planet.colour : new THREE.Color(0) },
            uCos: { value: planet ? planet.cos : 2 },
        },
        vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: /* glsl */ `
            uniform vec3 uSun;
            uniform vec3 uPlanet;
            uniform vec3 uColour;
            uniform float uCos;
            varying vec3 vD;
            void main() {
                vec3 d = normalize(vD);
                float p = smoothstep(uCos - 0.08, uCos, dot(d, uPlanet));
                float s = pow(max(dot(d, uSun), 0.0), 900.0);
                gl_FragColor = vec4(vec3(0.03) + uColour * p + vec3(40.0) * s, 1.0);
            }`,
    });
    scene.add(new THREE.Mesh(geo, mat));
    const target = pmrem.fromScene(scene, 0.02);
    geo.dispose();
    mat.dispose();
    pmrem.dispose();
    return { texture: target.texture, dispose: () => target.dispose() };
}

/** A soft round glow, for engines and sparkles. */
export function glowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.25, inner.replace(/[\d.]+\)$/, "0.45)"));
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// ---- noise ------------------------------------------------------------------

/**
 * Ken Perlin's improved gradient noise, seeded. `period` makes it repeat
 * every so many units along x and y, for textures that tile.
 */
export function perlin(seed: number) {
    const p = new Uint8Array(512);
    const base = Array.from({ length: 256 }, (_, i) => i);
    let s = seed || 1;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    const grad = (h: number, x: number, y: number, z: number) => {
        const k = h & 15;
        const u = k < 8 ? x : y;
        const v = k < 4 ? y : k === 12 || k === 14 ? x : z;
        return ((k & 1) === 0 ? u : -u) + ((k & 2) === 0 ? v : -v);
    };
    return (x: number, y: number, z = 0, period = 256) => {
        const xf = Math.floor(x);
        const yf = Math.floor(y);
        const zf = Math.floor(z);
        const X = ((xf % period) + period) % period;
        const Y = ((yf % period) + period) % period;
        const X1 = (X + 1) % period;
        const Y1 = (Y + 1) % period;
        const Z = zf & 255;
        x -= xf;
        y -= yf;
        z -= zf;
        const u = fade(x);
        const v = fade(y);
        const w = fade(z);
        const A = p[X] + Y, AA = p[A] + Z, AB = p[p[X] + Y1] + Z;
        const B = p[X1] + Y, BA = p[B] + Z, BB = p[p[X1] + Y1] + Z;
        return lerp(
            lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u), lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
            lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u), lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v),
            w,
        );
    };
}

/** Layers of noise, each finer and fainter, for rough natural surfaces. */
export function fbm(noise: ReturnType<typeof perlin>, x: number, y: number, z: number, octaves: number, period = 256) {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let i = 0; i < octaves; i++) {
        sum += amp * noise(x * f, y * f, z * f, period * f);
        amp *= 0.5;
        f *= 2;
    }
    return sum;
}

/** A normal map from a square height field that tiles (heights 0 to 1). */
export function normalMap(height: Float32Array, size: number, strength: number) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    const img = g.createImageData(size, size);
    const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
            const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
            const l = Math.hypot(dx, dy, 1);
            const o = (y * size + x) * 4;
            img.data[o] = ((dx / l) * 0.5 + 0.5) * 255;
            img.data[o + 1] = ((dy / l) * 0.5 + 0.5) * 255;
            img.data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255;
            img.data[o + 3] = 255;
        }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    return t;
}
