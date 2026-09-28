"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { describeLocation } from "@/lib/locate"
import { skyPalette } from "@/lib/sky"
import { renderSunDisc } from "@/lib/sun-disc"
import { createSolarSystem } from "@/lib/solar-system"
import { nextFact } from "@/lib/space-facts"
import { subscribeIss } from "@/lib/iss"

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
  comet?: boolean; // the once-a-session night-owl special: bigger, slower, longer tail
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
  /** How much taller than wide the orbit is: 1 is a circle; tall phone screens stretch it */
  orbitSquash: number;
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
// Pull a colour toward the sky's key light (lib/sky.ts): gold around dawn and
// dusk, cool blue-white at night, neutral by day
const mixRgb = (
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
) => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t),
});

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

const drawPlanet = (
  ctx: CanvasRenderingContext2D,
  p: Planet,
  // Colour of the light on the lit limb and specular; white when not given
  key?: { r: number; g: number; b: number },
  // Where the light comes from on the screen (the background's Sun, by day);
  // upper-left when not given
  from?: { x: number; y: number },
) => {
  const r = p.radius;
  if (r <= 0.5) return;

  const base = hexToRgb(p.color);
  const light = key ? mixRgb(shadeRgb(base, 0.55), key, 0.5) : shadeRgb(base, 0.55);
  const dark = shadeRgb(base, -0.62);
  // the direction toward the light, as a unit vector (upper-left by default)
  const fd = from ? Math.hypot(from.x - p.x, from.y - p.y) || 1 : 0;
  const ux = from ? (from.x - p.x) / fd : -Math.SQRT1_2;
  const uy = from ? (from.y - p.y) / fd : -Math.SQRT1_2;
  const lx = p.x + ux * r * 0.566; // light source
  const ly = p.y + uy * r * 0.566;

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
  const term = ctx.createRadialGradient(lx, ly, r * 0.2, p.x - ux * r * 0.495, p.y - uy * r * 0.495, r * 1.45);
  term.addColorStop(0, "rgba(0, 0, 0, 0)");
  term.addColorStop(0.65, "rgba(0, 0, 0, 0)");
  term.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = term;
  ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);

  // Specular sheen near the light source
  const spec = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.75);
  spec.addColorStop(0, key ? `rgba(${key.r}, ${key.g}, ${key.b}, 0.45)` : "rgba(255, 255, 255, 0.4)");
  spec.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(lx, ly, r * 0.75, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // unclip

  // 4. Rim light along the lit limb
  ctx.save();
  ctx.lineWidth = Math.max(1, r * 0.05);
  const rim = ctx.createLinearGradient(p.x + ux * r * 1.414, p.y + uy * r * 1.414, p.x - ux * r * 1.414, p.y - uy * r * 1.414);
  rim.addColorStop(0, `rgba(${light.r}, ${light.g}, ${light.b}, 0.85)`);
  rim.addColorStop(0.55, `rgba(${light.r}, ${light.g}, ${light.b}, 0)`);
  ctx.strokeStyle = rim;
  ctx.beginPath();
  // (the lit limb, centred on the light's side: 0.85 to 1.95 pi for upper-left)
  const rimAt = from ? Math.atan2(uy, ux) + Math.PI * 0.15 : Math.PI * 1.4;
  ctx.arc(p.x, p.y, r - ctx.lineWidth * 0.4, rimAt - Math.PI * 0.55, rimAt + Math.PI * 0.55);
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

/** A day as the date picker writes it (YYYY-MM-DD, in the visitor's own time zone): today, unless given one. */
const todayIso = (d = new Date()) => `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const AnimatedBackground = ({ children, className, isImploding = false }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)
  // The still stars, on a layer of their own between the planets and the
  // twinkles: redrawn only when they move (the parallax), a twinkle starts, or
  // the window resizes, not every frame with the orbiting planets
  const starsCanvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 });
  const didPlayImplosionSound = useRef(false);
  const satellitePosRef = useRef<{ x: number; y: number }[]>([])
  const [issModal, setIssModal] = useState<{ sarcasm: string; fact: string } | null>(null)
  // Live position from the public wheretheiss.at API, prefetched on load and
  // refreshed on an interval so the modal can show it instantly
  const [issTelemetry, setIssTelemetry] = useState<{ alt: number; vel: number; lat: number; lon: number } | null>(null)
  const issTelemetryRef = useRef<{ alt: number; vel: number; lat: number; lon: number } | null>(null)
  const issPausedRef = useRef(false)
  const issFactIdx = useRef(Math.floor(Math.random() * ISS_FACTS.length))
  const issSarcasmIdx = useRef(Math.floor(Math.random() * ISS_SARCASM.length))
  // The solar system, for clicks on the Sun, a planet or the Moon: a fact each time, none repeated in turn
  const solarRef = useRef<ReturnType<typeof createSolarSystem> | null>(null)
  const [bodyModal, setBodyModal] = useState<{ name: string; detail: string | null; fact: string } | null>(null)

  // 30s cadence keeps the prefetched position warm; while the modal is open
  // it tightens to 10s (with an immediate fetch) so the readout visibly drifts
  const issModalOpen = issModal !== null
  // One shared poll with the contact globe (lib/iss.ts); offline or blocked,
  // the modal just skips the strip
  useEffect(() => {
    if (window.innerWidth < 768) return // the ISS never renders on phones
    return subscribeIss(issModalOpen ? 10000 : 30000, (d) => {
      if (typeof d.altitude !== "number") return
      const t = { alt: d.altitude, vel: d.velocity, lat: d.latitude, lon: d.longitude }
      issTelemetryRef.current = t
      // Modal already open: refresh the strip in place
      if (issPausedRef.current) setIssTelemetry(t)
    })
  }, [issModalOpen])

  // Easter egg: clicking the drifting ISS halts it mid-orbit and opens a modal.
  // The canvas is pointer-transparent, so hit-test window clicks by position.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (issPausedRef.current || skyDraggedRef.current) return
      const target = e.target as Element | null
      // Ignore interactive elements, the hero, and all clicks while Defense Mode is live
      if (target?.closest("a, button, input, textarea, select, [role='button'], [data-defense-mode], [data-hero]")) return
      if (document.querySelector("[data-defense-mode]")) return
      for (const s of satellitePosRef.current) {
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        // (close to it, now it circles the Earth; and the Moon or the Earth takes a click
        // nearer to it than to the ISS, for its fact)
        const body = solarRef.current?.hitTest(e.clientX, e.clientY)
        if (body && body.name !== "Sun" && (body.dist ?? Infinity) < Math.hypot(dx, dy)) continue
        if (dx * dx + dy * dy <= 16 * 16) {
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
    // Hailed from the command palette: the same transmission, no aiming needed
    const onHail = () => {
      if (issPausedRef.current) return
      issFactIdx.current = (issFactIdx.current + 1) % ISS_FACTS.length
      issSarcasmIdx.current = (issSarcasmIdx.current + 1) % ISS_SARCASM.length
      issPausedRef.current = true
      setIssModal({ sarcasm: ISS_SARCASM[issSarcasmIdx.current], fact: ISS_FACTS[issFactIdx.current] })
      setIssTelemetry(issTelemetryRef.current)
    }
    window.addEventListener("click", onClick)
    window.addEventListener("iss-hail", onHail)
    return () => {
      window.removeEventListener("click", onClick)
      window.removeEventListener("iss-hail", onHail)
    }
  }, [])

  // Clicking the Sun, a planet or the Moon: a fact about it (after the ISS's own
  // handler, registered first, has had its chance at the click)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // (a drag across the zoomed view isn't a click)
      if (skyDraggedRef.current) {
        skyDraggedRef.current = false
        return
      }
      if (issPausedRef.current || bodyModalRef.current) return
      const target = e.target as Element | null
      if (target?.closest("a, button, input, textarea, select, label, img, svg, p, h1, h2, h3, h4, h5, h6, li, [role='button'], [role='dialog'], [data-defense-mode], [data-hero]")) return
      if (document.querySelector("[data-defense-mode]")) return
      const hit = solarRef.current?.hitTest(e.clientX, e.clientY)
      if (!hit) return
      setBodyModal({ ...hit, fact: nextFact(hit.name) })
    }
    window.addEventListener("click", onClick)
    return () => window.removeEventListener("click", onClick)
  }, [])
  const bodyModalRef = useRef(false)
  bodyModalRef.current = bodyModal !== null

  // The solar system view: the page fades away and the whole solar system opens out
  // round the Sun in the middle (the button on the left edge, or the command menu's
  // "solar-system-view" event); Escape or "Back to the page" returns
  const [skyView, setSkyView] = useState(false)
  const skyViewRef = useRef(false)
  // a drag just ended (panning the zoomed view), so its click opens nothing
  const skyDraggedRef = useRef(false)
  const [skyZoom, setSkyZoom] = useState({ z: 1, follow: false })
  skyViewRef.current = skyView
  useEffect(() => {
    const onToggle = () => setSkyView((v) => !v)
    window.addEventListener("solar-system-view", onToggle)
    return () => window.removeEventListener("solar-system-view", onToggle)
  }, [])
  useEffect(() => {
    if (!skyView) return
    // (the page underneath doesn't scroll meanwhile; Escape closes a fact first, then the view)
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = "hidden"
    html.dataset.solarView = "1"
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || bodyModalRef.current || issPausedRef.current) return
      setSkyView(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      html.style.overflow = was
      delete html.dataset.solarView
      window.removeEventListener("keydown", onKey)
    }
  }, [skyView])
  useEffect(() => {
    if (isImploding) setSkyView(false)
  }, [isImploding])
  // zooming and panning the view: the wheel (or a trackpad's pinch), a pinch on a phone,
  // dragging, and + − 0 on the keyboard
  useEffect(() => {
    if (!skyView) return
    const solar = () => solarRef.current
    const onUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("a, button, input, [role='dialog']")
    const onWheel = (e: WheelEvent) => {
      if (onUi(e.target) || document.querySelector("[role='dialog']")) return
      e.preventDefault()
      solar()?.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
    }
    let drag: { x: number; y: number; moved: number; id: number } | null = null
    const onDown = (e: PointerEvent) => {
      if (onUi(e.target) || !e.isPrimary) return
      drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id || pinch) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.moved += Math.abs(dx) + Math.abs(dy)
      drag.x = e.clientX
      drag.y = e.clientY
      if (drag.moved > 5) solar()?.panBy(dx, dy)
    }
    const onUp = () => {
      if (drag && drag.moved > 5 && (solar()?.zoomNow().z ?? 1) > 1) skyDraggedRef.current = true
      drag = null
      window.setTimeout(() => (skyDraggedRef.current = false), 0)
    }
    let pinch: { d: number } | null = null
    const spread = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch = { d: spread(e.touches) }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return
      e.preventDefault()
      const d = spread(e.touches)
      solar()?.zoomAt((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2, d / pinch.d)
      pinch.d = d
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null
    }
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[role='dialog']")) return
      const w = window.innerWidth / 2
      const h = window.innerHeight / 2
      if (e.key === "+" || e.key === "=") solar()?.zoomAt(w, h, 1.5)
      else if (e.key === "-" || e.key === "_") solar()?.zoomAt(w, h, 1 / 1.5)
      else if (e.key === "0") solar()?.zoomTo("whole")
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("keydown", onKey)
    }
  }, [skyView])
  // time in the view: real time, or back in the past (a reverse time-lapse); read a few times a second for the clock
  const [skyTime, setSkyTime] = useState<{ date: Date; now: boolean; rate: number; toNow: boolean } | null>(null)
  // the date picker follows the date shown, except while it's being used (so typing isn't undone)
  const datePickRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = datePickRef.current
    if (!el || !skyTime || document.activeElement === el) return
    const iso = todayIso(skyTime.date)
    if (el.value !== iso) el.value = iso
  }, [skyTime])
  useEffect(() => {
    const solar = solarRef.current
    if (!skyView) {
      // (leaving: back to now, replayed forward as the Sun goes home)
      solar?.toNow()
      return
    }
    solar?.timeLapse(0)
    const read = () => {
      if (!solarRef.current) return
      setSkyTime(solarRef.current.simNow())
      const z = solarRef.current.zoomNow()
      setSkyZoom((o) => (o.z === z.z && o.follow === z.follow ? o : z))
    }
    read()
    const id = window.setInterval(read, 100)
    return () => window.clearInterval(id)
  }, [skyView])
  useEffect(() => {
    if (!bodyModal) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBodyModal(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [bodyModal])

  const closeIssModal = () => {
    setIssModal(null)
    setIssTelemetry(null)
    issPausedRef.current = false
  }

  // Escape closes the transmission too
  useEffect(() => {
    if (!issModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setIssModal(null)
      setIssTelemetry(null)
      issPausedRef.current = false
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [issModalOpen])

  useEffect(() => {
    const canvas = canvasRef.current
    const backgroundCanvas = backgroundCanvasRef.current
    const starsCanvas = starsCanvasRef.current
    if (!canvas || !backgroundCanvas || !starsCanvas) return

    const ctx = canvas.getContext("2d")
    const bgCtx = backgroundCanvas.getContext("2d")
    const sCtx = starsCanvas.getContext("2d")
    if (!ctx || !bgCtx || !sCtx) return
    // The still stars need drawing again (resize, a twinkle starting); and
    // where the pointer was when they were last drawn
    let starsDirty = true
    let starsAt = { x: NaN, y: NaN }

    if (isImploding && !didPlayImplosionSound.current) {
      playBlackHoleSound();
      didPlayImplosionSound.current = true;
    }

    // (over the hero, the solar system's names and readouts don't answer the pointer)
    let overHero = false
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5
      };
      overHero = !!(e.target as Element | null)?.closest?.("[data-hero]")
    };
    // Parallax only for real pointers: on touch, taps fire synthetic mousemove
    // jumps that make the planets snap around
    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    // (and on a scroll, the hero may have moved out from under a still pointer, or in)
    const handleHeroScroll = () => {
      const b = document.querySelector("[data-hero]")?.getBoundingClientRect()
      const py = (mouseRef.current.y + 0.5) * window.innerHeight
      overHero = !!b && py >= b.top && py <= b.bottom
    }
    window.addEventListener("scroll", handleHeroScroll, { passive: true })

    ctx.imageSmoothingEnabled = true
    bgCtx.imageSmoothingEnabled = true
    sCtx.imageSmoothingEnabled = true

    // --- Configuration ---
    const MAX_ACTIVE_TWINKLERS = 15
    const TWINKLE_INTERVAL = 250
    const TWINKLE_CHANCE = 0.1
    const MIN_TWINKLE_BRIGHTNESS = 0.5
    const MAX_SHOOTING_STARS = 3
    const SHOOTING_STAR_INTERVAL_MIN = 2000
    const SHOOTING_STAR_INTERVAL_MAX = 3500

    // --- Time-of-day sky: the visitor's local clock tunes the heavens ---
    // Night gets denser, brighter stars; day washes them out a little and
    // adds a thin atmosphere along the top edge; dawn/dusk warm that band.
    // Preview any state with ?sky=<0-23> in the URL (e.g. /?sky=2)
    const skyParam = new URLSearchParams(window.location.search).get("sky")
    const skyOverride = skyParam !== null && !Number.isNaN(Number(skyParam))
    const hour = skyOverride ? ((Number(skyParam) % 24) + 24) % 24 : new Date().getHours()
    const isNight = hour >= 20 || hour < 5
    const isDay = hour >= 7 && hour < 17
    const AREA_PER_STAR = isNight ? 1800 : isDay ? 2800 : 2250
    const STAR_BASE_BRIGHTNESS = isNight ? 0.5 : isDay ? 0.3 : 0.4
    // The planets' key light follows the same hour (gold around dawn and dusk,
    // cool at night); the hero nebula reads the same table in lib/sky.ts
    const keyLight = skyPalette(hour).keyLight

    // The Sun: a big half-disc on the left edge, off to the side of the
    // page's content, the centre of the solar system round it (lib/solar-system.ts:
    // the planets where they really are today, each spinning). Always there,
    // so it no longer rises and sets; the time of day shows in the sky's
    // colours. (sunPhase stays for reference: 0 at 6 am to 1 at 6 pm.)
    // Where it is along its day, 0 at sunrise to 1 at sunset
    const sunPhase = () => {
      const d = new Date()
      const h = skyOverride ? hour + 0.5 : d.getHours() + d.getMinutes() / 60
      return (h - 6) / 12
    }
    // its disc, drawn once, the first time it's up (granulation, limb darkening; lib/sun-disc.ts), then scaled
    let sunDisc: HTMLCanvasElement | null = null
    void sunPhase
    const sunLeft = (w: number, h: number) => {
      const r = Math.min(h * 0.42, w * 0.34)
      return {
        r,
        // half off the left edge (more so on a narrow screen), halfway down
        x: (w < 768 ? -r * 0.45 : -r * 0.08) + mouseRef.current.x * 8,
        y: h * 0.5 + mouseRef.current.y * 8,
        low: 0,
      }
    }
    // in the solar system view: smaller, in the middle of the screen
    const sunCentre = (w: number, h: number) => ({
      r: Math.max(34, Math.min(w * 0.085, h * 0.16)),
      x: w * 0.5 + mouseRef.current.x * 8,
      y: h * 0.5 + mouseRef.current.y * 8,
      low: 0,
    })
    // how far into the view (0 to 1, eased), stepped along each frame toward the button's choice
    let skyP = skyViewRef.current ? 1 : 0
    let skyE = skyP
    let skyLast = performance.now()
    const stepSky = () => {
      const now = performance.now()
      const goal = skyViewRef.current ? 1 : 0
      skyP += Math.sign(goal - skyP) * Math.min(Math.abs(goal - skyP), (now - skyLast) / 1400)
      skyLast = now
      skyE = skyP * skyP * (3 - 2 * skyP)
    }
    const sunAt = (w: number, h: number) => {
      const a = sunLeft(w, h)
      if (skyE <= 0) return a
      const b = sunCentre(w, h)
      return { r: a.r + (b.r - a.r) * skyE, x: a.x + (b.x - a.x) * skyE, y: a.y + (b.y - a.y) * skyE, low: 0 }
    }
    const solar = createSolarSystem()
    solarRef.current = solar
    // the page's text its labels should keep off (marked data-sky-avoid), a few times a second as it scrolls
    const keepClear = () =>
      solar.keepClear(
        // (in the solar system view, the page is hidden: its own words instead)
        [...document.querySelectorAll<HTMLElement>(skyViewRef.current ? "[data-sky-view-avoid]" : "[data-sky-avoid]")]
          .map((el) => {
            // (the text itself, not the whole width of its box)
            const r = document.createRange()
            r.selectNodeContents(el)
            return r.getBoundingClientRect()
          })
          .filter((b) => b.width > 0 && b.bottom > 0 && b.top < window.innerHeight)
          .map((b) => ({ x: b.left - 6, y: b.top - 4, w: b.width + 12, h: b.height + 8 })),
      )
    keepClear()
    const keepClearTimer = window.setInterval(keepClear, 250)
    let implode = 1
    let lastSun = sunAt(window.innerWidth, window.innerHeight)
    const drawSun = (c: CanvasRenderingContext2D, s: { x: number; y: number; r: number; low: number }) => {
      const { x, y, r, low } = s
      c.save()
      // the corona: a wide, soft glow
      c.globalCompositeOperation = "lighter"
      const glow = c.createRadialGradient(x, y, r * 0.95, x, y, r * 2.3)
      glow.addColorStop(0, `rgba(255, ${Math.round(160 - 50 * low)}, ${Math.round(60 - 40 * low)}, 0.38)`)
      glow.addColorStop(0.3, `rgba(255, ${Math.round(120 - 40 * low)}, 30, 0.12)`)
      glow.addColorStop(1, "rgba(255, 100, 30, 0)")
      c.fillStyle = glow
      c.beginPath()
      c.arc(x, y, r * 2.3, 0, Math.PI * 2)
      c.fill()
      // the disc itself, a little dimmed so it sits in the sky rather than blazing
      c.globalCompositeOperation = "source-over"
      // (opaque, so the planets behind it are hidden)
      c.globalAlpha = 1
      sunDisc ??= renderSunDisc(768, "fire")
      if (skyE < 1) c.drawImage(sunDisc, x - r, y - r, r * 2, r * 2)
      // in the solar system view, its real map, turning (faded in over the drawn one as it arrives)
      // (painted at its size in the view, or finer when zoomed in, in steps, so not at every size)
      const base = sunCentre(c.canvas.width, c.canvas.height).r
      if (skyE > 0) solar.drawSun(c, x, y, r, performance.now(), skyE, r > base * 1.05 ? Math.min(360, Math.ceil(r / 40) * 40) : base)
      // and a bright rim of light just inside the limb, where it glows
      c.globalCompositeOperation = "lighter"
      c.globalAlpha = 1
      const rim = c.createRadialGradient(x, y, r * 0.86, x, y, r * 1.02)
      rim.addColorStop(0, "rgba(255, 150, 50, 0)")
      rim.addColorStop(0.85, "rgba(255, 170, 70, 0.16)")
      rim.addColorStop(1, "rgba(255, 150, 50, 0)")
      c.fillStyle = rim
      c.beginPath()
      c.arc(x, y, r * 1.02, 0, Math.PI * 2)
      c.fill()
      c.globalCompositeOperation = "source-over"
      // redder when low
      if (low > 0.05) {
        c.globalCompositeOperation = "multiply"
        c.globalAlpha = 0.5 * low
        c.fillStyle = "rgb(255, 120, 60)"
        c.beginPath()
        c.arc(x, y, r, 0, Math.PI * 2)
        c.fill()
      }
      c.restore()
    }

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
      // (the two made-up planets that were here are replaced by the real
      // solar system round the Sun, lib/solar-system.ts)
      const planetConfigs: { color: string; ring: boolean; distMult: number; size: number; speed: number; parallax: number; moon: boolean }[] = [];
      // On phones the two orbits, sized to the narrow side, are closer together
      // than the planets are wide: there the orbits stretch into the screen's
      // height, and the planets keep to opposite sides, circling together, so
      // they never pass over each other. Wider screens are as they were
      const narrow = canvas.width < 768;
      const squash = narrow && canvas.height > canvas.width ? Math.min(1.8, canvas.height / canvas.width) : 1;
      const firstAngle = Math.random() * Math.PI * 2;
      const firstSpeed = (planetConfigs[0]?.speed ?? 0) * (Math.random() > 0.5 ? 1 : -1);
      planetConfigs.forEach((cfg, i) => {
        const angle = narrow ? firstAngle + i * Math.PI : Math.random() * Math.PI * 2;
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
          orbitSpeed: narrow ? firstSpeed : cfg.speed * (Math.random() > 0.5 ? 1 : -1),
          distanceFromCenter: dist,
          orbitSquash: squash,
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
      starsCanvas.width = newWidth;
      starsCanvas.height = newHeight;
      starsDirty = true;

      stars = []
      potentialTwinklers = []
      activeTwinklers = []
      twinkling.clear()

      // Generate Stars
      const starCount = Math.floor((canvas.width * canvas.height) / AREA_PER_STAR)
      for (let i = 0; i < starCount; i++) {
        const canTwinkle = Math.random() < TWINKLE_CHANCE
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 1.5 + 0.5;

        const star: Star = {
          x, y, originalX: x, originalY: y, size,
          brightness: STAR_BASE_BRIGHTNESS + Math.random() * 0.5,
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

    // A single grand comet for the night owls, once per session - slower and
    // far bigger than a shooting star, crossing high in the sky
    const createComet = () => {
      if (isImploding) return
      const fromLeft = Math.random() < 0.5
      const vx = (fromLeft ? 1 : -1) * (0.9 + Math.random() * 0.3)
      const maxLife = Math.ceil((canvas.width + 160) / Math.abs(vx)) + 80
      shootingStars.push({
        x: fromLeft ? -80 : canvas.width + 80,
        y: canvas.height * (0.1 + Math.random() * 0.2),
        vx,
        vy: 0.15 + Math.random() * 0.1,
        brightness: 1.2,
        life: 0,
        maxLife,
        fadeOutStart: maxLife * 0.85,
        trail: [],
        active: true,
        color: { r: 175, g: 240, b: 255 },
        size: 3.4,
        distance: "near",
        comet: true,
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

    // Which stars are twinkling now (a set, for the star loop's lookups)
    const twinkling = new Set<Star>()

    // --- Animation Logic ---
    let animationFrame: number
    let shootingStarTimer = 0
    let shootingStarInterval = SHOOTING_STAR_INTERVAL_MIN + Math.random() * (SHOOTING_STAR_INTERVAL_MAX - SHOOTING_STAR_INTERVAL_MIN)
    const ROAMING_ISS = false
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

      // Thin atmosphere along the top edge during the visitor's daylight
      // hours; dawn and dusk get a warmer band instead
      if (!isImploding && !isNight) {
        const atmoHeight = canvas.height * 0.22
        const atmo = bgCtx.createLinearGradient(0, 0, 0, atmoHeight)
        if (isDay) {
          atmo.addColorStop(0, "rgba(105, 155, 222, 0.10)")
          atmo.addColorStop(1, "rgba(105, 155, 222, 0)")
        } else {
          atmo.addColorStop(0, "rgba(240, 150, 90, 0.09)")
          atmo.addColorStop(1, "rgba(168, 100, 140, 0)")
        }
        bgCtx.fillStyle = atmo
        bgCtx.fillRect(0, 0, canvas.width, atmoHeight)
      }

      // 0. The Sun, by day (behind the planets)
      stepSky()
      const sunNow = isImploding ? null : sunAt(canvas.width, canvas.height)
      if (sunNow) lastSun = sunNow
      // the solar system round it: the far side, then the Sun, then the near side
      implode = isImploding ? implode * 0.96 : 1
      // (the Sun where the view's camera puts it, zoomed in)
      const sunSeen = solar.layout(canvas.width, canvas.height, lastSun, mouseRef.current, implode, { e: skyE, left: sunLeft(canvas.width, canvas.height), centre: sunCentre(canvas.width, canvas.height) })
      const tNow = performance.now()
      solar.drawBack(bgCtx, tNow)
      if (sunNow) drawSun(bgCtx, { ...sunNow, x: sunSeen.x, y: sunSeen.y, r: sunSeen.r })
      const fine = mouseRef.current.x !== 0 || mouseRef.current.y !== 0
      solar.drawFront(bgCtx, tNow, fine && !isImploding && !overHero ? { x: (mouseRef.current.x + 0.5) * canvas.width, y: (mouseRef.current.y + 0.5) * canvas.height } : null)

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
        planet.y = centerY + Math.sin(planet.orbitAngle) * planet.distanceFromCenter * planet.orbitSquash + offsetY;

        // Draw the planet (shaded body, cloud bands, ring system)
        drawPlanet(bgCtx, planet, keyLight, sunNow ?? undefined);
      });

      // 2. Draw Stars. Normally on their own layer, and only when they have
      // moved or a twinkle has taken one away; in the implosion, on the
      // background with its trails, as before
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const redrawStill = !isImploding && (starsDirty || mx !== starsAt.x || my !== starsAt.y);
      if (redrawStill) {
        sCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
        starsDirty = false;
        starsAt = { x: mx, y: my };
      }
      if (isImploding || redrawStill) stars.forEach((star) => {
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

          if (!twinkling.has(star)) {
            const { r, g, b } = star.color
            sCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness * 0.8})`
            sCtx.beginPath()
            sCtx.arc(x, y, star.size, 0, Math.PI * 2)
            sCtx.fill()
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
            twinkling.delete(star)
            // back among the still stars, drawn there this same frame
            const { r, g, b } = star.color
            sCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.brightness * 0.8})`
            sCtx.beginPath();
            sCtx.arc(star.originalX + offsetX, star.originalY + offsetY, star.size, 0, Math.PI * 2);
            sCtx.fill()
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
        const maxTrailLength = ss.comet ? 150 : ss.distance === "near" ? 80 : ss.distance === "medium" ? 60 : 40
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
          ctx.shadowBlur = ss.comet ? 14 : 4; ctx.fillStyle = `rgba(${ss.color.r}, ${ss.color.g}, ${ss.color.b}, ${headBrightness})`
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

      // 5. ISS - drifted slowly across the sky. No longer launched: beside a
      // real solar system a tiny ISS crossing a Sun-sized disc made no sense
      // of scale, so the ISS now circles the Earth in it (lib/solar-system.ts,
      // with where it really is on hover). The drift and its telemetry card
      // are left in place, idle.
      if (!isImploding && ROAMING_ISS) {
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
      // the ISS clicked for its telemetry pop-up is now the one circling the
      // Earth in the solar system (held still while the pop-up is open)
      solar.setIssPaused(issPausedRef.current)
      const issDot = solar.issAt()
      satellitePosRef.current = ROAMING_ISS ? satellites.map((s) => ({ x: s.x, y: s.y })) : issDot ? [issDot] : []

      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0
      animationFrame = requestAnimationFrame(drawSpace)
    }

    const manageTwinkling = () => {
      if (isImploding) return;
      if (activeTwinklers.length >= MAX_ACTIVE_TWINKLERS || potentialTwinklers.length === 0) return
      const starToActivate = potentialTwinklers[Math.floor(Math.random() * potentialTwinklers.length)]
      if (!twinkling.has(starToActivate)) {
        activeTwinklers.push(starToActivate)
        twinkling.add(starToActivate)
        // it leaves the still layer, which is drawn again without it
        starsDirty = true
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

    // The deep-night reward: visitors between 1 and 5 AM get one comet,
    // shortly after settling in, once per session
    // The ?sky= override skips the once-per-session guard (and the wait) so
    // the comet can be previewed repeatedly
    let cometTimeout: number | undefined
    if (hour >= 1 && hour < 5 && !isImploding && (skyOverride || !sessionStorage.getItem("nightCometShown"))) {
      cometTimeout = window.setTimeout(() => {
        if (!skyOverride) sessionStorage.setItem("nightCometShown", "true")
        createComet()
      }, skyOverride ? 4000 : 9000 + Math.random() * 9000)
    }

    return () => {
      if (cometTimeout) clearTimeout(cometTimeout)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("scroll", handleHeroScroll)
      document.removeEventListener("visibilitychange", handleVisibility)
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (twinkleIntervalHandle) clearInterval(twinkleIntervalHandle)
      window.clearInterval(keepClearTimer)
      solar.dispose()
    }
  }, [isImploding])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={backgroundCanvasRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: -2 }}
      />
      {/* the still stars: above the planets (same layer, later), under the twinkles */}
      <canvas
        ref={starsCanvasRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: -2 }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: -1 }}
      />
      {/* the page: faded away in the solar system view (back only once the Sun is nearly home) */}
      <div
        className={cn("relative z-10 transition-opacity", skyView ? "pointer-events-none opacity-0 duration-500" : "opacity-100 delay-700 duration-700")}
        aria-hidden={skyView || undefined}
      >
        {children}
      </div>

      {/* into the solar system view: a small Sun on the half-Sun, its name on hover */}
      {!isImploding && (
        <button
          type="button"
          onClick={() => setSkyView(true)}
          aria-label="See the solar system"
          className={cn(
            "group fixed left-3 top-1/2 z-40 flex -translate-y-1/2 items-center rounded-full border border-amber-300/30 bg-neutral-950/70 p-2 text-amber-200 shadow-[0_0_18px_rgba(251,146,60,0.25)] backdrop-blur-md transition-all duration-500 hover:border-amber-300/60 hover:text-amber-100",
            skyView ? "pointer-events-none opacity-0" : "opacity-100 delay-700",
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="4.2" fill="currentColor" fillOpacity="0.25" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </svg>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium transition-all duration-300 group-hover:ml-2 group-hover:mr-1 group-hover:max-w-[12rem] group-focus-visible:ml-2 group-focus-visible:mr-1 group-focus-visible:max-w-[12rem]">
            See the solar system
          </span>
        </button>
      )}

      {/* the solar system view's own words and way back */}
      <AnimatePresence>
        {skyView && (
          <motion.div
            key="sky-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.9 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="pointer-events-none fixed inset-0 z-40"
          >
            <button
              type="button"
              onClick={() => setSkyView(false)}
              className="pointer-events-auto absolute left-4 top-4 rounded-full border border-white/15 bg-neutral-950/70 px-4 py-2 text-sm text-neutral-200 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
            >
              ← Back to the page
            </button>
            {/* zoom: in, out, close to the Earth, and back to the whole of it */}
            <div data-sky-view-avoid className="absolute right-4 top-4 flex items-center gap-1.5">
              {[
                { key: "out", label: "−", aria: "Zoom out", off: skyZoom.z <= 1, go: () => solarRef.current?.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.5) },
                { key: "in", label: "+", aria: "Zoom in", off: skyZoom.z >= 12, go: () => solarRef.current?.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.5) },
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={b.go}
                  disabled={b.off}
                  aria-label={b.aria}
                  className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-neutral-950/70 font-mono text-base text-neutral-200 backdrop-blur-md transition-colors hover:border-white/30 disabled:opacity-35 disabled:hover:border-white/15"
                >
                  {b.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => solarRef.current?.zoomTo(skyZoom.follow ? "whole" : "earth")}
                className={cn(
                  "pointer-events-auto rounded-full border px-3 py-1.5 font-mono text-[11px] backdrop-blur-md transition-colors sm:text-[10px]",
                  skyZoom.follow ? "border-teal-300/60 bg-teal-300/15 text-teal-100" : "border-white/15 bg-neutral-950/70 text-neutral-200 hover:border-white/30",
                )}
              >
                {skyZoom.follow ? "Whole view" : "Fly to Earth"}
              </button>
              {!skyZoom.follow && skyZoom.z > 1 && (
                <button type="button" onClick={() => solarRef.current?.zoomTo("whole")} className="pointer-events-auto rounded-full border border-white/15 bg-neutral-950/70 px-3 py-1.5 font-mono text-[11px] text-neutral-200 backdrop-blur-md hover:border-white/30 sm:text-[10px]">
                  Whole view
                </button>
              )}
            </div>
            <div data-sky-view-avoid className="absolute inset-x-0 top-16 px-4 text-center sm:top-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/85 sm:text-[10px]">
                {!skyTime || skyTime.now ? "The solar system, right now" : "The solar system, back in time"}
              </p>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm tabular-nums text-neutral-300">
                {!skyTime || skyTime.now ? (
                  <>
                    <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
                    {(skyTime?.date ?? new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
                    {(skyTime?.date ?? new Date()).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </>
                ) : (
                  <>
                    {skyTime.date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    {/* (before October 1582 the date is the Gregorian calendar's, carried back: history
                        wrote them in the Julian one, days apart) */}
                    {skyTime.date.getTime() < Date.UTC(1582, 9, 15) && <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">Gregorian calendar</span>}
                  </>
                )}
              </p>
            </div>
            {/* back in time: a reverse time-lapse, never ahead of now */}
            <div data-sky-view-avoid className="absolute inset-x-0 bottom-14 flex flex-wrap items-center justify-center gap-1.5 px-4 sm:bottom-12">
              <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Rewind</span>
              {[
                { label: "a week a second", short: "week/s", rate: -7 },
                { label: "a month a second", short: "month/s", rate: -30.44 },
                { label: "a year a second", short: "year/s", rate: -365.25 },
                { label: "a century a second", short: "century/s", rate: -36525 },
              ].map((o) => (
                <button
                  key={o.rate}
                  type="button"
                  onClick={() => solarRef.current?.timeLapse(o.rate)}
                  aria-pressed={skyTime?.rate === o.rate}
                  className={cn(
                    "pointer-events-auto rounded-full border px-3 py-1 font-mono text-[11px] transition-colors sm:text-[10px]",
                    skyTime?.rate === o.rate ? "border-amber-300/60 bg-amber-300/15 text-amber-100" : "border-white/15 bg-neutral-950/60 text-neutral-300 hover:border-white/30",
                  )}
                >
                  ⏪ <span className="sm:hidden">{o.short}</span>
                  <span className="hidden sm:inline">{o.label}</span>
                </button>
              ))}
              {/* or straight to a date: any day from year 1 to today */}
              <label className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-neutral-950/60 py-0.5 pl-3 pr-1.5 font-mono text-[11px] text-neutral-300 hover:border-white/30 sm:text-[10px]">
                <span className="sr-only sm:not-sr-only">Go to</span>
                <input
                  type="date"
                  min="0001-01-01"
                  max={todayIso()}
                  ref={datePickRef}
                  defaultValue={todayIso()}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-").map(Number)
                    // (noon, UTC, on the day picked; set so, since Date.UTC takes years 0 to 99 as 1900s)
                    if (!y || !m || !d) return
                    const at = new Date(Date.UTC(2000, m - 1, d, 12))
                    at.setUTCFullYear(y)
                    solarRef.current?.goTo(at.getTime())
                  }}
                  aria-label="Go to a date in the past"
                  className="bg-transparent font-mono text-[11px] text-neutral-200 [color-scheme:dark] focus:outline-none sm:text-[10px]"
                />
              </label>
              {skyTime && skyTime.rate < 0 && (
                <button type="button" onClick={() => solarRef.current?.timeLapse(0)} className="pointer-events-auto rounded-full border border-white/15 bg-neutral-950/60 px-3 py-1 font-mono text-[11px] text-neutral-300 hover:border-white/30 sm:text-[10px]">
                  ⏸ pause
                </button>
              )}
              {skyTime && !skyTime.now && !skyTime.toNow && (
                <button type="button" onClick={() => solarRef.current?.toNow()} className="pointer-events-auto rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] text-emerald-200 hover:border-emerald-400/70 sm:text-[10px]">
                  Back to now →
                </button>
              )}
            </div>
            <p data-sky-view-avoid className="absolute inset-x-0 bottom-5 px-4 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500 sm:text-[10px]">
              <span className="sm:hidden">Real positions, in real time · not to scale · tap one for a fact</span>
              <span className="hidden sm:inline">Every planet where it really is, moving at its real pace · seen from above, distances not to scale · hover for more, click for a fact · Esc to go back</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
              <p className="font-mono text-[11px] sm:text-[10px] uppercase tracking-[0.3em] text-teal-400/80">incoming transmission</p>
              <p className="mt-3 text-base font-medium leading-snug text-white">{issModal.sarcasm}</p>
              {issTelemetry && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mt-3 rounded-md border border-teal-500/20 bg-teal-500/5 px-2.5 py-1.5 font-mono text-[11px] sm:text-[10px] uppercase tracking-[0.14em] text-teal-300/90"
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
        {bodyModal && (
          <motion.div
            key="body-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9100] flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBodyModal(null)} />
            <motion.div
              role="dialog"
              aria-label={bodyModal.name}
              initial={{ scale: 0.92, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 14, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-amber-400/30 bg-neutral-950/95 p-6 shadow-[0_0_40px_rgba(251,191,36,0.18)]"
            >
              <button
                onClick={() => setBodyModal(null)}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <p className="font-mono text-[11px] sm:text-[10px] uppercase tracking-[0.3em] text-amber-300/85">{bodyModal.name === "Pluto" ? "dwarf planet" : bodyModal.name === "Sun" ? "our star" : bodyModal.name === "Moon" ? "our moon" : "planet"}</p>
              <p className="mt-2 text-2xl font-bold text-white">{bodyModal.name === "Sun" || bodyModal.name === "Moon" ? `The ${bodyModal.name}` : bodyModal.name}</p>
              {bodyModal.detail && <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-400">{bodyModal.detail}</p>}
              <p className="mt-4 text-xs uppercase tracking-wider text-neutral-500">Did you know</p>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-50">{bodyModal.fact}</p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setBodyModal((m) => (m ? { ...m, fact: nextFact(m.name) } : m))}
                  className="flex-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-400/25"
                >
                  Another fact
                </button>
                <button onClick={() => setBodyModal(null)} className="rounded-full border border-white/15 px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-white/30">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}