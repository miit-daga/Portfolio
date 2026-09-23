"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconDownload, IconRefresh, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { SECTIONS } from "@/constants/sections";
import { CONSTELLATION_STORAGE_KEY } from "./constellation-key";

// The footer's console (Contact.tsx):
//   Clocks        the visitor's time beside Miit's, and how far apart they are
//   Callsign      this visit's callsign, explained, and rerollable
//   Visit log     a line that fills in as the visitor explores, opening into a
//                 report they can save as an image
//   Big Crunch    the Konami keys light up as they are typed, and can be tapped
//                 in order on a phone, which has no arrow keys

const CALLSIGNS = ["NOVA", "ORION", "VEGA", "LYRA", "QUASAR", "PULSAR", "ANDROMEDA", "CYGNUS", "DRACO", "PHOENIX"];
const newCallsign = () => `${CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)]}-${10 + Math.floor(Math.random() * 90)}`;
const KOLKATA_OFFSET_MIN = 330;

const store = {
    get(area: "session" | "local", key: string) {
        try {
            return (area === "session" ? sessionStorage : localStorage).getItem(key);
        } catch {
            return null;
        }
    },
    set(area: "session" | "local", key: string, value: string) {
        try {
            (area === "session" ? sessionStorage : localStorage).setItem(key, value);
        } catch {
            /* ignore */
        }
    },
};

// ---- Clocks and callsign ---------------------------------------------------

const hoursApart = (mins: number) => {
    const h = Math.abs(mins) / 60;
    const whole = Math.floor(h);
    const frac = h - whole;
    const f = frac === 0.5 ? "½" : frac === 0.25 ? "¼" : frac === 0.75 ? "¾" : frac ? `.${Math.round(frac * 10)}` : "";
    return `${whole || (f ? "" : "0")}${f} h`;
};

export function MissionStatus({ accent }: { accent: string }) {
    const [now, setNow] = useState<Date | null>(null);
    const [callsign, setCallsign] = useState("");
    const [explain, setExplain] = useState(false);

    useEffect(() => {
        let cs = store.get("session", "visitor-callsign");
        if (!cs) {
            cs = newCallsign();
            store.set("session", "visitor-callsign", cs);
        }
        setCallsign(cs);
        setNow(new Date());
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    if (!now) return null;

    const yours = now.toLocaleTimeString([], { hour12: false });
    const miits = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    const diff = -now.getTimezoneOffset() - KOLKATA_OFFSET_MIN;
    const gap = diff === 0 ? "same time" : `you're ${hoursApart(diff)} ${diff < 0 ? "behind" : "ahead"}`;

    const reroll = () => {
        const cs = newCallsign();
        store.set("session", "visitor-callsign", cs);
        setCallsign(cs);
        window.dispatchEvent(new CustomEvent("callsign-changed", { detail: cs }));
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <span>
                your time <span className="text-neutral-300">{yours}</span>
            </span>
            <span className="text-neutral-700">·</span>
            <span>
                miit&apos;s <span className="text-neutral-300">{miits}</span> <span className="text-neutral-600">({gap})</span>
            </span>
            <span className="text-neutral-700">|</span>
            {/* The callsign, explained on hover or tap */}
            <span className="relative" onMouseEnter={() => setExplain(true)} onMouseLeave={() => setExplain(false)}>
                <button type="button" onClick={() => setExplain((v) => !v)} className="uppercase tracking-[0.2em]">
                    callsign <span style={{ color: accent }}>{callsign}</span>
                </button>
                <AnimatePresence>
                    {explain && (
                        <motion.span
                            className="absolute bottom-full left-1/2 z-30 mb-2 block w-60 -translate-x-1/2 rounded-xl border border-white/15 bg-black/90 p-3 text-left normal-case tracking-normal text-neutral-300 shadow-xl backdrop-blur-md"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                        >
                            <span className="block text-[11px] leading-snug">
                                Your callsign for this visit. It&apos;s printed on your visitor pass, and signs the guestbook if you leave the name blank.
                            </span>
                            <button
                                type="button"
                                onClick={reroll}
                                className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-neutral-200 hover:border-white/30"
                            >
                                <IconRefresh className="h-3 w-3" /> new callsign
                            </button>
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        </div>
    );
}

// ---- Visit log ------------------------------------------------------------

const ABOARD_KEY = "aboard-since";
const VISITED_KEY = "sections-visited";

type Log = {
    minutes: number;
    visited: string[];
    fragments: number;
    constellation: boolean;
    alienCaught: boolean;
    alienSeen: number;
    signed: boolean;
    callsign: string;
};

function readLog(): Log {
    const since = Number(store.get("session", ABOARD_KEY)) || Date.now();
    const parse = <T,>(raw: string | null, fallback: T): T => {
        try {
            return raw ? (JSON.parse(raw) as T) : fallback;
        } catch {
            return fallback;
        }
    };
    return {
        minutes: Math.max(0, Math.floor((Date.now() - since) / 60000)),
        visited: parse<string[]>(store.get("session", VISITED_KEY), []),
        fragments: parse<string[]>(store.get("session", "cosmic-fragments"), []).length,
        constellation: !!store.get("session", CONSTELLATION_STORAGE_KEY),
        alienCaught: (Number(store.get("local", "alien-caught")) || 0) > 0,
        alienSeen: Number(store.get("local", "alien-sightings")) || 0,
        signed: parse<string[]>(store.get("local", "guestbook-mine"), []).length > 0,
        callsign: store.get("session", "visitor-callsign") ?? "VISITOR",
    };
}

const finds = (l: Log) => (l.fragments ? 1 : 0) + (l.constellation ? 1 : 0) + (l.alienCaught ? 1 : 0) + (l.signed ? 1 : 0);

// The report as an image, drawn on a canvas in the visitor's browser
function saveReport(l: Log) {
    const W = 1080;
    const H = 1350;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    if (!x) return;
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#070b18");
    g.addColorStop(1, "#0f172a");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    // stars
    for (let i = 0; i < 180; i++) {
        x.fillStyle = `rgba(255,255,255,${(0.2 + Math.random() * 0.6).toFixed(2)})`;
        const s = Math.random() * 2.2;
        x.fillRect(Math.random() * W, Math.random() * H, s, s);
    }
    x.fillStyle = "#fbbf24";
    x.font = "600 30px ui-monospace, SFMono-Regular, Menlo, monospace";
    x.fillText("MISSION REPORT · MIITDAGA.DEV", 90, 150);
    x.fillStyle = "#ffffff";
    x.font = "700 84px system-ui, sans-serif";
    x.fillText(l.callsign, 90, 260);
    const rows: [string, string][] = [
        ["Time aboard", `${l.minutes} min`],
        ["Sections visited", `${l.visited.length} of ${SECTIONS.length}`],
        ["Cosmic fragments", `${l.fragments} of 5`],
        ["Constellation", l.constellation ? "charted" : "not yet"],
        ["The alien", l.alienCaught ? "caught" : l.alienSeen ? `seen ${l.alienSeen}×, not caught` : "never saw him"],
        ["Guestbook", l.signed ? "signed" : "not signed"],
    ];
    rows.forEach(([k, v], i) => {
        const y = 420 + i * 130;
        x.fillStyle = "rgba(255,255,255,0.08)";
        x.fillRect(90, y + 40, W - 180, 2);
        x.fillStyle = "#94a3b8";
        x.font = "500 34px system-ui, sans-serif";
        x.fillText(k, 90, y);
        x.fillStyle = "#f8fafc";
        x.font = "600 44px system-ui, sans-serif";
        const w = x.measureText(v).width;
        x.fillText(v, W - 90 - w, y);
    });
    x.fillStyle = "#64748b";
    x.font = "400 26px ui-monospace, SFMono-Regular, Menlo, monospace";
    x.fillText(new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }), 90, H - 90);
    const a = document.createElement("a");
    a.download = `mission-report-${l.callsign}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
}

export function VisitLog() {
    const [log, setLog] = useState<Log | null>(null);
    const [open, setOpen] = useState(false);

    // Start the clock on the visit, and note each section as it crosses the middle of the screen
    useEffect(() => {
        if (!store.get("session", ABOARD_KEY)) store.set("session", ABOARD_KEY, String(Date.now()));
        const seen = new Set<string>(readLog().visited);
        const io = new IntersectionObserver(
            (entries) => {
                let changed = false;
                for (const e of entries) {
                    if (e.isIntersecting && !seen.has(e.target.id)) {
                        seen.add(e.target.id);
                        changed = true;
                    }
                }
                if (changed) {
                    store.set("session", VISITED_KEY, JSON.stringify([...seen]));
                    setLog(readLog());
                }
            },
            { rootMargin: "-45% 0px -45% 0px" },
        );
        SECTIONS.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) io.observe(el);
        });
        setLog(readLog());
        const id = window.setInterval(() => setLog(readLog()), 30000);
        return () => {
            io.disconnect();
            window.clearInterval(id);
        };
    }, []);

    useEffect(() => {
        if (open) setLog(readLog());
    }, [open]);

    if (!log) return null;
    const f = finds(log);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-neutral-300"
            >
                visit log · {log.minutes} min aboard · {log.visited.length}/{SECTIONS.length} sections · {f} {f === 1 ? "find" : "finds"}
                <span className="ml-1.5 text-neutral-600">{open ? "▴" : "▾"}</span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute bottom-full left-1/2 z-30 mb-3 w-72 -translate-x-1/2 rounded-2xl border border-white/15 bg-black/90 p-4 font-mono text-[11px] text-neutral-300 shadow-2xl backdrop-blur-md"
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] uppercase tracking-[0.25em] text-amber-300/90">mission report</p>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-neutral-500 hover:text-white">
                                <IconX className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <p className="mt-1 text-base font-bold tracking-wide text-white">{log.callsign}</p>
                        <dl className="mt-3 space-y-1.5">
                            {[
                                ["time aboard", `${log.minutes} min`],
                                ["fragments", `${log.fragments}/5`],
                                ["constellation", log.constellation ? "charted ✓" : "not yet"],
                                ["the alien", log.alienCaught ? "caught ✓" : log.alienSeen ? `seen ${log.alienSeen}×` : "not seen"],
                                ["guestbook", log.signed ? "signed ✓" : "not signed"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-3">
                                    <dt className="text-neutral-500">{k}</dt>
                                    <dd className="text-neutral-100">{v}</dd>
                                </div>
                            ))}
                        </dl>
                        {/* Which sections, as dots in their colours */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {SECTIONS.map((s) => (
                                <span
                                    key={s.id}
                                    title={s.label}
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: log.visited.includes(s.id) ? s.hex : "rgba(255,255,255,0.12)", boxShadow: log.visited.includes(s.id) ? `0 0 6px ${s.hex}` : undefined }}
                                />
                            ))}
                            <span className="ml-1 text-[10px] text-neutral-500">
                                {log.visited.length}/{SECTIONS.length} sections
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => saveReport(readLog())}
                            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 py-1.5 text-[11px] text-amber-100 hover:bg-amber-300/20"
                        >
                            <IconDownload className="h-3.5 w-3.5" /> save as image
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ---- Big Crunch keys ------------------------------------------------------

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const KEY_FACE: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", b: "B", a: "A" };

export function BigCrunchKeys() {
    // How many of the sequence are in, and a flash when one goes wrong
    const [progress, setProgress] = useState(0);
    const [miss, setMiss] = useState(0);
    const progressRef = useRef(0);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            const at = progressRef.current;
            let next: number;
            if (key === KONAMI[at]) next = at + 1;
            else {
                if (at > 0) setMiss(Date.now());
                next = key === KONAMI[0] ? 1 : 0;
            }
            // All ten: the page's own listener sets off the Big Crunch
            if (next === KONAMI.length) next = 0;
            progressRef.current = next;
            setProgress(next === 0 && key === KONAMI[KONAMI.length - 1] && at === KONAMI.length - 1 ? KONAMI.length : next);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // A tap presses the key, for phones and anyone without arrow keys handy
    const press = (key: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

    return (
        <div className="group flex flex-col items-center gap-2 md:flex-row" title="Type it, or tap the keys in order">
            <span className={cn("font-mono text-xs uppercase tracking-widest transition-colors", progress ? "text-amber-300" : "text-neutral-500 group-hover:text-amber-400")}>
                Initiate Big Crunch:
            </span>
            <motion.div
                key={miss}
                className="flex gap-1.5"
                animate={miss ? { x: [0, -5, 5, -3, 3, 0] } : undefined}
                transition={{ duration: 0.35 }}
            >
                {KONAMI.map((k, i) => {
                    const lit = i < progress;
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => press(k)}
                            aria-label={`Press ${KEY_FACE[k]}`}
                            className={cn(
                                "inline-flex h-7 min-w-[26px] items-center justify-center rounded border px-1 font-mono text-[11px] font-bold transition-all duration-200 md:h-5 md:min-w-[20px] md:text-[10px]",
                                lit
                                    ? "border-amber-300/80 bg-amber-400/30 text-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                                    : "border-white/20 bg-white/10 text-neutral-400 shadow-[0_2px_0_rgba(255,255,255,0.1)] group-hover:border-amber-500/40 group-hover:text-amber-200/80",
                            )}
                        >
                            {KEY_FACE[k]}
                        </button>
                    );
                })}
            </motion.div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-600 md:hidden">tap them in order</span>
        </div>
    );
}
