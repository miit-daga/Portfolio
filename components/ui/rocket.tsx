"use client"

import type React from "react"

import { motion } from "framer-motion"

interface RocketIconProps extends React.SVGProps<SVGSVGElement> {
    isIgnited?: boolean
}

export const RocketIcon = ({ isIgnited = false, ...props }: RocketIconProps) => (
    <motion.svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" fill="none" {...props}>
        <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B9DC3" />
                <stop offset="25%" stopColor="#DDE4ED" />
                <stop offset="50%" stopColor="#F8FAFC" />
                <stop offset="75%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id="noseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C2D12" />
                <stop offset="30%" stopColor="#DC2626" />
                <stop offset="70%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
            <linearGradient id="finGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#92400E" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <radialGradient id="engineGradient" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="70%" stopColor="#1F2937" />
                <stop offset="100%" stopColor="#111827" />
            </radialGradient>
        </defs>

        <path
            d="M36 70L36 42C36 32 41 25 50 25C59 25 64 32 64 42L64 70Z"
            fill="url(#bodyGradient)"
            stroke="#475569"
            strokeWidth="1"
        />

        <path d="M36 42C36 32 41 15 50 8C59 15 64 32 64 42" fill="url(#noseGradient)" stroke="#7F1D1D" strokeWidth="1" />

        <circle cx="50" cy="35" r="6" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
        <circle cx="50" cy="35" r="4.5" fill="#0F172A" />
        <circle cx="50" cy="35" r="3" fill="#1E40AF" opacity="0.8" />
        <ellipse cx="48" cy="33" rx="1" ry="1.5" fill="#60A5FA" opacity="0.6" />

        <line x1="38" y1="45" x2="62" y2="45" stroke="#64748B" strokeWidth="0.8" />
        <line x1="38" y1="52" x2="62" y2="52" stroke="#64748B" strokeWidth="0.8" />
        <line x1="38" y1="59" x2="62" y2="59" stroke="#64748B" strokeWidth="0.8" />
        <line x1="38" y1="66" x2="62" y2="66" stroke="#64748B" strokeWidth="0.8" />

        {/* Rivets */}
        <circle cx="40" cy="45" r="0.8" fill="#475569" />
        <circle cx="60" cy="45" r="0.8" fill="#475569" />
        <circle cx="40" cy="59" r="0.8" fill="#475569" />
        <circle cx="60" cy="59" r="0.8" fill="#475569" />

        <path d="M36 62L24 78C24 78 26 82 30 82L36 72Z" fill="url(#finGradient)" stroke="#92400E" strokeWidth="1" />
        <path d="M64 62L76 78C76 78 74 82 70 82L64 72Z" fill="url(#finGradient)" stroke="#92400E" strokeWidth="1" />

        <ellipse cx="50" cy="70" rx="8" ry="3" fill="url(#engineGradient)" stroke="#111827" strokeWidth="1" />
        <rect x="42" y="70" width="16" height="8" fill="url(#engineGradient)" stroke="#111827" strokeWidth="1" />
        <ellipse cx="50" cy="78" rx="6" ry="2" fill="#0F172A" />

        {/* Engine chamber details */}
        <circle cx="46" cy="74" r="1" fill="#374151" />
        <circle cx="50" cy="74" r="1" fill="#374151" />
        <circle cx="54" cy="74" r="1" fill="#374151" />

        {isIgnited && (
            <>
                {/* Flame 1 */}
                <motion.path
                    d="M46 76L48 88L46 92L44 86Z"
                    fill="#F59E0B"
                    animate={{
                        scaleY: [1, 1.2, 0.8, 1.1, 1],
                        y: [0, 1, -1, 0.5, 0],
                    }}
                    transition={{
                        duration: 0.5,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                    }}
                    style={{ transformOrigin: "46px 76px" }}
                />

                {/* Flame 2 - Center flame */}
                <motion.path
                    d="M50 76L51 90L50 95L49 88Z"
                    fill="#EF4444"
                    animate={{
                        scaleY: [1, 0.9, 1.2, 1],
                        y: [0, -1, 1, 0],
                    }}
                    transition={{
                        duration: 0.4,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                        delay: 0.1,
                    }}
                    style={{ transformOrigin: "50px 76px" }}
                />

                {/* Flame 3 */}
                <motion.path
                    d="M54 76L56 86L54 92L52 88Z"
                    fill="#F59E0B"
                    animate={{
                        scaleY: [1, 1.1, 0.9, 1.3, 1],
                        y: [0, 0.5, -0.5, 1, 0],
                    }}
                    transition={{
                        duration: 0.6,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                        delay: 0.2,
                    }}
                    style={{ transformOrigin: "54px 76px" }}
                />
                <motion.path
                    d="M47 76L48 82L47 85L46 81Z"
                    fill="#FBBF24"
                    animate={{
                        scaleY: [1, 1.3, 0.7, 1],
                        opacity: [0.8, 1, 0.6, 0.8],
                    }}
                    transition={{
                        duration: 0.3,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                        delay: 0.05,
                    }}
                    style={{ transformOrigin: "47px 76px" }}
                />

                <motion.path
                    d="M53 76L54 82L53 85L52 81Z"
                    fill="#FBBF24"
                    animate={{
                        scaleY: [1, 0.8, 1.2, 1],
                        opacity: [0.8, 0.6, 1, 0.8],
                    }}
                    transition={{
                        duration: 0.35,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                        delay: 0.15,
                    }}
                    style={{ transformOrigin: "53px 76px" }}
                />
            </>
        )}
    </motion.svg>
)
