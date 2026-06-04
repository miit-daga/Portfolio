"use client";
import { motion, useReducedMotion, useInView, type Transition } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

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
const PHI = (TILT * Math.PI) / 180;
const PERSP = 700; // must match the perspective on the ground-plane container
const RING_DIAMETERS = [200, 320, 440];
const R_ORBIT = 150; // UFO orbit radius within the ground plane

// Project a point on the ground-plane circle (radius R_ORBIT, angle theta) through
// the same rotateX(TILT) + perspective the rings use, so the UFO tracks the plane:
// a real circle there projects to an asymmetric ellipse with depth-correct scaling.
function projectOrbit(theta: number) {
    const f = PERSP / (PERSP - R_ORBIT * Math.sin(theta) * Math.sin(PHI));
    return {
        x: R_ORBIT * Math.cos(theta) * f,
        y: R_ORBIT * Math.sin(theta) * Math.cos(PHI) * f,
        scale: f,
    };
}
const APEX = projectOrbit(-Math.PI / 2); // hover point directly above the pad (far/top of orbit)

const LAND_Y = -2; // UFO resting offset (sits on the base at centre)
const LAND_SCALE = 1.0;

// Choreography loop. Order from START: aliens out -> board -> close -> lift off
// -> 3D rounds -> land -> open -> (aliens out)...
const SEQUENCE = [
    { p: "orbit", d: 12000 },
    { p: "descend", d: 1700 },
    { p: "open", d: 800 },
    { p: "disembark", d: 4200 },
    { p: "gather", d: 1200 },
    { p: "speak", d: 3800 },
    { p: "board", d: 1800 },
    { p: "close", d: 800 },
    { p: "ascend", d: 1500 },
] as const;
const START_INDEX = 3; // begin parked with the hatch open

// The leader (index 0) stays centred in front of the ship; the other two split off
// to opposite sides so all three head different ways.
const ALIEN_ROAM = [
    { x: [0, 4, -6, 2, 0], y: [LAND_Y, 28, 40, 32, 38] },
    { x: [0, -44, -82, -58, -86], y: [LAND_Y, 20, 36, 54, 42] },
    { x: [0, 46, 84, 60, 90], y: [LAND_Y, 24, 44, 28, 50] },
];
const ALIEN_TIMES = [0, 0.13, 0.4, 0.7, 1];

// Huddle positions for the leader's address (index 0 = leader, front-centre).
const ALIEN_CLUSTER = [
    { x: 0, y: 52 },
    { x: -28, y: 46 },
    { x: 30, y: 58 },
];

// Leader's one-liners - cycled randomly, no repeat until all have been said.
const LINES = [
    "We come in peace... and for the Wi-Fi.",
    "Take us to your recruiter.",
    "We intercepted the signal. We had to see the portfolio.",
    "Strong backend energy detected on this planet.",
    "Four light-years… for one git push.",
    "The frequencies really were open.",
    "No bugs detected. Be suspicious.",
    "Beam up the résumé. Command will want this one.",
    "Earthling, your APIs are… beautiful.",
    "We deploy on Fridays too. Reckless. Respect.",
    "Verdict: hire the human.",
];

// ---- Flying saucer (sleek, metallic) -------------------------------------
const Ufo = ({ reduce, hatchOpen, thrust }: { reduce: boolean | null; hatchOpen: boolean; thrust: boolean }) => (
    <motion.div
        className="relative"
        style={{ width: 58, height: 22 }}
        animate={reduce ? undefined : { y: [0, -1.5, 0] }}
        transition={reduce ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
    >
        {/* Ion thruster (takeoff / landing) */}
        <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
                top: 14,
                width: 12,
                height: 30,
                background: "radial-gradient(ellipse at 50% 0%, rgba(191,219,254,0.7), rgba(125,211,252,0.18) 45%, transparent 72%)",
                filter: "blur(2px)",
            }}
            animate={reduce ? { opacity: thrust ? 0.55 : 0 } : { opacity: thrust ? [0.4, 0.8, 0.4] : 0, scaleY: thrust ? [1, 1.25, 1] : 1 }}
            transition={reduce ? { duration: 0.3 } : { duration: 0.5, repeat: thrust ? Infinity : 0, ease: "easeInOut" }}
        />
        {/* Boarding ramp light while the hatch is open */}
        <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
                top: 15,
                width: 22,
                height: 26,
                background: "linear-gradient(to bottom, rgba(191,219,254,0.2), transparent)",
                clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)",
            }}
            animate={{ opacity: hatchOpen ? 1 : 0 }}
            transition={{ duration: 0.5 }}
        />
        {/* Lower saucer hull */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
                top: 8,
                width: 58,
                height: 12,
                borderRadius: "50%",
                background: "linear-gradient(to bottom, #d3dae3 0%, #97a2b2 28%, #3a434f 72%, #1b212a 100%)",
                boxShadow: "0 4px 9px rgba(0,0,0,0.55)",
            }}
        />
        {/* Specular sheen */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 8.5, width: 40, height: 4, borderRadius: "50%", background: "linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)", opacity: 0.6 }}
        />
        {/* Upper bulge */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 2, width: 32, height: 12, borderRadius: "50%", background: "linear-gradient(to bottom, #e6eaf0, #6c7787 75%, #4a5360)" }}
        />
        {/* Smoked-glass dome */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: -2, width: 15, height: 8, borderRadius: "50% 50% 42% 42%", background: "radial-gradient(circle at 50% 25%, rgba(203,213,225,0.75), rgba(18,26,36,0.96))" }}
        />
        {/* Rim highlight */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 8, width: 58, height: 12, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)" }} />
        {/* Soft underglow */}
        <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 17, width: 26, height: 6, borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(125,211,252,0.4), transparent 70%)", filter: "blur(1px)" }}
        />
        {/* Hatch seam - opens/closes */}
        <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 17, width: 12, borderRadius: "50%", background: "rgba(191,219,254,0.85)", boxShadow: "0 0 5px rgba(125,211,252,0.6)" }}
            animate={{ height: hatchOpen ? 3.5 : 0.6, opacity: hatchOpen ? 0.9 : 0 }}
            transition={{ duration: 0.5 }}
        />
        {/* Dim portholes */}
        {[-16, -8, 0, 8, 16].map((dx, i) => (
            <motion.span
                key={i}
                className="absolute rounded-full"
                style={{ left: `calc(50% + ${dx}px)`, top: 12.5, width: 1.6, height: 1.6, marginLeft: -0.8, background: "rgba(191,219,254,0.85)" }}
                animate={reduce ? undefined : { opacity: [0.22, 0.65, 0.22] }}
                transition={reduce ? undefined : { duration: 2, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            />
        ))}
    </motion.div>
);

// ---- Alien (luminous "grey" being) ---------------------------------------
const Alien = ({ reduce, leader = false }: { reduce: boolean | null; leader?: boolean }) => (
    <div className="relative" style={{ width: 18, height: 30, transform: leader ? "scale(1.32)" : undefined, transformOrigin: "bottom center" }}>
        {/* glow halo so it reads on the dark backdrop (leader glows brighter) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 22, height: 30, background: `radial-gradient(ellipse at center, rgba(94,234,212,${leader ? 0.4 : 0.28}), transparent 70%)`, filter: "blur(2px)" }} />
        {/* ground shadow */}
        <div className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/55 blur-[1.5px]" style={{ bottom: 0, width: 13, height: 3.5 }} />
        <motion.div
            className="absolute inset-0"
            animate={reduce ? undefined : { y: [0, -1.5, 0] }}
            transition={reduce ? undefined : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* legs */}
            <div className="absolute" style={{ left: "calc(50% - 3px)", bottom: 1, width: 2, height: 9, borderRadius: 2, background: "linear-gradient(to bottom, #9fe8d8, #3f7d72)" }} />
            <div className="absolute" style={{ left: "calc(50% + 1px)", bottom: 1, width: 2, height: 9, borderRadius: 2, background: "linear-gradient(to bottom, #9fe8d8, #3f7d72)" }} />
            {/* arms */}
            <div className="absolute" style={{ left: "calc(50% - 6.5px)", bottom: 10, width: 2, height: 8, borderRadius: 2, background: "linear-gradient(to bottom, #8fdccb, #3f7d72)", transform: "rotate(14deg)" }} />
            <div className="absolute" style={{ left: "calc(50% + 4.5px)", bottom: 10, width: 2, height: 8, borderRadius: 2, background: "linear-gradient(to bottom, #8fdccb, #3f7d72)", transform: "rotate(-14deg)" }} />
            {/* torso */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 8, width: 8, height: 11, borderRadius: "45% 45% 38% 38%", background: "linear-gradient(160deg, #c6f3e8 0%, #6fc3b2 52%, #3a7568 100%)", boxShadow: "0 0 6px rgba(94,234,212,0.35)" }} />
            {/* elongated head */}
            <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: 16, width: 13, height: 14, borderRadius: "52% 52% 50% 50% / 62% 62% 40% 40%", background: "radial-gradient(circle at 50% 32%, #def7ef, #62b6a6 68%, #356b60)", boxShadow: "0 0 8px rgba(94,234,212,0.4)" }}
            >
                {/* large slanted almond eyes */}
                <div className="absolute" style={{ left: 1.5, top: 4.5, width: 4.5, height: 6, background: "#0a1418", borderRadius: "65% 35% 55% 45%", transform: "rotate(22deg)" }} />
                <div className="absolute" style={{ right: 1.5, top: 4.5, width: 4.5, height: 6, background: "#0a1418", borderRadius: "35% 65% 45% 55%", transform: "rotate(-22deg)" }} />
            </div>
            {/* crown (leader only) */}
            {leader && (
                <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                        bottom: 30,
                        width: 12,
                        height: 5,
                        background: "linear-gradient(to bottom, #fde68a, #f59e0b)",
                        clipPath: "polygon(0 100%, 0 45%, 18% 72%, 34% 0, 50% 72%, 66% 0, 82% 72%, 100% 45%, 100% 100%)",
                        boxShadow: "0 0 5px rgba(253,224,138,0.85)",
                    }}
                />
            )}
        </motion.div>
    </div>
);

export const SignalRings = () => {
    const reduce = useReducedMotion();
    const [phaseIndex, setPhaseIndex] = useState(START_INDEX);
    const [lineIdx, setLineIdx] = useState(0);
    const bagRef = useRef<number[]>([]);
    const rootRef = useRef<HTMLDivElement>(null);
    const inView = useInView(rootRef, { margin: "200px" });

    // Scale the whole scene to fit its container width so the rings and the
    // leader's speech bubble stay in bounds on any screen (not just breakpoints).
    const [sceneScale, setSceneScale] = useState(1);
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const SCENE_W = 500;
        const update = () => {
            const w = el.clientWidth;
            if (w > 0) setSceneScale(Math.min(1, Math.max(0.55, (w * 0.9) / SCENE_W)));
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Advance the choreography only while the section is on-screen.
    useEffect(() => {
        if (reduce || !inView) return;
        const id = window.setTimeout(() => setPhaseIndex((i) => (i + 1) % SEQUENCE.length), SEQUENCE[phaseIndex].d);
        return () => window.clearTimeout(id);
    }, [phaseIndex, reduce, inView]);

    // Reset to the top of the loop whenever it leaves view, so it replays fresh on return.
    useEffect(() => {
        if (!inView) {
            setPhaseIndex(START_INDEX);
            bagRef.current = [];
        }
    }, [inView]);

    const phase = reduce ? "disembark" : SEQUENCE[phaseIndex].p;
    const orbiting = phase === "orbit";
    const hatchOpen = phase === "open" || phase === "disembark" || phase === "gather" || phase === "speak" || phase === "board";
    const thrust = phase === "ascend" || phase === "descend";
    const showBubble = phase === "speak" || !!reduce;

    // Choose the leader's next line as they gather (shuffle bag: random, no repeat until all used).
    useEffect(() => {
        if (reduce || phase !== "gather") return;
        setLineIdx((prev) => {
            if (bagRef.current.length === 0) {
                const order = Array.from({ length: LINES.length }, (_, i) => i);
                for (let i = order.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [order[i], order[j]] = [order[j], order[i]];
                }
                if (order[0] === prev && order.length > 1) [order[0], order[1]] = [order[1], order[0]];
                bagRef.current = order;
            }
            return bagRef.current.shift() ?? prev;
        });
    }, [phase, reduce]);

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
        const N = 36;
        const x: number[] = [];
        const y: number[] = [];
        const scale: number[] = [];
        const zIndex: number[] = [];
        const times: number[] = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const theta = -Math.PI / 2 + t * Math.PI * 2;
            const p = projectOrbit(theta);
            x.push(+p.x.toFixed(2));
            y.push(+p.y.toFixed(2));
            scale.push(+p.scale.toFixed(3));
            zIndex.push(Math.sin(theta) >= 0 ? 20 : 5); // front half in front of the base
            times.push(+t.toFixed(4));
        }
        return { x, y, scale, zIndex, times };
    }, []);

    // UFO animation per phase
    let ufoAnimate: Record<string, number | number[]>;
    let ufoTransition: Transition;
    if (orbiting) {
        // Two loops along the true projected ground-plane ellipse, beginning and
        // ending at the apex (above the pad), finishing just before the phase ends.
        ufoAnimate = { x: orbit.x, y: orbit.y, scale: orbit.scale, zIndex: orbit.zIndex };
        ufoTransition = { duration: 5.8, times: orbit.times, repeat: 1, ease: "linear" };
    } else if (phase === "ascend") {
        // Vertical takeoff: straight up from the pad to the hover point above it.
        ufoAnimate = { x: 0, y: APEX.y, scale: APEX.scale, rotate: 0, opacity: 1, zIndex: 5 };
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
        <div ref={rootRef} style={{ transform: `scale(${sceneScale})` }} className="pointer-events-none relative flex h-full w-full items-center justify-center overflow-visible">
            {inView && (
                <>
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
                    aAnimate = { x: ALIEN_CLUSTER[i].x, y: ALIEN_CLUSTER[i].y, scale: 1, opacity: 1 };
                    aTransition = { duration: 0 };
                } else if (phase === "disembark") {
                    aAnimate = { x: roam.x, y: roam.y, scale: [0, 1, 1, 1, 1], opacity: [0, 1, 1, 1, 1] };
                    aTransition = { duration: 4.0, times: ALIEN_TIMES, delay: i * 0.1, ease: "easeInOut" };
                } else if (phase === "gather" || phase === "speak") {
                    aAnimate = { x: ALIEN_CLUSTER[i].x, y: ALIEN_CLUSTER[i].y, scale: 1, opacity: 1 };
                    aTransition = { duration: 1.1, delay: i * 0.08, ease: "easeInOut" };
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
                        style={{ left: "50%", top: "50%", marginLeft: -9, marginTop: -15, zIndex: 22 }}
                        initial={{ x: 0, y: LAND_Y, scale: 0, opacity: 0 }}
                        animate={aAnimate}
                        transition={aTransition}
                    >
                        <Alien reduce={reduce} leader={i === 0} />
                    </motion.div>
                );
            })}

            {/* Leader's speech bubble */}
            <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, 22px) translateY(-100%)", zIndex: 30, width: 168 }}>
                <motion.div
                    className="relative mx-auto"
                    style={{
                        maxWidth: 168,
                        width: "fit-content",
                        padding: "5px 10px",
                        borderRadius: 10,
                        background: "rgba(8,15,20,0.92)",
                        border: "1px solid rgba(94,234,212,0.5)",
                        boxShadow: "0 0 14px rgba(94,234,212,0.25)",
                        color: "#bdf0e6",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 9.5,
                        lineHeight: 1.35,
                        textAlign: "center",
                        transformOrigin: "bottom center",
                    }}
                    initial={{ opacity: 0, scale: 0.8, y: 6 }}
                    animate={showBubble ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 6 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                >
                    {LINES[lineIdx]}
                    {/* tail pointing down to the leader */}
                    <div
                        className="absolute left-1/2"
                        style={{ bottom: -4, width: 8, height: 8, transform: "translateX(-50%) rotate(45deg)", background: "rgba(8,15,20,0.92)", borderRight: "1px solid rgba(94,234,212,0.5)", borderBottom: "1px solid rgba(94,234,212,0.5)" }}
                    />
                </motion.div>
            </div>

            {/* UFO */}
            <motion.div
                className="absolute"
                style={{ left: "50%", top: "50%", width: 58, height: 22, marginLeft: -29, marginTop: -11 }}
                initial={{ x: 0, y: LAND_Y, scale: LAND_SCALE, rotate: 0, opacity: 1, zIndex: 20 }}
                animate={ufoAnimate}
                transition={ufoTransition}
            >
                <Ufo reduce={reduce} hatchOpen={hatchOpen} thrust={thrust} />
            </motion.div>
                </>
            )}
        </div>
    );
};
