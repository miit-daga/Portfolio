"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedBackgroundProps {
  children: React.ReactNode
  className?: string
}

// Define the types for better readability and type safety
type Star = {
  x: number; y: number; size: number; brightness: number;
  color: { r: number; g: number; b: number };
  canTwinkle: boolean;
  twinklePhase: number;
  twinkleSpeed: number;
}

type ShootingStar = {
  x: number; y: number; vx: number; vy: number;
  brightness: number; life: number; maxLife: number;
  fadeOutStart: number; trail: { x: number; y: number; opacity: number }[];
  active: boolean; color: { r: number; g: number; b: number };
  size: number; distance: "near" | "medium" | "far";
}

export const AnimatedBackground = ({ children, className }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const backgroundCanvas = backgroundCanvasRef.current
    if (!canvas || !backgroundCanvas) return

    const ctx = canvas.getContext("2d")
    const bgCtx = backgroundCanvas.getContext("2d")
    if (!ctx || !bgCtx) return

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    bgCtx.imageSmoothingEnabled = true
    bgCtx.imageSmoothingQuality = "high"

    // --- Configuration ---
    const MAX_ACTIVE_TWINKLERS = 15
    const TWINKLE_INTERVAL = 250
    const TWINKLE_CHANCE = 0.1
    const MIN_TWINKLE_BRIGHTNESS = 0.5
    const MAX_SHOOTING_STARS = 2
    const SHOOTING_STAR_INTERVAL_MIN = 3000
    const SHOOTING_STAR_INTERVAL_MAX = 5000

    // --- State ---
    let stars: Star[] = []
    let potentialTwinklers: Star[] = []
    let activeTwinklers: Star[] = []
    let shootingStars: ShootingStar[] = []

    // --- NEW: Store last known dimensions to prevent re-render on mobile scroll ---
    let lastWidth = 0
    let lastHeight = 0

    // --- Helper Functions ---
    const getStarColor = () => {
      const colorType = Math.random()
      if (colorType < 0.5) return { r: 255, g: 255, b: 255 }
      if (colorType < 0.7) return { r: 200, g: 220, b: 255 }
      if (colorType < 0.85) return { r: 255, g: 250, b: 220 }
      if (colorType < 0.93) return { r: 255, g: 200, b: 150 }
      return { r: 150, g: 200, b: 255 }
    }

    const getShootingStarColor = () => {
      const colorType = Math.random()
      if (colorType < 0.6) return { r: 255, g: 255, b: 255 }
      if (colorType < 0.8) return { r: 200, g: 220, b: 255 }
      if (colorType < 0.9) return { r: 255, g: 240, b: 180 }
      return { r: 255, g: 180, b: 200 }
    }

    const drawStaticStars = () => {
      if (!bgCtx || !backgroundCanvas) return
      bgCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height)
      stars.forEach((star) => {
        const { r, g, b } = star.color
        bgCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness * 0.8})`
        bgCtx.beginPath()
        bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        bgCtx.fill()
      })
    }

    // --- MODIFIED: The resize function is now smarter ---
    const resizeCanvas = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      // Check if the resize is significant enough to warrant a full redraw
      // This prevents the expensive re-render on mobile browsers when the address bar hides.
      if (lastWidth > 0 && Math.abs(newWidth - lastWidth) < 100 && Math.abs(newHeight - lastHeight) < 100) {
        return;
      }

      // Update the last known dimensions
      lastWidth = newWidth;
      lastHeight = newHeight;

      // Continue with the full resize logic only if it's a significant change
      canvas.width = newWidth;
      canvas.height = newHeight;
      backgroundCanvas.width = newWidth;
      backgroundCanvas.height = newHeight;

      stars = []
      potentialTwinklers = []
      activeTwinklers = []

      const starCount = Math.floor((canvas.width * canvas.height) / 12000)
      for (let i = 0; i < starCount; i++) {
        const canTwinkle = Math.random() < TWINKLE_CHANCE
        const star: Star = {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          brightness: 0.4 + Math.random() * 0.5,
          color: getStarColor(),
          canTwinkle,
          twinklePhase: canTwinkle ? Math.random() * Math.PI * 2 : 0,
          twinkleSpeed: canTwinkle ? 0.01 + Math.random() * 0.02 : 0,
        }
        stars.push(star)
        if (canTwinkle) potentialTwinklers.push(star)
      }

      drawStaticStars()
    }

    const createShootingStar = () => {
      if (shootingStars.filter(s => s.active).length >= MAX_SHOOTING_STARS) return

      const direction = Math.random() < 0.6 ? "horizontal" : "vertical"
      let startX, startY, vx, vy, maxLife
      const distanceRoll = Math.random()
      let distance: "near" | "medium" | "far", sizeMultiplier: number, brightnessMultiplier: number

      if (distanceRoll < 0.3) { distance = "near"; sizeMultiplier = 1.5; brightnessMultiplier = 1.2; }
      else if (distanceRoll < 0.7) { distance = "medium"; sizeMultiplier = 1.0; brightnessMultiplier = 1.0; }
      else { distance = "far"; sizeMultiplier = 0.6; brightnessMultiplier = 0.7; }

      if (direction === "horizontal") {
        if (Math.random() < 0.5) { startX = -50; startY = Math.random() * canvas.height * 0.8; vx = 0.6 + Math.random() * 0.8; vy = (Math.random() - 0.5) * 0.4; }
        else { startX = canvas.width + 50; startY = Math.random() * canvas.height * 0.8; vx = -(0.6 + Math.random() * 0.8); vy = (Math.random() - 0.5) * 0.4; }
        maxLife = Math.ceil((canvas.width + 100) / Math.abs(vx)) + 60
      } else {
        startX = Math.random() * canvas.width; startY = -50; vx = (Math.random() - 0.5) * 0.8; vy = 0.4 + Math.random() * 0.6;
        maxLife = Math.ceil((canvas.height + 100) / vy) + 60
      }

      shootingStars.push({
        x: startX, y: startY, vx, vy,
        brightness: (0.8 + Math.random() * 0.2) * brightnessMultiplier,
        life: 0, maxLife, fadeOutStart: maxLife * 0.8,
        trail: [], active: true, color: getShootingStarColor(),
        size: (1.5 + Math.random() * 1) * sizeMultiplier, distance,
      })
    }

    // --- Animation Logic ---
    let animationFrame: number
    let shootingStarTimer = 0
    let shootingStarInterval = SHOOTING_STAR_INTERVAL_MIN + Math.random() * (SHOOTING_STAR_INTERVAL_MAX - SHOOTING_STAR_INTERVAL_MIN)
    let twinkleIntervalHandle: number

    const drawSpace = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha = 1

      // 1. Draw Active Twinkling Stars
      for (let i = activeTwinklers.length - 1; i >= 0; i--) {
        const star = activeTwinklers[i]
        star.twinklePhase += star.twinkleSpeed

        if (star.twinklePhase >= Math.PI * 2) {
          star.twinklePhase = 0
          activeTwinklers.splice(i, 1)
          const { r, g, b } = star.color
          bgCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness * 0.8})`
          bgCtx.beginPath(); bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2); bgCtx.fill()
          continue
        }

        const baseIntensity = (Math.sin(star.twinklePhase) + 1) / 2
        const twinkleIntensity = MIN_TWINKLE_BRIGHTNESS + (baseIntensity * (1 - MIN_TWINKLE_BRIGHTNESS))

        const currentBrightness = star.brightness * twinkleIntensity
        const { r, g, b } = star.color

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentBrightness})`
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill()
      }

      // 2. Draw Shooting Stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i]
        let fadeFactor = 1
        if (ss.life > ss.fadeOutStart) fadeFactor = 1 - (ss.life - ss.fadeOutStart) / (ss.maxLife - ss.fadeOutStart)
        if (ss.active) ss.trail.push({ x: ss.x, y: ss.y, opacity: ss.brightness * fadeFactor })
        const maxTrailLength = ss.distance === "near" ? 80 : ss.distance === "medium" ? 60 : 40
        if (ss.trail.length > maxTrailLength) ss.trail.shift()
        if (ss.active) { ss.x += ss.vx; ss.y += ss.vy }
        ss.life++

        ss.trail.forEach((p, index) => {
          const trailOpacity = (index / ss.trail.length) * p.opacity * 0.5
          const trailSize = (index / ss.trail.length) * (ss.size * 0.4) + 0.2
          ctx.shadowColor = `rgba(${ss.color.r}, ${ss.color.g}, ${ss.color.b}, ${trailOpacity})`
          ctx.shadowBlur = 2; ctx.fillStyle = `rgba(${ss.color.r}, ${ss.color.g}, ${ss.color.b}, ${trailOpacity})`
          ctx.beginPath(); ctx.arc(p.x, p.y, trailSize, 0, Math.PI * 2); ctx.fill()
        })

        if (ss.active) {
          const headBrightness = ss.brightness * fadeFactor * 0.9
          ctx.shadowColor = `rgba(${ss.color.r}, ${ss.color.g}, ${ss.color.b}, ${headBrightness})`
          ctx.shadowBlur = 4; ctx.fillStyle = `rgba(${ss.color.r}, ${ss.color.g}, ${ss.color.b}, ${headBrightness})`
          ctx.beginPath(); ctx.arc(ss.x, ss.y, ss.size, 0, Math.PI * 2); ctx.fill()
        }

        if ((ss.vx > 0 && ss.x > canvas.width + 100) || (ss.vx < 0 && ss.x < -100) || ss.y > canvas.height + 100) ss.active = false
        if (!ss.active && ss.trail.length === 0) shootingStars.splice(i, 1)
        if (!ss.active && ss.trail.length > 0 && ss.life % 2 === 0) ss.trail.shift()
      }

      // 3. Create new shooting stars periodically
      shootingStarTimer++
      if (shootingStarTimer > shootingStarInterval) {
        createShootingStar()
        shootingStarTimer = 0
        shootingStarInterval = SHOOTING_STAR_INTERVAL_MIN + Math.random() * (SHOOTING_STAR_INTERVAL_MAX - SHOOTING_STAR_INTERVAL_MIN)
      }

      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0
      animationFrame = requestAnimationFrame(drawSpace)
    }

    const manageTwinkling = () => {
      if (activeTwinklers.length >= MAX_ACTIVE_TWINKLERS || potentialTwinklers.length === 0) return
      const starToActivate = potentialTwinklers[Math.floor(Math.random() * potentialTwinklers.length)]
      if (!activeTwinklers.includes(starToActivate)) {
        activeTwinklers.push(starToActivate)
        bgCtx.clearRect(starToActivate.x - starToActivate.size - 1, starToActivate.y - starToActivate.size - 1, starToActivate.size * 2 + 2, starToActivate.size * 2 + 2)
      }
    }

    // --- Initialization and Cleanup ---
    resizeCanvas()
    drawSpace()
    twinkleIntervalHandle = window.setInterval(manageTwinkling, TWINKLE_INTERVAL)
    window.addEventListener("resize", resizeCanvas)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (twinkleIntervalHandle) clearInterval(twinkleIntervalHandle)
    }
  }, [])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={backgroundCanvasRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: -2 }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: -1 }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}