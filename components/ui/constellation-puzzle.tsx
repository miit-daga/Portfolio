"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// A faint patch of sky hiding an "M" constellation. Click star to star to trace
// it: real edges stay lit, wrong guesses flash and fade. Tracing the whole
// letter ignites it for the session.
const STARS = [
    // The "M" (indices 0-4)
    { x: 70, y: 168 },
    { x: 78, y: 52 },
    { x: 125, y: 118 },
    { x: 172, y: 50 },
    { x: 182, y: 168 },
    // Decoys
    { x: 232, y: 72 },
    { x: 268, y: 142 },
    { x: 215, y: 32 },
    { x: 292, y: 92 },
    { x: 138, y: 22 },
    { x: 40, y: 92 },
];
const EDGES = ["0-1", "1-2", "2-3", "3-4"];
export const CONSTELLATION_STORAGE_KEY = "constellation-charted";
const STORAGE_KEY = CONSTELLATION_STORAGE_KEY;

const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

export const ConstellationPuzzle = () => {
    const reduce = useReducedMotion();
    const [selected, setSelected] = useState<number | null>(null);
    const [drawn, setDrawn] = useState<Set<string>>(new Set());
    const [wrong, setWrong] = useState<{ a: number; b: number; id: number } | null>(null);
    const [solved, setSolved] = useState(false);

    useEffect(() => {
        try {
            if (sessionStorage.getItem(STORAGE_KEY)) {
                setSolved(true);
                setDrawn(new Set(EDGES));
            }
        } catch {
            /* ignore */
        }
    }, []);

    const onStarClick = (i: number) => {
        if (solved) return;
        if (selected === null || selected === i) {
            setSelected(selected === i ? null : i);
            return;
        }
        const key = edgeKey(selected, i);
        if (EDGES.includes(key) && !drawn.has(key)) {
            const next = new Set(drawn);
            next.add(key);
            setDrawn(next);
            setSelected(i);
            if (next.size === EDGES.length) {
                setSolved(true);
                setSelected(null);
                try {
                    sessionStorage.setItem(STORAGE_KEY, "1");
                } catch {
                    /* ignore */
                }
            }
        } else {
            setWrong({ a: selected, b: i, id: Date.now() });
            setSelected(null);
        }
    };

    const starState = (i: number) => {
        const inDrawn = [...drawn].some((k) => k.split("-").map(Number).includes(i));
        return { lit: inDrawn || solved, sel: selected === i };
    };

    return (
        <div className="flex w-full max-w-sm flex-col items-center gap-1">
            <svg viewBox="0 0 320 200" className="w-full" role="img" aria-label="A hidden constellation puzzle">
                {/* Traced edges */}
                {[...drawn].map((k) => {
                    const [a, b] = k.split("-").map(Number);
                    return (
                        <motion.line
                            key={k}
                            x1={STARS[a].x}
                            y1={STARS[a].y}
                            x2={STARS[b].x}
                            y2={STARS[b].y}
                            stroke={solved ? "#5eead4" : "rgba(45,212,191,0.7)"}
                            strokeWidth={solved ? 1.8 : 1.3}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut" }}
                            style={solved ? { filter: "drop-shadow(0 0 4px rgba(45,212,191,0.9))" } : undefined}
                        />
                    );
                })}

                {/* Wrong guess flash */}
                {wrong && (
                    <motion.line
                        key={wrong.id}
                        x1={STARS[wrong.a].x}
                        y1={STARS[wrong.a].y}
                        x2={STARS[wrong.b].x}
                        y2={STARS[wrong.b].y}
                        stroke="rgba(248,113,113,0.7)"
                        strokeWidth={1.2}
                        strokeDasharray="3 4"
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        onAnimationComplete={() => setWrong(null)}
                    />
                )}

                {/* Stars */}
                {STARS.map((s, i) => {
                    const { lit, sel } = starState(i);
                    return (
                        <g key={i} onClick={() => onStarClick(i)} className={solved ? undefined : "cursor-pointer"}>
                            {/* generous invisible hit area */}
                            <circle cx={s.x} cy={s.y} r={16} fill="transparent" />
                            {/* selection pulse */}
                            {sel && !reduce && (
                                <motion.circle
                                    cx={s.x}
                                    cy={s.y}
                                    r={8}
                                    fill="none"
                                    stroke="rgba(94,234,212,0.8)"
                                    strokeWidth={1.2}
                                    initial={{ scale: 1, opacity: 0.9 }}
                                    animate={{ scale: 2.2, opacity: 0 }}
                                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
                                    style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                                />
                            )}
                            <circle
                                cx={s.x}
                                cy={s.y}
                                r={lit ? 5.5 : sel ? 5 : 4}
                                fill={lit ? "#99f6e4" : sel ? "#5eead4" : "rgba(226,232,240,0.75)"}
                                style={{
                                    filter: lit
                                        ? "drop-shadow(0 0 8px rgba(45,212,191,1))"
                                        : sel
                                            ? "drop-shadow(0 0 7px rgba(45,212,191,0.9))"
                                            : "drop-shadow(0 0 4px rgba(255,255,255,0.55))",
                                    transition: "fill 0.3s, r 0.3s",
                                }}
                            />
                        </g>
                    );
                })}

                {/* Ignition burst */}
                {solved && !reduce && (
                    <motion.circle
                        cx={126}
                        cy={110}
                        r={20}
                        fill="none"
                        stroke="rgba(94,234,212,0.7)"
                        strokeWidth={1.5}
                        initial={{ scale: 0.4, opacity: 0.9 }}
                        animate={{ scale: 5, opacity: 0 }}
                        transition={{ duration: 1.4, ease: "easeOut" }}
                        style={{ transformOrigin: "126px 110px" }}
                    />
                )}
            </svg>

            <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                {solved ? (
                    <span className="text-teal-400/90">constellation &ldquo;MIIT-1&rdquo; charted &#10038;</span>
                ) : (
                    <>uncharted sky &middot; trace what you see</>
                )}
            </p>
        </div>
    );
};
