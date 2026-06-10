"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { scrollToSection } from "@/lib/scroll-to-section";

// Vertical flight-path minimap pinned to the right edge (desktop only).
// Each section is a tiny waypoint planet at its true position along the
// journey; a glowing ship marker tracks the live scroll position. Clicking a
// waypoint glides there (with hyperspace streaks on long jumps, same as the
// navbar). The hero sits at the top as the launchpad.
const WAYPOINTS: { id: string; label: string; planet: React.CSSProperties; ringed?: boolean }[] = [
    {
        id: "",
        label: "Launchpad",
        planet: {
            background: "radial-gradient(circle at 35% 30%, #ffffff, #cbd5e1 60%, #64748b)",
            boxShadow: "0 0 6px rgba(226,232,240,0.8)",
        },
    },
    {
        id: "about-me",
        label: "About",
        planet: {
            background: "radial-gradient(circle at 35% 30%, #99f6e4, #14b8a6 60%, #0f766e)",
            boxShadow: "0 0 6px rgba(45,212,191,0.8)",
        },
    },
    {
        id: "workex",
        label: "Work",
        planet: {
            background: "radial-gradient(circle at 35% 30%, #93c5fd, #3b82f6 60%, #1d4ed8)",
            boxShadow: "0 0 6px rgba(96,165,250,0.8)",
        },
    },
    {
        id: "education",
        label: "Education",
        planet: {
            background: "radial-gradient(circle at 35% 30%, #c4b5fd, #8b5cf6 60%, #6d28d9)",
            boxShadow: "0 0 6px rgba(167,139,250,0.8)",
        },
    },
    {
        id: "skills-achievements",
        label: "Skills",
        planet: {
            background: "radial-gradient(circle at 35% 30%, #a5f3fc, #06b6d4 60%, #0e7490)",
            boxShadow: "0 0 6px rgba(34,211,238,0.8)",
        },
    },
    {
        id: "projects",
        label: "Projects",
        ringed: true,
        planet: {
            background: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 60%, #b45309)",
            boxShadow: "0 0 6px rgba(245,158,11,0.8)",
        },
    },
    {
        id: "publications",
        label: "Publications",
        planet: {
            background: "radial-gradient(circle at 35% 30%, #a5b4fc, #6366f1 60%, #4338ca)",
            boxShadow: "0 0 6px rgba(129,140,248,0.8)",
        },
    },
    {
        id: "contact",
        label: "Contact",
        planet: {
            background: "radial-gradient(circle at 35% 30%, #fdba74, #f97316 60%, #c2410c)",
            boxShadow: "0 0 6px rgba(251,146,60,0.8)",
        },
    },
];

export const FlightPath = () => {
    const reduce = useReducedMotion();
    const { scrollYProgress } = useScroll();
    const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });
    const markerTop = useTransform(reduce ? scrollYProgress : smooth, (v) => `${v * 100}%`);

    // True position of each waypoint along the scroll range (0..1)
    const [fracs, setFracs] = useState<number[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    // Absolute section tops, cached at measure time so the scroll handler
    // doesn't walk the offset chain on every scroll tick
    const topsRef = useRef<number[]>([]);

    useEffect(() => {
        // Layout position up the offset chain - immune to the reveal animations'
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
        const tops = () =>
            WAYPOINTS.map((w) => {
                if (!w.id) return 0;
                const el = document.getElementById(w.id);
                return el ? offsetTopOf(el) : 0;
            });

        const measure = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (max <= 0) return;
            topsRef.current = tops();
            const next = topsRef.current.map((t) => Math.min(1, Math.max(0, t / max)));
            setFracs((prev) =>
                prev.length === next.length && prev.every((p, i) => Math.abs(p - next[i]) < 0.001) ? prev : next,
            );
        };
        const onScroll = () => {
            const center = window.scrollY + window.innerHeight / 2;
            let current = 0;
            for (let i = 0; i < topsRef.current.length; i++) if (topsRef.current[i] <= center) current = i;
            setActiveIdx(current);
        };

        measure();
        onScroll();
        // Re-measure whenever the page height changes (async Projects load,
        // images, reveals settling) so waypoints stay in sync.
        const ro = new ResizeObserver(measure);
        ro.observe(document.body);
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", onScroll, { passive: true });
        const t = setTimeout(measure, 800); // safety net
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", onScroll);
            clearTimeout(t);
        };
    }, []);

    if (fracs.length === 0) {
        return null;
    }

    return (
        <motion.nav
            aria-label="Section minimap"
            className="fixed right-4 top-1/2 z-[5500] hidden -translate-y-1/2 lg:block"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className="relative h-[min(44vh,400px)] w-4">
                {/* Route line */}
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

                {/* Ship marker */}
                <motion.div className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ top: markerTop }}>
                    {!reduce && (
                        <motion.div
                            className="absolute -inset-1.5 rounded-full bg-teal-400/40 blur-[3px]"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}
                    <div
                        className="relative h-[7px] w-[7px] rounded-full"
                        style={{
                            background: "radial-gradient(circle at 35% 30%, #ffffff, #5eead4 70%)",
                            boxShadow: "0 0 8px rgba(45,212,191,0.95)",
                        }}
                    />
                </motion.div>

                {/* Waypoint planets */}
                {WAYPOINTS.map((w, i) => {
                    const isActive = activeIdx === i;
                    const showLabel = hoveredIdx === i || (hoveredIdx === null && isActive);
                    return (
                        <button
                            key={w.id || "hero"}
                            type="button"
                            aria-label={`Go to ${w.label}`}
                            aria-current={isActive ? "true" : undefined}
                            onClick={() => scrollToSection(w.id ? `#${w.id}` : "#")}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            className="group absolute left-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                            style={{ top: `${fracs[i] * 100}%` }}
                        >
                            <span
                                className="relative block rounded-full transition-all duration-300"
                                style={{
                                    width: isActive ? 9 : 6,
                                    height: isActive ? 9 : 6,
                                    opacity: isActive || hoveredIdx === i ? 1 : 0.65,
                                    ...w.planet,
                                }}
                            >
                                {/* Saturn-style ring on the Projects waypoint */}
                                {w.ringed && (
                                    <span
                                        aria-hidden
                                        className="absolute left-1/2 top-1/2 rounded-[50%] border border-amber-300/70"
                                        style={{
                                            width: "200%",
                                            height: "70%",
                                            transform: "translate(-50%, -50%) rotate(-24deg)",
                                        }}
                                    />
                                )}
                            </span>
                            {/* Label: shown for the hovered waypoint, else the active one */}
                            <span
                                className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-full border border-teal-400/30 bg-black/75 px-2 py-0.5 font-mono text-[10px] tracking-wide text-teal-200 backdrop-blur-sm transition-opacity duration-200"
                                style={{ opacity: showLabel ? 1 : 0 }}
                            >
                                {w.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </motion.nav>
    );
};
