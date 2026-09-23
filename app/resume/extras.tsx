"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Phosphor } from "./pdf-screen";
import type { Section } from "./pdf-screen";
import { dosColours } from "./dos";

// More of the resume computer (retro-computer.tsx):
//   Starfield  the screensaver: flying through stars, after a minute idle
//   Printer    a dot-matrix printer beside the stand; downloads print first
//   JumpMenu   a DOS menu of the resume's sections

// ---- Screensaver ----------------------------------------------------------

export function Starfield({ phosphor }: { phosphor: Phosphor }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const fit = () => {
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(canvas);
        const colour = phosphor === "green" ? "74,222,128" : phosphor === "amber" ? "251,191,36" : "255,255,255";
        // Stars in 3D, streaming out of the middle
        const stars = Array.from({ length: 260 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
        let raf = 0;
        let last = performance.now();
        const frame = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const w = canvas.width;
            const h = canvas.height;
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(0, 0, w, h);
            for (const s of stars) {
                const pz = s.z;
                s.z -= dt * 0.28;
                if (s.z <= 0.02) {
                    s.x = (Math.random() - 0.5) * 2;
                    s.y = (Math.random() - 0.5) * 2;
                    s.z = 1;
                    continue;
                }
                const k = 0.5 / s.z;
                const pk = 0.5 / pz;
                const x = w / 2 + s.x * k * w * 0.5;
                const y = h / 2 + s.y * k * h * 0.5;
                const px = w / 2 + s.x * pk * w * 0.5;
                const py = h / 2 + s.y * pk * h * 0.5;
                const b = Math.min(1, (1 - s.z) * 1.4);
                ctx.strokeStyle = `rgba(${colour},${b.toFixed(2)})`;
                ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.6) * dpr;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            raf = requestAnimationFrame(frame);
        };
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        raf = requestAnimationFrame(frame);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [phosphor]);
    return (
        <motion.div className="absolute inset-0 z-40 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <canvas ref={ref} aria-hidden className="h-full w-full" />
            <p className="absolute bottom-4 left-0 right-0 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white/25">move the mouse to wake</p>
        </motion.div>
    );
}

// ---- Printer --------------------------------------------------------------

// A beige dot-matrix printer. `printing` feeds a continuous-form sheet out of
// it, line by line, for `seconds`, then calls onDone
export function Printer({ printing, seconds, onDone }: { printing: number; seconds: number; onDone: () => void }) {
    const [active, setActive] = useState(false);
    useEffect(() => {
        if (!printing) return;
        setActive(true);
        const id = window.setTimeout(() => {
            onDone();
            window.setTimeout(() => setActive(false), 900);
        }, seconds * 1000);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printing]);

    const LINES = 9;
    return (
        <div aria-hidden className="relative h-[58px] w-[190px]">
            {/* the sheet, rising out of the slot */}
            <div className="pointer-events-none absolute bottom-[40px] left-1/2 h-[190px] w-[132px] -translate-x-1/2 overflow-hidden">
                <AnimatePresence>
                    {active && (
                        <motion.div
                            key={printing}
                            className="absolute inset-x-0 bottom-0 h-[180px] rounded-t-[2px] bg-[#f7f5ec]"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle, rgba(0,0,0,0.18) 2px, transparent 2.5px), radial-gradient(circle, rgba(0,0,0,0.18) 2px, transparent 2.5px), repeating-linear-gradient(180deg, rgba(134,239,172,0.18) 0 12px, transparent 12px 24px)",
                                backgroundSize: "10px 12px, 10px 12px, 100% 24px",
                                backgroundPosition: "1px 0, calc(100% - 1px) 0, 0 0",
                                backgroundRepeat: "repeat-y, repeat-y, repeat",
                                boxShadow: "0 -2px 10px rgba(0,0,0,0.35)",
                            }}
                            initial={{ y: 180 }}
                            animate={{ y: [180, 20] }}
                            exit={{ y: -220, opacity: 0, transition: { duration: 0.6, ease: "easeIn" } }}
                            transition={{ duration: seconds, ease: "linear" }}
                        >
                            {/* the text, as it is printed */}
                            <div className="absolute inset-x-4 top-3 space-y-[7px]">
                                {Array.from({ length: LINES }, (_, i) => (
                                    <motion.span
                                        key={i}
                                        className="block h-[2px] rounded-full bg-neutral-700/70"
                                        style={{ width: i === 0 ? "55%" : `${70 + ((i * 37) % 28)}%` }}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: (seconds / LINES) * (LINES - 1 - i), duration: seconds / LINES / 1.3 }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* the body */}
            <div
                className="absolute inset-x-0 bottom-0 h-[46px] rounded-[8px]"
                style={{ background: "linear-gradient(170deg, #efe8d6, #d3c8ad)", boxShadow: "0 12px 24px -10px rgba(0,0,0,0.8), inset 0 2px 0 rgba(255,255,255,0.7)" }}
            >
                {/* the paper slot */}
                <div className="absolute left-1/2 top-[6px] h-[5px] w-[140px] -translate-x-1/2 rounded-full bg-[#3a342a]" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)" }} />
                {/* the tractor-feed knob, and the online light */}
                <div className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #57534e, #1c1917 70%)" }} />
                <span
                    className="absolute bottom-2 left-3 h-1.5 w-1.5 rounded-full"
                    style={{ background: active ? "#4ade80" : "#57534e", boxShadow: active ? "0 0 6px #4ade80" : "none" }}
                />
                <span className="absolute bottom-[5px] left-6 font-mono text-[6px] uppercase tracking-[0.2em] text-stone-500">on line</span>
            </div>
        </div>
    );
}

// ---- Jump menu ------------------------------------------------------------

export function JumpMenu({ sections, phosphor, onPick, onClose }: { sections: Section[]; phosphor: Phosphor; onPick: (s: Section) => void; onClose: () => void }) {
    const c = dosColours(phosphor);
    const [sel, setSel] = useState(0);
    const paper = phosphor === "paper";

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((i) => (i + 1) % Math.max(1, sections.length));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((i) => (i - 1 + sections.length) % Math.max(1, sections.length));
            } else if (e.key === "Enter" && sections[sel]) {
                e.preventDefault();
                onPick(sections[sel]);
            } else if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [sections, sel, onPick, onClose]);

    const nice = (l: string) => l.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()).replace(/ & /g, " & ");
    return (
        <motion.div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <div
                className="w-full max-w-xs p-1 font-mono text-[11px] sm:text-xs"
                style={{ background: paper ? "#0000aa" : c.bg, color: paper ? "#ffffff" : c.text, boxShadow: "6px 6px 0 rgba(0,0,0,0.6)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-[3px] border-double px-2 pb-2 pt-1" style={{ borderColor: paper ? "#ffffff" : c.text }}>
                    <p className="-mt-3 mb-2 text-center">
                        <span className="px-2" style={{ background: paper ? "#0000aa" : c.bg }}>
                            JUMP TO
                        </span>
                    </p>
                    {sections.length === 0 && <p className="px-1">No sections found.</p>}
                    {sections.map((s, i) => (
                        <button
                            key={s.label}
                            type="button"
                            onMouseEnter={() => setSel(i)}
                            onClick={() => onPick(s)}
                            className="block w-full px-2 py-0.5 text-left"
                            style={i === sel ? { background: paper ? "#00aaaa" : c.text, color: paper ? "#000" : c.bg } : undefined}
                        >
                            {nice(s.label)}
                        </button>
                    ))}
                    <p className="mt-2 px-1 text-[10px]" style={{ color: paper ? "#aaaaaa" : c.dim }}>
                        ↑↓ to choose · Enter to go · Esc to close
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
