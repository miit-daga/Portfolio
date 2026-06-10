"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring } from "framer-motion"
import { BackgroundGradientAnimation } from "./ui/background-gradient-animation"
import { HeroTypewriterEffect } from "./ui/hero-typewriter-effect"
import { Terminal, ChevronDown } from "lucide-react"
import { MagneticWrapper } from "./ui/magnetic-wrapper"
import { AstronautBuddy } from "./ui/astronaut"
import { cn } from "@/lib/utils"
import Image from "next/image"

// A meteor streaks across the hero every ~20-40s; nothing renders in between.
type Streak = { top: number; left: number; angle: number; len: number; dur: number; key: number }

const ShootingStar = ({ disabled }: { disabled: boolean }) => {
  const [streak, setStreak] = useState<Streak | null>(null)

  useEffect(() => {
    if (disabled) return
    let t: ReturnType<typeof setTimeout>
    let alive = true
    const fire = () => {
      if (!alive) return
      setStreak({
        top: 6 + Math.random() * 30,
        left: 5 + Math.random() * 50,
        angle: 18 + Math.random() * 16,
        len: 200 + Math.random() * 130,
        dur: 0.9 + Math.random() * 0.5,
        key: Date.now(),
      })
      t = setTimeout(() => {
        if (!alive) return
        setStreak(null)
        t = setTimeout(fire, 16000 + Math.random() * 24000)
      }, 1800)
    }
    t = setTimeout(fire, 4000 + Math.random() * 4000)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [disabled])

  if (disabled || !streak) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden>
      <div
        className="absolute"
        style={{ top: `${streak.top}%`, left: `${streak.left}%`, transform: `rotate(${streak.angle}deg)` }}
      >
        <motion.div
          key={streak.key}
          className="h-[2px] rounded-full"
          style={{
            width: streak.len,
            background: "linear-gradient(90deg, transparent, rgba(153,246,228,0.85) 65%, #ffffff)",
            boxShadow: "0 0 6px rgba(45,212,191,0.5)",
          }}
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: streak.len * 1.5, opacity: [0, 1, 1, 0] }}
          transition={{ duration: streak.dur, ease: "easeIn", times: [0, 0.15, 0.75, 1] }}
        />
      </div>
    </div>
  )
}

const AVATAR_QUOTES = [
  "Booting personality.exe...",
  "Yes, I'm real. Mostly.",
  "You found the hologram's tickle spot.",
  "404: shyness not found.",
  "Powered by caffeine and curiosity.",
  "Beep boop. (That's hello.)",
  "Compiling a witty reply...",
  "Transmission stable. For now.",
]

const Hero = () => {
  const { scrollY } = useScroll()
  const shouldReduceMotion = useReducedMotion()
  const scrollOpacity = useTransform(scrollY, [0, 600], [1, 0])
  const opacity = shouldReduceMotion ? 1 : scrollOpacity

  // Glitch effect state
  const [isGlitching, setIsGlitching] = useState(false)

  const triggerGlitch = useCallback(() => {
    setIsGlitching(true)
    setTimeout(() => setIsGlitching(false), 300)
  }, [])

  useEffect(() => {
    if (shouldReduceMotion) return

    const scheduleGlitch = () => {
      const delay = 10000 + Math.random() * 5000 // 10-15s
      return setTimeout(() => {
        triggerGlitch()
        timerId = scheduleGlitch()
      }, delay)
    }

    let timerId = scheduleGlitch()
    return () => clearTimeout(timerId)
  }, [triggerGlitch, shouldReduceMotion])

  // Hologram tilt effect
  const hologramRef = useRef<HTMLDivElement>(null)
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const tiltXSpring = useSpring(tiltX, { stiffness: 150, damping: 20 })
  const tiltYSpring = useSpring(tiltY, { stiffness: 150, damping: 20 })
  const hologramRotateX = useTransform(tiltYSpring, [-0.5, 0.5], ["5deg", "-5deg"])
  const hologramRotateY = useTransform(tiltXSpring, [-0.5, 0.5], ["-5deg", "5deg"])

  const handleHologramMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!hologramRef.current) return
    const rect = hologramRef.current.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width - 0.5
    const yPct = (e.clientY - rect.top) / rect.height - 0.5
    tiltX.set(xPct)
    tiltY.set(yPct)
  }, [tiltX, tiltY])

  const handleHologramMouseLeave = useCallback(() => {
    tiltX.set(0)
    tiltY.set(0)
  }, [tiltX, tiltY])

  // Avatar click reaction: glitch burst + a rotating one-liner bubble
  const [quote, setQuote] = useState<string | null>(null)
  const quoteIdxRef = useRef(0)
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAvatarClick = useCallback(() => {
    if (!shouldReduceMotion) triggerGlitch()
    setQuote(AVATAR_QUOTES[quoteIdxRef.current % AVATAR_QUOTES.length])
    quoteIdxRef.current += 1
    if (quoteTimer.current) clearTimeout(quoteTimer.current)
    quoteTimer.current = setTimeout(() => setQuote(null), 2800)
  }, [shouldReduceMotion, triggerGlitch])

  useEffect(() => () => { if (quoteTimer.current) clearTimeout(quoteTimer.current) }, [])

  // --- CONFIGURATION ---
  // Set to TRUE for the Hologram look
  // Set to FALSE for the Portal look
  const isTransparentCutout = true;

  return (
    <motion.div
      style={{ opacity }}
      className="h-dvh relative overflow-hidden"
    >
      <BackgroundGradientAnimation>
        <ShootingStar disabled={!!shouldReduceMotion} />
        <AstronautBuddy className="left-[6%] top-24 lg:left-[8%] lg:top-auto lg:bottom-[22%]" />
        <div className="absolute z-50 inset-0 flex flex-col lg:flex-row items-center justify-center text-white font-bold px-4 pt-16 pb-24 lg:py-0 pointer-events-none w-full h-full gap-6 sm:gap-10 lg:gap-24">

          {/* --- LEFT SIDE: TEXT CONTENT --- */}
          <div className="flex flex-col items-center lg:items-end text-center lg:text-right z-10 order-2 lg:order-1 lg:w-1/2">
            <h1 className={cn("bg-clip-text text-transparent text-6xl md:text-8xl lg:text-9xl drop-shadow-2xl text-white tracking-tighter font-extrabold", isGlitching && "text-glitch")}>
              Miit Daga
            </h1>

            <div className="mt-2 lg:mt-6 flex justify-center lg:justify-end w-full">
              <HeroTypewriterEffect
                words={[
                  { text: "Code", className: "text-teal-400" },
                  { text: "That", className: "text-neutral-300" },
                  { text: "Powers", className: "text-neutral-300" },
                  { text: "the", className: "text-neutral-300" },
                  { text: "Unseen.", className: "text-teal-400" },
                ]}
                className="text-xl md:text-2xl lg:text-4xl font-light"
                cursorClassName="bg-teal-400"
                repeatDelay={5000}
                isGlitching={isGlitching}
              />
            </div>
          </div>

          {/* --- RIGHT SIDE: AVATAR --- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative order-1 lg:order-2 flex items-center justify-center lg:w-1/2 pointer-events-auto"
            style={{ perspective: 1000 }}
          >
            {isTransparentCutout ? (
              // === PATH A: HOLOGRAM (Hover: Materialize) ===
              <motion.div
                ref={hologramRef}
                onMouseMove={handleHologramMouseMove}
                onMouseLeave={handleHologramMouseLeave}
                onClick={handleAvatarClick}
                whileTap={{ scale: 0.97 }}
                style={{ rotateX: hologramRotateX, rotateY: hologramRotateY, transformStyle: "preserve-3d" }}
                className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[500px] lg:h-[500px] group cursor-pointer"
              >
                <motion.div
                  animate={{ y: [-15, 15, -15] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-full h-full"
                >
                  {/* 1. The Image */}
                  {/* Transition removes filters on hover to show "Real" colors */}
                  <div className={cn("relative w-full h-full grayscale-[50%] sepia-[50%] hue-rotate-[160deg] brightness-110 contrast-125 z-10 mix-blend-hard-light transition-all duration-700 ease-out group-hover:grayscale-0 group-hover:sepia-0 group-hover:hue-rotate-0 group-hover:brightness-100 group-hover:contrast-100 group-hover:mix-blend-normal", isGlitching && "hologram-glitch")}>
                    <Image
                      src="/nobg.png"
                      alt="Hologram"
                      fill
                      className="object-contain"
                      style={{
                        // Fades the bottom
                        maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)"
                      }}
                      priority
                    />
                  </div>

                  {/* 2. Pure CSS Scanlines (Fades out on hover for clarity) */}
                  <div
                    className="absolute inset-0 z-20 pointer-events-none opacity-30 transition-opacity duration-500 group-hover:opacity-10"
                    style={{
                      background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, #000 3px)",
                      backgroundSize: "100% 4px"
                    }}
                  />

                  {/* 3. Subtle Glitch Gradient Overlay (Disappears on hover) */}
                  <div className="absolute inset-0 z-30 bg-gradient-to-t from-teal-500/20 via-transparent to-transparent mix-blend-color-dodge opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-0" />


                  {/* Click reaction: bottom anchored just above the head, grows upward, rides the float bob */}
                  <div className="pointer-events-none absolute bottom-[82%] left-1/2 z-50 -translate-x-1/2">
                    <AnimatePresence>
                      {quote && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          style={{ transformOrigin: "bottom center" }}
                          className="relative flex min-h-[44px] w-[160px] items-center justify-center rounded-2xl border border-teal-400/40 bg-black/85 px-3 py-1.5 text-center font-mono text-[10px] leading-snug text-teal-200 shadow-[0_0_22px_rgba(45,212,191,0.3)] backdrop-blur-md sm:min-h-[50px] sm:w-[190px] sm:text-xs lg:min-h-[58px] lg:w-[240px] lg:text-sm"
                        >
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={quote}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.13, ease: "linear" }}
                            >
                              {quote}
                            </motion.span>
                          </AnimatePresence>
                          <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-teal-400/40 bg-black/85" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </motion.div>

                {/* 4. Glowing Base Platform (Changes color on hover) */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[80%] h-12 bg-teal-500/40 blur-[40px] rounded-full transition-colors duration-700 group-hover:bg-blue-500/50" />
              </motion.div>
            ) : (
              // === PATH B: CLEAN PORTAL (Hover: Focus & Expand) ===
              <div className="relative w-64 h-64 md:w-72 md:h-72 lg:w-[400px] lg:h-[400px] group cursor-pointer">
                {/* 1. Glowing Ring Behind (Intensifies on hover) */}
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-600 rounded-3xl blur opacity-30 group-hover:opacity-80 transition duration-500" />

                {/* 2. The Container */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 bg-black/50 backdrop-blur-sm transition-colors duration-500 group-hover:border-teal-500/50">
                  <Image
                    src="/profile.png"
                    alt="Profile"
                    fill
                    className="object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                    priority
                  />

                  {/* 3. Tech Overlays (Corners Expand Outward) */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-teal-500/50 transition-transform duration-500 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:border-teal-400" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-teal-500/50 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2 group-hover:border-teal-400" />

                  {/* 4. Subtle Scanline CSS (Vanishes on hover) */}
                  <div
                    className="absolute inset-0 pointer-events-none z-10 opacity-20 transition-opacity duration-300 group-hover:opacity-0"
                    style={{
                      background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, #000 3px)",
                      backgroundSize: "100% 4px"
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* --- BOTTOM RIGHT: BUTTONS --- */}
          <div className="absolute bottom-10 right-10 flex flex-col items-end gap-2 pointer-events-auto hidden lg:flex">
            <MagneticWrapper strength={0.4}>
              <a
                href="/terminal.html"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-full hover:bg-black/50 hover:border-white/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-black"
              >
                <Terminal className="h-4 w-4 text-gray-300 group-hover:text-white" />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Terminal Mode</span>
              </a>
            </MagneticWrapper>

            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <span>Navigate</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
                {typeof window !== "undefined" &&
                  /Mac|iPhone|iPod|iPad/.test(navigator.platform) ? (
                  <>
                    <span className="text-xs">⌘ + </span>K
                  </>
                ) : (
                  <>Ctrl + K</>
                )}
              </kbd>
            </div>
          </div>

          {/* --- MOBILE SCROLL CUE --- */}
          {/* Positioned by a non-animated wrapper (framer's y bob would override the
              centering transform), lifted clear of phone browser bars + safe area */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-auto lg:hidden"
            style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          >
            <motion.a
              href="#about-me"
              aria-label="Scroll to content"
              className="flex flex-col items-center gap-2 text-teal-300/90"
              animate={shouldReduceMotion ? undefined : { y: [0, 10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-[11px] font-mono uppercase tracking-[0.25em]">Scroll</span>
              <span className="flex items-center justify-center h-9 w-9 rounded-full border border-teal-400/40 bg-teal-500/10 backdrop-blur-sm">
                <ChevronDown className="h-5 w-5" />
              </span>
            </motion.a>
          </div>

        </div>
      </BackgroundGradientAnimation>
    </motion.div>
  )
}

export default Hero