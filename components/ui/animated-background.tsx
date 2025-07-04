// // // "use client"

// // // import type React from "react"
// // // import { useEffect, useRef } from "react"
// // // import { cn } from "@/utils/cn"

// // // interface AnimatedBackgroundProps {
// // //   children: React.ReactNode
// // //   className?: string
// // // }

// // // export const AnimatedBackground = ({ children, className }: AnimatedBackgroundProps) => {
// // //   const canvasRef = useRef<HTMLCanvasElement>(null)
// // //   const containerRef = useRef<HTMLDivElement>(null)

// // //   useEffect(() => {
// // //     const canvas = canvasRef.current
// // //     const container = containerRef.current
// // //     if (!canvas || !container) return

// // //     const ctx = canvas.getContext("2d")
// // //     if (!ctx) return

// // //     const sectionId = container.querySelector("[id]")?.id || "unknown"

// // //     ctx.imageSmoothingEnabled = true
// // //     ctx.imageSmoothingQuality = "high"

// // //     const resizeCanvas = () => {
// // //       const rect = container.getBoundingClientRect()
// // //       canvas.width = rect.width
// // //       canvas.height = rect.height
// // //       canvas.style.width = rect.width + "px"
// // //       canvas.style.height = rect.height + "px"
// // //     }

// // //     resizeCanvas()
// // //     window.addEventListener("resize", resizeCanvas)

// // //     const getStarColor = () => {
// // //       const colorType = Math.random()

// // //       if (colorType < 0.5) {
// // //         return { r: 255, g: 255, b: 255 }
// // //       } else if (colorType < 0.7) {
// // //         return { r: 200, g: 220, b: 255 }
// // //       } else if (colorType < 0.85) {
// // //         return { r: 255, g: 250, b: 220 }
// // //       } else if (colorType < 0.93) {
// // //         return { r: 255, g: 200, b: 150 }
// // //       } else if (colorType < 0.98) {
// // //         return { r: 255, g: 180, b: 150 }
// // //       } else {
// // //         return { r: 150, g: 200, b: 255 }
// // //       }
// // //     }

// // //     const stars: {
// // //       x: number
// // //       y: number
// // //       size: number
// // //       twinkle: number
// // //       twinkleSpeed: number
// // //       brightness: number
// // //       color: { r: number; g: number; b: number }
// // //     }[] = []

// // //     const shootingStars: {
// // //       x: number
// // //       y: number
// // //       vx: number
// // //       vy: number
// // //       length: number
// // //       brightness: number
// // //       life: number
// // //       maxLife: number
// // //       fadeOutStart: number
// // //       trail: { x: number; y: number; opacity: number }[]
// // //       active: boolean
// // //       direction: "horizontal" | "vertical"
// // //       color: { r: number; g: number; b: number }
// // //       size: number
// // //       distance: "near" | "medium" | "far"
// // //     }[] = []

// // //     const starCount = Math.floor((canvas.width * canvas.height) / 6000)
// // //     for (let i = 0; i < starCount; i++) {
// // //       stars.push({
// // //         x: Math.random() * canvas.width,
// // //         y: Math.random() * canvas.height,
// // //         size: Math.random() * 1.5 + 0.5,
// // //         twinkle: Math.random() * Math.PI * 2,
// // //         twinkleSpeed: 0.01 + Math.random() * 0.02,
// // //         brightness: 0.4 + Math.random() * 0.5,
// // //         color: getStarColor(),
// // //       })
// // //     }

// // //     const getShootingStarColor = () => {
// // //       const colorType = Math.random()

// // //       if (colorType < 0.6) {
// // //         return { r: 255, g: 255, b: 255 }
// // //       } else if (colorType < 0.8) {
// // //         return { r: 200, g: 220, b: 255 }
// // //       } else if (colorType < 0.9) {
// // //         return { r: 255, g: 240, b: 180 }
// // //       } else if (colorType < 0.95) {
// // //         return { r: 180, g: 255, b: 200 }
// // //       } else {
// // //         return { r: 255, g: 180, b: 200 }
// // //       }
// // //     }

// // //     const createShootingStar = () => {
// // //       const direction = Math.random() < 0.6 ? "horizontal" : "vertical"
// // //       let startX, startY, vx, vy, maxLife

// // //       const distanceRoll = Math.random()
// // //       let distance: "near" | "medium" | "far"
// // //       let sizeMultiplier: number
// // //       let brightnessMultiplier: number

// // //       if (distanceRoll < 0.3) {
// // //         distance = "near"
// // //         sizeMultiplier = 1.5
// // //         brightnessMultiplier = 1.2
// // //       } else if (distanceRoll < 0.7) {
// // //         distance = "medium"
// // //         sizeMultiplier = 1.0
// // //         brightnessMultiplier = 1.0
// // //       } else {
// // //         distance = "far"
// // //         sizeMultiplier = 0.6
// // //         brightnessMultiplier = 0.7
// // //       }

// // //       if (direction === "horizontal") {
// // //         const leftToRight = Math.random() < 0.5

// // //         if (leftToRight) {
// // //           startX = -50
// // //           startY = Math.random() * canvas.height * 0.8
// // //           vx = 0.6 + Math.random() * 0.8
// // //           vy = (Math.random() - 0.5) * 0.4
// // //         } else {
// // //           startX = canvas.width + 50
// // //           startY = Math.random() * canvas.height * 0.8
// // //           vx = -(0.6 + Math.random() * 0.8)
// // //           vy = (Math.random() - 0.5) * 0.4
// // //         }

// // //         const distanceToTravel = canvas.width + 100
// // //         maxLife = Math.ceil(distanceToTravel / Math.abs(vx)) + 60
// // //       } else {
// // //         startX = Math.random() * canvas.width
// // //         startY = -50
// // //         vx = (Math.random() - 0.5) * 0.8
// // //         vy = 0.4 + Math.random() * 0.6

// // //         const distanceToTravel = canvas.height + 100
// // //         maxLife = Math.ceil(distanceToTravel / vy) + 60
// // //       }

// // //       const fadeOutStart = maxLife * 0.8

// // //       shootingStars.push({
// // //         x: startX,
// // //         y: startY,
// // //         vx: vx,
// // //         vy: vy,
// // //         length: 20 + Math.random() * 30,
// // //         brightness: (0.8 + Math.random() * 0.2) * brightnessMultiplier,
// // //         life: 0,
// // //         maxLife: maxLife,
// // //         fadeOutStart: fadeOutStart,
// // //         trail: [],
// // //         active: true,
// // //         direction: direction,
// // //         color: getShootingStarColor(),
// // //         size: (1.5 + Math.random() * 1) * sizeMultiplier,
// // //         distance: distance,
// // //       })
// // //     }

// // //     let shootingStarTimer = 0
// // //     let shootingStarInterval = 600 + Math.random() * 900

// // //     let animationFrame: number

// // //     const drawSpace = () => {
// // //       ctx.clearRect(0, 0, canvas.width, canvas.height)

// // //       ctx.globalCompositeOperation = "source-over"
// // //       ctx.globalAlpha = 1

// // //       stars.forEach((star) => {
// // //         const twinkleIntensity = (Math.sin(star.twinkle) + 1) * 0.5
// // //         const currentBrightness = star.brightness * twinkleIntensity * 0.8
// // //         const currentSize = star.size * (0.8 + twinkleIntensity * 0.2)

// // //         const { r, g, b } = star.color
// // //         ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${currentBrightness * 0.6})`
// // //         ctx.shadowBlur = 4
// // //         ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentBrightness})`

// // //         ctx.beginPath()
// // //         ctx.arc(star.x, star.y, currentSize, 0, Math.PI * 2)
// // //         ctx.fill()

// // //         star.twinkle += star.twinkleSpeed
// // //       })

// // //       for (let i = shootingStars.length - 1; i >= 0; i--) {
// // //         const shootingStar = shootingStars[i]

// // //         let fadeFactor = 1
// // //         if (shootingStar.life > shootingStar.fadeOutStart) {
// // //           fadeFactor =
// // //             1 - (shootingStar.life - shootingStar.fadeOutStart) / (shootingStar.maxLife - shootingStar.fadeOutStart)
// // //         }

// // //         if (shootingStar.active) {
// // //           shootingStar.trail.push({
// // //             x: shootingStar.x,
// // //             y: shootingStar.y,
// // //             opacity: shootingStar.brightness * fadeFactor,
// // //           })
// // //         }

// // //         const maxTrailLength = shootingStar.distance === "near" ? 100 : shootingStar.distance === "medium" ? 80 : 60
// // //         if (shootingStar.trail.length > maxTrailLength) {
// // //           shootingStar.trail.shift()
// // //         }

// // //         if (shootingStar.active) {
// // //           shootingStar.x += shootingStar.vx
// // //           shootingStar.y += shootingStar.vy
// // //         }

// // //         shootingStar.life++

// // //         shootingStar.trail.forEach((point, index) => {
// // //           const positionFactor = index / shootingStar.trail.length
// // //           const trailOpacity = positionFactor * point.opacity * 0.6

// // //           const baseTrailSize = shootingStar.size * 0.4
// // //           const trailSize = positionFactor * baseTrailSize + 0.3

// // //           const { r, g, b } = shootingStar.color
// // //           ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`
// // //           ctx.shadowBlur = 4
// // //           ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`

// // //           ctx.beginPath()
// // //           ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2)
// // //           ctx.fill()
// // //         })

// // //         if (shootingStar.active) {
// // //           const headBrightness = shootingStar.brightness * fadeFactor * 0.9
// // //           const { r, g, b } = shootingStar.color

// // //           ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${headBrightness})`
// // //           ctx.shadowBlur = 8
// // //           ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${headBrightness})`

// // //           ctx.beginPath()
// // //           ctx.arc(shootingStar.x, shootingStar.y, shootingStar.size, 0, Math.PI * 2)
// // //           ctx.fill()
// // //         }

// // //         if (shootingStar.direction === "horizontal") {
// // //           if (shootingStar.x < -100 || shootingStar.x > canvas.width + 100) {
// // //             shootingStar.active = false
// // //           }
// // //         } else {
// // //           if (shootingStar.x > canvas.width + 100 || shootingStar.y > canvas.height + 100 || shootingStar.x < -100) {
// // //             shootingStar.active = false
// // //           }
// // //         }

// // //         if (!shootingStar.active && shootingStar.life > shootingStar.maxLife && shootingStar.trail.length === 0) {
// // //           shootingStars.splice(i, 1)
// // //         }

// // //         if (!shootingStar.active && shootingStar.trail.length > 0 && shootingStar.life % 2 === 0) {
// // //           shootingStar.trail.shift()
// // //         }
// // //       }

// // //       shootingStarTimer++
// // //       if (shootingStarTimer > shootingStarInterval) {
// // //         createShootingStar()
// // //         shootingStarTimer = 0
// // //         shootingStarInterval = 600 + Math.random() * 900
// // //       }

// // //       ctx.shadowColor = "transparent"
// // //       ctx.shadowBlur = 0
// // //       ctx.globalCompositeOperation = "source-over"
// // //       ctx.globalAlpha = 1

// // //       animationFrame = requestAnimationFrame(drawSpace)
// // //     }

// // //     drawSpace()

// // //     return () => {
// // //       window.removeEventListener("resize", resizeCanvas)
// // //       if (animationFrame) {
// // //         cancelAnimationFrame(animationFrame)
// // //       }
// // //     }
// // //   }, [])

// // //   return (
// // //     <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
// // //       <canvas
// // //         ref={canvasRef}
// // //         className="absolute inset-0 w-full h-full pointer-events-none"
// // //         style={{
// // //           position: "fixed",
// // //           top: 0,
// // //           left: 0,
// // //           width: "100%",
// // //           height: "100%",
// // //           pointerEvents: "none",
// // //           zIndex: -1,
// // //         }}
// // //       />
// // //       <div className="relative">{children}</div>
// // //     </div>
// // //   )
// // // }
// "use client"

// import type React from "react"
// import { useEffect, useRef } from "react"
// import { cn } from "@/lib/utils"

// interface AnimatedBackgroundProps {
//   children: React.ReactNode
//   className?: string
// }

// export const AnimatedBackground = ({ children, className }: AnimatedBackgroundProps) => {
//   const canvasRef = useRef<HTMLCanvasElement>(null)
//   const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)
//   const containerRef = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     const canvas = canvasRef.current
//     const backgroundCanvas = backgroundCanvasRef.current
//     const container = containerRef.current
//     if (!canvas || !backgroundCanvas || !container) return

//     const ctx = canvas.getContext("2d")
//     const bgCtx = backgroundCanvas.getContext("2d")
//     if (!ctx || !bgCtx) return

//     ctx.imageSmoothingEnabled = true
//     ctx.imageSmoothingQuality = "high"
//     bgCtx.imageSmoothingEnabled = true
//     bgCtx.imageSmoothingQuality = "high"

//     const stars: {
//       x: number
//       y: number
//       size: number
//       brightness: number
//       color: { r: number; g: number; b: number }
//     }[] = []

//     // --- MOVE HELPER FUNCTIONS HERE ---
//     // This ensures they are defined before being called by other functions like resizeCanvas.
//     const getStarColor = () => {
//       const colorType = Math.random()
//       if (colorType < 0.5) {
//         return { r: 255, g: 255, b: 255 }
//       } else if (colorType < 0.7) {
//         return { r: 200, g: 220, b: 255 }
//       } else if (colorType < 0.85) {
//         return { r: 255, g: 250, b: 220 }
//       } else if (colorType < 0.93) {
//         return { r: 255, g: 200, b: 150 }
//       } else if (colorType < 0.98) {
//         return { r: 255, g: 180, b: 150 }
//       } else {
//         return { r: 150, g: 200, b: 255 }
//       }
//     }

//     const getShootingStarColor = () => {
//       const colorType = Math.random()
//       if (colorType < 0.6) {
//         return { r: 255, g: 255, b: 255 }
//       } else if (colorType < 0.8) {
//         return { r: 200, g: 220, b: 255 }
//       } else if (colorType < 0.9) {
//         return { r: 255, g: 240, b: 180 }
//       } else if (colorType < 0.95) {
//         return { r: 180, g: 255, b: 200 }
//       } else {
//         return { r: 255, g: 180, b: 200 }
//       }
//     }

//     const drawStaticStars = () => {
//       if (!bgCtx || !backgroundCanvas) return
//       bgCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height)

//       stars.forEach((star) => {
//         const { r, g, b } = star.color
//         const alpha = star.brightness * 0.8

//         bgCtx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`
//         bgCtx.shadowBlur = 2
//         bgCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`

//         bgCtx.beginPath()
//         bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
//         bgCtx.fill()
//       })

//       bgCtx.shadowColor = "transparent"
//       bgCtx.shadowBlur = 0
//     }

//     const resizeCanvas = () => {
//       canvas.width = window.innerWidth
//       canvas.height = window.innerHeight
//       backgroundCanvas.width = window.innerWidth
//       backgroundCanvas.height = window.innerHeight

//       stars.length = 0
//       const starCount = Math.floor((canvas.width * canvas.height) / 12000)
//       for (let i = 0; i < starCount; i++) {
//         stars.push({
//           x: Math.random() * canvas.width,
//           y: Math.random() * canvas.height,
//           size: Math.random() * 1.5 + 0.5,
//           brightness: 0.4 + Math.random() * 0.5,
//           color: getStarColor(), // Now this will work
//         })
//       }

//       drawStaticStars()
//     }

//     resizeCanvas()
//     window.addEventListener("resize", resizeCanvas)

//     const shootingStars: {
//       x: number
//       y: number
//       vx: number
//       vy: number
//       length: number
//       brightness: number
//       life: number
//       maxLife: number
//       fadeOutStart: number
//       trail: { x: number; y: number; opacity: number }[]
//       active: boolean
//       direction: "horizontal" | "vertical"
//       color: { r: number; g: number; b: number }
//       size: number
//       distance: "near" | "medium" | "far"
//     }[] = []

//     const MAX_SHOOTING_STARS = 1

//     const createShootingStar = () => {
//       const activeShootingStars = shootingStars.filter((star) => star.active).length

//       if (activeShootingStars >= MAX_SHOOTING_STARS) {
//         return
//       }

//       const direction = Math.random() < 0.6 ? "horizontal" : "vertical"
//       let startX, startY, vx, vy, maxLife

//       const distanceRoll = Math.random()
//       let distance: "near" | "medium" | "far"
//       let sizeMultiplier: number
//       let brightnessMultiplier: number

//       if (distanceRoll < 0.3) {
//         distance = "near"
//         sizeMultiplier = 1.5
//         brightnessMultiplier = 1.2
//       } else if (distanceRoll < 0.7) {
//         distance = "medium"
//         sizeMultiplier = 1.0
//         brightnessMultiplier = 1.0
//       } else {
//         distance = "far"
//         sizeMultiplier = 0.6
//         brightnessMultiplier = 0.7
//       }

//       if (direction === "horizontal") {
//         const leftToRight = Math.random() < 0.5
//         if (leftToRight) {
//           startX = -50
//           startY = Math.random() * canvas.height * 0.8
//           vx = 0.6 + Math.random() * 0.8
//           vy = (Math.random() - 0.5) * 0.4
//         } else {
//           startX = canvas.width + 50
//           startY = Math.random() * canvas.height * 0.8
//           vx = -(0.6 + Math.random() * 0.8)
//           vy = (Math.random() - 0.5) * 0.4
//         }
//         const distanceToTravel = canvas.width + 100
//         maxLife = Math.ceil(distanceToTravel / Math.abs(vx)) + 60
//       } else {
//         startX = Math.random() * canvas.width
//         startY = -50
//         vx = (Math.random() - 0.5) * 0.8
//         vy = 0.4 + Math.random() * 0.6
//         const distanceToTravel = canvas.height + 100
//         maxLife = Math.ceil(distanceToTravel / vy) + 60
//       }

//       const fadeOutStart = maxLife * 0.8

//       shootingStars.push({
//         x: startX,
//         y: startY,
//         vx,
//         vy,
//         length: 20 + Math.random() * 30,
//         brightness: (0.8 + Math.random() * 0.2) * brightnessMultiplier,
//         life: 0,
//         maxLife,
//         fadeOutStart,
//         trail: [],
//         active: true,
//         direction,
//         color: getShootingStarColor(),
//         size: (1.5 + Math.random() * 1) * sizeMultiplier,
//         distance,
//       })
//     }

//     let shootingStarTimer = 0
//     let shootingStarInterval = 5000 + Math.random() * 5000;
//     let animationFrame: number

//     const drawSpace = () => {
//       // Clear only the main canvas for shooting stars
//       ctx.clearRect(0, 0, canvas.width, canvas.height)
//       ctx.globalCompositeOperation = "source-over"
//       ctx.globalAlpha = 1

//       // Draw shooting stars directly on top of background
//       for (let i = shootingStars.length - 1; i >= 0; i--) {
//         const shootingStar = shootingStars[i]

//         let fadeFactor = 1
//         if (shootingStar.life > shootingStar.fadeOutStart) {
//           fadeFactor =
//             1 - (shootingStar.life - shootingStar.fadeOutStart) / (shootingStar.maxLife - shootingStar.fadeOutStart)
//         }

//         if (shootingStar.active) {
//           shootingStar.trail.push({
//             x: shootingStar.x,
//             y: shootingStar.y,
//             opacity: shootingStar.brightness * fadeFactor,
//           })
//         }

//         const maxTrailLength = shootingStar.distance === "near" ? 80 : shootingStar.distance === "medium" ? 60 : 40
//         if (shootingStar.trail.length > maxTrailLength) {
//           shootingStar.trail.shift()
//         }

//         if (shootingStar.active) {
//           shootingStar.x += shootingStar.vx
//           shootingStar.y += shootingStar.vy
//         }

//         shootingStar.life++

//         shootingStar.trail.forEach((point, index) => {
//           const positionFactor = index / shootingStar.trail.length
//           const trailOpacity = positionFactor * point.opacity * 0.5
//           const baseTrailSize = shootingStar.size * 0.4
//           const trailSize = positionFactor * baseTrailSize + 0.2
//           const { r, g, b } = shootingStar.color

//           ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`
//           ctx.shadowBlur = 2
//           ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`

//           ctx.beginPath()
//           ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2)
//           ctx.fill()
//         })

//         if (shootingStar.active) {
//           const headBrightness = shootingStar.brightness * fadeFactor * 0.9
//           const { r, g, b } = shootingStar.color

//           ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${headBrightness})`
//           ctx.shadowBlur = 4
//           ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${headBrightness})`

//           ctx.beginPath()
//           ctx.arc(shootingStar.x, shootingStar.y, shootingStar.size, 0, Math.PI * 2)
//           ctx.fill()
//         }

//         if (shootingStar.direction === "horizontal") {
//           if (shootingStar.x < -100 || shootingStar.x > canvas.width + 100) {
//             shootingStar.active = false
//           }
//         } else {
//           if (shootingStar.x > canvas.width + 100 || shootingStar.y > canvas.height + 100 || shootingStar.x < -100) {
//             shootingStar.active = false
//           }
//         }

//         if (!shootingStar.active && shootingStar.life > shootingStar.maxLife && shootingStar.trail.length === 0) {
//           shootingStars.splice(i, 1)
//         }

//         if (!shootingStar.active && shootingStar.trail.length > 0 && shootingStar.life % 2 === 0) {
//           shootingStar.trail.shift()
//         }
//       }

//       shootingStarTimer++
//       if (shootingStarTimer > shootingStarInterval) {
//         createShootingStar()
//         shootingStarTimer = 0
//         shootingStarInterval = 5000 + Math.random() * 5000
//       }

//       ctx.shadowColor = "transparent"
//       ctx.shadowBlur = 0
//       ctx.globalCompositeOperation = "source-over"
//       ctx.globalAlpha = 1

//       animationFrame = requestAnimationFrame(drawSpace)
//     }

//     drawSpace()

//     return () => {
//       window.removeEventListener("resize", resizeCanvas)
//       if (animationFrame) {
//         cancelAnimationFrame(animationFrame)
//       }
//     }
//   }, [])

//   return (
//     <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
//       <canvas
//         ref={backgroundCanvasRef}
//         className="absolute inset-0"
//         style={{
//           position: "fixed",
//           top: 0,
//           left: 0,
//           width: "100vw",
//           height: "100vh",
//           pointerEvents: "none",
//           zIndex: -2,
//         }}
//       />
//       <canvas
//         ref={canvasRef}
//         className="absolute inset-0"
//         style={{
//           position: "fixed",
//           top: 0,
//           left: 0,
//           width: "100vw",
//           height: "100vh",
//           pointerEvents: "none",
//           zIndex: -1,
//         }}
//       />
//       <div className="relative z-10">{children}</div>
//     </div>
//   )
// }


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