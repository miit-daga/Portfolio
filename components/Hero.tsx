"use client"
import { motion, useScroll, useTransform } from "framer-motion"
import { BackgroundGradientAnimation } from "./ui/background-gradient-animation"
import { HeroTypewriterEffect } from "./ui/hero-typewriter-effect"

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
        </div>
      </BackgroundGradientAnimation>
    </motion.div>
  )
}

export default Hero
