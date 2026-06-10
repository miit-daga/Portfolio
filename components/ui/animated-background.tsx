"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { describeLocation } from "@/lib/locate"

interface AnimatedBackgroundProps {
  children: React.ReactNode
  className?: string
  isImploding?: boolean
}

// --- Types ---
type Star = {
  x: number; y: number; size: number; brightness: number;
  color: { r: number; g: number; b: number };
  canTwinkle: boolean;
  twinklePhase: number;
  twinkleSpeed: number;
  originalX: number;
  originalY: number;
  parallaxFactor: number;
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

type Planet = {
  x: number;
  y: number;
  radius: number;
  originalRadius: number;
  color: string;
  hasRing: boolean;
  ringColor: string;
  ringAngle: number;
  orbitAngle: number;
  orbitSpeed: number;
  distanceFromCenter: number;
  originalDistance: number;
  parallaxFactor: number; // NEW: Controls depth perception
  moon?: boolean; // has a small orbiting satellite-moon
  moonAngle?: number;
};

type Satellite = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  blink: number;
  active: boolean;
};

// --- SOUND EFFECT GENERATORS (No changes here) ---
const playBlackHoleSound = () => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(10, now + 2.5);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 2);
  gain.gain.linearRampToValueAtTime(0, now + 2.5);
  osc.start(now);
  osc.stop(now + 2.5);

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

// --- Colour helpers for spherical planet shading ---
const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const shadeRgb = (c: { r: number; g: number; b: number }, f: number) => {
  const m = (v: number) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return { r: m(c.r), g: m(c.g), b: m(c.b) };
};

// Concentric ring bands (radius multiple, width, opacity) - note the faint
// band ~1.6 acts as a Cassini-style gap between the two bright bands.
const RING_BANDS = [
  { rad: 1.34, w: 0.05, a: 0.22 },
  { rad: 1.48, w: 0.11, a: 0.5 },
  { rad: 1.62, w: 0.04, a: 0.12 },
  { rad: 1.78, w: 0.13, a: 0.55 },
  { rad: 1.96, w: 0.06, a: 0.28 },
];

const drawRing = (ctx: CanvasRenderingContext2D, p: Planet, half: "front" | "back") => {
  const r = p.radius;
  const base = hexToRgb(p.color);
  const tint = shadeRgb(base, 0.65); // icy, light-tinted ring
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.ringAngle);
  const start = half === "front" ? 0 : Math.PI;
  const end = half === "front" ? Math.PI : Math.PI * 2;
  RING_BANDS.forEach((b) => {
    const a = half === "back" ? b.a * 0.4 : b.a; // back half is dimmer
    ctx.lineWidth = r * b.w;
    ctx.strokeStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${a})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * b.rad, r * b.rad * 0.32, 0, start, end);
    ctx.stroke();
  });
  ctx.restore();
};

const drawPlanet = (ctx: CanvasRenderingContext2D, p: Planet) => {
  const r = p.radius;
  if (r <= 0.5) return;

  const base = hexToRgb(p.color);
  const light = shadeRgb(base, 0.55);
  const dark = shadeRgb(base, -0.62);
  const lx = p.x - r * 0.4; // light source (upper-left)
  const ly = p.y - r * 0.4;

  // 1. Atmospheric halo
  const halo = ctx.createRadialGradient(p.x, p.y, r * 0.85, p.x, p.y, r * 1.95);
  halo.addColorStop(0, `rgba(${base.r}, ${base.g}, ${base.b}, 0.22)`);
  halo.addColorStop(1, `rgba(${base.r}, ${base.g}, ${base.b}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 1.95, 0, Math.PI * 2);
  ctx.fill();

  // 2. Ring - back half (behind body)
  if (p.hasRing) drawRing(ctx, p, "back");

  // Orbiting moon - the far (upper) half is drawn behind the body for occlusion
  const drawMoon = () => {
    const a = p.moonAngle ?? 0;
    const md = r * 1.9;
    const mx = p.x + Math.cos(a) * md;
    const my = p.y + Math.sin(a) * md * 0.4;
    const mr = Math.max(1.6, r * 0.18);
    const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, "#e0e7ff"); // icy alien moon - periwinkle highlight
    mg.addColorStop(0.6, "#818cf8");
    mg.addColorStop(1, "#312e81"); // deep indigo shadow
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  };
  const moonIsFront = Math.sin(p.moonAngle ?? 0) >= 0;
  if (p.moon && !moonIsFront) drawMoon(); // behind - the body fill below will occlude it

  // 3. Body - clipped sphere with bands, terminator, ring-shadow & highlight
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.clip();

  const body = ctx.createRadialGradient(lx, ly, r * 0.1, p.x, p.y, r * 1.15);
  body.addColorStop(0, `rgb(${light.r}, ${light.g}, ${light.b})`);
  body.addColorStop(0.5, `rgb(${base.r}, ${base.g}, ${base.b})`);
  body.addColorStop(1, `rgb(${dark.r}, ${dark.g}, ${dark.b})`);
  ctx.fillStyle = body;
  ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);

  // Cloud bands, parallel to the ring plane
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.ringAngle);
  const bandCount = 7;
  for (let i = 0; i < bandCount; i++) {
    const t = i / (bandCount - 1);
    const by = (t - 0.5) * 2 * r;
    const bh = r * (0.09 + 0.05 * Math.sin(i * 1.7));
    const tint = i % 2 === 0 ? shadeRgb(base, 0.2) : shadeRgb(base, -0.24);
    ctx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.18)`;
    ctx.beginPath();
    ctx.ellipse(0, by, r * 1.25, bh, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Deepen the terminator (shaded lower-right)
  const term = ctx.createRadialGradient(lx, ly, r * 0.2, p.x + r * 0.35, p.y + r * 0.35, r * 1.45);
  term.addColorStop(0, "rgba(0, 0, 0, 0)");
  term.addColorStop(0.65, "rgba(0, 0, 0, 0)");
  term.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = term;
  ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);

  // Specular sheen near the light source
  const spec = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.75);
  spec.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  spec.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(lx, ly, r * 0.75, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // unclip

  // 4. Rim light along the lit limb
  ctx.save();
  ctx.lineWidth = Math.max(1, r * 0.05);
  const rim = ctx.createLinearGradient(p.x - r, p.y - r, p.x + r, p.y + r);
  rim.addColorStop(0, `rgba(${light.r}, ${light.g}, ${light.b}, 0.85)`);
  rim.addColorStop(0.55, `rgba(${light.r}, ${light.g}, ${light.b}, 0)`);
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r - ctx.lineWidth * 0.4, Math.PI * 0.85, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();

  // 5. Ring - front half (over body)
  if (p.hasRing) drawRing(ctx, p, "front");

  // 6. Orbiting moon - near (lower) half drawn over the body
  if (p.moon && moonIsFront) drawMoon();
};

// Realistic ISS: central truss, solar-array wings, modules - small & oriented to travel
const drawISS = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1.9, 1.9); // overall ISS size

  // Main truss
  ctx.strokeStyle = "rgba(205, 215, 235, 0.75)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(9, 0);
  ctx.stroke();

  // Four solar-array wings (perpendicular to the truss)
  ctx.fillStyle = "rgba(70, 110, 175, 0.7)";
  for (const cx of [-7.5, -4.5, 4.5, 7.5]) {
    ctx.fillRect(cx - 1, -4, 2, 8);
  }
  // Faint array sheen
  ctx.strokeStyle = "rgba(150, 185, 230, 0.4)";
  ctx.lineWidth = 0.4;
  for (const cx of [-7.5, -4.5, 4.5, 7.5]) {
    ctx.beginPath();
    ctx.moveTo(cx, -4);
    ctx.lineTo(cx, 4);
    ctx.stroke();
  }

  // Central modules
  ctx.fillStyle = "rgba(225, 230, 240, 0.9)";
  ctx.fillRect(-3, -1.4, 6, 2.8);
  // Radiator
  ctx.fillStyle = "rgba(180, 190, 205, 0.6)";
  ctx.fillRect(-1.2, -3, 2.4, 6);

  // Specular glint
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(-1.5, -0.6, 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

// Shown when the visitor manages to click the drifting ISS
const ISS_SARCASM = [
  "Oh great, you poked a space station.",
  "Yes, hello? This is the ISS. We're kind of busy up here.",
  "Tapping the glass? Really? There are astronauts working in there.",
  "You do realize that's government property. Several governments, actually.",
  "Congratulations, you just interrupted an orbit.",
  "Mission Control would like a word with you.",
]
const ISS_FACTS = [
  "It travels at ~28,000 km/h, orbiting Earth once every ~90 minutes.",
  "It has been continuously crewed since November 2000.",
  "It is about the size of a football field and weighs ~420 tonnes.",
  "Astronauts aboard see roughly 16 sunrises and sunsets every day.",
  "It flies ~400 km up. That's a road trip's distance, straight up.",
  "At ~$150 billion, it is the most expensive object ever built.",
  "It is visible to the naked eye and is the third-brightest object in the night sky.",
]

export const AnimatedBackground = ({ children, className, isImploding = false }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 });
  const didPlayImplosionSound = useRef(false);
  const satellitePosRef = useRef<{ x: number; y: number }[]>([])
  const [issModal, setIssModal] = useState<{ sarcasm: string; fact: string } | null>(null)
  // Live position from the public wheretheiss.at API, prefetched on load and
  // refreshed on an interval so the modal can show it instantly
  const [issTelemetry, setIssTelemetry] = useState<{ alt: number; vel: number; lat: number; lon: number } | null>(null)
  const issTelemetryRef = useRef<{ alt: number; vel: number; lat: number; lon: number } | null>(null)
  const issFetchAbort = useRef<AbortController | null>(null)
  const issPausedRef = useRef(false)
  const issFactIdx = useRef(Math.floor(Math.random() * ISS_FACTS.length))
  const issSarcasmIdx = useRef(Math.floor(Math.random() * ISS_SARCASM.length))

  // 30s cadence keeps the prefetched position warm; while the modal is open
  // it tightens to 10s (with an immediate fetch) so the readout visibly drifts
  const issModalOpen = issModal !== null
  useEffect(() => {
    if (window.innerWidth < 768) return // the ISS never renders on phones
    const fetchTelemetry = () => {
      if (document.hidden) return
      issFetchAbort.current?.abort()
      const ac = new AbortController()
      issFetchAbort.current = ac
      fetch("https://api.wheretheiss.at/v1/satellites/25544", { signal: ac.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.altitude === "number") {
            const t = { alt: d.altitude, vel: d.velocity, lat: d.latitude, lon: d.longitude }
            issTelemetryRef.current = t
            // Modal already open: refresh the strip in place
            if (issPausedRef.current) setIssTelemetry(t)
          }
        })
        .catch(() => { /* offline or blocked - the modal just skips the strip */ })
    }
    fetchTelemetry()
    const id = setInterval(fetchTelemetry, issModalOpen ? 10000 : 30000)
    return () => {
      clearInterval(id)
      issFetchAbort.current?.abort()
    }
  }, [issModalOpen])

  // Easter egg: clicking the drifting ISS halts it mid-orbit and opens a modal.
  // The canvas is pointer-transparent, so hit-test window clicks by position.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (issPausedRef.current) return
      const target = e.target as Element | null
      // Ignore interactive elements, and all clicks while Defense Mode is live
      if (target?.closest("a, button, input, textarea, select, [role='button'], [data-defense-mode]")) return
      if (document.querySelector("[data-defense-mode]")) return
      for (const s of satellitePosRef.current) {
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        if (dx * dx + dy * dy <= 32 * 32) {
          issFactIdx.current = (issFactIdx.current + 1) % ISS_FACTS.length
          issSarcasmIdx.current = (issSarcasmIdx.current + 1) % ISS_SARCASM.length
          issPausedRef.current = true
          setIssModal({ sarcasm: ISS_SARCASM[issSarcasmIdx.current], fact: ISS_FACTS[issFactIdx.current] })
          // Telemetry is prefetched and kept fresh, so it appears instantly
          setIssTelemetry(issTelemetryRef.current)
          return
        }
      }
    }
    window.addEventListener("click", onClick)
    return () => window.removeEventListener("click", onClick)
  }, [])

  const closeIssModal = () => {
    setIssModal(null)
    setIssTelemetry(null)
    issPausedRef.current = false
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const backgroundCanvas = backgroundCanvasRef.current
    if (!canvas || !backgroundCanvas) return

    const ctx = canvas.getContext("2d")
    const bgCtx = backgroundCanvas.getContext("2d")
    if (!ctx || !bgCtx) return

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
    // Parallax only for real pointers: on touch, taps fire synthetic mousemove
    // jumps that make the planets snap around
    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    ctx.imageSmoothingEnabled = true
    bgCtx.imageSmoothingEnabled = true

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
    let planets: Planet[] = []
    let satellites: Satellite[] = []
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

    // NEW: Create Planets
    const createPlanets = () => {
      planets = [];
      const planetConfigs = [
        // AMBER GAS-GIANT (Inner orbit) - warm tone, distinct from the teal UI/dividers
        { color: "#f59e0b", ring: true, distMult: 0.22, size: 28, speed: 0.00015, parallax: 10, moon: true },

        // VIOLET PLANET (Outer orbit)
        // CHANGED: distMult reduced from 0.55 to 0.40.
        // This ensures it stays within the vertical bounds of a laptop screen (0.40 < 0.50).
        { color: "#8b5cf6", ring: false, distMult: 0.40, size: 45, speed: 0.0002, parallax: 40, moon: false },
      ];
      planetConfigs.forEach((cfg, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.min(canvas.width, canvas.height) * cfg.distMult;

        planets.push({
          x: 0,
          y: 0,
          radius: cfg.size,
          originalRadius: cfg.size,
          color: cfg.color,
          hasRing: cfg.ring,
          ringColor: "rgba(255, 255, 255, 0.15)", // Slightly more transparent ring
          ringAngle: Math.PI / 4,
          orbitAngle: angle,
          orbitSpeed: cfg.speed * (Math.random() > 0.5 ? 1 : -1),
          distanceFromCenter: dist,
          originalDistance: dist,
          parallaxFactor: cfg.parallax, // Store individual parallax
          moon: cfg.moon,
          moonAngle: Math.random() * Math.PI * 2,
        });
      });
    };

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

      // Generate Stars
      const starCount = Math.floor((canvas.width * canvas.height) / 2250)
      for (let i = 0; i < starCount; i++) {
        const canTwinkle = Math.random() < TWINKLE_CHANCE
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 1.5 + 0.5;

        const star: Star = {
          x, y, originalX: x, originalY: y, size,
          brightness: 0.4 + Math.random() * 0.5,
          color: getStarColor(),
          canTwinkle,
          twinklePhase: canTwinkle ? Math.random() * Math.PI * 2 : 0,
          twinkleSpeed: canTwinkle ? 0.01 + Math.random() * 0.02 : 0,
          parallaxFactor: size * 15,
          vx: 0, vy: 0
        }
        stars.push(star)
        if (canTwinkle) potentialTwinklers.push(star)
      }

      // Generate Planets
      createPlanets();
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

    // Occasional artificial satellite drifting slowly across the sky (desktop
    // only: too small to spot or tap on phones)
    const createSatellite = () => {
      if (isImploding) return
      if (window.innerWidth < 768) return
      if (satellites.filter((s) => s.active).length >= 1) return
      const fromLeft = Math.random() < 0.5
      const startX = fromLeft ? -20 : canvas.width + 20
      const startY = canvas.height * 0.05 + Math.random() * canvas.height * 0.55
      const speed = 0.4 + Math.random() * 0.35
      const vx = (fromLeft ? 1 : -1) * speed
      const vy = (Math.random() - 0.5) * 0.2
      satellites.push({
        x: startX,
        y: startY,
        vx,
        vy,
        life: 0,
        maxLife: (canvas.width + 80) / Math.abs(vx),
        blink: Math.random() * Math.PI * 2,
        active: true,
      })
    }

    // --- Animation Logic ---
    let animationFrame: number
    let shootingStarTimer = 0
    let shootingStarInterval = SHOOTING_STAR_INTERVAL_MIN + Math.random() * (SHOOTING_STAR_INTERVAL_MAX - SHOOTING_STAR_INTERVAL_MIN)
    let satelliteTimer = 0
    let satelliteInterval = 1500 + Math.random() * 2500
    let twinkleIntervalHandle: number
    let implosionFrame = 0;

    const drawSpace = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (isImploding) {
        bgCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
      } else {
        bgCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height)
      }

      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha = 1

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 1. Draw Planets (Behind Stars)
      planets.forEach(planet => {
        if (!isImploding) {
          planet.orbitAngle += planet.orbitSpeed;
          if (planet.moon) planet.moonAngle = (planet.moonAngle ?? 0) + 0.012;
        } else {
          // SUCK IN LOGIC
          planet.distanceFromCenter *= 0.96;
          planet.orbitAngle += 0.05;
          planet.radius *= 0.95;
        }

        // Calculate Position with INDIVIDUAL PARALLAX
        const offsetX = mouseRef.current.x * planet.parallaxFactor;
        const offsetY = mouseRef.current.y * planet.parallaxFactor;

        planet.x = centerX + Math.cos(planet.orbitAngle) * planet.distanceFromCenter + offsetX;
        planet.y = centerY + Math.sin(planet.orbitAngle) * planet.distanceFromCenter + offsetY;

        // Draw the planet (shaded body, cloud bands, ring system)
        drawPlanet(bgCtx, planet);
      });

      // 2. Draw Stars
      stars.forEach((star) => {
        let x = star.originalX;
        let y = star.originalY;

        if (isImploding) {
          implosionFrame += 0.0001;
          const dx = centerX - star.x;
          const dy = centerY - star.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const ndx = dx / distance;
          const ndy = dy / distance;
          const tx = -ndy;
          const ty = ndx;
          const pullStrength = 500 / (distance + 10);
          const speed = (1 + implosionFrame) * pullStrength;

          if (star.vx === undefined) star.vx = 0;
          if (star.vy === undefined) star.vy = 0;

          star.vx += (ndx * speed * 0.5) + (tx * speed * 0.2);
          star.vy += (ndy * speed * 0.5) + (ty * speed * 0.2);
          star.vx *= 0.95;
          star.vy *= 0.95;
          star.x += star.vx;
          star.y += star.vy;
          x = star.x;
          y = star.y;

          if (distance < 5) star.brightness = 0;

          const velocity = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
          const { r, g, b } = star.color;
          bgCtx.lineWidth = star.size * (1 + velocity * 0.1);
          bgCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness})`;
          bgCtx.beginPath();
          bgCtx.moveTo(x, y);
          bgCtx.lineTo(x - star.vx * 2, y - star.vy * 2);
          bgCtx.stroke();

        } else {
          // Parallax
          const offsetX = mouseRef.current.x * star.parallaxFactor;
          const offsetY = mouseRef.current.y * star.parallaxFactor;
          x = star.originalX + offsetX;
          y = star.originalY + offsetY;
          star.x = x; star.y = y;

          if (!activeTwinklers.includes(star)) {
            const { r, g, b } = star.color
            bgCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness * 0.8})`
            bgCtx.beginPath()
            bgCtx.arc(x, y, star.size, 0, Math.PI * 2)
            bgCtx.fill()
          }
        }
      });

      // 3. Twinkling (Only in Normal Mode)
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

      // 4. Draw Shooting Stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i]

        if (isImploding) {
          const dx = centerX - ss.x;
          const dy = centerY - ss.y;
          ss.x += (dx * 0.05);
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

      if (!isImploding) {
        shootingStarTimer += 1;
        if (shootingStarTimer > shootingStarInterval) {
          createShootingStar()
          shootingStarTimer = 0
          shootingStarInterval = SHOOTING_STAR_INTERVAL_MIN + Math.random() * (SHOOTING_STAR_INTERVAL_MAX - SHOOTING_STAR_INTERVAL_MIN)
        }
      }

      // 5. ISS - drifts slowly and steadily across the sky, no trail
      if (!isImploding) {
        satelliteTimer += 1;
        if (satelliteTimer > satelliteInterval) {
          createSatellite()
          satelliteTimer = 0
          satelliteInterval = 1500 + Math.random() * 2500
        }
      }
      for (let i = satellites.length - 1; i >= 0; i--) {
        const sat = satellites[i]
        // Hold position (and lifetime) while someone is bothering the crew
        if (!issPausedRef.current) {
          sat.x += sat.vx
          sat.y += sat.vy
          sat.life++
        }
        drawISS(ctx, sat.x, sat.y, Math.atan2(sat.vy, sat.vx))
        if (sat.life > sat.maxLife) satellites.splice(i, 1)
      }
      satellitePosRef.current = satellites.map((s) => ({ x: s.x, y: s.y }))

      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0
      animationFrame = requestAnimationFrame(drawSpace)
    }

    const manageTwinkling = () => {
      if (isImploding) return;
      if (activeTwinklers.length >= MAX_ACTIVE_TWINKLERS || potentialTwinklers.length === 0) return
      const starToActivate = potentialTwinklers[Math.floor(Math.random() * potentialTwinklers.length)]
      if (!activeTwinklers.includes(starToActivate)) {
        activeTwinklers.push(starToActivate)
      }
    }

    // Pause the twinkle timer while the tab is hidden (rAF already auto-pauses)
    const handleVisibility = () => {
      if (document.hidden) {
        if (twinkleIntervalHandle) clearInterval(twinkleIntervalHandle)
      } else {
        twinkleIntervalHandle = window.setInterval(manageTwinkling, TWINKLE_INTERVAL)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    resizeCanvas()
    drawSpace()
    twinkleIntervalHandle = window.setInterval(manageTwinkling, TWINKLE_INTERVAL)
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("visibilitychange", handleVisibility)
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (twinkleIntervalHandle) clearInterval(twinkleIntervalHandle)
    }
  }, [isImploding])

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

      {/* ISS interruption modal (the station holds position while it's open) */}
      <AnimatePresence>
        {issModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9100] flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeIssModal} />
            <motion.div
              initial={{ scale: 0.92, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 14, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-teal-500/30 bg-neutral-950/95 p-6 shadow-[0_0_40px_rgba(45,212,191,0.2)]"
            >
              <button
                onClick={closeIssModal}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal-400/80">incoming transmission</p>
              <p className="mt-3 text-base font-medium leading-snug text-white">{issModal.sarcasm}</p>
              {issTelemetry && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mt-3 rounded-md border border-teal-500/20 bg-teal-500/5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-teal-300/90"
                >
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400 align-middle motion-reduce:animate-none" />
                  live telemetry &middot; alt {Math.round(issTelemetry.alt)} km &middot;{" "}
                  {Math.round(issTelemetry.vel).toLocaleString()} km/h &middot;{" "}
                  {describeLocation(issTelemetry.lat, issTelemetry.lon)}
                </motion.p>
              )}
              <p className="mt-4 text-xs uppercase tracking-wider text-neutral-500">Here&apos;s a random fact about the ISS</p>
              <p className="mt-1.5 text-sm leading-relaxed text-teal-100">{issModal.fact}</p>
              <button
                onClick={closeIssModal}
                className="mt-5 w-full rounded-full border border-teal-500/40 bg-teal-500/15 px-5 py-2 text-sm font-medium text-teal-200 transition-colors hover:bg-teal-500/25"
              >
                Resume orbit
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}