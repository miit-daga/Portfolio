// The Sun's disc, drawn once into a canvas and then only scaled: for the
// journeys on the ISRO page (app/isro/bodies.ts) and the big Sun in the
// site's background (components/ui/animated-background.tsx). No map exists
// for it, so its granulation is noise.

/** Value noise, for the Sun's granulation. */
function noise(seed: number) {
    const hash = (x: number, y: number) => {
        let h = (x * 374761393 + y * 668265263 + seed * 69069) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    return (x: number, y: number) => {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const fx = x - xi;
        const fy = y - yi;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const a = hash(xi, yi);
        const b = hash(xi + 1, yi);
        const c = hash(xi, yi + 1);
        const d = hash(xi + 1, yi + 1);
        return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
    };
}

/**
 * The Sun's disc, `size` px across: granulation, and darkening toward the limb
 * as the real Sun's does. "white" is its true colour, near white at the centre;
 * "fire" is the deep orange of filtered pictures of it (as NASA's visible-light
 * ones look), which reads as the Sun against a dark page.
 */
export function renderSunDisc(size: number, tone: "white" | "fire" = "white") {
    const SIZE = size;
    const c = document.createElement("canvas");
    c.width = c.height = SIZE;
    const g = c.getContext("2d")!;
    const img = g.createImageData(SIZE, SIZE);
    const r = SIZE / 2 - 1;
    const n1 = noise(7);
    const n2 = noise(19);
    for (let py = 0; py < SIZE; py++) {
        for (let px = 0; px < SIZE; px++) {
            const nx = (px + 0.5 - SIZE / 2) / r;
            const ny = (py + 0.5 - SIZE / 2) / r;
            const d2 = nx * nx + ny * ny;
            if (d2 > 1) continue;
            const mu = Math.sqrt(1 - d2);
            // granulation: fine cells, foreshortened toward the limb
            const gx = nx / (0.35 + 0.65 * mu);
            // (the cells keep their size on the screen: finer noise for a bigger disc)
            const k = SIZE / 512;
            const gran = n1(gx * 38 * k + 100, ny * 38 * k + 100) * 0.6 + n2(gx * 90 * k + 50, ny * 90 * k + 50) * 0.4;
            // limb darkening (the real Sun's, roughly: I = 1 - 0.6(1 - mu))
            const warm = 1 - mu;
            const i = (py * SIZE + px) * 4;
            if (tone === "fire") {
                const I = (1 - 0.55 * (1 - mu)) * (0.8 + 0.4 * gran);
                img.data[i] = 255 * Math.min(1, I * 1.25);
                img.data[i + 1] = 255 * Math.min(1, I * (0.82 - 0.42 * warm));
                img.data[i + 2] = 255 * Math.min(1, I * (0.34 - 0.3 * warm));
            } else {
                const I = (1 - 0.6 * (1 - mu)) * (0.86 + 0.28 * gran);
                img.data[i] = 255 * Math.min(1, I * 1.08);
                img.data[i + 1] = 255 * Math.min(1, I * (0.93 - 0.3 * warm));
                img.data[i + 2] = 255 * Math.min(1, I * (0.72 - 0.55 * warm));
            }
            img.data[i + 3] = 255 * Math.min(1, (1 - Math.sqrt(d2)) * r * 1.2);
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}
