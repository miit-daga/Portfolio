"use client"

import { useEffect, useRef, useState } from "react"

interface Particle {
  x: number
  y: number
  size: number
  life: number
  maxLife: number
  vx: number
  vy: number
}

export const StardustTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
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
    }
    window.addEventListener("mousemove", handleMouseMove)

    const MAX_PARTICLES = 35

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

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1)
          continue
        }

        const lifeRatio = 1 - p.life / p.maxLife
        const alpha = lifeRatio * 0.7
        const size = p.size * lifeRatio

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowBlur = 6
        ctx.shadowColor = `rgba(45, 212, 191, ${alpha})`
        ctx.fillStyle = `rgba(45, 212, 191, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
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
