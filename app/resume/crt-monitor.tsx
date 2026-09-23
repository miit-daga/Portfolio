"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// The resume on an old CRT monitor, bolted into a ship's console.
//
// Readability comes first: the resume itself is the Drive preview, flat and
// crisp. The CRT is only a frame round it (bezel, knobs, a power light) plus
// faint scanlines and a vignette that stay at the edges of the glass, and the
// knob switches even those off. It boots on arrival: the tube warms up with a
// line of light, types a few lines, then shows the record. A tap skips it.

const BOOT_LINES = ["MIIT-1 CREW TERMINAL  v2.6", "memory check .......... ok", "uplink kolkata station . ok", "loading crew record: MIIT DAGA"];

export function CrtMonitor({ src }: { src: string }) {
    const reduce = useReducedMotion();
    const [crt, setCrt] = useState(true);
    const [booted, setBooted] = useState(false);
    const [typed, setTyped] = useState(0);
    const [loaded, setLoaded] = useState(false);

    // The boot: the tube warms up, then a line at a time
    useEffect(() => {
        if (reduce) {
            setBooted(true);
            return;
        }
        const timers = BOOT_LINES.map((_, i) => window.setTimeout(() => setTyped(i + 1), 520 + i * 330));
        timers.push(window.setTimeout(() => setBooted(true), 520 + BOOT_LINES.length * 330 + 450));
        return () => timers.forEach(clearTimeout);
    }, [reduce]);

    // The knob remembers, for the rest of the visit
    useEffect(() => {
        try {
            if (sessionStorage.getItem("resume-crt") === "off") setCrt(false);
        } catch {
            /* ignore */
        }
    }, []);
    const toggle = () =>
        setCrt((v) => {
            try {
                sessionStorage.setItem("resume-crt", v ? "off" : "on");
            } catch {
                /* ignore */
            }
            return !v;
        });

    return (
        <div className="relative flex flex-1 flex-col">
            {/* The monitor: a thick gunmetal bezel with screws, a badge and controls */}
            <div
                className="relative flex flex-1 flex-col rounded-[22px] p-2 sm:rounded-[30px] sm:p-4 md:p-5"
                style={{
                    background: "linear-gradient(160deg, #2a2f38 0%, #171a20 45%, #0d0f13 100%)",
                    boxShadow:
                        "0 30px 80px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
                }}
            >
                {/* screws */}
                {["left-2.5 top-2.5", "right-2.5 top-2.5", "left-2.5 bottom-2.5", "right-2.5 bottom-2.5"].map((pos) => (
                    <span
                        key={pos}
                        aria-hidden
                        className={`absolute hidden h-2 w-2 rounded-full sm:block ${pos}`}
                        style={{ background: "radial-gradient(circle at 35% 35%, #6b7280, #1f2329)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.5)" }}
                    />
                ))}

                {/* The glass */}
                <div
                    className="relative min-h-[70dvh] flex-1 overflow-hidden rounded-[14px] bg-[#070a08] sm:rounded-[20px]"
                    style={{ boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.8), inset 0 0 40px rgba(134,239,172,0.06)" }}
                >
                    {/* Until the preview paints over it */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-300 motion-reduce:animate-none" />
                        <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-200/50">Loading resume</p>
                        <p className="max-w-xs text-xs text-neutral-600">If it does not appear, use Download PDF above.</p>
                    </div>
                    <iframe
                        src={src}
                        title="Miit Daga resume"
                        className="absolute inset-0 block h-full w-full"
                        allow="autoplay"
                        loading="eager"
                        onLoad={() => setLoaded(true)}
                    />

                    {/* The tube: faint, and only at the edges, so the page stays sharp */}
                    <AnimatePresence>
                        {crt && (
                            <motion.div
                                aria-hidden
                                className="pointer-events-none absolute inset-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.35 }}
                            >
                                {/* scanlines, masked away from the middle; none on phones,
                                    where the page is already small */}
                                <div
                                    className="absolute inset-0 hidden sm:block"
                                    style={{
                                        backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)",
                                        maskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, transparent 62%, black 100%)",
                                        WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, transparent 62%, black 100%)",
                                    }}
                                />
                                {/* vignette, the curve of the glass */}
                                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 62%, rgba(0,0,0,0.5) 100%)" }} />
                                {/* a glare across the top left */}
                                <div
                                    className="absolute inset-0"
                                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 18%, transparent 30%)" }}
                                />
                                {/* phosphor glow round the rim */}
                                <div className="absolute inset-0 rounded-[inherit]" style={{ boxShadow: "inset 0 0 28px rgba(134,239,172,0.10)" }} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* The boot */}
                    <AnimatePresence>
                        {!booted && (
                            <motion.button
                                type="button"
                                aria-label="Skip the start-up"
                                onClick={() => setBooted(true)}
                                className="absolute inset-0 z-10 flex cursor-pointer flex-col items-start justify-center bg-[#050805] px-6 text-left sm:px-12"
                                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                            >
                                {/* the tube warming up: a line of light that opens into the screen */}
                                <motion.span
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-0 top-1/2 h-full -translate-y-1/2 bg-emerald-100/90"
                                    initial={{ scaleY: 0.004, scaleX: 0.2, opacity: 1 }}
                                    animate={{ scaleY: [0.004, 0.004, 1], scaleX: [0.2, 1, 1], opacity: [1, 1, 0] }}
                                    transition={{ duration: 0.55, times: [0, 0.45, 1], ease: "easeOut" }}
                                />
                                <div className="relative space-y-1.5 font-mono text-[11px] text-emerald-300/90 sm:text-sm" style={{ textShadow: "0 0 8px rgba(134,239,172,0.6)" }}>
                                    {BOOT_LINES.slice(0, typed).map((l, i) => (
                                        <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
                                            <span className="text-emerald-500/70">&gt;</span> {l}
                                        </motion.p>
                                    ))}
                                    {typed > 0 && <span className="inline-block h-4 w-2 animate-pulse bg-emerald-300/80 align-middle motion-reduce:animate-none" />}
                                </div>
                                <span className="absolute bottom-4 right-5 font-mono text-[9px] uppercase tracking-[0.25em] text-emerald-500/40">tap to skip</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* The chin: badge, power light, and the knob that switches the tube effect */}
                <div className="mt-2 flex items-center justify-between px-1 sm:mt-3 sm:px-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-neutral-500 sm:text-[10px]">
                        miit-1 <span className="hidden text-neutral-600 sm:inline">· crew terminal</span>
                    </span>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${loaded ? "bg-emerald-400" : "bg-amber-400"}`}
                                style={{ boxShadow: loaded ? "0 0 8px rgba(52,211,153,0.9)" : "0 0 8px rgba(251,191,36,0.9)" }}
                            />
                            <span className="hidden sm:inline">{loaded ? "on" : "warming"}</span>
                        </span>
                        {/* a decorative dial */}
                        <span
                            aria-hidden
                            className="relative hidden h-6 w-6 rounded-full sm:block"
                            style={{ background: "radial-gradient(circle at 35% 30%, #4b5563, #111318)", boxShadow: "0 1px 2px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)" }}
                        >
                            <span className="absolute left-1/2 top-1 h-2 w-0.5 -translate-x-1/2 rounded bg-neutral-300/70" style={{ transform: "translateX(-50%) rotate(-35deg)", transformOrigin: "50% 180%" }} />
                        </span>
                        {/* the knob that works: tube effect on or off */}
                        <button
                            type="button"
                            onClick={toggle}
                            aria-pressed={crt}
                            className="flex items-center gap-2 rounded-full font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                        >
                            <motion.span
                                className="relative block h-6 w-6 rounded-full"
                                style={{ background: "radial-gradient(circle at 35% 30%, #4b5563, #111318)", boxShadow: "0 1px 2px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)" }}
                                animate={{ rotate: crt ? 40 : -40 }}
                                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                            >
                                <span className="absolute left-1/2 top-1 h-2 w-0.5 -translate-x-1/2 rounded bg-emerald-300/80" />
                            </motion.span>
                            crt {crt ? "on" : "off"}
                        </button>
                    </div>
                </div>
            </div>

            {/* The console it sits on */}
            <div
                aria-hidden
                className="mx-auto -mt-1 h-3 w-[70%] rounded-b-2xl sm:h-4"
                style={{ background: "linear-gradient(180deg, #14171c, #0a0b0e)", boxShadow: "0 12px 30px rgba(0,0,0,0.8)" }}
            />
        </div>
    );
}
