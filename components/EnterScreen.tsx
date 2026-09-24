"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useMotionTemplate, useTransform, animate } from "framer-motion"
import { Porthole } from "./ui/porthole"

interface EnterScreenProps {
    onAnimationComplete: () => void
    /** Called as the transition starts, so the site can render behind it and be revealed, not swapped in */
    onReveal?: () => void
    /** The entry to start on (the Big Bang after a Big Crunch); otherwise the porthole */
    variant?: "bang" | "porthole"
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

// Through the porthole: the glass becomes a window onto the site, and it grows
// until it fills the screen, stars streaking past its rim as you go through
const PORTHOLE_MS = 1300
const ENTRIES = [
    { id: "porthole", label: "Porthole", hint: "fly through the window" },
    { id: "bang", label: "Big Bang", hint: "collapse, then bang (with sound)" },
] as const

// Quieter than the bang: a glassy chime as the window opens, an airy rush
// rising as you fly at it, and a soft swell as you pass through
function playPorthole() {
    try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        const a = new AC()
        const t = a.currentTime + 0.02
        const dur = PORTHOLE_MS / 1000
        const out = a.createGain()
        out.gain.value = 0.9
        out.connect(a.destination)
        // the chime
        ;[1318.5, 1975.5, 2637].forEach((f, i) => {
            const o = a.createOscillator()
            o.frequency.value = f
            const g = a.createGain()
            const at = t + i * 0.06
            g.gain.setValueAtTime(0.0001, at)
            g.gain.exponentialRampToValueAtTime(0.05 - i * 0.012, at + 0.02)
            g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4)
            o.connect(g).connect(out)
            o.start(at)
            o.stop(at + 1.5)
        })
        // the rush of air, rising
        const buf = a.createBuffer(1, Math.floor(a.sampleRate * (dur + 0.4)), a.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
        const rush = a.createBufferSource()
        rush.buffer = buf
        const bp = a.createBiquadFilter()
        bp.type = "bandpass"
        bp.Q.value = 0.8
        bp.frequency.setValueAtTime(300, t)
        bp.frequency.exponentialRampToValueAtTime(2800, t + dur * 0.75)
        bp.frequency.exponentialRampToValueAtTime(900, t + dur + 0.3)
        const rg = a.createGain()
        rg.gain.setValueAtTime(0.0001, t)
        rg.gain.exponentialRampToValueAtTime(0.12, t + dur * 0.7)
        rg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35)
        rush.connect(bp).connect(rg).connect(out)
        rush.start(t)
        // the swell, passing through
        const o = a.createOscillator()
        o.type = "triangle"
        o.frequency.setValueAtTime(90, t + dur * 0.6)
        o.frequency.exponentialRampToValueAtTime(180, t + dur)
        const lp = a.createBiquadFilter()
        lp.type = "lowpass"
        lp.frequency.value = 600
        const og = a.createGain()
        og.gain.setValueAtTime(0.0001, t + dur * 0.6)
        og.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.85)
        og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6)
        o.connect(lp).connect(og).connect(out)
        o.start(t + dur * 0.6)
        o.stop(t + dur + 0.7)
        window.setTimeout(() => a.close().catch(() => {}), PORTHOLE_MS + 2500)
    } catch {
        /* no sound, still a window */
    }
}

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

export const EnterScreen = ({ onAnimationComplete, onReveal, variant }: EnterScreenProps) => {
    // The visitor picks the entry under the portal, fresh each time
    const [choice, setChoice] = useState<"bang" | "porthole">(variant ?? "porthole")
    // the page reads what to start on (a Big Crunch just happened) after this
    // screen is already up, as it is in the page from the start
    useEffect(() => {
        if (variant) setChoice(variant)
    }, [variant])
    const porthole = choice === "porthole"
    // Through the porthole: the window's centre (the button's) and its reach
    const buttonRef = useRef<HTMLButtonElement>(null)
    const holeX = useMotionValue(0)
    const holeY = useMotionValue(0)
    const holeCentre = useRef<{ x: number; y: number } | null>(null)
    const [origin, setOrigin] = useState("50% 50%")
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [banged, setBanged] = useState(false)
    // the shockwave's radius: the void is cut away inside it
    const radius = useMotionValue(0)
    const holeEdge = useTransform(radius, (r) => r + 2)
    const holeMask = useMotionTemplate`radial-gradient(circle at 50% 50%, transparent ${radius}px, #000 ${holeEdge}px)`
    const windowMask = useMotionTemplate`radial-gradient(circle at ${holeX}px ${holeY}px, transparent ${radius}px, #000 ${holeEdge}px)`
    const rimLeft = useTransform(holeX, (x) => x)
    const rimTop = useTransform(holeY, (y) => y)
    const ringSize = useTransform(radius, (r) => r * 2 + 8)
    const reduce = useReducedMotion()

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const warpStartRef = useRef<number | null>(null)
    const transitioningRef = useRef(false)


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
        if (porthole) {
            // the window opens where the glass is, and grows past the farthest corner
            const r = buttonRef.current?.getBoundingClientRect()
            const x = r ? r.left + r.width / 2 : window.innerWidth / 2
            const y = r ? r.top + r.height / 2 : window.innerHeight / 2
            holeX.set(x)
            holeY.set(y)
            holeCentre.current = { x, y }
            setOrigin(`${x}px ${y}px`)
            const reach = Math.max(Math.hypot(x, y), Math.hypot(window.innerWidth - x, y), Math.hypot(x, window.innerHeight - y), Math.hypot(window.innerWidth - x, window.innerHeight - y)) + 40
            radius.set(r ? r.width / 2 - 10 : 50)
            animate(radius, reach, { duration: PORTHOLE_MS / 1000, ease: [0.7, 0, 0.2, 1] })
            playPorthole()
            setTimeout(onAnimationComplete, PORTHOLE_MS + 50)
            return
        }
        playBigBang()
        setTimeout(() => {
            setBanged(true)
            animate(radius, Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40, { duration: RING_MS / 1000, ease: [0.16, 1, 0.3, 1] })
        }, BANG_AT)
        setTimeout(onAnimationComplete, ENTER_MS)
    }, [onAnimationComplete, onReveal, reduce, radius, porthole, holeX, holeY])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement | null)?.closest?.("[data-entry-choice]")) return
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

        // Through the porthole: the stars streak outward from the window as you
        // fly at it, fastest mid-way, and are gone as it passes the screen
        const drawThrough = (t: number, dtNorm: number) => {
            const c = holeCentre.current ?? { x: w / 2, y: h / 2 }
            const x = Math.min(1, t / PORTHOLE_MS)
            const lv = Math.sin(Math.PI * Math.min(1, x * 1.15))
            ctx.clearRect(0, 0, w, h)
            const speed = (IDLE_SPEED + lv * lv * 0.12) * dtNorm
            const scale = Math.min(w, h) * 0.5
            const at = (s: Star, z: number) => ({ x: c.x + (s.x / z) * scale, y: c.y + (s.y / z) * scale })
            for (const s of stars) {
                s.pz = s.z
                s.z -= speed
                if (s.z <= 0.04) {
                    initStar(s)
                    continue
                }
                const cur = at(s, s.z)
                if (cur.x < -80 || cur.x > w + 80 || cur.y < -80 || cur.y > h + 80) {
                    initStar(s)
                    continue
                }
                const depth = 1 - s.z
                ctx.globalAlpha = Math.min(1, 0.3 + depth * 0.7) * (1 - x * 0.6)
                const prev = at(s, s.pz)
                ctx.strokeStyle = s.color
                ctx.lineWidth = Math.max(0.6, depth * 2.2)
                ctx.beginPath()
                ctx.moveTo(prev.x, prev.y)
                ctx.lineTo(cur.x, cur.y)
                ctx.stroke()
            }
            ctx.globalAlpha = 1
        }

        const loop = (now: number) => {
            const dtNorm = Math.min(3, (now - last) / 16.7)
            last = now
            if (warpStartRef.current !== null && porthole) drawThrough(now - warpStartRef.current, dtNorm)
            else if (warpStartRef.current !== null) drawCollapse((now - warpStartRef.current) / COLLAPSE_MS)
            else drawFrame(0, dtNorm)
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)

        window.addEventListener("resize", setup)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("resize", setup)
        }
    }, [reduce, porthole])

    return (
        <motion.div
            data-enter-screen
            className="fixed inset-0 z-[9999] overflow-hidden"
            initial={false}
            // reduced motion: the site is behind, and the sky simply fades
            animate={reduce && isTransitioning ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.45 }}
        >
          {/* The void: the sky and the portal. The bang cuts it away from the middle out */}
          <motion.div
            className="absolute inset-0 bg-black"
            // cut away from the click: the Big Bang from the middle out (a hole of nothing
            // until the bang), the porthole from the glass itself
            style={isTransitioning && !reduce ? (porthole ? { maskImage: windowMask, WebkitMaskImage: windowMask } : { maskImage: holeMask, WebkitMaskImage: holeMask }) : undefined}
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
                initial={false}
                // the Big Bang draws it in to the centre with the stars; through the
                // porthole, it swells past you from the window as you fly at it
                style={porthole ? { transformOrigin: origin } : undefined}
                animate={
                    isTransitioning && !reduce
                        ? porthole
                            ? { opacity: [1, 0.9, 0], scale: [1, 1.25, 2.2], filter: ["blur(0px)", "blur(1px)", "blur(6px)"] }
                            : { opacity: [1, 1, 0], scale: [1, 0.55, 0], filter: ["blur(0px)", "blur(1px)", "blur(6px)"] }
                        : { opacity: 1, scale: 1, filter: "blur(0px)" }
                }
                transition={porthole ? { duration: 0.9, ease: [0.55, 0, 0.9, 0.4], times: [0, 0.5, 1] } : { duration: COLLAPSE_MS / 1000, ease: [0.55, 0, 0.9, 0.4], times: [0, 0.6, 1] }}
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
                    ref={buttonRef}
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
                    {/* Per-device hint, chosen in CSS (globals.css) so the page as sent matches:
                        touch has no Enter key, Macs call it Return */}
                    <span className="enter-hint-press">
                        or press <span className="enter-key-other">Enter &#8629;</span>
                        <span className="enter-key-mac">Return &#9166;</span> to begin
                    </span>
                    <span className="enter-hint-tap">tap the portal to begin</span>
                </motion.p>

                {/* The visitor's pick of entry */}
                <motion.div
                    data-entry-choice
                    role="radiogroup"
                    aria-label="How to enter"
                    className="mt-4 flex items-center gap-2 font-mono text-[11px] sm:text-[10px] uppercase tracking-[0.25em] text-slate-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isTransitioning ? 0 : 1 }}
                    transition={{ duration: 0.5, delay: isTransitioning ? 0 : 0.7 }}
                >
                    <span>Entry</span>
                    <span className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                        {ENTRIES.map((e) => (
                            <button
                                key={e.id}
                                type="button"
                                role="radio"
                                aria-checked={choice === e.id}
                                title={e.hint}
                                disabled={isTransitioning}
                                onClick={() => setChoice(e.id)}
                                className={`rounded-full px-2.5 py-1 tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-400 ${choice === e.id ? "bg-teal-400/15 text-teal-200" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                {e.label}
                            </button>
                        ))}
                    </span>
                </motion.div>
            </motion.div>

          </motion.div>

            {/* The singularity: everything in one bright point, pulsing, then the bang */}
            <AnimatePresence>
                {isTransitioning && !reduce && !porthole && (
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

            {/* The porthole's rim, riding the edge of the window as it grows */}
            {porthole && isTransitioning && !reduce && (
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute rounded-full"
                    style={{
                        left: rimLeft,
                        top: rimTop,
                        width: ringSize,
                        height: ringSize,
                        x: "-50%",
                        y: "-50%",
                        border: "2px solid rgba(94,234,212,0.85)",
                        boxShadow: "0 0 22px 4px rgba(45,212,191,0.45), inset 0 0 26px 2px rgba(45,212,191,0.3)",
                    }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 1, 0] }}
                    transition={{ duration: PORTHOLE_MS / 1000, times: [0, 0.55, 1] }}
                />
            )}

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