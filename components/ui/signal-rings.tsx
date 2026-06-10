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
    { p: "descend", d: 2100 },
    { p: "open", d: 800 },
    { p: "disembark", d: 4200 },
    { p: "gather", d: 1200 },
    { p: "speak", d: 3800 },
    { p: "board", d: 1800 },
    { p: "close", d: 800 },
    { p: "ascend", d: 1500 },
] as const;
const START_INDEX = 3; // begin parked with the hatch open

// The leader (index 0) stays centred in front of the ship; the other two split
// off to opposite sides so all three drift different ways.
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

// ---- Flying saucer (SVG, gunmetal, directional lighting) ------------------
const Ufo = ({ reduce, hatchOpen, thrust }: { reduce: boolean | null; hatchOpen: boolean; thrust: boolean }) => (
    <motion.div
        className="relative"
        style={{ width: 58, height: 22 }}
        animate={reduce ? undefined : { y: [0, -1.5, 0] }}
        transition={reduce ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
    >
        <svg viewBox="0 0 58 24" width="58" height="24" style={{ overflow: "visible", display: "block" }} aria-hidden>
            <defs>
                <linearGradient id="sigUfoHull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7e8a99" />
                    <stop offset="0.4" stopColor="#46505e" />
                    <stop offset="0.75" stopColor="#232b36" />
                    <stop offset="1" stopColor="#11161e" />
                </linearGradient>
                <linearGradient id="sigUfoTop" x1="0.3" y1="0" x2="0.7" y2="1">
                    <stop offset="0" stopColor="#b8c2cd" />
                    <stop offset="0.6" stopColor="#5e6a78" />
                    <stop offset="1" stopColor="#39434f" />
                </linearGradient>
                <radialGradient id="sigUfoDome" cx="0.38" cy="0.28" r="1">
                    <stop offset="0" stopColor="#9fb4c2" stopOpacity="0.85" />
                    <stop offset="0.45" stopColor="#27343f" />
                    <stop offset="1" stopColor="#0a1118" />
                </radialGradient>
                <linearGradient id="sigUfoBeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(125,211,252,0.25)" />
                    <stop offset="1" stopColor="rgba(125,211,252,0)" />
                </linearGradient>
                <radialGradient id="sigUfoThrust" cx="0.5" cy="0.1" r="0.9">
                    <stop offset="0" stopColor="rgba(190,225,255,0.75)" />
                    <stop offset="1" stopColor="rgba(125,211,252,0)" />
                </radialGradient>
            </defs>

            {/* Ion thrust (takeoff / landing) */}
            <motion.ellipse
                cx="29"
                cy="24"
                rx="6"
                ry="8"
                fill="url(#sigUfoThrust)"
                animate={reduce ? { opacity: thrust ? 0.6 : 0 } : { opacity: thrust ? [0.4, 0.85, 0.4] : 0 }}
                transition={reduce ? { duration: 0.3 } : { duration: 0.5, repeat: thrust ? Infinity : 0, ease: "easeInOut" }}
            />
            {/* Boarding beam while the hatch is open */}
            <motion.path
                d="M25 18 L33 18 L40 32 L18 32 Z"
                fill="url(#sigUfoBeam)"
                animate={{ opacity: hatchOpen ? 1 : 0 }}
                transition={{ duration: 0.5 }}
            />

            {/* Smoked dome (behind the hull cap) */}
            <ellipse cx="29" cy="7" rx="7.5" ry="5.5" fill="url(#sigUfoDome)" />
            <path d="M24.5 4.6 Q27.5 2.8 31.5 4.2" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" fill="none" strokeLinecap="round" />

            {/* Upper hull cap */}
            <ellipse cx="29" cy="10.5" rx="13" ry="4.4" fill="url(#sigUfoTop)" />
            <path d="M18 9.2 Q29 6.4 40 9.2" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" fill="none" />

            {/* Main saucer */}
            <ellipse cx="29" cy="14.2" rx="28" ry="6.6" fill="url(#sigUfoHull)" />
            {/* Off-centre specular (keylight from upper-left) */}
            <ellipse cx="20" cy="11.6" rx="12" ry="2" fill="rgba(255,255,255,0.16)" />
            {/* Panel seams */}
            <path d="M3.5 15.5 Q29 22 54.5 15.5" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" fill="none" />
            <path d="M7 12.4 Q29 8.6 51 12.4" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" fill="none" />
            {/* Rim edge */}
            <ellipse cx="29" cy="14.2" rx="28" ry="6.6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            {/* Underside shadow */}
            <ellipse cx="29" cy="17.4" rx="15" ry="2.6" fill="rgba(0,0,0,0.45)" />

            {/* Hatch (opens/closes) */}
            <motion.ellipse
                cx="29"
                cy="17.8"
                rx="4.6"
                fill="#0a1016"
                stroke="rgba(125,211,252,0.55)"
                strokeWidth="0.5"
                animate={{ ry: hatchOpen ? 1.9 : 0.45, opacity: hatchOpen ? 1 : 0.45 }}
                transition={{ duration: 0.5 }}
            />

            {/* Dim warm running lights along the rim */}
            {[-21, -10.5, 0, 10.5, 21].map((dx, i) => (
                <motion.circle
                    key={i}
                    cx={29 + dx}
                    cy={16 - Math.abs(dx) * 0.055}
                    r="0.75"
                    fill="#ffd9a0"
                    animate={reduce ? undefined : { opacity: [0.2, 0.7, 0.2] }}
                    transition={reduce ? undefined : { duration: 2.4, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
        </svg>
    </motion.div>
);

// ---- Alien (SVG, muted sage, soft key light) ------------------------------
const Alien = ({ reduce, leader = false }: { reduce: boolean | null; leader?: boolean }) => (
    <div className="relative" style={{ width: 20, height: 34, transform: leader ? "scale(1.3)" : undefined, transformOrigin: "bottom center" }}>
        {/* faint presence glow, just enough to read on the dark ground */}
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 24, height: 34, background: `radial-gradient(ellipse at center, rgba(125,200,180,${leader ? 0.2 : 0.13}), transparent 70%)`, filter: "blur(2px)" }}
        />
        <motion.div
            className="absolute inset-0"
            animate={reduce ? undefined : { y: [0, -1.5, 0] }}
            transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
            <svg viewBox="0 0 20 34" width="20" height="34" style={{ overflow: "visible", display: "block" }} aria-hidden>
                <defs>
                    <radialGradient id="sigAlienHead" cx="0.4" cy="0.28" r="1">
                        <stop offset="0" stopColor="#c2d4c8" />
                        <stop offset="0.55" stopColor="#7e988a" />
                        <stop offset="1" stopColor="#465a4f" />
                    </radialGradient>
                    <linearGradient id="sigAlienBody" x1="0.3" y1="0" x2="0.7" y2="1">
                        <stop offset="0" stopColor="#9db4a6" />
                        <stop offset="1" stopColor="#4c6156" />
                    </linearGradient>
                </defs>

                {/* ground shadow */}
                <ellipse cx="10" cy="33" rx="6" ry="1.5" fill="rgba(0,0,0,0.5)" />

                {/* legs */}
                <path d="M8.2 25.5 L7.7 31.6" stroke="url(#sigAlienBody)" strokeWidth="2" strokeLinecap="round" />
                <path d="M11.8 25.5 L12.3 31.6" stroke="url(#sigAlienBody)" strokeWidth="2" strokeLinecap="round" />

                {/* arms, slightly bent */}
                <path d="M6.6 18 Q4.6 20.5 5.2 23.5" stroke="url(#sigAlienBody)" strokeWidth="1.7" strokeLinecap="round" fill="none" />
                <path d="M13.4 18 Q15.4 20.5 14.8 23.5" stroke="url(#sigAlienBody)" strokeWidth="1.7" strokeLinecap="round" fill="none" />

                {/* torso, narrow shoulders */}
                <path d="M7.2 16.5 Q10 15.2 12.8 16.5 L12.2 26 Q10 27.2 7.8 26 Z" fill="url(#sigAlienBody)" />
                {/* torso rim light */}
                <path d="M7.6 17 Q8 21 8 25.4" stroke="rgba(220,240,228,0.35)" strokeWidth="0.5" fill="none" />

                {/* elongated head, tapered chin */}
                <path d="M10 1.2 C14.6 1.2 16.7 4.8 16.1 8.8 C15.6 12.4 12.9 15.4 10 15.4 C7.1 15.4 4.4 12.4 3.9 8.8 C3.3 4.8 5.4 1.2 10 1.2 Z" fill="url(#sigAlienHead)" />
                {/* skull highlight */}
                <path d="M6.4 3.6 Q8.2 2.2 10.6 2.5" stroke="rgba(235,245,238,0.5)" strokeWidth="0.6" fill="none" strokeLinecap="round" />

                {/* slanted almond eyes with a faint glint */}
                <path d="M5.2 7.4 C6.3 6 8.2 6.6 8.5 8.3 C8.7 9.8 7.2 10.9 6.1 10.1 C5.1 9.4 4.7 8.2 5.2 7.4 Z" fill="#0c1310" />
                <path d="M14.8 7.4 C13.7 6 11.8 6.6 11.5 8.3 C11.3 9.8 12.8 10.9 13.9 10.1 C14.9 9.4 15.3 8.2 14.8 7.4 Z" fill="#0c1310" />
                <circle cx="6.6" cy="7.8" r="0.4" fill="rgba(255,255,255,0.55)" />
                <circle cx="13.2" cy="7.8" r="0.4" fill="rgba(255,255,255,0.55)" />

                {/* leader's circlet: a slim metal band with a teal gem */}
                {leader && (
                    <g>
                        <path d="M4.6 4.9 Q10 2.6 15.4 4.9" stroke="#9aa9b8" strokeWidth="1" fill="none" strokeLinecap="round" />
                        <circle cx="10" cy="3.1" r="1.4" fill="rgba(94,234,212,0.25)" />
                        <circle cx="10" cy="3.1" r="0.75" fill="#5eead4" />
                    </g>
                )}
            </svg>
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
        const N = 84;
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
        // ending at the apex (above the pad), timed to hand off exactly when the
        // phase flips (no frozen hold).
        ufoAnimate = { x: orbit.x, y: orbit.y, scale: orbit.scale, zIndex: orbit.zIndex };
        ufoTransition = { duration: 6, times: orbit.times, repeat: 1, ease: "linear" };
    } else if (phase === "ascend") {
        // Vertical takeoff: a slight crouch, then a smooth accelerating climb
        ufoAnimate = {
            x: 0,
            y: [LAND_Y, LAND_Y + 3, APEX.y],
            scale: [LAND_SCALE, LAND_SCALE * 0.99, APEX.scale],
            rotate: 0,
            opacity: 1,
            zIndex: 5,
        };
        ufoTransition = { duration: 1.5, times: [0, 0.16, 1], ease: ["easeOut", [0.45, 0.05, 0.45, 1]] };
    } else if (phase === "descend") {
        // Vertical landing: glide down, brake just above the pad, settle softly
        ufoAnimate = {
            x: 0,
            y: [APEX.y, LAND_Y - 6, LAND_Y],
            scale: [APEX.scale, LAND_SCALE, LAND_SCALE],
            rotate: 0,
            opacity: 1,
            zIndex: 20,
        };
        ufoTransition = { duration: 2.1, times: [0, 0.78, 1], ease: [[0.4, 0, 0.3, 1], "easeOut"] };
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
                    aAnimate = { x: roam.x, y: roam.y, rotate: 0, scale: [0, 1, 1, 1, 1], opacity: [0, 1, 1, 1, 1] };
                    aTransition = { duration: 4.0, times: ALIEN_TIMES, delay: i * 0.1, ease: "easeInOut" };
                } else if (phase === "gather" || phase === "speak") {
                    aAnimate = { x: ALIEN_CLUSTER[i].x, y: ALIEN_CLUSTER[i].y, rotate: 0, scale: 1, opacity: 1 };
                    aTransition = { duration: 1.1, delay: i * 0.08, ease: "easeInOut" };
                } else if (phase === "board") {
                    aAnimate = { x: 0, y: LAND_Y, rotate: 0, scale: 0, opacity: 0 };
                    aTransition = { duration: 1.0, delay: i * 0.12, ease: "easeIn" };
                } else {
                    aAnimate = { x: 0, y: LAND_Y, rotate: 0, scale: 0, opacity: 0 };
                    aTransition = { duration: 0.3 };
                }
                return (
                    <motion.div
                        key={i}
                        className="absolute"
                        style={{ left: "50%", top: "50%", marginLeft: -10, marginTop: -17, zIndex: 22 }}
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
