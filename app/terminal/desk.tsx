"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { kolkataNow } from "@/lib/kolkata";
import { Display, Keyboard, Mouse, Mug, Phone, Plant, SCREEN, StickArt, Tower, type Note, type Stick } from "./props";
import { playAirDrop, playNotify, playPowerButton, playUsbIn, playUsbOut, setFan } from "./desk-sound";

// The terminal on a desk in orbit, for large screens (terminal.html sends them
// here). The terminal itself is public/terminal.html, untouched in how it
// works, shown in the display with ?screen=1: it tells the desk what it is
// doing (busy, a game, a download, a notification) and the desk's props react.
//
//   Display and tower   the tower's lattice glows and its fans hum harder
//                       while a command or a game runs; its power button
//                       starts the terminal, then sleeps and wakes the display
//   USB drives          drag one from the tray to the tower's ports (or tap
//                       it): it mounts in the terminal at /Volumes
//   AirDrop             a download flies off the screen to the phone
//   Phone               notifications as things happen; tap it for a QR code
//   Keyboard, mouse     mirror the visitor's typing, pointer, clicks and scrolling
//   Chai and a plant    chai steams at chai-time in Kolkata
//
// The scene is drawn at 1440 x 900 and scaled to fit. The terminal is not
// scaled: it is laid over the screen at its real size, so its text stays
// sharp and readable, and full screen just widens it to the window.

const W = 1440;
const H = 900;
const BIG = "(min-width: 1024px) and (min-height: 620px) and (pointer: fine)";

type TermWindow = Window & { runCommandFromClick?: (c: string) => void; deskMount?: (label: string) => void; deskEject?: () => void };

const STICKS: (Stick & { term: string })[] = [
    { id: "projects", label: "PROJECTS", color: "#3b82f6", term: "PROJECTS" },
    { id: "papers", label: "PAPERS", color: "#ef4444", term: "PAPERS" },
    { id: "contact", label: "CONTACT", color: "#22c55e", term: "CONTACT" },
    { id: "games", label: "GAMES", color: "#a855f7", term: "GAMES" },
    { id: "sign", label: "SIGN ME", color: "#f5f5f4", term: "SIGNME" },
    { id: "alien", label: "", color: "#27272a", alien: true, term: "ALIEN" },
];


// Stars behind, the same on the server and in the browser
const STARS = (() => {
    let seed = 1440900;
    const r = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    return Array.from({ length: 140 }, () => ({ x: r() * 100, y: r() * 100, s: r() < 0.1 ? 2 : 1, o: 0.2 + r() * 0.6 }));
})();

export function Desk() {
    const [big, setBig] = useState<boolean | null>(null);
    const [src, setSrc] = useState<string | null>(null);
    const [view, setView] = useState({ s: 1, ox: 0, oy: 0, vw: 0, vh: 0 });
    const frameRef = useRef<HTMLIFrameElement>(null);
    const portRef = useRef<HTMLDivElement>(null);
    const phoneRef = useRef<HTMLButtonElement>(null);

    const [on, setOn] = useState(false); // the terminal has been started
    const [asleep, setAsleep] = useState(false);
    const [busy, setBusy] = useState(false);
    const [game, setGame] = useState(false);
    const [plugged, setPlugged] = useState<(typeof STICKS)[number] | null>(null);
    const pluggedRef = useRef<(typeof STICKS)[number] | null>(null);
    pluggedRef.current = plugged;
    const [notes, setNotes] = useState<Note[]>([]);
    const [qr, setQr] = useState(false);
    const [flight, setFlight] = useState<{ n: number; from: { x: number; y: number }; to: { x: number; y: number }; name: string } | null>(null);
    const [airdrop, setAirdrop] = useState(0);
    const [pressed, setPressed] = useState<Set<string>>(new Set());
    const [tint, setTint] = useState("#2dd4bf");
    const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
    const [button, setButton] = useState<"left" | "right" | null>(null);
    const [wheel, setWheel] = useState(0);
    const [full, setFull] = useState(false);
    // Read by the listeners inside the display, which outlive renders
    const fullRef = useRef(false);
    fullRef.current = full;
    const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
    const noteId = useRef(0);

    // Big screens only; the terminal's own address, forwarded to the display
    useEffect(() => {
        const mq = window.matchMedia(BIG);
        setBig(mq.matches);
        const q = new URLSearchParams(window.location.search);
        q.delete("screen");
        q.delete("bare");
        const rest = q.toString();
        setSrc(`/terminal.html?${mq.matches ? "screen=1" : "bare=1"}${rest ? `&${rest}` : ""}`);
        // The address stays /terminal; a ?cmd= has been handed on
        if (rest) window.history.replaceState(null, "", "/terminal");
    }, []);

    // Fit the scene to the window
    useEffect(() => {
        const fit = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const s = Math.max(0.55, Math.min(1.35, vw / W, vh / H));
            setView({ s, ox: (vw - W * s) / 2, oy: (vh - H * s) / 2, vw, vh });
        };
        fit();
        window.addEventListener("resize", fit);
        return () => window.removeEventListener("resize", fit);
    }, []);

    // ---- talking to the terminal ------------------------------------------------
    const term = () => frameRef.current?.contentWindow as TermWindow | null | undefined;
    const doc = () => frameRef.current?.contentDocument ?? null;
    const input = () => doc()?.getElementById("input-line") as HTMLInputElement | null;
    const isStarted = () => (doc()?.getElementById("start-overlay") as HTMLElement | null)?.style.display === "none";
    const refocus = useCallback(() => {
        try {
            frameRef.current?.contentWindow?.focus();
            input()?.focus({ preventScroll: true });
        } catch {
            /* ignore */
        }
    }, []);
    // Start the terminal if it is not yet, then run fn once its prompt is ready
    const whenReady = useCallback((fn: () => void) => {
        if (!isStarted()) (doc()?.getElementById("start-overlay") as HTMLElement | null)?.click();
        const t0 = Date.now();
        const poll = () => {
            const i = input();
            if (isStarted() && i && !i.disabled) fn();
            else if (Date.now() - t0 < 25000) window.setTimeout(poll, 200);
        };
        poll();
    }, []);

    const pushNote = useCallback((app: string, text: string, icon: string) => {
        noteId.current += 1;
        const id = noteId.current;
        setNotes((n) => [{ id, app, text, icon }, ...n].slice(0, 3));
        playNotify();
    }, []);

    // First notes on the phone
    useEffect(() => {
        const k = kolkataNow();
        noteId.current = 2;
        setNotes([
            { id: 2, app: "Desk", text: "Plug a drive from the tray into the tower", icon: "🔌" },
            { id: 1, app: "Kolkata station", text: `Miit is ${k.mood.label}. ${k.mood.reply[0].toUpperCase()}${k.mood.reply.slice(1)}.`, icon: "🛰️" },
        ]);
    }, []);

    // AirDrop: a file flies off the screen and lands on the phone
    const screenRect = useMemo(() => {
        if (full) return { left: 0, top: 0, width: view.vw, height: view.vh };
        return { left: view.ox + SCREEN.x * view.s, top: view.oy + SCREEN.y * view.s, width: SCREEN.w * view.s, height: SCREEN.h * view.s };
    }, [full, view]);
    const airDrop = useCallback(
        (name: string) => {
            const p = phoneRef.current?.getBoundingClientRect();
            const from = { x: screenRect.left + screenRect.width / 2, y: screenRect.top + screenRect.height / 2 };
            const to = p ? { x: p.left + p.width / 2, y: p.top + p.height / 2 } : { x: 100, y: 500 };
            playAirDrop();
            setFlight({ n: Date.now(), from, to, name });
            window.setTimeout(() => {
                setAirdrop((a) => a + 1);
                pushNote("AirDrop", `${name} · accepted`, "📄");
            }, 900);
        },
        [screenRect, pushNote],
    );

    // Messages from the terminal
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin || e.data?.source !== "mdos") return;
            const d = e.data as { type: string; on?: boolean; filename?: string; app?: string; text?: string };
            if (d.type === "busy") setBusy(!!d.on);
            else if (d.type === "game") setGame(!!d.on);
            else if (d.type === "download") airDrop(d.filename || "Resume-Miit_Daga.pdf");
            else if (d.type === "notify") pushNote(d.app || "Terminal", d.text || "", "✍️");
            else if (d.type === "fullscreen") setFull((f) => !f);
            else if (d.type === "eject") {
                const was = pluggedRef.current;
                playUsbOut();
                setPlugged(null);
                if (was) pushNote("USB drive", `${was.label || "?????"} ejected`, "⏏️");
            }
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
    }, [airDrop, pushNote]);

    // High scores, written by the games in the display (the same origin, so this page hears them)
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            const m = e.key?.match(/^(snake|invaders|dodge|tetris|typing|flappy|defense)-highscore$/);
            if (!m) return;
            if ((Number(e.newValue) || 0) > (Number(e.oldValue) || 0)) pushNote("Arcade", `New high score in ${m[1]}: ${e.newValue}`, "🏆");
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [pushNote]);

    // Once the display's page is in: mirror its keys and pointer, and notice it start
    const onFrameLoad = () => {
        const w = frameRef.current?.contentWindow;
        const d = doc();
        if (!w || !d) return;
        // The games are laid out for a whole window; in the display, their
        // board is capped so the title, score and controls fit the screen too.
        // Styling only, added from here: terminal.html itself is unchanged
        const fit = d.createElement("style");
        fit.textContent = `body > div[style*="9000"] { gap: 6px !important; padding: 10px 0 !important; box-sizing: border-box !important; overflow: hidden !important; }
body > div[style*="9000"] canvas { max-height: calc(100vh - 130px) !important; max-width: 94vw !important; }`;
        d.head.appendChild(fit);
        const readTint = () => {
            const v = getComputedStyle(d.documentElement).getPropertyValue("--term-primary").trim();
            if (v) setTint(v);
        };
        readTint();
        w.addEventListener("keydown", (e) => {
            setPressed((s) => new Set(s).add(e.code));
            // Esc leaves full screen, unless the terminal wants it itself: a
            // game, or a command still running (a prompt, the tour)
            if (e.key === "Escape" && fullRef.current) {
                const gameUp = [...d.body.children].some((el) => (el as HTMLElement).style?.zIndex === "9000");
                const i = d.getElementById("input-line") as HTMLInputElement | null;
                if (!gameUp && i && !i.disabled) setFull(false);
            }
            if (e.key === "Enter") window.setTimeout(readTint, 300);
        });
        w.addEventListener("keyup", (e) =>
            setPressed((s) => {
                const n = new Set(s);
                n.delete(e.code);
                return n;
            }),
        );
        w.addEventListener("blur", () => setPressed(new Set()));
        let leave = 0;
        w.addEventListener("mousemove", (e) => {
            setDot({ x: Math.min(0.95, Math.max(0.05, e.clientX / w.innerWidth)), y: Math.min(0.95, Math.max(0.05, e.clientY / w.innerHeight)) });
            window.clearTimeout(leave);
            leave = window.setTimeout(() => setDot(null), 2500);
        });
        w.addEventListener("mousedown", (e) => {
            setButton(e.button === 2 ? "right" : "left");
        });
        w.addEventListener("mouseup", () => setButton(null));
        w.addEventListener("wheel", () => setWheel((n) => n + 1), { passive: true });
        const overlay = d.getElementById("start-overlay");
        if (overlay) {
            const check = () => setOn(overlay.style.display === "none");
            check();
            new MutationObserver(check).observe(overlay, { attributes: true, attributeFilter: ["style"] });
        }
    };

    // Typing while the desk itself has focus goes to the terminal
    useEffect(() => {
        if (!big) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && full) {
                setFull(false);
                return;
            }
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const i = input();
            if (!i || i.disabled) return;
            refocus();
            if (e.key.length === 1) {
                e.preventDefault();
                i.value += e.key;
                i.dispatchEvent(new Event("input", { bubbles: true }));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [big, full, refocus]);

    // The tower's lattice light and its fans
    const level = !on || asleep ? 0 : game ? 1 : busy ? 0.6 : 0.18;
    useEffect(() => {
        setFan(!on || asleep ? 0 : game ? 1 : busy ? 0.55 : 0.12);
    }, [on, asleep, busy, game]);
    useEffect(() => {
        // Sound needs a first click or key; bring the fans in then
        const kick = () => setFan(!on || asleep ? 0 : game ? 1 : busy ? 0.55 : 0.12);
        window.addEventListener("pointerdown", kick, { once: true });
        return () => window.removeEventListener("pointerdown", kick);
    }, [on, asleep, busy, game]);
    useEffect(() => () => setFan(0), []);

    const power = () => {
        playPowerButton();
        if (!on) whenReady(refocus);
        else setAsleep((a) => !a);
        if (asleep) refocus();
    };

    // ---- USB drives -------------------------------------------------------------
    const plug = (stick: (typeof STICKS)[number]) => {
        if (plugged?.id === stick.id) return;
        playUsbIn();
        setPlugged(stick);
        setAsleep(false);
        pushNote("USB drive", `${stick.label || "?????"} connected`, "🔌");
        whenReady(() => {
            term()?.deskMount?.(stick.term);
            refocus();
        });
    };
    const pull = () => whenReady(() => {
        term()?.deskEject?.();
        refocus();
    });
    const overPort = (x: number, y: number) => {
        const r = portRef.current?.getBoundingClientRect();
        return !!r && x > r.left - 60 && x < r.right + 60 && y > r.top - 70 && y < r.bottom + 50;
    };
    const dragStart = (e: React.PointerEvent, stick: (typeof STICKS)[number]) => {
        if (plugged?.id === stick.id) return;
        const x0 = e.clientX;
        const y0 = e.clientY;
        let moved = false;
        const move = (ev: PointerEvent) => {
            const dx = (ev.clientX - x0) / view.s;
            const dy = (ev.clientY - y0) / view.s;
            if (Math.hypot(dx, dy) > 5) moved = true;
            setDrag({ id: stick.id, dx, dy });
        };
        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            setDrag(null);
            if (!moved || overPort(ev.clientX, ev.clientY)) plug(stick);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };


    // ---- small screens: the terminal on its own -------------------------------
    if (big === false) {
        return src ? <iframe src={src} title="Terminal" className="fixed inset-0 h-full w-full border-0 bg-black" /> : null;
    }

    const glow = game ? tint : busy ? `${tint}99` : "transparent";

    return (
        <main className="fixed inset-0 overflow-hidden bg-[#03040a] text-white">
            {/* space */}
            <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 20% 10%, rgba(99,102,241,0.14), transparent 60%), radial-gradient(50% 40% at 85% 20%, rgba(45,212,191,0.08), transparent 60%)" }}>
                {STARS.map((st, i) => (
                    <span key={i} className="absolute rounded-full bg-white" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, opacity: st.o }} />
                ))}
            </div>

            {/* the scene, at design size, scaled to fit */}
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `translate(${view.ox}px, ${view.oy}px) scale(${view.s})` }}>
                {/* header */}
                <div className="absolute left-[30px] top-[26px]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal-300/80">Crew terminal</p>
                    <p className="font-display text-[22px] font-bold tracking-tight">Miit Daga · Terminal</p>
                </div>
                <div className="absolute right-[30px] top-[30px] flex gap-2">
                    <button type="button" onClick={() => setFull(true)} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white">
                        Full screen
                    </button>
                    <a href="/terminal.html?bare=1" className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white">
                        Plain
                    </a>
                    <button
                        type="button"
                        onClick={() => {
                            window.close();
                            window.setTimeout(() => (window.location.href = "/"), 150);
                        }}
                        className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:text-white"
                    >
                        ✕ Close
                    </button>
                </div>

                {/* the desk, floating */}
                <div
                    aria-hidden
                    className="absolute rounded-[20px]"
                    style={{ left: 30, top: 640, width: 1380, height: 250, background: "linear-gradient(180deg, #1c1f26 0%, #121419 40%, #0b0c10 100%)", boxShadow: "0 60px 120px -40px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.08)" }}
                />
                <div aria-hidden className="absolute left-[30px] top-[640px] h-[2px] w-[1380px] bg-gradient-to-r from-transparent via-teal-300/20 to-transparent" />

                <Display asleep={asleep} glow={glow} />
                <Tower ref={portRef} level={level} tint={tint} on={on} asleep={asleep} plugged={plugged} onPower={power} onPull={pull} />
                <Phone ref={phoneRef} notes={notes} qr={qr} onTap={() => setQr((q) => !q)} airdrop={airdrop} />
                <Keyboard pressed={pressed} tint={tint} />
                <Mouse dot={dot} button={button} wheel={wheel} tint={tint} />
                <Mug />
                <Plant />

                {/* the tray of drives */}
                <div className="absolute rounded-[14px]" style={{ left: 96, top: 790, width: 268, height: 96, background: "linear-gradient(180deg, #2a2d34, #1a1c21)", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <div className="absolute inset-0 flex items-center justify-center gap-[10px]">
                        {STICKS.map((st) => {
                            const d = drag?.id === st.id ? drag : null;
                            const out = plugged?.id === st.id;
                            return (
                                <button
                                    key={st.id}
                                    type="button"
                                    onPointerDown={(e) => dragStart(e, st)}
                                    aria-label={`${st.alien ? "An unlabelled drive with an alien sticker" : `${st.label} drive`}. Plug it into the tower`}
                                    title={st.alien ? "An unlabelled drive" : `${st.label}: drag it to the tower, or tap`}
                                    className="relative cursor-grab touch-none active:cursor-grabbing"
                                    style={{
                                        opacity: out ? 0.15 : 1,
                                        transform: d ? `translate(${d.dx}px, ${d.dy}px) scale(1.12)` : undefined,
                                        transition: d ? "none" : "transform 0.3s ease",
                                        zIndex: d ? 50 : undefined,
                                    }}
                                >
                                    <StickArt stick={st} />
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* the terminal, over the screen at its real size */}
            {src && (
                <iframe
                    ref={frameRef}
                    src={src}
                    onLoad={onFrameLoad}
                    title="Terminal"
                    className="absolute border-0 bg-black transition-[left,top,width,height,border-radius] duration-500 ease-out"
                    style={{ ...screenRect, zIndex: 30, borderRadius: full ? 0 : 3 }}
                    allow="autoplay; clipboard-write"
                />
            )}
            {/* asleep: the panel dark over it; tap to wake */}
            {asleep && !full && (
                <button type="button" aria-label="Wake the display" onClick={power} className="absolute z-40 bg-black" style={screenRect}>
                    <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-700">asleep · tap to wake</span>
                </button>
            )}
            {full && (
                <button type="button" onClick={() => setFull(false)} className="fixed right-4 top-4 z-50 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 font-mono text-xs text-neutral-200 backdrop-blur hover:text-white">
                    exit full screen · esc
                </button>
            )}

            {/* AirDrop's flying file */}
            <AnimatePresence>
                {flight && (
                    <motion.div
                        key={flight.n}
                        className="pointer-events-none fixed left-0 top-0 z-50 flex flex-col items-center"
                        initial={{ x: flight.from.x - 24, y: flight.from.y - 30, scale: 1.4, opacity: 0 }}
                        animate={{
                            x: [flight.from.x - 24, (flight.from.x + flight.to.x) / 2 - 24, flight.to.x - 24],
                            y: [flight.from.y - 30, Math.min(flight.from.y, flight.to.y) - 140, flight.to.y - 30],
                            scale: [1.4, 1, 0.35],
                            opacity: [0, 1, 0.9],
                        }}
                        transition={{ duration: 0.9, ease: "easeInOut" }}
                        onAnimationComplete={() => setFlight(null)}
                    >
                        <div className="flex h-[60px] w-[48px] items-end justify-center rounded-[6px] bg-white pb-1 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                            <span className="rounded bg-red-500 px-1 text-[9px] font-bold text-white">PDF</span>
                        </div>
                        <span className="mt-1 whitespace-nowrap rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-medium text-white">AirDrop</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
