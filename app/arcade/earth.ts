import * as THREE from "three";
import { loadTexture } from "./space";

// The Earth as Stack the Station draws it (its shaders, copied, so that game
// is left as it is), for Asteroid Run's opening flyby: day and night in one,
// clouds and their shadows, the sun's glint on the sea, the blue haze toward
// the edge, and the glow of the air against space.

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

/**
 * An Earth of the given radius, lit from `sun` (a world direction), its
 * textures loading on their own (not holding up the game); `ready()` says
 * when they're in.
 */
export function buildEarth(renderer: THREE.WebGLRenderer, radius: number, sun: THREE.Vector3) {
    let loaded = false;
    const manager = new THREE.LoadingManager(() => (loaded = true));
    const loader = new THREE.TextureLoader(manager);
    const earthMat = new THREE.ShaderMaterial({
        uniforms: {
            uDay: { value: loadTexture(renderer, loader, "earth-day.jpg") },
            uNight: { value: loadTexture(renderer, loader, "earth-night.jpg") },
            uWater: { value: loadTexture(renderer, loader, "earth-water.jpg", false) },
            uClouds: { value: loadTexture(renderer, loader, "earth-clouds.jpg", false) },
            uSun: { value: sun },
            uCloudShift: { value: 0 },
        },
        vertexShader: earthVert,
        fragmentShader: earthFrag,
    });
    const group = new THREE.Group();
    const earth = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), earthMat);
    group.add(earth);
    const airMat = new THREE.ShaderMaterial({
        uniforms: { uCenter: { value: new THREE.Vector3() }, uR: { value: radius }, uH: { value: radius * 0.012 }, uSun: { value: sun } },
        vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
        fragmentShader: airFrag,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, 128, 96), airMat));
    return {
        group,
        earth,
        ready: () => loaded,
        /** turning slowly, the clouds a little faster; the air centred on it */
        update(dt: number) {
            earth.rotation.y += dt * 0.02;
            earthMat.uniforms.uCloudShift.value += dt * 0.0006;
            group.getWorldPosition(airMat.uniforms.uCenter.value);
        },
        /** a bigger or smaller Earth (its air scaled to match) */
        setScale(k: number) {
            group.scale.setScalar(k);
            airMat.uniforms.uR.value = radius * k;
            airMat.uniforms.uH.value = radius * 0.012 * k;
        },
        dispose() {
            Object.values(earthMat.uniforms).forEach((u) => (u.value as THREE.Texture)?.isTexture && (u.value as THREE.Texture).dispose());
        },
    };
}
