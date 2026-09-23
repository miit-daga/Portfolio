"use client";
import { motion } from "framer-motion";

// The contact scene's little alien crew member (signal-rings.tsx), also the
// back-to-top rocket's hitchhiker (BackToTop.tsx). Own module so the rocket,
// which ships with the page, does not pull in the whole contact scene.

// ---- Alien (SVG, muted sage, soft key light) ------------------------------
export const Alien = ({ reduce, leader = false }: { reduce: boolean | null; leader?: boolean }) => (
    <div className="relative" style={{ width: 20, height: 34, transform: leader ? "scale(1.3)" : undefined, transformOrigin: "bottom center" }}>
        {/* faint presence glow, just enough to read on the dark ground */}
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 24, height: 34, background: `radial-gradient(ellipse at center, rgba(125,200,180,${leader ? 0.2 : 0.13}), transparent 70%)`, filter: "blur(2px)" }}
        />
        <motion.div
            className="absolute inset-0"
            animate={reduce ? undefined : { y: [0, -1.5, 0] }}
            transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
            <svg viewBox="0 0 20 34" width="20" height="34" style={{ overflow: "visible", display: "block" }} aria-hidden>
                <defs>
                    <radialGradient id="sigAlienHead" cx="0.4" cy="0.28" r="1">
                        <stop offset="0" stopColor="#c2d4c8" />
                        <stop offset="0.55" stopColor="#7e988a" />
                        <stop offset="1" stopColor="#465a4f" />
                    </radialGradient>
                    <linearGradient id="sigAlienBody" x1="0.3" y1="0" x2="0.7" y2="1">
                        <stop offset="0" stopColor="#9db4a6" />
                        <stop offset="1" stopColor="#4c6156" />
                    </linearGradient>
                </defs>

                {/* ground shadow */}
                <ellipse cx="10" cy="33" rx="6" ry="1.5" fill="rgba(0,0,0,0.5)" />

                {/* legs */}
                <path d="M8.2 25.5 L7.7 31.6" stroke="url(#sigAlienBody)" strokeWidth="2" strokeLinecap="round" />
                <path d="M11.8 25.5 L12.3 31.6" stroke="url(#sigAlienBody)" strokeWidth="2" strokeLinecap="round" />

                {/* arms, slightly bent */}
                <path d="M6.6 18 Q4.6 20.5 5.2 23.5" stroke="url(#sigAlienBody)" strokeWidth="1.7" strokeLinecap="round" fill="none" />
                <path d="M13.4 18 Q15.4 20.5 14.8 23.5" stroke="url(#sigAlienBody)" strokeWidth="1.7" strokeLinecap="round" fill="none" />

                {/* torso, narrow shoulders */}
                <path d="M7.2 16.5 Q10 15.2 12.8 16.5 L12.2 26 Q10 27.2 7.8 26 Z" fill="url(#sigAlienBody)" />
                {/* torso rim light */}
                <path d="M7.6 17 Q8 21 8 25.4" stroke="rgba(220,240,228,0.35)" strokeWidth="0.5" fill="none" />

                {/* elongated head, tapered chin */}
                <path d="M10 1.2 C14.6 1.2 16.7 4.8 16.1 8.8 C15.6 12.4 12.9 15.4 10 15.4 C7.1 15.4 4.4 12.4 3.9 8.8 C3.3 4.8 5.4 1.2 10 1.2 Z" fill="url(#sigAlienHead)" />
                {/* skull highlight */}
                <path d="M6.4 3.6 Q8.2 2.2 10.6 2.5" stroke="rgba(235,245,238,0.5)" strokeWidth="0.6" fill="none" strokeLinecap="round" />

                {/* slanted almond eyes with a faint glint */}
                <path d="M5.2 7.4 C6.3 6 8.2 6.6 8.5 8.3 C8.7 9.8 7.2 10.9 6.1 10.1 C5.1 9.4 4.7 8.2 5.2 7.4 Z" fill="#0c1310" />
                <path d="M14.8 7.4 C13.7 6 11.8 6.6 11.5 8.3 C11.3 9.8 12.8 10.9 13.9 10.1 C14.9 9.4 15.3 8.2 14.8 7.4 Z" fill="#0c1310" />
                <circle cx="6.6" cy="7.8" r="0.4" fill="rgba(255,255,255,0.55)" />
                <circle cx="13.2" cy="7.8" r="0.4" fill="rgba(255,255,255,0.55)" />

                {/* leader's circlet: a slim metal band with a teal gem */}
                {leader && (
                    <g>
                        <path d="M4.6 4.9 Q10 2.6 15.4 4.9" stroke="#9aa9b8" strokeWidth="1" fill="none" strokeLinecap="round" />
                        <circle cx="10" cy="3.1" r="1.4" fill="rgba(94,234,212,0.25)" />
                        <circle cx="10" cy="3.1" r="0.75" fill="#5eead4" />
                    </g>
                )}
            </svg>
        </motion.div>
    </div>
);
