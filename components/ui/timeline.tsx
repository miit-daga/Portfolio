"use client"
import { useScroll, useTransform, motion, useMotionValueEvent } from "framer-motion"
import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/utils/cn"

interface TimelineEntry {
  title: string
  content: React.ReactNode
}

const lineGlowHotspotColor = "#99F6E4"
const lineGlowMainColor = "#14B8A6"
const lineDimTrailColor = "rgba(20, 184, 166, 0.25)"

const ballGlowShadow = `0 0 12px 4px rgba(20, 184, 166, 0.7)`
const hotspotRadiusPx = 15

const formatGradientString = (points: { p: number; color: string }[]): string => {
  if (!points || points.length === 0) return "transparent"
  if (points.length === 1) return points[0].color
  return points.map((s) => `${s.color} ${s.p.toFixed(2)}%`).join(", ")
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  const itemStickyDivRefs = useRef<(HTMLDivElement | null)[]>([])
  const [ballOffsets, setBallOffsets] = useState<number[]>([])
  const [glowingBalls, setGlowingBalls] = useState<Set<number>>(new Set())
  const [dynamicLineGradient, setDynamicLineGradient] = useState("")

  const setItemRef = useCallback((el: HTMLDivElement | null, index: number) => {
    itemStickyDivRefs.current[index] = el
  }, [])

  useEffect(() => {
    if (itemStickyDivRefs.current.length !== data.length) {
      itemStickyDivRefs.current = Array(data.length).fill(null)
    }
  }, [data.length])

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setHeight(rect.height)
    }
  }, [data])

  useEffect(() => {
    const calculateOffsets = () => {
      if (ref.current && itemStickyDivRefs.current.length === data.length) {
        const offsets = itemStickyDivRefs.current.map((itemRef) => {
          if (itemRef) {
            return itemRef.offsetTop + 5
          }
          return 0
        })
        if (offsets.some((o) => o > 0) && offsets.some((o, i) => o !== ballOffsets[i])) {
          setBallOffsets(offsets.filter((o) => o > 0))
        } else if (offsets.every((o) => o === 0) && ballOffsets.length > 0) {
          setBallOffsets([])
        }
      }
    }
    calculateOffsets()
    window.addEventListener("resize", calculateOffsets)
    return () => {
      window.removeEventListener("resize", calculateOffsets)
    }
  }, [data, height, ballOffsets])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  })

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])

  useMotionValueEvent(heightTransform, "change", (latestAnimatedLineHeight) => {
    const newGlowing = new Set<number>()
    let lastLitBallIndex = -1
    ballOffsets.forEach((offset, index) => {
      if (latestAnimatedLineHeight >= offset) {
        newGlowing.add(index)
        if (index > lastLitBallIndex) {
          lastLitBallIndex = index
        }
      }
    })

    setGlowingBalls((prev) => {
      if (newGlowing.size !== prev.size || !Array.from(newGlowing).every((val) => prev.has(val))) {
        return newGlowing
      }
      return prev
    })

    if (latestAnimatedLineHeight <= 1) {
      setDynamicLineGradient("transparent")
      return
    }

    let gradientPointsDefinition: { px: number; color: string }[] = []

    if (lastLitBallIndex === -1 || ballOffsets.length === 0) {
      const tipPx = latestAnimatedLineHeight
      const mainColorStartPx = Math.max(0, tipPx - hotspotRadiusPx)

      gradientPointsDefinition = [
        { px: 0, color: lineDimTrailColor },
        { px: mainColorStartPx, color: lineGlowMainColor },
        { px: tipPx, color: lineGlowHotspotColor },
      ]
    } else {
      const hotspotCenterPx = ballOffsets[lastLitBallIndex]
      const hs_center_clamped = Math.max(0, Math.min(latestAnimatedLineHeight, hotspotCenterPx))
      const hs_start_clamped = Math.max(0, Math.min(latestAnimatedLineHeight, hotspotCenterPx - hotspotRadiusPx))
      const hs_end_clamped = Math.max(0, Math.min(latestAnimatedLineHeight, hotspotCenterPx + hotspotRadiusPx))

      const trailFadeDistance = Math.max(30, (latestAnimatedLineHeight - hs_end_clamped) * 0.3)
      const trailFadeStartPx = Math.min(latestAnimatedLineHeight, hs_end_clamped + trailFadeDistance * 0.2)

      gradientPointsDefinition = [
        { px: 0, color: lineDimTrailColor },
        { px: hs_start_clamped, color: lineGlowMainColor },
        { px: hs_center_clamped, color: lineGlowHotspotColor },
        { px: hs_end_clamped, color: lineGlowMainColor },
        { px: trailFadeStartPx, color: lineDimTrailColor },
        { px: latestAnimatedLineHeight, color: lineDimTrailColor },
      ]
    }

    let percentagePoints = gradientPointsDefinition.map((point) => ({
      p: (point.px / latestAnimatedLineHeight) * 100,
      color: point.color,
    }))

    percentagePoints = percentagePoints
      .map((point) => ({ ...point, p: Math.max(0, Math.min(100, point.p)) }))
      .sort((a, b) => a.p - b.p)

    const finalUniquePoints: { p: number; color: string }[] = []
    if (percentagePoints.length > 0) {
      finalUniquePoints.push(percentagePoints[0])
      for (let i = 1; i < percentagePoints.length; i++) {
        const prev = finalUniquePoints[finalUniquePoints.length - 1]
        const curr = percentagePoints[i]
        if (curr.p > prev.p) {
          finalUniquePoints.push(curr)
        } else {
          finalUniquePoints[finalUniquePoints.length - 1] = curr
        }
      }
    }

    if (finalUniquePoints.length === 0) {
      setDynamicLineGradient(lineDimTrailColor)
      return
    }
    if (finalUniquePoints[0].p !== 0) {
      finalUniquePoints.unshift({ p: 0, color: finalUniquePoints[0].color })
    }
    if (finalUniquePoints[finalUniquePoints.length - 1].p !== 100) {
      finalUniquePoints.push({ p: 100, color: finalUniquePoints[finalUniquePoints.length - 1].color })
    }
    const trulyFinalPoints: { p: number; color: string }[] = []
    if (finalUniquePoints.length > 0) {
      trulyFinalPoints.push(finalUniquePoints[0])
      for (let i = 1; i < finalUniquePoints.length; i++) {
        if (finalUniquePoints[i].p > trulyFinalPoints[trulyFinalPoints.length - 1].p) {
          trulyFinalPoints.push(finalUniquePoints[i])
        } else {
          trulyFinalPoints[trulyFinalPoints.length - 1] = finalUniquePoints[i]
        }
      }
    }

    const gradientParamsStr = formatGradientString(trulyFinalPoints)
    setDynamicLineGradient(`linear-gradient(to bottom, ${gradientParamsStr})`)
  })

  return (
    <div className="w-full font-sans md:px-10 mb-20 -mt-10" ref={containerRef}>
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div key={item.title + index} className="flex justify-start pt-10 md:pt-20 md:gap-10">
            <div
              ref={(el) => setItemRef(el, index)}
              className="sticky flex flex-col md:flex-row z-10 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-1/3"
            >
              <div className="h-10 absolute left-[3px] md:left-[3px] w-10 rounded-full bg-black flex items-center justify-center">
                <div
                  className={cn(
                    "h-4 w-4 rounded-full bg-neutral-800 border border-neutral-700 p-2",
                    "transition-all duration-300 ease-in-out",
                  )}
                  style={
                    glowingBalls.has(index)
                      ? {
                          backgroundColor: lineGlowMainColor,
                          borderColor: lineGlowHotspotColor,
                          boxShadow: ballGlowShadow,
                        }
                      : {}
                  }
                />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 lg:text-2xl font-bold text-neutral-400 ">{item.title}</h3>
            </div>
            <div className="relative pl-20 pr-4 md:pl-4 w-full md:w-2/3">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-400">{item.title}</h3>
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{ height: height + "px" }}
          className="absolute md:left-[22px] left-[22px] top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-700 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
              backgroundImage: dynamicLineGradient,
            }}
            className="absolute inset-x-0 top-0 w-[2px] rounded-full"
          />
        </div>
      </div>
    </div>
  )
}
