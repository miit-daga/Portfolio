"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface EnterScreenProps {
    onAnimationComplete: () => void
}

export const EnterScreen = ({ onAnimationComplete }: EnterScreenProps) => {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isTransitioning, setIsTransitioning] = useState(false)

    useEffect(() => {
        setIsLoaded(true)
    }, [])

    const handleEnterClick = useCallback(() => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setTimeout(() => {
            onAnimationComplete()
        }, 1500)
    }, [onAnimationComplete, isTransitioning])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === "Enter" || e.key === " ") && isLoaded && !isTransitioning) {
                e.preventDefault()
                handleEnterClick()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isLoaded, isTransitioning, handleEnterClick])

    // Fixed star positions to avoid hydration mismatch
    const stars = useMemo(
        () => [
            { id: 1, x: 22, y: 31, scale: 1.4, size: 2, opacity: 0.7 },
            { id: 2, x: 47, y: 12, scale: 0.9, size: 2, opacity: 0.6 },
            { id: 3, x: 89, y: 45, scale: 1.2, size: 1, opacity: 0.8 },
            { id: 4, x: 15, y: 67, scale: 0.7, size: 2, opacity: 0.5 },
            { id: 5, x: 73, y: 23, scale: 1.1, size: 2, opacity: 0.9 },
            { id: 6, x: 34, y: 89, scale: 0.8, size: 1, opacity: 0.6 },
            { id: 7, x: 56, y: 34, scale: 1.3, size: 2, opacity: 0.7 },
            { id: 8, x: 91, y: 78, scale: 0.9, size: 1, opacity: 0.5 },
            { id: 9, x: 12, y: 56, scale: 1.0, size: 2, opacity: 0.8 },
            { id: 10, x: 67, y: 41, scale: 1.2, size: 1, opacity: 0.6 },
            { id: 11, x: 28, y: 15, scale: 0.8, size: 2, opacity: 0.7 },
            { id: 12, x: 84, y: 92, scale: 1.1, size: 1, opacity: 0.9 },
            { id: 13, x: 43, y: 68, scale: 0.7, size: 2, opacity: 0.5 },
            { id: 14, x: 76, y: 28, scale: 1.4, size: 1, opacity: 0.8 },
            { id: 15, x: 19, y: 83, scale: 1.0, size: 2, opacity: 0.6 },
            { id: 16, x: 52, y: 47, scale: 0.9, size: 1, opacity: 0.7 },
            { id: 17, x: 88, y: 16, scale: 1.3, size: 2, opacity: 0.8 },
            { id: 18, x: 25, y: 74, scale: 0.8, size: 1, opacity: 0.5 },
            { id: 19, x: 61, y: 39, scale: 1.2, size: 2, opacity: 0.9 },
            { id: 20, x: 7, y: 91, scale: 0.7, size: 1, opacity: 0.6 },
            { id: 21, x: 94, y: 52, scale: 1.1, size: 2, opacity: 0.7 },
            { id: 22, x: 38, y: 18, scale: 0.9, size: 1, opacity: 0.8 },
            { id: 23, x: 72, y: 85, scale: 1.0, size: 2, opacity: 0.5 },
            { id: 24, x: 16, y: 62, scale: 1.4, size: 1, opacity: 0.9 },
            { id: 25, x: 49, y: 27, scale: 0.8, size: 2, opacity: 0.6 },
            { id: 26, x: 83, y: 94, scale: 1.2, size: 1, opacity: 0.7 },
            { id: 27, x: 31, y: 58, scale: 0.9, size: 2, opacity: 0.8 },
            { id: 28, x: 67, y: 36, scale: 1.1, size: 1, opacity: 0.5 },
            { id: 29, x: 21, y: 77, scale: 0.7, size: 2, opacity: 0.6 },
            { id: 30, x: 95, y: 44, scale: 1.3, size: 1, opacity: 0.9 },
        ],
        []
    )

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-black">

            {/* Animated starfield background */}
            <AnimatePresence>
                <div className="absolute inset-0">
                    {stars.map((star) => (
                        <motion.div
                            key={star.id}
                            className="absolute rounded-full bg-white"
                            initial={{
                                x: `${star.x}vw`,
                                y: `${star.y}vh`,
                                scale: star.scale,
                                opacity: star.opacity,
                            }}
                            animate={{
                                y: "120vh",
                                opacity: [star.opacity, star.opacity * 0.3, 0],
                                transition: {
                                    duration: 3 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: star.id * 0.1,
                                    ease: "linear",
                                },
                            }}
                            style={{
                                width: `${star.size}px`,
                                height: `${star.size}px`,
                            }}
                        />
                    ))}
                </div>
            </AnimatePresence>

            <div className="relative flex flex-col items-center justify-center h-full text-center">
                {/* Professional title and subtitle */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                        opacity: isLoaded && !isTransitioning ? 1 : 0,
                        y: isLoaded && !isTransitioning ? 0 : 20
                    }}
                    transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="mb-8"
                >
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white mb-4 tracking-wide">
                        Miit Daga
                    </h1>
                    <div className="w-32 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-6"></div>
                    <p className="text-lg sm:text-xl md:text-2xl text-slate-300 font-light tracking-wide">
                        Navigate the <span className="text-blue-400 font-medium">digital cosmos</span>
                    </p>
                </motion.div>

                {/* Professional Enter Button */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: isLoaded && !isTransitioning ? 1 : 0,
                        scale: isLoaded && !isTransitioning ? 1 : 0.9
                    }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex justify-center"
                >
                    <button
                        onClick={handleEnterClick}
                        disabled={isTransitioning}
                        className="group relative px-8 py-4 text-sm sm:text-base font-medium text-white
                                 border border-blue-400/50 rounded-none bg-slate-900/30 backdrop-blur-sm
                                 hover:bg-blue-500/20 hover:border-blue-400 transition-all duration-300
                                 tracking-wider uppercase overflow-hidden disabled:opacity-50"
                        style={{
                            opacity: isLoaded ? 1 : 0,
                        }}
                    >
                        <span className="relative z-10">Begin Journey</span>

                        {/* Subtle hover effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10
                                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700
                                      ease-in-out" />
                    </button>
                </motion.div>
            </div>

            {/* Transition overlay */}
            <AnimatePresence>
                {isTransitioning && (
                    <motion.div
                        className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        {/* Deep space background */}
                        <div className="absolute inset-0 bg-black" />

                        {/* Twinkling stars */}
                        {[
                            { x: 10, y: 15, s: 3 }, { x: 85, y: 10, s: 2.5 },
                            { x: 25, y: 80, s: 2 }, { x: 70, y: 70, s: 3 },
                            { x: 50, y: 5, s: 2.5 }, { x: 90, y: 50, s: 2 },
                            { x: 5, y: 45, s: 3 }, { x: 40, y: 90, s: 2.5 },
                            { x: 65, y: 30, s: 2 }, { x: 30, y: 55, s: 3 },
                            { x: 78, y: 88, s: 2 }, { x: 15, y: 25, s: 2.5 },
                            { x: 55, y: 42, s: 2 }, { x: 95, y: 75, s: 3 },
                            { x: 35, y: 12, s: 2.5 }, { x: 82, y: 35, s: 2 },
                        ].map((star, i) => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full bg-white"
                                style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.s, height: star.s }}
                                initial={{ opacity: 0.7 }}
                                animate={{ opacity: [0.7, 0.2, 0.7] }}
                                transition={{ duration: 0.8 + (i % 4) * 0.3, repeat: Infinity, delay: i * 0.05, ease: "easeInOut" }}
                            />
                        ))}

                        {/* Expanding ring */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                className="rounded-full border border-blue-400/30"
                                initial={{ width: 0, height: 0, opacity: 0.6 }}
                                animate={{ width: 600, height: 600, opacity: 0 }}
                                transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
                            />
                        </div>

                        {/* Glow behind text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                className="absolute rounded-full"
                                style={{
                                    width: 300,
                                    height: 300,
                                    background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
                                }}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: [0.8, 1.1, 0.9], opacity: [0, 0.8, 0.6] }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                            />
                        </div>

                        {/* Text content */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                                className="text-center"
                            >
                                <motion.h2
                                    className="text-2xl sm:text-3xl md:text-4xl font-light text-white mb-4 tracking-wider"
                                    initial={{ letterSpacing: "0.05em" }}
                                    animate={{ letterSpacing: "0.15em" }}
                                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                                >
                                    Entering the cosmos
                                </motion.h2>
                                <motion.div
                                    className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto"
                                    initial={{ width: 0 }}
                                    animate={{ width: 256 }}
                                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                                />
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}