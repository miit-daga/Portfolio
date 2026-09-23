"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    motion,
    AnimatePresence,
    useScroll,
    useSpring,
    useTransform,
    useReducedMotion,
    useAnimationControls,
    useMotionValue,
} from "framer-motion";
import { RocketIcon } from "@/components/ui/rocket";
import { Rider, RIDER_SPOT, type RiderKind } from "@/components/ui/rocket-rider";
import { DOCK_ROCKET, THRESHOLD } from "@/components/ui/rocket-dock";

// The back-to-top rocket.
//
//   Click: you ride it. The rocket climbs off its button to mid-screen, the
//   page races up beneath it in a warp, and at the top it flies over and lands
//   on its pad in the hero (rocket-dock.tsx).
//   Drag: a throttle. Pull up or down to fly through the page, faster the
//   further you pull; it turns nose-down to go down. Let go to stop.
//   Docking: while you are near the top it is parked on the pad, not hidden;
//   scroll down and it takes off from there as this button flies in.
//   Hitchhikers: about one appearance in three, the little alien or a pocket
//   astronaut is clinging to it, rides the launch, and gets off at the pad.
//   Preview one with ?rider=alien or ?rider=astronaut.

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
        const dur = 0.9;

        const master = ctx.createGain();
        master.gain.value = 0.8;
        master.connect(ctx.destination);

        // 1. Filtered-noise "whoosh" — sweeps up on liftoff, then trails off
        const size = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 0.9;
        bp.frequency.setValueAtTime(320, now);
        bp.frequency.exponentialRampToValueAtTime(1700, now + 0.18);
        bp.frequency.exponentialRampToValueAtTime(240, now + dur);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.15, now + 0.12);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        noise.connect(bp).connect(noiseGain).connect(master);
        noise.start(now);
        noise.stop(now + dur);

        // 2. Low rumble — engine "power"; sine so it never buzzes
        const rumble = ctx.createOscillator();
        rumble.type = "sine";
        rumble.frequency.setValueAtTime(95, now);
        rumble.frequency.exponentialRampToValueAtTime(45, now + dur);
        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.0001, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
        rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.95);
        rumble.connect(rumbleGain).connect(master);
        rumble.start(now);
        rumble.stop(now + dur);

        // 3. Soft rising "lift" tone — triangle, subtle sense of ascent
        const lift = ctx.createOscillator();
        lift.type = "triangle";
        lift.frequency.setValueAtTime(180, now);
        lift.frequency.exponentialRampToValueAtTime(520, now + 0.5);
        const liftGain = ctx.createGain();
        liftGain.gain.setValueAtTime(0.0001, now);
        liftGain.gain.exponentialRampToValueAtTime(0.04, now + 0.15);
        liftGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        lift.connect(liftGain).connect(master);
        lift.start(now);
        lift.stop(now + 0.6);
    } catch {
        /* audio not available - ignore */
    }
}

const RING_R = 24;
const RING_C = 2 * Math.PI * RING_R;

// Throttle: pull distance for full speed, and the dead zone before it moves
const DRAG_MAX = 44;
const DRAG_DEAD = 6;
const MAX_SPEED = 4200; // px/s

let ridesShown = 0;
function bookRider(): RiderKind | null {
    const forced = new URLSearchParams(window.location.search).get("rider");
    if (forced === "alien" || forced === "astronaut") return forced;
    ridesShown += 1;
    if (Math.random() > 0.34) return null;
    return ridesShown % 2 ? "alien" : "astronaut";
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const BackToTop = () => {
    const reduce = useReducedMotion();
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [riding, setRiding] = useState(false);
    const [rider, setRider] = useState<RiderKind | null>(null);
    const riderRef = useRef<RiderKind | null>(null);
    riderRef.current = rider;
    const rocketRef = useRef<HTMLDivElement>(null);
    const ride = useAnimationControls();
    const [rideStart, setRideStart] = useState<{ x: number; y: number } | null>(null);

    // Scroll-progress ring around the button
    const { scrollYProgress } = useScroll();
    const ringProgress = useSpring(scrollYProgress, { stiffness: 90, damping: 25, restDelta: 0.001 });
    const dashOffset = useTransform(ringProgress, (v) => RING_C * (1 - v));

    // Throttle state: how far the rocket is pulled, and which way it points
    const pull = useMotionValue(0);
    const pullSpring = useSpring(pull, { stiffness: 320, damping: 26 });
    const rocketY = useTransform(pullSpring, (v) => Math.max(-14, Math.min(14, v * 0.32)));
    const [nose, setNose] = useState<"up" | "down">("up");
    const drag = useRef<{ startY: number; active: boolean; offset: number } | null>(null);
    const suppressClick = useRef(false);

    useEffect(() => {
        const onScroll = () => setIsVisible(window.scrollY > THRESHOLD);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // One rocket: the button being out means it has left the pad, and back in
    // means it has landed there. A ride lands it itself (see launch).
    const shown = (isVisible || dragging) && !riding;
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            if (shown && !reduce) setRider(bookRider());
            return;
        }
        if (riding) return;
        if (shown) {
            if (!reduce) setRider(bookRider());
            window.dispatchEvent(new CustomEvent("rocket-depart"));
        } else {
            window.dispatchEvent(new CustomEvent("rocket-arrive", { detail: { rider: riderRef.current, landed: false } }));
            setRider(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shown]);

    // --- Click: ride it to the top -----------------------------------------
    const launch = useCallback(async () => {
        if (riding) return;
        if (reduce) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            playWhoosh();
            return;
        }
        const r = rocketRef.current?.getBoundingClientRect();
        if (!r) return;
        const start = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const passenger = riderRef.current;
        setRideStart(start);
        setRiding(true);
        await new Promise((res) => requestAnimationFrame(res));

        const vh = window.innerHeight;
        // Up and a little inward, clear of the section minimap on the right edge
        const mid = { x: Math.min(start.x - 110, window.innerWidth * 0.86), y: vh * 0.42 };
        try {
            // Ignition shudder, then up off the button to mid-screen
            await ride.start({ x: [start.x, start.x - 1.5, start.x + 1.5, start.x - 1, start.x], y: start.y, transition: { duration: 0.28 } });
            playWhoosh();
            // It grows as it climbs: this is the ride, and it is the thing to watch
            await ride.start({ x: mid.x, y: mid.y, rotate: 0, scale: 1.7, transition: { duration: 0.6, ease: [0.5, 0, 0.3, 1] } });

            // The page races up beneath it, with warp streaks
            const from = window.scrollY;
            const dur = Math.min(2.2, 0.9 + from / 6000) * 1000;
            window.dispatchEvent(new CustomEvent("warp-jump", { detail: { duration: dur } }));
            ride.start({ x: [mid.x - 1.5, mid.x + 1.5], transition: { duration: 0.09, repeat: Infinity, repeatType: "mirror" } });
            await new Promise<void>((done) => {
                const t0 = performance.now();
                const step = (now: number) => {
                    const u = Math.min(1, (now - t0) / dur);
                    window.scrollTo({ top: from * (1 - easeInOutCubic(u)), behavior: "instant" as ScrollBehavior });
                    if (u < 1) requestAnimationFrame(step);
                    else done();
                };
                requestAnimationFrame(step);
            });

            // At the top: over to the pad and down onto it
            await new Promise((res) => setTimeout(res, 60));
            const pad = document.querySelector("[data-rocket-dock]")?.getBoundingClientRect();
            if (pad) {
                const land = { x: pad.left + pad.width / 2, y: pad.top + pad.height / 2 };
                const above = { x: land.x, y: land.y - 120 };
                const lean = land.x < mid.x ? -35 : 35;
                await ride.start({
                    x: [mid.x, (mid.x + above.x) / 2, above.x, land.x],
                    y: [mid.y, Math.min(mid.y, above.y) - 40, above.y, land.y],
                    rotate: [0, lean, lean * 0.4, 0],
                    // Back to parking size as it touches down
                    scale: [1.7, 1.5, 1.15, 1],
                    transition: { duration: 1.25, times: [0, 0.4, 0.75, 1], ease: "easeInOut" },
                });
            } else {
                await ride.start({ y: -120, opacity: 0, transition: { duration: 0.5 } });
            }
        } catch {
            /* unmounted mid-flight */
        }
        window.dispatchEvent(new CustomEvent("rocket-arrive", { detail: { rider: passenger, landed: true } }));
        setRider(null);
        setRiding(false);
        setRideStart(null);
    }, [riding, reduce, ride]);

    // --- Drag: the throttle --------------------------------------------------
    useEffect(() => {
        if (!dragging) return;
        let raf = 0;
        let last = performance.now();
        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const o = drag.current?.offset ?? 0;
            const mag = Math.max(0, Math.abs(o) - DRAG_DEAD) / (DRAG_MAX - DRAG_DEAD);
            if (mag > 0) window.scrollBy({ top: Math.sign(o) * Math.pow(mag, 1.5) * MAX_SPEED * dt, behavior: "instant" as ScrollBehavior });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [dragging]);

    const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (riding || e.button !== 0) return;
        drag.current = { startY: e.clientY, active: false, offset: 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d) return;
        const dy = e.clientY - d.startY;
        if (!d.active && Math.abs(dy) > DRAG_DEAD) {
            d.active = true;
            setDragging(true);
        }
        if (!d.active) return;
        d.offset = Math.max(-DRAG_MAX, Math.min(DRAG_MAX, dy));
        pull.set(d.offset);
        setNose(d.offset > DRAG_DEAD ? "down" : "up");
    };
    const endDrag = () => {
        const d = drag.current;
        drag.current = null;
        if (d?.active) {
            // Swallow the click this drag may produce, and only that one: a
            // touch drag, or a mouse released off the button, produces none,
            // and a lingering flag would eat the visitor's next real tap
            suppressClick.current = true;
            window.setTimeout(() => (suppressClick.current = false), 60);
            setDragging(false);
            pull.set(0);
            setNose("up");
        }
    };
    const onClick = () => {
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        launch();
    };

    const thrusting = isHovered || dragging;

    return (
        <>
            <AnimatePresence>
                {shown && (
                    <motion.div
                        // Flies in from above, as if it just left the pad
                        initial={{ opacity: 0, y: reduce ? 20 : -60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="fixed bottom-8 right-8 z-[5000]"
                    >
                        {/* Hover tooltip */}
                        <motion.span
                            initial={false}
                            animate={{ opacity: isHovered && !dragging ? 1 : 0, x: isHovered ? 0 : 6 }}
                            transition={{ duration: 0.2 }}
                            className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs text-neutral-200 backdrop-blur-sm"
                        >
                            Back to top <span className="text-neutral-500">· or drag to fly</span>
                        </motion.span>

                        <button
                            onClick={onClick}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            style={{ touchAction: "none" }}
                            className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${dragging ? "cursor-grabbing" : ""}`}
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

                            {/* Rocket (+ hitchhiker), riding the throttle */}
                            <motion.div ref={rocketRef} className="relative h-7 w-7 overflow-visible" style={{ y: rocketY }}>
                                <motion.div
                                    className="h-full w-full"
                                    animate={reduce || dragging ? { y: 0 } : { y: [0, -3, 0] }}
                                    transition={{ duration: 3, repeat: reduce || dragging ? 0 : Infinity, ease: "easeInOut" }}
                                >
                                    <motion.div className="relative h-full w-full" animate={{ rotate: nose === "down" ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                                        <RocketIcon className="h-full w-full" isIgnited={thrusting} />
                                        {rider && (
                                            <div className="absolute" style={{ left: RIDER_SPOT[rider].left, top: RIDER_SPOT[rider].top, transform: `rotate(${RIDER_SPOT[rider].rotate}deg)` }}>
                                                <Rider kind={rider} />
                                            </div>
                                        )}
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The ride: the rocket itself, flying the page */}
            {riding &&
                rideStart &&
                createPortal(
                    <motion.div
                        aria-hidden
                        data-rocket-ride
                        className="pointer-events-none fixed left-0 top-0 z-[6000]"
                        style={{ width: DOCK_ROCKET.w, height: DOCK_ROCKET.h, marginLeft: -DOCK_ROCKET.w / 2, marginTop: -DOCK_ROCKET.h / 2 }}
                        initial={{ x: rideStart.x, y: rideStart.y, rotate: 0, scale: 1, opacity: 1 }}
                        animate={ride}
                    >
                        <div className="relative h-full w-full" style={{ filter: "drop-shadow(0 0 10px rgba(45,212,191,0.6))" }}>
                            <RocketIcon className="h-full w-full" isIgnited />
                            {rider && (
                                <div className="absolute" style={{ left: RIDER_SPOT[rider].left, top: RIDER_SPOT[rider].top, transform: `rotate(${RIDER_SPOT[rider].rotate}deg)` }}>
                                    <Rider kind={rider} />
                                </div>
                            )}
                        </div>
                    </motion.div>,
                    document.body,
                )}
        </>
    );
};
