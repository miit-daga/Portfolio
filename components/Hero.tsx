"use client"
import { motion, useScroll, useTransform } from "framer-motion"
import { BackgroundGradientAnimation } from "./ui/background-gradient-animation"
import { HeroTypewriterEffect } from "./ui/hero-typewriter-effect"
import { Terminal, Keyboard } from "lucide-react"

const Hero = () => {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 600], [1, 0])

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
          
          {/* Terminal Access Button - Desktop Only */}
          <div className="absolute bottom-10 right-10 pointer-events-auto hidden lg:block">
            <a
              href="/terminal.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-full hover:bg-black/50 hover:border-white/40 transition-all duration-300"
            >
              <Terminal className="h-4 w-4 text-gray-300 group-hover:text-white" />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white">Terminal Mode</span>
              <Keyboard className="h-3 w-3 text-gray-400 group-hover:text-gray-300" />
            </a>
          </div>
        </div>
      </BackgroundGradientAnimation>
    </motion.div>
  )
}

export default Hero
