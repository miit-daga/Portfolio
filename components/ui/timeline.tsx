"use client"
import {
  useScroll,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useReducedMotion,
} from "framer-motion"
import type React from "react"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { RocketIcon } from "./rocket"

interface TimelineEntry {
  title: string
  content: React.ReactNode
}

// --- Flight-path geometry (left rail, in pixels) ---
const RAIL_W = 60
const MID_X = 30
const AMP = 15
const SAMPLES = 140

const ROCKET_W = 30
const ROCKET_H = 36

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const [height, setHeight] = useState(0)
  const [pathLength, setPathLength] = useState(0)
  const [ballYs, setBallYs] = useState<number[]>([])
  const [glowingBalls, setGlowingBalls] = useState<Set<number>>(new Set())
  // Sampled path points so scroll frames never call getPointAtLength (slow DOM API)
  const pointCacheRef = useRef<{ x: number; y: number }[]>([])

  // Phones skip the SVG drop-shadow filters: repainting a filtered path on every
  // scroll frame is what made the timeline lag on mobile.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const setItemRef = useCallback((el: HTMLDivElement | null, index: number) => {
    itemRefs.current[index] = el
  }, [])

  // One sine bump roughly per item so the rocket weaves down the rail.
  const periods = Math.max(2, data.length * 0.75)

  const pathPoint = useCallback(
    (t: number) => ({
      x: MID_X + AMP * Math.sin(t * periods * 2 * Math.PI),
      y: t * height,
    }),
    [height, periods],
  )

  const pathD = useMemo(() => {
    if (height <= 0) return `M ${MID_X} 0`
    let d = ""
    for (let i = 0; i <= SAMPLES; i++) {
      const { x, y } = pathPoint(i / SAMPLES)
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `
    }
    return d.trim()
  }, [height, pathPoint])

  // Measure overall height
  useEffect(() => {
    const measure = () => {
      if (ref.current) setHeight(ref.current.getBoundingClientRect().height)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [data])

  // Measure the path length once it's drawn, and cache sampled points so the
  // scroll handler is pure array math
  useEffect(() => {
    if (pathRef.current && height > 0) {
      const len = pathRef.current.getTotalLength()
      setPathLength(len)
      const SAMPLES_CACHE = 240
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i <= SAMPLES_CACHE; i++) {
        const pt = pathRef.current.getPointAtLength((i / SAMPLES_CACHE) * len)
        pts.push({ x: pt.x, y: pt.y })
      }
      pointCacheRef.current = pts
      // Start the glowing path fully hidden to avoid a one-frame flash
      if (!shouldReduceMotion) revealOffset.set(len)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathD, height, shouldReduceMotion])

  // Measure each milestone's vertical centre (breakpoint-agnostic)
  useEffect(() => {
    const measureBalls = () => {
      const ys = itemRefs.current.map((el) =>
        el ? el.offsetTop + el.offsetHeight / 2 : 0,
      )
      setBallYs((prev) =>
        ys.length === prev.length && ys.every((y, i) => Math.abs(y - prev[i]) < 1)
          ? prev
          : ys,
      )
    }
    measureBalls()
    window.addEventListener("resize", measureBalls)
    return () => window.removeEventListener("resize", measureBalls)
  }, [data, height])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  })

  // Rocket transform + trail (motion values, no re-renders)
  const rocketX = useMotionValue(MID_X - ROCKET_W / 2)
  const rocketY = useMotionValue(-ROCKET_H)
  const rocketRot = useMotionValue(180)
  const rocketRotSpring = useSpring(rocketRot, { stiffness: 120, damping: 16 })
  const rocketCX = useMotionValue(MID_X)
  const rocketCY = useMotionValue(0)
  const revealOffset = useMotionValue(0)

  // Track scroll direction so the rocket flips to face the way it travels
  const prevProgress = useRef(0)
  const travelDir = useRef(1) // 1 = down, -1 = up

  // Exhaust particles lag behind the rocket via chained springs
  const t1x = useSpring(rocketCX, { stiffness: 200, damping: 22 })
  const t1y = useSpring(rocketCY, { stiffness: 200, damping: 22 })
  const t2x = useSpring(t1x, { stiffness: 170, damping: 24 })
  const t2y = useSpring(t1y, { stiffness: 170, damping: 24 })
  const t3x = useSpring(t2x, { stiffness: 150, damping: 26 })
  const t3y = useSpring(t2y, { stiffness: 150, damping: 26 })

  const applyProgress = useCallback(
    (latest: number, dir = 1) => {
      const pts = pointCacheRef.current
      if (pts.length < 2 || pathLength <= 0) return
      const p = Math.max(0, Math.min(1, latest))
      const f = p * (pts.length - 1)
      const i = Math.min(pts.length - 2, Math.floor(f))
      const u = f - i
      const pt = {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * u,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * u,
      }
      const theta = (Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) * 180) / Math.PI

      rocketCX.set(pt.x)
      rocketCY.set(pt.y)
      rocketX.set(pt.x - ROCKET_W / 2)
      rocketY.set(pt.y - ROCKET_H / 2)
      // Face down the path when scrolling down, flip 180° when scrolling up
      rocketRot.set(theta + 90 + (dir < 0 ? 180 : 0))
      revealOffset.set(pathLength * (1 - p))

      setGlowingBalls((prev) => {
        const next = new Set<number>()
        ballYs.forEach((y, i) => {
          if (pt.y >= y - 4) next.add(i)
        })
        if (next.size === prev.size && Array.from(next).every((v) => prev.has(v))) {
          return prev
        }
        return next
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathLength, ballYs],
  )

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (shouldReduceMotion) return
    const delta = latest - prevProgress.current
    // Deadzone avoids flicker from tiny scroll jitters
    if (Math.abs(delta) > 0.0005) {
      travelDir.current = delta < 0 ? -1 : 1
    }
    prevProgress.current = latest
    applyProgress(latest, travelDir.current)
  })

  // Apply the correct initial state once measured (and handle reduced motion)
  useEffect(() => {
    if (pathLength <= 0) return
    if (shouldReduceMotion) {
      revealOffset.set(0)
      setGlowingBalls(new Set(ballYs.map((_, i) => i)))
    } else {
      applyProgress(scrollYProgress.get())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyProgress, shouldReduceMotion, pathLength, ballYs])

  const planets = ballYs.map((y) => pathPoint(height > 0 ? y / height : 0))
  const tealGlow = "drop-shadow(0 0 5px rgba(45, 212, 191, 0.85))"

  return (
    <div className="w-full font-sans md:px-10 mb-20 -mt-10" ref={containerRef}>
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={item.title + index}
            className="flex flex-col md:flex-row justify-start pt-10 md:pt-20 md:gap-10"
          >
            <div
              ref={(el) => setItemRef(el, index)}
              className="flex items-center md:w-1/3 pl-20 mb-4 md:mb-0"
            >
              <h3
                className={`text-xl lg:text-2xl font-bold md:pl-4 transition-colors duration-500 ${
                  glowingBalls.has(index) ? "text-teal-300" : "text-neutral-400"
                }`}
                style={{
                  textShadow: glowingBalls.has(index)
                    ? "0 0 18px rgba(45, 212, 191, 0.35)"
                    : "none",
                  transition: "color 0.5s, text-shadow 0.5s",
                }}
              >
                {item.title}
              </h3>
            </div>
            <div className="relative w-full md:w-2/3 pl-20 md:pl-0 pr-4">
              {item.content}
            </div>
          </div>
        ))}

        {/* --- Flight path + milestones --- */}
        <svg
          className="absolute left-0 top-0 pointer-events-none"
          width={RAIL_W}
          height={height}
          style={{ overflow: "visible" }}
          aria-hidden
        >
          {/* Dim dashed trajectory */}
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth={2}
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
          {/* Glowing flown path (revealed up to the rocket) */}
          {pathLength > 0 && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="#2dd4bf"
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: revealOffset,
                filter: isMobile ? "none" : tealGlow,
              }}
            />
          )}
          {/* Milestone planets */}
          {planets.map((pt, i) => {
            const lit = glowingBalls.has(i)
            return (
              <g key={i} transform={`translate(${pt.x} ${pt.y})`}>
                <circle
                  r={6}
                  fill={lit ? "#14b8a6" : "#1f2937"}
                  stroke={lit ? "#99f6e4" : "#475569"}
                  strokeWidth={1.5}
                  style={{
                    filter: lit && !isMobile ? "drop-shadow(0 0 6px rgba(20,184,166,0.95))" : "none",
                    transition: "fill 0.3s, stroke 0.3s, filter 0.3s",
                  }}
                />
                {lit && !shouldReduceMotion && (
                  <motion.circle
                    r={6}
                    fill="none"
                    stroke="#99f6e4"
                    strokeWidth={1.5}
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 3.2, opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* --- Exhaust particles --- */}
        {!shouldReduceMotion && (
          <>
            <motion.div
              className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-teal-300/70 blur-[1px] pointer-events-none"
              style={{ x: t1x, y: t1y, marginLeft: -5, marginTop: -5 }}
            />
            <motion.div
              className="absolute left-0 top-0 h-2 w-2 rounded-full bg-teal-400/50 blur-[1px] pointer-events-none"
              style={{ x: t2x, y: t2y, marginLeft: -4, marginTop: -4 }}
            />
            <motion.div
              className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-cyan-400/40 blur-[2px] pointer-events-none"
              style={{ x: t3x, y: t3y, marginLeft: -3, marginTop: -3 }}
            />
          </>
        )}

        {/* --- The rocket --- */}
        {!shouldReduceMotion && (
          <motion.div
            className="absolute left-0 top-0 z-10 pointer-events-none"
            style={{ x: rocketX, y: rocketY, rotate: rocketRotSpring }}
          >
            <RocketIcon
              isIgnited
              style={{
                width: ROCKET_W,
                height: ROCKET_H,
                filter: isMobile ? "none" : "drop-shadow(0 0 6px rgba(45,212,191,0.5))",
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
