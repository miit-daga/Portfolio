"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PdfScreen, type Phosphor, type Tube } from "./pdf-screen";
import { DosBoot, DosPrompt, FKeyBar, HelpBox, dosColours, type FKey } from "./dos";
import { playDegauss, playDiskTick, playPowerOff, playPowerOn, playPrinter } from "./crt-sound";
import { JumpMenu, Printer, Starfield } from "./extras";
import type { Section } from "./pdf-screen";

// The resume on a beige 1980s CRT monitor, floating in zero-g: a speaker
// grille, vents and a mission sticker, on its stand. The screen is the resume
// itself, drawn by pdf.js (pdf-screen.tsx).
//
// Two dials under the screen, both real:
//   TUBE      off, soft (the glass's edges), full (scanlines everywhere, a
//             rolling bar, flicker, colour fringing and bloom)
//   PHOSPHOR  paper (as printed), green or amber: the page goes dark and the
//             ink glows, as on a monochrome monitor
// The yellow push-button beside them switches the monitor off and on again.
//
// It runs MIIT-DOS (dos.tsx): a DOS start-up, a function-key bar along the
// bottom of the screen (1 help, 2 print, 3 phosphor, 4 tube, 5 jump, 10 quit),
// and a C:\> prompt to quit to.
//
// Also: a dot-matrix printer that prints the resume before it downloads, a
// jump menu of its sections (5), zoom (+ and -, or the pill on the screen), a
// degauss button, and a starfield screensaver after a minute idle.

const TUBES: Tube[] = ["off", "soft", "full"];
const PHOSPHORS: Phosphor[] = ["paper", "green", "amber"];
const ANGLE = [-55, 0, 55];

const BEIGE = "linear-gradient(170deg, #efe8d6 0%, #e4dbc4 45%, #d3c8ad 100%)";

function useSession<T extends string>(key: string, init: T, allowed: readonly T[]) {
    const [v, setV] = useState<T>(init);
    useEffect(() => {
        try {
            const s = sessionStorage.getItem(key) as T | null;
            if (s && allowed.includes(s)) setV(s);
        } catch {
            /* ignore */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const set = (next: T) => {
        setV(next);
        try {
            sessionStorage.setItem(key, next);
        } catch {
            /* ignore */
        }
    };
    return [v, set] as const;
}

export function RetroComputer({ pdf, fallback, download }: { pdf: string; fallback: string; download: string }) {
    const reduce = useReducedMotion();
    const [tube, setTube] = useSession<Tube>("resume-tube", "soft", TUBES);
    const [phosphor, setPhosphor] = useSession<Phosphor>("resume-phosphor", "paper", PHOSPHORS);
    const [power, setPower] = useState(true);
    const [boot, setBoot] = useState(0); // bumped to replay the start-up
    const [booted, setBooted] = useState(false);
    const [ready, setReady] = useState(false);
    // The resume, or quit to the C:\> prompt
    const [mode, setMode] = useState<"resume" | "prompt">("resume");
    const [help, setHelp] = useState(false);
    // The drive light, busy while the machine reads from its disk
    const [disk, setDisk] = useState(false);

    // Each power-on starts the machine afresh (DosBoot runs the start-up)
    useEffect(() => {
        if (!power) return;
        setBooted(!!reduce);
        setMode("resume");
        setHelp(false);
    }, [power, boot, reduce]);

    const powerKey = () => {
        if (power) {
            playPowerOff();
            setPower(false);
        } else {
            playPowerOn();
            setPower(true);
            setBoot((b) => b + 1);
        }
    };

    // Skipping the start-up mid-read must not leave the drive light on
    useEffect(() => {
        if (booted) setDisk(false);
    }, [booted]);

    // The drive light ticks as it reads
    useEffect(() => {
        if (!disk) return;
        playDiskTick();
        const id = window.setInterval(playDiskTick, 140);
        return () => window.clearInterval(id);
    }, [disk]);

    const tubeIdx = TUBES.indexOf(tube);
    const phIdx = PHOSPHORS.indexOf(phosphor);
    const nextTube = () => setTube(TUBES[(tubeIdx + 1) % 3]);
    const nextPhosphor = () => setPhosphor(PHOSPHORS[(phIdx + 1) % 3]);
    const [zoom, setZoom] = useState(1);
    const ZOOMS = [0.8, 1, 1.25, 1.5, 2];
    const zoomBy = (d: number) => setZoom((z) => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + d))]);
    const [sections, setSections] = useState<Section[]>([]);
    const [jumpOpen, setJumpOpen] = useState(false);
    const [jump, setJump] = useState<{ label: string; n: number } | null>(null);
    const [printing, setPrinting] = useState(0);
    const [degauss, setDegauss] = useState(0);
    const [saver, setSaver] = useState(false);

    // Downloads print first, on screens wide enough to show the printer
    const PRINT_SECONDS = 2.6;
    const printStart = useRef(0);
    const downloadPdf = () => {
        const withPrinter = window.matchMedia("(min-width: 640px)").matches && !reduce;
        if (!withPrinter) {
            window.location.href = download;
            return;
        }
        if (performance.now() - printStart.current < PRINT_SECONDS * 1000 + 800) return;
        printStart.current = performance.now();
        playPrinter(8, PRINT_SECONDS / 8 - 0.09);
        setPrinting((n) => n + 1);
    };
    const openJump = () => {
        setMode("resume");
        setHelp(false);
        setJumpOpen(true);
    };
    const doDegauss = () => {
        playDegauss();
        setDegauss((n) => n + 1);
    };

    // The screensaver: a minute with no sign of the visitor, and the stars come out
    const lastActive = useRef(Date.now());
    const saverGrace = useRef(0);
    useEffect(() => {
        if (reduce) return;
        const wake = () => {
            if (performance.now() < saverGrace.current) return;
            lastActive.current = Date.now();
            setSaver(false);
        };
        const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
        events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
        const id = window.setInterval(() => {
            if (Date.now() - lastActive.current > 60000) setSaver(true);
        }, 3000);
        return () => {
            events.forEach((e) => window.removeEventListener(e, wake));
            window.clearInterval(id);
        };
    }, [reduce]);
    const startSaver = () => {
        saverGrace.current = performance.now() + 900;
        setSaver(true);
    };

    const fkeys: FKey[] =
        mode === "resume"
            ? [
                  { n: "1", label: "Help", key: "F1", run: () => setHelp((h) => !h) },
                  { n: "2", label: "Print", key: "F2", run: downloadPdf },
                  { n: "3", label: "Phosphor", short: "Phos", key: "F3", run: nextPhosphor },
                  { n: "4", label: "Tube", key: "F4", run: nextTube },
                  // F5 is the browser's reload, so Jump is on 5 only
                  { n: "5", label: "Jump", key: "", run: openJump },
                  { n: "10", label: "Quit", key: "F10", run: () => setMode("prompt") },
              ]
            : [
                  { n: "1", label: "Help", key: "F1", run: () => setHelp((h) => !h) },
                  { n: "2", label: "Print", key: "F2", run: downloadPdf },
                  { n: "3", label: "Phosphor", short: "Phos", key: "F3", run: nextPhosphor },
                  { n: "4", label: "Tube", key: "F4", run: nextTube },
                  { n: "5", label: "Jump", key: "", run: openJump },
                  { n: "10", label: "Resume", short: "Back", key: "F10", run: () => setMode("resume") },
              ];

    // The function keys on the visitor's own keyboard (F5 and F11 are left to
    // the browser). A Mac's F-keys are brightness and volume unless fn is held,
    // so on the resume the plain number keys shown on the bar work too: 1 to 4,
    // and 0 for 10. At the prompt the numbers are for typing
    useEffect(() => {
        if (!power || !booted) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
            if (jumpOpen || saver) return;
            const digit = !typing && mode === "resume" && /^[0-5]$/.test(e.key) ? (e.key === "0" ? "10" : e.key) : null;
            const hit = fkeys.find((k) => (k.key && k.key === e.key) || (digit !== null && k.n === digit));
            if (!typing && mode === "resume" && (e.key === "+" || e.key === "=" || e.key === "-")) {
                e.preventDefault();
                zoomBy(e.key === "-" ? -1 : 1);
            } else if (hit) {
                e.preventDefault();
                hit.run();
            } else if (e.key === "Escape" && help) setHelp(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });
    const c = dosColours(phosphor);
    const glow = phosphor === "green" ? "74,222,128" : phosphor === "amber" ? "251,191,36" : "186,230,253";

    return (
        <motion.div
            className="relative mx-auto flex w-full max-w-[920px] flex-col items-center"
            // Adrift in zero-g, very gently
            animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, 0.35, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* ---- the monitor ---- */}
            <div
                className="relative w-full rounded-[18px] p-2.5 sm:rounded-[26px] sm:p-5"
                style={{ background: BEIGE, boxShadow: "0 40px 90px -30px rgba(0,0,0,0.95), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -3px 0 rgba(0,0,0,0.12)" }}
            >
                {/* the recessed frame round the tube */}
                <div
                    className="rounded-[14px] p-2 sm:rounded-[20px] sm:p-4"
                    style={{ background: "linear-gradient(180deg, #d8ceb4, #e9e1cc 30%, #e2d9c1)", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.18), inset 0 -2px 4px rgba(255,255,255,0.6)" }}
                >
                    {/* the dark surround and the bulging glass */}
                    <div className="rounded-[18px] bg-[#222] p-2 sm:rounded-[30px] sm:p-3.5" style={{ boxShadow: "inset 0 0 0 2px #111, 0 1px 0 rgba(255,255,255,0.5)" }}>
                        <div
                            className="relative h-[64dvh] overflow-hidden rounded-[14px] sm:h-[min(62dvh,640px)] sm:rounded-[26px]"
                            style={{
                                background: phosphor === "paper" ? "#0b0d10" : "#030503",
                                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.9)",
                            }}
                        >
                            {/* Everything on the tube, which a degauss shakes and tints */}
                            <motion.div
                                key={degauss}
                                className="absolute inset-0"
                                animate={
                                    degauss && !reduce
                                        ? {
                                              skewX: [0, 3, -2.5, 1.6, -0.8, 0],
                                              scale: [1, 1.025, 0.99, 1.012, 1],
                                              filter: ["hue-rotate(0deg) saturate(1)", "hue-rotate(110deg) saturate(2.2)", "hue-rotate(-70deg) saturate(1.8)", "hue-rotate(35deg) saturate(1.3)", "hue-rotate(0deg) saturate(1)"],
                                          }
                                        : undefined
                                }
                                transition={{ duration: 1.1, ease: "easeOut" }}
                            >
                            {/* The resume, above the function-key bar */}
                            {power && (
                                <div className="absolute inset-x-0 top-0 bottom-[26px]" style={{ visibility: mode === "resume" ? "visible" : "hidden" }}>
                                    <PdfScreen
                                        src={pdf}
                                        fallback={fallback}
                                        phosphor={phosphor}
                                        tube={tube}
                                        zoom={zoom}
                                        jump={jump}
                                        onSections={setSections}
                                        onReady={() => setReady(true)}
                                    />
                                    {/* zoom */}
                                    {booted && (
                                        <div className="absolute right-3 top-3 z-10 flex items-center overflow-hidden rounded-full border border-white/15 bg-black/70 font-mono text-[10px] text-neutral-300 opacity-60 backdrop-blur-sm transition-opacity hover:opacity-100">
                                            <button type="button" onClick={() => zoomBy(-1)} disabled={zoom === ZOOMS[0]} aria-label="Zoom out" className="px-2.5 py-1 hover:bg-white/10 disabled:opacity-30">
                                                −
                                            </button>
                                            <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                                            <button type="button" onClick={() => zoomBy(1)} disabled={zoom === ZOOMS[ZOOMS.length - 1]} aria-label="Zoom in" className="px-2.5 py-1 hover:bg-white/10 disabled:opacity-30">
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {power && booted && mode === "prompt" && (
                                <div className="absolute inset-x-0 top-0 bottom-[26px]">
                                    <DosPrompt
                                        phosphor={phosphor}
                                        onResume={() => setMode("resume")}
                                        onDownload={downloadPdf}
                                        onDisk={setDisk}
                                        onDegauss={doDegauss}
                                        onStarfield={startSaver}
                                        onJump={openJump}
                                    />
                                </div>
                            )}
                            {power && booted && <FKeyBar keys={fkeys} phosphor={phosphor} />}
                            <AnimatePresence>{power && booted && help && <HelpBox phosphor={phosphor} atPrompt={mode === "prompt"} onClose={() => setHelp(false)} />}</AnimatePresence>
                            <AnimatePresence>
                                {power && booted && jumpOpen && (
                                    <JumpMenu
                                        sections={sections}
                                        phosphor={phosphor}
                                        onClose={() => setJumpOpen(false)}
                                        onPick={(sec) => {
                                            setJumpOpen(false);
                                            setJump((j) => ({ label: sec.label, n: (j?.n ?? 0) + 1 }));
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                            {/* the degauss's colour wash */}
                            {degauss > 0 && !reduce && (
                                <motion.div
                                    key={`wash-${degauss}`}
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 z-20 mix-blend-color"
                                    style={{ background: "conic-gradient(from 0deg, #ff0080, #ffcc00, #00ff99, #00aaff, #aa00ff, #ff0080)" }}
                                    initial={{ opacity: 0.55, rotate: 0, scale: 1.4 }}
                                    animate={{ opacity: 0, rotate: 140 }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                />
                            )}
                            </motion.div>
                            <AnimatePresence>{power && booted && saver && <Starfield phosphor={phosphor} />}</AnimatePresence>

                            {/* ---- the tube's effects ---- */}
                            <AnimatePresence>
                                {power && tube !== "off" && (
                                    <motion.div
                                        key={tube}
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {/* scanlines: the edges only when soft, all over when full */}
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,${tube === "full" ? 0.22 : 0.16}) 0px, rgba(0,0,0,${tube === "full" ? 0.22 : 0.16}) 1px, transparent 1px, transparent 3px)`,
                                                ...(tube === "soft"
                                                    ? {
                                                          maskImage: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 60%, black 100%)",
                                                          WebkitMaskImage: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 60%, black 100%)",
                                                      }
                                                    : {}),
                                            }}
                                        />
                                        {/* the curve of the glass */}
                                        <div
                                            className="absolute inset-0"
                                            style={{ background: `radial-gradient(ellipse 90% 85% at 50% 50%, transparent ${tube === "full" ? 50 : 65}%, rgba(0,0,0,${tube === "full" ? 0.75 : 0.5}) 100%)` }}
                                        />
                                        {tube === "full" && (
                                            <>
                                                {/* a bar rolling down the screen */}
                                                {!reduce && (
                                                    <motion.div
                                                        className="absolute inset-x-0 h-24"
                                                        style={{ background: `linear-gradient(180deg, transparent, rgba(${glow},0.07), transparent)` }}
                                                        animate={{ top: ["-15%", "115%"] }}
                                                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                                    />
                                                )}
                                                {/* flicker */}
                                                {!reduce && (
                                                    <motion.div
                                                        className="absolute inset-0 bg-black"
                                                        animate={{ opacity: [0, 0.05, 0, 0.03, 0, 0, 0.06, 0] }}
                                                        transition={{ duration: 3.2, repeat: Infinity }}
                                                    />
                                                )}
                                                {/* phosphor haze */}
                                                <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 70px rgba(${glow},0.18)` }} />
                                            </>
                                        )}
                                        {/* glare */}
                                        <div className="absolute inset-0" style={{ background: "linear-gradient(130deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 20%, transparent 32%)" }} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ---- the start-up ---- */}
                            <AnimatePresence>
                                {power && !booted && (
                                    <motion.button
                                        type="button"
                                        aria-label="Skip the start-up"
                                        onClick={() => setBooted(true)}
                                        className="absolute inset-0 z-10 flex cursor-pointer flex-col items-start justify-start px-5 pt-5 text-left sm:px-10 sm:pt-8"
                                        style={{ background: c.bg }}
                                        exit={{ opacity: 0, transition: { duration: 0.4 } }}
                                    >
                                        <motion.span
                                            aria-hidden
                                            className="pointer-events-none absolute inset-x-0 top-1/2 h-full -translate-y-1/2 bg-emerald-50"
                                            initial={{ scaleY: 0.004, scaleX: 0.15, opacity: 1 }}
                                            animate={{ scaleY: [0.004, 0.004, 1], scaleX: [0.15, 1, 1], opacity: [1, 1, 0] }}
                                            transition={{ duration: 0.55, times: [0, 0.45, 1], ease: "easeOut" }}
                                        />
                                        <DosBoot key={boot} phosphor={phosphor} onDone={() => setBooted(true)} onDisk={setDisk} />
                                        <span className="absolute bottom-4 right-5 font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: c.dim }}>
                                            tap to skip
                                        </span>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* ---- switched off: the dot that lingers on an old tube ---- */}
                            <AnimatePresence>
                                {!power && (
                                    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#050605]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <motion.span
                                            className="block h-1 w-1 rounded-full bg-white"
                                            initial={{ scale: 60, opacity: 1 }}
                                            animate={{ scale: [60, 1, 1], opacity: [1, 1, 0] }}
                                            transition={{ duration: 1.6, times: [0, 0.25, 1] }}
                                            style={{ boxShadow: "0 0 12px 4px rgba(255,255,255,0.8)" }}
                                        />
                                        <p className="absolute bottom-6 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">press the yellow button</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* ---- the chin: grille, sticker, dials, power light ---- */}
                <div className="mt-2.5 flex items-center gap-3 sm:mt-4 sm:gap-5">
                    <div
                        aria-hidden
                        className="hidden h-12 flex-1 rounded-md sm:block"
                        style={{
                            background: "#cfc5aa",
                            backgroundImage: "radial-gradient(circle, rgba(60,50,35,0.45) 1px, transparent 1.3px)",
                            backgroundSize: "5px 5px",
                            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.5)",
                        }}
                    />
                    {/* the mission sticker */}
                    <div className="hidden shrink-0 items-center gap-2 rounded-md bg-[#1b2440] px-2 py-1 shadow-sm sm:flex sm:px-2.5 sm:py-1.5" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden>
                            <circle cx="12" cy="12" r="10" fill="#0b1226" stroke="#fbbf24" strokeWidth="1.2" />
                            <ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#7dd3fc" strokeWidth="0.9" transform="rotate(-20 12 12)" />
                            <path d="M12 6.5l1.2 3.3 3.3 1.2-3.3 1.2L12 15.5l-1.2-3.3-3.3-1.2 3.3-1.2z" fill="#fde68a" />
                        </svg>
                        <span className="font-mono text-[8px] font-bold uppercase leading-tight tracking-[0.18em] text-amber-200 sm:text-[9px]">
                            miit-1<span className="block text-[7px] font-medium text-sky-300/80 sm:text-[8px]">crew terminal</span>
                        </span>
                    </div>
                    {/* On a phone the controls share the whole width; the sticker and grille make room */}
                    <div className="flex w-full items-center justify-between gap-1 sm:ml-0 sm:w-auto sm:justify-start sm:gap-5">
                        <Dial label="tube" value={tube} angle={ANGLE[tubeIdx]} onTurn={() => setTube(TUBES[(tubeIdx + 1) % 3])} />
                        <Dial label="phosphor" value={phosphor} angle={ANGLE[phIdx]} onTurn={() => setPhosphor(PHOSPHORS[(phIdx + 1) % 3])} />
                        {/* degauss: a small grey push-button, as on the real thing */}
                        <button type="button" onClick={doDegauss} disabled={!power} aria-label="Degauss the tube" className="group flex flex-col items-center gap-1 focus-visible:outline-none disabled:opacity-50">
                            <span
                                className="block h-5 w-5 rounded-full transition-transform duration-75 group-active:translate-y-px group-focus-visible:ring-2 group-focus-visible:ring-emerald-500/70 sm:h-6 sm:w-6"
                                style={{ background: "radial-gradient(circle at 35% 30%, #d6d3d1, #78716c 75%)", boxShadow: "0 2px 0 #57534e, 0 0 0 2px #b8ad90, inset 0 1px 0 rgba(255,255,255,0.7)" }}
                            />
                            <span className="font-mono text-[7px] uppercase leading-none tracking-[0.15em] text-stone-500 sm:text-[8px]">degauss</span>
                        </button>
                        {/* The power switch: a yellow push-button, with its light */}
                        <button
                            type="button"
                            onClick={powerKey}
                            aria-label={power ? "Switch the monitor off" : "Switch the monitor on"}
                            aria-pressed={power}
                            className="group flex flex-col items-center gap-1 focus-visible:outline-none"
                        >
                            <span className="flex items-center gap-1.5">
                                {/* the drive light, flickering while it reads */}
                                <span
                                    title="drive"
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: power && disk ? "#fb923c" : "#57534e", boxShadow: power && disk ? "0 0 6px #fb923c" : "none" }}
                                />
                                <span
                                    className="h-2 w-2 rounded-full transition-colors"
                                    style={{
                                        background: !power ? "#57534e" : ready && booted ? "#4ade80" : "#fbbf24",
                                        boxShadow: !power ? "none" : ready && booted ? "0 0 8px #4ade80" : "0 0 8px #fbbf24",
                                    }}
                                />
                                <span
                                    className="block h-7 w-7 rounded-md transition-transform duration-75 group-active:translate-y-px group-focus-visible:ring-2 group-focus-visible:ring-emerald-500/70 sm:h-8 sm:w-8"
                                    style={{
                                        background: "linear-gradient(180deg, #fcd34d, #f59e0b)",
                                        boxShadow: power
                                            ? "inset 0 1px 2px rgba(0,0,0,0.35), 0 0 0 2px #b8ad90"
                                            : "0 3px 0 #b45309, 0 0 0 2px #b8ad90, inset 0 1px 0 rgba(255,255,255,0.6)",
                                        transform: power ? "translateY(2px)" : undefined,
                                    }}
                                />
                            </span>
                            <span className="font-mono text-[7px] uppercase leading-none tracking-[0.15em] text-stone-500 sm:text-[8px]">
                                power <span className="text-stone-700">{power ? "on" : "off"}</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* vents along the bottom */}
                <div
                    aria-hidden
                    className="mx-auto mt-2.5 hidden h-2.5 w-[88%] rounded-sm sm:block"
                    style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(70,60,40,0.4) 0 3px, transparent 3px 11px)" }}
                />
            </div>

            {/* ---- the stand, with the printer beside it ---- */}
            <div className="relative hidden w-full flex-col items-center sm:flex">
                <div aria-hidden className="relative h-8 w-[34%]" style={{ background: "linear-gradient(180deg, #c7bca0, #dcd2b8)", clipPath: "polygon(12% 0, 88% 0, 100% 100%, 0 100%)" }} />
                <div aria-hidden className="h-3 w-[46%] rounded-b-lg" style={{ background: "linear-gradient(180deg, #e2d9c1, #cbbf9f)", boxShadow: "0 10px 20px -8px rgba(0,0,0,0.7)" }} />
                <div className="absolute bottom-[-6px] left-[5%] z-10">
                    <Printer
                        printing={printing}
                        seconds={PRINT_SECONDS}
                        onDone={() => {
                            window.location.href = download;
                        }}
                    />
                </div>
            </div>


        </motion.div>
    );
}

// A dial that turns to three positions, labelled with where it is
function Dial({ label, value, angle, onTurn }: { label: string; value: string; angle: number; onTurn: () => void }) {
    return (
        <button type="button" onClick={onTurn} className="group flex flex-col items-center gap-1 focus-visible:outline-none" aria-label={`${label}: ${value}. Turn it`}>
            <span className="relative block h-9 w-9 sm:h-11 sm:w-11">
                {/* ticks for the three positions */}
                {ANGLE.map((a) => (
                    <span key={a} aria-hidden className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%,-50%) rotate(${a}deg)` }}>
                        <span className="absolute left-0 top-[-3px] h-1.5 w-px bg-stone-500/70" />
                    </span>
                ))}
                <motion.span
                    className="absolute inset-1 rounded-full group-focus-visible:ring-2 group-focus-visible:ring-emerald-500/70"
                    style={{
                        background: "radial-gradient(circle at 35% 30%, #57534e, #1c1917 70%)",
                        boxShadow: "0 2px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 2px rgba(0,0,0,0.25)",
                    }}
                    animate={{ rotate: angle }}
                    transition={{ type: "spring", stiffness: 280, damping: 16 }}
                >
                    <span className="absolute left-1/2 top-1 h-3 w-[3px] -translate-x-1/2 rounded-full bg-amber-200" />
                </motion.span>
            </span>
            <span className="font-mono text-[7px] uppercase leading-none tracking-[0.15em] text-stone-500 sm:text-[8px]">
                {label} <span className="text-stone-700">{value}</span>
            </span>
        </button>
    );
}
