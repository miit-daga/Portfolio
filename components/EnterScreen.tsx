"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useMotionTemplate, useTransform, animate } from "framer-motion"
import { Porthole } from "./ui/porthole"

interface EnterScreenProps {
    onAnimationComplete: () => void
    /** Called as the transition starts, so the site can render behind it and be revealed, not swapped in */
    onReveal?: () => void
}

// 3D-projected starfield: gentle outward drift while idle, hyperspace streaks on enter.
// One canvas, DPR-capped, no shadows/filters - cheap enough to never dent PageSpeed.
type Star = { x: number; y: number; z: number; pz: number; color: string }

const STAR_COLORS = ["#ffffff", "#ffffff", "#ffffff", "#99f6e4", "#a5b4fc"]
const IDLE_SPEED = 0.0035
const WARP_RAMP = 0.16 // extra speed at full warp
// The Big Bang: the sky and the portal collapse into a point, it holds, and a
// shockwave bursts out; the site shows through inside the ring as it grows
const COLLAPSE_MS = 750
const BANG_AT = 1000
const RING_MS = 1050
const ENTER_MS = BANG_AT + RING_MS
const SPARKS = Array.from({ length: 34 }, (_, i) => {
    const a = (i / 34) * Math.PI * 2 + ((i * 37) % 10) / 20
    return { a, d: 0.35 + ((i * 53) % 40) / 100, s: 2 + ((i * 29) % 4), c: i % 3 === 0 ? "#a5b4fc" : i % 3 === 1 ? "#99f6e4" : "#ffffff", delay: ((i * 17) % 10) / 100 }
})

// A rush as everything is drawn in, then the bang: a deep boom, and a shimmer
// as the light clears. Made here, on the click that starts it
function playBigBang() {
    try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        const a = new AC()
        const t = a.currentTime + 0.02
        const noise = (dur: number) => {
            const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
            const d = buf.getChannelData(0)
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
            const src = a.createBufferSource()
            src.buffer = buf
            return src
        }
        // the rush, rising
        const rush = noise(COLLAPSE_MS / 1000 + 0.3)
        const bp = a.createBiquadFilter()
        bp.type = "bandpass"
        bp.Q.value = 1.4
        bp.frequency.setValueAtTime(180, t)
        bp.frequency.exponentialRampToValueAtTime(2400, t + COLLAPSE_MS / 1000)
        const rg = a.createGain()
        rg.gain.setValueAtTime(0.0001, t)
        rg.gain.exponentialRampToValueAtTime(0.12, t + COLLAPSE_MS / 1000 - 0.05)
        rg.gain.exponentialRampToValueAtTime(0.0001, t + COLLAPSE_MS / 1000 + 0.15)
        rush.connect(bp).connect(rg).connect(a.destination)
        rush.start(t)
        // the boom
        const b = t + BANG_AT / 1000
        const o = a.createOscillator()
        o.frequency.setValueAtTime(120, b)
        o.frequency.exponentialRampToValueAtTime(28, b + 1.4)
        const og = a.createGain()
        og.gain.setValueAtTime(0.0001, b)
        og.gain.exponentialRampToValueAtTime(0.5, b + 0.02)
        og.gain.exponentialRampToValueAtTime(0.0001, b + 1.6)
        o.connect(og).connect(a.destination)
        o.start(b)
        o.stop(b + 1.7)
        const crack = noise(1.2)
        const lp = a.createBiquadFilter()
        lp.type = "lowpass"
        lp.frequency.setValueAtTime(2600, b)
        lp.frequency.exponentialRampToValueAtTime(200, b + 1)
        const cg = a.createGain()
        cg.gain.setValueAtTime(0.0001, b)
        cg.gain.exponentialRampToValueAtTime(0.3, b + 0.01)
        cg.gain.exponentialRampToValueAtTime(0.0001, b + 1.1)
        crack.connect(lp).connect(cg).connect(a.destination)
        crack.start(b)
        // the shimmer
        ;[1318, 1760, 2637].forEach((f, i) => {
            const so = a.createOscillator()
            so.frequency.value = f
            const sg = a.createGain()
            const at = b + 0.25 + i * 0.08
            sg.gain.setValueAtTime(0.0001, at)
            sg.gain.exponentialRampToValueAtTime(0.025, at + 0.05)
            sg.gain.exponentialRampToValueAtTime(0.0001, at + 1.2)
            so.connect(sg).connect(a.destination)
            so.start(at)
            so.stop(at + 1.3)
        })
        window.setTimeout(() => a.close().catch(() => {}), ENTER_MS + 1500)
    } catch {
        /* no sound, still a Big Bang */
    }
}

export const EnterScreen = ({ onAnimationComplete, onReveal }: EnterScreenProps) => {
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [banged, setBanged] = useState(false)
    // the shockwave's radius: the void is cut away inside it
    const radius = useMotionValue(0)
    const holeEdge = useTransform(radius, (r) => r + 2)
    const holeMask = useMotionTemplate`radial-gradient(circle at 50% 50%, transparent ${radius}px, #000 ${holeEdge}px)`
    const ringSize = useTransform(radius, (r) => r * 2 + 8)
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
        // the site renders behind the black now, ready to be revealed
        onReveal?.()
        if (reduce) {
            setTimeout(onAnimationComplete, 450)
            return
        }
        playBigBang()
        setTimeout(() => {
            setBanged(true)
            animate(radius, Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40, { duration: RING_MS / 1000, ease: [0.16, 1, 0.3, 1] })
        }, BANG_AT)
        setTimeout(onAnimationComplete, ENTER_MS)
    }, [onAnimationComplete, onReveal, reduce, radius])

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

        // The collapse: every star streaks in to the centre and is gone
        const drawCollapse = (p: number) => {
            ctx.clearRect(0, 0, w, h)
            const ease = (v: number) => v * v * v
            const k = 1 - ease(Math.min(1, p))
            const kPrev = 1 - ease(Math.max(0, p - 0.08))
            if (k <= 0.001) return
            for (const s of stars) {
                const cur = project(s, s.z)
                const depth = 1 - s.z
                ctx.globalAlpha = Math.min(1, 0.35 + depth * 0.65) * Math.min(1, k * 3)
                ctx.strokeStyle = s.color
                ctx.lineWidth = Math.max(0.6, depth * 2)
                ctx.beginPath()
                ctx.moveTo(w / 2 + (cur.x - w / 2) * kPrev, h / 2 + (cur.y - h / 2) * kPrev)
                ctx.lineTo(w / 2 + (cur.x - w / 2) * k, h / 2 + (cur.y - h / 2) * k)
                ctx.stroke()
            }
            ctx.globalAlpha = 1
        }

        const loop = (now: number) => {
            const dtNorm = Math.min(3, (now - last) / 16.7)
            last = now
            if (warpStartRef.current !== null) drawCollapse((now - warpStartRef.current) / COLLAPSE_MS)
            else drawFrame(0, dtNorm)
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
        <motion.div
            className="fixed inset-0 z-[9999] overflow-hidden"
            // reduced motion: the site is behind, and the sky simply fades
            animate={reduce && isTransitioning ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.45 }}
        >
          {/* The void: the sky and the portal. The bang cuts it away from the middle out */}
          <motion.div
            className="absolute inset-0 bg-black"
            // in place from the click (a hole of nothing), so the bang itself only grows it
            style={isTransitioning && !reduce ? { maskImage: holeMask, WebkitMaskImage: holeMask } : undefined}
          >
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
                // drawn in to the centre with the stars
                animate={isTransitioning && !reduce ? { opacity: [1, 1, 0], scale: [1, 0.55, 0], filter: ["blur(0px)", "blur(1px)", "blur(6px)"] } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: COLLAPSE_MS / 1000, ease: [0.55, 0, 0.9, 0.4], times: [0, 0.6, 1] }}
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
                    {/* Porthole: a live glimpse of the site behind the glass, under the ring */}
                    <Porthole reduce={reduce} />
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

          </motion.div>

            {/* The singularity: everything in one bright point, pulsing, then the bang */}
            <AnimatePresence>
                {isTransitioning && !reduce && (
                    <motion.div
                        key="point"
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 rounded-full"
                        style={{ x: "-50%", y: "-50%", background: "radial-gradient(circle, #ffffff 0%, #ffffff 7%, #ccfbf1 14%, rgba(45,212,191,0.6) 30%, rgba(99,102,241,0.18) 50%, transparent 70%)" }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={banged ? { scale: [1, 4], opacity: [1, 0] } : { scale: [0, 0.3, 0.6, 0.42, 0.9], opacity: [0, 0.7, 1, 0.85, 1] }}
                        transition={banged ? { duration: 0.6, ease: "easeOut" } : { duration: BANG_AT / 1000, times: [0, 0.55, 0.72, 0.86, 1] }}
                    />
                )}
            </AnimatePresence>

            {/* The shockwave, and the sparks it throws out */}
            {banged && (
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <motion.div
                        className="absolute left-1/2 top-1/2 rounded-full"
                        style={{
                            width: ringSize,
                            height: ringSize,
                            x: "-50%",
                            y: "-50%",
                            border: "2px solid rgba(204,251,241,0.95)",
                            boxShadow: "0 0 24px 6px rgba(45,212,191,0.55), inset 0 0 30px 4px rgba(165,180,252,0.35)",
                        }}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: [1, 1, 0] }}
                        transition={{ duration: RING_MS / 1000, times: [0, 0.6, 1] }}
                    />
                    {SPARKS.map((sp, i) => (
                        <motion.span
                            key={i}
                            className="absolute left-1/2 top-1/2 rounded-full"
                            style={{ width: sp.s, height: sp.s, background: sp.c, boxShadow: `0 0 8px ${sp.c}` }}
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{ x: Math.cos(sp.a) * sp.d * 1200, y: Math.sin(sp.a) * sp.d * 800, opacity: 0 }}
                            transition={{ duration: 1.2, delay: sp.delay, ease: [0.16, 1, 0.3, 1] }}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    )
}