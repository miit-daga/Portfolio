"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PdfScreen, type Phosphor, type Tube } from "./pdf-screen";

// The resume on a beige 1980s CRT monitor, floating in zero-g: a speaker
// grille, vents and a mission sticker, on its stand. The screen is the resume
// itself, drawn by pdf.js (pdf-screen.tsx).
//
// Two dials under the screen, both real:
//   TUBE      off, soft (the glass's edges), full (scanlines everywhere, a
//             rolling bar, flicker, colour fringing and bloom)
//   PHOSPHOR  paper (as printed), green or amber: the page goes dark and the
//             ink glows, as on a monochrome monitor
// The yellow push-button beside them switches the monitor off and on again.

const BOOT_LINES = ["MIIT-1 CREW TERMINAL  v2.6", "memory check .......... ok", "uplink kolkata station . ok", "loading crew record: MIIT DAGA"];
const TUBES: Tube[] = ["off", "soft", "full"];
const PHOSPHORS: Phosphor[] = ["paper", "green", "amber"];
const ANGLE = [-55, 0, 55];

const BEIGE = "linear-gradient(170deg, #efe8d6 0%, #e4dbc4 45%, #d3c8ad 100%)";

function useSession<T extends string>(key: string, init: T, allowed: readonly T[]) {
    const [v, setV] = useState<T>(init);
    useEffect(() => {
        try {
            const s = sessionStorage.getItem(key) as T | null;
            if (s && allowed.includes(s)) setV(s);
        } catch {
            /* ignore */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const set = (next: T) => {
        setV(next);
        try {
            sessionStorage.setItem(key, next);
        } catch {
            /* ignore */
        }
    };
    return [v, set] as const;
}

export function RetroComputer({ pdf, fallback }: { pdf: string; fallback: string }) {
    const reduce = useReducedMotion();
    const [tube, setTube] = useSession<Tube>("resume-tube", "soft", TUBES);
    const [phosphor, setPhosphor] = useSession<Phosphor>("resume-phosphor", "paper", PHOSPHORS);
    const [power, setPower] = useState(true);
    const [boot, setBoot] = useState(0); // bumped to replay the start-up
    const [booted, setBooted] = useState(false);
    const [typed, setTyped] = useState(0);
    const [ready, setReady] = useState(false);

    // The start-up: the tube warms, then a line at a time
    useEffect(() => {
        if (!power) return;
        setBooted(false);
        setTyped(0);
        if (reduce) {
            setBooted(true);
            return;
        }
        const t = BOOT_LINES.map((_, i) => window.setTimeout(() => setTyped(i + 1), 520 + i * 320));
        t.push(window.setTimeout(() => setBooted(true), 520 + BOOT_LINES.length * 320 + 420));
        return () => t.forEach(clearTimeout);
    }, [power, boot, reduce]);

    const powerKey = () => {
        if (power) setPower(false);
        else {
            setPower(true);
            setBoot((b) => b + 1);
        }
    };

    const tubeIdx = TUBES.indexOf(tube);
    const phIdx = PHOSPHORS.indexOf(phosphor);
    const glow = phosphor === "green" ? "74,222,128" : phosphor === "amber" ? "251,191,36" : "186,230,253";

    return (
        <motion.div
            className="relative mx-auto flex w-full max-w-[920px] flex-col items-center"
            // Adrift in zero-g, very gently
            animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, 0.35, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* ---- the monitor ---- */}
            <div
                className="relative w-full rounded-[18px] p-2.5 sm:rounded-[26px] sm:p-5"
                style={{ background: BEIGE, boxShadow: "0 40px 90px -30px rgba(0,0,0,0.95), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -3px 0 rgba(0,0,0,0.12)" }}
            >
                {/* the recessed frame round the tube */}
                <div
                    className="rounded-[14px] p-2 sm:rounded-[20px] sm:p-4"
                    style={{ background: "linear-gradient(180deg, #d8ceb4, #e9e1cc 30%, #e2d9c1)", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.18), inset 0 -2px 4px rgba(255,255,255,0.6)" }}
                >
                    {/* the dark surround and the bulging glass */}
                    <div className="rounded-[18px] bg-[#222] p-2 sm:rounded-[30px] sm:p-3.5" style={{ boxShadow: "inset 0 0 0 2px #111, 0 1px 0 rgba(255,255,255,0.5)" }}>
                        <div
                            className="relative h-[64dvh] overflow-hidden rounded-[14px] sm:h-[min(62dvh,640px)] sm:rounded-[26px]"
                            style={{
                                background: phosphor === "paper" ? "#0b0d10" : "#030503",
                                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.9)",
                            }}
                        >
                            {power && <PdfScreen src={pdf} fallback={fallback} phosphor={phosphor} tube={tube} onReady={() => setReady(true)} />}

                            {/* ---- the tube's effects ---- */}
                            <AnimatePresence>
                                {power && tube !== "off" && (
                                    <motion.div
                                        key={tube}
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {/* scanlines: the edges only when soft, all over when full */}
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,${tube === "full" ? 0.22 : 0.16}) 0px, rgba(0,0,0,${tube === "full" ? 0.22 : 0.16}) 1px, transparent 1px, transparent 3px)`,
                                                ...(tube === "soft"
                                                    ? {
                                                          maskImage: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 60%, black 100%)",
                                                          WebkitMaskImage: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 60%, black 100%)",
                                                      }
                                                    : {}),
                                            }}
                                        />
                                        {/* the curve of the glass */}
                                        <div
                                            className="absolute inset-0"
                                            style={{ background: `radial-gradient(ellipse 90% 85% at 50% 50%, transparent ${tube === "full" ? 50 : 65}%, rgba(0,0,0,${tube === "full" ? 0.75 : 0.5}) 100%)` }}
                                        />
                                        {tube === "full" && (
                                            <>
                                                {/* a bar rolling down the screen */}
                                                {!reduce && (
                                                    <motion.div
                                                        className="absolute inset-x-0 h-24"
                                                        style={{ background: `linear-gradient(180deg, transparent, rgba(${glow},0.07), transparent)` }}
                                                        animate={{ top: ["-15%", "115%"] }}
                                                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                                    />
                                                )}
                                                {/* flicker */}
                                                {!reduce && (
                                                    <motion.div
                                                        className="absolute inset-0 bg-black"
                                                        animate={{ opacity: [0, 0.05, 0, 0.03, 0, 0, 0.06, 0] }}
                                                        transition={{ duration: 3.2, repeat: Infinity }}
                                                    />
                                                )}
                                                {/* phosphor haze */}
                                                <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 70px rgba(${glow},0.18)` }} />
                                            </>
                                        )}
                                        {/* glare */}
                                        <div className="absolute inset-0" style={{ background: "linear-gradient(130deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 20%, transparent 32%)" }} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ---- the start-up ---- */}
                            <AnimatePresence>
                                {power && !booted && (
                                    <motion.button
                                        type="button"
                                        aria-label="Skip the start-up"
                                        onClick={() => setBooted(true)}
                                        className="absolute inset-0 z-10 flex cursor-pointer flex-col items-start justify-center bg-[#040604] px-6 text-left sm:px-14"
                                        exit={{ opacity: 0, transition: { duration: 0.4 } }}
                                    >
                                        <motion.span
                                            aria-hidden
                                            className="pointer-events-none absolute inset-x-0 top-1/2 h-full -translate-y-1/2 bg-emerald-50"
                                            initial={{ scaleY: 0.004, scaleX: 0.15, opacity: 1 }}
                                            animate={{ scaleY: [0.004, 0.004, 1], scaleX: [0.15, 1, 1], opacity: [1, 1, 0] }}
                                            transition={{ duration: 0.55, times: [0, 0.45, 1], ease: "easeOut" }}
                                        />
                                        <div className="relative space-y-1.5 font-mono text-[11px] text-emerald-300/90 sm:text-sm" style={{ textShadow: "0 0 8px rgba(134,239,172,0.6)" }}>
                                            {BOOT_LINES.slice(0, typed).map((l, i) => (
                                                <p key={i}>
                                                    <span className="text-emerald-500/70">&gt;</span> {l}
                                                </p>
                                            ))}
                                            {typed > 0 && <span className="inline-block h-4 w-2 animate-pulse bg-emerald-300/80 align-middle motion-reduce:animate-none" />}
                                        </div>
                                        <span className="absolute bottom-4 right-5 font-mono text-[9px] uppercase tracking-[0.25em] text-emerald-500/40">tap to skip</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* ---- switched off: the dot that lingers on an old tube ---- */}
                            <AnimatePresence>
                                {!power && (
                                    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#050605]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <motion.span
                                            className="block h-1 w-1 rounded-full bg-white"
                                            initial={{ scale: 60, opacity: 1 }}
                                            animate={{ scale: [60, 1, 1], opacity: [1, 1, 0] }}
                                            transition={{ duration: 1.6, times: [0, 0.25, 1] }}
                                            style={{ boxShadow: "0 0 12px 4px rgba(255,255,255,0.8)" }}
                                        />
                                        <p className="absolute bottom-6 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">press the yellow button</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* ---- the chin: grille, sticker, dials, power light ---- */}
                <div className="mt-2.5 flex items-center gap-3 sm:mt-4 sm:gap-5">
                    <div
                        aria-hidden
                        className="hidden h-12 flex-1 rounded-md sm:block"
                        style={{
                            background: "#cfc5aa",
                            backgroundImage: "radial-gradient(circle, rgba(60,50,35,0.45) 1px, transparent 1.3px)",
                            backgroundSize: "5px 5px",
                            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.5)",
                        }}
                    />
                    {/* the mission sticker */}
                    <div className="flex shrink-0 items-center gap-2 rounded-md bg-[#1b2440] px-2 py-1 shadow-sm sm:px-2.5 sm:py-1.5" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden>
                            <circle cx="12" cy="12" r="10" fill="#0b1226" stroke="#fbbf24" strokeWidth="1.2" />
                            <ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#7dd3fc" strokeWidth="0.9" transform="rotate(-20 12 12)" />
                            <path d="M12 6.5l1.2 3.3 3.3 1.2-3.3 1.2L12 15.5l-1.2-3.3-3.3-1.2 3.3-1.2z" fill="#fde68a" />
                        </svg>
                        <span className="font-mono text-[8px] font-bold uppercase leading-tight tracking-[0.18em] text-amber-200 sm:text-[9px]">
                            miit-1<span className="block text-[7px] font-medium text-sky-300/80 sm:text-[8px]">crew terminal</span>
                        </span>
                    </div>
                    <div className="ml-auto flex items-center gap-3 sm:ml-0 sm:gap-5">
                        <Dial label="tube" value={tube} angle={ANGLE[tubeIdx]} onTurn={() => setTube(TUBES[(tubeIdx + 1) % 3])} />
                        <Dial label="phosphor" value={phosphor} angle={ANGLE[phIdx]} onTurn={() => setPhosphor(PHOSPHORS[(phIdx + 1) % 3])} />
                        {/* The power switch: a yellow push-button, with its light */}
                        <button
                            type="button"
                            onClick={powerKey}
                            aria-label={power ? "Switch the monitor off" : "Switch the monitor on"}
                            aria-pressed={power}
                            className="group flex flex-col items-center gap-1 focus-visible:outline-none"
                        >
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="h-2 w-2 rounded-full transition-colors"
                                    style={{
                                        background: !power ? "#57534e" : ready && booted ? "#4ade80" : "#fbbf24",
                                        boxShadow: !power ? "none" : ready && booted ? "0 0 8px #4ade80" : "0 0 8px #fbbf24",
                                    }}
                                />
                                <span
                                    className="block h-7 w-7 rounded-md transition-transform duration-75 group-active:translate-y-px group-focus-visible:ring-2 group-focus-visible:ring-emerald-500/70 sm:h-8 sm:w-8"
                                    style={{
                                        background: "linear-gradient(180deg, #fcd34d, #f59e0b)",
                                        boxShadow: power
                                            ? "inset 0 1px 2px rgba(0,0,0,0.35), 0 0 0 2px #b8ad90"
                                            : "0 3px 0 #b45309, 0 0 0 2px #b8ad90, inset 0 1px 0 rgba(255,255,255,0.6)",
                                        transform: power ? "translateY(2px)" : undefined,
                                    }}
                                />
                            </span>
                            <span className="font-mono text-[7px] uppercase leading-none tracking-[0.15em] text-stone-500 sm:text-[8px]">
                                power <span className="text-stone-700">{power ? "on" : "off"}</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* vents along the bottom */}
                <div
                    aria-hidden
                    className="mx-auto mt-2.5 hidden h-2.5 w-[88%] rounded-sm sm:block"
                    style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(70,60,40,0.4) 0 3px, transparent 3px 11px)" }}
                />
            </div>

            {/* ---- the stand ---- */}
            <div aria-hidden className="relative hidden h-8 w-[34%] sm:block" style={{ background: "linear-gradient(180deg, #c7bca0, #dcd2b8)", clipPath: "polygon(12% 0, 88% 0, 100% 100%, 0 100%)" }} />
            <div aria-hidden className="hidden h-3 w-[46%] rounded-b-lg sm:block" style={{ background: "linear-gradient(180deg, #e2d9c1, #cbbf9f)", boxShadow: "0 10px 20px -8px rgba(0,0,0,0.7)" }} />


        </motion.div>
    );
}

// A dial that turns to three positions, labelled with where it is
function Dial({ label, value, angle, onTurn }: { label: string; value: string; angle: number; onTurn: () => void }) {
    return (
        <button type="button" onClick={onTurn} className="group flex flex-col items-center gap-1 focus-visible:outline-none" aria-label={`${label}: ${value}. Turn it`}>
            <span className="relative block h-9 w-9 sm:h-11 sm:w-11">
                {/* ticks for the three positions */}
                {ANGLE.map((a) => (
                    <span key={a} aria-hidden className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%,-50%) rotate(${a}deg)` }}>
                        <span className="absolute left-0 top-[-3px] h-1.5 w-px bg-stone-500/70" />
                    </span>
                ))}
                <motion.span
                    className="absolute inset-1 rounded-full group-focus-visible:ring-2 group-focus-visible:ring-emerald-500/70"
                    style={{
                        background: "radial-gradient(circle at 35% 30%, #57534e, #1c1917 70%)",
                        boxShadow: "0 2px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 2px rgba(0,0,0,0.25)",
                    }}
                    animate={{ rotate: angle }}
                    transition={{ type: "spring", stiffness: 280, damping: 16 }}
                >
                    <span className="absolute left-1/2 top-1 h-3 w-[3px] -translate-x-1/2 rounded-full bg-amber-200" />
                </motion.span>
            </span>
            <span className="font-mono text-[7px] uppercase leading-none tracking-[0.15em] text-stone-500 sm:text-[8px]">
                {label} <span className="text-stone-700">{value}</span>
            </span>
        </button>
    );
}
