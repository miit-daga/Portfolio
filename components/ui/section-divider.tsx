"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export const SectionDivider = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <div ref={ref} className="relative py-6 mx-auto w-full max-w-5xl px-8 overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-8 bg-teal-500/10 blur-[40px] rounded-full" />
      </motion.div>

      {/* Main circuit layout */}
      <div className="relative flex items-center justify-center h-10">

        {/* Far left terminal node */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2"
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
            <div className="w-1 h-1 rounded-full bg-teal-500/40" />
          </div>
        </motion.div>

        {/* Left line */}
        <motion.div
          className="absolute left-6 right-1/2 top-1/2 h-px mr-20"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          style={{ originX: 0 }}
        >
          <div className="w-full h-full bg-gradient-to-r from-teal-500/20 via-teal-400/50 to-teal-400/60" />
        </motion.div>

        {/* Left branch — angled line going up */}
        <motion.div
          className="absolute top-0 left-[30%]"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={isInView ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          style={{ originY: 1 }}
        >
          <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
            <path d="M12 16 L12 8 L24 0" stroke="rgba(45,212,191,0.35)" strokeWidth="1" />
            <circle cx="24" cy="0" r="1.5" fill="rgba(45,212,191,0.5)" />
          </svg>
        </motion.div>

        {/* Right branch — angled line going down */}
        <motion.div
          className="absolute bottom-0 right-[30%]"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={isInView ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          style={{ originY: 0 }}
        >
          <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
            <path d="M12 0 L12 8 L0 16" stroke="rgba(45,212,191,0.35)" strokeWidth="1" />
            <circle cx="0" cy="16" r="1.5" fill="rgba(45,212,191,0.5)" />
          </svg>
        </motion.div>

        {/* Center hexagonal node */}
        <motion.div
          className="relative z-10 flex-shrink-0"
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {/* Outer ring glow */}
          <div className="absolute -inset-3 bg-teal-400/15 blur-[10px] rounded-full" />
          {/* Hexagon shape */}
          <svg width="20" height="22" viewBox="0 0 20 22" className="relative">
            <motion.polygon
              points="10,1 19,6 19,16 10,21 1,16 1,6"
              fill="rgba(45,212,191,0.08)"
              stroke="rgba(45,212,191,0.6)"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />
            {/* Inner dot */}
            <motion.circle
              cx="10"
              cy="11"
              r="2"
              fill="rgba(45,212,191,0.7)"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: [0, 1, 0.6, 1] } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
            />
          </svg>
        </motion.div>

        {/* Right line */}
        <motion.div
          className="absolute right-6 left-1/2 top-1/2 h-px ml-20"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          style={{ originX: 1 }}
        >
          <div className="w-full h-full bg-gradient-to-l from-teal-500/20 via-teal-400/50 to-teal-400/60" />
        </motion.div>

        {/* Far right terminal node */}
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-teal-500/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
          </div>
        </motion.div>

        {/* Left intermediate node */}
        <motion.div
          className="absolute left-[22%] top-1/2 -translate-y-1/2"
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <div className="w-2 h-2 rotate-45 border border-teal-400/50 bg-teal-400/10" />
        </motion.div>

        {/* Right intermediate node */}
        <motion.div
          className="absolute right-[22%] top-1/2 -translate-y-1/2"
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <div className="w-2 h-2 rotate-45 border border-teal-400/50 bg-teal-400/10" />
        </motion.div>

        {/* Scanning pulse light */}
        {isInView && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 h-[3px] w-16 rounded-full pointer-events-none z-20"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.9), transparent)",
              boxShadow: "0 0 12px rgba(45, 212, 191, 0.5), 0 0 4px rgba(45, 212, 191, 0.3)",
            }}
            initial={{ left: "5%", opacity: 0 }}
            animate={{ left: ["5%", "92%"], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 2,
              delay: 1.2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 6,
            }}
          />
        )}

        {/* Subtle tick marks along the line */}
        {[15, 25, 35, 45, 55, 65, 75, 85].map((pos, i) => (
          <motion.div
            key={pos}
            className="absolute top-1/2 w-px h-1.5 bg-teal-500/20"
            style={{ left: `${pos}%`, transform: "translateY(-50%)" }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.4 + i * 0.04 }}
          />
        ))}
      </div>
    </div>
  )
}
