"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

interface EnterScreenProps {
    onAnimationComplete: () => void
}

// 3D-projected starfield: gentle outward drift while idle, hyperspace streaks on enter.
// One canvas, DPR-capped, no shadows/filters - cheap enough to never dent PageSpeed.
type Star = { x: number; y: number; z: number; pz: number; color: string }

const STAR_COLORS = ["#ffffff", "#ffffff", "#ffffff", "#99f6e4", "#a5b4fc"]
const IDLE_SPEED = 0.0035
const WARP_RAMP = 0.16 // extra speed at full warp
const ENTER_MS = 1500

export const EnterScreen = ({ onAnimationComplete }: EnterScreenProps) => {
    const [isTransitioning, setIsTransitioning] = useState(false)
    const reduce = useReducedMotion()

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const warpStartRef = useRef<number | null>(null)
    const transitioningRef = useRef(false)

    // Per-device hint: touch has no Enter key, Macs call it Return
    const enterHint = useMemo(() => {
        if (typeof window === "undefined") return <>or press Enter &#8629; to begin</>
        if (window.matchMedia("(pointer: coarse)").matches) return <>tap the portal to begin</>
        if (/Mac/.test(navigator.platform)) return <>or press Return &#9166; to begin</>
        return <>or press Enter &#8629; to begin</>
    }, [])

    const handleEnterClick = useCallback(() => {
        if (transitioningRef.current) return
        transitioningRef.current = true
        warpStartRef.current = performance.now()
        setIsTransitioning(true)
        setTimeout(() => {
            onAnimationComplete()
        }, ENTER_MS)
    }, [onAnimationComplete])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleEnterClick()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [handleEnterClick])

    // Starfield
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let w = 0
        let h = 0
        let stars: Star[] = []
        let raf = 0
        let last = performance.now()
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

        const initStar = (s: Star) => {
            s.x = (Math.random() * 2 - 1) * 0.9
            s.y = (Math.random() * 2 - 1) * 0.9
            s.z = Math.random() * 0.9 + 0.1
            s.pz = s.z
            s.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
        }

        const setup = () => {
            w = window.innerWidth
            h = window.innerHeight
            canvas.width = Math.floor(w * dpr)
            canvas.height = Math.floor(h * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            const count = Math.min(190, Math.max(70, Math.floor((w * h) / 9000)))
            stars = Array.from({ length: count }, () => {
                const s = {} as Star
                initStar(s)
                return s
            })
        }
        setup()

        const project = (s: Star, z: number) => {
            const scale = Math.min(w, h) * 0.5
            return {
                x: w / 2 + (s.x / z) * scale,
                y: h / 2 + (s.y / z) * scale,
            }
        }

        const drawFrame = (warp: number, dtNorm: number) => {
            ctx.clearRect(0, 0, w, h)
            const speed = (IDLE_SPEED + warp * warp * WARP_RAMP) * dtNorm
            for (const s of stars) {
                s.pz = s.z
                s.z -= speed
                if (s.z <= 0.04) {
                    initStar(s)
                    continue
                }
                const cur = project(s, s.z)
                if (cur.x < -50 || cur.x > w + 50 || cur.y < -50 || cur.y > h + 50) {
                    initStar(s)
                    continue
                }
                const depth = 1 - s.z // 0 far .. ~1 near
                ctx.globalAlpha = Math.min(1, 0.25 + depth * 0.75)
                if (warp > 0.05) {
                    // Streak from previous depth to current
                    const prev = project(s, s.pz)
                    ctx.strokeStyle = s.color
                    ctx.lineWidth = Math.max(0.6, depth * 2.2)
                    ctx.beginPath()
                    ctx.moveTo(prev.x, prev.y)
                    ctx.lineTo(cur.x, cur.y)
                    ctx.stroke()
                } else {
                    ctx.fillStyle = s.color
                    const r = Math.max(0.4, depth * 1.5)
                    ctx.beginPath()
                    ctx.arc(cur.x, cur.y, r, 0, Math.PI * 2)
                    ctx.fill()
                }
            }
            ctx.globalAlpha = 1
        }

        if (reduce) {
            // Static sky: one draw, no animation loop
            drawFrame(0, 0)
            window.addEventListener("resize", setup)
            return () => window.removeEventListener("resize", setup)
        }

        const loop = (now: number) => {
            const dtNorm = Math.min(3, (now - last) / 16.7)
            last = now
            let warp = 0
            if (warpStartRef.current !== null) {
                warp = Math.min(1, (now - warpStartRef.current) / (ENTER_MS * 0.8))
            }
            drawFrame(warp, dtNorm)
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)

        window.addEventListener("resize", setup)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("resize", setup)
        }
    }, [reduce])

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-black">
            {/* Starfield */}
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

            {/* Soft vignette + central glow (static gradients, no filters) */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse at center, rgba(45,212,191,0.06) 0%, transparent 55%), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.8) 100%)",
                }}
            />

            {/* Center content - the name paints immediately (LCP), no opacity-0 entrance */}
            <motion.div
                className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
                animate={isTransitioning ? { opacity: 0, scale: 0.92 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeIn" }}
            >
                <h1 className="font-display mb-4 bg-gradient-to-b from-white via-teal-100 to-slate-400 bg-clip-text pb-2 text-4xl font-light leading-[1.2] tracking-wide text-transparent sm:text-5xl md:text-6xl lg:text-7xl">
                    Miit Daga
                </h1>
                <div className="mx-auto mb-6 h-px w-32 bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
                <p className="mb-12 text-lg font-light tracking-wide text-slate-300 sm:text-xl md:text-2xl">
                    Navigate the <span className="font-medium text-teal-400">digital cosmos</span>
                </p>

                {/* Portal button */}
                <motion.button
                    onClick={handleEnterClick}
                    disabled={isTransitioning}
                    aria-label="Enter the portfolio"
                    className="group relative flex h-32 w-32 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-36 sm:w-36"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    whileHover={reduce ? undefined : { scale: 1.05 }}
                    whileTap={reduce ? undefined : { scale: 0.97 }}
                >
                    {/* Rotating dashed outer ring */}
                    <span className="absolute inset-0 animate-[spin_28s_linear_infinite] rounded-full border border-dashed border-teal-400/35 motion-reduce:animate-none" />
                    {/* Glowing portal ring */}
                    <span className="absolute inset-2.5 rounded-full border border-teal-400/70 bg-teal-500/[0.06] shadow-[0_0_24px_rgba(45,212,191,0.3),inset_0_0_22px_rgba(45,212,191,0.15)] transition-all duration-300 group-hover:border-teal-300 group-hover:shadow-[0_0_42px_rgba(45,212,191,0.5),inset_0_0_30px_rgba(45,212,191,0.22)]" />
                    <span className="relative z-10 text-sm font-medium uppercase tracking-[0.3em] text-teal-200 transition-colors group-hover:text-white">
                        Enter
                    </span>
                </motion.button>

                <motion.p
                    className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    {enterHint}
                </motion.p>
            </motion.div>

            {/* Hyperspace transition overlay */}
            <AnimatePresence>
                {isTransitioning && (
                    <div className="pointer-events-none absolute inset-0 z-20">
                        {/* "Entering the cosmos" */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.35 }}
                                className="text-center"
                            >
                                <motion.h2
                                    className="font-display text-2xl font-light tracking-wider text-white sm:text-3xl md:text-4xl"
                                    initial={{ letterSpacing: "0.08em" }}
                                    animate={{ letterSpacing: "0.22em" }}
                                    transition={{ duration: 1.1, delay: 0.35, ease: "easeOut" }}
                                >
                                    Entering the cosmos
                                </motion.h2>
                                <motion.div
                                    className="mx-auto mt-4 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent"
                                    initial={{ width: 0 }}
                                    animate={{ width: 256 }}
                                    transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
                                />
                            </motion.div>
                        </div>

                        {/* Terminal flash into the Big Bang handoff */}
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                background:
                                    "radial-gradient(ellipse at center, rgba(204,251,241,0.95) 0%, rgba(45,212,191,0.5) 45%, rgba(0,0,0,0.9) 100%)",
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 1] }}
                            transition={{ duration: ENTER_MS / 1000, times: [0, 0.78, 1], ease: "easeIn" }}
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
