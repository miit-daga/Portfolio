"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedBackgroundProps {
  children: React.ReactNode
  className?: string
  isImploding?: boolean // NEW: Prop to trigger black hole physics
}

type Star = {
  x: number; y: number; size: number; brightness: number;
  color: { r: number; g: number; b: number };
  canTwinkle: boolean;
  twinklePhase: number;
  twinkleSpeed: number;
  originalX: number;
  originalY: number;
  parallaxFactor: number;
  // NEW: Velocity for implosion
  vx?: number;
  vy?: number;
}

type ShootingStar = {
  x: number; y: number; vx: number; vy: number;
  brightness: number; life: number; maxLife: number;
  fadeOutStart: number; trail: { x: number; y: number; opacity: number }[];
  active: boolean; color: { r: number; g: number; b: number };
  size: number; distance: "near" | "medium" | "far";
}

// --- SOUND EFFECT GENERATOR ---
const playWarpSound = (isEngaging: boolean) => {
  if (typeof window === 'undefined') return;

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (isEngaging) {
    // Warp Up
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 1.5);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);
    osc.start(now);
    osc.stop(now + 1.5);
  } else {
    // Warp Down (Standard)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0, now + 1);
    osc.start(now);
    osc.stop(now + 1);
  }
};

// NEW: Black Hole Sound Generator
const playBlackHoleSound = () => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();

  // 1. Deep rumble (The suction)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sawtooth';
  const now = ctx.currentTime;

  // Pitch drops deep into sub-bass
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(10, now + 2.5);

  // Volume swells then cuts
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 2);
  gain.gain.linearRampToValueAtTime(0, now + 2.5);

  osc.start(now);
  osc.stop(now + 2.5);

  // 2. High pitch whine (The event horizon tension)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = 'sine';

  osc2.frequency.setValueAtTime(1000, now);
  osc2.frequency.exponentialRampToValueAtTime(8000, now + 2);

  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.05, now + 1.5);
  gain2.gain.linearRampToValueAtTime(0, now + 2.5);

  osc2.start(now);
  osc2.stop(now + 2.5);
};

export const AnimatedBackground = ({ children, className, isImploding = false }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 });
  const didPlayImplosionSound = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current
    const backgroundCanvas = backgroundCanvasRef.current
    if (!canvas || !backgroundCanvas) return

    const ctx = canvas.getContext("2d")
    const bgCtx = backgroundCanvas.getContext("2d")
    if (!ctx || !bgCtx) return

    // Play sound once when implosion starts
    if (isImploding && !didPlayImplosionSound.current) {
      playBlackHoleSound();
      didPlayImplosionSound.current = true;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5
      };
    };
    window.addEventListener("mousemove", handleMouseMove);

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    bgCtx.imageSmoothingEnabled = true
    bgCtx.imageSmoothingQuality = "high"

    // --- Configuration ---
    const MAX_ACTIVE_TWINKLERS = 15
    const TWINKLE_INTERVAL = 250
    const TWINKLE_CHANCE = 0.1
    const MIN_TWINKLE_BRIGHTNESS = 0.5
    const MAX_SHOOTING_STARS = 3
    const SHOOTING_STAR_INTERVAL_MIN = 2000
    const SHOOTING_STAR_INTERVAL_MAX = 3500

    // --- State ---
    let stars: Star[] = []
    let potentialTwinklers: Star[] = []
    let activeTwinklers: Star[] = []
    let shootingStars: ShootingStar[] = []
    let lastWidth = window.innerWidth;

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

    const resizeCanvas = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      canvas.width = newWidth;
      canvas.height = newHeight;
      backgroundCanvas.width = newWidth;
      backgroundCanvas.height = newHeight;

      stars = []
      potentialTwinklers = []
      activeTwinklers = []

      const starCount = Math.floor((canvas.width * canvas.height) / 2250)
      for (let i = 0; i < starCount; i++) {
        const canTwinkle = Math.random() < TWINKLE_CHANCE
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 1.5 + 0.5;

        const star: Star = {
          x,
          y,
          originalX: x,
          originalY: y,
          size,
          brightness: 0.4 + Math.random() * 0.5,
          color: getStarColor(),
          canTwinkle,
          twinklePhase: canTwinkle ? Math.random() * Math.PI * 2 : 0,
          twinkleSpeed: canTwinkle ? 0.01 + Math.random() * 0.02 : 0,
          parallaxFactor: size * 15,
          vx: 0,
          vy: 0
        }
        stars.push(star)
        if (canTwinkle) potentialTwinklers.push(star)
      }
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      if (Math.abs(newWidth - lastWidth) > 50) {
        resizeCanvas();
        lastWidth = newWidth;
      }
    };

    const createShootingStar = () => {
      if (shootingStars.filter(s => s.active).length >= MAX_SHOOTING_STARS) return
      // Don't create new shooting stars during implosion
      if (isImploding) return;

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

    // Acceleration counter for black hole
    let implosionFrame = 0;

    const drawSpace = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // If imploding, we want trails, so we fade the background instead of clearing it completely
      if (isImploding) {
        bgCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trail effect
        bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
      } else {
        bgCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height)
      }

      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha = 1

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 1. Draw Stars
      stars.forEach((star) => {
        let x = star.originalX;
        let y = star.originalY;

        if (isImploding) {
          // GRAVITY LOGIC
          implosionFrame += 0.0001; // Global speed up

          // Vector to center
          const dx = centerX - star.x;
          const dy = centerY - star.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Normalize
          const ndx = dx / distance;
          const ndy = dy / distance;

          // Spiral Tangent (perpendicular vector)
          const tx = -ndy;
          const ty = ndx;

          // Acceleration increases as it gets closer (Gravitational pull)
          // Prevent division by zero
          const pullStrength = 500 / (distance + 10);
          const speed = (1 + implosionFrame) * pullStrength;

          // Initialize velocity if undefined
          if (star.vx === undefined) star.vx = 0;
          if (star.vy === undefined) star.vy = 0;

          // Add forces: Pull towards center + Slight Spiral
          star.vx += (ndx * speed * 0.5) + (tx * speed * 0.2);
          star.vy += (ndy * speed * 0.5) + (ty * speed * 0.2);

          // Apply friction/drag to prevent exploding out
          star.vx *= 0.95;
          star.vy *= 0.95;

          // Update position
          star.x += star.vx;
          star.y += star.vy;

          // Use updated position
          x = star.x;
          y = star.y;

          // If very close to center, hide/reset
          if (distance < 5) {
            star.brightness = 0;
          }

          // Draw streak instead of dot for high speed
          const velocity = Math.sqrt(star.vx * star.vx + star.vy * star.vy);

          const { r, g, b } = star.color;
          bgCtx.lineWidth = star.size * (1 + velocity * 0.1);
          bgCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness})`;
          bgCtx.beginPath();
          bgCtx.moveTo(x, y);
          bgCtx.lineTo(x - star.vx * 2, y - star.vy * 2);
          bgCtx.stroke();

        } else {
          // NORMAL LOGIC
          // Apply parallax offset
          const offsetX = mouseRef.current.x * star.parallaxFactor;
          const offsetY = mouseRef.current.y * star.parallaxFactor;
          x = star.originalX + offsetX;
          y = star.originalY + offsetY;

          // Sync current position for smooth transition to implosion
          star.x = x;
          star.y = y;

          // Only draw background stars here if they aren't currently twinkling
          if (!activeTwinklers.includes(star)) {
            const { r, g, b } = star.color
            bgCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness * 0.8})`
            bgCtx.beginPath()
            bgCtx.arc(x, y, star.size, 0, Math.PI * 2)
            bgCtx.fill()
          }
        }
      });

      // 2. Twinkling (Only in Normal Mode)
      if (!isImploding) {
        for (let i = activeTwinklers.length - 1; i >= 0; i--) {
          const star = activeTwinklers[i]
          star.twinklePhase += star.twinkleSpeed

          const offsetX = mouseRef.current.x * star.parallaxFactor;
          const offsetY = mouseRef.current.y * star.parallaxFactor;

          if (star.twinklePhase >= Math.PI * 2) {
            star.twinklePhase = 0
            activeTwinklers.splice(i, 1)
            const { r, g, b } = star.color
            bgCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness * 0.8})`
            bgCtx.beginPath();
            bgCtx.arc(star.originalX + offsetX, star.originalY + offsetY, star.size, 0, Math.PI * 2);
            bgCtx.fill()
            continue
          }

          const baseIntensity = (Math.sin(star.twinklePhase) + 1) / 2
          const twinkleIntensity = MIN_TWINKLE_BRIGHTNESS + (baseIntensity * (1 - MIN_TWINKLE_BRIGHTNESS))

          const currentBrightness = star.brightness * twinkleIntensity
          const { r, g, b } = star.color

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentBrightness})`
          ctx.beginPath();
          ctx.arc(star.originalX + offsetX, star.originalY + offsetY, star.size, 0, Math.PI * 2);
          ctx.fill()
        }
      }

      // 3. Draw Shooting Stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i]

        // If imploding, accelerate shooting stars randomly to chaos
        if (isImploding) {
          const dx = centerX - ss.x;
          const dy = centerY - ss.y;
          ss.x += (dx * 0.05); // Suck in
          ss.y += (dy * 0.05);
          ss.vx *= 0.9;
          ss.vy *= 0.9;
        }

        let fadeFactor = 1
        if (ss.life > ss.fadeOutStart) fadeFactor = 1 - (ss.life - ss.fadeOutStart) / (ss.maxLife - ss.fadeOutStart)
        if (ss.active) ss.trail.push({ x: ss.x, y: ss.y, opacity: ss.brightness * fadeFactor })
        const maxTrailLength = ss.distance === "near" ? 80 : ss.distance === "medium" ? 60 : 40
        if (ss.trail.length > maxTrailLength) ss.trail.shift()

        if (ss.active) {
          ss.x += ss.vx;
          ss.y += ss.vy;
        }
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

      // 4. Create new shooting stars periodically (Only if not imploding)
      if (!isImploding) {
        shootingStarTimer += 1;
        if (shootingStarTimer > shootingStarInterval) {
          createShootingStar()
          shootingStarTimer = 0
          shootingStarInterval = SHOOTING_STAR_INTERVAL_MIN + Math.random() * (SHOOTING_STAR_INTERVAL_MAX - SHOOTING_STAR_INTERVAL_MIN)
        }
      }

      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0
      animationFrame = requestAnimationFrame(drawSpace)
    }

    const manageTwinkling = () => {
      if (isImploding) return; // No new twinkles during doom
      if (activeTwinklers.length >= MAX_ACTIVE_TWINKLERS || potentialTwinklers.length === 0) return
      const starToActivate = potentialTwinklers[Math.floor(Math.random() * potentialTwinklers.length)]
      if (!activeTwinklers.includes(starToActivate)) {
        activeTwinklers.push(starToActivate)
      }
    }

    resizeCanvas()
    drawSpace()
    twinkleIntervalHandle = window.setInterval(manageTwinkling, TWINKLE_INTERVAL)
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (twinkleIntervalHandle) clearInterval(twinkleIntervalHandle)
    }
  }, [isImploding]) // Re-run effect dependencies if Imploding changes

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