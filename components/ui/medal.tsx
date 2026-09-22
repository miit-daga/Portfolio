"use client";
import { useEffect, useId, useState } from "react";
import { motion, useMotionTemplate, useReducedMotion, useTransform, type MotionValue } from "framer-motion";

// Podium medal for the hackathon cards. The disc is struck in the metal of the
// placing (gold / silver / bronze, read from the title), hangs from a ribbon in
// the section's accent, and catches the light where the cursor is. Hovering the
// card flips it once, like a coin turned over in the hand.

type Metal = { hi: string; mid: string; lo: string; ink: string };

const METALS: Record<number, Metal> = {
    1: { hi: "#fef3c7", mid: "#f59e0b", lo: "#78350f", ink: "#78350f" },
    2: { hi: "#f8fafc", mid: "#94a3b8", lo: "#334155", ink: "#1e293b" },
    3: { hi: "#fed7aa", mid: "#c2410c", lo: "#7c2d12", ink: "#431407" },
};

const ORDINAL: Record<number, string> = { 1: "ST", 2: "ND", 3: "RD" };

/** "2nd Place Winner | ..." -> 2. Anything unparseable reads as a winner's gold. */
export function placeFromTitle(title: string): number {
    const m = title.match(/^\s*(\d+)(st|nd|rd|th)\b/i);
    return m ? Number(m[1]) : 1;
}

// The disc sits at (32, 60) r=22 inside the 64 x 88 medal box
const DISC = { cx: 32, cy: 60, r: 22 };

export const Medal = ({
    place,
    isHovered,
    pointerX,
    pointerY,
}: {
    place: number;
    isHovered: boolean;
    /** Card-relative pointer, -0.5..0.5 (the tilt springs the card already has). */
    pointerX: MotionValue<number>;
    pointerY: MotionValue<number>;
}) => {
    const reduce = useReducedMotion();
    const metal = METALS[place] ?? METALS[2];
    const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");

    // One full turn per hover, always in the same direction
    const [turns, setTurns] = useState(0);
    useEffect(() => {
        if (isHovered && !reduce) setTurns((t) => t + 1);
    }, [isHovered, reduce]);

    const glareX = useTransform(pointerX, [-0.5, 0.5], ["15%", "85%"]);
    const glareY = useTransform(pointerY, [-0.5, 0.5], ["15%", "85%"]);
    const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.75), rgba(255,255,255,0.12) 38%, transparent 62%)`;

    return (
        <div className="relative mb-4 h-[88px] w-16" aria-hidden style={{ perspective: 400 }}>
            {/* Ribbon: two crossed straps in the section accent, tucked behind the disc */}
            <svg viewBox="0 0 64 88" className="absolute inset-0 h-full w-full">
                <polygon points="12,0 26,0 40,46 28,50" style={{ fill: "rgb(var(--accent-rgb, 167, 139, 250))" }} opacity="0.9" />
                <polygon points="52,0 38,0 24,46 36,50" style={{ fill: "rgb(var(--accent-rgb-2, 129, 140, 248))" }} opacity="0.95" />
                <polygon points="17,0 21,0 34,44 31,45" fill="#ffffff" opacity="0.25" />
                <polygon points="47,0 43,0 30,44 33,45" fill="#000000" opacity="0.2" />
            </svg>

            <motion.div
                className="absolute"
                style={{
                    left: DISC.cx - DISC.r - 2,
                    top: DISC.cy - DISC.r - 2,
                    width: (DISC.r + 2) * 2,
                    height: (DISC.r + 2) * 2,
                    transformStyle: "preserve-3d",
                }}
                animate={{ rotateY: turns * 360 }}
                transition={{ duration: 1.1, ease: [0.3, 0.7, 0.2, 1] }}
            >
                <svg viewBox="0 0 48 48" className="h-full w-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]">
                    <defs>
                        <radialGradient id={`metal-${uid}`} cx="35%" cy="30%" r="75%">
                            <stop offset="0%" stopColor={metal.hi} />
                            <stop offset="55%" stopColor={metal.mid} />
                            <stop offset="100%" stopColor={metal.lo} />
                        </radialGradient>
                        <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={metal.hi} />
                            <stop offset="100%" stopColor={metal.lo} />
                        </linearGradient>
                    </defs>
                    {/* Milled rim, then the face */}
                    <circle cx="24" cy="24" r="23" fill={`url(#rim-${uid})`} />
                    <circle cx="24" cy="24" r="20.5" fill={`url(#metal-${uid})`} />
                    <circle cx="24" cy="24" r="17" fill="none" stroke={metal.lo} strokeOpacity="0.45" strokeWidth="0.8" />
                    {/* Tiny stars around the inner ring */}
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
                        return (
                            <circle
                                key={i}
                                cx={24 + Math.cos(a) * 18.8}
                                cy={24 + Math.sin(a) * 18.8}
                                r="0.7"
                                fill={metal.hi}
                                opacity="0.8"
                            />
                        );
                    })}
                    <text
                        x="22.5"
                        y="30"
                        textAnchor="middle"
                        fontSize="17"
                        fontWeight="800"
                        fill={metal.ink}
                        fillOpacity="0.85"
                        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                    >
                        {place}
                    </text>
                    <text
                        x="31"
                        y="20.5"
                        textAnchor="middle"
                        fontSize="5"
                        fontWeight="700"
                        fill={metal.ink}
                        fillOpacity="0.8"
                        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                    >
                        {ORDINAL[place] ?? "TH"}
                    </text>
                </svg>

                {/* Cursor-tracked glint across the face */}
                <motion.div
                    className="pointer-events-none absolute rounded-full mix-blend-soft-light transition-opacity duration-300"
                    style={{ inset: 3, background: glare, opacity: isHovered ? 1 : 0.35 }}
                />
            </motion.div>
        </div>
    );
};
