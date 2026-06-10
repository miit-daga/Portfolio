"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Brief hyperspace streak whenever the user warps between sections (navbar /
// command palette). Listens for a window "warp-jump" CustomEvent and runs a
// self-contained canvas burst for its duration - zero cost while idle.
type WarpStar = { x: number; y: number; z: number; pz: number; color: string };

const COLORS = ["#ffffff", "#ffffff", "#99f6e4", "#a5b4fc"];

// Page sections in order; "" is the hero (top of page)
const SECTION_IDS = ["", "about-me", "workex", "education", "skills-achievements", "projects", "publications", "contact"];
const MIN_SECTIONS_FOR_WARP = 2;

// Dispatch a warp only when the jump skips several sections, not for hops to a
// neighbour. Call right before starting the scroll.
export function warpForJump(targetHash: string, duration = 850) {
    const targetIdx = SECTION_IDS.indexOf(targetHash.replace("#", ""));
    if (targetIdx === -1) return;
    // Current section: the last one whose top sits above the viewport centre
    const mid = window.scrollY + window.innerHeight / 2;
    let currentIdx = 0;
    for (let i = 0; i < SECTION_IDS.length; i++) {
        const el = SECTION_IDS[i] ? document.getElementById(SECTION_IDS[i]) : null;
        const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
        if (top <= mid) currentIdx = i;
    }
    if (Math.abs(targetIdx - currentIdx) >= MIN_SECTIONS_FOR_WARP) {
        window.dispatchEvent(new CustomEvent("warp-jump", { detail: { duration } }));
    }
}

export const WarpOverlay = () => {
    const reduce = useReducedMotion();
    const [active, setActive] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const endRef = useRef(0);
    const startRef = useRef(0);
    const durRef = useRef(900);

    useEffect(() => {
        const onWarp = (e: Event) => {
            if (reduce) return;
            const dur = (e as CustomEvent).detail?.duration ?? 900;
            const now = performance.now();
            durRef.current = dur;
            startRef.current = now;
            endRef.current = now + dur;
            setActive(true);
        };
        window.addEventListener("warp-jump", onWarp);
        return () => window.removeEventListener("warp-jump", onWarp);
    }, [reduce]);

    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.min(120, Math.max(50, Math.floor((w * h) / 14000)));
        const stars: WarpStar[] = Array.from({ length: count }, () => ({
            x: (Math.random() * 2 - 1) * 0.9,
            y: (Math.random() * 2 - 1) * 0.9,
            z: Math.random() * 0.9 + 0.1,
            pz: 0,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        }));

        let raf = 0;
        let last = performance.now();

        const loop = (now: number) => {
            if (now >= endRef.current) {
                setActive(false);
                return;
            }
            const dtNorm = Math.min(3, (now - last) / 16.7);
            last = now;
            // Envelope: quick ramp-in, hold, ease-out tail
            const p = (now - startRef.current) / durRef.current;
            const env = p < 0.22 ? p / 0.22 : p > 0.62 ? Math.max(0, (1 - p) / 0.38) : 1;

            ctx.clearRect(0, 0, w, h);
            const scale = Math.min(w, h) * 0.5;
            const speed = 0.09 * env * dtNorm;
            for (const s of stars) {
                s.pz = s.z;
                s.z -= speed;
                if (s.z <= 0.05) {
                    s.x = (Math.random() * 2 - 1) * 0.9;
                    s.y = (Math.random() * 2 - 1) * 0.9;
                    s.z = Math.random() * 0.5 + 0.5;
                    s.pz = s.z;
                    continue;
                }
                const px = w / 2 + (s.x / s.pz) * scale;
                const py = h / 2 + (s.y / s.pz) * scale;
                const cx = w / 2 + (s.x / s.z) * scale;
                const cy = h / 2 + (s.y / s.z) * scale;
                if (cx < -60 || cx > w + 60 || cy < -60 || cy > h + 60) {
                    s.z = Math.random() * 0.5 + 0.5;
                    continue;
                }
                const depth = 1 - s.z;
                ctx.globalAlpha = Math.min(0.55, (0.15 + depth * 0.45)) * env;
                ctx.strokeStyle = s.color;
                ctx.lineWidth = Math.max(0.6, depth * 2);
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(cx, cy);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [active]);

    if (!active) return null;
    return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[90] h-full w-full" aria-hidden />;
};
