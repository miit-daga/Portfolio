"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCollectibles, FRAGMENT_IDS, playPickup } from "./collectibles";
import { kolkataNow } from "@/lib/kolkata";
import { Ufo } from "./ufo";
import { AlienFront, AlienProfile, frontPose, stridePose, type FrontMood } from "./alien-rig";

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
// Artwork: public/alien-front.svg / alien-profile.svg, rigged at the joints in
// alien-rig.tsx, which also works out the walk, the wave and the expressions.
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

// Kolkata's night: the torch in his left hand, drawn in that hand's
// coordinates so it moves with it. Drawn large: at 54px wide the alien
// shrinks it 5x
const TORCH = (
    <g>
        <defs>
            <linearGradient id="ia-torchBeam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fef08a" stopOpacity="0.5" />
                <stop offset="1" stopColor="#fde68a" stopOpacity="0.03" />
            </linearGradient>
            <radialGradient id="ia-torchPool" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#fef08a" stopOpacity="0.32" />
                <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
        </defs>
        {/* a soft cone and a faint pool; bright enough to read, not a spotlight */}
        <path d="M 70 450 L 90 450 L 150 512 L 10 512 Z" fill="url(#ia-torchBeam)" />
        <ellipse cx="80" cy="506" rx="72" ry="9" fill="url(#ia-torchPool)" />
        {/* the torch, held upright, sticking out below the fingers */}
        <rect x="70" y="402" width="20" height="48" rx="6" fill="#94a3b8" />
        <rect x="70" y="402" width="20" height="9" rx="4" fill="#cbd5e1" />
        <rect x="68" y="440" width="24" height="11" rx="4" fill="#64748b" />
        <ellipse cx="80" cy="451" rx="11" ry="4" fill="#fefce8" />
        <ellipse cx="80" cy="453" rx="17" ry="6" fill="#fef08a" opacity="0.45" />
    </g>
);

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
    // The wave playing, in seconds, or null
    const [waving, setWaving] = useState<number | null>(null);
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
        setWaving(ms / 1000);
        window.setTimeout(() => setWaving(null), ms);
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
        // Someone read his floppy on the resume page (app/resume/disks.tsx)
        try {
            if (localStorage.getItem("alien-floppy-read") === "1" && !localStorage.getItem("alien-floppy-thanked")) {
                queue.push({ text: "You found my floppy! Don't tell the mothership." });
                localStorage.setItem("alien-floppy-thanked", "1");
            }
        } catch {
            /* ignore */
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

    const walking = phase === "walkin";
    // Leaving after a catch walks the same way out, just not in a panic
    const fleeing = phase === "flee" || phase === "leave";
    const profileVisible = phase === "walkin" || phase === "turnF" || phase === "turnS" || fleeing;
    const frontVisible = phase === "turnF" || phase === "idle" || phase === "startled" || phase === "turnS" || phase === "caught" || phase === "beam";
    const legDur = phase === "flee" ? 0.28 : night ? 0.8 : 0.6;
    const striding = walking || fleeing;
    const gait = phase === "flee" ? "sprint" : night ? "tiptoe" : "walk";
    const mood: FrontMood = phase === "idle" || phase === "startled" || phase === "caught" || phase === "beam" ? phase : "still";

    const profilePose = useMemo(() => (striding ? stridePose(legDur, gait) : {}), [striding, legDur, gait]);
    const facePose = useMemo(() => frontPose(mood, waving), [mood, waving]);

    if (reduce) return null;

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
                        // The hero's name leans away from him (hero-name.tsx)
                        data-idle-alien
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
                                {/* ground shadow */}
                                <ellipse cx="128" cy="503" rx="58" ry="9" fill="rgba(0,0,0,0.4)" />

                                {/* In profile: walking in, fleeing, strolling off */}
                                <motion.g
                                    animate={{ opacity: turnFade(profileVisible, phase === "turnS") }}
                                    transition={turnFadeT}
                                    style={fleeing || phase === "turnS" ? { transform: "scaleX(-1)", transformOrigin: "128px 256px" } : undefined}
                                >
                                    <AlienProfile pose={profilePose} />
                                </motion.g>

                                {/* Facing you: browsing, startled, caught, beamed up */}
                                <motion.g animate={{ opacity: turnFade(frontVisible, phase === "turnF") }} transition={turnFadeT}>
                                    <AlienFront pose={facePose} handL={night ? TORCH : undefined} />
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
