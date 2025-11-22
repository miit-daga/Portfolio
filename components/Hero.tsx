"use client"
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion"
import { BackgroundGradientAnimation } from "./ui/background-gradient-animation"
import { HeroTypewriterEffect } from "./ui/hero-typewriter-effect"
import { Terminal, Keyboard } from "lucide-react"
import { MagneticWrapper } from "./ui/magnetic-wrapper"

const Hero = () => {
  const { scrollY } = useScroll()
  const shouldReduceMotion = useReducedMotion()

  const scrollOpacity = useTransform(scrollY, [0, 600], [1, 0])
  const opacity = shouldReduceMotion ? 1 : scrollOpacity

  return (
    <motion.div
      style={{ opacity }}
      className="h-screen relative"
    >
      <BackgroundGradientAnimation>
        <div className="absolute z-50 inset-0 flex flex-col items-center justify-center text-white font-bold px-4 pointer-events-none text-center">
          <p className="bg-clip-text text-transparent text-6xl lg:text-9xl drop-shadow-2xl text-white">Miit Daga</p>
          <div className="mt-4 w-full flex justify-center">
            <HeroTypewriterEffect
              words={[
                { text: "Code", className: "text-gray-300" },
                { text: "That", className: "text-gray-300" },
                { text: "Powers", className: "text-gray-300" },
                { text: "the", className: "text-gray-300" },
                { text: "Unseen.", className: "text-gray-300" },
              ]}
              className="text-lg lg:text-2.5xl"
              cursorClassName="bg-gray-300"
              repeatDelay={5000}
            />
          </div>

          {/* Buttons Container */}
          <div className="absolute bottom-10 right-10 flex flex-col items-end gap-2 pointer-events-auto hidden lg:flex">

            {/* Terminal Button */}
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

            {/* Command Menu Hint */}
            {/* Command Menu Hint */}
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