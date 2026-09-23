"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { IconSend, IconX } from "@tabler/icons-react";

// The guestbook, on the main site: every signature is a blip on the contact
// scene's radar (signal-rings.tsx). A sweep circles the ground plane and
// lights each blip as it passes; hover or tap one to read it. The "leave a
// signal" field under the scene signs it. Same guestbook as the terminal's
// `guestbook` and `sign` commands (app/api/guestbook), so both see the same
// entries.
//
//   RadarSweep       the rotating sweep, drawn inside the tilted ground plane
//   RadarBlips       the signatures, drawn flat over the plane at projected spots
//   GuestbookSignal  the field that signs it

export type Signature = { id: string; name: string; message: string; at: string };

const SWEEP_S = 6; // one turn of the sweep
const MINE_KEY = "guestbook-mine";

// ---- A small shared store, so the blips and the field agree -------------

type State = { status: "idle" | "loading" | "ready" | "off"; entries: Signature[]; total: number; fresh: string | null };
let state: State = { status: "idle", entries: [], total: 0, fresh: null };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
};

function load() {
    if (state.status !== "idle") return;
    set({ status: "loading" });
    fetch("/api/guestbook?limit=30")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: { configured?: boolean; entries?: Signature[]; total?: number }) => {
            if (!d.configured) return set({ status: "off" });
            set({ status: "ready", entries: d.entries ?? [], total: d.total ?? d.entries?.length ?? 0 });
        })
        .catch(() => set({ status: "off" }));
}

const SERVER_STATE = state;
function useGuestbook() {
    const s = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
    useEffect(load, []);
    return s;
}

const readMine = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(MINE_KEY) || "[]");
    } catch {
        return [];
    }
};

// ---- Placement -------------------------------------------------------------

function hash(s: string, salt: number) {
    let h = 2166136261 ^ salt;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0) / 4294967296;
}

type Project = (r: number, theta: number) => { x: number; y: number; scale: number };
type Placed = Signature & { theta: number; x: number; y: number; scale: number };

// Each signature gets a stable spot from its id, nudged round the ring until
// it is clear of the blips already placed
function place(entries: Signature[], project: Project): Placed[] {
    const out: Placed[] = [];
    // Oldest first, so a new signature never moves the ones already there
    for (const e of [...entries].reverse()) {
        const r = 95 + hash(e.id, 7) * 112;
        let theta = hash(e.id, 3) * Math.PI * 2;
        let p = project(r, theta);
        for (let k = 0; k < 10 && out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 20); k++) {
            theta += 0.43;
            p = project(r, theta);
        }
        out.push({ ...e, theta: ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), ...p });
    }
    return out;
}

function ago(iso: string): string {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 60) return "just now";
    const m = s / 60;
    if (m < 60) return `${Math.floor(m)} min ago`;
    const h = m / 60;
    if (h < 24) return `${Math.floor(h)} h ago`;
    const d = h / 24;
    if (d < 30) return `${Math.floor(d)} ${Math.floor(d) === 1 ? "day" : "days"} ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

// The sweep's angle follows the page clock rather than when it mounted, so
// blips mounted at any other moment still flash exactly as it passes
const sweepAngleNow = () => ((performance.now() / 1000) % SWEEP_S) / SWEEP_S * 360;

// ---- The sweep ------------------------------------------------------------

export const RadarSweep = ({ reduce, size }: { reduce: boolean | null; size: number }) => {
    const s = useGuestbook();
    if (reduce || s.status !== "ready") return null;
    const from = sweepAngleNow();
    return (
        <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <motion.div
                className="rounded-full"
                style={{
                    width: size,
                    height: size,
                    // The bright leading edge sits at 3 o'clock (angle 0 on the plane) before turning
                    background: "conic-gradient(from 90deg, transparent 0deg, transparent 280deg, rgba(45,212,191,0.16) 356deg, rgba(94,234,212,0.42) 360deg)",
                    maskImage: "radial-gradient(circle, transparent 17%, black 22%, black 68%, transparent 71%)",
                    WebkitMaskImage: "radial-gradient(circle, transparent 17%, black 22%, black 68%, transparent 71%)",
                }}
                initial={{ rotate: from }}
                animate={{ rotate: [from, from + 360] }}
                transition={{ duration: SWEEP_S, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
};

// ---- The blips ------------------------------------------------------------

export const RadarBlips = ({ project, sceneScale, reduce }: { project: Project; sceneScale: number; reduce: boolean | null }) => {
    const s = useGuestbook();
    const [open, setOpen] = useState<string | null>(null);
    const [mine, setMine] = useState<string[]>([]);
    const placed = useMemo(() => place(s.entries, project), [s.entries, project]);
    const newest = s.entries[0]?.id;

    useEffect(() => setMine(readMine()), [s.entries]);

    // A signature just sent opens its own card for a moment
    useEffect(() => {
        if (!s.fresh) return;
        setOpen(s.fresh);
        const id = window.setTimeout(() => setOpen((o) => (o === s.fresh ? null : o)), 5000);
        return () => window.clearTimeout(id);
    }, [s.fresh]);

    // A tap outside closes a card opened by tapping
    useEffect(() => {
        if (!open) return;
        const close = (e: PointerEvent) => {
            if (!(e.target as Element).closest?.("[data-blip]")) setOpen(null);
        };
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, [open]);

    if (s.status !== "ready" || !placed.length) return null;

    return (
        <>
            {placed.map((b) => {
                const isMine = mine.includes(b.id);
                const colour = isMine ? "251,191,36" : "94,234,212";
                const hitAt = (b.theta / (Math.PI * 2)) * SWEEP_S;
                const delay = (((hitAt - (sweepAngleNow() / 360) * SWEEP_S) % SWEEP_S) + SWEEP_S) % SWEEP_S;
                const isOpen = open === b.id;
                return (
                    <div
                        key={b.id}
                        data-blip
                        className="pointer-events-auto absolute"
                        style={{ left: "50%", top: "50%", transform: `translate(${b.x}px, ${b.y}px)`, zIndex: isOpen ? 40 : 3 }}
                        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(b.id)}
                        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen((o) => (o === b.id ? null : o))}
                    >
                        <button
                            type="button"
                            aria-label={`Signal from ${b.name}: ${b.message}`}
                            // Focus already opens it on a tap; a tap elsewhere or blur closes it
                            onClick={() => setOpen(b.id)}
                            onFocus={() => setOpen(b.id)}
                            onBlur={() => setOpen((o) => (o === b.id ? null : o))}
                            className="absolute -left-3 -top-3 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-teal-300/70"
                        >
                            <motion.span
                                className="block rounded-full"
                                style={{
                                    width: 4 * b.scale + 1,
                                    height: 4 * b.scale + 1,
                                    background: `rgb(${colour})`,
                                    boxShadow: `0 0 6px rgba(${colour},0.9)`,
                                }}
                                initial={{ opacity: 0.4, scale: 1 }}
                                animate={
                                    reduce || isOpen
                                        ? { opacity: 1, scale: isOpen ? 1.6 : 1 }
                                        : { opacity: [1, 0.35, 0.35], scale: [1.7, 1, 1] }
                                }
                                transition={
                                    reduce || isOpen
                                        ? { duration: 0.2 }
                                        : { duration: SWEEP_S, times: [0, 0.55, 1], delay, repeat: Infinity, ease: "easeOut" }
                                }
                            />
                            {/* The newest signal keeps pinging */}
                            {!reduce && b.id === newest && (
                                <motion.span
                                    className="absolute rounded-full"
                                    style={{ width: 14, height: 14, border: `1px solid rgba(${colour},0.8)` }}
                                    animate={{ scale: [0.4, 1.8], opacity: [0.9, 0] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                                />
                            )}
                        </button>

                        {/* The card, counter-scaled so it stays readable when the scene shrinks */}
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    className="pointer-events-none absolute bottom-3 left-0"
                                    style={{ transformOrigin: "0 100%", scale: 1 / sceneScale }}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
                                    transition={{ duration: 0.18 }}
                                >
                                    <div
                                        className="w-max max-w-[210px] rounded-lg px-2.5 py-1.5 font-mono"
                                        style={{
                                            // Blips near an edge hang their card inward, so it stays on screen
                                            transform: `translateX(${b.x > 60 ? -88 : b.x < -60 ? -12 : -50}%)`,
                                            background: "rgba(8,15,20,0.94)",
                                            border: `1px solid rgba(${colour},0.5)`,
                                            boxShadow: `0 0 14px rgba(${colour},0.22)`,
                                        }}
                                    >
                                        <div className="flex items-baseline justify-between gap-3 text-[9.5px] uppercase tracking-[0.14em]">
                                            <span style={{ color: `rgb(${colour})` }}>{b.name}</span>
                                            <span className="text-neutral-500">{isMine ? "you" : ago(b.at)}</span>
                                        </div>
                                        <p className="mt-0.5 break-words text-[11px] leading-snug text-neutral-200">{b.message}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </>
    );
};

// ---- Signing --------------------------------------------------------------

export const GuestbookSignal = () => {
    const s = useGuestbook();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [callsign, setCallsign] = useState("");
    const [status, setStatus] = useState<{ kind: "sending" | "error" | "sent"; text: string } | null>(null);

    useEffect(() => {
        try {
            setCallsign(sessionStorage.getItem("visitor-callsign") ?? "");
        } catch {
            /* ignore */
        }
    }, [editing]);

    if (s.status !== "ready") return null;

    const send = async () => {
        const text = message.trim();
        if (!text || status?.kind === "sending") return;
        setStatus({ kind: "sending", text: "transmitting…" });
        try {
            const res = await fetch("/api/guestbook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() || callsign || "anonymous", message: text }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.entry) {
                setStatus({ kind: "error", text: data.error || "The signal did not get through. Try again?" });
                return;
            }
            const entry = data.entry as Signature;
            try {
                localStorage.setItem(MINE_KEY, JSON.stringify([...readMine(), entry.id].slice(-20)));
            } catch {
                /* ignore */
            }
            set({ entries: [entry, ...state.entries].slice(0, 30), total: state.total + 1, fresh: entry.id });
            window.dispatchEvent(new CustomEvent("guestbook-signed", { detail: { name: entry.name } }));
            setMessage("");
            setEditing(false);
            setStatus({ kind: "sent", text: "signal received · yours is the amber blip" });
            window.setTimeout(() => setStatus((st) => (st?.kind === "sent" ? null : st)), 6000);
        } catch {
            setStatus({ kind: "error", text: "The signal did not get through. Try again?" });
        }
    };

    const count = s.total;

    return (
        <div className="flex w-full max-w-md flex-col items-center gap-1.5 font-mono">
            <AnimatePresence mode="wait" initial={false}>
                {editing ? (
                    <motion.form
                        key="form"
                        className="flex w-full items-center gap-1.5 rounded-full border border-teal-400/30 bg-black/70 p-1 pl-3 shadow-[0_0_18px_rgba(45,212,191,0.12)] backdrop-blur-sm"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        onSubmit={(e) => {
                            e.preventDefault();
                            send();
                        }}
                        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                    >
                        <input
                            aria-label="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={24}
                            placeholder={callsign || "name"}
                            className="w-[5.5rem] shrink-0 bg-transparent text-[11px] uppercase tracking-wider text-teal-200 placeholder:text-teal-200/40 focus:outline-none"
                        />
                        <span className="h-4 w-px shrink-0 bg-white/15" />
                        <input
                            // The form mounts once the button has faded out, so focus on mount
                            autoFocus
                            aria-label="Your message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={140}
                            placeholder="say something to the crew"
                            className="min-w-0 flex-1 bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            aria-label="Send signal"
                            disabled={!message.trim() || status?.kind === "sending"}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-400/90 text-neutral-950 transition hover:bg-teal-300 disabled:opacity-40"
                        >
                            <IconSend className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            aria-label="Cancel"
                            onClick={() => setEditing(false)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:text-neutral-200"
                        >
                            <IconX className="h-3.5 w-3.5" />
                        </button>
                    </motion.form>
                ) : (
                    <motion.button
                        key="open"
                        type="button"
                        onClick={() => {
                            setEditing(true);
                            setStatus(null);
                        }}
                        className="group flex items-center gap-2 rounded-full border border-teal-400/25 bg-black/50 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-neutral-400 backdrop-blur-sm transition hover:border-teal-300/50 hover:text-teal-100"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_6px_rgba(94,234,212,0.9)]" />
                        {count ? `${count} ${count === 1 ? "signal" : "signals"} on the radar` : "the radar is quiet"}
                        <span className="text-neutral-600">·</span>
                        <span className="text-teal-300/90 group-hover:text-teal-200">leave yours</span>
                    </motion.button>
                )}
            </AnimatePresence>
            <p
                aria-live="polite"
                className={`min-h-[14px] text-[10px] tracking-wider ${status?.kind === "error" ? "text-rose-300" : status?.kind === "sent" ? "text-amber-200" : "text-neutral-500"}`}
            >
                {status?.text ?? ""}
            </p>
        </div>
    );
};
