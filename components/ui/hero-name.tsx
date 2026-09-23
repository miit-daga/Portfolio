"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    animate,
    AnimatePresence,
    motion,
    motionValue,
    useAnimationControls,
    useMotionValue,
    useSpring,
    useTransform,
    type LegacyAnimationControls as AnimationControls,
    type MotionValue,
} from "framer-motion";
import { IconVolume } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// The hero's name, letter by letter (Hero.tsx):
//   Stardust    on arrival each letter gathers out of drifting dust
//   Sweep       every few seconds a gold glint passes across it
//   Depth       each letter leans toward the cursor at its own depth
//   Starlines   hover the name and it fades into its own constellation
//   Zero-g      click a letter and it comes loose, drifts, and floats home;
//               knock all eight loose at once and they gather, spin, and
//               snap back with a burst
//   Say it      hover the name a moment (long-press on a phone) for how to
//               say it, with a button that says it aloud
//   Neighbours  the letters shudder when the rocket lands on its pad nearby,
//               and lean away from the idle alien as he walks past
//   "miit"      type it while the hero is on screen and the letters wave

const NAME = "Miit Daga";
const LETTERS = Array.from(NAME).filter((c) => c !== " ").length;

// How the name is said: shown in the chip, and spoken by the browser
const SAY = { phonetic: "meet · DAH-gah", spoken: "Meet Daaga" };

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

    // Zero-g champion: every letter afloat at once
    const drifting = useRef(0);
    const [champion, setChampion] = useState(0);
    const [toast, setToast] = useState<string | null>(null);
    // Say it
    const [sayOpen, setSayOpen] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const sayTimer = useRef<number | null>(null);
    const suppressKnock = useRef(false);
    // The shudder and the wave play straight on each letter's controls, so
    // they never re-render the name (the rocket is mid-flight when it lands)
    const fxControls = useRef(new Map<number, AnimationControls>());
    const registerFx = (i: number, c: AnimationControls | null) => {
        if (c) fxControls.current.set(i, c);
        else fxControls.current.delete(i);
    };
    const playFx = (make: (i: number) => Parameters<AnimationControls["start"]>[0]) => {
        fxControls.current.forEach((c, i) => c.start(make(i)));
    };
    // How far each letter leans away from the alien, in degrees
    const leans = useMemo(() => Array.from(NAME, () => motionValue(0)), []);

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
                    // Across the name: measured from the letter's outermost
                    // wrapper, the one placed directly in the h1
                    let outer: HTMLElement | null = el;
                    while (outer && outer.parentElement !== h) outer = outer.parentElement;
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

    const onDriftStart = () => {
        drifting.current += 1;
        if (drifting.current >= LETTERS) {
            drifting.current = 0;
            setChampion(Date.now());
            setToast("zero-g champion · all eight afloat");
            window.setTimeout(() => setToast(null), 3400);
        }
    };
    const onDriftEnd = () => {
        drifting.current = Math.max(0, drifting.current - 1);
    };
    // A long-press to read the name must not also knock a letter loose
    const allowKnock = () => {
        if (!suppressKnock.current) return true;
        suppressKnock.current = false;
        return false;
    };

    const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
    const say = () => {
        if (!canSpeak) return;
        const u = new SpeechSynthesisUtterance(SAY.spoken);
        const voice = window.speechSynthesis.getVoices().find((v) => v.lang === "en-IN");
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? "en-IN";
        u.rate = 0.85;
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.cancel();
        setSpeaking(true);
        window.speechSynthesis.speak(u);
    };
    const clearSayTimer = () => {
        if (sayTimer.current) window.clearTimeout(sayTimer.current);
        sayTimer.current = null;
    };

    // The rocket's pad sits in the hero: a landing shakes the letters. (It
    // takes off only once the name has scrolled away, so that one is not felt.)
    useEffect(() => {
        if (reduce) return;
        const jolt = () => {
            if (window.scrollY > window.innerHeight * 0.8) return;
            // Just as it touches down, not as it starts descending
            window.setTimeout(
                () =>
                    playFx((i) => ({
                        x: [0, -2.5, 2.5, -2, 1.5, -1, 0],
                        y: [0, 1, -1, 1, 0, 0, 0],
                        transition: { duration: 0.6, delay: i * 0.025 },
                    })),
                1100,
            );
        };
        window.addEventListener("rocket-arrive", jolt);
        return () => window.removeEventListener("rocket-arrive", jolt);
    }, [reduce]);

    // Typing "miit" while the hero is up waves the letters
    useEffect(() => {
        if (reduce) return;
        let typed = "";
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
            typed = (typed + e.key.toLowerCase()).slice(-4);
            if (typed === "miit" && window.scrollY < window.innerHeight * 0.7) {
                typed = "";
                playFx((i) => ({ y: [0, -24, 0], transition: { duration: 0.55, delay: i * 0.07, ease: "easeOut" } }));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [reduce]);

    // The idle alien walking past: letters near him lean away
    useEffect(() => {
        if (reduce || !boxes.length) return;
        let leaning = false;
        const id = window.setInterval(() => {
            // Cheap checks first: no layout reads unless he is here and so is the name
            const el = window.scrollY < window.innerHeight ? document.querySelector("[data-idle-alien]") : null;
            if (!el) {
                if (leaning) leans.forEach((l) => l.set(0));
                leaning = false;
                return;
            }
            leaning = true;
            const h = ref.current?.getBoundingClientRect();
            const alien = el.getBoundingClientRect();
            boxes.forEach((b, i) => {
                if (!h || !b.width) return leans[i].set(0);
                const dx = h.left + b.left + b.width / 2 - (alien.left + alien.width / 2);
                const near = Math.max(0, 1 - Math.abs(dx) / 380);
                leans[i].set(Math.sign(dx) * 11 * near);
            });
        }, 80);
        return () => window.clearInterval(id);
    }, [reduce, boxes, leans]);

    return (
        <h1
            ref={ref}
            aria-label={NAME}
            className={cn(
                "font-display pointer-events-auto relative select-none text-6xl md:text-8xl lg:text-9xl drop-shadow-2xl text-white tracking-tight font-bold",
                glitching && "text-glitch",
            )}
            onPointerEnter={(e) => {
                if (e.pointerType !== "mouse") return;
                setHover(true);
                clearSayTimer();
                sayTimer.current = window.setTimeout(() => setSayOpen(true), 900);
            }}
            onPointerLeave={(e) => {
                setHover(false);
                if (e.pointerType === "mouse") {
                    clearSayTimer();
                    setSayOpen(false);
                }
            }}
            onPointerDown={(e) => {
                if (e.pointerType !== "touch") return;
                clearSayTimer();
                sayTimer.current = window.setTimeout(() => {
                    suppressKnock.current = true;
                    setSayOpen(true);
                    window.setTimeout(() => setSayOpen(false), 6000);
                }, 550);
            }}
            onPointerUp={clearSayTimer}
            onPointerCancel={clearSayTimer}
            onContextMenu={(e) => sayOpen && e.preventDefault()}
        >
            {/* Above the name: how to say it, or the champion's toast */}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 font-mono text-[11px] font-normal tracking-normal">
                <AnimatePresence mode="wait">
                    {toast ? (
                        <motion.span
                            key="toast"
                            className="block whitespace-nowrap rounded-full border border-amber-300/40 bg-black/70 px-3 py-1 text-amber-100 backdrop-blur-sm"
                            initial={{ opacity: 0, y: 6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4 }}
                        >
                            ✦ {toast}
                        </motion.span>
                    ) : sayOpen ? (
                        <motion.span
                            key="say"
                            className="pointer-events-auto flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-black/70 py-1 pl-3 pr-1 text-neutral-300 backdrop-blur-sm"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                        >
                            <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">say it</span>
                            <span className="text-neutral-100">{SAY.phonetic}</span>
                            {canSpeak && (
                                <button
                                    type="button"
                                    aria-label={`Hear it: ${SAY.phonetic}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        say();
                                    }}
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                                        speaking ? "bg-amber-300 text-neutral-950" : "bg-white/10 text-neutral-200 hover:bg-white/20",
                                    )}
                                >
                                    <IconVolume className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </motion.span>
                    ) : null}
                </AnimatePresence>
            </span>

            {/* The champion's burst, from the middle of the name */}
            {champion > 0 && !reduce && (
                <span key={champion} aria-hidden className="pointer-events-none absolute top-1/2" style={{ left: nameWidth / 2 }}>
                    {Array.from({ length: 28 }, (_, k) => {
                        const a = (k / 28) * Math.PI * 2;
                        const r = 90 + vary(k, 23) * 120;
                        return (
                            <motion.span
                                key={k}
                                className="absolute h-1.5 w-1.5 rounded-full bg-amber-100"
                                style={{ boxShadow: "0 0 8px rgba(252,211,77,0.95)" }}
                                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                                animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, opacity: [0, 1, 0], scale: [0.4, 1.2, 0.6] }}
                                transition={{ delay: 1.05, duration: 1.1, ease: "easeOut" }}
                            />
                        );
                    })}
                </span>
            )}

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
                    champion={champion}
                    registerFx={registerFx}
                    lean={leans[i]}
                    onDriftStart={onDriftStart}
                    onDriftEnd={onDriftEnd}
                    allowKnock={allowKnock}
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
    champion,
    registerFx,
    lean,
    onDriftStart,
    onDriftEnd,
    allowKnock,
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
    champion: number;
    registerFx: (i: number, c: AnimationControls | null) => void;
    lean: MotionValue<number>;
    onDriftStart: () => void;
    onDriftEnd: () => void;
    allowKnock: () => boolean;
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

    // Leaning away from the alien, springy
    const leanS = useSpring(lean, { stiffness: 90, damping: 14 });

    // Zero-g: knocked loose, it drifts off tumbling, then floats back
    const float = useAnimationControls();
    const drifting = useRef(false);
    // Bumped when the champion's gathering takes over a drift in progress
    const generation = useRef(0);
    const knock = async () => {
        if (!allowKnock() || reduce || space || drifting.current) return;
        drifting.current = true;
        const gen = generation.current;
        onDriftStart();
        const dx = (vary(index, Date.now() % 97) - 0.5) * 120;
        const dy = -(50 + vary(index, (Date.now() % 89) + 3) * 90);
        const spin = (vary(index, (Date.now() % 83) + 7) - 0.5) * 300;
        await float.start({ x: [0, dx * 0.35, dx], y: [0, dy * 0.6, dy], rotate: [0, spin * 0.4, spin], transition: { duration: 2.4, ease: "easeOut" } });
        if (gen !== generation.current) return;
        await float.start({ x: 0, y: 0, rotate: 0, transition: { type: "spring", stiffness: 40, damping: 9, mass: 1.2 } });
        if (gen !== generation.current) return;
        drifting.current = false;
        onDriftEnd();
    };

    // All eight afloat: they gather in the middle, spin, and snap home
    useEffect(() => {
        if (!champion || space || !box) return;
        generation.current += 1;
        drifting.current = true;
        float.stop();
        const toMiddle = nameWidth / 2 - (box.left + box.width / 2);
        float
            .start({ x: toMiddle * 0.85, y: -46, rotate: 360 * (index % 2 ? 1 : -1), scale: 0.55, transition: { duration: 0.95, ease: "easeInOut" } })
            .then(() => float.start({ x: 0, y: 0, rotate: 0, scale: 1, transition: { type: "spring", stiffness: 110, damping: 12, delay: 0.15 + index * 0.04 } }))
            .then(() => {
                drifting.current = false;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [champion]);

    // The rocket's jolt and the "miit" wave, played by the name on these controls
    const fx = useAnimationControls();
    useEffect(() => {
        if (space) return;
        registerFx(index, fx);
        return () => registerFx(index, null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The dust has settled once it has gathered: drop it, so it costs nothing later
    const [dustDone, setDustDone] = useState(!!reduce);
    useEffect(() => {
        if (reduce) return;
        const id = window.setTimeout(() => setDustDone(true), (0.55 + index * 0.06 + 1.4) * 1000);
        return () => window.clearTimeout(id);
    }, [reduce, index]);

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
        <motion.span aria-hidden className="relative inline-block origin-bottom" style={reduce ? undefined : { x, y, rotate: leanS }}>
            <motion.span className="relative inline-block" animate={fx}>
            <motion.span
                ref={spanRef}
                data-letter={space ? undefined : index}
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
                {!dustDone &&
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
        </motion.span>
    );
}
