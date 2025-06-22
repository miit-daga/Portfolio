"use client"

import { cn } from "@/utils/cn"
import { motion, stagger, useAnimate, useInView } from "framer-motion"
import { useEffect, useState, useRef, useCallback } from "react"

export const HeroTypewriterEffect = ({
    words,
    className,
    cursorClassName,
    repeatDelay = 5000,
}: {
    words: {
        text: string
        className?: string
    }[]
    className?: string
    cursorClassName?: string
    repeatDelay?: number
}) => {
    const wordsArray = words.map((word) => ({
        ...word,
        text: word.text.split(""),
    }))

    const [scope, animate] = useAnimate()
    const isInView = useInView(scope, { once: true })
    const [animationCycle, setAnimationCycle] = useState(0)
    const [isComplete, setIsComplete] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isRunningRef = useRef(false)
    const hasStartedRef = useRef(false)

    const runAnimationCycle = useCallback(async () => {
        if (isRunningRef.current) return

        isRunningRef.current = true

        try {
            setIsComplete(false)
            await animate(
                "span",
                {
                    display: "none",
                    opacity: 0,
                },
                { duration: 0 },
            )

            await animate(
                "span",
                {
                    display: "inline-block",
                    opacity: 1,
                },
                {
                    duration: 0.3,
                    delay: stagger(0.1),
                    ease: "easeInOut",
                },
            )
            setIsComplete(true)

            await new Promise((resolve) => {
                timeoutRef.current = setTimeout(resolve, repeatDelay)
            })
            await animate(
                "span",
                {
                    opacity: 0,
                },
                {
                    duration: 0.1,
                    delay: stagger(0.02, { from: "last" }),
                    ease: "easeInOut",
                },
            )
            await new Promise((resolve) => {
                timeoutRef.current = setTimeout(resolve, 500)
            })

            setAnimationCycle((prev) => prev + 1)
        } catch (error) {
            console.error("Animation error:", error)
        } finally {
            isRunningRef.current = false
        }
    }, [animate, repeatDelay])

    useEffect(() => {
        if (isInView && !hasStartedRef.current) {
            hasStartedRef.current = true
            runAnimationCycle()
        }

        if (hasStartedRef.current && animationCycle > 0) {
            runAnimationCycle()
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [isInView, animationCycle, runAnimationCycle])

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            isRunningRef.current = false
        }
    }, [])

    return (
        <div className={cn("text-base sm:text-xl md:text-3xl lg:text-5xl font-bold text-center relative", className)}>
            <div className="inline-flex items-center justify-center">
                <motion.div ref={scope} className="inline">
                    {wordsArray.map((word, idx) => (
                        <div key={`word-${idx}`} className="inline-block">
                            {word.text.map((char, index) => (
                                <motion.span
                                    initial={{
                                        display: "none",
                                        opacity: 0,
                                    }}
                                    key={`char-${index}-${animationCycle}`}
                                    className={cn("dark:text-white text-black", word.className)}
                                >
                                    {char}
                                </motion.span>
                            ))}
                            &nbsp;
                        </div>
                    ))}
                </motion.div>
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: 1,
                        backgroundColor: "white",
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: isComplete ? 0 : Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                    }}
                    className={cn("inline-block rounded-sm w-[4px]", cursorClassName)}
                    style={{
                        height: "1em",
                        position: "relative",
                        display: isComplete ? "none" : "inline-block",
                    }}
                />
            </div>
        </div>
    )
}
