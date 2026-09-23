"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// The resume computer's floppies (retro-computer.tsx): a box of 3.5" disks
// and an external drive. Drag a disk into the drive or tap it; its program
// comes up on the screen (disks.tsx).
//
// Wide screens: the drive is built into the monitor's front and the disks fan
// out beside its stand. Narrower ones: an external drive and a row of disks in
// a strip under the monitor, scrolling sideways.

export type DiskId = "projects" | "papers" | "contact" | "games" | "blank" | "alien";

type DiskDef = { id: DiskId; label: string; body: string; ink: string };

export const DISKS: DiskDef[] = [
    { id: "projects", label: "PROJECTS", body: "#1e3a8a", ink: "#1e3a8a" },
    { id: "papers", label: "PAPERS", body: "#7f1d1d", ink: "#7f1d1d" },
    { id: "contact", label: "CONTACT", body: "#14532d", ink: "#14532d" },
    { id: "games", label: "GAMES", body: "#18181b", ink: "#18181b" },
    { id: "blank", label: "", body: "#d4d4d8", ink: "#1d4ed8" },
    { id: "alien", label: "", body: "#3f3f46", ink: "#3f3f46" },
];

/** The name a visitor wrote on the blank disk, once they have signed with it. */
export const LABEL_KEY = "floppy-label";

// ---- A disk ---------------------------------------------------------------

export function DiskArt({ disk, name, size = 56 }: { disk: DiskDef; name?: string | null; size?: number }) {
    const label = disk.id === "blank" ? name || "" : disk.label;
    return (
        <svg viewBox="0 0 60 62" width={size} height={(size * 62) / 60} aria-hidden className="block drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
            {/* the case, with its clipped corner */}
            <path d="M3 2 H53 L58 7 V58 a2 2 0 0 1 -2 2 H4 a2 2 0 0 1 -2 -2 V3 a1 1 0 0 1 1 -1 Z" fill={disk.body} />
            <path d="M3 2 H53 L58 7 V58 a2 2 0 0 1 -2 2 H4 a2 2 0 0 1 -2 -2 V3 a1 1 0 0 1 1 -1 Z" fill="none" stroke="rgba(255,255,255,0.12)" />
            {/* the metal shutter */}
            <rect x="16" y="2" width="28" height="19" rx="1" fill="#b8bcc4" />
            <rect x="18" y="3" width="24" height="17" rx="0.5" fill="#cfd3da" />
            <rect x="32" y="5" width="6" height="12" rx="0.5" fill="#6b7280" />
            {/* the label */}
            <rect x="7" y="27" width="46" height="30" rx="1.5" fill="#f5f5f0" />
            {disk.id === "alien" ? (
                // the alien's sticker, and nothing written
                <g>
                    <ellipse cx="30" cy="41" rx="9" ry="10.5" fill="#86efac" />
                    <ellipse cx="26.3" cy="40" rx="3" ry="4" fill="#052e16" transform="rotate(-18 26.3 40)" />
                    <ellipse cx="33.7" cy="40" rx="3" ry="4" fill="#052e16" transform="rotate(18 33.7 40)" />
                    <path d="M28 47 Q30 48.2 32 47" stroke="#052e16" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                </g>
            ) : (
                <>
                    {[34, 40, 46, 52].map((y) => (
                        <line key={y} x1="10" x2="50" y1={y} y2={y} stroke="#c7d2fe" strokeWidth="0.5" />
                    ))}
                    {label && (
                        <text
                            x="30"
                            y="37"
                            textAnchor="middle"
                            fontSize={label.length > 9 ? 5.2 : 7}
                            fontWeight="700"
                            fill={disk.ink}
                            fontFamily="'Comic Sans MS', 'Marker Felt', 'Chalkboard SE', cursive"
                        >
                            {label.slice(0, 12)}
                        </text>
                    )}
                    {disk.id === "blank" && !label && (
                        <text x="30" y="44" textAnchor="middle" fontSize="4.4" fill="#9ca3af" fontFamily="ui-monospace, monospace">
                            blank · sign me
                        </text>
                    )}
                </>
            )}
        </svg>
    );
}

// ---- The drive -------------------------------------------------------------

export function Drive({
    inserted,
    insertKey,
    busy,
    onEject,
    driveRef,
    compact = false,
    embedded = false,
}: {
    inserted: DiskDef | null;
    insertKey: number;
    busy: boolean;
    onEject: () => void;
    driveRef: React.RefObject<HTMLDivElement | null>;
    compact?: boolean;
    /** Built into the monitor's front, so no case of its own */
    embedded?: boolean;
}) {
    const reduce = useReducedMotion();
    return (
        <div ref={driveRef} className={`relative shrink-0 ${compact ? "h-[40px] w-[118px]" : "h-[46px] w-[134px]"}`}>
            {/* the disk sliding in, above the slot */}
            <div className="pointer-events-none absolute bottom-[26px] left-1/2 h-[60px] w-[60px] -translate-x-1/2 overflow-hidden">
                <AnimatePresence>
                    {inserted && !reduce && (
                        <motion.div
                            key={insertKey}
                            className="absolute inset-x-0 top-0 flex justify-center"
                            initial={{ y: -2 }}
                            animate={{ y: 62 }}
                            transition={{ duration: 0.28, ease: "easeIn" }}
                        >
                            <DiskArt disk={inserted} size={50} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div
                className="absolute inset-0 rounded-[7px]"
                style={
                    embedded
                        ? { background: "linear-gradient(180deg, #d8ceb4, #e4dbc4)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.5)" }
                        : { background: "linear-gradient(170deg, #efe8d6, #d3c8ad)", boxShadow: "0 10px 22px -10px rgba(0,0,0,0.8), inset 0 2px 0 rgba(255,255,255,0.7)" }
                }
            >
                {/* the slot, with a disk's edge showing when one is in */}
                <div className="absolute left-3 right-3 top-[9px] h-[6px] rounded-full bg-[#2e2a22]" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)" }}>
                    {inserted && <div className="absolute inset-x-[18%] top-[1px] h-[3px] rounded-sm" style={{ background: inserted.body }} />}
                </div>
                {/* the drive light, and the eject button */}
                <span
                    className="absolute bottom-[8px] left-3 h-1.5 w-3 rounded-sm"
                    style={{ background: busy ? "#4ade80" : "#44403c", boxShadow: busy ? "0 0 8px #4ade80" : "none" }}
                />
                <span className="absolute bottom-[6px] left-8 font-mono text-[6px] uppercase tracking-[0.2em] text-stone-500">drive a:</span>
                <button
                    type="button"
                    onClick={onEject}
                    disabled={!inserted}
                    aria-label="Eject the disk"
                    className="absolute bottom-[5px] right-3 h-[9px] w-5 rounded-[2px] transition-transform active:translate-y-px disabled:opacity-60"
                    style={{ background: "linear-gradient(180deg, #d6d3d1, #a8a29e)", boxShadow: "0 1px 0 #78716c" }}
                />
            </div>
        </div>
    );
}

// ---- The box of disks -----------------------------------------------------

export function DiskShelf({
    inserted,
    name,
    onInsert,
    driveRef,
    layout,
}: {
    inserted: DiskId | null;
    name: string | null;
    onInsert: (id: DiskId) => void;
    driveRef: React.RefObject<HTMLDivElement | null>;
    layout: "fan" | "row";
}) {
    // Dragging only where there is a mouse: on touch a drag would fight the row's scrolling
    const [fine, setFine] = useState(false);
    useEffect(() => setFine(window.matchMedia("(pointer: fine)").matches), []);
    const dragged = useRef(false);

    const overDrive = (x: number, y: number) => {
        const r = driveRef.current?.getBoundingClientRect();
        return !!r && x > r.left - 30 && x < r.right + 30 && y > r.top - 70 && y < r.bottom + 20;
    };

    return (
        <div
            className={
                layout === "fan"
                    ? "flex items-end"
                    : "resume-scroll flex min-w-0 flex-1 items-end gap-2 overflow-x-auto px-1 pb-1 pt-1"
            }
        >
            {DISKS.map((d, i) => {
                const out = inserted === d.id;
                const title =
                    d.id === "blank" ? (name ? `Your disk, "${name}"` : "A blank disk: sign the guestbook") : d.id === "alien" ? "An unlabelled disk with an alien sticker" : `${d.label} disk`;
                return (
                    <motion.button
                        key={d.id}
                        type="button"
                        title={title}
                        aria-label={`${title}. ${out ? "In the drive" : "Put it in the drive"}`}
                        className={`relative shrink-0 cursor-grab touch-manipulation focus-visible:outline-none active:cursor-grabbing ${layout === "fan" ? (i ? "-ml-2" : "") : ""}`}
                        style={{ zIndex: 10 + i, rotate: layout === "fan" ? (i - 2.5) * 3 : 0 }}
                        whileHover={out ? undefined : { y: -8, rotate: 0, zIndex: 30 }}
                        whileFocus={out ? undefined : { y: -8, rotate: 0, zIndex: 30 }}
                        animate={{ opacity: out ? 0.18 : 1 }}
                        drag={fine && !out}
                        dragSnapToOrigin
                        dragElastic={0.9}
                        whileDrag={{ scale: 1.08, zIndex: 50, rotate: 0 }}
                        onDragStart={() => (dragged.current = true)}
                        onDragEnd={(_, info) => {
                            if (overDrive(info.point.x - window.scrollX, info.point.y - window.scrollY)) onInsert(d.id);
                            window.setTimeout(() => (dragged.current = false), 50);
                        }}
                        onClick={() => {
                            if (dragged.current || out) return;
                            onInsert(d.id);
                        }}
                    >
                        <DiskArt disk={d} name={name} size={layout === "fan" ? 52 : 46} />
                    </motion.button>
                );
            })}
        </div>
    );
}
