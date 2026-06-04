"use client";
import { useEffect, useRef, useState } from "react";
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useMotionValue,
    useMotionValueEvent,
    useReducedMotion,
    type MotionValue,
} from "framer-motion";
import { RocketIcon } from "./ui/rocket"; // Reusing your existing icon

// Sections the rocket "passes" — used for checkpoints and the live label
const SECTIONS = [
    { id: "about-me", label: "About" },
    { id: "workex", label: "Work" },
    { id: "education", label: "Education" },
    { id: "skills-achievements", label: "Skills" },
    { id: "projects", label: "Projects" },
    { id: "publications", label: "Publications" },
    { id: "contact", label: "Contact" },
];

// A checkpoint star that dims before the rocket reaches it and pops bright after
// A small amber "station" bead sitting on the route, brightening as it's passed
const Checkpoint = ({ progress, frac }: { progress: MotionValue<number>; frac: number }) => {
    const range: [number, number] = [Math.max(0, frac - 0.025), frac];
    const opacity = useTransform(progress, range, [0.45, 1]);
    // Stays <= 1 so it never grows past the bar and clips at the viewport top
    const scale = useTransform(progress, range, [0.7, 1]);
    return (
        <motion.div
            className="absolute top-1/2 rounded-full pointer-events-none"
            style={{
                left: `${frac * 100}%`,
                x: "-50%",
                y: "-50%",
                width: 6,
                height: 6,
                opacity,
                scale,
                background: "#fbbf24",
                boxShadow: "0 0 6px 1px rgba(251,191,36,0.9)",
            }}
        />
    );
};

// Sparkle burst fired when the bottom (100%) is reached
const ArrivalBurst = () => (
    <div className="absolute top-1/2 right-1 -translate-y-1/2 pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => {
            const ang = (i / 10) * Math.PI * 2;
            return (
                <motion.div
                    key={i}
                    className="absolute h-1 w-1 rounded-full bg-amber-200"
                    style={{ boxShadow: "0 0 4px rgba(245,158,11,0.9)" }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(ang) * 20, y: Math.sin(ang) * 20, opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                />
            );
        })}
    </div>
);

export const ScrollProgress = () => {
    const shouldReduceMotion = useReducedMotion();
    const { scrollYProgress } = useScroll();

    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    const rocketX = useTransform(scaleX, (value) => `${value * 100}%`);
    // Keep the label tag on-screen at both ends
    const labelLeft = useTransform(scaleX, (v) => `clamp(34px, ${(v * 100).toFixed(2)}%, calc(100% - 34px))`);

    // Spark particles that lag behind the rocket (trail)
    const pct = useTransform(scaleX, (v) => v * 100);
    const spark1 = useSpring(pct, { stiffness: 220, damping: 22 });
    const spark2 = useSpring(spark1, { stiffness: 170, damping: 26 });
    const spark1Left = useTransform(spark1, (v) => `${v}%`);
    const spark2Left = useTransform(spark2, (v) => `${v}%`);

    // Flip the rocket to face its travel direction
    const rocketRot = useMotionValue(90);
    const rocketRotSpring = useSpring(rocketRot, { stiffness: 200, damping: 18 });
    const prevProgress = useRef(0);
    useMotionValueEvent(scrollYProgress, "change", (v) => {
        const delta = v - prevProgress.current;
        if (Math.abs(delta) > 0.001) {
            rocketRot.set(delta < 0 ? -90 : 90);
        }
        prevProgress.current = v;
    });

    // Measure each section's position: frac (bar position) + top (absolute, for the label)
    const [checkpoints, setCheckpoints] = useState<{ label: string; frac: number; top: number }[]>([]);
    useEffect(() => {
        // Layout position up the offset chain — immune to the reveal animations'
        // translateY (getBoundingClientRect would include those transforms).
        const offsetTopOf = (el: HTMLElement) => {
            let y = 0;
            let node: HTMLElement | null = el;
            while (node) {
                y += node.offsetTop;
                node = node.offsetParent as HTMLElement | null;
            }
            return y;
        };
        const measure = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (max <= 0) return;
            const cps = SECTIONS.map((s) => {
                const el = document.getElementById(s.id);
                if (!el) return null;
                const top = offsetTopOf(el);
                return { label: s.label, frac: Math.min(1, Math.max(0, top / max)), top };
            }).filter(Boolean) as { label: string; frac: number; top: number }[];
            setCheckpoints((prev) =>
                prev.length === cps.length &&
                prev.every((p, i) => Math.abs(p.frac - cps[i].frac) < 0.001 && Math.abs(p.top - cps[i].top) < 1)
                    ? prev
                    : cps,
            );
        };
        measure();
        // Re-measure whenever the page height changes (async Projects load,
        // images, reveals settling) so checkpoints + the label stay in sync.
        const ro = new ResizeObserver(measure);
        ro.observe(document.body);
        window.addEventListener("resize", measure);
        const t = setTimeout(measure, 800); // safety net
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", measure);
            clearTimeout(t);
        };
    }, []);

    // Live section label under the rocket — based on which section is centred in
    // the viewport (so it flips as a section reaches mid-screen, not its end).
    const [label, setLabel] = useState("About");
    // Hide the tag while the hero (top of page) is on screen; reveal it once
    // scrolled past the hero into the actual sections.
    const [showLabel, setShowLabel] = useState(false);
    useMotionValueEvent(scrollYProgress, "change", () => {
        setShowLabel(window.scrollY > window.innerHeight * 0.85);
        if (!checkpoints.length) return;
        const center = window.scrollY + window.innerHeight / 2;
        let current = checkpoints[0].label;
        for (const c of checkpoints) if (center >= c.top) current = c.label;
        setLabel((prev) => (prev === current ? prev : current));
    });

    // Fire an arrival burst when the ROCKET (spring-lagged position) actually
    // reaches the end — not when raw scroll hits 100% (the rocket trails behind).
    const [burstKey, setBurstKey] = useState(0);
    const armed = useRef(true);
    useMotionValueEvent(scaleX, "change", (v) => {
        if (v >= 0.99 && armed.current) {
            armed.current = false;
            setBurstKey((k) => k + 1);
        } else if (v < 0.9) {
            armed.current = true;
        }
    });

    // Hide the bar while the mobile menu is open (its rocket overlaps the close button)
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        const handler = (e: Event) => setMenuOpen((e as CustomEvent).detail === true);
        window.addEventListener("nav-menu-toggle", handler);
        return () => window.removeEventListener("nav-menu-toggle", handler);
    }, []);

    return (
        <div
            className="fixed top-0 left-0 right-0 h-1.5 z-[6000] pointer-events-none transition-opacity duration-200"
            style={{ opacity: menuOpen ? 0 : 1 }}
        >
            {/* The flowing gradient line */}
            <motion.div
                className="absolute top-0 left-0 bottom-0 origin-left bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none shadow-[0_0_10px_rgba(45,212,191,0.6)]"
                style={{
                    scaleX,
                    width: "100%",
                    backgroundImage:
                        "linear-gradient(90deg, #2563eb, #14b8a6, #5eead4, #14b8a6, #2563eb)",
                }}
            />

            {/* Checkpoint stars at each section */}
            {!shouldReduceMotion &&
                checkpoints.map((c, i) => (
                    <Checkpoint key={`${c.label}-${i}`} progress={scrollYProgress} frac={c.frac} />
                ))}

            {/* Destination planet at the end of the journey */}
            <div className="absolute top-1/2 -translate-y-1/2" style={{ right: 2 }}>
                <div
                    className="rounded-full"
                    style={{
                        width: 9,
                        height: 9,
                        background: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 60%, #b45309)",
                        boxShadow: "0 0 8px rgba(245,158,11,0.9)",
                    }}
                />
            </div>

            {/* Arrival burst */}
            {burstKey > 0 && !shouldReduceMotion && <ArrivalBurst key={burstKey} />}

            {/* Trailing sparks */}
            {!shouldReduceMotion && (
                <>
                    <motion.div
                        className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-200/70 blur-[1px]"
                        style={{ left: spark1Left }}
                    />
                    <motion.div
                        className="absolute top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/50 blur-[1px]"
                        style={{ left: spark2Left }}
                    />
                </>
            )}

            {/* Live section label riding along with the rocket (hidden over the hero) */}
            <motion.div
                className="absolute z-20"
                style={{ left: labelLeft, top: 12 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: showLabel ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            >
                <span
                    className="block -translate-x-1/2 whitespace-nowrap rounded-full border border-teal-400/40 bg-black/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-teal-200 backdrop-blur-sm"
                >
                    {label}
                </span>
            </motion.div>

            {/* The Rocket Ship Leader */}
            <motion.div
                className="absolute top-1/2 -translate-y-1/2 -ml-3 w-6 h-6 z-10"
                style={{ left: rocketX }}
            >
                {/* Pulsing glow halo */}
                {!shouldReduceMotion && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-teal-400/40 blur-md"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.9, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                )}
                {/* Rotation faces the direction of travel */}
                <motion.div
                    className="relative w-full h-full drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                    style={{ rotate: rocketRotSpring }}
                >
                    <RocketIcon isIgnited={!shouldReduceMotion} />
                </motion.div>
            </motion.div>
        </div>
    );
};
