import * as THREE from "three";
import { glowTexture } from "./space";

// The arcade's small spaceship, as Asteroid Run draws it (the same parts,
// copied, so that game is left as it is), for Free flight. Its nose points
// down -z; the engine is at +z.
export function buildShip() {
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
    return { ship, flame, flameMat, engineGlow };
}
