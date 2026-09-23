"use client";
import { forwardRef, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
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

export const TOWER = { x: 1196, y: 236, w: 176, h: 424 };
// The left port's centre, in the tower's own box (its top edge is 34 above the body):
// strip at inset 12, padding 8, two 16px ports 6 apart, ending at the strip's right
const PORT = { x: TOWER.w - 12 - 8 - 16 - 6 - 8, y: 34 + 10 + 10 };

export type Stick = { id: string; label: string; color: string; alien?: boolean };

export const Tower = forwardRef<HTMLDivElement, {
    level: number;
    tint: string;
    on: boolean;
    asleep: boolean;
    plugged: { stick: Stick; port: 0 | 1 }[];
    /** Terminal labels of drives unmounted but still plugged in */
    unmounted: Set<string>;
    onPower: () => void;
    onPull: (stick: Stick) => void;
    hdd: boolean;
}>(function Tower({ level, tint, on, asleep, plugged, unmounted, onPower, onPull, hdd }, portRef) {
    const reduce = useReducedMotion();
    // The sticks' terminal labels are their ids upper-cased, bar the two named otherwise
    const isIdle = (stick: Stick) => unmounted.has(stick.alien ? "ALIEN" : stick.id === "sign" ? "SIGNME" : stick.id.toUpperCase());
    return (
        <div className="absolute" style={{ left: TOWER.x, top: TOWER.y - 34, width: TOWER.w, height: TOWER.h + 34 }}>
            {/* the handle frame, rising above the body: a polished steel tube */}
            <svg className="absolute left-0 top-0" width={TOWER.w} height={62} viewBox={`0 0 ${TOWER.w} 62`} aria-hidden>
                <defs>
                    <linearGradient id="towerTube" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#fdfdfe" />
                        <stop offset="0.35" stopColor="#c9cdd3" />
                        <stop offset="0.7" stopColor="#8b919a" />
                        <stop offset="1" stopColor="#d6d9de" />
                    </linearGradient>
                </defs>
                <path d={`M 11 62 V 30 Q 11 7 34 7 H ${TOWER.w - 34} Q ${TOWER.w - 11} 7 ${TOWER.w - 11} 30 V 62`} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="11" transform="translate(0 1.5)" />
                <path d={`M 11 62 V 30 Q 11 7 34 7 H ${TOWER.w - 34} Q ${TOWER.w - 11} 7 ${TOWER.w - 11} 30 V 62`} fill="none" stroke="url(#towerTube)" strokeWidth="10" />
                <path d={`M 9 60 V 30 Q 9 5 34 5 H ${TOWER.w - 34} Q ${TOWER.w - 9} 5 ${TOWER.w - 9} 30 V 60`} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
            </svg>
            {/* the sticks in the ports, standing up out of the top */}
            <AnimatePresence>
                {plugged.map(({ stick, port }) => (
                    <motion.button
                        key={stick.id}
                        type="button"
                        onClick={() => onPull(stick)}
                        aria-label={`Pull out the ${stick.label || "unlabelled"} drive`}
                        title={isIdle(stick) ? "Unmounted: pull it out, or type mount to use it again" : "Pull it out (eject only unmounts it)"}
                        className="absolute z-10 cursor-pointer"
                        // Seated in its port: the body's foot on the slot, the plug inside
                        style={{ left: PORT.x + port * 22 - 12, top: PORT.y + 3 - 56 }}
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: isIdle(stick) ? 0.55 : 1 }}
                        exit={{ y: -60, opacity: 0, transition: { duration: 0.25 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    >
                        <StickArt stick={stick} upright />
                    </motion.button>
                ))}
            </AnimatePresence>
            {/* the hard drive's cable, into the back */}
            <svg className="pointer-events-none absolute" style={{ left: -40, top: TOWER.h + 34 - 60, overflow: "visible" }} width="60" height="80" aria-hidden>
                <path d="M 46 34 C 28 36, 20 52, 26 76" fill="none" stroke="#15171b" strokeWidth="5" strokeLinecap="round" />
                <path d="M 46 33 C 28 35, 20 51, 25.5 75" fill="none" stroke={hdd ? "#5b6069" : "#3a3e45"} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
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
                    <div ref={portRef} className="flex gap-[6px]" title="USB-C: drop a drive here">
                        {[0, 1].map((i) => (
                            <span key={i} className="block h-1.5 w-4 rounded-full bg-black" style={{ boxShadow: "0 0 0 1px #4b5058" }} />
                        ))}
                    </div>
                </div>
                {/* the lattice front: machined bowls in a grid, each open to the inside at
                    its centre and where four meet. The tower's light shows only there */}
                <div className="absolute inset-x-3 bottom-3 top-10 overflow-hidden rounded-[8px]" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }}>
                    <svg width="100%" height="100%" aria-hidden className="block">
                        <defs>
                            {/* concave: the upper left of each bowl in shadow, its lower right catching the light */}
                            <radialGradient id="latBowl" cx="0.66" cy="0.7" r="0.78">
                                <stop offset="0" stopColor="#fbfbfc" />
                                <stop offset="0.38" stopColor="#d5d8dd" />
                                <stop offset="0.72" stopColor="#8a9098" />
                                <stop offset="1" stopColor="#5d626a" />
                            </radialGradient>
                            <linearGradient id="latRim" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="rgba(255,255,255,0.95)" />
                                <stop offset="0.5" stopColor="rgba(255,255,255,0.15)" />
                                <stop offset="1" stopColor="rgba(60,64,72,0.55)" />
                            </linearGradient>
                            <pattern id="latCells" width="16" height="16" patternUnits="userSpaceOnUse">
                                <rect width="16" height="16" fill="#a9aeb5" />
                                <circle cx="8" cy="8" r="7.35" fill="url(#latBowl)" />
                                <circle cx="8" cy="8" r="7.35" fill="none" stroke="url(#latRim)" strokeWidth="0.7" />
                                {/* the openings, dark until the tower is lit */}
                                <circle cx="8" cy="8" r="2.4" fill="#07090c" />
                                {[0, 16].map((x) => [0, 16].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="#07090c" />))}
                            </pattern>
                            <pattern id="latHoles" width="16" height="16" patternUnits="userSpaceOnUse">
                                <circle cx="8" cy="8" r="2.4" fill="#fff" />
                                {[0, 16].map((x) => [0, 16].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="#fff" />))}
                            </pattern>
                            <mask id="latMask">
                                <rect width="100%" height="100%" fill="url(#latHoles)" />
                            </mask>
                            {/* the front curves away at its sides, and is lit from above */}
                            <linearGradient id="latSides" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor="rgba(0,0,0,0.32)" />
                                <stop offset="0.12" stopColor="rgba(0,0,0,0)" />
                                <stop offset="0.88" stopColor="rgba(0,0,0,0)" />
                                <stop offset="1" stopColor="rgba(0,0,0,0.38)" />
                            </linearGradient>
                            <linearGradient id="latTop" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="rgba(255,255,255,0.18)" />
                                <stop offset="0.4" stopColor="rgba(255,255,255,0)" />
                                <stop offset="1" stopColor="rgba(0,0,0,0.18)" />
                            </linearGradient>
                            <radialGradient id="latGlow" cx="0.5" cy="0.55" r="0.65">
                                <stop offset="0" stopColor={tint} />
                                <stop offset="1" stopColor={tint} stopOpacity="0.35" />
                            </radialGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#latCells)" />
                        <motion.rect
                            width="100%"
                            height="100%"
                            fill="url(#latGlow)"
                            mask="url(#latMask)"
                            animate={{ opacity: reduce ? level : level > 0.6 ? [level * 0.75, level, level * 0.75] : level }}
                            transition={level > 0.6 && !reduce ? { duration: 1.2, repeat: Infinity } : { duration: 0.8 }}
                        />
                        <rect width="100%" height="100%" fill="url(#latSides)" />
                        <rect width="100%" height="100%" fill="url(#latTop)" />
                    </svg>
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
    // Drawn standing, plug down; upright, as it stands in the block or in a port, without the plug
    return (
        <svg viewBox={upright ? "0 0 30 70" : "0 0 30 78"} width={upright ? 24 : 30} height={upright ? 56 : 78} aria-hidden className="block drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]">
            {/* the plug, which is inside the port when it is plugged in */}
            {!upright && (
                <>
                    <rect x="9" y="66" width="12" height="11" rx="3" fill="#c7cbd1" />
                    <rect x="11" y="68" width="8" height="3" rx="1.5" fill="#6b7280" />
                </>
            )}
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

// ---- Keyboard and mouse ----------------------------------------------------
// Both lie flat on the desk: they are drawn from above and placed on the desk's
// surface, which desk.tsx tilts away from the viewer. Positions are the
// surface's own (top-down) units

// [label, width in units, KeyboardEvent.code]
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
        <div className="absolute rounded-[12px] p-[8px]" style={{ left: 460, top: 90, width: 504, background: ALU, boxShadow: "0 14px 30px -12px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
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

// A mouse on its pad: it glides as the pointer moves over the screen, its
// buttons light when clicked, and its wheel turns when the terminal scrolls
export function Mouse({ x, y, button, wheel, tint }: { x: MotionValue<number>; y: MotionValue<number>; button: "left" | "right" | null; wheel: number; tint: string }) {
    const rotate = useTransform(x, (v) => v * 0.12);
    return (
        <div className="absolute rounded-[16px]" style={{ left: 980, top: 92, width: 176, height: 160, background: "linear-gradient(160deg, #26292f, #17191d)", boxShadow: "0 14px 30px -12px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            {/* moved straight from the pointer: no spring, so it keeps up */}
            <motion.div className="absolute left-1/2 top-1/2" style={{ marginLeft: -31, marginTop: -52, x, y, rotate }}>
                <svg width="62" height="104" viewBox="0 0 62 104" aria-hidden className="block drop-shadow-[0_8px_8px_rgba(0,0,0,0.55)]">
                    <defs>
                        <linearGradient id="mouseBody" x1="0" x2="1">
                            <stop offset="0" stopColor="#d7dade" />
                            <stop offset="0.45" stopColor="#fbfbfc" />
                            <stop offset="1" stopColor="#c9cdd3" />
                        </linearGradient>
                    </defs>
                    <path d="M31 2 C50 2 60 18 60 42 V72 C60 92 48 102 31 102 C14 102 2 92 2 72 V42 C2 18 12 2 31 2 Z" fill="url(#mouseBody)" />
                    {/* the two buttons */}
                    <path d="M31 3 C14 3 3.5 18 3.5 40 H31 Z" fill={button === "left" ? tint : "transparent"} opacity="0.55" />
                    <path d="M31 3 C48 3 58.5 18 58.5 40 H31 Z" fill={button === "right" ? tint : "transparent"} opacity="0.55" />
                    <line x1="31" y1="3" x2="31" y2="40" stroke="#b8bcc3" strokeWidth="1" />
                    <path d="M4 41 Q31 44 58 41" stroke="#c4c8ce" strokeWidth="1" fill="none" />
                    {/* the wheel, its ridges turning as the terminal scrolls */}
                    <rect x="27" y="12" width="8" height="18" rx="4" fill="#3f434a" />
                    <g key={wheel}>
                        {[0, 1, 2, 3].map((i) => (
                            <motion.rect key={i} x="28.5" width="5" height="1.4" rx="0.7" fill="#9aa0a8" initial={{ y: 13 + i * 4.4 }} animate={{ y: 17.4 + i * 4.4 }} transition={{ duration: 0.18 }} />
                        ))}
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}

// ---- External hard drive ------------------------------------------------------

// A 2 TB drive on its side, cabled to the tower. A click connects or disconnects
// it; its light breathes while connected and flickers while the terminal works
export function HardDrive({ on, idle, busy, onClick }: { on: boolean; idle: boolean; busy: boolean; onClick: () => void }) {
    const reduce = useReducedMotion();
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={on ? "Disconnect the Time Capsule drive" : "Connect the Time Capsule drive"}
            title={on ? (idle ? "Time Capsule · unmounted (click to disconnect, or type mount timecapsule)" : "Time Capsule · connected (click to disconnect)") : "Time Capsule · 2 TB (click to connect)"}
            className="absolute rounded-[10px] text-left"
            style={{ left: 1176, top: 668, width: 88, height: 112, background: "linear-gradient(160deg, #3a3e45, #1d2025)", boxShadow: "0 16px 28px -12px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.05)" }}
        >
            {/* brushed face */}
            <span className="absolute inset-[6px] rounded-[6px]" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)" }} />
            <span className="absolute left-[12px] top-[14px] font-mono text-[7px] font-bold uppercase leading-tight tracking-[0.2em] text-neutral-300">
                time
                <br />
                capsule
            </span>
            <span className="absolute bottom-[12px] left-[12px] font-mono text-[6px] tracking-[0.2em] text-neutral-500">2 TB · USB-C</span>
            <motion.span
                className="absolute bottom-[13px] right-[12px] h-[5px] w-[5px] rounded-full"
                // Unmounted but connected: a steady amber, as drives show when idle
                style={{ background: on ? (idle ? "#f59e0b" : "#38bdf8") : "#3f3f46", boxShadow: on ? `0 0 8px ${idle ? "#f59e0b" : "#38bdf8"}` : "none" }}
                animate={on && !idle && !reduce ? (busy ? { opacity: [1, 0.2, 1, 0.4, 1] } : { opacity: [1, 0.35, 1] }) : { opacity: 1 }}
                transition={on ? (busy ? { duration: 0.35, repeat: Infinity } : { duration: 2.4, repeat: Infinity }) : undefined}
            />
        </button>
    );
}


// ---- Phone ------------------------------------------------------------------

export const PHONE = { x: 92, y: 410, w: 112, h: 226 };
export type Note = { id: number; app: string; text: string; icon: string };
type App = "messages" | "weather" | "music" | "qr";

const APPS: { id: App; icon: string; label: string; bg: string }[] = [
    { id: "messages", icon: "💬", label: "Messages", bg: "linear-gradient(160deg, #4ade80, #16a34a)" },
    { id: "weather", icon: "⛅", label: "Weather", bg: "linear-gradient(160deg, #60a5fa, #1d4ed8)" },
    { id: "music", icon: "♫", label: "Music", bg: "linear-gradient(160deg, #fb7185, #be123c)" },
    { id: "qr", icon: "▦", label: "Take the site with you", bg: "linear-gradient(160deg, #e5e7eb, #9ca3af)" },
];

// The phone on its stand: the lock screen shows the time in Kolkata and the
// desk's notifications. Its dock opens four apps; opening one picks the phone
// up off the stand, bigger, so it can be used
export const Phone = forwardRef<
    HTMLDivElement,
    { notes: Note[]; airdrop: number; music: boolean; onMusic: (on: boolean) => void; onSigned: (name: string, message: string) => void }
>(function Phone({ notes, airdrop, music, onMusic, onSigned }, ref) {
    const [now, setNow] = useState<ReturnType<typeof kolkataNow> | null>(null);
    const [app, setApp] = useState<App | null>(null);
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
            <motion.div
                ref={ref}
                className="absolute z-20 overflow-hidden rounded-[20px] p-[4px]"
                style={{ left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, originX: 0, originY: 1, background: "linear-gradient(160deg, #3f3f46, #18181b)", boxShadow: "0 24px 40px -18px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.12)" }}
                animate={app ? { scale: 1.9, y: -14 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
                <div className="relative h-full w-full overflow-hidden rounded-[16px] font-sans" style={{ background: "radial-gradient(120% 70% at 30% 0%, #312e81, #0b1020 60%, #020617)" }}>
                    {/* the island */}
                    <span className="absolute left-1/2 top-[6px] z-10 h-[10px] w-[34px] -translate-x-1/2 rounded-full bg-black" />
                    {app === null && (
                        <>
                            <p className="mt-[22px] text-center text-[8px] text-neutral-300">{date}</p>
                            <p className="text-center text-[30px] font-semibold leading-none tracking-tight text-white/90">{now?.time.replace(/\s?[AP]M/, "") ?? ""}</p>
                            <p className="mt-0.5 text-center text-[7px] text-neutral-400">
                                Kolkata · {now?.mood.label ?? ""}
                                {music ? " · ♫" : ""}
                            </p>
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
                                            <p className="flex items-center gap-1 text-[6.5px] font-semibold uppercase tracking-wide text-neutral-300">
                                                <span>{n.icon}</span>
                                                {n.app}
                                            </p>
                                            <p className="line-clamp-2 text-[7.5px] leading-tight text-white">{n.text}</p>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                            {/* the dock */}
                            <div className="absolute inset-x-1.5 bottom-[10px] flex justify-between rounded-[12px] bg-white/10 px-[5px] py-[4px] backdrop-blur-md">
                                {APPS.map((a) => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => setApp(a.id)}
                                        aria-label={a.label}
                                        title={a.label}
                                        className="flex h-[19px] w-[19px] items-center justify-center rounded-[6px] text-[10px] leading-none text-white transition-transform hover:scale-110"
                                        style={{ background: a.bg, color: a.id === "qr" ? "#111827" : undefined }}
                                    >
                                        {a.icon}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    {app === "qr" && (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
                            <div className="rounded-lg bg-white p-1.5">
                                <QRCodeSVG value="https://miitdaga.dev" size={72} bgColor="#ffffff" fgColor="#0b1020" level="M" />
                            </div>
                            <p className="text-[8px] leading-tight text-neutral-300">Scan to take the site with you</p>
                        </div>
                    )}
                    {app === "messages" && <MessagesApp reply={now?.mood.reply ?? ""} onSigned={onSigned} />}
                    {app === "weather" && <WeatherApp />}
                    {app === "music" && <MusicApp on={music} onToggle={() => onMusic(!music)} />}
                    {/* the home bar: back to the lock screen */}
                    {app && (
                        <button type="button" onClick={() => setApp(null)} aria-label="Back to the lock screen" title="Home" className="absolute inset-x-0 bottom-0 z-10 flex h-[12px] items-center justify-center">
                            <span className="block h-[3px] w-[36px] rounded-full bg-white/70" />
                        </button>
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
            </motion.div>
        </>
    );
});

// Messages: a note to Miit, which signs the guestbook, or an email instead
function MessagesApp({ reply, onSigned }: { reply: string; onSigned: (name: string, message: string) => void }) {
    const [name, setName] = useState("");
    const [text, setText] = useState("");
    const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [error, setError] = useState("");
    const [sent, setSent] = useState("");
    const send = async () => {
        const message = text.trim();
        if (!message || state === "sending") return;
        setState("sending");
        try {
            const res = await fetch("/api/guestbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), message }) });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError((data && data.error) || "Could not send it.");
                setState("error");
                return;
            }
            setSent(message);
            setText("");
            setState("sent");
            onSigned(data?.entry?.name || name.trim() || "Anonymous", message);
        } catch {
            setError("No signal. Try again.");
            setState("error");
        }
    };
    return (
        <div className="flex h-full flex-col pb-[12px] pt-[20px] text-[7px] text-white">
            <div className="flex items-center gap-1 border-b border-white/10 px-2 pb-1">
                <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-indigo-500 text-[7px] font-bold">M</span>
                <div className="leading-tight">
                    <p className="text-[7.5px] font-semibold">Miit</p>
                    <p className="text-[5.5px] text-neutral-400">{reply}</p>
                </div>
            </div>
            <div className="flex-1 space-y-1 overflow-hidden px-1.5 pt-1.5">
                <p className="max-w-[80%] rounded-[8px] rounded-bl-[2px] bg-white/15 px-1.5 py-1 leading-tight">Hey! Leave me a note. It goes on the guestbook on my site.</p>
                {state === "sent" && (
                    <>
                        <p className="ml-auto max-w-[80%] break-words rounded-[8px] rounded-br-[2px] bg-sky-500 px-1.5 py-1 leading-tight">{sent}</p>
                        <p className="text-right text-[5.5px] text-neutral-400">Delivered · signed the guestbook</p>
                        <p className="max-w-[80%] rounded-[8px] rounded-bl-[2px] bg-white/15 px-1.5 py-1 leading-tight">Thank you! ✨</p>
                    </>
                )}
                {state === "error" && <p className="text-center text-[6px] text-rose-300">{error}</p>}
            </div>
            <div className="space-y-[3px] px-1.5">
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="Your name (optional)" aria-label="Your name" className="w-full rounded-full bg-white/10 px-1.5 py-[2px] text-[6.5px] text-white outline-none placeholder:text-neutral-500 focus:bg-white/15" />
                <div className="flex items-center gap-[3px]">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, 200))}
                        onKeyDown={(e) => e.key === "Enter" && send()}
                        placeholder="Message"
                        aria-label="Message"
                        className="min-w-0 flex-1 rounded-full bg-white/10 px-1.5 py-[2px] text-[6.5px] text-white outline-none placeholder:text-neutral-500 focus:bg-white/15"
                    />
                    <button type="button" onClick={send} disabled={!text.trim() || state === "sending"} aria-label="Send" className="flex h-[12px] w-[12px] items-center justify-center rounded-full bg-sky-500 text-[7px] font-bold disabled:opacity-40">
                        {state === "sending" ? "…" : "↑"}
                    </button>
                </div>
                <a href="mailto:miitcodes27@gmail.com?subject=Hello%20from%20the%20terminal%20desk" className="block text-center text-[6px] text-sky-300 hover:underline">
                    or email instead
                </a>
            </div>
        </div>
    );
}

// Weather: Kolkata's, now, from the same free service as the globe
const weatherWord = (code: number) =>
    code === 0 ? "Clear" : code <= 2 ? "Partly cloudy" : code === 3 ? "Overcast" : code <= 48 ? "Fog" : code <= 57 ? "Drizzle" : code <= 67 ? "Rain" : code <= 77 ? "Snow" : code <= 82 ? "Showers" : "Thunderstorms";
const weatherIcon = (code: number, day: boolean) =>
    code === 0 ? (day ? "☀️" : "🌙") : code <= 2 ? (day ? "⛅" : "☁️") : code === 3 ? "☁️" : code <= 48 ? "🌫️" : code <= 67 ? "🌧️" : code <= 77 ? "❄️" : code <= 82 ? "🌦️" : "⛈️";

function WeatherApp() {
    const [w, setW] = useState<{ temp: number; code: number; day: boolean; hum: number; wind: number; hi: number; lo: number } | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        fetch("https://api.open-meteo.com/v1/forecast?latitude=22.57&longitude=88.36&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata&forecast_days=1")
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => {
                const c = d.current;
                setW({ temp: Math.round(c.temperature_2m), code: c.weather_code, day: !!c.is_day, hum: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), hi: Math.round(d.daily.temperature_2m_max[0]), lo: Math.round(d.daily.temperature_2m_min[0]) });
            })
            .catch(() => setFailed(true));
    }, []);
    return (
        <div className="flex h-full flex-col items-center px-2 pb-[14px] pt-[24px] text-center text-white" style={{ background: w?.day === false ? "linear-gradient(180deg, #1e1b4b, #0f172a)" : "linear-gradient(180deg, #2563eb, #60a5fa)" }}>
            <p className="text-[9px] font-medium">Kolkata</p>
            {w ? (
                <>
                    <p className="text-[34px] font-extralight leading-none">{w.temp}°</p>
                    <p className="text-[7.5px]">{weatherWord(w.code)}</p>
                    <p className="text-[7px] text-white/80">
                        H:{w.hi}° L:{w.lo}°
                    </p>
                    <p className="mt-2 text-[26px] leading-none">{weatherIcon(w.code, w.day)}</p>
                    <div className="mt-auto grid w-full grid-cols-2 gap-1 text-[6px]">
                        <p className="rounded-[6px] bg-white/15 py-1">
                            HUMIDITY
                            <br />
                            <span className="text-[9px]">{w.hum}%</span>
                        </p>
                        <p className="rounded-[6px] bg-white/15 py-1">
                            WIND
                            <br />
                            <span className="text-[9px]">{w.wind} km/h</span>
                        </p>
                    </div>
                </>
            ) : (
                <p className="mt-6 text-[7px] text-white/80">{failed ? "No signal from Kolkata right now." : "Asking the sky…"}</p>
            )}
        </div>
    );
}

// Music: a space ambient, made up in the browser as it plays (desk-sound.ts)
function MusicApp({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    const reduce = useReducedMotion();
    return (
        <div className="flex h-full flex-col items-center px-3 pb-[16px] pt-[24px] text-center text-white">
            <div className="relative flex h-[76px] w-[76px] items-end justify-center gap-[3px] overflow-hidden rounded-[10px] pb-2" style={{ background: "radial-gradient(circle at 30% 20%, #f0abfc, #7c3aed 45%, #0f172a)" }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.span
                        key={i}
                        className="block w-[4px] rounded-full bg-white/80"
                        animate={on && !reduce ? { height: [6, 18 + ((i * 7) % 16), 8, 24 - ((i * 5) % 12), 6] } : { height: 4 }}
                        transition={on && !reduce ? { duration: 1.6 + i * 0.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                    />
                ))}
            </div>
            <p className="mt-2 text-[8px] font-semibold">Low Earth Orbit</p>
            <p className="text-[6.5px] text-neutral-400">ambient · made up as it plays</p>
            <button type="button" onClick={onToggle} aria-label={on ? "Pause" : "Play"} className="mt-3 flex h-[24px] w-[24px] items-center justify-center rounded-full bg-white text-[10px] text-black">
                {on ? "❚❚" : "▶"}
            </button>
            <p className="mt-auto text-[6px] text-neutral-500">It keeps playing on the lock screen</p>
        </div>
    );
}

// ---- Desk touches -----------------------------------------------------------

const CHAI_TIME = ["morning coffee", "evening chai", "waking up slowly", "lunch break", "late-night commits"];
/** Is it chai-time in Kolkata? Checked every minute. */
export function useChaiTime() {
    const [hot, setHot] = useState(true);
    useEffect(() => {
        const check = () => setHot(CHAI_TIME.includes(kolkataNow().mood.label));
        check();
        const id = window.setInterval(check, 60000);
        return () => window.clearInterval(id);
    }, []);
    return hot;
}

/** Chai, seen from the chair: the front of the mug, and the chai inside, `level` sips of 4 left. */
export function Mug({ level, hot, pouring }: { level: number; hot: boolean; pouring: boolean }) {
    const reduce = useReducedMotion();
    // The chai's surface sinks into the mug as it is drunk: the lower it is,
    // the less of it shows past the rim
    const depth = [30, 21, 14, 7, 1][Math.max(0, Math.min(4, level))];
    return (
        <div className="relative h-[84px] w-[80px]">
            <svg width="80" height="84" viewBox="0 0 80 84" aria-hidden className="absolute inset-0 overflow-visible drop-shadow-[0_10px_8px_rgba(0,0,0,0.55)]">
                <defs>
                    <linearGradient id="mugBody" x1="0" x2="1">
                        <stop offset="0" stopColor="#c9b89a" />
                        <stop offset="0.4" stopColor="#f6efe2" />
                        <stop offset="1" stopColor="#bba98a" />
                    </linearGradient>
                    <clipPath id="mugRim">
                        <ellipse cx="34" cy="18" rx="27" ry="8" />
                    </clipPath>
                </defs>
                {/* the handle */}
                <path d="M 58 32 C 78 30, 78 60, 58 60" fill="none" stroke="#dccfb6" strokeWidth="7" strokeLinecap="round" />
                {/* the body */}
                <path d="M 7 18 V 70 C 7 80, 61 80, 61 70 V 18 Z" fill="url(#mugBody)" />
                {/* a band round it, with a small star */}
                <path d="M 7 46 C 7 52, 61 52, 61 46 V 52 C 61 58, 7 58, 7 52 Z" fill="#0f766e" opacity="0.85" />
                <text x="34" y="54.5" textAnchor="middle" fontSize="6" fill="#ccfbf1">✦</text>
                {/* inside: the far wall, then the chai at its level */}
                <ellipse cx="34" cy="18" rx="27" ry="8" fill="#e7dcc6" />
                <g clipPath="url(#mugRim)">
                    <ellipse cx="34" cy="18" rx="27" ry="8" fill="#b9a784" opacity="0.5" transform="translate(0 -3)" />
                    {level > 0 && <ellipse cx="34" cy={18 + (30 - depth) * 0.36} rx="26" ry="7.4" fill={hot ? "#b87a44" : "#7a5634"} />}
                    {level > 0 && hot && <ellipse cx="30" cy={16 + (30 - depth) * 0.36} rx="10" ry="2.4" fill="#ecd3b0" opacity="0.35" />}
                    {level === 0 && <ellipse cx="34" cy="24" rx="20" ry="4" fill="none" stroke="#8a6a47" strokeWidth="1" opacity="0.5" />}
                </g>
                <ellipse cx="34" cy="18" rx="27" ry="8" fill="none" stroke="#fbf7ef" strokeWidth="1.6" />
            </svg>
            {/* steam, while there is hot chai in it */}
            {hot &&
                level > 0 &&
                !reduce &&
                !pouring &&
                [0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        className="pointer-events-none absolute h-6 w-6 rounded-full bg-white/20 blur-[5px]"
                        style={{ left: 14 + i * 12, top: 0 }}
                        animate={{ y: [0, -30], x: [0, i === 1 ? 4 : -4], opacity: [0, 0.7, 0], scale: [0.6, 1.4] }}
                        transition={{ duration: 2.4, delay: i * 0.7, repeat: Infinity, ease: "easeOut" }}
                    />
                ))}
        </div>
    );
}

/** A snake plant in a pot, from the front. It grows a stage each visit (desk.tsx
 * keeps count), and droops if nobody has been by for a week. */
export function Plant({ stage, droop, watered }: { stage: number; droop: boolean; watered: number }) {
    const reduce = useReducedMotion();
    const n = Math.min(9, 3 + Math.floor(stage / 1.5));
    const grow = 0.55 + Math.min(9, stage) * 0.075;
    // Fanned out from the middle; tall in the middle, shorter to the sides
    const leaves = Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        const len = (78 - Math.abs(t) * 26 + ((i * 13) % 9)) * grow;
        const angle = t * (droop ? 58 : 26);
        return { t, len, angle, w: 7 + ((i * 5) % 3) };
    });
    const green = droop ? ["#a3a95a", "#5b6b2a"] : ["#4ade80", "#166534"];
    return (
        <div className="relative h-[170px] w-[120px]">
            <svg width="120" height="170" viewBox="0 0 120 170" aria-hidden className="absolute inset-0 overflow-visible">
                <defs>
                    <linearGradient id="leaf" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0" stopColor={green[1]} />
                        <stop offset="1" stopColor={green[0]} />
                    </linearGradient>
                    <linearGradient id="pot" x1="0" x2="1">
                        <stop offset="0" stopColor="#7c2d12" />
                        <stop offset="0.45" stopColor="#c2410c" />
                        <stop offset="1" stopColor="#7c2d12" />
                    </linearGradient>
                </defs>
                {/* the rim seen a little from above, and the soil inside */}
                <ellipse cx="60" cy="124" rx="36" ry="7" fill="#9a3412" />
                <ellipse cx="60" cy="124.5" rx="31" ry="5" fill="#3b2415" />
                <motion.g
                    style={{ originX: "60px", originY: "122px" }}
                    animate={reduce ? undefined : watered ? { scaleY: [1, 1.06, 1] } : { rotate: [-1.5, 1.5, -1.5] }}
                    transition={watered ? { duration: 0.8 } : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    key={watered}
                >
                    {leaves.map((l, i) => (
                        <path
                            key={i}
                            // a blade: wide at its base, to a point; drooping ones bend over at the tip
                            d={`M ${-l.w / 2} 0 C ${-l.w} ${-l.len * 0.5}, ${droop ? l.w * 1.8 : -l.w * 0.4} ${-l.len * 0.9}, ${droop ? l.w * 2.4 : 0} ${-l.len} C ${droop ? l.w * 1.4 : l.w * 0.4} ${-l.len * 0.9}, ${l.w} ${-l.len * 0.5}, ${l.w / 2} 0 Z`}
                            fill="url(#leaf)"
                            stroke="rgba(0,0,0,0.15)"
                            strokeWidth="0.6"
                            transform={`translate(${60 + l.t * 12} 122) rotate(${l.angle}) scale(${l.t < 0 && droop ? -1 : 1} 1)`}
                        />
                    ))}
                </motion.g>
                {/* the pot's front, and the near half of its rim, in front of the leaves */}
                <path d="M 24 124 L 34 166 C 34 169, 86 169, 86 166 L 96 124 C 96 132, 24 132, 24 124 Z" fill="url(#pot)" />
                <path d="M 24 124 C 24 132, 96 132, 96 124" fill="none" stroke="#b45309" strokeWidth="2.5" />
                <path d="M 30 140 C 30 144, 90 144, 90 140" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
            </svg>
        </div>
    );
}
