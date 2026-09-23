"use client";
import { forwardRef, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { kolkataNow } from "@/lib/kolkata";

// The terminal desk's props (desk.tsx), drawn in the scene's design units
// (1440 x 900). The display and tower are shaped after a pro desktop's: a thin
// black bezel in an aluminium edge, and a tower with a lattice front and a
// handle frame. No logos or names.

const ALU = "linear-gradient(180deg, #eef0f3 0%, #cfd3d9 45%, #b3b8c0 100%)";
const ALU_SIDE = "linear-gradient(90deg, #a9aeb6, #e3e6ea 30%, #f2f3f5 55%, #c4c8ce 100%)";

// ---- Display ---------------------------------------------------------------

export const DISPLAY = { x: 300, y: 36, w: 840, h: 520 };
const RIM = 5;
const BEZEL = 14;
/** Where the terminal shows, in design units */
export const SCREEN = { x: DISPLAY.x + RIM + BEZEL, y: DISPLAY.y + RIM + BEZEL, w: DISPLAY.w - 2 * (RIM + BEZEL), h: DISPLAY.h - 2 * (RIM + BEZEL) };

export function Display({ asleep, glow }: { asleep: boolean; glow: string }) {
    return (
        <>
            {/* the stand: an aluminium arm, and its foot */}
            <div className="absolute" style={{ left: 672, top: DISPLAY.y + DISPLAY.h - 10, width: 96, height: 88, background: ALU_SIDE, clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0 100%)" }} />
            <div className="absolute rounded-[6px]" style={{ left: 580, top: 632, width: 280, height: 14, background: ALU, boxShadow: "0 10px 24px -6px rgba(0,0,0,0.8)" }} />
            {/* the display */}
            <div
                className="absolute rounded-[16px]"
                style={{ left: DISPLAY.x, top: DISPLAY.y, width: DISPLAY.w, height: DISPLAY.h, padding: RIM, background: ALU, boxShadow: `0 40px 80px -30px rgba(0,0,0,0.95), 0 0 60px -20px ${glow}` }}
            >
                <div className="h-full w-full rounded-[12px] bg-[#0a0a0b]" style={{ padding: BEZEL }}>
                    <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-black">
                        {/* the terminal is laid over this hole (desk.tsx); asleep, the panel goes dark */}
                        {asleep && <div className="absolute inset-0 bg-black" />}
                    </div>
                </div>
            </div>
        </>
    );
}

// ---- Tower -----------------------------------------------------------------

export const TOWER = { x: 1212, y: 236, w: 176, h: 424 };

export type Stick = { id: string; label: string; color: string; alien?: boolean };

export const Tower = forwardRef<HTMLDivElement, {
    level: number;
    tint: string;
    on: boolean;
    asleep: boolean;
    plugged: Stick | null;
    onPower: () => void;
    onPull: () => void;
}>(function Tower({ level, tint, on, asleep, plugged, onPower, onPull }, portRef) {
    const reduce = useReducedMotion();
    return (
        <div className="absolute" style={{ left: TOWER.x, top: TOWER.y - 34, width: TOWER.w, height: TOWER.h + 34 }}>
            {/* the handle frame, rising above the body */}
            <div className="absolute inset-x-[6px] top-0 h-[60px] rounded-t-[26px] border-[9px] border-b-0" style={{ borderColor: "#d9dce1", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8)" }} />
            {/* a stick in the port, standing up out of the top */}
            <AnimatePresence>
                {plugged && (
                    <motion.button
                        key={plugged.id}
                        type="button"
                        onClick={onPull}
                        aria-label={`Pull out the ${plugged.label} drive`}
                        title="Pull it out (or type eject)"
                        className="absolute z-10 cursor-pointer"
                        style={{ left: 104, top: -8 }}
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -60, opacity: 0, transition: { duration: 0.25 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    >
                        <StickArt stick={plugged} upright />
                    </motion.button>
                )}
            </AnimatePresence>
            {/* the body */}
            <div className="absolute inset-x-0 bottom-0 rounded-[14px]" style={{ top: 34, background: ALU_SIDE, boxShadow: "0 40px 70px -24px rgba(0,0,0,0.95)" }}>
                {/* the top: ports and the power button */}
                <div className="absolute inset-x-3 top-2.5 flex h-5 items-center gap-2 rounded-md bg-[#2a2d33] px-2" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)" }}>
                    <button
                        type="button"
                        onClick={onPower}
                        aria-label={!on ? "Power on" : asleep ? "Wake the display" : "Put the display to sleep"}
                        title={!on ? "Power on" : asleep ? "Wake" : "Sleep"}
                        className="relative h-3.5 w-3.5 rounded-full"
                        style={{ background: "radial-gradient(circle at 35% 30%, #e5e7eb, #8b9099)", boxShadow: "0 0 0 1px #111" }}
                    >
                        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: on && !asleep ? "#e5e7eb" : "#52525b", boxShadow: on && !asleep ? "0 0 6px #fff" : "none" }} />
                    </button>
                    <div className="flex-1" />
                    {/* the ports: a stick dropped here goes in */}
                    <div ref={portRef} className="flex gap-1.5" title="USB-C: drop a drive here">
                        {[0, 1].map((i) => (
                            <span key={i} className="block h-1.5 w-4 rounded-full bg-black" style={{ boxShadow: "0 0 0 1px #4b5058" }} />
                        ))}
                    </div>
                </div>
                {/* the lattice front, lit from inside while it works */}
                <div className="absolute inset-x-3 bottom-3 top-10 overflow-hidden rounded-[8px]">
                    <motion.div
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(ellipse 80% 70% at 50% 60%, ${tint}, transparent 75%)` }}
                        animate={{ opacity: reduce ? level * 0.8 : level > 0.6 ? [level * 0.7, level, level * 0.7] : level * 0.8 }}
                        transition={level > 0.6 && !reduce ? { duration: 1.2, repeat: Infinity } : { duration: 0.8 }}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle at 50% 50%, rgba(8,10,14,0.8) 0 36%, #9aa0a8 40%, #eef0f3 58%, #b9bec6 76%, #8f959e 100%), radial-gradient(circle at 50% 50%, rgba(8,10,14,0.8) 0 36%, #9aa0a8 40%, #eef0f3 58%, #b9bec6 76%, #8f959e 100%)",
                            backgroundSize: "15px 15px, 15px 15px",
                            backgroundPosition: "0 0, 7.5px 7.5px",
                        }}
                    />
                </div>
            </div>
            {/* feet */}
            {[16, TOWER.w - 38].map((x) => (
                <span key={x} className="absolute -bottom-[7px] h-[8px] w-[22px] rounded-b-md bg-[#8f959e]" style={{ left: x }} />
            ))}
        </div>
    );
});

// ---- USB sticks -----------------------------------------------------------

export function StickArt({ stick, upright = false }: { stick: Stick; upright?: boolean }) {
    // Drawn standing; lying in the tray it is turned on its side
    return (
        <svg viewBox="0 0 30 78" width={upright ? 24 : 30} height={upright ? 62 : 78} aria-hidden className="block drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]">
            {/* the plug */}
            <rect x="9" y="66" width="12" height="11" rx="3" fill="#c7cbd1" />
            <rect x="11" y="68" width="8" height="3" rx="1.5" fill="#6b7280" />
            {/* the body, aluminium */}
            <rect x="3" y="4" width="24" height="64" rx="6" fill="url(#stickAlu)" />
            <defs>
                <linearGradient id="stickAlu" x1="0" x2="1">
                    <stop offset="0" stopColor="#b8bdc4" />
                    <stop offset="0.45" stopColor="#f1f2f4" />
                    <stop offset="1" stopColor="#a9aeb6" />
                </linearGradient>
            </defs>
            {/* the coloured cap, and a keyring loop */}
            <rect x="3" y="4" width="24" height="14" rx="6" fill={stick.color} />
            <circle cx="15" cy="9" r="2.4" fill="rgba(0,0,0,0.35)" />
            {/* the label */}
            {stick.alien ? (
                <g>
                    <ellipse cx="15" cy="43" rx="8" ry="9.5" fill="#86efac" />
                    <ellipse cx="11.7" cy="42" rx="2.6" ry="3.6" fill="#052e16" transform="rotate(-18 11.7 42)" />
                    <ellipse cx="18.3" cy="42" rx="2.6" ry="3.6" fill="#052e16" transform="rotate(18 18.3 42)" />
                </g>
            ) : (
                <text
                    x="15"
                    y="43"
                    textAnchor="middle"
                    transform="rotate(-90 15 43)"
                    fontSize="7"
                    fontWeight="700"
                    fill="#1f2937"
                    fontFamily="ui-sans-serif, system-ui"
                    letterSpacing="0.5"
                >
                    {stick.label}
                </text>
            )}
        </svg>
    );
}

// ---- Keyboard and trackpad -------------------------------------------------

// Top-down: [label, width in units, KeyboardEvent.code]
type K = [string, number, string];
const ROW = (s: string, prefix = "Key"): K[] => [...s].map((c) => [c.toUpperCase(), 1, /\d/.test(c) ? `Digit${c}` : `${prefix}${c.toUpperCase()}`]);
const ROWS: { h: number; keys: K[] }[] = [
    { h: 14, keys: [["esc", 1.3, "Escape"], ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n): K => [`F${n}`, 1, `F${n}`]), ["", 1.1, "__lock"]] },
    { h: 22, keys: [["`", 1, "Backquote"], ...ROW("1234567890"), ["-", 1, "Minus"], ["=", 1, "Equal"], ["⌫", 1.5, "Backspace"]] },
    { h: 22, keys: [["⇥", 1.5, "Tab"], ...ROW("qwertyuiop"), ["[", 1, "BracketLeft"], ["]", 1, "BracketRight"], ["\\", 1, "Backslash"]] },
    { h: 22, keys: [["⇪", 1.8, "CapsLock"], ...ROW("asdfghjkl"), [";", 1, "Semicolon"], ["'", 1, "Quote"], ["↵", 1.7, "Enter"]] },
    { h: 22, keys: [["⇧", 2.3, "ShiftLeft"], ...ROW("zxcvbnm"), [",", 1, "Comma"], [".", 1, "Period"], ["/", 1, "Slash"], ["⇧", 2.2, "ShiftRight"]] },
    { h: 22, keys: [["fn", 1, "Fn"], ["⌃", 1, "ControlLeft"], ["⌥", 1, "AltLeft"], ["⌘", 1.3, "MetaLeft"], ["", 5.4, "Space"], ["⌘", 1.3, "MetaRight"], ["⌥", 1, "AltRight"], ["←", 1, "ArrowLeft"], ["↑↓", 1, "ArrowUp"], ["→", 1, "ArrowRight"]] },
];

export function Keyboard({ pressed, tint }: { pressed: Set<string>; tint: string }) {
    return (
        <div className="absolute rounded-[12px] p-[8px]" style={{ left: 468, top: 690, width: 504, background: ALU, boxShadow: "0 14px 30px -12px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
            <div className="space-y-[4px]">
                {ROWS.map((row, r) => (
                    <div key={r} className="flex gap-[4px]">
                        {row.keys.map(([label, w, code], i) => {
                            const down = pressed.has(code) || (code === "ArrowUp" && pressed.has("ArrowDown"));
                            return (
                                <span
                                    key={i}
                                    className="flex items-center justify-center rounded-[4px] font-sans text-[8px] font-medium text-neutral-500 transition-all duration-75"
                                    style={{
                                        flex: w,
                                        height: row.h,
                                        background: down ? tint : "linear-gradient(180deg, #ffffff, #f1f2f4)",
                                        color: down ? "#0a0a0a" : undefined,
                                        boxShadow: down ? `0 0 12px ${tint}` : "0 1px 0 #b9bdc4, 0 1px 2px rgba(0,0,0,0.12)",
                                        transform: down ? "translateY(1px)" : undefined,
                                    }}
                                >
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Trackpad({ dot, tap }: { dot: { x: number; y: number } | null; tap: number }) {
    return (
        <div
            className="absolute overflow-hidden rounded-[12px]"
            style={{ left: 992, top: 696, width: 170, height: 150, background: "linear-gradient(160deg, #f4f5f7, #d9dce1)", boxShadow: "0 14px 30px -12px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.9)" }}
        >
            {dot && (
                <>
                    <span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400/30" style={{ left: `${dot.x * 100}%`, top: `${dot.y * 100}%` }} />
                    <motion.span
                        key={tap}
                        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-500/50"
                        style={{ left: `${dot.x * 100}%`, top: `${dot.y * 100}%` }}
                        initial={{ scale: 1, opacity: tap ? 0.9 : 0 }}
                        animate={{ scale: 2.6, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    />
                </>
            )}
        </div>
    );
}

// ---- Phone ------------------------------------------------------------------

export const PHONE = { x: 92, y: 410, w: 112, h: 226 };
export type Note = { id: number; app: string; text: string; icon: string };

export const Phone = forwardRef<HTMLButtonElement, { notes: Note[]; qr: boolean; onTap: () => void; airdrop: number }>(function Phone({ notes, qr, onTap, airdrop }, ref) {
    const [now, setNow] = useState<ReturnType<typeof kolkataNow> | null>(null);
    useEffect(() => {
        const tick = () => setNow(kolkataNow());
        tick();
        const id = window.setInterval(tick, 20000);
        return () => window.clearInterval(id);
    }, []);
    const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(new Date());
    return (
        <>
            {/* the stand */}
            <div className="absolute rounded-[4px]" style={{ left: PHONE.x + 26, top: PHONE.y + PHONE.h - 14, width: 60, height: 32, background: ALU_SIDE, clipPath: "polygon(30% 0, 70% 0, 100% 100%, 0 100%)" }} />
            <div className="absolute rounded-[5px]" style={{ left: PHONE.x + 6, top: PHONE.y + PHONE.h + 14, width: 100, height: 8, background: ALU, boxShadow: "0 8px 16px -6px rgba(0,0,0,0.8)" }} />
            <button
                ref={ref}
                type="button"
                onClick={onTap}
                aria-label={qr ? "Back to the notifications" : "Show a QR code for this site"}
                title={qr ? "Back" : "Scan to take the site with you"}
                className="absolute overflow-hidden rounded-[20px] p-[4px] text-left"
                style={{ left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, background: "linear-gradient(160deg, #3f3f46, #18181b)", boxShadow: "0 24px 40px -18px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.12)" }}
            >
                <div className="relative h-full w-full overflow-hidden rounded-[16px]" style={{ background: "radial-gradient(120% 70% at 30% 0%, #312e81, #0b1020 60%, #020617)" }}>
                    {/* the island */}
                    <span className="absolute left-1/2 top-[6px] h-[10px] w-[34px] -translate-x-1/2 rounded-full bg-black" />
                    {qr ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
                            <div className="rounded-lg bg-white p-1.5">
                                <QRCodeSVG value="https://miitdaga.dev" size={72} bgColor="#ffffff" fgColor="#0b1020" level="M" />
                            </div>
                            <p className="font-sans text-[8px] leading-tight text-neutral-300">Scan to take the site with you</p>
                        </div>
                    ) : (
                        <>
                            <p className="mt-[22px] text-center font-sans text-[8px] text-neutral-300">{date}</p>
                            <p className="text-center font-sans text-[30px] font-semibold leading-none tracking-tight text-white/90">{now?.time.replace(/\s?[AP]M/, "") ?? ""}</p>
                            <p className="mt-0.5 text-center font-sans text-[7px] text-neutral-400">Kolkata · {now?.mood.label ?? ""}</p>
                            <div className="mt-2 space-y-1 px-1.5">
                                <AnimatePresence initial={false}>
                                    {notes.slice(0, 3).map((n) => (
                                        <motion.div
                                            key={n.id}
                                            layout
                                            className="rounded-[8px] bg-white/15 px-1.5 py-1 backdrop-blur-md"
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <p className="flex items-center gap-1 font-sans text-[6.5px] font-semibold uppercase tracking-wide text-neutral-300">
                                                <span>{n.icon}</span>
                                                {n.app}
                                            </p>
                                            <p className="line-clamp-2 font-sans text-[7.5px] leading-tight text-white">{n.text}</p>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                    {/* AirDrop's rings, when something arrives */}
                    <AnimatePresence>
                        {airdrop > 0 && (
                            <motion.span
                                key={airdrop}
                                className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-400"
                                initial={{ scale: 0.4, opacity: 1 }}
                                animate={{ scale: 3.2, opacity: 0 }}
                                transition={{ duration: 0.9 }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </button>
        </>
    );
});

// ---- Sticky notes ---------------------------------------------------------

export function StickyNote({ x, y, rot, color, text, onClick, font }: { x: number; y: number; rot: number; color: string; text: string; onClick: () => void; font: string }) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            title={`Run: ${text}`}
            aria-label={`Run ${text} in the terminal`}
            className={`absolute z-20 flex items-center justify-center px-1.5 text-center leading-tight ${font}`}
            style={{ left: x, top: y, width: 80, height: 70, background: color, boxShadow: "0 6px 10px -4px rgba(0,0,0,0.55)", rotate: rot, color: "#1f2937", fontSize: 17 }}
            whileHover={{ rotate: 0, scale: 1.08, y: -3 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* the strip of tape */}
            <span className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rotate-2 bg-white/50" />
            {text}
        </motion.button>
    );
}

// ---- Desk touches -----------------------------------------------------------

/** Chai, hot when it is chai-time in Kolkata, forgotten and cold otherwise. */
export function Mug() {
    const [hot, setHot] = useState(true);
    useEffect(() => {
        const check = () => {
            const label = kolkataNow().mood.label;
            setHot(["morning coffee", "evening chai", "waking up slowly", "lunch break", "late-night commits"].includes(label));
        };
        check();
        const id = window.setInterval(check, 60000);
        return () => window.clearInterval(id);
    }, []);
    const reduce = useReducedMotion();
    return (
        <div className="absolute" style={{ left: 382, top: 712, width: 70, height: 90 }} title={hot ? "Chai, still hot" : "Chai, long gone cold"}>
            {/* steam */}
            {hot &&
                !reduce &&
                [0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        className="absolute bottom-[62px] h-10 w-2 rounded-full bg-white/25 blur-[3px]"
                        style={{ left: 18 + i * 10 }}
                        animate={{ y: [0, -26], opacity: [0, 0.8, 0], scaleX: [1, 1.8] }}
                        transition={{ duration: 2.6, delay: i * 0.8, repeat: Infinity, ease: "easeOut" }}
                    />
                ))}
            <div className="absolute bottom-0 left-2 h-[60px] w-[48px] rounded-b-[16px] rounded-t-[4px]" style={{ background: "linear-gradient(90deg, #d6c7b0, #f5ecdd 40%, #cbb89c)", boxShadow: "0 10px 16px -8px rgba(0,0,0,0.8)" }}>
                <div className="absolute inset-x-1 top-1 h-2 rounded-full" style={{ background: hot ? "#b07a47" : "#6b4a2d" }} />
            </div>
            {/* the handle */}
            <div className="absolute bottom-[14px] right-[4px] h-[30px] w-[18px] rounded-r-full border-[5px] border-l-0" style={{ borderColor: "#e3d6c2" }} />
        </div>
    );
}

export function Plant() {
    const reduce = useReducedMotion();
    const leaves = [-38, -18, 0, 18, 38];
    return (
        <div className="absolute" style={{ left: 1264, top: 730, width: 110, height: 140 }} title="A plant, doing its best in orbit">
            <motion.div className="absolute inset-x-0 bottom-[56px] h-[90px] origin-bottom" animate={reduce ? undefined : { rotate: [-2, 2, -2] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
                {leaves.map((r, i) => (
                    <span
                        key={i}
                        className="absolute bottom-0 left-1/2 h-[70px] w-[22px] origin-bottom rounded-[50%_50%_50%_50%/70%_70%_30%_30%]"
                        style={{ transform: `translateX(-50%) rotate(${r}deg)`, background: "linear-gradient(180deg, #4ade80, #166534)", height: 56 + (2 - Math.abs(i - 2)) * 12 }}
                    />
                ))}
            </motion.div>
            <div className="absolute bottom-0 left-1/2 h-[60px] w-[76px] -translate-x-1/2 rounded-b-[14px] rounded-t-[4px]" style={{ background: "linear-gradient(90deg, #7c2d12, #c2410c 45%, #7c2d12)", boxShadow: "0 12px 18px -8px rgba(0,0,0,0.8)" }}>
                <div className="absolute inset-x-0 top-0 h-3 rounded-t-[4px] bg-[#9a3412]" />
            </div>
        </div>
    );
}
