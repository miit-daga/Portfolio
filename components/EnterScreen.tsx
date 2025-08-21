"use client"

import { useState } from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { RocketIcon } from "./ui/rocket"

interface EnterScreenProps {
    onAnimationComplete: () => void
}

export const EnterScreen = ({ onAnimationComplete }: EnterScreenProps) => {
    const [animationState, setAnimationState] = useState("initial")
    const [countdownNumber, setCountdownNumber] = useState(3)

    const handleEnterClick = () => {
        setAnimationState("countdown")
        setCountdownNumber(3)
    }
    const rocketVariants: Variants = {
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
    }

    const countdownVariants: Variants = {
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
    }

    const smokeContainerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    }

    const smokePuffVariants: Variants = {
        hidden: { opacity: 0, scale: 0, y: 0 },
        visible: {
            opacity: [0.8, 0],
            scale: [1, 3],
            y: [0, -30],
            transition: { duration: 1.5, ease: "easeOut" },
        },
    }

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-black">
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

            {/* Starfield */}
            <AnimatePresence>
                {animationState === "takeoff" && (
                    <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.8 }}
                    >
                        {[...Array(100)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute bg-white rounded-full"
                                initial={{
                                    x: `${Math.random() * 100}vw`,
                                    y: `${Math.random() * 100}vh`,
                                    scale: Math.random() * 1.5 + 0.5,
                                    opacity: 0,
                                }}
                                animate={{
                                    y: "120vh",
                                    opacity: [0, 1, 0],
                                    transition: {
                                        duration: Math.random() * 2 + 1,
                                        repeat: Number.POSITIVE_INFINITY,
                                        delay: Math.random() * 2,
                                    },
                                }}
                                style={{
                                    width: `${Math.random() * 2 + 1}px`,
                                    height: `${Math.random() * 2 + 1}px`,
                                }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative flex flex-col items-center justify-center h-full">
                <motion.div
                    variants={rocketVariants}
                    initial="initial"
                    animate={animationState}
                    className="mb-16"
                    onAnimationComplete={(definition) => {
                        if (definition === "shake") {
                            setAnimationState("takeoff")
                        }
                        if (definition === "takeoff") {
                            setTimeout(onAnimationComplete, 1200)
                        }
                    }}
                >
                    <RocketIcon
                        className="w-24 h-24 md:w-32 md:h-32"
                        isIgnited={animationState !== "initial" && animationState !== "countdown"}
                    />
                </motion.div>
                <motion.div
                    animate={{ opacity: animationState === "initial" ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center"
                >
                    <motion.button
                        onClick={handleEnterClick}
                        disabled={animationState !== "initial"}
                        className="relative px-12 py-5 text-lg font-bold text-white bg-gray-900 border-2 border-gray-700 rounded-full shadow-lg hover:shadow-xl backdrop-blur-sm overflow-hidden"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.1, ease: "easeOut" }}
                        whileHover={{
                            scale: 1.05,
                            boxShadow: "0 0 30px rgba(120, 120, 120, 0.4)",
                            transition: { duration: 0.2 },
                        }}
                        whileTap={{ scale: 0.95 }}
                    >
                        BLAST OFF TO SPACE
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-teal-400/20 animate-pulse opacity-60 pointer-events-none" />
                        <div
                            className="absolute inset-0 rounded-full bg-gradient-to-l from-pink-400/10 via-transparent to-purple-400/10 animate-pulse pointer-events-none"
                            style={{ animationDelay: "0.5s" }}
                        />
                    </motion.button>
                </motion.div>

                <AnimatePresence>
                    {animationState === "countdown" && (
                        <motion.div
                            className="absolute top-1/3 text-8xl font-bold text-white"
                            variants={countdownVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            key={countdownNumber}
                            onAnimationComplete={() => {
                                if (countdownNumber > 1) {
                                    setTimeout(() => setCountdownNumber(countdownNumber - 1), 200)
                                } else {
                                    setTimeout(() => setAnimationState("shake"), 300)
                                }
                            }}
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
                            {[...Array(15)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-6 h-6 bg-gray-300 rounded-full opacity-70"
                                    variants={smokePuffVariants}
                                    style={{
                                        position: "absolute",
                                        x: (Math.random() - 0.5) * 40,
                                    }}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}