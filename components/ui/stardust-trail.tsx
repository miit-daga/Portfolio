"use client"

import { useEffect, useRef, useState } from "react"

type RGB = { r: number; g: number; b: number }

interface Particle {
  x: number
  y: number
  size: number
  life: number
  maxLife: number
  vx: number
  vy: number
  color: RGB
}

// Trail is teal by default, warm gold over interactive elements (echoes the sun cursor)
const TRAIL_TEAL: RGB = { r: 45, g: 212, b: 191 }
const TRAIL_GOLD: RGB = { r: 251, g: 191, b: 36 }
const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [onclick], input, textarea, select, label'

export const StardustTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const ringsRef = useRef<{ x: number; y: number; life: number; maxLife: number; color: RGB }[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const colorRef = useRef<RGB>(TRAIL_TEAL)
  const prevMouseRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef<number>(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      // Recolor based on what's under the pointer (the trail canvas is pointer-events:none)
      const el = document.elementFromPoint(e.clientX, e.clientY) as Element | null
      colorRef.current = el?.closest(INTERACTIVE_SELECTOR) ? TRAIL_GOLD : TRAIL_TEAL
    }
    window.addEventListener("mousemove", handleMouseMove)

    // Click burst: a radial spray of sparks + an expanding ripple ring
    const handleClick = (e: MouseEvent) => {
      const cx = e.clientX
      const cy = e.clientY
      ringsRef.current.push({ x: cx, y: cy, life: 0, maxLife: 22, color: { ...colorRef.current } })
      const count = 16
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3
        const speed = 2 + Math.random() * 3
        particlesRef.current.push({
          x: cx,
          y: cy,
          size: Math.random() * 2 + 1.5,
          life: 0,
          maxLife: 28 + Math.random() * 16,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          color: { ...colorRef.current },
        })
      }
    }
    window.addEventListener("click", handleClick)

    const MAX_PARTICLES = 90

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { x, y } = mouseRef.current
      const { x: px, y: py } = prevMouseRef.current
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)

      // Only spawn particles when mouse has moved enough
      if (dist > 2) {
        const spread = 8
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * spread,
          size: Math.random() * 2.5 + 1,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          color: { ...colorRef.current },
        })

        if (particlesRef.current.length > MAX_PARTICLES) {
          particlesRef.current.shift()
        }
      }

      prevMouseRef.current = { x, y }

      // Draw particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.94
        p.vy *= 0.94

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1)
          continue
        }

        const lifeRatio = 1 - p.life / p.maxLife
        const alpha = lifeRatio * 0.7
        const size = p.size * lifeRatio

        const { r, g, b } = p.color
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowBlur = 6
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Draw expanding click ripples
      for (let i = ringsRef.current.length - 1; i >= 0; i--) {
        const ring = ringsRef.current[i]
        ring.life++
        if (ring.life >= ring.maxLife) {
          ringsRef.current.splice(i, 1)
          continue
        }
        const t = ring.life / ring.maxLife
        const radius = t * 40 + 4
        const alpha = (1 - t) * 0.6
        const { r, g, b } = ring.color
        ctx.save()
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.lineWidth = 2 * (1 - t) + 0.5
        ctx.shadowBlur = 8
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick)
    }
  }, [isMobile])

  if (isMobile) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 45 }}
    />
  )
}
