"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import { kolkataNow } from "@/lib/kolkata";
import { Display, HardDrive, Keyboard, Mouse, Mug, Phone, Plant, SCREEN, StickArt, Tower, WaterGlass, isChaiTime, useChaiTime, type Note, type Stick } from "./props";
import { Drawer, Duck, Life, Webcam, asciiFrame, closeCamera, openCamera, type Camera } from "./desk-extras";
import {
    playAirDrop,
    playDrawer,
    playMusic,
    playNotify,
    playPour,
    playPowerButton,
    playQuack,
    playShutter,
    playSip,
    playSparkle,
    playUsbIn,
    playUsbOut,
    setFan,
    stopMusic,
} from "./desk-sound";

// The terminal on a desk in orbit, for large screens (terminal.html sends them
// here). The terminal itself is public/terminal.html, untouched in how it
// works, shown in the display with ?screen=1: it tells the desk what it is
// doing (busy, a game, a download, a notification) and the desk's props react.
//
//   Display and tower   the tower's lattice glows and its fans hum harder
//                       while a command or a game runs; its power button
//                       starts the terminal, then sleeps and wakes the display
//   USB drives          drag one from the stand to the tower's ports (or tap
//                       it): it mounts in the terminal at /Volumes
//   AirDrop             a download flies off the screen to the phone
//   Phone               notifications as things happen (swipe to clear); its dock opens
//                       Messages (signs the guestbook), Weather, Music and a QR code
//   Keyboard, mouse     mirror the visitor's typing, pointer, clicks and scrolling
//   Chai                click to sip; it refills at chai-time in Kolkata
//   Plant               grows a little each visit, droops after a week away;
//                       drag the glass of water onto it to water it (it turns down chai)
//   Duck, webcam        explain a bug to the duck; the webcam takes an ASCII selfie
//   Drawer              a floppy, a sticky note and a cosmic fragment
//
// It is seen from the chair: things that stand (display, tower, phone, mug)
// face the viewer, and things that lie flat (keyboard, mouse) lie on the
// desk's surface, which is tilted away in 3D.
//
// The scene is drawn at 1440 x 900 and scaled to fit. The terminal is not
// scaled: it is laid over the screen at its real size, so its text stays
// sharp and readable, and full screen just widens it to the window.

const W = 1440;
const H = 900;
const BIG = "(min-width: 1024px) and (min-height: 620px) and (pointer: fine)";

type TermWindow = Window & {
    runCommandFromClick?: (c: string) => void;
    deskMount?: (label: string) => void;
    deskEject?: (label: string) => void;
    deskSelfie?: (result: { art: string } | { error: string }) => void;
};

// The desk's surface: a plane of SURFACE.w x SURFACE.d, its front edge at
// SURFACE.front, tilted back about that edge. Seen from the chair, its far
// edge is 150 up the screen and 8% narrower
const SURFACE = { x: 10, w: 1420, d: 284, front: 790, tilt: 55, perspective: 2678 };
// Where the mug, the glass of water and the plant stand, and where the glass
// pours when it is dropped on the plant
const MUG = { x: 352, y: 692 };
const GLASS = { x: 424, y: 624 };
const PLANT = { x: 1282, y: 616 };
const POUR = { x: 1262, y: 636 };
const PLANT_KEY = "desk-plant";
const CHAI_KEY = "desk-chai";
const FRAGMENT_KEY = "desk-fragment";

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
    const phoneRef = useRef<HTMLDivElement>(null);

    const [on, setOn] = useState(false); // the terminal has been started
    const [asleep, setAsleep] = useState(false);
    const [busy, setBusy] = useState(false);
    const [game, setGame] = useState(false);
    // Up to two sticks, one per port, oldest first; and the hard drive, on its cable
    const [plugged, setPlugged] = useState<{ stick: (typeof STICKS)[number]; port: 0 | 1 }[]>([]);
    const pluggedRef = useRef(plugged);
    pluggedRef.current = plugged;
    const [hdd, setHdd] = useState(false);
    // Connected but unmounted by a typed eject: still in its port, just idle
    const [unmounted, setUnmounted] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState<Note[]>([]);
    const [music, setMusic] = useState(false);
    // Chai: sips left of 4; the mug, dragged or pouring
    const hot = useChaiTime();
    const [chai, setChai] = useState(4);
    const [chaiLoaded, setChaiLoaded] = useState(false);
    const [mugDrag, setMugDrag] = useState<{ dx: number; dy: number } | null>(null);
    const [pouring, setPouring] = useState(false);
    // The plant's water, in a glass: dragged, pouring, or poured out (it is refilled)
    const [glassDrag, setGlassDrag] = useState<{ dx: number; dy: number } | null>(null);
    const [glassFull, setGlassFull] = useState(true);
    const plantRef = useRef<HTMLDivElement>(null);
    // What the plant says, in a bubble beside it; and whether the mug is over it
    const [plantSays, setPlantSays] = useState<{ text: string; n: number } | null>(null);
    const [overPlant, setOverPlant] = useState(false);
    const [rustle, setRustle] = useState(0);
    const sayTimer = useRef(0);
    const plantSay = useCallback((text: string) => {
        window.clearTimeout(sayTimer.current);
        setPlantSays({ text, n: Date.now() });
        sayTimer.current = window.setTimeout(() => setPlantSays(null), 3800);
    }, []);
    const [plant, setPlant] = useState({ stage: 2, droop: false, watered: 0, visits: 1 });
    const [drawer, setDrawer] = useState(false);
    const [fragment, setFragment] = useState(true);
    const [quack, setQuack] = useState(0);
    const [camLive, setCamLive] = useState(false);
    const cam = useRef<Camera | null>(null);
    const camTimer = useRef(0);
    const [flash, setFlash] = useState(0);
    const [flight, setFlight] = useState<{ n: number; from: { x: number; y: number }; to: { x: number; y: number }; name: string } | null>(null);
    const [airdrop, setAirdrop] = useState(0);
    const [pressed, setPressed] = useState<Set<string>>(new Set());
    const [tint, setTint] = useState("#2dd4bf");
    // The mouse follows the pointer on motion values: no re-render per movement
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [button, setButton] = useState<"left" | "right" | null>(null);
    // A tap-to-click (or a two-finger tap) is down and up within milliseconds,
    // too quick to see: the mouse's button stays lit a moment either way
    const buttonAt = useRef(0);
    const buttonTimer = useRef(0);
    const pressButton = useCallback((b: number) => {
        if (b !== 0 && b !== 2) return;
        window.clearTimeout(buttonTimer.current);
        buttonAt.current = Date.now();
        setButton(b === 2 ? "right" : "left");
    }, []);
    const releaseButton = useCallback(() => {
        window.clearTimeout(buttonTimer.current);
        buttonTimer.current = window.setTimeout(() => setButton(null), Math.max(0, 220 - (Date.now() - buttonAt.current)));
    }, []);
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
        noteId.current = 3;
        setNotes([
            { id: 3, app: "Desk", text: "Type desk in the terminal to see what this desk can do", icon: "🖥️" },
            { id: 2, app: "Desk", text: "Plug a drive from the stand into the tower", icon: "🔌" },
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
            else if (d.type === "quack") {
                playQuack();
                setQuack((q) => q + 1);
            } else if (d.type === "selfie-open" || d.type === "selfie-snap") {
                const reply = (r: { art: string } | { error: string } | { ready: true }) => {
                    try {
                        (frameRef.current?.contentWindow as TermWindow | null)?.deskSelfie?.(r as { art: string });
                    } catch {
                        /* ignore */
                    }
                };
                const off = () => {
                    window.clearTimeout(camTimer.current);
                    closeCamera(cam.current);
                    cam.current = null;
                    setCamLive(false);
                };
                if (d.type === "selfie-open") {
                    off();
                    openCamera().then((c) => {
                        if ("error" in c) return reply({ error: c.error });
                        cam.current = c;
                        setCamLive(true);
                        // never left on: off again if the countdown is abandoned
                        camTimer.current = window.setTimeout(off, 15000);
                        reply({ ready: true });
                    });
                } else {
                    const art = cam.current ? asciiFrame(cam.current.video) : null;
                    off();
                    if (!art) return reply({ error: "failed" });
                    playShutter();
                    setFlash((f) => f + 1);
                    pushNote("Camera", "Selfie taken · printed in the terminal, never uploaded", "📸");
                    reply({ art });
                }
            }
            else if (d.type === "unmount" || d.type === "mounted") {
                const label = (d as { label?: string }).label || "";
                setUnmounted((u) => {
                    const n = new Set(u);
                    if (d.type === "unmount") n.add(label);
                    else n.delete(label);
                    return n;
                });
                if (d.type === "unmount") pushNote(label === "TIMECAPSULE" ? "Time Capsule" : "USB drive", `${label === "ALIEN" ? "?????" : label} unmounted · safe to remove`, "⏏️");
            } else if (d.type === "eject") {
                const label = (d as { label?: string }).label;
                setUnmounted((u) => {
                    const n = new Set(u);
                    n.delete(label || "");
                    return n;
                });
                playUsbOut();
                if (label === "TIMECAPSULE") {
                    setHdd(false);
                    pushNote("Time Capsule", "Disconnected", "⏏️");
                    return;
                }
                const was = pluggedRef.current.find((p) => p.stick.term === label);
                setPlugged((ps) => ps.filter((p) => p.stick.term !== label));
                if (was) pushNote("USB drive", `${was.stick.label || "?????"} ejected`, "⏏️");
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
        w.addEventListener("mousemove", (e) => {
            mouseX.set((Math.min(1, Math.max(0, e.clientX / w.innerWidth)) - 0.5) * 60);
            mouseY.set((Math.min(1, Math.max(0, e.clientY / w.innerHeight)) - 0.5) * 44);
        });
        w.addEventListener("mousedown", (e) => pressButton(e.button));
        w.addEventListener("mouseup", releaseButton);
        w.addEventListener("wheel", () => setWheel((n) => n + 1), { passive: true });
        const overlay = d.getElementById("start-overlay");
        if (overlay) {
            const check = () => setOn(overlay.style.display === "none");
            check();
            new MutationObserver(check).observe(overlay, { attributes: true, attributeFilter: ["style"] });
        }
    };

    // Clicks on the desk itself show on the mouse too, as those in the display do
    useEffect(() => {
        if (!big) return;
        const down = (e: MouseEvent) => pressButton(e.button);
        window.addEventListener("mousedown", down);
        window.addEventListener("mouseup", releaseButton);
        return () => {
            window.removeEventListener("mousedown", down);
            window.removeEventListener("mouseup", releaseButton);
            window.clearTimeout(buttonTimer.current);
        };
    }, [big, pressButton, releaseButton]);

    // Typing while the desk itself has focus goes to the terminal
    useEffect(() => {
        if (!big) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && full) {
                setFull(false);
                return;
            }
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            // typing into the phone's Messages stays there
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
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

    // The terminal's screensaver counts only what happens inside the display.
    // Activity anywhere on the desk is passed on (a few times a second, at
    // most), so it waits for 30 seconds of the visitor doing nothing at all
    useEffect(() => {
        if (!big) return;
        let last = 0;
        const pass = () => {
            const now = Date.now();
            if (now - last < 400) return;
            last = now;
            try {
                frameRef.current?.contentWindow?.dispatchEvent(new Event("pointermove"));
            } catch {
                /* ignore */
            }
        };
        const events = ["pointermove", "pointerdown", "keydown", "wheel"] as const;
        events.forEach((e) => window.addEventListener(e, pass, { passive: true }));
        return () => events.forEach((e) => window.removeEventListener(e, pass));
    }, [big]);

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
        const now = pluggedRef.current;
        if (now.some((p) => p.stick.id === stick.id)) return;
        // Both ports taken: the older drive comes out to make room
        let port: 0 | 1 = now.some((p) => p.port === 0) ? 1 : 0;
        if (now.length >= 2) {
            const oldest = now[0];
            port = oldest.port;
            setPlugged((ps) => ps.filter((p) => p !== oldest));
            term()?.deskEject?.(oldest.stick.term);
        }
        playUsbIn();
        setPlugged((ps) => [...ps.filter((p) => p.port !== port), { stick, port }]);
        setAsleep(false);
        pushNote("USB drive", `${stick.label || "?????"} connected`, "🔌");
        whenReady(() => {
            term()?.deskMount?.(stick.term);
            refocus();
        });
    };
    const pull = (stick: Stick) => whenReady(() => {
        term()?.deskEject?.((stick as (typeof STICKS)[number]).term);
        refocus();
    });
    // The hard drive: on its cable already, so a click connects or disconnects it
    const toggleHdd = () => {
        if (hdd) {
            whenReady(() => {
                term()?.deskEject?.("TIMECAPSULE");
                refocus();
            });
            return;
        }
        playUsbIn();
        setHdd(true);
        setAsleep(false);
        pushNote("Time Capsule", "2 TB connected · spinning up", "💽");
        whenReady(() => {
            term()?.deskMount?.("TIMECAPSULE");
            refocus();
        });
    };
    const overPort = (x: number, y: number) => {
        const r = portRef.current?.getBoundingClientRect();
        return !!r && x > r.left - 60 && x < r.right + 60 && y > r.top - 70 && y < r.bottom + 50;
    };
    const dragStart = (e: React.PointerEvent, stick: (typeof STICKS)[number]) => {
        if (pluggedRef.current.some((p) => p.stick.id === stick.id)) return;
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


    // ---- the plant, the chai, the drawer, the duck, the webcam, music ---------------
    // The plant grows a stage each visit (once a session), and a stage for each
    // day it is watered; a week without a visit and it droops until watered
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(PLANT_KEY) || "null") as { visits: number; last: number; waterings: number; wateredOn: string; droop: boolean } | null;
            const data = saved ?? { visits: 0, last: 0, waterings: 0, wateredOn: "", droop: false };
            if (!sessionStorage.getItem("desk-plant-counted")) {
                sessionStorage.setItem("desk-plant-counted", "1");
                if (data.last && Date.now() - data.last > 7 * 86400000) data.droop = true;
                data.visits += 1;
                data.last = Date.now();
                localStorage.setItem(PLANT_KEY, JSON.stringify(data));
            }
            setPlant({ stage: 1 + data.visits + data.waterings, droop: data.droop, watered: 0, visits: data.visits });
            setFragment(localStorage.getItem(FRAGMENT_KEY) !== "1");
        } catch {
            /* storage unavailable: a plant for today only */
        }
    }, []);
    const water = () => {
        setPouring(true);
        playPour();
        window.setTimeout(() => setGlassFull(false), 700);
        window.setTimeout(() => setPouring(false), 1300);
        // someone refills it
        window.setTimeout(() => setGlassFull(true), 8000);
        let grew = false;
        try {
            const data = JSON.parse(localStorage.getItem(PLANT_KEY) || "null") ?? { visits: 1, last: Date.now(), waterings: 0, wateredOn: "", droop: false };
            const today = new Date().toDateString();
            if (data.wateredOn !== today) {
                data.waterings += 1;
                data.wateredOn = today;
                grew = true;
            }
            data.droop = false;
            localStorage.setItem(PLANT_KEY, JSON.stringify(data));
            setPlant((p) => ({ ...p, stage: 1 + data.visits + data.waterings, droop: false, watered: p.watered + 1 }));
        } catch {
            setPlant((p) => ({ ...p, droop: false, watered: p.watered + 1 }));
        }
        window.setTimeout(() => {
            pushNote("Plant", grew ? "Watered. It grew a little" : "Watered already today. It is happy", "🪴");
            plantSay(grew ? "Ahh, water. I grew a little 🌱" : "Already watered today. Thank you!");
        }, 900);
    };
    // The chai's level is kept between visits: a reload is not a fresh cup.
    // Away for an hour or more at chai-time, though, and there is a new one
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(CHAI_KEY) || "null") as { level: number; at: number } | null;
            if (saved && Number.isFinite(saved.level)) {
                const stale = Date.now() - saved.at > 3600000;
                setChai(stale && isChaiTime() ? 4 : Math.max(0, Math.min(4, saved.level)));
            }
        } catch {
            /* ignore */
        }
        setChaiLoaded(true);
    }, []);
    useEffect(() => {
        if (!chaiLoaded) return;
        try {
            localStorage.setItem(CHAI_KEY, JSON.stringify({ level: chai, at: Date.now() }));
        } catch {
            /* ignore */
        }
    }, [chai, chaiLoaded]);
    // Empty at chai-time: a fresh cup, a few seconds later
    useEffect(() => {
        if (chai > 0 || !hot) return;
        const id = window.setTimeout(() => {
            playPour();
            setChai(4);
            pushNote("Chai", "Fresh cup poured. It is chai-time in Kolkata", "☕");
        }, 4000);
        return () => window.clearTimeout(id);
    }, [chai, hot, pushNote]);
    // A sip; empty, it waits for chai-time
    const sip = () => {
        if (chai <= 0) {
            pushNote("Chai", hot ? "Pouring a fresh cup…" : "Empty. Brew later: chai-time in Kolkata is morning and evening", "☕");
            return;
        }
        playSip();
        const left = chai - 1;
        setChai(left);
        if (!hot && left === 3) pushNote("Chai", "Stone cold. Miit forgot this one hours ago", "🧊");
        if (left === 0 && !hot) pushNote("Chai", "Empty. Brew later: chai-time in Kolkata is morning and evening", "☕");
    };
    // Click the mug to sip. Drag the glass of water onto the plant to water it;
    // the mug, the plant turns down
    const overThePlant = (x: number, y: number) => {
        const r = plantRef.current?.getBoundingClientRect();
        return !!r && x > r.left - 30 && x < r.right + 30 && y > r.top - 30 && y < r.bottom + 20;
    };
    const mugDown = (e: React.PointerEvent) => {
        const x0 = e.clientX;
        const y0 = e.clientY;
        let moved = false;
        const move = (ev: PointerEvent) => {
            const dx = (ev.clientX - x0) / view.s;
            const dy = (ev.clientY - y0) / view.s;
            if (Math.hypot(dx, dy) > 5) moved = true;
            if (moved) {
                setMugDrag({ dx, dy });
                setOverPlant(overThePlant(ev.clientX, ev.clientY));
            }
        };
        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            setMugDrag(null);
            setOverPlant(false);
            if (!moved) return sip();
            if (overThePlant(ev.clientX, ev.clientY)) {
                setRustle((r) => r + 1);
                plantSay("Chai?! I'm a plant 😭 Water, please: the glass behind the mug");
            }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };
    const glassDown = (e: React.PointerEvent) => {
        if (pouring) return;
        const x0 = e.clientX;
        const y0 = e.clientY;
        let moved = false;
        const move = (ev: PointerEvent) => {
            const dx = (ev.clientX - x0) / view.s;
            const dy = (ev.clientY - y0) / view.s;
            if (Math.hypot(dx, dy) > 5) moved = true;
            if (moved) {
                setGlassDrag({ dx, dy });
                setOverPlant(overThePlant(ev.clientX, ev.clientY));
            }
        };
        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            setGlassDrag(null);
            setOverPlant(false);
            if (!moved) return plantSay(glassFull ? "Water! Drag the glass over to me 💧" : "Being refilled. Back in a moment");
            if (overThePlant(ev.clientX, ev.clientY)) {
                if (glassFull) water();
                else plantSay("That glass is empty… it is being refilled");
            }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };
    const toggleMusic = (want: boolean) => {
        if (want) setMusic(playMusic());
        else {
            stopMusic();
            setMusic(false);
        }
    };
    useEffect(() => () => stopMusic(), []);
    useEffect(
        () => () => {
            window.clearTimeout(camTimer.current);
            closeCamera(cam.current);
        },
        [],
    );
    const openDrawer = () => {
        playDrawer(!drawer);
        setDrawer((d) => !d);
    };
    // The drawer's fragment counts on the main page: it reads this and hands
    // over a fragment there (components/ui/collectibles.tsx)
    const takeFragment = () => {
        playSparkle();
        setFragment(false);
        try {
            localStorage.setItem(FRAGMENT_KEY, "1");
        } catch {
            /* ignore */
        }
        pushNote("Cosmic fragment", "Pocketed. It counts toward the hunt on the main page", "✦");
    };
    const askDuck = () => {
        playQuack();
        setQuack((q) => q + 1);
        whenReady(() => {
            term()?.runCommandFromClick?.("duck");
            refocus();
        });
    };
    const selfie = () => {
        if (camLive) return;
        whenReady(() => {
            term()?.runCommandFromClick?.("selfie");
            refocus();
        });
    };

    // ---- small screens: the terminal on its own -------------------------------
    if (big === false) {
        return src ? <iframe src={src} title="Terminal" className="fixed inset-0 h-full w-full border-0 bg-black" /> : null;
    }

    const glow = game ? tint : busy ? `${tint}99` : "transparent";

    return (
        <main className="fixed inset-0 select-none overflow-hidden bg-[#03040a] text-white">
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

                {/* the desk, floating: its surface tilted away, with what lies flat on it */}
                <div
                    className="absolute"
                    style={{
                        left: SURFACE.x,
                        top: SURFACE.front - SURFACE.d,
                        width: SURFACE.w,
                        height: SURFACE.d,
                        transformOrigin: "50% 100%",
                        transform: `perspective(${SURFACE.perspective}px) rotateX(${SURFACE.tilt}deg)`,
                    }}
                >
                    <div
                        aria-hidden
                        className="absolute inset-0 rounded-[20px]"
                        style={{ background: "linear-gradient(180deg, #121419 0%, #1a1d24 70%, #20242c 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
                    />
                    <div aria-hidden className="absolute inset-x-[20px] top-0 h-[2px] bg-gradient-to-r from-transparent via-teal-300/20 to-transparent" />
                    {/* a felt desk mat under the keyboard and mouse */}
                    <div aria-hidden className="absolute rounded-[14px]" style={{ left: 420, top: 62, width: 780, height: 210, background: "linear-gradient(180deg, #1f2937, #273244)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
                    <Keyboard pressed={pressed} tint={tint} />
                    <Mouse x={mouseX} y={mouseY} button={button} wheel={wheel} tint={tint} />
                </div>
                {/* its front edge */}
                <div
                    aria-hidden
                    className="absolute rounded-b-[14px]"
                    style={{ left: SURFACE.x, top: SURFACE.front, width: SURFACE.w, height: 48, background: "linear-gradient(180deg, #2a2e37 0%, #15171c 30%, #0b0c10 100%)", boxShadow: "0 60px 120px -40px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.12)" }}
                />

                <Display asleep={asleep} glow={glow} />
                <Webcam live={camLive} onClick={selfie} />
                <Tower ref={portRef} level={level} tint={tint} on={on} asleep={asleep} plugged={plugged} unmounted={unmounted} onPower={power} onPull={pull} hdd={hdd} />
                <Duck quack={quack} onClick={askDuck} />
                <HardDrive on={hdd} idle={unmounted.has("TIMECAPSULE")} busy={hdd && busy && !unmounted.has("TIMECAPSULE")} onClick={toggleHdd} />
                <div
                    ref={plantRef}
                    role="button"
                    tabIndex={0}
                    aria-label="The plant. Drag the glass of water onto it to water it"
                    className="absolute cursor-pointer"
                    style={{ left: PLANT.x, top: PLANT.y }}
                    title="Drag the glass of water onto the plant to water it"
                    onClick={() => {
                        setRustle((r) => r + 1);
                        plantSay(plant.droop ? "Thirsty… drag the glass of water onto me 💧" : `Visit ${plant.visits}, and still growing. Drag the glass of water onto me`);
                    }}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && plantSay("Drag the glass of water onto me 💧")}
                >
                    {/* lit up as a drop target while the mug is being carried */}
                    <AnimatePresence>
                        {glassDrag && (
                            <motion.span
                                aria-hidden
                                className="pointer-events-none absolute left-[-5px] top-[100px] block h-[80px] w-[130px] rounded-full"
                                style={{ background: "radial-gradient(closest-side, rgba(74,222,128,0.35), transparent)" }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: overPlant ? 1 : 0.45, scale: overPlant ? 1.15 : 1 }}
                                exit={{ opacity: 0 }}
                            />
                        )}
                    </AnimatePresence>
                    <motion.div key={rustle} style={{ originY: 1 }} animate={rustle ? { rotate: [0, -4, 3, -2, 0] } : undefined} transition={{ duration: 0.6 }}>
                        <Plant stage={plant.stage} droop={plant.droop} watered={plant.watered} />
                    </motion.div>
                    <AnimatePresence>
                        {(plantSays || glassDrag || (mugDrag && overPlant)) && (
                            <motion.span
                                key={glassDrag ? "drop" : mugDrag ? "chai" : plantSays?.n}
                                className="pointer-events-none absolute bottom-[172px] right-[-10px] block w-max max-w-[190px] rounded-[12px] rounded-br-[3px] bg-white px-3 py-1.5 text-[12px] leading-snug text-neutral-900 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.8)]"
                                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4 }}
                            >
                                {glassDrag ? (overPlant ? "Let go to water me 💧" : "Over here! 🌱") : mugDrag ? "Is that… chai? 😳" : plantSays?.text}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* the drives, standing in a block */}
                <div className="absolute" style={{ left: 96, top: 700, width: 220, height: 78 }}>
                    <div aria-hidden className="absolute inset-x-0 rounded-[8px]" style={{ top: 44, height: 12, background: "linear-gradient(180deg, #4b5058, #2d3036)" }} />
                    {STICKS.map((st, i) => {
                        const d = drag?.id === st.id ? drag : null;
                        const out = plugged.some((p) => p.stick.id === st.id);
                        return (
                            <button
                                key={st.id}
                                type="button"
                                onPointerDown={(e) => dragStart(e, st)}
                                aria-label={`${st.alien ? "An unlabelled drive with an alien sticker" : `${st.label} drive`}. Plug it into the tower`}
                                title={st.alien ? "An unlabelled drive" : `${st.label}: drag it to the tower, or tap`}
                                className="absolute cursor-grab touch-none active:cursor-grabbing"
                                style={{
                                    left: 13 + i * 34,
                                    top: -2,
                                    opacity: out ? 0.15 : 1,
                                    transform: d ? `translate(${d.dx}px, ${d.dy}px) scale(1.12)` : undefined,
                                    transition: d ? "none" : "transform 0.3s ease",
                                    zIndex: d ? 50 : 1,
                                }}
                            >
                                <StickArt stick={st} upright />
                            </button>
                        );
                    })}
                    {/* the block's front, hiding the sticks' feet */}
                    <div aria-hidden className="absolute inset-x-0 bottom-0 z-[2] rounded-b-[8px] rounded-t-[3px]" style={{ top: 51, background: "linear-gradient(180deg, #3a3e46, #1c1e23)", boxShadow: "0 12px 18px -8px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
                        <span className="absolute inset-x-0 bottom-[8px] text-center font-mono text-[7px] uppercase tracking-[0.3em] text-neutral-500">drag to the tower</span>
                    </div>
                </div>

                {/* the plant's glass of water: drag it onto the plant */}
                <motion.div
                    role="button"
                    tabIndex={0}
                    aria-label={glassFull ? "A glass of water. Drag it onto the plant to water it" : "An empty glass, being refilled"}
                    title={glassFull ? "Water, for the plant: drag it over" : "Being refilled"}
                    onPointerDown={glassDown}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && glassFull && water()}
                    className="absolute z-20 cursor-grab touch-none active:cursor-grabbing"
                    style={{ left: GLASS.x, top: GLASS.y }}
                    animate={pouring ? { x: POUR.x - GLASS.x, y: POUR.y - GLASS.y, rotate: 62 } : glassDrag ? { x: glassDrag.dx, y: glassDrag.dy, rotate: 0 } : { x: 0, y: 0, rotate: 0 }}
                    transition={glassDrag ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24 }}
                >
                    <WaterGlass full={glassFull} />
                    {/* the pour */}
                    <AnimatePresence>
                        {pouring && (
                            <motion.span
                                className="pointer-events-none absolute block w-[4px] origin-top rounded-full bg-sky-300/80"
                                style={{ left: 32, top: 6, height: 64, rotate: -62 }}
                                initial={{ scaleY: 0, opacity: 0 }}
                                animate={{ scaleY: 1, opacity: 0.9 }}
                                exit={{ scaleY: 0, opacity: 0 }}
                                transition={{ delay: 0.35, duration: 0.25 }}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* chai: click to sip */}
                <motion.div
                    role="button"
                    tabIndex={0}
                    aria-label={chai > 0 ? "The mug of chai. Click to sip" : "An empty mug"}
                    title={chai > 0 ? (hot ? "Chai · click to sip" : "Chai, long gone cold · click to sip") : hot ? "Empty · refilling" : "Empty · brew later"}
                    onPointerDown={mugDown}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && sip()}
                    className="absolute z-20 cursor-grab touch-none active:cursor-grabbing"
                    style={{ left: MUG.x, top: MUG.y }}
                    animate={mugDrag ? { x: mugDrag.dx, y: mugDrag.dy } : { x: 0, y: 0 }}
                    transition={mugDrag ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24 }}
                >
                    <Mug level={chai} hot={hot} pouring={false} />
                </motion.div>

                <Drawer
                    open={drawer}
                    onToggle={openDrawer}
                    fragment={fragment}
                    onFragment={takeFragment}
                />
                <Phone ref={phoneRef} notes={notes} airdrop={airdrop} music={music} onMusic={toggleMusic} onSigned={(name, message) => pushNote("Guestbook", `${name}: ${message}`, "✍️")} onDismiss={(id) => setNotes((ns) => ns.filter((n) => n.id !== id))} />
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
                <button type="button" aria-label="Wake the display" onClick={power} className="absolute z-40 overflow-hidden bg-black" style={screenRect}>
                    <Life tint={tint} />
                    <span className="relative rounded bg-black/70 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-500">asleep · tap to wake</span>
                </button>
            )}
            {/* the camera's flash, over the screen */}
            <AnimatePresence>
                {flash > 0 && (
                    <motion.div
                        key={flash}
                        aria-hidden
                        className="pointer-events-none absolute z-40 bg-white"
                        style={screenRect}
                        initial={{ opacity: 0.85 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    />
                )}
            </AnimatePresence>
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
