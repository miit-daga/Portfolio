"use client";
import { useEffect, useRef } from "react";
import { SECTIONS } from "@/constants/sections";
import { resolveSkyHour, rgbCss, skyPalette, type Rgb01, type Rgb255 } from "@/lib/sky";

// The Enter ring on the entry screen used to be an empty circle around a word.
// This paints a live glimpse of the site behind the glass: the nebula in the
// visitor's hour (same table as the hero, lib/sky.ts), a slow starfield, and
// one small world drifting across the lower half, each pass in the colour of
// the next section down the page. One tiny canvas, no shadows or filters, so
// it never costs the entry screen a frame. Reduced motion gets a single still.

type Star = {
    x: number;
    y: number;
    r: number;
    phase: number;
    twinkle: number;
    drift: number;
    tint: string;
};
type World = { x: number; idx: number; ringed: boolean; wait: number };

const STAR_TINTS = ["#ffffff", "#ffffff", "#ffffff", "#99f6e4", "#c7d2fe"];
const WORLD_HEXES = SECTIONS.map((s) => s.hex);
const STAR_COUNT = 44;
// Fractions of the porthole diameter; speeds are per second
const WORLD_SPEED = 0.11;
const WORLD_Y = 0.73;
const WORLD_R = 0.11;

const hexToRgb = (hex: string): Rgb255 => {
    const n = parseInt(hex.replace("#", ""), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const shade = (c: Rgb255, f: number): Rgb255 => {
    const m = (v: number) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
    return { r: m(c.r), g: m(c.g), b: m(c.b) };
};
const mix = (a: Rgb255, b: Rgb255, t: number): Rgb255 => ({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
});
const css = (c: Rgb255, a = 1) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;

// A shaded world with an optional ring, lit from the upper-left in the sky's
// key light. Same construction as the backdrop planets, trimmed for a canvas
// a hundred pixels wide.
function drawWorld(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    hex: string,
    ringed: boolean,
    key: Rgb255,
) {
    const base = hexToRgb(hex);
    const light = mix(shade(base, 0.5), key, 0.3);
    const dark = shade(base, -0.6);
    const lx = cx - r * 0.4;
    const ly = cy - r * 0.4;
    const tilt = -0.35;

    // Atmospheric halo
    const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.9);
    halo.addColorStop(0, css(base, 0.22));
    halo.addColorStop(1, css(base, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    const ring = (half: "back" | "front") => {
        const tint = shade(base, 0.6);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.lineWidth = r * 0.16;
        ctx.strokeStyle = css(tint, half === "front" ? 0.55 : 0.22);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.75, r * 0.5, 0, half === "front" ? 0 : Math.PI, half === "front" ? Math.PI : Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    };
    if (ringed) ring("back");

    // Body: clipped sphere, terminator, specular
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const body = ctx.createRadialGradient(lx, ly, r * 0.1, cx, cy, r * 1.15);
    body.addColorStop(0, css(light));
    body.addColorStop(0.5, css(base));
    body.addColorStop(1, css(dark));
    ctx.fillStyle = body;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const term = ctx.createRadialGradient(lx, ly, r * 0.2, cx + r * 0.35, cy + r * 0.35, r * 1.45);
    term.addColorStop(0, "rgba(0, 0, 0, 0)");
    term.addColorStop(0.65, "rgba(0, 0, 0, 0)");
    term.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = term;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const spec = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.7);
    spec.addColorStop(0, css(key, 0.42));
    spec.addColorStop(1, css(key, 0));
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(lx, ly, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rim light along the lit limb
    ctx.save();
    ctx.lineWidth = Math.max(0.6, r * 0.06);
    const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rim.addColorStop(0, css(light, 0.85));
    rim.addColorStop(0.55, css(light, 0));
    ctx.strokeStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth * 0.4, Math.PI * 0.85, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();

    if (ringed) ring("front");
}

export const Porthole = ({ reduce }: { reduce: boolean | null }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const palette = skyPalette(resolveSkyHour());
        const key = palette.keyLight;
        const backdrop = rgbCss([palette.base[0] * 0.6, palette.base[1] * 0.6, palette.base[2] * 0.6]);

        let size = 0;
        const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
            x: Math.random(),
            y: Math.random(),
            r: 0.35 + Math.random() * 0.9,
            phase: Math.random() * Math.PI * 2,
            twinkle: 0.8 + Math.random() * 1.6,
            drift: 0.02 + Math.random() * 0.04,
            tint: STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)],
        }));
        // Starts just off the right edge; the still frame parks it in view
        const world: World = { x: 1 + WORLD_R * 2.4, idx: 0, ringed: true, wait: 0.6 };
        if (reduce) {
            world.x = 0.64;
            world.wait = 0;
        }

        const setup = () => {
            const rect = canvas.getBoundingClientRect();
            size = Math.max(1, Math.round(rect.width));
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(size * dpr);
            canvas.height = Math.floor(size * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        setup();

        const blob = (c: Rgb01, cx: number, cy: number, rad: number, a: number) => {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
            g.addColorStop(0, rgbCss(c, a));
            g.addColorStop(1, rgbCss(c, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, size, size);
        };

        const draw = (t: number, dt: number) => {
            const s = size;
            ctx.clearRect(0, 0, s, s);

            // Deep space behind the glass
            ctx.fillStyle = backdrop;
            ctx.fillRect(0, 0, s, s);

            // Nebula wisps in the hour's colours, drifting against each other
            blob(palette.mid, s * (0.36 + 0.08 * Math.sin(t * 0.07)), s * (0.42 + 0.06 * Math.cos(t * 0.05)), s * 0.55, 0.4);
            blob(palette.warp, s * (0.7 - 0.08 * Math.cos(t * 0.06)), s * (0.6 + 0.07 * Math.sin(t * 0.08)), s * 0.5, 0.34);
            blob(palette.filament, s * (0.5 + 0.1 * Math.sin(t * 0.04 + 1)), s * (0.35 + 0.05 * Math.cos(t * 0.09)), s * 0.28, 0.14);

            // Stars: slow leftward drift, gentle twinkle
            const px = s / 110;
            for (const st of stars) {
                st.x -= st.drift * dt;
                if (st.x < -0.02) {
                    st.x = 1.02;
                    st.y = Math.random();
                }
                ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * st.twinkle + st.phase));
                ctx.fillStyle = st.tint;
                ctx.beginPath();
                ctx.arc(st.x * s, st.y * s, st.r * px, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // The passing world: pauses off-screen between passes, then the next
            // section's colour comes round
            if (world.wait > 0) world.wait -= dt;
            else world.x -= WORLD_SPEED * dt;
            if (world.x < -WORLD_R * 2.4) {
                world.x = 1 + WORLD_R * 2.4;
                world.idx = (world.idx + 1) % WORLD_HEXES.length;
                world.ringed = !world.ringed;
                world.wait = 1.5 + Math.random() * 2.5;
            }
            drawWorld(ctx, world.x * s, WORLD_Y * s, WORLD_R * s, WORLD_HEXES[world.idx], world.ringed, key);

            // Glass: darken toward the frame so the ring reads as a real edge
            const vig = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.5);
            vig.addColorStop(0, "rgba(0, 0, 0, 0)");
            vig.addColorStop(1, "rgba(0, 0, 0, 0.6)");
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, s, s);
        };

        if (reduce) {
            draw(0, 0);
            const ro = new ResizeObserver(() => {
                setup();
                draw(0, 0);
            });
            ro.observe(canvas);
            return () => ro.disconnect();
        }

        let raf = 0;
        let last = performance.now();
        const start = last;
        const loop = (now: number) => {
            const dt = Math.min(0.1, (now - last) / 1000);
            last = now;
            draw((now - start) / 1000, dt);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const ro = new ResizeObserver(setup);
        ro.observe(canvas);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [reduce]);

    return (
        <span
            aria-hidden
            className="pointer-events-none absolute inset-2.5 overflow-hidden rounded-full opacity-90 transition-opacity duration-300 group-hover:opacity-100"
        >
            <canvas ref={canvasRef} className="block h-full w-full" />
            {/* Glass: a soft reflection across the upper-left of the pane */}
            <span
                className="absolute inset-0 rounded-full"
                style={{
                    background:
                        "linear-gradient(155deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 32%, transparent 48%)",
                }}
            />
            {/* Keeps the word legible while a world passes beneath it */}
            <span
                className="absolute inset-0 rounded-full"
                style={{
                    background: "radial-gradient(circle closest-side at 50% 50%, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 45%)",
                }}
            />
        </span>
    );
};
