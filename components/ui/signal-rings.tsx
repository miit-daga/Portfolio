"use client";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

// Deterministic PRNG so the server and client render identical star positions
// (avoids hydration mismatch from Math.random during render).
function mulberry32(seed: number) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const TILT = 60; // degrees the radar plane leans away from the camera
const RING_DIAMETERS = [200, 320, 440];
const RX = 200; // orbit horizontal radius
const RY = +(RX * Math.cos((TILT * Math.PI) / 180)).toFixed(2); // vertical radius matches the plane's flattening
const LAND_Y = -2; // UFO resting offset (sits on the base at centre)
const LAND_SCALE = 0.95;
const SCALE_TOP = 0.68; // UFO scale at the top (far) orbit point — the hover height for vertical takeoff/landing

// Choreography loop. Order from START: aliens out -> board -> close -> lift off
// -> 3D rounds -> land -> open -> (aliens out)...
const SEQUENCE = [
    { p: "orbit", d: 12000 },
    { p: "descend", d: 1700 },
    { p: "open", d: 800 },
    { p: "disembark", d: 3400 },
    { p: "board", d: 1800 },
    { p: "close", d: 800 },
    { p: "ascend", d: 1500 },
] as const;
const START_INDEX = 3; // begin parked with the hatch open

// Each alien emerges at the pad then wanders through a few waypoints before re-boarding.
const ALIEN_ROAM = [
    { x: [0, -32, -46, -26, -38], y: [LAND_Y, 16, 26, 14, 22] },
    { x: [0, 28, 42, 20, 34], y: [LAND_Y, 22, 32, 18, 28] },
    { x: [0, -4, 10, -16, 2], y: [LAND_Y, 32, 42, 30, 38] },
];
const ALIEN_TIMES = [0, 0.14, 0.4, 0.7, 1];

// ---- Sleek flying saucer -------------------------------------------------
const Ufo = ({ reduce, hatchOpen, thrust }: { reduce: boolean | null; hatchOpen: boolean; thrust: boolean }) => (
    <motion.div
        className="relative"
        style={{ width: 54, height: 22 }}
        animate={reduce ? undefined : { y: [0, -2, 0] }}
        transition={reduce ? undefined : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
        {/* Thrust flame (takeoff / landing) */}
        <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
                top: 15,
                width: 14,
                height: 26,
                background: "linear-gradient(to bottom, rgba(94,234,212,0.95), rgba(45,212,191,0.25), transparent)",
                clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                filter: "blur(1px)",
            }}
            animate={reduce ? { opacity: thrust ? 0.7 : 0 } : { opacity: thrust ? [0.5, 1, 0.5] : 0, scaleY: thrust ? [1, 1.35, 1] : 1 }}
            transition={reduce ? { duration: 0.3 } : { duration: 0.4, repeat: thrust ? Infinity : 0, ease: "easeInOut" }}
        />
        {/* Light ramp to the ground while the hatch is open */}
        <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
                top: 15,
                width: 26,
                height: 30,
                background: "linear-gradient(to bottom, rgba(45,212,191,0.35), transparent)",
                clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)",
            }}
            animate={{ opacity: hatchOpen ? 1 : 0 }}
            transition={{ duration: 0.5 }}
        />
        {/* Main disc */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
                top: 7,
                width: 54,
                height: 13,
                borderRadius: "50%",
                background: "linear-gradient(to bottom, #f1f5f9 0%, #94a3b8 45%, #334155 100%)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.5)",
            }}
        />
        {/* Glowing rim */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 7, width: 54, height: 13, borderRadius: "50%", border: "1px solid rgba(45,212,191,0.5)", boxShadow: "0 0 12px rgba(45,212,191,0.45)" }}
        />
        {/* Top hull */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1, width: 30, height: 11, borderRadius: "50%", background: "linear-gradient(to bottom, #e2e8f0, #64748b)" }} />
        {/* Glassy dome */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
                top: -3,
                width: 16,
                height: 10,
                borderRadius: "50% 50% 45% 45%",
                background: "radial-gradient(circle at 50% 30%, rgba(153,246,228,0.95), rgba(13,30,38,0.92))",
                boxShadow: "0 0 6px rgba(45,212,191,0.5)",
            }}
        />
        {/* Belly hatch — opens/closes */}
        <motion.div
            className="absolute left-1/2 -translate-x-1/2 bg-teal-300"
            style={{ top: 16, width: 14, borderRadius: "50%", boxShadow: "0 0 8px rgba(45,212,191,0.9)" }}
            animate={{ height: hatchOpen ? 5 : 1.5, opacity: hatchOpen ? 1 : 0.45 }}
            transition={{ duration: 0.5 }}
        />
        {/* Tiny rim lights */}
        {[-18, 0, 18].map((dx, i) => (
            <motion.span
                key={i}
                className="absolute rounded-full bg-teal-100"
                style={{ left: `calc(50% + ${dx}px)`, top: 13, width: 2, height: 2, marginLeft: -1, boxShadow: "0 0 3px rgba(45,212,191,0.9)" }}
                animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
                transition={reduce ? undefined : { duration: 1.4, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
            />
        ))}
    </motion.div>
);

// ---- Tiny alien ----------------------------------------------------------
const Alien = ({ reduce }: { reduce: boolean | null }) => (
    <div className="relative" style={{ width: 12, height: 16 }}>
        {/* ground shadow */}
        <div className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/40 blur-[1px]" style={{ bottom: -1, width: 11, height: 3 }} />
        <motion.div
            className="absolute inset-0"
            animate={reduce ? undefined : { y: [0, -1.5, 0] }}
            transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* torso */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 2, width: 8, height: 9, borderRadius: "50%", background: "linear-gradient(to bottom, #5eead4, #0f766e)" }} />
            {/* head */}
            <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ bottom: 8, width: 9, height: 8, background: "radial-gradient(circle at 50% 35%, #99f6e4, #0d9488)" }}>
                <span className="absolute rounded-full bg-black/80" style={{ left: 2, top: 3, width: 2, height: 2.5 }} />
                <span className="absolute rounded-full bg-black/80" style={{ right: 2, top: 3, width: 2, height: 2.5 }} />
            </div>
        </motion.div>
    </div>
);

export const SignalRings = () => {
    const reduce = useReducedMotion();
    const [phaseIndex, setPhaseIndex] = useState(START_INDEX);

    useEffect(() => {
        if (reduce) return;
        const id = window.setTimeout(() => setPhaseIndex((i) => (i + 1) % SEQUENCE.length), SEQUENCE[phaseIndex].d);
        return () => window.clearTimeout(id);
    }, [phaseIndex, reduce]);

    const phase = reduce ? "disembark" : SEQUENCE[phaseIndex].p;
    const orbiting = phase === "orbit";
    const hatchOpen = phase === "open" || phase === "disembark" || phase === "board";
    const thrust = phase === "ascend" || phase === "descend";

    // Background starfield (flat layer)
    const stars = useMemo(() => {
        const rand = mulberry32(20260604);
        return Array.from({ length: 52 }, (_, i) => ({
            key: i,
            top: rand() * 100,
            left: rand() * 100,
            size: rand() * 2 + 1,
            opacity: rand() * 0.5 + 0.2,
            twinkleDelay: rand() * 4,
            twinkleDur: rand() * 2 + 2.5,
        }));
    }, []);

    // 3D elliptical orbit, sampled starting at the BACK (far/top) so it joins the
    // liftoff (rising up & away) and the landing (descending to centre) smoothly.
    const orbit = useMemo(() => {
        const N = 24;
        const x: number[] = [];
        const y: number[] = [];
        const scale: number[] = [];
        const opacity: number[] = [];
        const rotate: number[] = [];
        const zIndex: number[] = [];
        const times: number[] = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const a = -Math.PI / 2 + t * Math.PI * 2;
            const s = Math.sin(a);
            x.push(+(RX * Math.cos(a)).toFixed(2));
            y.push(+(RY * s).toFixed(2));
            scale.push(+(0.9 + 0.22 * s).toFixed(3));
            opacity.push(+(0.7 + 0.3 * s).toFixed(3));
            rotate.push(+(-12 * Math.cos(a)).toFixed(2));
            zIndex.push(s >= 0 ? 20 : 5);
            times.push(+t.toFixed(4));
        }
        return { x, y, scale, opacity, rotate, zIndex, times };
    }, []);

    // UFO animation per phase
    let ufoAnimate: Record<string, number | number[]>;
    let ufoTransition: Transition;
    if (orbiting) {
        // Two full loops that begin and end at the top (directly above the pad),
        // finishing ~0.2s before the phase advances so it holds at the apex.
        ufoAnimate = { x: orbit.x, y: orbit.y, scale: orbit.scale, rotate: orbit.rotate, zIndex: orbit.zIndex };
        ufoTransition = { duration: 5.9, times: orbit.times, repeat: 1, ease: "linear" };
    } else if (phase === "ascend") {
        // Vertical takeoff: straight up from the pad to the hover point above it.
        ufoAnimate = { x: 0, y: -RY, scale: SCALE_TOP, rotate: 0, opacity: 1, zIndex: 5 };
        ufoTransition = { duration: 1.5, ease: "easeOut" };
    } else if (phase === "descend") {
        // Vertical landing: straight down from the apex onto the pad.
        ufoAnimate = { x: 0, y: LAND_Y, scale: LAND_SCALE, rotate: 0, opacity: 1, zIndex: 20 };
        ufoTransition = { duration: 1.7, ease: "easeInOut" };
    } else {
        ufoAnimate = { x: 0, y: LAND_Y, scale: LAND_SCALE, rotate: 0, opacity: 1, zIndex: 20 };
        ufoTransition = { duration: 0.5 };
    }

    return (
        <div className="pointer-events-none relative flex h-full w-full items-center justify-center overflow-visible">
            {/* Ambient glow */}
            <div className="absolute h-[55%] w-[55%] rounded-full bg-teal-500/10 blur-3xl" style={{ zIndex: 0 }} />

            {/* Starfield (flat) */}
            <div className="absolute inset-0" style={{ zIndex: 0 }}>
                {stars.map((s) => (
                    <motion.span
                        key={s.key}
                        className="absolute rounded-full bg-white"
                        style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, opacity: s.opacity }}
                        animate={reduce ? undefined : { opacity: [s.opacity, s.opacity * 0.25, s.opacity] }}
                        transition={reduce ? undefined : { duration: s.twinkleDur, delay: s.twinkleDelay, repeat: Infinity, ease: "easeInOut" }}
                    />
                ))}
            </div>

            {/* 3D radar ground plane (tilted away from the camera) */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "700px", zIndex: 1 }}>
                <div className="relative" style={{ width: 0, height: 0, transform: `rotateX(${TILT}deg)` }}>
                    {RING_DIAMETERS.map((d, i) => (
                        <div
                            key={d}
                            className="absolute rounded-full"
                            style={{
                                left: "50%",
                                top: "50%",
                                width: d,
                                height: d,
                                transform: "translate(-50%, -50%)",
                                border: `1px solid ${i === 1 ? "rgba(167,139,250,0.18)" : "rgba(45,212,191,0.16)"}`,
                            }}
                        />
                    ))}

                    {/* Rotating dashed scanner ring */}
                    <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                        <motion.div
                            className="rounded-full border border-dashed border-teal-400/25"
                            style={{ width: 300, height: 300 }}
                            animate={reduce ? undefined : { rotate: 360 }}
                            transition={reduce ? undefined : { duration: 42, repeat: Infinity, ease: "linear" }}
                        />
                    </div>

                    {/* Signal ripples spreading from the base */}
                    {!reduce &&
                        [0, 1, 2, 3].map((i) => (
                            <div key={i} className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                                <motion.div
                                    className="rounded-full"
                                    style={{
                                        width: 200,
                                        height: 200,
                                        border: `1.5px solid ${i % 2 === 0 ? "rgba(45,212,191,0.7)" : "rgba(167,139,250,0.6)"}`,
                                        boxShadow: i % 2 === 0 ? "0 0 14px rgba(45,212,191,0.3)" : "0 0 14px rgba(167,139,250,0.25)",
                                    }}
                                    initial={{ scale: 0.12, opacity: 0 }}
                                    animate={{ scale: [0.12, 2.3], opacity: [0, 0.6, 0] }}
                                    transition={{ duration: 4.2, delay: i * 1.05, repeat: Infinity, ease: "easeOut" }}
                                />
                            </div>
                        ))}
                </div>
            </div>

            {/* Landing base at centre */}
            <div
                className="absolute"
                style={{
                    left: "50%",
                    top: "50%",
                    width: 78,
                    height: 26,
                    transform: "translate(-50%, -50%) translateY(6px)",
                    zIndex: 2,
                    borderRadius: "50%",
                    background: "radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(15,23,42,0.5) 72%, transparent)",
                    border: "1px solid rgba(45,212,191,0.3)",
                    boxShadow: "0 0 18px rgba(45,212,191,0.25)",
                }}
            >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-teal-400/20" style={{ width: 50, height: 16 }} />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-300" style={{ width: 5, height: 5, boxShadow: "0 0 10px rgba(45,212,191,0.9)" }} />
                {[
                    { x: 0, y: -10 },
                    { x: 0, y: 10 },
                    { x: -36, y: 0 },
                    { x: 36, y: 0 },
                ].map((p, i) => (
                    <motion.span
                        key={i}
                        className="absolute rounded-full bg-teal-200"
                        style={{ left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`, width: 2.5, height: 2.5, marginLeft: -1.25, marginTop: -1.25, boxShadow: "0 0 4px rgba(45,212,191,0.9)" }}
                        animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                        transition={reduce ? undefined : { duration: 1.6, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                    />
                ))}
            </div>

            {/* Aliens */}
            {ALIEN_ROAM.map((roam, i) => {
                let aAnimate: Record<string, number | number[]>;
                let aTransition: Transition;
                if (reduce) {
                    aAnimate = { x: roam.x[1], y: roam.y[1], scale: 1, opacity: 1 };
                    aTransition = { duration: 0 };
                } else if (phase === "disembark") {
                    aAnimate = { x: roam.x, y: roam.y, scale: [0, 1, 1, 1, 1], opacity: [0, 1, 1, 1, 1] };
                    aTransition = { duration: 3.4, times: ALIEN_TIMES, delay: i * 0.1, ease: "easeInOut" };
                } else if (phase === "board") {
                    aAnimate = { x: 0, y: LAND_Y, scale: 0, opacity: 0 };
                    aTransition = { duration: 1.0, delay: i * 0.12, ease: "easeIn" };
                } else {
                    aAnimate = { x: 0, y: LAND_Y, scale: 0, opacity: 0 };
                    aTransition = { duration: 0.3 };
                }
                return (
                    <motion.div
                        key={i}
                        className="absolute"
                        style={{ left: "50%", top: "50%", marginLeft: -6, marginTop: -8, zIndex: 22 }}
                        initial={{ x: 0, y: LAND_Y, scale: 0, opacity: 0 }}
                        animate={aAnimate}
                        transition={aTransition}
                    >
                        <Alien reduce={reduce} />
                    </motion.div>
                );
            })}

            {/* UFO */}
            <motion.div
                className="absolute"
                style={{ left: "50%", top: "50%", width: 54, height: 22, marginLeft: -27, marginTop: -11 }}
                initial={{ x: 0, y: LAND_Y, scale: LAND_SCALE, rotate: 0, opacity: 1, zIndex: 20 }}
                animate={ufoAnimate}
                transition={ufoTransition}
            >
                <Ufo reduce={reduce} hatchOpen={hatchOpen} thrust={thrust} />
            </motion.div>
        </div>
    );
};
