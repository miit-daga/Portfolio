"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { m, AnimatePresence, useReducedMotion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

export const FRAGMENT_IDS = ["workex", "education", "skills", "projects", "publications"] as const;
const TOTAL = FRAGMENT_IDS.length;
export const FRAGMENTS_STORAGE_KEY = "cosmic-fragments";

// Lazily-created shared AudioContext for the pickup chime
let audioCtx: AudioContext | null = null;
export function playPickup() {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const ctx = audioCtx;
        const now = ctx.currentTime;
        // Two-note ascending sparkle
        [880, 1320].forEach((freq, i) => {
            const t = now + i * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    } catch {
        /* audio not available - ignore */
    }
}

type CollectiblesCtx = {
    found: Set<string>;
    collect: (id: string) => void;
    count: number;
    total: number;
    complete: boolean;
};

const Ctx = createContext<CollectiblesCtx | null>(null);

export function useCollectibles() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useCollectibles must be used within a CollectiblesProvider");
    return ctx;
}

export function CollectiblesProvider({ children }: { children: ReactNode }) {
    const [found, setFound] = useState<Set<string>>(new Set());

    // Hydrate progress after mount (keeps SSR and first client render identical)
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FRAGMENTS_STORAGE_KEY);
            if (raw) setFound(new Set(JSON.parse(raw) as string[]));
        } catch {
            /* ignore */
        }
    }, []);

    // The fragment from the terminal desk's drawer (app/terminal/desk.tsx):
    // taken there, it counts here, once a session, as the next one not yet
    // found. Heard live too, when the desk is open in another tab
    useEffect(() => {
        const redeem = () => {
            try {
                if (localStorage.getItem("desk-fragment") !== "1" || sessionStorage.getItem("desk-fragment-counted")) return;
                sessionStorage.setItem("desk-fragment-counted", "1");
                setFound((prev) => {
                    const id = FRAGMENT_IDS.find((f) => !prev.has(f));
                    if (!id) return prev;
                    const next = new Set(prev);
                    next.add(id);
                    sessionStorage.setItem(FRAGMENTS_STORAGE_KEY, JSON.stringify([...next]));
                    return next;
                });
            } catch {
                /* ignore */
            }
        };
        // after the hydrate above has read the session's progress
        const id = window.setTimeout(redeem, 0);
        const onStorage = (e: StorageEvent) => e.key === "desk-fragment" && redeem();
        window.addEventListener("storage", onStorage);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const collect = useCallback((id: string) => {
        setFound((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            try {
                sessionStorage.setItem(FRAGMENTS_STORAGE_KEY, JSON.stringify([...next]));
            } catch {
                /* ignore */
            }
            return next;
        });
    }, []);

    const value = useMemo<CollectiblesCtx>(
        () => ({ found, collect, count: found.size, total: TOTAL, complete: found.size >= TOTAL }),
        [found, collect]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// A single hidden fragment. Drop inside any `relative` container with a position className.
export function Fragment({ id, className }: { id: string; className?: string }) {
    const { found, collect } = useCollectibles();
    const reduce = useReducedMotion();
    const [picked, setPicked] = useState(false);
    // its halo and bob only run while it is on screen or about to be
    const ref = useRef<HTMLButtonElement>(null);
    const live = useInView(ref, { margin: "200px" });

    if (found.has(id)) return null;

    const onClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (picked) return;
        setPicked(true);
        playPickup();
        window.setTimeout(() => collect(id), 360);
    };

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-label="Collect cosmic fragment"
            className={cn("group absolute z-30 flex h-9 w-9 items-center justify-center", className)}
        >
            {/* Pulsing halo */}
            {!reduce && !picked && live && (
                <m.span
                    className="absolute h-7 w-7 rounded-full bg-teal-400/20 blur-md"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
            {/* The shard */}
            <m.span
                className="block h-3.5 w-3.5 rotate-45 rounded-[3px] bg-gradient-to-br from-teal-100 to-teal-500 shadow-[0_0_12px_rgba(45,212,191,0.85)] transition-transform group-hover:scale-125"
                animate={picked ? { scale: [1, 2.2], opacity: [1, 0], rotate: 225 } : reduce ? undefined : live ? { y: [0, -3, 0] } : { y: 0 }}
                transition={picked ? { duration: 0.36, ease: "easeOut" } : live ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            />
            {/* Burst ring on pickup */}
            {picked && (
                <m.span
                    className="absolute h-3.5 w-3.5 rounded-full border border-teal-300"
                    initial={{ scale: 1, opacity: 0.9 }}
                    animate={{ scale: 4, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                />
            )}
        </button>
    );
}

// Fixed badge + reward modal. Render once, outside any transformed container.
export function CollectibleHUD({ isImploding = false, onCosmicReset }: { isImploding?: boolean; onCosmicReset?: () => void }) {
    const { count, total, complete } = useCollectibles();
    const [showReward, setShowReward] = useState(false);

    // Show the reward once on completion, and immediately clear saved progress so
    // the hunt starts fresh on the next reload (no re-popup every reload).
    useEffect(() => {
        if (!complete) return;
        setShowReward(true);
        try {
            sessionStorage.removeItem(FRAGMENTS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    }, [complete]);

    const dismiss = () => setShowReward(false);

    return (
        <>
            <AnimatePresence>
                {count > 0 && !isImploding && (
                    <m.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="fixed bottom-8 left-8 z-[5000] flex items-center gap-2 rounded-full border border-teal-500/30 bg-black/70 px-3 py-1.5 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md"
                    >
                        <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-gradient-to-br from-teal-200 to-teal-500 shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
                        <span className="font-mono text-xs text-teal-200">
                            {count} / {total}
                        </span>
                    </m.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showReward && !isImploding && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99999] flex items-center justify-center px-4"
                    >
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismiss} />
                        <m.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="relative z-10 w-full max-w-md rounded-2xl border border-teal-500/30 bg-neutral-950/90 p-8 text-center shadow-[0_0_40px_rgba(45,212,191,0.25)]"
                        >
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/15">
                                <span className="h-6 w-6 rotate-45 rounded bg-gradient-to-br from-teal-200 to-teal-500 shadow-[0_0_16px_rgba(45,212,191,0.9)]" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Transmission Decoded</h3>
                            <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                                You tracked down all {total} cosmic fragments scattered across the void. That kind of curiosity is exactly what I look for. Consider this the secret handshake.
                            </p>
                            {/* Laptop and up: discover the Konami code yourself */}
                            <p className="mt-3 hidden font-mono text-xs text-teal-300/60 lg:block">psst... enter the Konami code: ↑ ↑ ↓ ↓ ← → ← → B A</p>
                            <div className="mt-6 flex flex-col items-center gap-2">
                                {/* Below laptop: tappable Big Crunch (no keyboard for the Konami code) */}
                                {onCosmicReset && (
                                    <button
                                        onClick={() => { setShowReward(false); onCosmicReset(); }}
                                        className="w-full rounded-full border border-teal-500/40 bg-teal-500/15 px-5 py-2.5 text-sm font-medium text-teal-200 transition-colors hover:bg-teal-500/25 lg:hidden"
                                    >
                                        Initiate the Big Crunch
                                    </button>
                                )}
                                <button onClick={dismiss} className="text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-200">
                                    Nice.
                                </button>
                            </div>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Hand the visitor one of the fragments they have not found yet, flying it
// from a point on screen to the fragment counter. Returns false when there is
// nothing left to give. Render `node` somewhere in the tree.
export function useFragmentGift() {
    const { found, collect } = useCollectibles();
    const [flight, setFlight] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; key: number } | null>(null);

    const give = useCallback(
        (from: { x: number; y: number }) => {
            const id = FRAGMENT_IDS.find((f) => !found.has(f));
            if (!id) return false;
            setFlight({ from, to: { x: 48, y: window.innerHeight - 44 }, key: Date.now() });
            window.setTimeout(() => {
                playPickup();
                collect(id);
                setFlight(null);
            }, 950);
            return true;
        },
        [found, collect],
    );

    const node = (
        <AnimatePresence>
            {flight && (
                <m.span
                    key={flight.key}
                    aria-hidden
                    className="pointer-events-none fixed left-0 top-0 z-[5001] block h-3.5 w-3.5 rounded-[3px] bg-gradient-to-br from-teal-100 to-teal-500 shadow-[0_0_14px_rgba(45,212,191,0.9)]"
                    initial={{ x: flight.from.x, y: flight.from.y, scale: 0.4, opacity: 0, rotate: 45 }}
                    animate={{
                        x: [flight.from.x, (flight.from.x + flight.to.x) / 2, flight.to.x],
                        y: [flight.from.y, Math.min(flight.from.y, flight.to.y) - 160, flight.to.y],
                        scale: [0.4, 1.5, 0.8],
                        opacity: [0, 1, 1],
                        rotate: [45, 225, 405],
                    }}
                    exit={{ scale: 2.2, opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.95, ease: "easeInOut" }}
                />
            )}
        </AnimatePresence>
    );

    return { give, node };
}
