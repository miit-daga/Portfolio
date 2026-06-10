"use client";
import { useEffect, useRef, useState } from "react";

// Meteor Dodge, embedded on the 404 page ("while rescue is en route...").
// Keyboard (arrows / AD) and touch (hold left/right half) steering; shares the
// terminal arcade's high score key. Only mounts on the 404 route.
const W = 360;
const H = 300;
const PW = 22;
const PH = 16;
const PY = H - 26;
const PSPEED = 4.5;

type Meteor = { x: number; y: number; r: number; vy: number };
type Phase = "idle" | "playing" | "over";

export const Dodge404 = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [phase, setPhase] = useState<Phase>("idle");
    const [score, setScore] = useState(0);
    const [high, setHigh] = useState(0);
    const phaseRef = useRef<Phase>("idle");
    phaseRef.current = phase;

    useEffect(() => {
        try {
            setHigh(parseInt(localStorage.getItem("dodge-highscore") || "0", 10) || 0);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (phase !== "playing") return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const keys: Record<string, boolean> = {};
        let pointerX: number | null = null;
        let px = W / 2 - PW / 2;
        let meteors: Meteor[] = [];
        let t = 0;
        let pts = 0;
        let spawnAcc = 0;
        let raf = 0;
        let last = performance.now();

        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (["arrowleft", "arrowright", "a", "d"].includes(k)) {
                e.preventDefault();
                keys[k] = true;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            keys[e.key.toLowerCase()] = false;
        };
        const toLocalX = (clientX: number) => {
            const rect = canvas.getBoundingClientRect();
            return ((clientX - rect.left) / rect.width) * W;
        };
        const onPointerDown = (e: PointerEvent) => {
            pointerX = toLocalX(e.clientX);
        };
        const onPointerMove = (e: PointerEvent) => {
            if (pointerX !== null) pointerX = toLocalX(e.clientX);
        };
        const onPointerUp = () => {
            pointerX = null;
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKeyUp);
        canvas.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);

        const end = () => {
            cancelAnimationFrame(raf);
            setScore(pts);
            setHigh((prev) => {
                const next = Math.max(prev, pts);
                if (next !== prev) {
                    try {
                        localStorage.setItem("dodge-highscore", String(next));
                    } catch {
                        /* ignore */
                    }
                }
                return next;
            });
            setPhase("over");
        };

        const loop = (now: number) => {
            const dt = Math.min(3, (now - last) / 25);
            last = now;
            t += dt;
            pts = Math.floor(t / 4);

            // Steering
            if (keys["arrowleft"] || keys["a"]) px -= PSPEED * dt;
            if (keys["arrowright"] || keys["d"]) px += PSPEED * dt;
            if (pointerX !== null) {
                const target = pointerX - PW / 2;
                px += Math.max(-PSPEED * dt, Math.min(PSPEED * dt, target - px));
            }
            px = Math.max(4, Math.min(W - PW - 4, px));

            // Spawning, faster over time
            spawnAcc += dt;
            const every = Math.max(9, 24 - Math.floor(t / 250));
            const fall = 2.2 + Math.min(4.5, t / 500);
            if (spawnAcc >= every) {
                spawnAcc = 0;
                const r = 8 + Math.random() * 13;
                meteors.push({ x: r + Math.random() * (W - 2 * r), y: -r, r, vy: fall + Math.random() * 1.5 });
            }
            for (const m of meteors) m.y += m.vy * dt;
            meteors = meteors.filter((m) => m.y - m.r < H + 20);

            // Collision (circle vs ship box)
            for (const m of meteors) {
                const cx = Math.max(px, Math.min(m.x, px + PW));
                const cy = Math.max(PY, Math.min(m.y, PY + PH));
                const dx = m.x - cx;
                const dy = m.y - cy;
                if (dx * dx + dy * dy < m.r * m.r) {
                    end();
                    return;
                }
            }

            // Draw
            ctx.fillStyle = "#05070a";
            ctx.fillRect(0, 0, W, H);
            for (const m of meteors) {
                ctx.fillStyle = "#94a3b8";
                ctx.shadowColor = "#94a3b8";
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#2dd4bf";
            ctx.shadowColor = "#2dd4bf";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(px + PW / 2, PY);
            ctx.lineTo(px, PY + PH);
            ctx.lineTo(px + PW, PY + PH);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(226,232,240,0.85)";
            ctx.font = "12px monospace";
            ctx.textAlign = "left";
            ctx.fillText(`SCORE ${pts}`, 10, 18);

            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKeyUp);
            canvas.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };
    }, [phase]);

    // R restarts from the game-over screen
    useEffect(() => {
        if (phase !== "over") return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "r") setPhase("playing");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase]);

    return (
        <div className="flex flex-col items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                While rescue is en route&hellip;
            </p>
            <div className="relative" style={{ width: "min(360px, 86vw)" }}>
                <canvas
                    ref={canvasRef}
                    width={W}
                    height={H}
                    className="block w-full rounded-xl border border-teal-500/30 bg-[#05070a] shadow-[0_0_24px_rgba(45,212,191,0.15)]"
                    style={{ touchAction: "none" }}
                />
                {phase !== "playing" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70">
                        {phase === "over" && (
                            <p className="font-mono text-sm text-neutral-300">
                                Score <span className="font-bold text-teal-300">{score}</span> &middot; Best{" "}
                                <span className="font-bold text-teal-300">{high}</span>
                            </p>
                        )}
                        <button
                            onClick={() => setPhase("playing")}
                            className="rounded-full border border-teal-500/50 bg-teal-500/10 px-6 py-2.5 text-sm font-medium tracking-wide text-teal-300 transition-colors hover:bg-teal-500/20 hover:text-teal-200"
                        >
                            {phase === "over" ? "Fly Again" : "Engage Thrusters"}
                        </button>
                        <p className="px-4 text-center font-mono text-[10px] text-neutral-500">
                            arrows / AD &middot; or hold &amp; drag &middot; dodge the meteors
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
