"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// More of the terminal desk (desk.tsx), in the scene's design units:
//   Duck      a rubber duck: explain the bug to it, in the terminal
//   Webcam    on top of the display; one frame, turned into characters
//   Drawer    in the desk's front edge, with a few things left in it
//   Life      Conway's Game of Life, on the display while it sleeps

// ---- Rubber duck ------------------------------------------------------------

export function Duck({ quack, onClick }: { quack: number; onClick: () => void }) {
    const reduce = useReducedMotion();
    return (
        <motion.button
            type="button"
            onClick={onClick}
            aria-label="The rubber duck. Explain your bug to it"
            title="Rubber duck: explain your bug to it"
            className="absolute block"
            style={{ left: 496, top: 610, width: 62, height: 58, originY: 1 }}
            key={quack}
            animate={reduce || !quack ? undefined : { scaleY: [1, 0.86, 1.08, 1], rotate: [0, -6, 4, 0] }}
            transition={{ duration: 0.45 }}
        >
            <svg width="62" height="58" viewBox="0 0 62 58" aria-hidden className="block overflow-visible drop-shadow-[0_8px_6px_rgba(0,0,0,0.5)]">
                <defs>
                    <radialGradient id="duckBody" cx="0.4" cy="0.3" r="0.8">
                        <stop offset="0" stopColor="#fef9c3" />
                        <stop offset="0.45" stopColor="#facc15" />
                        <stop offset="1" stopColor="#ca8a04" />
                    </radialGradient>
                </defs>
                {/* the body, and its tail */}
                <path d="M 6 36 C 2 26, 8 20, 14 26 C 20 30, 40 28, 52 30 C 60 32, 60 50, 48 54 C 36 58, 14 58, 8 50 C 5 46, 5 40, 6 36 Z" fill="url(#duckBody)" />
                {/* the wing */}
                <path d="M 20 38 C 26 34, 38 34, 42 40 C 38 46, 26 46, 20 38 Z" fill="#eab308" opacity="0.8" />
                {/* the head, the beak, an eye that looks at you */}
                <circle cx="42" cy="18" r="13" fill="url(#duckBody)" />
                <path d="M 50 20 C 58 18, 62 21, 60 24 C 57 27, 51 26, 49 24 Z" fill="#f97316" />
                <circle cx="45" cy="14" r="2.6" fill="#111827" />
                <circle cx="45.8" cy="13.2" r="0.9" fill="#fff" />
            </svg>
        </motion.button>
    );
}

// ---- Webcam -----------------------------------------------------------------

export function Webcam({ live, onClick }: { live: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="The webcam. Take an ASCII selfie in the terminal"
            title="Webcam: an ASCII selfie, made in your browser and never uploaded"
            className="absolute flex items-center justify-center gap-[6px] rounded-t-[8px] rounded-b-[4px]"
            style={{ left: 690, top: 20, width: 60, height: 20, background: "linear-gradient(180deg, #2a2d33, #0e0f12)", boxShadow: "0 3px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)" }}
        >
            <span className="block h-[10px] w-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #60a5fa 0 12%, #1e1b4b 30%, #000 70%)", boxShadow: "0 0 0 2px #1f2227" }} />
            <span className="block h-[4px] w-[4px] rounded-full" style={{ background: live ? "#22c55e" : "#3f3f46", boxShadow: live ? "0 0 6px #22c55e" : "none" }} />
        </button>
    );
}

/** One frame from the camera, as rows of characters. The picture stays here. */
export async function asciiSelfie(): Promise<{ art: string } | { error: "denied" | "none" | "failed" }> {
    let stream: MediaStream | null = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" }, audio: false });
    } catch (e) {
        const name = (e as { name?: string })?.name;
        return { error: name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "none" : "failed" };
    }
    try {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        // a moment for the exposure to settle
        await new Promise((r) => window.setTimeout(r, 700));
        const cols = 96;
        const vw = video.videoWidth || 320;
        const vh = video.videoHeight || 240;
        // characters are about twice as tall as they are wide
        const rows = Math.round((cols * vh) / vw / 1.25);
        const c = document.createElement("canvas");
        c.width = cols;
        c.height = rows;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return { error: "failed" };
        // mirrored, as a selfie is
        ctx.translate(cols, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, cols, rows);
        const px = ctx.getImageData(0, 0, cols, rows).data;
        // stretch the contrast to what the frame actually has
        const lum: number[] = [];
        let lo = 255;
        let hi = 0;
        for (let i = 0; i < px.length; i += 4) {
            const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            lum.push(l);
            lo = Math.min(lo, l);
            hi = Math.max(hi, l);
        }
        const RAMP = " .:-=+*#%@";
        const span = Math.max(1, hi - lo);
        let art = "";
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const v = (lum[y * cols + x] - lo) / span;
                art += RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
            }
            art += "\n";
        }
        return { art: art.trimEnd() };
    } catch {
        return { error: "failed" };
    } finally {
        stream.getTracks().forEach((t) => t.stop());
    }
}

// ---- The desk drawer --------------------------------------------------------

export const DRAWER = { x: 590, y: 796, w: 260, h: 36 };
const PULL = 58;

function FloppyArt({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 46 46" aria-hidden className="block drop-shadow-[0_3px_3px_rgba(0,0,0,0.7)]">
            <path d="M 2 4 Q 2 2 4 2 H 40 L 44 6 V 42 Q 44 44 42 44 H 4 Q 2 44 2 42 Z" fill="#1f3b73" />
            <rect x="12" y="2" width="22" height="13" rx="1" fill="#cbd5e1" />
            <rect x="26" y="4" width="5" height="9" fill="#1f3b73" />
            <rect x="8" y="22" width="30" height="20" rx="1.5" fill="#f8fafc" />
            <text x="23" y="31" textAnchor="middle" fontSize="5" fontFamily="ui-monospace, monospace" fill="#1e293b" fontWeight="700">
                RESUME
            </text>
            <text x="23" y="38" textAnchor="middle" fontSize="3.6" fontFamily="ui-monospace, monospace" fill="#64748b">
                MIIT-DOS 6.22
            </text>
        </svg>
    );
}

function NoteArt({ big }: { big?: boolean }) {
    return (
        <span
            className={`flex flex-col items-center justify-center bg-[#fde68a] font-mono font-bold text-[#78350f] shadow-[0_3px_4px_rgba(0,0,0,0.6)] ${big ? "h-[120px] w-[130px] text-[20px] leading-[28px]" : "h-[44px] w-[48px] text-[8px] leading-[10px]"}`}
        >
            <span>↑↑↓↓</span>
            <span>←→←→</span>
            <span>B A</span>
        </span>
    );
}

// Picked up out of the drawer: the thing up close, what it is, and where it leads
function Held({ what, onClose }: { what: "floppy" | "note"; onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
        window.addEventListener("keydown", onKey);
        // after the click that picked it up
        const id = window.setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("pointerdown", onDown);
        };
    }, [onClose]);
    const floppy = what === "floppy";
    return (
        <motion.div
            ref={ref}
            role="dialog"
            aria-label={floppy ? "A floppy disk" : "A sticky note"}
            className="absolute left-1/2 z-40 flex w-[340px] items-center gap-4 rounded-[16px] border border-white/10 bg-[#0d1017]/95 p-4 text-left shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)] backdrop-blur"
            style={{ bottom: DRAWER.h + PULL + 14, x: "-50%" }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
        >
            <motion.span className="shrink-0" initial={{ rotate: floppy ? -8 : 5 }} animate={{ rotate: floppy ? -3 : 2 }}>
                {floppy ? <FloppyArt size={112} /> : <NoteArt big />}
            </motion.span>
            <span className="flex min-w-0 flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal-300/80">{floppy ? "3.5-inch floppy" : "sticky note"}</span>
                <span className="text-[13px] leading-snug text-neutral-200">
                    {floppy
                        ? "Nothing on this desk can read it any more. The beige computer on the resume page still can."
                        : "Type it anywhere on the main page. Something big happens."}
                </span>
                <span className="flex flex-wrap gap-2">
                    <a
                        href={floppy ? "/resume" : "/"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-teal-400/90 px-3 py-1 text-[12px] font-medium text-black transition-colors hover:bg-teal-300"
                    >
                        {floppy ? "Open the resume page ↗" : "Open the main page ↗"}
                    </a>
                    <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-neutral-300 transition-colors hover:text-white">
                        Put it back
                    </button>
                </span>
            </span>
        </motion.div>
    );
}

export function Drawer({
    open,
    onToggle,
    fragment,
    onFragment,
}: {
    open: boolean;
    onToggle: () => void;
    fragment: boolean;
    onFragment: (at: { x: number; y: number }) => void;
}) {
    const [held, setHeld] = useState<"floppy" | "note" | null>(null);
    const putBack = useCallback(() => setHeld(null), []);
    useEffect(() => {
        if (!open) setHeld(null);
    }, [open]);
    return (
        <div className="absolute" style={{ left: DRAWER.x, top: DRAWER.y, width: DRAWER.w, height: DRAWER.h + PULL }}>
            <AnimatePresence>{held && <Held key={held} what={held} onClose={putBack} />}</AnimatePresence>
            {/* the drawer's inside, seen from above as it comes out */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute inset-x-0 top-0 overflow-hidden rounded-[3px]"
                        style={{ background: "linear-gradient(180deg, #0b0c10, #1d2027)", boxShadow: "inset 0 6px 10px rgba(0,0,0,0.8), inset 6px 0 6px -4px rgba(0,0,0,0.6), inset -6px 0 6px -4px rgba(0,0,0,0.6)" }}
                        initial={{ height: 0 }}
                        animate={{ height: PULL + 4 }}
                        exit={{ height: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <div className="absolute inset-0 flex items-center justify-around px-4">
                            {/* a floppy, from the resume page's computer */}
                            <button
                                type="button"
                                onClick={() => setHeld("floppy")}
                                aria-label="A floppy disk. Pick it up"
                                title="A floppy disk: pick it up"
                                className="block"
                                style={{ transform: "rotate(-8deg) scaleY(0.72)", opacity: held === "floppy" ? 0 : 1 }}
                            >
                                <FloppyArt size={46} />
                            </button>
                            {/* a sticky note, with the keys on it */}
                            <button
                                type="button"
                                onClick={() => setHeld("note")}
                                aria-label="A sticky note with arrow keys written on it. Pick it up"
                                title="A sticky note: pick it up"
                                className="block"
                                style={{ transform: "rotate(5deg) scaleY(0.72)", opacity: held === "note" ? 0 : 1 }}
                            >
                                <NoteArt />
                            </button>
                            {/* a cosmic fragment, until it is pocketed */}
                            {fragment ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        const r = e.currentTarget.getBoundingClientRect();
                                        onFragment({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                                    }}
                                    aria-label="A glowing cosmic fragment. Take it"
                                    title="A cosmic fragment: take it"
                                    className="flex h-[40px] w-[40px] items-center justify-center"
                                >
                                    <motion.span
                                        className="block h-[16px] w-[16px] rounded-[3px] bg-gradient-to-br from-teal-100 to-teal-500"
                                        style={{ boxShadow: "0 0 16px rgba(45,212,191,0.9)" }}
                                        animate={{ rotate: [45, 60, 45], scaleY: [0.72, 0.8, 0.72] }}
                                        transition={{ duration: 2.4, repeat: Infinity }}
                                    />
                                </button>
                            ) : (
                                <span className="block h-[40px] w-[40px]" title="Something was here" />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* the drawer's front, with its handle */}
            <motion.button
                type="button"
                onClick={onToggle}
                aria-label={open ? "Close the drawer" : "Open the drawer"}
                title={open ? "Close the drawer" : "Open the drawer"}
                className="absolute inset-x-0 top-0 rounded-[4px]"
                style={{ height: DRAWER.h, background: "linear-gradient(180deg, #23262e, #16181d)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(0,0,0,0.5)" }}
                animate={{ y: open ? PULL : 0, scale: open ? 1.03 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <span className="absolute left-1/2 top-1/2 block h-[6px] w-[70px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "linear-gradient(180deg, #e5e7eb, #8b9099)", boxShadow: "0 2px 3px rgba(0,0,0,0.7)" }} />
            </motion.button>
        </div>
    );
}

// ---- Game of Life -------------------------------------------------------------

/** Conway's Game of Life, dim in the terminal's colour, for the sleeping display.
 * It reseeds itself when the board settles or dies out. */
export function Life({ tint }: { tint: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const reduce = useReducedMotion();
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const CELL = 9;
        let cols = 0;
        let rows = 0;
        let grid = new Uint8Array(0);
        let age = new Uint16Array(0);
        let seen: string[] = [];
        let gens = 0;
        const seed = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cols = Math.max(1, Math.floor(canvas.clientWidth / CELL));
            rows = Math.max(1, Math.floor(canvas.clientHeight / CELL));
            grid = new Uint8Array(cols * rows);
            age = new Uint16Array(cols * rows);
            for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.22 ? 1 : 0;
            seen = [];
            gens = 0;
        };
        const step = () => {
            const next = new Uint8Array(cols * rows);
            let alive = 0;
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    let n = 0;
                    for (let dy = -1; dy <= 1; dy++)
                        for (let dx = -1; dx <= 1; dx++) {
                            if (!dx && !dy) continue;
                            // the board wraps round at its edges
                            n += grid[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
                        }
                    const i = y * cols + x;
                    const on = grid[i] ? n === 2 || n === 3 : n === 3;
                    next[i] = on ? 1 : 0;
                    age[i] = on ? Math.min(age[i] + 1, 999) : 0;
                    alive += next[i];
                }
            }
            grid = next;
            gens++;
            // settled into a loop, or nearly empty: start again
            const sig = `${alive}:${grid.slice(0, 64).join("")}`;
            if (alive < cols * rows * 0.02 || seen.includes(sig) || gens > 1500) seed();
            else seen = [...seen.slice(-11), sig];
        };
        const draw = () => {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
            ctx.fillStyle = tint;
            for (let i = 0; i < grid.length; i++) {
                if (!grid[i]) continue;
                // newborn cells brightest, settling as they age
                ctx.globalAlpha = age[i] < 2 ? 0.7 : age[i] < 8 ? 0.42 : 0.24;
                ctx.fillRect((i % cols) * CELL + 1, Math.floor(i / cols) * CELL + 1, CELL - 2, CELL - 2);
            }
            ctx.globalAlpha = 1;
        };
        seed();
        draw();
        const ro = new ResizeObserver(() => {
            seed();
            draw();
        });
        ro.observe(canvas);
        const id = reduce
            ? 0
            : window.setInterval(() => {
                  step();
                  draw();
              }, 140);
        return () => {
            window.clearInterval(id);
            ro.disconnect();
        };
    }, [tint, reduce]);
    return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
