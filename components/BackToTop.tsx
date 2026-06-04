"use client";
import { useState, useEffect } from "react";
import {
    motion,
    AnimatePresence,
    useScroll,
    useSpring,
    useTransform,
    useReducedMotion,
    useAnimationControls,
} from "framer-motion";
import { RocketIcon } from "@/components/ui/rocket";

// Lazily-created shared AudioContext for the launch whoosh
let audioCtx: AudioContext | null = null;
function playWhoosh() {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const ctx = audioCtx;
        const now = ctx.currentTime;

        // Descending tone
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(560, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.connect(oscGain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);

        // Filtered noise sweep for the "whoosh" texture
        const size = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.setValueAtTime(1400, now);
        bp.frequency.exponentialRampToValueAtTime(280, now + 0.5);
        bp.Q.value = 0.7;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.linearRampToValueAtTime(0.07, now + 0.06);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        noise.connect(bp).connect(noiseGain).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.5);
    } catch {
        /* audio not available - ignore */
    }
}

const RING_R = 24;
const RING_C = 2 * Math.PI * RING_R;

export const BackToTop = () => {
    const reduce = useReducedMotion();
    const [isVisible, setIsVisible] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [launchKey, setLaunchKey] = useState(0);
    const controls = useAnimationControls();

    // Scroll-progress ring around the button
    const { scrollYProgress } = useScroll();
    const ringProgress = useSpring(scrollYProgress, { stiffness: 90, damping: 25, restDelta: 0.001 });
    const dashOffset = useTransform(ringProgress, (v) => RING_C * (1 - v));

    useEffect(() => {
        const onScroll = () => setIsVisible(window.scrollY > 500);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToTop = () => {
        if (isLaunching) return;
        setIsLaunching(true);
        setLaunchKey((k) => k + 1);

        if (reduce) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            playWhoosh();
            setIsLaunching(false);
            return;
        }

        // Animate (fire-and-forget): rumble -> blast off. Scrolling to the top
        // drops scrollY below 500, which unmounts the rocket mid-animation, so we
        // must NOT rely on these awaits to reset state.
        (async () => {
            try {
                await controls.start({
                    x: [0, -1.5, 1.5, -1.5, 1.5, -1, 1, 0],
                    transition: { duration: 0.3, ease: "linear" },
                });
                playWhoosh();
                window.scrollTo({ top: 0, behavior: "smooth" });
                await controls.start({ y: -90, opacity: 0, transition: { duration: 0.5, ease: "easeIn" } });
            } catch {
                /* element unmounted mid-animation - ignore */
            }
        })();

        // Guaranteed reset + restore on the (always-mounted) parent, so the button
        // stays usable even though the rocket unmounted during launch.
        window.setTimeout(() => {
            setIsLaunching(false);
            controls.set({ y: 0, opacity: 1 });
        }, 1300);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-8 right-8 z-[5000]"
                >
                    {/* Hover tooltip */}
                    <motion.span
                        initial={false}
                        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 6 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs text-neutral-200 backdrop-blur-sm"
                    >
                        Back to top
                    </motion.span>

                    <button
                        onClick={scrollToTop}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        aria-label="Back to top"
                    >
                        {/* Hover pulse ring */}
                        {!reduce && (
                            <motion.span
                                className="absolute inset-0 rounded-full border border-teal-400/50"
                                animate={isHovered ? { scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] } : { scale: 1, opacity: 0 }}
                                transition={{ duration: 1.4, repeat: isHovered ? Infinity : 0, ease: "easeInOut" }}
                            />
                        )}

                        {/* Scroll-progress ring */}
                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56" fill="none">
                            <circle cx="28" cy="28" r={RING_R} stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                            <motion.circle
                                cx="28"
                                cy="28"
                                r={RING_R}
                                stroke="#2dd4bf"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={RING_C}
                                style={{ strokeDashoffset: dashOffset, filter: "drop-shadow(0 0 3px rgba(45,212,191,0.7))" }}
                            />
                        </svg>

                        {/* Rocket + exhaust */}
                        <div className="relative h-7 w-7 overflow-visible">
                            {/* idle bob (outer) */}
                            <motion.div
                                className="h-full w-full"
                                animate={reduce || isLaunching ? { y: 0 } : { y: [0, -3, 0] }}
                                transition={{ duration: 3, repeat: reduce || isLaunching ? 0 : Infinity, ease: "easeInOut" }}
                            >
                                {/* rumble / launch / re-enter (inner) */}
                                <motion.div className="h-full w-full" initial={{ y: 0, opacity: 1 }} animate={controls}>
                                    <RocketIcon className="h-full w-full" isIgnited={isHovered || isLaunching} />
                                </motion.div>
                            </motion.div>

                            {/* Launch exhaust: smoke puff + sparks (sync to blast-off via delay) */}
                            {!reduce && isLaunching && (
                                <div key={launchKey} className="pointer-events-none absolute inset-0">
                                    <motion.div
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white/30 blur-[3px]"
                                        style={{ width: 16, height: 16 }}
                                        initial={{ scale: 0.4, opacity: 0 }}
                                        animate={{ scale: 2.2, opacity: [0, 0.5, 0] }}
                                        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                                    />
                                    {[-10, -6, -2, 3, 7, 11].map((dx, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute bottom-1 left-1/2 h-1 w-1 rounded-full bg-amber-300"
                                            style={{ boxShadow: "0 0 4px rgba(251,191,36,0.9)" }}
                                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                            animate={{ x: dx, y: 18 + i * 2, opacity: 0, scale: 0.3 }}
                                            transition={{ duration: 0.45, delay: 0.3 + i * 0.02, ease: "easeIn" }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
