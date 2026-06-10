"use client";
import { useCallback, useRef, useState } from "react";
import { motion, useMotionValue, useMotionTemplate, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

// Holographic crew ID: tilts with the cursor, foil shine sweeps across the
// face, click/tap flips it over to a QR code linking to the resume.
const QR_TARGET = process.env.NEXT_PUBLIC_RESUME_LINK || "https://miitdaga.dev";

export const CrewCard = () => {
    const reduce = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const [flipped, setFlipped] = useState(false);

    // Pointer position as 0..1 across the card
    const px = useMotionValue(0.5);
    const py = useMotionValue(0.5);
    const sx = useSpring(px, { stiffness: 150, damping: 20 });
    const sy = useSpring(py, { stiffness: 150, damping: 20 });

    const rotateX = useTransform(sy, [0, 1], ["9deg", "-9deg"]);
    const rotateY = useTransform(sx, [0, 1], ["-9deg", "9deg"]);

    // Foil: a moving glare spot plus a rainbow band that slides with the cursor
    const glareX = useTransform(sx, [0, 1], ["20%", "80%"]);
    const glareY = useTransform(sy, [0, 1], ["20%", "80%"]);
    const bandPos = useTransform(sx, [0, 1], ["0%", "100%"]);
    const foil = useMotionTemplate`
        radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.22), transparent 42%),
        linear-gradient(112deg,
            transparent 18%,
            rgba(255,80,200,0.16) 32%,
            rgba(80,255,255,0.18) 46%,
            rgba(255,235,90,0.13) 58%,
            rgba(120,120,255,0.16) 70%,
            transparent 84%)`;

    const onMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (reduce || !ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            px.set((e.clientX - rect.left) / rect.width);
            py.set((e.clientY - rect.top) / rect.height);
        },
        [reduce, px, py],
    );

    const onMouseLeave = useCallback(() => {
        px.set(0.5);
        py.set(0.5);
    }, [px, py]);

    return (
        <div className="flex flex-col items-center gap-3">
            <div style={{ perspective: 1100 }}>
                <motion.div
                    ref={ref}
                    onMouseMove={onMouseMove}
                    onMouseLeave={onMouseLeave}
                    onClick={() => setFlipped((f) => !f)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setFlipped((f) => !f);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={flipped ? "Crew ID card, showing resume QR code. Activate to flip back." : "Crew ID card. Activate to flip and reveal the resume QR code."}
                    className="relative h-[210px] w-[336px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-[226px] sm:w-[362px] rounded-2xl"
                    style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
                >
                    <motion.div
                        className="relative h-full w-full"
                        animate={{ rotateY: flipped ? 180 : 0 }}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24 }}
                        style={{ transformStyle: "preserve-3d" }}
                    >
                        {/* ---- FRONT ---- */}
                        <div
                            className="absolute inset-0 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9),0_0_24px_rgba(45,212,191,0.08)]"
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            {/* Header strip */}
                            <div className="flex items-center justify-between px-5 pt-4">
                                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-teal-400/80">
                                    starship portfolio &middot; crew id
                                </p>
                                {/* Contact chip */}
                                <span className="block h-6 w-8 rounded-[5px] bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 opacity-80 shadow-[inset_0_0_4px_rgba(0,0,0,0.5)]" />
                            </div>

                            {/* Identity row */}
                            <div className="mt-4 flex items-center gap-4 px-5">
                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-teal-400/40 bg-black/60 shadow-[0_0_14px_rgba(45,212,191,0.25)]">
                                    <Image src="/profile.png" alt="" fill className="object-cover" sizes="64px" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-display text-xl font-bold tracking-wide text-white">MIIT DAGA</p>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400">
                                        software developer
                                    </p>
                                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-teal-300">
                                        callsign &middot; MIIT-1
                                    </p>
                                </div>
                            </div>

                            {/* Footer: barcode + clearance */}
                            <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-4">
                                <div>
                                    <div
                                        className="h-7 w-32 opacity-70"
                                        style={{
                                            background:
                                                "repeating-linear-gradient(90deg, #e5e5e5 0 2px, transparent 2px 4px, #e5e5e5 4px 5px, transparent 5px 9px, #e5e5e5 9px 12px, transparent 12px 14px)",
                                        }}
                                    />
                                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.3em] text-neutral-500">
                                        id &middot; 2026-md-001
                                    </p>
                                </div>
                                <p className="text-right font-mono text-[8px] uppercase leading-relaxed tracking-[0.2em] text-neutral-500">
                                    clearance
                                    <br />
                                    <span className="text-teal-400/90">full stack</span>
                                </p>
                            </div>

                            {/* Holographic foil */}
                            {!reduce && (
                                <>
                                    <motion.div
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0"
                                        style={{
                                            background: foil,
                                            backgroundPosition: bandPos,
                                            mixBlendMode: "color-dodge",
                                        }}
                                    />
                                    {/* Static micro-foil texture */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 opacity-[0.05]"
                                        style={{
                                            background:
                                                "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 5px)",
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        {/* ---- BACK ---- */}
                        <div
                            className="absolute inset-0 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        >
                            {/* Magnetic stripe */}
                            <div className="mt-5 h-9 w-full bg-black shadow-[inset_0_0_8px_rgba(255,255,255,0.06)]" />

                            <div className="flex items-center gap-5 px-6 pt-5">
                                <div className="rounded-lg border border-teal-400/30 bg-white/[0.04] p-2.5 shadow-[0_0_16px_rgba(45,212,191,0.15)]">
                                    <QRCodeSVG value={QR_TARGET} size={92} bgColor="transparent" fgColor="#5eead4" level="M" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-teal-300">
                                        scan for resume
                                    </p>
                                    <p className="mt-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.2em] text-neutral-500">
                                        issued 2026 &middot; earth station 03
                                        <br />
                                        if found, return to the
                                        <br />
                                        nearest launchpad
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-neutral-600">
                {flipped ? "tap to flip back" : "tap to flip"}
            </p>
        </div>
    );
};
