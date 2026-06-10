"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// After 10s of inactivity an alien walks in from the right edge (in profile,
// legs actually stepping), strolls to the centre of the screen, turns to face
// you and browses around - head turning this way and that. Any activity:
// a startled beat, then he turns sideways and sprints back out.
// Artwork: public/alien-front.svg / alien-profile.svg, inlined and rigged.
const IDLE_MS = 10000;

// Muttered while he browses the page, thinking nobody's watching
const ALIEN_LINES = [
    "Hello? Anyone home?",
    "Hmm. Nice portfolio. For a human.",
    "Don't mind me. Just browsing.",
    "The human seems to be away...",
    "I was told there would be snacks.",
    "Interesting species. Writes TypeScript.",
    "Earth UI has gotten better, honestly.",
    "Should I sign the guestbook?",
    "Our pilots could learn from this one.",
    "No bugs spotted. Suspicious.",
    "I could abduct this website. Hypothetically.",
    "Dark mode. A civilized planet after all.",
    "Wait till the mothership sees this.",
    "Smells like caffeine in here.",
    "Definitely stealing this idea for my homeworld.",
];

type Phase = "hidden" | "walkin" | "turnF" | "idle" | "startled" | "turnS" | "flee";

export const IdleAlien = () => {
    const reduce = useReducedMotion();
    const [phase, setPhase] = useState<Phase>("hidden");
    const [centerX, setCenterX] = useState(-300);
    const phaseRef = useRef<Phase>("hidden");
    phaseRef.current = phase;
    const lastActivity = useRef(Date.now());

    useEffect(() => {
        if (reduce) return;
        const onActivity = () => {
            lastActivity.current = Date.now();
            if (phaseRef.current === "walkin" || phaseRef.current === "turnF" || phaseRef.current === "idle") {
                setPhase("startled");
            }
        };
        const events: (keyof WindowEventMap)[] = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"];
        events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

        const interval = window.setInterval(() => {
            if (phaseRef.current === "hidden" && Date.now() - lastActivity.current >= IDLE_MS && !document.hidden) {
                setCenterX(-(window.innerWidth / 2) + 30);
                setPhase("walkin");
            }
        }, 1000);

        return () => {
            events.forEach((ev) => window.removeEventListener(ev, onActivity));
            clearInterval(interval);
        };
    }, [reduce]);

    // A frozen "caught!" beat, then he turns and bolts
    useEffect(() => {
        if (phase !== "startled") return;
        const t = window.setTimeout(() => setPhase("turnS"), 550);
        return () => clearTimeout(t);
    }, [phase]);

    // Muttering while browsing: show a line, pause, show the next (shuffle bag,
    // no repeats until the pool is exhausted). Vanishes the instant he's caught.
    const [bubble, setBubble] = useState<string | null>(null);
    const lineBag = useRef<string[]>([]);
    useEffect(() => {
        if (phase !== "idle") {
            setBubble(null);
            return;
        }
        let alive = true;
        let t: number;
        const nextLine = () => {
            if (!lineBag.current.length) {
                const pool = [...ALIEN_LINES];
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                lineBag.current = pool;
            }
            return lineBag.current.pop() as string;
        };
        const showOne = (delay: number) => {
            t = window.setTimeout(() => {
                if (!alive) return;
                setBubble(nextLine());
                t = window.setTimeout(() => {
                    if (!alive) return;
                    setBubble(null);
                    showOne(2400);
                }, 3800);
            }, delay);
        };
        showOne(1400);
        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [phase]);

    // Sprite walk cycle: frames 1 -> 2 -> 3 -> 2 while striding
    const [stepTick, setStepTick] = useState(0);
    const stridingNow = phase === "walkin" || phase === "flee";
    useEffect(() => {
        if (!stridingNow) return;
        const ms = phaseRef.current === "flee" ? 70 : 150;
        const id = window.setInterval(() => setStepTick((t) => t + 1), ms);
        return () => clearInterval(id);
    }, [stridingNow, phase]);

    if (reduce) return null;

    const walking = phase === "walkin";
    const fleeing = phase === "flee";
    const profileVisible = phase === "walkin" || phase === "turnF" || phase === "turnS" || fleeing;
    const frontVisible = phase === "turnF" || phase === "idle" || phase === "startled" || phase === "turnS";
    const legDur = fleeing ? 0.28 : 0.6;
    const striding = walking || fleeing;

    const containerAnimate =
        phase === "walkin"
            ? { x: centerX, scaleX: 1 }
            : phase === "turnF" || phase === "turnS"
                ? { x: centerX, scaleX: [1, 0.14, 1] }
                : phase === "flee"
                    ? { x: 90, scaleX: 1 }
                    : { x: centerX, scaleX: 1 };
    const containerTransition =
        phase === "walkin"
            ? { x: { duration: 3.4, ease: "linear" as const }, scaleX: { duration: 0.1 } }
            : phase === "turnF" || phase === "turnS"
                ? { duration: 0.34, times: [0, 0.5, 1] }
                : phase === "flee"
                    ? { x: { duration: 1.1, ease: "easeIn" as const }, scaleX: { duration: 0.1 } }
                    : { duration: 0.2 };

    const turnFade = (visibleNow: boolean, appearing: boolean) =>
        visibleNow ? (phase === "turnF" || phase === "turnS" ? (appearing ? [0, 0, 1] : [1, 1, 0]) : 1) : 0;
    const turnFadeT = phase === "turnF" || phase === "turnS" ? { duration: 0.34, times: [0, 0.5, 1] } : { duration: 0.1 };

    return (
        <div className="pointer-events-none fixed bottom-[8%] right-0 z-[80]" aria-hidden>
            <AnimatePresence>
                {phase !== "hidden" && (
                    <motion.div
                        initial={{ x: 80, scaleX: 1 }}
                        animate={containerAnimate}
                        transition={containerTransition}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        onAnimationComplete={() => {
                            const p = phaseRef.current;
                            if (p === "walkin") setPhase("turnF");
                            else if (p === "turnF") setPhase("idle");
                            else if (p === "turnS") setPhase("flee");
                            else if (p === "flee") {
                                lastActivity.current = Date.now();
                                setPhase("hidden");
                            }
                        }}
                        className="relative"
                        style={{ width: 54, height: 108 }}
                    >
                        {/* Browsing mutters: anchored above the head, grows upward */}
                        <div className="pointer-events-none absolute bottom-full left-0 right-0 z-10 mb-1.5 flex items-end justify-center">
                            <AnimatePresence>
                                {phase === "idle" && bubble && (
                                    <motion.div
                                        key={bubble}
                                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.9 }}
                                        transition={{ duration: 0.25, ease: "easeOut" }}
                                        className="relative w-max max-w-[280px] shrink-0 rounded-xl border border-teal-400/40 bg-black/85 px-3.5 py-1.5 text-center font-mono text-[11px] leading-snug text-teal-100 shadow-[0_0_14px_rgba(45,212,191,0.25)]"
                                        style={{ transformOrigin: "bottom center" }}
                                    >
                                        {bubble}
                                        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-teal-400/40 bg-black/85" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Caught! */}
                        <div className="pointer-events-none absolute bottom-full left-0 right-0 z-20 mb-1.5 flex justify-center">
                            <AnimatePresence>
                                {phase === "startled" && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.6, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                                        className="rounded-full border border-teal-400/50 bg-black/85 px-2 py-0.5 font-mono text-base font-bold text-teal-300"
                                    >
                                        !
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Step-bounce while striding, calm bob while browsing */}
                        <motion.div
                            className="absolute inset-0"
                            animate={striding ? { y: [0, -2, 0] } : { y: [0, -1.5, 0] }}
                            transition={
                                striding
                                    ? { duration: legDur / 2, repeat: Infinity, ease: "easeInOut" }
                                    : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                            }
                        >
                            <svg viewBox="0 0 256 512" width="54" height="108" style={{ overflow: "visible", display: "block" }}>
                                <defs>
                                    <radialGradient id="ia-headSkin" cx="38%" cy="25%" r="90%">
                                        <stop offset="0%" stopColor="#C2D4C8" />
                                        <stop offset="55%" stopColor="#7E988A" />
                                        <stop offset="100%" stopColor="#465A4F" />
                                    </radialGradient>
                                    <linearGradient id="ia-bodySkin" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#C2D4C8" />
                                        <stop offset="40%" stopColor="#7E988A" />
                                        <stop offset="80%" stopColor="#465A4F" />
                                        <stop offset="100%" stopColor="#64888D" />
                                    </linearGradient>
                                    <linearGradient id="ia-profileSkin" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#C2D4C8" />
                                        <stop offset="50%" stopColor="#7E988A" />
                                        <stop offset="100%" stopColor="#465A4F" />
                                    </linearGradient>
                                    <linearGradient id="ia-backSkin" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#5C7A68" />
                                        <stop offset="50%" stopColor="#3A4A41" />
                                        <stop offset="100%" stopColor="#24302A" />
                                    </linearGradient>
                                    <radialGradient id="ia-eyeGloss" cx="40%" cy="40%" r="60%">
                                        <stop offset="0%" stopColor="#1A2520" />
                                        <stop offset="100%" stopColor="#050806" />
                                    </radialGradient>
                                    <linearGradient id="ia-innerShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#3A4A41" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#7E988A" stopOpacity="0" />
                                    </linearGradient>
                                </defs>

                                {/* ground shadow */}
                                <ellipse cx="128" cy="500" rx="58" ry="9" fill="rgba(0,0,0,0.4)" />

                                {/* ================= PROFILE POSE (walking / fleeing) =================
                                    Sprite walk cycle from public/alien-walk-{1,2,3}.svg:
                                    head + torso are identical across frames (registration), only the
                                    legs and near arm swap. Sequence 1 -> 2 -> 3 -> 2. */}
                                {(() => {
                                    const frameIdx = stridingNow ? [0, 1, 2, 1][stepTick % 4] : 1;
                                    const show = (i: number) => ({ display: frameIdx === i ? undefined : "none" });
                                    return (
                                        <motion.g
                                            animate={{ opacity: turnFade(profileVisible, phase === "turnS") }}
                                            transition={turnFadeT}
                                            style={fleeing || phase === "turnS" ? { transform: "scaleX(-1)", transformOrigin: "128px 256px" } : undefined}
                                        >
                                            {/* back leg + far arm (behind torso), one set per frame.
                                                The far arm counter-swings the near arm. */}
                                            <g style={show(0)}>
                                                <path d="M 125 360 C 135 400, 155 440, 175 480 C 180 490, 165 495, 160 485 C 140 445, 120 400, 115 365 Z" fill="url(#ia-backSkin)" />
                                                <path d="M 125 245 C 115 270, 85 300, 65 335 C 60 345, 70 350, 75 340 C 95 305, 135 270, 135 250 C 135 245, 130 240, 125 245 Z" fill="url(#ia-backSkin)" />
                                            </g>
                                            <g style={show(1)}>
                                                <path d="M 125 360 C 125 400, 125 440, 130 485 C 135 495, 115 495, 110 485 C 105 445, 105 400, 115 365 Z" fill="url(#ia-backSkin)" />
                                                <path d="M 123 245 C 123 270, 133 310, 138 355 C 143 365, 133 370, 128 360 C 123 320, 113 270, 113 250 Z" fill="url(#ia-backSkin)" />
                                            </g>
                                            <g style={show(2)}>
                                                <path d="M 125 360 C 115 400, 90 440, 70 480 C 65 490, 80 495, 85 485 C 105 445, 130 400, 140 365 Z" fill="url(#ia-backSkin)" />
                                                <path d="M 123 245 C 138 270, 158 310, 173 355 C 178 365, 168 370, 163 360 C 148 320, 128 270, 113 250 Z" fill="url(#ia-backSkin)" />
                                            </g>

                                            {/* torso (static across frames) */}
                                            <path d="M 105 230 C 95 260, 100 320, 105 365 C 115 375, 135 370, 135 360 C 145 310, 135 260, 125 230 Z" fill="url(#ia-profileSkin)" />

                                            {/* front leg + near arm, one set per frame */}
                                            <g style={show(0)}>
                                                <path d="M 115 360 C 105 400, 80 440, 60 480 C 55 490, 70 495, 75 485 C 95 445, 120 400, 130 365 Z" fill="url(#ia-profileSkin)" />
                                                <path d="M 115 245 C 130 270, 150 310, 165 355 C 170 365, 160 370, 155 360 C 140 320, 120 270, 105 250 Z" fill="url(#ia-profileSkin)" />
                                            </g>
                                            <g style={show(1)}>
                                                <path d="M 115 360 C 90 370, 80 400, 85 420 C 95 445, 105 460, 115 465 C 125 470, 130 460, 120 455 C 110 450, 100 435, 95 420 C 95 400, 105 380, 130 365 Z" fill="url(#ia-profileSkin)" />
                                                <path d="M 115 245 C 115 270, 125 310, 130 355 C 135 365, 125 370, 120 360 C 115 320, 105 270, 105 250 Z" fill="url(#ia-profileSkin)" />
                                            </g>
                                            <g style={show(2)}>
                                                <path d="M 115 360 C 125 400, 145 440, 165 480 C 170 490, 155 495, 150 485 C 130 445, 110 400, 105 365 Z" fill="url(#ia-profileSkin)" />
                                                <path d="M 115 245 C 90 260, 60 280, 40 310 C 35 320, 45 325, 50 315 C 70 285, 100 265, 125 250 Z" fill="url(#ia-profileSkin)" />
                                            </g>

                                            {/* profile head (static across frames) */}
                                            <g>
                                                <path d="M 120 220 C 110 170, 175 160, 205 120 C 230 85, 195 40, 140 30 C 95 20, 65 60, 55 90 C 45 120, 40 140, 40 150 C 40 160, 50 170, 45 175 C 40 180, 40 190, 50 195 C 60 200, 80 220, 100 220 Z" fill="url(#ia-profileSkin)" />
                                                <path d="M 45 145 C 55 135, 80 145, 90 160 C 70 165, 55 155, 45 145 Z" fill="url(#ia-eyeGloss)" />
                                                <path d="M 45 145 C 55 135, 80 145, 90 160 C 70 165, 55 155, 45 145 Z" fill="none" stroke="#24302A" strokeWidth="1.5" opacity="0.6" />
                                                <ellipse cx="55" cy="146" rx="2" ry="4" fill="#FFFFFF" transform="rotate(-15 55 146)" />
                                                <ellipse cx="53" cy="151" rx="1" ry="2" fill="#FFFFFF" opacity="0.4" transform="rotate(-15 53 151)" />
                                                <path d="M 45 190 Q 50 193 55 190" stroke="#3A4A41" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
                                            </g>
                                        </motion.g>
                                    );
                                })()}

                                {/* ================= FRONT POSE (browsing) ================= */}
                                <motion.g animate={{ opacity: turnFade(frontVisible, phase === "turnF") }} transition={turnFadeT}>
                                    {/* legs */}
                                    <g>
                                        <path d="M 105 360 C 105 400, 95 450, 90 485 C 88 495, 108 495, 105 485 C 110 450, 120 400, 120 365 C 115 365, 110 360, 105 360 Z" fill="url(#ia-bodySkin)" />
                                        <path d="M 120 365 C 120 400, 110 450, 105 485 C 108 450, 120 400, 120 365 Z" fill="#2E3C34" opacity="0.4" />
                                    </g>
                                    <g>
                                        <path d="M 151 360 C 151 400, 161 450, 166 485 C 168 495, 148 495, 151 485 C 146 450, 136 400, 136 365 C 141 365, 146 360, 151 360 Z" fill="url(#ia-bodySkin)" />
                                        <path d="M 136 365 C 136 400, 146 450, 151 485 C 148 450, 136 400, 136 365 Z" fill="#2E3C34" opacity="0.4" />
                                    </g>
                                    {/* torso + neck */}
                                    <path d="M 115 210 L 141 210 L 138 245 L 118 245 Z" fill="url(#ia-bodySkin)" />
                                    <path d="M 105 230 C 85 230, 75 245, 80 270 C 90 310, 105 340, 105 365 C 105 380, 151 380, 151 365 C 151 340, 166 310, 176 270 C 181 245, 171 230, 151 230 Z" fill="url(#ia-bodySkin)" />
                                    <path d="M 105 365 C 105 380, 151 380, 151 365 C 151 340, 166 310, 176 270 C 171 310, 156 340, 151 365 Z" fill="url(#ia-innerShadow)" opacity="0.5" />
                                    {/* arms */}
                                    <path d="M 85 255 C 65 285, 60 325, 72 405 C 74 415, 82 415, 80 405 C 72 330, 80 290, 95 265 C 95 260, 90 250, 85 255 Z" fill="url(#ia-bodySkin)" />
                                    <path d="M 171 255 C 191 285, 196 325, 184 405 C 182 415, 174 415, 176 405 C 184 330, 176 290, 161 265 C 161 260, 166 250, 171 255 Z" fill="url(#ia-bodySkin)" />

                                    {/* head: turns this way and that while browsing */}
                                    <motion.g
                                        style={{ transformOrigin: "128px 215px" }}
                                        animate={phase === "idle" ? { rotate: [0, -7, -7, 0, 7, 7, 0] } : { rotate: 0 }}
                                        transition={
                                            phase === "idle"
                                                ? { duration: 6.5, times: [0, 0.14, 0.32, 0.48, 0.62, 0.86, 1], repeat: Infinity, ease: "easeInOut" }
                                                : { duration: 0.15 }
                                        }
                                    >
                                        <path d="M 128 20 C 170 20, 195 60, 195 120 C 195 180, 150 220, 128 230 C 106 220, 61 180, 61 120 C 61 60, 86 20, 128 20 Z" fill="url(#ia-headSkin)" />

                                        {/* eyes: wander with the gaze, snap wide when startled, blink */}
                                        <motion.g
                                            style={{ transformOrigin: "128px 150px" }}
                                            animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
                                            transition={{ duration: 4.4, times: [0, 0.46, 0.5, 0.54, 1], repeat: Infinity }}
                                        >
                                            <motion.g
                                                style={{ transformOrigin: "128px 150px" }}
                                                animate={
                                                    phase === "idle"
                                                        ? { x: [0, -7, -7, 0, 7, 7, 0], scale: 1 }
                                                        : phase === "startled"
                                                            ? { x: 0, scale: 1.18 }
                                                            : { x: 0, scale: 1 }
                                                }
                                                transition={
                                                    phase === "idle"
                                                        ? { duration: 6.5, times: [0, 0.14, 0.32, 0.48, 0.62, 0.86, 1], repeat: Infinity, ease: "easeInOut" }
                                                        : { duration: 0.15 }
                                                }
                                            >
                                                <path d="M 65 130 C 85 115, 105 140, 110 175 C 95 185, 70 160, 65 130 Z" fill="url(#ia-eyeGloss)" />
                                                <path d="M 65 130 C 85 115, 105 140, 110 175 C 95 185, 70 160, 65 130 Z" fill="none" stroke="#3A4A41" strokeWidth="2" opacity="0.6" />
                                                <ellipse cx="82" cy="142" rx="4" ry="2" fill="#FFFFFF" transform="rotate(-25 82 142)" />
                                                <ellipse cx="78" cy="146" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.4" transform="rotate(-25 78 146)" />
                                                <path d="M 191 130 C 171 115, 151 140, 146 175 C 161 185, 186 160, 191 130 Z" fill="url(#ia-eyeGloss)" />
                                                <path d="M 191 130 C 171 115, 151 140, 146 175 C 161 185, 186 160, 191 130 Z" fill="none" stroke="#3A4A41" strokeWidth="2" opacity="0.6" />
                                                <ellipse cx="174" cy="142" rx="4" ry="2" fill="#FFFFFF" transform="rotate(25 174 142)" />
                                                <ellipse cx="178" cy="146" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.4" transform="rotate(25 178 146)" />
                                            </motion.g>
                                        </motion.g>

                                        {/* nostrils + mouth */}
                                        <path d="M 124 190 L 126 195 M 132 190 L 130 195" stroke="#3A4A41" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
                                        <path d="M 121 210 Q 128 213 135 210" stroke="#3A4A41" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
                                    </motion.g>
                                </motion.g>
                            </svg>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
