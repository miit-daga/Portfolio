"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"

import { RocketIcon } from "./ui/rocket"

interface EnterScreenProps {
    onAnimationComplete: () => void
}

export const EnterScreen = ({ onAnimationComplete }: EnterScreenProps) => {
    const [animationState, setAnimationState] = useState("initial")
    const [countdownNumber, setCountdownNumber] = useState(3)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        setIsLoaded(true)
    }, [])

    const handleEnterClick = useCallback(() => {
        setAnimationState("countdown")
        setCountdownNumber(3)
    }, [])

    const rocketVariants: Variants = useMemo(
        () => ({
            initial: { y: 0, x: 0, rotate: 0, scale: 1 },
            countdown: { y: 0, x: 0, rotate: 0, scale: 1 },
            shake: {
                y: 0,
                x: [0, -2, 2, -2, 2, 0],
                rotate: [0, -0.5, 0.5, -0.5, 0.5, 0],
                transition: { duration: 0.5, repeat: 2, ease: "easeInOut" },
            },
            takeoff: {
                y: "-150vh",
                x: 0,
                scale: 0.5,
                rotate: 10,
                transition: { duration: 2.5, ease: "easeOut" },
            },
        }),
        [],
    )

    const countdownVariants: Variants = useMemo(
        () => ({
            initial: { opacity: 0, scale: 0.5 },
            animate: {
                opacity: 1,
                scale: [0.5, 1.2, 1],
                transition: { duration: 0.8, ease: "easeOut" },
            },
            exit: {
                opacity: 0,
                scale: 0.5,
                transition: { duration: 0.2 },
            },
        }),
        [],
    )

    const smokeContainerVariants: Variants = useMemo(
        () => ({
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.1,
                    delayChildren: 0.2,
                },
            },
        }),
        [],
    )

    const smokePuffVariants: Variants = useMemo(
        () => ({
            hidden: { opacity: 0, scale: 0, y: 0 },
            visible: {
                opacity: [0.8, 0],
                scale: [1, 3],
                y: [0, -30],
                transition: { duration: 1.5, ease: "easeOut" },
            },
        }),
        [],
    )

    const stars = useMemo(
        () =>
            [...Array(30)].map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                scale: Math.random() * 1.5 + 0.5,
                duration: Math.random() * 2 + 1,
                delay: Math.random() * 2,
                size: Math.random() * 2 + 1,
            })),
        [],
    )

    const smokePuffs = useMemo(
        () =>
            [...Array(6)].map((_, i) => ({
                id: i,
                x: (Math.random() - 0.5) * 40,
            })),
        [],
    )

    const handleAnimationComplete = useCallback(
        (definition: string) => {
            if (definition === "shake") {
                setAnimationState("takeoff")
            }
            if (definition === "takeoff") {
                setTimeout(onAnimationComplete, 1200)
            }
        },
        [onAnimationComplete],
    )

    const handleCountdownComplete = useCallback(() => {
        if (countdownNumber > 1) {
            setTimeout(() => setCountdownNumber(countdownNumber - 1), 200)
        } else {
            setTimeout(() => setAnimationState("shake"), 300)
        }
    }, [countdownNumber])

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-black">
            <h1 className="sr-only">Miit Daga Portfolio - Blast Off</h1>

            <div className="relative flex flex-col items-center justify-center h-full">
                <h1
                    className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-6 sm:mb-8 text-center tracking-wide px-4 max-w-4xl transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"
                        }`}
                    style={{
                        opacity: animationState === "initial" ? 1 : 0,
                        transition: "opacity 0.5s ease",
                    }}
                >
                    System Online. Ready for Liftoff!
                </h1>

                <motion.div
                    variants={rocketVariants}
                    initial="initial"
                    animate={animationState}
                    className="mb-16"
                    onAnimationComplete={handleAnimationComplete}
                >
                    <RocketIcon
                        className="w-16 h-16 sm:w-20 sm:h-20 md:w-32 md:h-32"
                        isIgnited={animationState !== "initial" && animationState !== "countdown"}
                    />
                </motion.div>

                <div
                    className="flex justify-center"
                    style={{
                        opacity: animationState === "initial" ? 1 : 0,
                        transition: "opacity 0.5s ease",
                    }}
                >
                    <button
                        onClick={handleEnterClick}
                        disabled={animationState !== "initial"}
                        className={`relative px-6 py-3 sm:px-8 sm:py-4 md:px-12 md:py-5 text-sm sm:text-base md:text-lg font-bold text-white bg-gray-900 border-2 border-gray-700 rounded-full shadow-lg hover:shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-200 ${animationState === "initial" ? "hover:scale-105" : ""
                            }`}
                        style={{
                            transform: "scale(1)",
                            opacity: isLoaded ? 1 : 0,
                        }}
                    >
                        <span className="block sm:hidden">BLAST OFF</span>
                        <span className="hidden sm:block">BLAST OFF TO SPACE</span>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-teal-400/20 animate-pulse opacity-60 pointer-events-none" />
                        <div
                            className="absolute inset-0 rounded-full bg-gradient-to-l from-pink-400/10 via-transparent to-purple-400/10 animate-pulse pointer-events-none"
                            style={{ animationDelay: "0.5s" }}
                        />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {animationState === "takeoff" && (
                    <motion.div
                        className="absolute inset-0 bg-black"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 3, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {animationState === "takeoff" && (
                    <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.8 }}
                    >
                        {stars.map((star) => (
                            <motion.div
                                key={star.id}
                                className="absolute bg-white rounded-full"
                                initial={{
                                    x: `${star.x}vw`,
                                    y: `${star.y}vh`,
                                    scale: star.scale,
                                    opacity: 0,
                                }}
                                animate={{
                                    y: "120vh",
                                    opacity: [0, 1, 0],
                                    transition: {
                                        duration: star.duration,
                                        repeat: Number.POSITIVE_INFINITY,
                                        delay: star.delay,
                                    },
                                }}
                                style={{
                                    width: `${star.size}px`,
                                    height: `${star.size}px`,
                                }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {animationState === "countdown" && (
                    <motion.div
                        className="absolute top-1/3 text-8xl font-bold text-white"
                        variants={countdownVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        key={countdownNumber}
                        onAnimationComplete={handleCountdownComplete}
                    >
                        {countdownNumber}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {(animationState === "shake" || animationState === "takeoff") && (
                    <motion.div
                        className="absolute flex justify-center"
                        style={{
                            bottom: "calc(50% - 0.1px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                        }}
                        variants={smokeContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                    >
                        {smokePuffs.map((puff) => (
                            <motion.div
                                key={puff.id}
                                className="w-6 h-6 bg-gray-300 rounded-full opacity-70"
                                variants={smokePuffVariants}
                                style={{
                                    position: "absolute",
                                    x: puff.x,
                                }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
