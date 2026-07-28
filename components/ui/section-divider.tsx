"use client"

import { motion, useInView } from "framer-motion"
import { useId, useRef } from "react"
import { RocketIcon } from "./rocket"
import { getSection, type SectionId, type SectionMeta } from "@/constants/sections"

type DividerVariant = "constellation" | "comet" | "planet" | "nova" | "galaxy" | "rocket"

// Every divider paints in the colour of the section it leads into, so the page
// visibly changes region as you descend. Falls back to the house teal when no
// section is named.
const TEAL: SectionMeta = {
  id: "about-me",
  label: "",
  eyebrow: null,
  index: null,
  rgb: [45, 212, 191],
  rgb2: [59, 130, 246],
  hex: "#2dd4bf",
  light: "#99f6e4",
  pale: "#ccfbf1",
}

type Accent = {
  rgba: (a: number) => string
  hex: string
  light: string
  pale: string
  dark: string
}

function toAccent(meta: SectionMeta): Accent {
  const [r, g, b] = meta.rgb
  const dark = `#${meta.rgb.map((c) => Math.round(c * 0.22).toString(16).padStart(2, "0")).join("")}`
  return {
    rgba: (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`,
    hex: meta.hex,
    light: meta.light,
    pale: meta.pale,
    dark,
  }
}

export const SectionDivider = ({
  variant = "constellation",
  section,
}: {
  variant?: DividerVariant
  /** The section this divider introduces; drives its colour. */
  section?: SectionId
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const accent = toAccent(section ? getSection(section) : TEAL)

  return (
    <div ref={ref} className="relative py-6 mx-auto w-full max-w-5xl px-8 overflow-hidden">
      {/* Shared soft glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-8 blur-[40px] rounded-full"
          style={{ background: accent.rgba(0.1) }}
        />
      </motion.div>

      {variant === "comet" ? (
        <CometDivider isInView={isInView} a={accent} />
      ) : variant === "planet" ? (
        <PlanetDivider isInView={isInView} a={accent} />
      ) : variant === "nova" ? (
        <NovaDivider isInView={isInView} a={accent} />
      ) : variant === "galaxy" ? (
        <GalaxyDivider isInView={isInView} a={accent} />
      ) : variant === "rocket" ? (
        <RocketDivider isInView={isInView} a={accent} />
      ) : (
        <ConstellationDivider isInView={isInView} a={accent} />
      )}
    </div>
  )
}

type VariantProps = { isInView: boolean; a: Accent }

// --- Variant 1: Constellation ---
const CONSTELLATION = [
  { x: 30, y: 26 },
  { x: 70, y: 12 },
  { x: 110, y: 22 },
  { x: 145, y: 7 },
  { x: 180, y: 24 },
  { x: 215, y: 13 },
  { x: 250, y: 26 },
]

const ConstellationDivider = ({ isInView, a }: VariantProps) => (
  <div className="relative flex items-center justify-center h-10">
    <svg width="280" height="34" viewBox="0 0 280 34" className="relative overflow-visible" fill="none">
      {/* Connecting lines draw in sequence */}
      {CONSTELLATION.slice(0, -1).map((s, i) => {
        const n = CONSTELLATION[i + 1]
        return (
          <motion.line
            key={`l${i}`}
            x1={s.x}
            y1={s.y}
            x2={n.x}
            y2={n.y}
            stroke={a.rgba(0.35)}
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.35 + i * 0.13, ease: "easeOut" }}
          />
        )
      })}
      {/* Stars pop in, then twinkle */}
      {CONSTELLATION.map((s, i) => {
        const big = i === 3
        return (
          <motion.circle
            key={`s${i}`}
            cx={s.x}
            cy={s.y}
            r={big ? 2.8 : 1.6}
            fill={big ? a.light : a.pale}
            style={{
              filter: `drop-shadow(0 0 ${big ? 6 : 3}px ${a.rgba(0.9)})`,
              transformOrigin: `${s.x}px ${s.y}px`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              isInView
                ? { scale: 1, opacity: big ? [1, 0.55, 1] : [0.7, 1, 0.7] }
                : { scale: 0, opacity: 0 }
            }
            transition={{
              scale: { duration: 0.4, delay: 0.3 + i * 0.12, ease: [0.34, 1.56, 0.64, 1] },
              opacity: { duration: 2.6, repeat: Infinity, delay: 1 + i * 0.2, ease: "easeInOut" },
            }}
          />
        )
      })}
    </svg>
  </div>
)

// --- Variant 2: Comet ---
const CometDivider = ({ isInView, a }: VariantProps) => (
  <div className="relative flex items-center justify-center h-10">
    {/* Faint trajectory */}
    <div
      className="absolute top-1/2 left-10 right-10 h-px -translate-y-1/2"
      style={{ background: `linear-gradient(90deg, transparent, ${a.rgba(0.15)}, transparent)` }}
    />
    {/* Static destination star */}
    <div
      className="absolute top-1/2 right-10 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
      style={{ background: a.pale, boxShadow: `0 0 6px ${a.rgba(0.8)}` }}
    />

    {/* The comet */}
    {isInView && (
      <motion.div
        className="absolute top-1/2"
        style={{ y: "-50%" }}
        initial={{ left: "6%", opacity: 0 }}
        animate={{ left: ["6%", "90%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.6, ease: "easeIn", repeat: Infinity, repeatDelay: 3.5 }}
      >
        {/* Tail (trails to the left, behind the head) */}
        <div
          className="absolute top-0 h-[2px] rounded-full"
          style={{
            width: 60,
            marginLeft: -60,
            transform: "translateY(-50%)",
            background: `linear-gradient(to left, ${a.light}, transparent)`,
          }}
        />
        {/* Head */}
        <div
          className="absolute top-0 left-0 h-2 w-2 rounded-full"
          style={{
            background: a.pale,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 10px 2px ${a.rgba(0.9)}`,
          }}
        />
      </motion.div>
    )}
  </div>
)

// --- Variant 3: Ringed planet ---
const PlanetDivider = ({ isInView, a }: VariantProps) => {
  const gradId = `dividerPlanetBody-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`
  return (
    <div className="relative flex items-center justify-center h-10">
      {/* Flanking orbital lines */}
      <motion.div
        className="absolute left-8 right-1/2 top-1/2 h-px mr-12"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        style={{ originX: 0 }}
      >
        <div
          className="w-full h-full"
          style={{ background: `linear-gradient(90deg, transparent, ${a.rgba(0.4)}, ${a.rgba(0.6)})` }}
        />
      </motion.div>
      <motion.div
        className="absolute right-8 left-1/2 top-1/2 h-px ml-12"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        style={{ originX: 1 }}
      >
        <div
          className="w-full h-full"
          style={{ background: `linear-gradient(270deg, transparent, ${a.rgba(0.4)}, ${a.rgba(0.6)})` }}
        />
      </motion.div>

      {/* Tiny stars flanking the planet */}
      {[
        { left: "30%", top: "30%" },
        { left: "68%", top: "65%" },
        { left: "62%", top: "25%" },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{ ...p, background: a.pale, boxShadow: `0 0 4px ${a.rgba(0.8)}` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: [0.4, 1, 0.4], scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{
            scale: { duration: 0.3, delay: 0.6 + i * 0.1 },
            opacity: { duration: 2.4, repeat: Infinity, delay: 1 + i * 0.3, ease: "easeInOut" },
          }}
        />
      ))}

      {/* The ringed planet */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="absolute -inset-3 blur-[12px] rounded-full" style={{ background: a.rgba(0.12) }} />
        <svg width="72" height="44" viewBox="0 0 72 44" className="relative overflow-visible" fill="none">
          <defs>
            <radialGradient id={gradId} cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor={a.pale} />
              <stop offset="55%" stopColor={a.hex} />
              <stop offset="100%" stopColor={a.dark} />
            </radialGradient>
          </defs>
          {/* Ring - full ellipse (back portion hides behind the body) */}
          <g transform="rotate(-20 36 22)">
            <ellipse cx="36" cy="22" rx="30" ry="9" fill="none" stroke={a.rgba(0.45)} strokeWidth="2.5" />
            <ellipse cx="36" cy="22" rx="23" ry="6.5" fill="none" stroke={a.rgba(0.22)} strokeWidth="1" />
          </g>
          {/* Planet body */}
          <circle cx="36" cy="22" r="11" fill={`url(#${gradId})`} />
          {/* Rim light */}
          <path d="M 28 16 A 11 11 0 0 1 41 14" fill="none" stroke={a.pale} strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round" />
          {/* Ring - front half (over the body) */}
          <g transform="rotate(-20 36 22)">
            <path d="M 6 22 A 30 9 0 0 0 66 22" fill="none" stroke={a.rgba(0.6)} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      </motion.div>
    </div>
  )
}

// --- Variant 4: Nova (bright star with lens-flare diffraction spikes) ---
const NovaDivider = ({ isInView, a }: VariantProps) => (
  <div className="relative flex items-center justify-center h-10">
    {/* Side lines */}
    <motion.div
      className="absolute left-6 right-1/2 top-1/2 h-px mr-14"
      initial={{ scaleX: 0 }}
      animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
      style={{ originX: 0 }}
    >
      <div
        className="w-full h-full"
        style={{ background: `linear-gradient(90deg, transparent, ${a.rgba(0.4)}, ${a.rgba(0.6)})` }}
      />
    </motion.div>
    <motion.div
      className="absolute right-6 left-1/2 top-1/2 h-px ml-14"
      initial={{ scaleX: 0 }}
      animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
      style={{ originX: 1 }}
    >
      <div
        className="w-full h-full"
        style={{ background: `linear-gradient(270deg, transparent, ${a.rgba(0.4)}, ${a.rgba(0.6)})` }}
      />
    </motion.div>

    <motion.div
      className="relative z-10 flex items-center justify-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{ duration: 0.55, delay: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Soft glow + gentle twinkle */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={isInView ? { opacity: [0.7, 1, 0.7], scale: [1, 1.12, 1] } : { opacity: 0 }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute rounded-full"
          style={{ width: 30, height: 30, background: `radial-gradient(circle, ${a.rgba(0.5)}, ${a.rgba(0)} 70%)` }}
        />
        {/* Long horizontal spike */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: 96, height: 1, transform: "translate(-50%, -50%)", background: `linear-gradient(90deg, transparent, ${a.light}, transparent)` }}
        />
        {/* Vertical spike */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: 1, height: 40, transform: "translate(-50%, -50%)", background: `linear-gradient(180deg, transparent, ${a.light}, transparent)` }}
        />
        {/* Faint diagonal spikes */}
        {[45, -45].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2"
            style={{ width: 40, height: 1, transform: `translate(-50%, -50%) rotate(${deg}deg)`, background: `linear-gradient(90deg, transparent, ${a.rgba(0.4)}, transparent)` }}
          />
        ))}
        {/* Bright core */}
        <div className="relative rounded-full bg-white" style={{ width: 5, height: 5, boxShadow: `0 0 8px 2px ${a.rgba(0.9)}` }} />
      </motion.div>
    </motion.div>
  </div>
)

// --- Variant 5: Spiral galaxy ---
const GalaxyDivider = ({ isInView, a }: VariantProps) => {
  const coreId = `dividerGalaxyCore-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`
  return (
    <div className="relative flex items-center justify-center h-10">
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="absolute -inset-3 blur-[14px] rounded-full" style={{ background: a.rgba(0.15) }} />
        <motion.svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          className="relative overflow-visible"
          fill="none"
          animate={isInView ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "28px 28px" }}
        >
          <defs>
            <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor={a.pale} />
              <stop offset="100%" stopColor={a.rgba(0)} />
            </radialGradient>
          </defs>
          <path d="M28 28 C 40 22, 48 32, 44 44" stroke={a.rgba(0.55)} strokeWidth="2" strokeLinecap="round" />
          <path d="M28 28 C 16 34, 8 24, 12 12" stroke={a.rgba(0.55)} strokeWidth="2" strokeLinecap="round" />
          <path d="M28 28 C 38 16, 30 8, 18 10" stroke={a.rgba(0.35)} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M28 28 C 18 40, 26 48, 38 46" stroke={a.rgba(0.35)} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="45" cy="42" r="1" fill={a.pale} />
          <circle cx="11" cy="13" r="1" fill={a.pale} />
          <circle cx="28" cy="28" r="9" fill={`url(#${coreId})`} />
        </motion.svg>
      </motion.div>
    </div>
  )
}

// --- Variant 6: Rocket fly-by (echoes the timeline / progress rocket) ---
const RocketDivider = ({ isInView, a }: VariantProps) => (
  <div className="relative flex items-center justify-center h-10">
    <div
      className="absolute top-1/2 left-10 right-10 h-px -translate-y-1/2"
      style={{ background: `linear-gradient(90deg, transparent, ${a.rgba(0.15)}, transparent)` }}
    />
    {isInView && (
      <motion.div
        className="absolute top-1/2"
        style={{ y: "-50%" }}
        initial={{ left: "5%", opacity: 0 }}
        animate={{ left: ["5%", "90%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
      >
        {/* Exhaust trail */}
        <div
          className="absolute top-0 rounded-full"
          style={{
            width: 44,
            marginLeft: -44,
            height: 2,
            transform: "translateY(-50%)",
            background: `linear-gradient(to left, ${a.rgba(0.85)}, transparent)`,
          }}
        />
        {/* Rocket, rotated to face its travel direction */}
        <div
          className="absolute top-0 left-0 w-5 h-5"
          style={{ transform: "translate(-50%, -50%) rotate(90deg)", filter: `drop-shadow(0 0 6px ${a.rgba(0.7)})` }}
        >
          <RocketIcon isIgnited />
        </div>
      </motion.div>
    )}
  </div>
)
