"use client"
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion"
import { BackgroundGradientAnimation } from "./ui/background-gradient-animation"
import { HeroTypewriterEffect } from "./ui/hero-typewriter-effect"
import { Terminal } from "lucide-react"
import { MagneticWrapper } from "./ui/magnetic-wrapper"
import Image from "next/image"

const Hero = () => {
  const { scrollY } = useScroll()
  const shouldReduceMotion = useReducedMotion()
  const scrollOpacity = useTransform(scrollY, [0, 600], [1, 0])
  const opacity = shouldReduceMotion ? 1 : scrollOpacity

  // --- CONFIGURATION ---
  // Set to TRUE for the Hologram look
  // Set to FALSE for the Portal look
  const isTransparentCutout = true;

  return (
    <motion.div
      style={{ opacity }}
      className="h-screen relative overflow-hidden"
    >
      <BackgroundGradientAnimation>
        <div className="absolute z-50 inset-0 flex flex-col lg:flex-row items-center justify-center text-white font-bold px-4 pointer-events-none w-full h-full gap-10 lg:gap-24">

          {/* --- LEFT SIDE: TEXT CONTENT --- */}
          <div className="flex flex-col items-center lg:items-end text-center lg:text-right z-10 order-2 lg:order-1 lg:w-1/2">
            <h1 className="bg-clip-text text-transparent text-6xl md:text-8xl lg:text-9xl drop-shadow-2xl text-white tracking-tighter font-extrabold">
              Miit Daga
            </h1>

            <div className="mt-2 lg:mt-6 flex justify-center lg:justify-end w-full">
              <HeroTypewriterEffect
                words={[
                  { text: "Code", className: "text-teal-400" },
                  { text: "That", className: "text-neutral-300" },
                  { text: "Powers", className: "text-neutral-300" },
                  { text: "the", className: "text-neutral-300" },
                  { text: "Unseen.", className: "text-teal-400" },
                ]}
                className="text-xl md:text-2xl lg:text-4xl font-light"
                cursorClassName="bg-teal-400"
                repeatDelay={5000}
              />
            </div>
          </div>

          {/* --- RIGHT SIDE: AVATAR --- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative order-1 lg:order-2 flex items-center justify-center lg:w-1/2 pointer-events-auto"
          >
            {isTransparentCutout ? (
              // === PATH A: HOLOGRAM (Hover: Materialize) ===
              <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[500px] lg:h-[500px] group cursor-pointer">
                <motion.div
                  animate={{ y: [-15, 15, -15] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-full h-full"
                >
                  {/* 1. The Image */}
                  {/* Transition removes filters on hover to show "Real" colors */}
                  <div className="relative w-full h-full grayscale-[50%] sepia-[50%] hue-rotate-[160deg] brightness-110 contrast-125 z-10 mix-blend-hard-light transition-all duration-700 ease-out group-hover:grayscale-0 group-hover:sepia-0 group-hover:hue-rotate-0 group-hover:brightness-100 group-hover:contrast-100 group-hover:mix-blend-normal">
                    <Image
                      src="/nobg.png"
                      alt="Hologram"
                      fill
                      className="object-contain"
                      style={{
                        // Fades the bottom
                        maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)"
                      }}
                      priority
                    />
                  </div>

                  {/* 2. Pure CSS Scanlines (Fades out on hover for clarity) */}
                  <div
                    className="absolute inset-0 z-20 pointer-events-none opacity-30 transition-opacity duration-500 group-hover:opacity-10"
                    style={{
                      background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, #000 3px)",
                      backgroundSize: "100% 4px"
                    }}
                  />

                  {/* 3. Subtle Glitch Gradient Overlay (Disappears on hover) */}
                  <div className="absolute inset-0 z-30 bg-gradient-to-t from-teal-500/20 via-transparent to-transparent mix-blend-color-dodge opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-0" />

                </motion.div>

                {/* 4. Glowing Base Platform (Changes color on hover) */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[80%] h-12 bg-teal-500/40 blur-[40px] rounded-full transition-colors duration-700 group-hover:bg-blue-500/50" />
              </div>
            ) : (
              // === PATH B: CLEAN PORTAL (Hover: Focus & Expand) ===
              <div className="relative w-64 h-64 md:w-72 md:h-72 lg:w-[400px] lg:h-[400px] group cursor-pointer">
                {/* 1. Glowing Ring Behind (Intensifies on hover) */}
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-600 rounded-3xl blur opacity-30 group-hover:opacity-80 transition duration-500" />

                {/* 2. The Container */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 bg-black/50 backdrop-blur-sm transition-colors duration-500 group-hover:border-teal-500/50">
                  <Image
                    src="/profile.png"
                    alt="Profile"
                    fill
                    className="object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                    priority
                  />

                  {/* 3. Tech Overlays (Corners Expand Outward) */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-teal-500/50 transition-transform duration-500 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:border-teal-400" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-teal-500/50 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2 group-hover:border-teal-400" />

                  {/* 4. Subtle Scanline CSS (Vanishes on hover) */}
                  <div
                    className="absolute inset-0 pointer-events-none z-10 opacity-20 transition-opacity duration-300 group-hover:opacity-0"
                    style={{
                      background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, #000 3px)",
                      backgroundSize: "100% 4px"
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* --- BOTTOM RIGHT: BUTTONS --- */}
          <div className="absolute bottom-10 right-10 flex flex-col items-end gap-2 pointer-events-auto hidden lg:flex">
            <MagneticWrapper strength={0.4}>
              <a
                href="/terminal.html"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-full hover:bg-black/50 hover:border-white/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-black"
              >
                <Terminal className="h-4 w-4 text-gray-300 group-hover:text-white" />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Terminal Mode</span>
              </a>
            </MagneticWrapper>

            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <span>Navigate</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
                {typeof window !== "undefined" &&
                  /Mac|iPhone|iPod|iPad/.test(navigator.platform) ? (
                  <>
                    <span className="text-xs">⌘ + </span>K
                  </>
                ) : (
                  <>Ctrl + K</>
                )}
              </kbd>
            </div>
          </div>

        </div>
      </BackgroundGradientAnimation>
    </motion.div>
  )
}

export default Hero