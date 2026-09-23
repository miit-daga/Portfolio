"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCollectibles, FRAGMENT_IDS, playPickup } from "./collectibles";
import { kolkataNow } from "@/lib/kolkata";
import { Ufo } from "./ufo";

// After 10s of inactivity an alien walks in from the right edge (in profile,
// legs actually stepping), strolls to the centre of the screen, turns to face
// you and browses around - head turning this way and that. Any activity:
// a startled beat, then he turns sideways and sprints back out.
//
//   He reads the room: most of his mutters are about whichever section is on
//   screen.
//   Catch him: click him before he gets away and he freezes, waves sheepishly
//   and hands over one of the site's hidden fragments, which flies to the
//   fragment counter.
//   If the hero is in view he waves at the astronaut, who waves back, or wakes
//   with a start if it is night in Kolkata.
//   At night (lib/kolkata.ts) he tiptoes in slowly with a torch.
//   He remembers you across visits ("You again?"), and the terminal's stats
//   command counts sightings and catches (localStorage).
//   Left alone long enough, the UFO from the contact section beams him up.
//
// Artwork: public/alien-front.svg / alien-profile.svg, inlined and rigged.
const IDLE_MS = 10000;
// Browsing untouched this long, and his ride comes
const BEAM_AFTER_MS = 40000;
// Summoned from the command palette: he stays this long, ignoring the mouse
const SUMMONED_STAY_MS = 20000;
const SIGHTINGS_KEY = "alien-sightings";
const CAUGHT_KEY = "alien-caught";

// Muttered while he browses the page, thinking nobody's watching
const ALIEN_LINES = [
    "Hello? Anyone home?",
    "Hmm. Nice portfolio. For a human.",
    "Don't mind me. Just browsing.",
    "The human seems to be away...",
    "I was told there would be snacks.",
    "Interesting species. Writes TypeScript.",
    "Earth UI has gotten better, honestly.",
    "The radar down there is a guestbook. Should I sign it?",
    "Our pilots could learn from this one.",
    "No bugs spotted. Suspicious.",
    "I could abduct this website. Hypothetically.",
    "Dark mode. A civilized planet after all.",
    "Wait till the mothership sees this.",
    "Smells like caffeine in here.",
    "Definitely stealing this idea for my homeworld.",
];

// About whichever section is on screen
const SECTION_LINES: Record<string, string[]> = {
    hero: [
        "So this is the famous hologram.",
        "The little astronaut seems nice.",
        "That face is everywhere on this site.",
        "Gold hologram. Fancy.",
        "He's the tall one on the right, right?",
    ],
    "about-me": ["Four human languages. Show-off.", "A quick learner, it says. We'll see."],
    workex: ["Five missions already. Does he sleep?", "Tata Power. Could they spare some for my ship?", "Remote work. Like us. From very remote."],
    education: ["9.22 out of 10. We grade in light-years.", "Twelve years at one school. Commitment."],
    "skills-achievements": [
        "Two second places. Where's first, Earthling?",
        "He knows Git. Respect.",
        "FastAPI. Fast? We have warp.",
        "Medals! We give ours for surviving hyperspace.",
        "Hover a skill. It tells you where he used it. Fancy.",
        "Nine languages. I speak forty, but still.",
    ],
    projects: ["A seeding tool. We seed whole planets.", "These little terminals type by themselves. Spooky.", "flowsquire sorts files. Mine are in a black hole."],
    publications: ["Quantum kernels? Show-off.", "Peer reviewed. My peers review by probing.", "Caught 27 of 28. I'd have been the 28th."],
    contact: [
        "Ooh, a visitor pass. Do they let aliens aboard?",
        "That UFO down there is my cousin's.",
        "Send a message. The saucer does deliveries now.",
        "The globe knows where I'm from. Rude.",
        "That crew card is shinier than mine.",
        "Every blip on that radar is a visitor. Hover one.",
        "Leave a signal. I left three. They filtered two.",
        "Kolkata station, reachable at light speed. Handy.",
    ],
};

// Kolkata's night: he creeps
const NIGHT_LINES = ["Shh. He's asleep.", "*yawn* Night shift again.", "Tiptoe. Tiptoe.", "Torch on. Snacks: none.", "Even the astronaut's out cold."];

// A visitor he has seen on an earlier visit
const RETURN_LINES = ["You again?", "Oh. It's you. Hi again.", "Back already? I haven't finished browsing."];

const SECTION_IDS = ["about-me", "workex", "education", "skills-achievements", "projects", "publications", "contact"];

type Phase = "hidden" | "walkin" | "turnF" | "idle" | "startled" | "turnS" | "flee" | "caught" | "leave" | "beam";

const readCount = (k: string) => {
    try {
        return parseInt(localStorage.getItem(k) || "0", 10) || 0;
    } catch {
        return 0;
    }
};
const bumpCount = (k: string) => {
    try {
        localStorage.setItem(k, String(readCount(k) + 1));
    } catch {
        /* ignore */
    }
};

// Which part of the page he is looking at
function currentSection(): string | null {
    if (window.scrollY < window.innerHeight * 0.5) return "hero";
    const mid = window.innerHeight / 2;
    for (const id of SECTION_IDS) {
        const r = document.getElementById(id)?.getBoundingClientRect();
        if (r && r.top <= mid && r.bottom >= mid) return id;
    }
    return null;
}

export const IdleAlien = () => {
    const reduce = useReducedMotion();
    const { found, collect } = useCollectibles();
    const [phase, setPhase] = useState<Phase>("hidden");
    const [centerX, setCenterX] = useState(-300);
    const phaseRef = useRef<Phase>("hidden");
    phaseRef.current = phase;
    const lastActivity = useRef(Date.now());
    // Called in from the command palette: he knows you are there, so moving
    // does not startle him, and he leaves on his ride after a short visit
    const summoned = useRef(false);
    const idleSince = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    // Where he goes after turning away: sprinting (startled) or strolling (caught)
    const afterTurn = useRef<"flee" | "leave">("flee");
    const caughtThisVisit = useRef(false);
    const greetedAstronaut = useRef(false);
    // Seen on an earlier visit, and not yet greeted this session
    const returning = useRef(false);
    const [night, setNight] = useState(false);
    const [waving, setWaving] = useState(false);
    const [beamStep, setBeamStep] = useState(0);
    const [shard, setShard] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; key: number } | null>(null);

    useEffect(() => {
        try {
            returning.current = readCount(SIGHTINGS_KEY) > 0 && !sessionStorage.getItem("alien-welcomed-back");
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (reduce) return;
        const onActivity = () => {
            lastActivity.current = Date.now();
            if (summoned.current) return;
            if (phaseRef.current === "walkin" || phaseRef.current === "turnF" || phaseRef.current === "idle") {
                afterTurn.current = "flee";
                setPhase("startled");
            }
        };
        const events: (keyof WindowEventMap)[] = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"];
        events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

        const beginVisit = () => {
            setNight(kolkataNow().mood.label === "probably asleep");
            caughtThisVisit.current = false;
            greetedAstronaut.current = false;
            bumpCount(SIGHTINGS_KEY);
            // A little left of centre: dead centre put him on the hero's
            // scroll cue
            setCenterX(-(window.innerWidth * 0.58));
            setPhase("walkin");
        };

        const interval = window.setInterval(() => {
            const p = phaseRef.current;
            if (p === "hidden") summoned.current = false;
            if (p === "hidden" && Date.now() - lastActivity.current >= IDLE_MS && !document.hidden) {
                beginVisit();
            } else if (p === "idle" && Date.now() - idleSince.current >= (summoned.current ? SUMMONED_STAY_MS : BEAM_AFTER_MS)) {
                setPhase("beam");
            }
        }, 1000);

        const onSummon = () => {
            if (phaseRef.current !== "hidden") return;
            summoned.current = true;
            beginVisit();
        };
        window.addEventListener("alien-summon", onSummon);

        return () => {
            events.forEach((ev) => window.removeEventListener(ev, onActivity));
            window.removeEventListener("alien-summon", onSummon);
            clearInterval(interval);
        };
    }, [reduce]);

    useEffect(() => {
        if (phase === "idle") idleSince.current = Date.now();
    }, [phase]);

    // A frozen "caught!" beat, then he turns and bolts
    useEffect(() => {
        if (phase !== "startled") return;
        const t = window.setTimeout(() => setPhase("turnS"), 550);
        return () => clearTimeout(t);
    }, [phase]);

    const wave = useCallback((ms = 1600) => {
        setWaving(true);
        window.setTimeout(() => setWaving(false), ms);
    }, []);

    // Muttering while browsing: show a line, pause, show the next (shuffle
    // bags per pool, no repeats until a pool runs dry). Vanishes the instant
    // he's caught.
    const [bubble, setBubble] = useState<string | null>(null);
    const bags = useRef<Record<string, string[]>>({});
    const lastLine = useRef<string | null>(null);
    const draw = (name: string, pool: string[]) => {
        if (!bags.current[name]?.length) {
            const b = [...pool];
            for (let i = b.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [b[i], b[j]] = [b[j], b[i]];
            }
            bags.current[name] = b;
        }
        return bags.current[name].pop() as string;
    };
    useEffect(() => {
        if (phase !== "idle") {
            if (phase !== "caught" && phase !== "beam") setBubble(null);
            return;
        }
        // Lines that come first, before the mutters: a welcome back, then a
        // wave to the astronaut if the hero is in view
        const queue: { text: string; hello?: boolean }[] = [];
        if (returning.current) {
            queue.push({ text: draw("return", RETURN_LINES) });
            returning.current = false;
            try {
                sessionStorage.setItem("alien-welcomed-back", "1");
            } catch {
                /* ignore */
            }
        }
        if (!greetedAstronaut.current && currentSection() === "hero" && document.querySelector("[aria-label*='astronaut on a tether']")) {
            queue.push({ text: "Hey, little buddy!", hello: true });
            greetedAstronaut.current = true;
        }
        const nextLine = () => {
            const q = queue.shift();
            if (q) return q;
            const section = currentSection();
            const r = Math.random();
            // Half about the room, the rest general, and never the same line twice running
            for (let tries = 0; tries < 4; tries++) {
                const text =
                    night && r < 0.35
                        ? draw("night", NIGHT_LINES)
                        : section && SECTION_LINES[section] && Math.random() < 0.5
                            ? draw(section, SECTION_LINES[section])
                            : draw("any", ALIEN_LINES);
                if (text !== lastLine.current) {
                    lastLine.current = text;
                    return { text };
                }
            }
            return { text: draw("any", ALIEN_LINES) };
        };
        let alive = true;
        let t: number;
        const showOne = (delay: number) => {
            t = window.setTimeout(() => {
                if (!alive) return;
                const line = nextLine();
                setBubble(line.text);
                if (line.hello) {
                    wave();
                    window.dispatchEvent(new CustomEvent("alien-hello"));
                }
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
    }, [phase, night, wave]);

    // Caught: freeze, own up, hand over a fragment, stroll off
    const onCatch = useCallback(
        (e: React.PointerEvent) => {
            const p = phaseRef.current;
            if (caughtThisVisit.current || p === "hidden" || p === "beam" || p === "caught" || p === "leave") return;
            // Handled here, so the window's activity listener never sees it
            e.stopPropagation();
            e.preventDefault();
            caughtThisVisit.current = true;
            const el = containerRef.current;
            if (el) {
                // Freeze where he stands, mid-escape or not
                const r = el.getBoundingClientRect();
                setCenterX(r.left - (window.innerWidth - r.width));
            }
            bumpCount(CAUGHT_KEY);
            setPhase("caught");
        },
        [],
    );

    useEffect(() => {
        if (phase !== "caught") return;
        setBubble("Okay, okay. You got me.");
        wave(1800);
        const timers: number[] = [];
        timers.push(
            window.setTimeout(() => {
                const id = FRAGMENT_IDS.find((f) => !found.has(f));
                if (!id) {
                    setBubble("I'd tip you a shard, but you've found them all.");
                    return;
                }
                setBubble("Here. Don't tell the mothership.");
                const r = containerRef.current?.getBoundingClientRect();
                if (r) {
                    // From his hand to the fragment counter, bottom left
                    setShard({ from: { x: r.left + 10, y: r.top + r.height * 0.75 }, to: { x: 48, y: window.innerHeight - 44 }, key: Date.now() });
                }
                timers.push(
                    window.setTimeout(() => {
                        playPickup();
                        collect(id);
                        setShard(null);
                    }, 950),
                );
            }, 1300),
        );
        timers.push(
            window.setTimeout(() => {
                setBubble(null);
                afterTurn.current = "leave";
                setPhase("turnS");
            }, 4200),
        );
        return () => timers.forEach(clearTimeout);
        // found is read once, when the shard is chosen
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, collect, wave]);

    // Beam-up: the UFO drops in, lights him up, lifts him, leaves
    useEffect(() => {
        if (phase !== "beam") {
            setBeamStep(0);
            return;
        }
        setBubble("Oh. That's my ride.");
        const steps = [
            [0, 1], // UFO descends
            [1300, 2], // beam on
            [1900, 3], // he rises
            [3900, 4], // beam off, UFO leaves
        ] as const;
        const timers = steps.map(([ms, step]) => window.setTimeout(() => { setBeamStep(step); if (step === 3) setBubble(null); }, ms));
        timers.push(
            window.setTimeout(() => {
                lastActivity.current = Date.now();
                setPhase("hidden");
            }, 4900),
        );
        return () => timers.forEach(clearTimeout);
    }, [phase]);

    // Sprite walk cycle: frames 1 -> 2 -> 3 -> 2 while striding
    const [stepTick, setStepTick] = useState(0);
    const stridingNow = phase === "walkin" || phase === "flee" || phase === "leave";
    useEffect(() => {
        if (!stridingNow) return;
        const ms = phaseRef.current === "flee" ? 70 : night ? 210 : 150;
        const id = window.setInterval(() => setStepTick((t) => t + 1), ms);
        return () => clearInterval(id);
    }, [stridingNow, phase, night]);

    if (reduce) return null;

    const walking = phase === "walkin";
    // Leaving after a catch walks the same way out, just not in a panic
    const fleeing = phase === "flee" || phase === "leave";
    const profileVisible = phase === "walkin" || phase === "turnF" || phase === "turnS" || fleeing;
    const frontVisible = phase === "turnF" || phase === "idle" || phase === "startled" || phase === "turnS" || phase === "caught" || phase === "beam";
    const legDur = phase === "flee" ? 0.28 : night ? 0.8 : 0.6;
    const striding = walking || fleeing;

    const containerAnimate =
        phase === "walkin"
            ? { x: centerX, scaleX: 1 }
            : phase === "turnF" || phase === "turnS"
                ? { x: centerX, scaleX: [1, 0.14, 1] }
                : phase === "flee" || phase === "leave"
                    ? { x: 90, scaleX: 1 }
                    : { x: centerX, scaleX: 1 };
    const containerTransition =
        phase === "walkin"
            // Tiptoes in slowly at night
            ? { x: { duration: night ? 5.2 : 3.4, ease: "linear" as const }, scaleX: { duration: 0.1 } }
            : phase === "turnF" || phase === "turnS"
                ? { duration: 0.34, times: [0, 0.5, 1] }
                : phase === "flee"
                    ? { x: { duration: 1.1, ease: "easeIn" as const }, scaleX: { duration: 0.1 } }
                    : phase === "leave"
                        ? { x: { duration: 3.6, ease: "linear" as const }, scaleX: { duration: 0.1 } }
                        : phase === "caught"
                            ? { duration: 0.05 }
                            : { duration: 0.2 };

    const turnFade = (visibleNow: boolean, appearing: boolean) =>
        visibleNow ? (phase === "turnF" || phase === "turnS" ? (appearing ? [0, 0, 1] : [1, 1, 0]) : 1) : 0;
    const turnFadeT = phase === "turnF" || phase === "turnS" ? { duration: 0.34, times: [0, 0.5, 1] } : { duration: 0.1 };

    return (
        <>
        {/* The fragment he hands over, flying from his hand to the counter */}
        <AnimatePresence>
            {shard && (
                <motion.span
                    key={shard.key}
                    aria-hidden
                    className="pointer-events-none fixed left-0 top-0 z-[5001] block h-3.5 w-3.5 rounded-[3px] bg-gradient-to-br from-teal-100 to-teal-500 shadow-[0_0_14px_rgba(45,212,191,0.9)]"
                    // rotate here, not rotate-45: the animated transform replaces the class's
                    initial={{ x: shard.from.x, y: shard.from.y, scale: 0.4, opacity: 0, rotate: 45 }}
                    animate={{
                        x: [shard.from.x, (shard.from.x + shard.to.x) / 2, shard.to.x],
                        y: [shard.from.y, Math.min(shard.from.y, shard.to.y) - 160, shard.to.y],
                        scale: [0.4, 1.5, 0.8],
                        opacity: [0, 1, 1],
                        rotate: [45, 225, 405],
                    }}
                    exit={{ scale: 2.2, opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.95, ease: "easeInOut" }}
                />
            )}
        </AnimatePresence>
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
                            else if (p === "turnS") {
                                setPhase(afterTurn.current);
                                afterTurn.current = "flee";
                            } else if (p === "flee" || p === "leave") {
                                lastActivity.current = Date.now();
                                setPhase("hidden");
                            }
                        }}
                        ref={containerRef}
                        onPointerDown={onCatch}
                        // Catchable until he is gone; a click on him is not
                        // "activity", so it cannot startle him first
                        className={phase === "beam" || phase === "leave" ? "relative" : "pointer-events-auto relative cursor-pointer"}
                        style={{ width: 54, height: 108 }}
                    >
                        {/* His ride: the saucer from the contact section, and its beam */}
                        {phase === "beam" && (
                            <>
                                <motion.div
                                    className="pointer-events-none absolute left-1/2 z-0"
                                    style={{ top: -318, marginLeft: -46, width: 92 }}
                                    initial={{ y: -420, opacity: 0 }}
                                    animate={beamStep >= 4 ? { y: -520, opacity: 0 } : { y: 0, opacity: 1 }}
                                    transition={beamStep >= 4 ? { duration: 0.9, ease: "easeIn" } : { duration: 1.2, ease: "easeOut" }}
                                >
                                    <div style={{ transform: "scale(1.6)", transformOrigin: "50% 0%", width: 58, marginLeft: 17 }}>
                                        <Ufo reduce={false} hatchOpen={beamStep >= 2 && beamStep < 4} thrust={beamStep === 1 || beamStep >= 4} />
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="pointer-events-none absolute left-1/2 z-0"
                                    style={{
                                        top: -290,
                                        bottom: -6,
                                        width: 130,
                                        marginLeft: -65,
                                        clipPath: "polygon(43% 0, 57% 0, 100% 100%, 0 100%)",
                                        background: "linear-gradient(to bottom, rgba(186,230,253,0.55), rgba(125,211,252,0.18))",
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: beamStep === 2 || beamStep === 3 ? [0.75, 1, 0.8] : 0 }}
                                    transition={beamStep === 2 || beamStep === 3 ? { duration: 0.6, repeat: Infinity, repeatType: "mirror" } : { duration: 0.35 }}
                                />
                            </>
                        )}
                        {/* Browsing mutters: anchored above the head, grows upward */}
                        <div className="pointer-events-none absolute bottom-full left-0 right-0 z-10 mb-1.5 flex items-end justify-center">
                            <AnimatePresence>
                                {(phase === "idle" || phase === "caught" || phase === "beam") && bubble && (
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

                        {/* Lifted up the beam, shrinking into the distance */}
                        <motion.div
                            className="absolute inset-0"
                            animate={beamStep >= 3 ? { y: -300, scale: 0.3, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }}
                            transition={beamStep >= 3 ? { duration: 1.9, ease: "easeIn" } : { duration: 0 }}
                        >
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
                                    {/* arms: the left holds a torch at night, the right waves */}
                                    <path d="M 85 255 C 65 285, 60 325, 72 405 C 74 415, 82 415, 80 405 C 72 330, 80 290, 95 265 C 95 260, 90 250, 85 255 Z" fill="url(#ia-bodySkin)" />
                                    {night && (
                                        <g>
                                            <defs>
                                                <linearGradient id="ia-torchBeam" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0" stopColor="#fef08a" stopOpacity="0.9" />
                                                    <stop offset="1" stopColor="#fde68a" stopOpacity="0.05" />
                                                </linearGradient>
                                                <radialGradient id="ia-torchPool" cx="0.5" cy="0.5" r="0.5">
                                                    <stop offset="0" stopColor="#fef08a" stopOpacity="0.7" />
                                                    <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
                                                </radialGradient>
                                            </defs>
                                            {/* Drawn large: at 54px wide the alien shrinks this 5x */}
                                            <path d="M 58 432 L 88 432 L 175 508 L -30 508 Z" fill="url(#ia-torchBeam)" />
                                            <ellipse cx="72" cy="503" rx="100" ry="14" fill="url(#ia-torchPool)" />
                                            <rect x="58" y="392" width="30" height="42" rx="7" fill="#334155" />
                                            <rect x="58" y="392" width="30" height="10" rx="5" fill="#64748b" />
                                            <ellipse cx="73" cy="433" rx="15" ry="5" fill="#fefce8" />
                                            <ellipse cx="73" cy="436" rx="22" ry="8" fill="#fef08a" opacity="0.5" />
                                        </g>
                                    )}
                                    <motion.g
                                        style={{ transformOrigin: "171px 255px" }}
                                        animate={waving ? { rotate: [0, -150, -120, -150, -120, -150, 0] } : { rotate: 0 }}
                                        transition={waving ? { duration: 1.6, ease: "easeInOut" } : { duration: 0.3 }}
                                    >
                                        <path d="M 171 255 C 191 285, 196 325, 184 405 C 182 415, 174 415, 176 405 C 184 330, 176 290, 161 265 C 161 260, 166 250, 171 255 Z" fill="url(#ia-bodySkin)" />
                                    </motion.g>

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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        </>
    );
};
