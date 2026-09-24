"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CipherText } from "./cipher-text";

// A faint patch of sky hiding a constellation: a different one each day
// (constants/constellations.ts), named in the prompt. Click star to star to
// trace it: the stars answer the cursor, a thread runs from the last star to
// it, real edges stay lit, wrong guesses flash, sting, and earn a sarcastic
// caption. Three misses in a row flicker a ghost of a real edge as a hint.
// Tracing the whole figure ignites it for the session with a glow sweep and an
// arpeggio, hands over one of the hidden fragments, and records the charting
// (/api/constellation) so it can say how many visitors have found it.
import { CONSTELLATION_STORAGE_KEY } from "./constellation-key";
import { todaysFigure } from "@/constants/constellations";
import { useFragmentGift } from "./collectibles";
export { CONSTELLATION_STORAGE_KEY };
const STORAGE_KEY = CONSTELLATION_STORAGE_KEY;

const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// One pluck per correct link, climbing a major scale from C5
const LINK_NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];

const MISS_QUIPS = [
    "that line exists in no sky",
    "bold cartography. the sky disagrees.",
    "somewhere an astronomer just sighed",
    "the stars said no",
    "charting 'abstract scribble #7'... discarded",
    "interesting theory. wrong universe.",
];

// Lazily-created shared AudioContext (same pattern as the fragment chime)
let audioCtx: AudioContext | null = null;
function playNotes(
    freqs: number[],
    { type = "sine" as OscillatorType, peak = 0.1, step = 0.08, decay = 0.18 } = {},
) {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const ctx = audioCtx;
        const now = ctx.currentTime;
        freqs.forEach((freq, i) => {
            const t = now + i * step;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + decay + 0.05);
        });
    } catch {
        /* audio not available - ignore */
    }
}

const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

export const ConstellationPuzzle = () => {
    const reduce = useReducedMotion();
    // Today's figure, fixed for the visit
    const [figure] = useState(todaysFigure);
    const STARS = [...figure.stars, ...figure.decoys];
    const EDGES = figure.edges.map(([a, b]) => edgeKey(a, b));
    const FIGURE_PATH = figure.edges.map(([a, b]) => `M ${STARS[a].x} ${STARS[a].y} L ${STARS[b].x} ${STARS[b].y}`).join(" ");
    const centre = {
        x: figure.stars.reduce((t, p) => t + p.x, 0) / figure.stars.length,
        y: figure.stars.reduce((t, p) => t + p.y, 0) / figure.stars.length,
    };
    const gift = useFragmentGift();
    // What the solve earned, and how many have charted it
    const [reward, setReward] = useState<string | null>(null);
    const [tally, setTally] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    const [drawn, setDrawn] = useState<Set<string>>(new Set());
    const [wrong, setWrong] = useState<{ a: number; b: number; id: number } | null>(null);
    const [solved, setSolved] = useState(false);
    // Distinguishes solving right now (full celebration) from rehydrating a
    // past solve (lit, but quiet)
    const [justSolved, setJustSolved] = useState(false);
    const [quip, setQuip] = useState<{ text: string; id: number } | null>(null);
    const [hint, setHint] = useState<{ key: string; id: number } | null>(null);
    const [bursts, setBursts] = useState<{ x: number; y: number; id: number }[]>([]);
    // Rubber-band aiming line from the selected star to the cursor
    const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
    const [callsign, setCallsign] = useState<string | null>(null);

    const quipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const quipIdx = useRef(0);
    const missStreak = useRef(0);

    useEffect(() => {
        try {
            // Solved this session, and it is still the same figure
            if (sessionStorage.getItem(STORAGE_KEY) === figure.id) {
                setSolved(true);
                setDrawn(new Set(EDGES));
                setCallsign(sessionStorage.getItem("visitor-callsign"));
                fetch(`/api/constellation?fig=${figure.id}`)
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => d && d.count > 0 && setTally(`charted by ${d.count} ${d.count === 1 ? "visitor" : "visitors"}`))
                    .catch(() => {});
            }
        } catch {
            /* ignore */
        }
        return () => {
            if (quipTimer.current) clearTimeout(quipTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showQuip = () => {
        setQuip({ text: MISS_QUIPS[quipIdx.current % MISS_QUIPS.length], id: Date.now() });
        quipIdx.current += 1;
        if (quipTimer.current) clearTimeout(quipTimer.current);
        quipTimer.current = setTimeout(() => setQuip(null), 2400);
    };

    const onStarClick = (i: number) => {
        if (solved) return;
        if (selected === null || selected === i) {
            const next = selected === i ? null : i;
            setSelected(next);
            if (next === null) setCursor(null);
            else playNotes([392], { peak: 0.04, decay: 0.08 }); // soft pick-up tick
            return;
        }
        const key = edgeKey(selected, i);
        // Back along a line already drawn: just move there. Branching figures
        // (the rocket's fins, the dipper's handle) need to start a new stroke
        // from a star already traced, and that should never count as a miss
        if (drawn.has(key)) {
            setSelected(i);
            playNotes([392], { peak: 0.04, decay: 0.08 });
            return;
        }
        if (EDGES.includes(key)) {
            const next = new Set(drawn);
            next.add(key);
            setDrawn(next);
            setSelected(i);
            missStreak.current = 0;
            if (!reduce) setBursts((prev) => [...prev, { x: STARS[i].x, y: STARS[i].y, id: Date.now() }]);
            if (next.size === EDGES.length) {
                setSolved(true);
                setJustSolved(true);
                setSelected(null);
                setCursor(null);
                playNotes([659.25, 880, 1174.66, 1567.98], { step: 0.09, peak: 0.12 });
                try {
                    sessionStorage.setItem(STORAGE_KEY, figure.id);
                    setCallsign(sessionStorage.getItem("visitor-callsign"));
                } catch {
                    /* ignore */
                }
                // A fragment, flown from the figure's heart to the counter
                const r = svgRef.current?.getBoundingClientRect();
                if (r) {
                    const given = gift.give({ x: r.left + (centre.x / 320) * r.width, y: r.top + (centre.y / 200) * r.height });
                    setReward(given ? "+1 fragment recovered" : "every fragment already found");
                }
                // Record the charting, and say where this visitor came in
                fetch("/api/constellation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fig: figure.id }),
                })
                    .then((res) => (res.ok ? res.json() : null))
                    .then((d) => {
                        if (!d) return;
                        setTally(d.place ? `you're the ${ordinal(d.place)} to chart ${figure.name}` : `charted by ${d.count} ${d.count === 1 ? "visitor" : "visitors"}`);
                    })
                    .catch(() => {});
            } else {
                playNotes([LINK_NOTES[next.size - 1]]);
            }
        } else {
            setWrong({ a: selected, b: i, id: Date.now() });
            setSelected(null);
            setCursor(null);
            playNotes([220, 164.81], { type: "triangle", peak: 0.05, step: 0.1, decay: 0.12 });
            showQuip();
            missStreak.current += 1;
            // Three misses in a row: flicker a ghost of a real, undrawn edge
            if (missStreak.current >= 3) {
                missStreak.current = 0;
                const ghost = EDGES.find((e) => !drawn.has(e));
                if (ghost) setHint({ key: ghost, id: Date.now() });
            }
        }
    };

    const onStarKeyDown = (e: React.KeyboardEvent, i: number) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onStarClick(i);
        }
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (selected === null || solved || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        setCursor({
            x: ((e.clientX - rect.left) / rect.width) * 320,
            y: ((e.clientY - rect.top) / rect.height) * 200,
        });
    };

    const starState = (i: number) => {
        const inDrawn = [...drawn].some((k) => k.split("-").map(Number).includes(i));
        // Solved lights the figure only; decoys stay as background stars
        return { lit: inDrawn || (solved && i < figure.stars.length), sel: selected === i };
    };

    return (
        <div className="flex w-full max-w-sm flex-col items-center gap-1">
            <svg
                ref={svgRef}
                viewBox="0 0 320 200"
                className={solved ? "w-full" : "w-full cursor-crosshair"}
                role="img"
                aria-label={`A hidden constellation puzzle: ${figure.noun} is hidden in the stars`}
                onMouseMove={onMouseMove}
                onMouseLeave={() => setCursor(null)}
            >
                {/* Rubber-band aiming line */}
                {selected !== null && cursor && !solved && (
                    <g pointerEvents="none">
                        <line
                            x1={STARS[selected].x}
                            y1={STARS[selected].y}
                            x2={cursor.x}
                            y2={cursor.y}
                            stroke="rgba(94,234,212,0.7)"
                            strokeWidth={1.4}
                            strokeDasharray="5 4"
                            strokeLinecap="round"
                        />
                        <circle cx={cursor.x} cy={cursor.y} r={2} fill="rgba(153,246,228,0.9)" />
                    </g>
                )}

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
                        key={`wrong-${wrong.id}`}
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

                {/* Hint: a real edge flickers like chart static, then fades */}
                {hint && (() => {
                    const [a, b] = hint.key.split("-").map(Number);
                    return (
                        <motion.line
                            key={`hint-${hint.id}`}
                            x1={STARS[a].x}
                            y1={STARS[a].y}
                            x2={STARS[b].x}
                            y2={STARS[b].y}
                            stroke="rgba(94,234,212,0.6)"
                            strokeWidth={1.1}
                            strokeDasharray="2 5"
                            pointerEvents="none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.55, 0.2, 0.55, 0] }}
                            transition={{ duration: 1.8, times: [0, 0.2, 0.45, 0.7, 1] }}
                            onAnimationComplete={() => setHint(null)}
                        />
                    );
                })()}

                {/* Spark burst on each correct link */}
                {bursts.map((burst) => (
                    <motion.circle
                        key={`burst-${burst.id}`}
                        cx={burst.x}
                        cy={burst.y}
                        r={6}
                        fill="none"
                        stroke="rgba(94,234,212,0.8)"
                        strokeWidth={1.2}
                        pointerEvents="none"
                        initial={{ scale: 0.5, opacity: 0.9 }}
                        animate={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        style={{ transformOrigin: `${burst.x}px ${burst.y}px` }}
                        onAnimationComplete={() => setBursts((prev) => prev.filter((p) => p.id !== burst.id))}
                    />
                ))}

                {/* Stars */}
                {STARS.map((s, i) => {
                    const { lit, sel } = starState(i);
                    const hov = hovered === i && !solved;
                    return (
                        <g
                            key={i}
                            onClick={() => onStarClick(i)}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onKeyDown={(e) => onStarKeyDown(e, i)}
                            role="button"
                            tabIndex={solved ? -1 : 0}
                            aria-label={`Star ${i + 1}`}
                            className={solved ? "outline-none" : "cursor-crosshair outline-none"}
                        >
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
                            {/* Hover halo: the star answers the cursor */}
                            {hov && !sel && (
                                <circle cx={s.x} cy={s.y} r={11} fill="rgba(94,234,212,0.12)" stroke="rgba(94,234,212,0.45)" strokeWidth={1} pointerEvents="none" />
                            )}
                            <motion.circle
                                cx={s.x}
                                cy={s.y}
                                r={lit ? 5.5 : hov ? 6.5 : sel ? 5 : 4}
                                fill={lit ? "#99f6e4" : sel ? "#5eead4" : hov ? "#ccfbf1" : "rgba(226,232,240,0.75)"}
                                animate={
                                    !lit && !sel && !reduce
                                        ? { opacity: [0.6, 1, 0.6] }
                                        : { opacity: 1 }
                                }
                                transition={
                                    !lit && !sel && !reduce
                                        ? {
                                              duration: 2.2 + (i % 4) * 0.6,
                                              repeat: Infinity,
                                              ease: "easeInOut",
                                              delay: (i % 5) * 0.35,
                                          }
                                        : { duration: 0.2 }
                                }
                                style={{
                                    filter: lit
                                        ? "drop-shadow(0 0 8px rgba(45,212,191,1))"
                                        : sel || hov
                                            ? "drop-shadow(0 0 7px rgba(45,212,191,0.9))"
                                            : "drop-shadow(0 0 4px rgba(255,255,255,0.55))",
                                    transition: "fill 0.3s, r 0.3s",
                                }}
                            />
                        </g>
                    );
                })}

                {/* Celebration: only when solved in this session, not on rehydrate */}
                {justSolved && !reduce && (
                    <>
                        {/* Ignition burst from the constellation's heart */}
                        <motion.circle
                            cx={centre.x}
                            cy={centre.y}
                            r={20}
                            fill="none"
                            stroke="rgba(94,234,212,0.7)"
                            strokeWidth={1.5}
                            initial={{ scale: 0.4, opacity: 0.9 }}
                            animate={{ scale: 5, opacity: 0 }}
                            transition={{ duration: 1.4, ease: "easeOut" }}
                            style={{ transformOrigin: `${centre.x}px ${centre.y}px` }}
                        />
                        {/* Glow sweep retracing the whole letter */}
                        <motion.path
                            d={FIGURE_PATH}
                            fill="none"
                            stroke="#99f6e4"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            pointerEvents="none"
                            initial={{ pathLength: 0, opacity: 0.9 }}
                            animate={{ pathLength: 1, opacity: [0.9, 0.9, 0] }}
                            transition={{ duration: 1.2, ease: "easeInOut", times: [0, 0.8, 1] }}
                            style={{ filter: "drop-shadow(0 0 6px rgba(94,234,212,0.9))" }}
                        />
                        {/* Staggered rings on the figure's stars */}
                        {figure.stars.map((_, i) => (
                            <motion.circle
                                key={`ring-${i}`}
                                cx={STARS[i].x}
                                cy={STARS[i].y}
                                r={7}
                                fill="none"
                                stroke="rgba(153,246,228,0.9)"
                                strokeWidth={1}
                                pointerEvents="none"
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 2.6, opacity: [0, 0.9, 0] }}
                                transition={{ duration: 0.9, delay: 0.25 + i * 0.12, ease: "easeOut" }}
                                style={{ transformOrigin: `${STARS[i].x}px ${STARS[i].y}px` }}
                            />
                        ))}
                    </>
                )}
            </svg>

            <p className="text-center font-mono text-[11px] sm:text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                {solved ? (
                    <span className="text-teal-400/90">
                        {justSolved ? (
                            <CipherText text={`constellation "${figure.name}" charted ✶`} />
                        ) : (
                            <>constellation &ldquo;{figure.name}&rdquo; charted &#10038;</>
                        )}
                    </span>
                ) : quip ? (
                    <span className="normal-case tracking-[0.15em] text-rose-300/80">{quip.text}</span>
                ) : drawn.size > 0 ? (
                    <>
                        charting &middot; {drawn.size} / {EDGES.length} links
                    </>
                ) : (
                    <>{figure.noun} is hidden in these stars &middot; trace it</>
                )}
            </p>
            {solved && callsign && (
                <motion.p
                    className="text-center font-mono text-[11px] sm:text-[9px] uppercase tracking-[0.25em] text-neutral-700"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: justSolved ? 1.4 : 0 }}
                >
                    charted by {callsign}
                </motion.p>
            )}
            {solved && (reward || tally) && (
                <motion.p
                    className="text-center font-mono text-[11px] sm:text-[9px] uppercase tracking-[0.25em] text-neutral-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: justSolved ? 1.8 : 0 }}
                >
                    {[reward, tally].filter(Boolean).join(" · ")}
                </motion.p>
            )}
            {gift.node}
        </div>
    );
};
