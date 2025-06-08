"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { cn } from "@/utils/cn"

interface AnimatedBackgroundProps {
  children: React.ReactNode
  className?: string
}

export const AnimatedBackground = ({ children, className }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const sectionId = container.querySelector("[id]")?.id || "unknown"

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      canvas.style.width = rect.width + "px"
      canvas.style.height = rect.height + "px"
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const getStarColor = () => {
      const colorType = Math.random()

      if (colorType < 0.5) {
        return { r: 255, g: 255, b: 255 }
      } else if (colorType < 0.7) {
        return { r: 200, g: 220, b: 255 }
      } else if (colorType < 0.85) {
        return { r: 255, g: 250, b: 220 }
      } else if (colorType < 0.93) {
        return { r: 255, g: 200, b: 150 }
      } else if (colorType < 0.98) {
        return { r: 255, g: 180, b: 150 }
      } else {
        return { r: 150, g: 200, b: 255 }
      }
    }

    const stars: {
      x: number
      y: number
      size: number
      twinkle: number
      twinkleSpeed: number
      brightness: number
      color: { r: number; g: number; b: number }
    }[] = []

    const shootingStars: {
      x: number
      y: number
      vx: number
      vy: number
      length: number
      brightness: number
      life: number
      maxLife: number
      fadeOutStart: number
      trail: { x: number; y: number; opacity: number }[]
      active: boolean
      direction: "horizontal" | "vertical"
      color: { r: number; g: number; b: number }
      size: number
      distance: "near" | "medium" | "far"
    }[] = []

    const starCount = Math.floor((canvas.width * canvas.height) / 6000)
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        brightness: 0.4 + Math.random() * 0.5,
        color: getStarColor(),
      })
    }

    const getShootingStarColor = () => {
      const colorType = Math.random()

      if (colorType < 0.6) {
        return { r: 255, g: 255, b: 255 }
      } else if (colorType < 0.8) {
        return { r: 200, g: 220, b: 255 }
      } else if (colorType < 0.9) {
        return { r: 255, g: 240, b: 180 }
      } else if (colorType < 0.95) {
        return { r: 180, g: 255, b: 200 }
      } else {
        return { r: 255, g: 180, b: 200 }
      }
    }

    const createShootingStar = () => {
      const direction = Math.random() < 0.6 ? "horizontal" : "vertical"
      let startX, startY, vx, vy, maxLife

      const distanceRoll = Math.random()
      let distance: "near" | "medium" | "far"
      let sizeMultiplier: number
      let brightnessMultiplier: number

      if (distanceRoll < 0.3) {
        distance = "near"
        sizeMultiplier = 1.5
        brightnessMultiplier = 1.2
      } else if (distanceRoll < 0.7) {
        distance = "medium"
        sizeMultiplier = 1.0
        brightnessMultiplier = 1.0
      } else {
        distance = "far"
        sizeMultiplier = 0.6
        brightnessMultiplier = 0.7
      }

      if (direction === "horizontal") {
        const leftToRight = Math.random() < 0.5

        if (leftToRight) {
          startX = -50
          startY = Math.random() * canvas.height * 0.8
          vx = 0.6 + Math.random() * 0.8
          vy = (Math.random() - 0.5) * 0.4
        } else {
          startX = canvas.width + 50
          startY = Math.random() * canvas.height * 0.8
          vx = -(0.6 + Math.random() * 0.8)
          vy = (Math.random() - 0.5) * 0.4
        }

        const distanceToTravel = canvas.width + 100
        maxLife = Math.ceil(distanceToTravel / Math.abs(vx)) + 60
      } else {
        startX = Math.random() * canvas.width
        startY = -50
        vx = (Math.random() - 0.5) * 0.8
        vy = 0.4 + Math.random() * 0.6

        const distanceToTravel = canvas.height + 100
        maxLife = Math.ceil(distanceToTravel / vy) + 60
      }

      const fadeOutStart = maxLife * 0.8

      shootingStars.push({
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        length: 20 + Math.random() * 30,
        brightness: (0.8 + Math.random() * 0.2) * brightnessMultiplier,
        life: 0,
        maxLife: maxLife,
        fadeOutStart: fadeOutStart,
        trail: [],
        active: true,
        direction: direction,
        color: getShootingStarColor(),
        size: (1.5 + Math.random() * 1) * sizeMultiplier,
        distance: distance,
      })
    }

    let shootingStarTimer = 0
    let shootingStarInterval = 600 + Math.random() * 900

    let animationFrame: number

    const drawSpace = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha = 1

      stars.forEach((star) => {
        const twinkleIntensity = (Math.sin(star.twinkle) + 1) * 0.5
        const currentBrightness = star.brightness * twinkleIntensity * 0.8
        const currentSize = star.size * (0.8 + twinkleIntensity * 0.2)

        const { r, g, b } = star.color
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${currentBrightness * 0.6})`
        ctx.shadowBlur = 4
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentBrightness})`

        ctx.beginPath()
        ctx.arc(star.x, star.y, currentSize, 0, Math.PI * 2)
        ctx.fill()

        star.twinkle += star.twinkleSpeed
      })

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const shootingStar = shootingStars[i]

        let fadeFactor = 1
        if (shootingStar.life > shootingStar.fadeOutStart) {
          fadeFactor =
            1 - (shootingStar.life - shootingStar.fadeOutStart) / (shootingStar.maxLife - shootingStar.fadeOutStart)
        }

        if (shootingStar.active) {
          shootingStar.trail.push({
            x: shootingStar.x,
            y: shootingStar.y,
            opacity: shootingStar.brightness * fadeFactor,
          })
        }

        const maxTrailLength = shootingStar.distance === "near" ? 100 : shootingStar.distance === "medium" ? 80 : 60
        if (shootingStar.trail.length > maxTrailLength) {
          shootingStar.trail.shift()
        }

        if (shootingStar.active) {
          shootingStar.x += shootingStar.vx
          shootingStar.y += shootingStar.vy
        }

        shootingStar.life++

        shootingStar.trail.forEach((point, index) => {
          const positionFactor = index / shootingStar.trail.length
          const trailOpacity = positionFactor * point.opacity * 0.6

          const baseTrailSize = shootingStar.size * 0.4
          const trailSize = positionFactor * baseTrailSize + 0.3

          const { r, g, b } = shootingStar.color
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`
          ctx.shadowBlur = 4
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`

          ctx.beginPath()
          ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2)
          ctx.fill()
        })

        if (shootingStar.active) {
          const headBrightness = shootingStar.brightness * fadeFactor * 0.9
          const { r, g, b } = shootingStar.color

          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${headBrightness})`
          ctx.shadowBlur = 8
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${headBrightness})`

          ctx.beginPath()
          ctx.arc(shootingStar.x, shootingStar.y, shootingStar.size, 0, Math.PI * 2)
          ctx.fill()
        }

        if (shootingStar.direction === "horizontal") {
          if (shootingStar.x < -100 || shootingStar.x > canvas.width + 100) {
            shootingStar.active = false
          }
        } else {
          if (shootingStar.x > canvas.width + 100 || shootingStar.y > canvas.height + 100 || shootingStar.x < -100) {
            shootingStar.active = false
          }
        }

        if (!shootingStar.active && shootingStar.life > shootingStar.maxLife && shootingStar.trail.length === 0) {
          shootingStars.splice(i, 1)
        }

        if (!shootingStar.active && shootingStar.trail.length > 0 && shootingStar.life % 2 === 0) {
          shootingStar.trail.shift()
        }
      }

      shootingStarTimer++
      if (shootingStarTimer > shootingStarInterval) {
        createShootingStar()
        shootingStarTimer = 0
        shootingStarInterval = 600 + Math.random() * 900
      }

      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha = 1

      animationFrame = requestAnimationFrame(drawSpace)
    }

    drawSpace()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
