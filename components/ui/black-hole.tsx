"use client";
import { motion } from "framer-motion";

// Visible singularity for the Konami "cosmic reset": an event-horizon core with a
// spinning accretion disk forms at viewport centre, matter streaks fall in, and it
// evaporates in a flash just before the reload. Total timeline ~2.4s (reload at 2.5s).
const T = 2.4;

const STREAKS = Array.from({ length: 10 }, (_, i) => ({
    angle: i * 36 + (i % 3) * 7,
    delay: 0.25 + i * 0.09,
}));

export const BlackHoleOverlay = () => (
    <div className="pointer-events-none fixed inset-0 z-[5500] flex items-center justify-center" aria-hidden>
        {/* Closing vignette */}
        <motion.div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at center, transparent 25%, rgba(0,0,0,0.9) 72%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeIn" }}
        />

        {/* Infalling matter streaks */}
        {STREAKS.map((s, i) => (
            <div key={i} className="absolute" style={{ transform: `rotate(${s.angle}deg)` }}>
                <motion.span
                    className="absolute h-[1.5px] rounded-full"
                    style={{
                        width: 56,
                        background: "linear-gradient(90deg, transparent, rgba(94,234,212,0.9))",
                        boxShadow: "0 0 4px rgba(45,212,191,0.6)",
                    }}
                    initial={{ x: 290, opacity: 0 }}
                    animate={{ x: 26, opacity: [0, 0.9, 0] }}
                    transition={{ duration: 0.7, delay: s.delay, repeat: 1, repeatDelay: 0.15, ease: "easeIn" }}
                />
            </div>
        ))}

        {/* Accretion disk */}
        <motion.div
            className="absolute rounded-full"
            style={{
                width: 280,
                height: 280,
                background:
                    "conic-gradient(from 0deg, transparent 5%, rgba(94,234,212,0.85) 30%, rgba(167,139,250,0.65) 52%, rgba(45,212,191,0.35) 68%, transparent 80%)",
                filter: "blur(6px)",
            }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: [0, 1, 1, 0.05], opacity: [0, 1, 1, 0], rotate: 900 }}
            transition={{
                duration: T,
                times: [0, 0.18, 0.85, 1],
                ease: "easeInOut",
                rotate: { duration: T, ease: "linear" },
            }}
        />

        {/* Event-horizon core */}
        <motion.div
            className="absolute rounded-full bg-black"
            style={{
                width: 130,
                height: 130,
                boxShadow: "0 0 50px 12px rgba(45,212,191,0.3), 0 0 110px 40px rgba(167,139,250,0.12), inset 0 0 24px rgba(0,0,0,1)",
                border: "1px solid rgba(94,234,212,0.35)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1, 1, 0.05] }}
            transition={{ duration: T, times: [0, 0.18, 0.85, 1], ease: "easeInOut" }}
        />

        {/* Photon ring shimmer */}
        <motion.div
            className="absolute rounded-full"
            style={{ width: 150, height: 150, border: "1.5px solid rgba(153,246,228,0.8)", filter: "blur(1px)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 1.04, 1, 0.05], opacity: [0, 0.9, 0.5, 0.9, 0] }}
            transition={{ duration: T, times: [0, 0.2, 0.5, 0.85, 1], ease: "easeInOut" }}
        />

        {/* Nothing escapes: total darkness into the reload */}
        <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1] }}
            transition={{ duration: T, times: [0, 0.78, 1], ease: "easeIn" }}
        />
    </div>
);
