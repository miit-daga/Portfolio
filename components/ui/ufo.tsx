"use client";
import { motion } from "framer-motion";

// The flying saucer, shared by the contact scene (signal-rings.tsx), the idle
// alien's ride home (idle-alien.tsx) and the "Send a message" courier
// (mail-courier.tsx). In its own module so the courier, which ships with the
// page, does not drag the whole contact scene into the first download.

// ---- Flying saucer (SVG, gunmetal, directional lighting) ------------------
export const Ufo = ({ reduce, hatchOpen, thrust, alert = false }: { reduce: boolean | null; hatchOpen: boolean; thrust: boolean; alert?: boolean }) => (
    <motion.div
        className="relative"
        style={{ width: 58, height: 22 }}
        animate={reduce ? undefined : { y: [0, -1.5, 0] }}
        transition={reduce ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
    >
        <svg viewBox="0 0 58 24" width="58" height="24" style={{ overflow: "visible", display: "block" }} aria-hidden>
            <defs>
                <linearGradient id="sigUfoHull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7e8a99" />
                    <stop offset="0.4" stopColor="#46505e" />
                    <stop offset="0.75" stopColor="#232b36" />
                    <stop offset="1" stopColor="#11161e" />
                </linearGradient>
                <linearGradient id="sigUfoTop" x1="0.3" y1="0" x2="0.7" y2="1">
                    <stop offset="0" stopColor="#b8c2cd" />
                    <stop offset="0.6" stopColor="#5e6a78" />
                    <stop offset="1" stopColor="#39434f" />
                </linearGradient>
                <radialGradient id="sigUfoDome" cx="0.38" cy="0.28" r="1">
                    <stop offset="0" stopColor="#9fb4c2" stopOpacity="0.85" />
                    <stop offset="0.45" stopColor="#27343f" />
                    <stop offset="1" stopColor="#0a1118" />
                </radialGradient>
                <linearGradient id="sigUfoBeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(125,211,252,0.25)" />
                    <stop offset="1" stopColor="rgba(125,211,252,0)" />
                </linearGradient>
                <radialGradient id="sigUfoThrust" cx="0.5" cy="0.1" r="0.9">
                    <stop offset="0" stopColor="rgba(190,225,255,0.75)" />
                    <stop offset="1" stopColor="rgba(125,211,252,0)" />
                </radialGradient>
            </defs>

            {/* Ion thrust (takeoff / landing) */}
            <motion.ellipse
                cx="29"
                cy="24"
                rx="6"
                ry="8"
                fill="url(#sigUfoThrust)"
                animate={reduce ? { opacity: thrust ? 0.6 : 0 } : { opacity: thrust ? [0.4, 0.85, 0.4] : 0 }}
                transition={reduce ? { duration: 0.3 } : { duration: 0.5, repeat: thrust ? Infinity : 0, ease: "easeInOut" }}
            />
            {/* Boarding beam while the hatch is open */}
            <motion.path
                d="M25 18 L33 18 L40 32 L18 32 Z"
                fill="url(#sigUfoBeam)"
                animate={{ opacity: hatchOpen ? 1 : 0 }}
                transition={{ duration: 0.5 }}
            />

            {/* Smoked dome (behind the hull cap) */}
            <ellipse cx="29" cy="7" rx="7.5" ry="5.5" fill="url(#sigUfoDome)" />
            <path d="M24.5 4.6 Q27.5 2.8 31.5 4.2" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" fill="none" strokeLinecap="round" />

            {/* Upper hull cap */}
            <ellipse cx="29" cy="10.5" rx="13" ry="4.4" fill="url(#sigUfoTop)" />
            <path d="M18 9.2 Q29 6.4 40 9.2" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" fill="none" />

            {/* Main saucer */}
            <ellipse cx="29" cy="14.2" rx="28" ry="6.6" fill="url(#sigUfoHull)" />
            {/* Off-centre specular (keylight from upper-left) */}
            <ellipse cx="20" cy="11.6" rx="12" ry="2" fill="rgba(255,255,255,0.16)" />
            {/* Panel seams */}
            <path d="M3.5 15.5 Q29 22 54.5 15.5" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" fill="none" />
            <path d="M7 12.4 Q29 8.6 51 12.4" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" fill="none" />
            {/* Rim edge */}
            <ellipse cx="29" cy="14.2" rx="28" ry="6.6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            {/* Underside shadow */}
            <ellipse cx="29" cy="17.4" rx="15" ry="2.6" fill="rgba(0,0,0,0.45)" />

            {/* Hatch (opens/closes) */}
            <motion.ellipse
                cx="29"
                cy="17.8"
                rx="4.6"
                fill="#0a1016"
                stroke="rgba(125,211,252,0.55)"
                strokeWidth="0.5"
                // Start at the target: with no initial, the first frame read ry
                // off the element (there is none) and wrote "undefined"
                initial={false}
                animate={{ ry: hatchOpen ? 1.9 : 0.45, opacity: hatchOpen ? 1 : 0.45 }}
                transition={{ duration: 0.5 }}
            />

            {/* Dim warm running lights along the rim */}
            {[-21, -10.5, 0, 10.5, 21].map((dx, i) => (
                <motion.circle
                    key={i}
                    cx={29 + dx}
                    cy={16 - Math.abs(dx) * 0.055}
                    r={alert ? 1.1 : 0.75}
                    fill={alert ? "#f87171" : "#ffd9a0"}
                    // Poked: red, bright and blinking fast
                    animate={reduce ? undefined : alert ? { opacity: [0.15, 1, 0.15] } : { opacity: [0.2, 0.7, 0.2] }}
                    transition={reduce ? undefined : alert ? { duration: 0.28, delay: i * 0.05, repeat: Infinity } : { duration: 2.4, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
        </svg>
    </motion.div>
);
