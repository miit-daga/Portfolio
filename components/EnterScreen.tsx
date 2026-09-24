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

// A rush as everything is drawn in, cut dead just before the bang so it lands
// on silence; then the bang itself, in layers: a crack, a punch pitched where
// laptop speakers can play it, a rumble falling away and a long tail as if in
// a vast space, all driven through saturation and a compressor for weight.
// Made here, on the click that starts it
function playBigBang() {
    try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        const a = new AC()
        const t = a.currentTime + 0.02
        const b = t + BANG_AT / 1000
        const noise = (dur: number) => {
            const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
            const d = buf.getChannelData(0)
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
            const src = a.createBufferSource()
            src.buffer = buf
            return src
        }
        const env = (g: GainNode, at: number, peak: number, attack: number, decay: number) => {
            g.gain.setValueAtTime(0.0001, at)
            g.gain.exponentialRampToValueAtTime(peak, at + attack)
            g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
        }

        // the master: saturation, then a compressor, for loudness without clipping
        const shaper = a.createWaveShaper()
        const curve = new Float32Array(1024)
        for (let i = 0; i < curve.length; i++) {
            const x = (i / (curve.length - 1)) * 2 - 1
            curve[i] = Math.tanh(x * 2.2)
        }
        shaper.curve = curve
        const comp = a.createDynamicsCompressor()
        comp.threshold.value = -18
        comp.knee.value = 8
        comp.ratio.value = 6
        comp.attack.value = 0.002
        comp.release.value = 0.4
        const master = a.createGain()
        master.gain.value = 1.55
        shaper.connect(comp).connect(master).connect(a.destination)
        // a vast space: a convolver on a decaying noise tail
        const room = a.createConvolver()
        const irLen = Math.floor(a.sampleRate * 3.2)
        const ir = a.createBuffer(2, irLen, a.sampleRate)
        for (let c = 0; c < 2; c++) {
            const d = ir.getChannelData(c)
            for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3)
        }
        room.buffer = ir
        const wet = a.createGain()
        wet.gain.value = 0.55
        room.connect(wet).connect(comp)

        // the rush: rising, faster and brighter, then cut before the bang
        const rushEnd = b - 0.09
        const rush = noise(BANG_AT / 1000)
        const bp = a.createBiquadFilter()
        bp.type = "bandpass"
        bp.Q.value = 1.2
        bp.frequency.setValueAtTime(150, t)
        bp.frequency.exponentialRampToValueAtTime(3500, rushEnd)
        const rg = a.createGain()
        rg.gain.setValueAtTime(0.0001, t)
        rg.gain.exponentialRampToValueAtTime(0.18, rushEnd - 0.02)
        rg.gain.linearRampToValueAtTime(0.0001, rushEnd)
        rush.connect(bp).connect(rg).connect(shaper)
        rush.start(t)
        rush.stop(rushEnd + 0.02)
        const rise = a.createOscillator()
        rise.type = "sawtooth"
        rise.frequency.setValueAtTime(60, t + 0.2)
        rise.frequency.exponentialRampToValueAtTime(420, rushEnd)
        const riseLp = a.createBiquadFilter()
        riseLp.type = "lowpass"
        riseLp.frequency.value = 900
        const riseG = a.createGain()
        riseG.gain.setValueAtTime(0.0001, t + 0.2)
        riseG.gain.exponentialRampToValueAtTime(0.07, rushEnd - 0.02)
        riseG.gain.linearRampToValueAtTime(0.0001, rushEnd)
        rise.connect(riseLp).connect(riseG).connect(shaper)
        rise.start(t + 0.2)
        rise.stop(rushEnd + 0.02)

        // the crack: a very short, very loud burst of everything
        const crack = noise(0.08)
        const crackHp = a.createBiquadFilter()
        crackHp.type = "highpass"
        crackHp.frequency.value = 500
        const cg = a.createGain()
        env(cg, b, 1.2, 0.002, 0.07)
        crack.connect(crackHp).connect(cg)
        cg.connect(shaper)
        cg.connect(room)
        crack.start(b)

        // the punch: a pitched thump from 170 Hz down, where small speakers still reach
        const punch = a.createOscillator()
        punch.type = "triangle"
        punch.frequency.setValueAtTime(170, b)
        punch.frequency.exponentialRampToValueAtTime(45, b + 0.5)
        const pg = a.createGain()
        env(pg, b, 1.0, 0.004, 0.9)
        punch.connect(pg)
        pg.connect(shaper)
        pg.connect(room)
        punch.start(b)
        punch.stop(b + 1)
        // the body: a burst in the mids, where laptop speakers are loudest
        const body = noise(0.7)
        const bodyBp = a.createBiquadFilter()
        bodyBp.type = "bandpass"
        bodyBp.Q.value = 0.9
        bodyBp.frequency.setValueAtTime(700, b)
        bodyBp.frequency.exponentialRampToValueAtTime(220, b + 0.6)
        const bg = a.createGain()
        env(bg, b, 1.1, 0.003, 0.6)
        body.connect(bodyBp).connect(bg)
        bg.connect(shaper)
        bg.connect(room)
        body.start(b)
        const growl = a.createOscillator()
        growl.type = "square"
        growl.frequency.setValueAtTime(110, b)
        growl.frequency.exponentialRampToValueAtTime(48, b + 0.7)
        const growlLp = a.createBiquadFilter()
        growlLp.type = "lowpass"
        growlLp.frequency.value = 1200
        const gg = a.createGain()
        env(gg, b, 0.35, 0.005, 0.8)
        growl.connect(growlLp).connect(gg).connect(shaper)
        growl.start(b)
        growl.stop(b + 0.9)
        // and the sub under it, for anyone with speakers that can
        const sub = a.createOscillator()
        sub.frequency.setValueAtTime(70, b)
        sub.frequency.exponentialRampToValueAtTime(26, b + 1.8)
        const sg = a.createGain()
        env(sg, b, 0.9, 0.01, 2)
        sub.connect(sg).connect(shaper)
        sub.start(b)
        sub.stop(b + 2.1)

        // the rumble: noise that starts bright and falls into a low roll
        const rumble = noise(3)
        const rlp = a.createBiquadFilter()
        rlp.type = "lowpass"
        rlp.Q.value = 0.8
        rlp.frequency.setValueAtTime(5000, b)
        rlp.frequency.exponentialRampToValueAtTime(90, b + 2.6)
        const rug = a.createGain()
        env(rug, b, 0.8, 0.01, 2.8)
        rumble.connect(rlp).connect(rug)
        rug.connect(shaper)
        rug.connect(room)
        rumble.start(b)

        // the shimmer, as the light clears
        ;[1318, 1760, 2637].forEach((f, i) => {
            const so = a.createOscillator()
            so.frequency.value = f
            const shg = a.createGain()
            const at = b + 0.35 + i * 0.09
            env(shg, at, 0.05, 0.05, 1.3)
            so.connect(shg)
            shg.connect(comp)
            shg.connect(room)
            so.start(at)
            so.stop(at + 1.5)
        })
        window.setTimeout(() => a.close().catch(() => {}), ENTER_MS + 5000)
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