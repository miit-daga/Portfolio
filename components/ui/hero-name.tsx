"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    animate,
    motion,
    useAnimationControls,
    useMotionValue,
    useSpring,
    useTransform,
    type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

// The hero's name, letter by letter (Hero.tsx):
//   Stardust    on arrival each letter gathers out of drifting dust
//   Sweep       every few seconds a gold glint passes across it
//   Depth       each letter leans toward the cursor at its own depth
//   Starlines   hover the name and it fades into its own constellation
//   Zero-g      click a letter and it comes loose, drifts, and floats home

const NAME = "Miit Daga";

// Each glyph's stars, as fractions of its inked box (0,0 top left), and the
// lines between them. Rough on purpose: a constellation, not a font
const GLYPHS: Record<string, { pts: [number, number][]; lines: [number, number][] }> = {
    M: { pts: [[0.04, 1], [0.04, 0], [0.5, 0.72], [0.96, 0], [0.96, 1]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    i: { pts: [[0.5, 0.05], [0.5, 0.32], [0.5, 1]], lines: [[1, 2]] },
    t: { pts: [[0.42, 0.02], [0.42, 0.82], [0.9, 1], [0.02, 0.3], [0.92, 0.3]], lines: [[0, 1], [1, 2], [3, 4]] },
    D: { pts: [[0.06, 0], [0.06, 1], [0.58, 1], [0.96, 0.5], [0.58, 0]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
    a: {
        pts: [[0.1, 0.2], [0.52, 0.02], [0.9, 0.22], [0.9, 1], [0.9, 0.52], [0.36, 0.55], [0.06, 0.8], [0.4, 1]],
        lines: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [7, 3]],
    },
    g: {
        pts: [[0.92, 0.04], [0.92, 0.74], [0.5, 1], [0.1, 0.86], [0.46, 0.02], [0.06, 0.28], [0.46, 0.56]],
        lines: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [6, 1]],
    },
};

type Box = { left: number; width: number; height: number; ink: { x0: number; y0: number; x1: number; y1: number } | null };

// Deterministic per-letter variety, so every visit looks the same
const vary = (i: number, salt: number) => {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
};

export function HeroName({ glitching, reduce }: { glitching: boolean; reduce: boolean | null }) {
    const ref = useRef<HTMLHeadingElement>(null);
    const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const baseRefs = useRef<(HTMLElement | null)[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [hover, setHover] = useState(false);

    // The cursor, relative to the name, springy
    const mx = useSpring(0, { stiffness: 120, damping: 18 });
    const my = useSpring(0, { stiffness: 120, damping: 18 });
    // The glint's position across the name, in px
    const sweep = useMotionValue(-10000);

    // Where each letter sits and where its ink is, for the glint and the starlines
    useLayoutEffect(() => {
        const measure = () => {
            const h = ref.current;
            if (!h) return;
            const canvas = document.createElement("canvas").getContext("2d");
            setBoxes(
                letterRefs.current.map((el, i) => {
                    if (!el) return { left: 0, width: 0, height: 0, ink: null };
                    const ch = NAME[i];
                    let ink: Box["ink"] = null;
                    if (canvas && GLYPHS[ch]) {
                        const cs = getComputedStyle(el);
                        canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
                        const m = canvas.measureText(ch);
                        // The baseline, from a zero-size marker sitting on it
                        const base = baseRefs.current[i]?.offsetTop ?? el.offsetHeight * 0.8;
                        ink = { x0: -m.actualBoundingBoxLeft, x1: m.actualBoundingBoxRight, y0: base - m.actualBoundingBoxAscent, y1: base + m.actualBoundingBoxDescent };
                    }
                    // Across the name: the depth wrapper is the one placed in the h1
                    const outer = el.parentElement as HTMLElement | null;
                    return { left: outer?.offsetLeft ?? 0, width: el.offsetWidth, height: el.offsetHeight, ink };
                }),
            );
        };
        measure();
        document.fonts?.ready.then(measure);
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    // Depth: the letters lean toward the cursor
    useEffect(() => {
        if (reduce) return;
        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return;
            const r = ref.current?.getBoundingClientRect();
            if (!r) return;
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            mx.set(Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2))));
            my.set(Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2))));
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
    }, [reduce, mx, my]);

    // Sweep: a glint across the name every few seconds, after it has assembled
    const nameWidth = boxes.length ? boxes[boxes.length - 1].left + boxes[boxes.length - 1].width : 0;
    useEffect(() => {
        if (reduce || !nameWidth) return;
        const band = nameWidth * 0.45;
        const controls = animate(sweep, [-band, nameWidth + band], {
            duration: 1.8,
            ease: "easeInOut",
            delay: 2.2,
            repeat: Infinity,
            repeatDelay: 6.5,
        });
        return () => controls.stop();
    }, [reduce, nameWidth, sweep]);

    return (
        <h1
            ref={ref}
            aria-label={NAME}
            className={cn(
                "font-display pointer-events-auto relative select-none text-6xl md:text-8xl lg:text-9xl drop-shadow-2xl text-white tracking-tight font-bold",
                glitching && "text-glitch",
            )}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
            onPointerLeave={() => setHover(false)}
        >
            {Array.from(NAME).map((ch, i) => (
                <Letter
                    key={i}
                    ch={ch}
                    index={i}
                    box={boxes[i]}
                    nameWidth={nameWidth}
                    mx={mx}
                    my={my}
                    sweep={sweep}
                    starlines={hover}
                    reduce={reduce}
                    spanRef={(el) => (letterRefs.current[i] = el)}
                    baseRef={(el) => (baseRefs.current[i] = el)}
                />
            ))}
        </h1>
    );
}

function Letter({
    ch,
    index,
    box,
    nameWidth,
    mx,
    my,
    sweep,
    starlines,
    reduce,
    spanRef,
    baseRef,
}: {
    ch: string;
    index: number;
    box: Box | undefined;
    nameWidth: number;
    mx: MotionValue<number>;
    my: MotionValue<number>;
    sweep: MotionValue<number>;
    starlines: boolean;
    reduce: boolean | null;
    spanRef: (el: HTMLSpanElement | null) => void;
    baseRef: (el: HTMLElement | null) => void;
}) {
    const space = ch === " ";
    // Nearer letters move more
    const depth = 0.45 + vary(index, 1) * 0.9;
    const x = useTransform(mx, (v) => v * 9 * depth);
    const y = useTransform(my, (v) => v * 6 * depth);
    const left = box?.left ?? 0;
    const band = nameWidth * 0.45;
    const bgPos = useTransform(sweep, (v) => `${v - left - band / 2}px 0px`);

    // Zero-g: knocked loose, it drifts off tumbling, then floats back
    const float = useAnimationControls();
    const drifting = useRef(false);
    const knock = async () => {
        if (reduce || space || drifting.current) return;
        drifting.current = true;
        const dx = (vary(index, Date.now() % 97) - 0.5) * 120;
        const dy = -(50 + vary(index, (Date.now() % 89) + 3) * 90);
        const spin = (vary(index, (Date.now() % 83) + 7) - 0.5) * 300;
        await float.start({ x: [0, dx * 0.35, dx], y: [0, dy * 0.6, dy], rotate: [0, spin * 0.4, spin], transition: { duration: 2.4, ease: "easeOut" } });
        await float.start({ x: 0, y: 0, rotate: 0, transition: { type: "spring", stiffness: 40, damping: 9, mass: 1.2 } });
        drifting.current = false;
    };

    // Stardust: where this letter's dust starts and settles
    const dust = useMemo(
        () =>
            Array.from({ length: space ? 0 : 12 }, (_, k) => {
                const a = vary(index * 31 + k, 5) * Math.PI * 2;
                const r = 90 + vary(index * 31 + k, 9) * 170;
                return {
                    fromX: Math.cos(a) * r,
                    fromY: Math.sin(a) * r * 0.7,
                    toX: 15 + vary(index * 31 + k, 11) * 70,
                    toY: 25 + vary(index * 31 + k, 13) * 55,
                    delay: index * 0.06 + vary(index * 31 + k, 17) * 0.25,
                    size: 1.5 + vary(index * 31 + k, 19) * 2,
                };
            }),
        [index, space],
    );
    const settle = 0.55 + index * 0.06;

    const glyph = GLYPHS[ch];
    const ink = box?.ink;

    return (
        <motion.span aria-hidden className="relative inline-block" style={reduce ? undefined : { x, y }}>
            <motion.span
                ref={spanRef}
                className={cn("relative inline-block", !space && "cursor-default")}
                style={{ width: space ? "0.26em" : undefined }}
                animate={float}
                onClick={knock}
            >
                {/* The letter, with the glint running through its fill. It
                    fades back while hovered, so the name becomes its constellation */}
                <motion.span
                    className="inline-block"
                    animate={{ opacity: starlines ? 0.18 : 1 }}
                    transition={{ duration: 0.35, delay: starlines ? index * 0.03 : 0 }}
                >
                <motion.span
                    className="relative inline-block"
                    style={
                        space
                            ? undefined
                            : {
                                  color: "transparent",
                                  backgroundColor: "#ffffff",
                                  backgroundImage: "linear-gradient(100deg, transparent 0%, rgba(253,224,139,0.95) 50%, transparent 100%)",
                                  backgroundSize: `${band}px 100%`,
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: reduce ? "-10000px 0" : bgPos,
                                  WebkitBackgroundClip: "text",
                                  backgroundClip: "text",
                              }
                    }
                    initial={reduce ? false : { opacity: 0, filter: "blur(12px)", scale: 1.25 }}
                    animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                    transition={{ delay: settle, duration: 0.7, ease: "easeOut" }}
                >
                    {space ? " " : ch}
                    {/* Sits on the baseline, so the starlines know where it is */}
                    <i ref={baseRef} className="inline-block h-0 w-0 align-baseline" />
                </motion.span>
                </motion.span>

                {/* Stardust gathering into it */}
                {!reduce &&
                    dust.map((d, k) => (
                        <motion.span
                            key={k}
                            className="pointer-events-none absolute rounded-full bg-amber-100"
                            style={{ left: `${d.toX}%`, top: `${d.toY}%`, width: d.size, height: d.size, boxShadow: "0 0 6px rgba(252,211,77,0.9)" }}
                            initial={{ x: d.fromX, y: d.fromY, opacity: 0 }}
                            animate={{ x: 0, y: 0, opacity: [0, 1, 1, 0] }}
                            transition={{ delay: d.delay, duration: 0.9 + (settle - d.delay) * 0.6, times: [0, 0.2, 0.8, 1], ease: "easeOut" }}
                        />
                    ))}

                {/* Its constellation, traced on hover */}
                {glyph && ink && box && (
                    <svg
                        className="pointer-events-none absolute left-0 top-0 overflow-visible"
                        width={box.width}
                        height={box.height}
                        aria-hidden
                    >
                        {glyph.lines.map(([a, b], k) => {
                            const p = glyph.pts[a];
                            const q = glyph.pts[b];
                            const px = (v: [number, number]) => [ink.x0 + v[0] * (ink.x1 - ink.x0), ink.y0 + v[1] * (ink.y1 - ink.y0)];
                            const [x1, y1] = px(p);
                            const [x2, y2] = px(q);
                            return (
                                <motion.line
                                    key={`l${k}`}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="rgba(224,242,254,0.8)"
                                    strokeWidth={1.5}
                                    strokeLinecap="round"
                                    initial={false}
                                    animate={starlines ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                                    transition={{ duration: 0.45, delay: starlines ? index * 0.05 + k * 0.04 : 0 }}
                                />
                            );
                        })}
                        {glyph.pts.map((v, k) => (
                            <motion.circle
                                key={`s${k}`}
                                cx={ink.x0 + v[0] * (ink.x1 - ink.x0)}
                                cy={ink.y0 + v[1] * (ink.y1 - ink.y0)}
                                r={3.2}
                                fill="#f0f9ff"
                                style={{ filter: "drop-shadow(0 0 4px rgba(125,211,252,0.95))" }}
                                initial={false}
                                animate={starlines ? { opacity: [0, 1, 0.8], scale: [0.4, 1.3, 1] } : { opacity: 0, scale: 0.4 }}
                                transition={{ duration: 0.4, delay: starlines ? index * 0.05 + k * 0.03 : 0 }}
                            />
                        ))}
                    </svg>
                )}
            </motion.span>
        </motion.span>
    );
}
