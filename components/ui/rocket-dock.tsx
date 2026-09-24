"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RocketIcon } from "./rocket";
import { Rider, RIDER_SPOT, type RiderKind } from "./rocket-rider";

// Where the back-to-top rocket (BackToTop.tsx) parks while the visitor is at
// the top of the page. It is one rocket: when the corner button hides, it is
// here; when the visitor scrolls down, it takes off from here and the corner
// button flies in.
//
// Window events from BackToTop:
//   rocket-depart            take off
//   rocket-arrive {rider, landed}
//       landed: the ride flew the rocket onto the pad itself, just appear
//       otherwise: drop in from above and land
// A hitchhiker hops off once it is down: the alien thanks the pilot, the
// astronaut floats back to the hero's own astronaut, who waves.

export const THRESHOLD = 500;
export const DOCK_ROCKET = { w: 34, h: 40 };

type State = "parked" | "away" | "landing" | "takeoff";

export const RocketDock = ({ className }: { className?: string }) => {
    const reduce = useReducedMotion();
    const [state, setState] = useState<State>("parked");
    const [rider, setRider] = useState<{ kind: RiderKind; off: boolean; key: number } | null>(null);
    const timers = useRef<number[]>([]);

    useEffect(() => {
        setState(window.scrollY < THRESHOLD ? "parked" : "away");
        const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

        const dropOff = (kind: RiderKind, afterMs: number) => {
            const key = Date.now();
            setRider({ kind, off: false, key });
            later(afterMs, () => setRider((r) => (r && r.key === key ? { ...r, off: true } : r)));
            if (kind === "astronaut") later(afterMs + 700, () => window.dispatchEvent(new CustomEvent("alien-hello")));
            later(afterMs + 3200, () => setRider((r) => (r && r.key === key ? null : r)));
        };

        const onDepart = () => {
            setRider(null);
            setState((s) => (s === "away" ? s : "takeoff"));
            later(900, () => setState((s) => (s === "takeoff" ? "away" : s)));
        };
        const onArrive = (e: Event) => {
            const { rider: kind, landed } = (e as CustomEvent<{ rider: RiderKind | null; landed: boolean }>).detail ?? {};
            if (landed) {
                setState("parked");
                if (kind) dropOff(kind, 250);
                return;
            }
            setState("landing");
            later(1350, () => setState((s) => (s === "landing" ? "parked" : s)));
            if (kind) dropOff(kind, 1650);
        };
        window.addEventListener("rocket-depart", onDepart);
        window.addEventListener("rocket-arrive", onArrive);
        return () => {
            window.removeEventListener("rocket-depart", onDepart);
            window.removeEventListener("rocket-arrive", onArrive);
            timers.current.forEach(clearTimeout);
        };
    }, []);

    const flying = state === "landing" || state === "takeoff";
    const rocketAnimate =
        reduce || state === "parked"
            ? { y: 0, opacity: 1 }
            : state === "landing"
                ? { y: [-460, 0], opacity: [0, 1] }
                : state === "takeoff"
                    ? { y: [0, 4, -520], opacity: [1, 1, 0] }
                    : { y: -520, opacity: 0 };
    const rocketTransition =
        state === "landing"
            // One braking curve, fast in and easing down to touchdown. It used to
            // switch from easeIn to easeOut 60px up, and the sudden drop in
            // speed read as the rocket stalling in mid-air
            ? { y: { duration: 1.35, ease: [0.25, 0.6, 0.3, 1] as [number, number, number, number] }, opacity: { duration: 0.3 } }
            : state === "takeoff"
                ? { duration: 0.9, times: [0, 0.15, 1], ease: "easeIn" as const }
                : { duration: 0 };

    return (
        <div aria-hidden className={`pointer-events-none absolute z-[54] ${className ?? ""}`} style={{ width: 64, height: 64 }}>
            {/* The pad: a small lit platform */}
            <div
                className="absolute bottom-0 left-1/2 h-3.5 w-14 -translate-x-1/2 rounded-[50%] border border-teal-300/40"
                style={{ background: "radial-gradient(ellipse at center, rgba(15,23,42,0.95), rgba(15,23,42,0.4) 70%, transparent)", boxShadow: "0 0 14px rgba(45,212,191,0.25)" }}
            />
            {[-20, 20].map((dx) => (
                <motion.span
                    key={dx}
                    className="absolute bottom-[5px] h-1 w-1 rounded-full bg-teal-300"
                    style={{ left: `calc(50% + ${dx}px)`, boxShadow: "0 0 5px rgba(45,212,191,0.9)" }}
                    animate={reduce ? undefined : { opacity: state === "away" ? [0.2, 1, 0.2] : [0.5, 0.9, 0.5] }}
                    transition={{ duration: state === "away" ? 0.9 : 2.4, repeat: Infinity }}
                />
            ))}

            {/* The rocket's parking slot; the ride flies onto this exact spot */}
            <div
                data-rocket-dock
                className="absolute left-1/2"
                style={{ width: DOCK_ROCKET.w, height: DOCK_ROCKET.h, marginLeft: -DOCK_ROCKET.w / 2, bottom: 5 }}
            >
                <motion.div className="relative h-full w-full" initial={false} animate={rocketAnimate} transition={rocketTransition}>
                    <RocketIcon className="h-full w-full" isIgnited={flying} />
                    {rider && !rider.off && (
                        <div className="absolute" style={{ left: RIDER_SPOT[rider.kind].left, top: RIDER_SPOT[rider.kind].top, transform: `rotate(${RIDER_SPOT[rider.kind].rotate}deg)` }}>
                            <Rider kind={rider.kind} />
                        </div>
                    )}
                </motion.div>
            </div>

            {/* A hitchhiker getting off */}
            <AnimatePresence>
                {rider?.off && (
                    <motion.div
                        key={rider.key}
                        className="absolute"
                        style={{ left: "50%", bottom: 12 }}
                        initial={{ x: RIDER_SPOT[rider.kind].left - DOCK_ROCKET.w / 2, y: 0, opacity: 1 }}
                        animate={
                            rider.kind === "alien"
                                ? { x: [RIDER_SPOT.alien.left - 14, 30, 34], y: [0, -16, 0], opacity: 1 }
                                : { x: [-23, -40, -70], y: [0, -60, -140], opacity: [1, 1, 0] }
                        }
                        exit={{ opacity: 0, transition: { duration: 0.4 } }}
                        transition={{ duration: rider.kind === "alien" ? 0.6 : 2.6, ease: "easeOut" }}
                    >
                        <Rider kind={rider.kind} />
                        {/* Centred by a static wrapper: the rise animation below would
                            overwrite a centring translate on the same element */}
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2">
                            <motion.span
                                className="block whitespace-nowrap rounded-lg border border-teal-400/40 bg-black/85 px-2 py-0.5 font-mono text-[11px] sm:text-[10px] text-teal-100"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.25 }}
                            >
                                {rider.kind === "alien" ? "Thanks for the lift!" : "Wheee! Again!"}
                            </motion.span>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
