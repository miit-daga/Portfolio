"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// DEFENSE MODE: asteroids drift over the real page, the cursor becomes a
// targeting reticle, click to blast them. Launched from the command palette via
// a window "defense-mode" CustomEvent; mounts nothing while idle.
const SESSION_S = 45;

type Asteroid = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vrot: number; verts: number[] };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };
type Ring = { x: number; y: number; life: number; max: number };
type Summary = { score: number; hit: number; fired: number; escaped: number; best: number };

let audioCtx: AudioContext | null = null;
function blip(freq: number, type: OscillatorType, dur: number, vol: number) {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const ctx = audioCtx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.4), now + dur);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
    } catch {
        /* ignore */
    }
}

export const DefenseMode = () => {
    const [playing, setPlaying] = useState(false);
    const [summary, setSummary] = useState<Summary | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const onStart = () => {
            setSummary(null);
            setPlaying(true);
        };
        window.addEventListener("defense-mode", onStart);
        return () => window.removeEventListener("defense-mode", onStart);
    }, []);

    useEffect(() => {
        if (!playing) return;
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

        document.body.style.overflow = "hidden";

        let asteroids: Asteroid[] = [];
        let sparks: Spark[] = [];
        let rings: Ring[] = [];
        let score = 0;
        let hit = 0;
        let fired = 0;
        let escaped = 0;
        let mouse = { x: w / 2, y: h / 2 };
        let raf = 0;
        const start = performance.now();
        let lastSpawn = 0;
        let ended = false;

        const spawn = () => {
            const side = Math.floor(Math.random() * 4);
            const r = 15 + Math.random() * 16;
            let x = 0, y = 0;
            if (side === 0) { x = -r; y = Math.random() * h; }
            else if (side === 1) { x = w + r; y = Math.random() * h; }
            else if (side === 2) { x = Math.random() * w; y = -r; }
            else { x = Math.random() * w; y = h + r; }
            // Aim roughly across the screen with some scatter
            const tx = w * (0.25 + Math.random() * 0.5);
            const ty = h * (0.25 + Math.random() * 0.5);
            const ang = Math.atan2(ty - y, tx - x);
            const sp = 0.7 + Math.random() * 1;
            asteroids.push({
                x, y, r,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp,
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.02,
                verts: Array.from({ length: 9 }, () => 0.75 + Math.random() * 0.4),
            });
        };

        const finish = () => {
            if (ended) return;
            ended = true;
            cancelAnimationFrame(raf);
            let best = 0;
            try {
                best = parseInt(localStorage.getItem("defense-highscore") || "0", 10) || 0;
                if (score > best) {
                    best = score;
                    localStorage.setItem("defense-highscore", String(best));
                }
            } catch {
                /* ignore */
            }
            setSummary({ score, hit, fired, escaped, best });
            setPlaying(false);
        };

        const onMove = (e: PointerEvent) => {
            mouse = { x: e.clientX, y: e.clientY };
        };
        const onClick = (e: PointerEvent) => {
            fired++;
            const cx = e.clientX;
            const cy = e.clientY;
            blip(740, "square", 0.07, 0.04);
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const a = asteroids[i];
                const dx = a.x - cx;
                const dy = a.y - cy;
                if (dx * dx + dy * dy <= (a.r + 6) * (a.r + 6)) {
                    asteroids.splice(i, 1);
                    hit++;
                    score += 10;
                    blip(170, "sawtooth", 0.2, 0.06);
                    rings.push({ x: a.x, y: a.y, life: 0, max: 18 });
                    for (let k = 0; k < 10; k++) {
                        const ang = (k / 10) * Math.PI * 2 + Math.random() * 0.4;
                        const sp = 1.5 + Math.random() * 2.5;
                        sparks.push({ x: a.x, y: a.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 22 + Math.random() * 14 });
                    }
                    return;
                }
            }
            rings.push({ x: cx, y: cy, life: 0, max: 10 });
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                finish();
            }
        };

        window.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerdown", onClick);
        window.addEventListener("keydown", onKey);

        const loop = (now: number) => {
            const elapsed = (now - start) / 1000;
            const remaining = Math.max(0, SESSION_S - elapsed);

            // Spawn rate ramps from ~1 per 2s to ~1 per 0.8s
            const interval = Math.max(800, 2000 - elapsed * 28);
            if (remaining > 0 && now - lastSpawn > interval) {
                lastSpawn = now;
                spawn();
            }
            if (remaining <= 0 && asteroids.length === 0) {
                finish();
                return;
            }

            // Update
            for (const a of asteroids) {
                a.x += a.vx;
                a.y += a.vy;
                a.rot += a.vrot;
            }
            const before = asteroids.length;
            asteroids = asteroids.filter((a) => a.x > -60 && a.x < w + 60 && a.y > -60 && a.y < h + 60);
            escaped += before - asteroids.length;

            // Draw
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
            ctx.fillRect(0, 0, w, h);

            for (const a of asteroids) {
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.beginPath();
                for (let i = 0; i < a.verts.length; i++) {
                    const ang = (i / a.verts.length) * Math.PI * 2;
                    const rr = a.r * a.verts[i];
                    if (i === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
                    else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
                }
                ctx.closePath();
                ctx.fillStyle = "#3f4a5a";
                ctx.fill();
                ctx.strokeStyle = "rgba(148,163,184,0.6)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }

            for (let i = sparks.length - 1; i >= 0; i--) {
                const p = sparks[i];
                p.life++;
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.95;
                p.vy *= 0.95;
                if (p.life >= p.max) {
                    sparks.splice(i, 1);
                    continue;
                }
                const lr = 1 - p.life / p.max;
                ctx.globalAlpha = lr;
                ctx.fillStyle = "#5eead4";
                ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
            }
            ctx.globalAlpha = 1;

            for (let i = rings.length - 1; i >= 0; i--) {
                const r = rings[i];
                r.life++;
                if (r.life >= r.max) {
                    rings.splice(i, 1);
                    continue;
                }
                const t = r.life / r.max;
                ctx.globalAlpha = (1 - t) * 0.8;
                ctx.strokeStyle = "#2dd4bf";
                ctx.lineWidth = 2 * (1 - t) + 0.5;
                ctx.beginPath();
                ctx.arc(r.x, r.y, 6 + t * 36, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Reticle
            ctx.strokeStyle = "rgba(94,234,212,0.95)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 11, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            for (const [dx1, dy1, dx2, dy2] of [[-18, 0, -7, 0], [7, 0, 18, 0], [0, -18, 0, -7], [0, 7, 0, 18]]) {
                ctx.moveTo(mouse.x + dx1, mouse.y + dy1);
                ctx.lineTo(mouse.x + dx2, mouse.y + dy2);
            }
            ctx.stroke();

            // HUD
            ctx.fillStyle = "rgba(153,246,228,0.95)";
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`DEFENSE MODE  ·  SCORE ${score}  ·  ${Math.ceil(remaining)}s  ·  ESC to stand down`, w / 2, 28);

            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            document.body.style.overflow = "";
            window.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerdown", onClick);
            window.removeEventListener("keydown", onKey);
        };
    }, [playing]);

    return (
        <>
            {playing && (
                <canvas
                    ref={canvasRef}
                    data-defense-mode
                    className="fixed inset-0 z-[8000] h-full w-full"
                    style={{ cursor: "none", touchAction: "none" }}
                    aria-label="Defense mode mini-game"
                />
            )}
            <AnimatePresence>
                {summary && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[8000] flex items-center justify-center px-4"
                    >
                        <div className="absolute inset-0 bg-black/80" onClick={() => setSummary(null)} />
                        <motion.div
                            initial={{ scale: 0.92, y: 14, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.92, y: 14, opacity: 0 }}
                            className="relative z-10 w-full max-w-sm rounded-2xl border border-teal-500/30 bg-neutral-950/95 p-7 text-center shadow-[0_0_40px_rgba(45,212,191,0.2)]"
                        >
                            <h3 className="font-mono text-sm uppercase tracking-[0.3em] text-teal-300">Defense Report</h3>
                            <p className="mt-4 text-4xl font-bold text-white">{summary.score}</p>
                            <p className="mt-1 text-xs text-neutral-500">points &middot; best {summary.best}</p>
                            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-lg font-bold text-teal-300">{summary.hit}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">destroyed</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-teal-300">
                                        {summary.fired ? Math.round((summary.hit / summary.fired) * 100) : 0}%
                                    </p>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">accuracy</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-amber-300">{summary.escaped}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">escaped</p>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        setSummary(null);
                                        setPlaying(true);
                                    }}
                                    className="w-full rounded-full border border-teal-500/40 bg-teal-500/15 px-5 py-2.5 text-sm font-medium text-teal-200 transition-colors hover:bg-teal-500/25"
                                >
                                    Defend Again
                                </button>
                                <button
                                    onClick={() => setSummary(null)}
                                    className="text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-200"
                                >
                                    Stand Down
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
