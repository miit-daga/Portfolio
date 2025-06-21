"use client"
import Hero from '@/components/Hero'
import Paragraph from '@/components/Paragraph'
import { WorkExp } from '@/components/WorkExp'
import { Education } from '@/components/Education' 
import Projects from '@/components/Projects'
import Publications from '@/components/Publications'
import { aboutme } from "@/constants"
import { FloatingNav } from "@/components/ui/floating-navbar"
import { IconHome, IconCode, IconBook, IconBriefcase, IconSchool } from "@tabler/icons-react"
import { AnimatedBackground } from "@/components/ui/animated-background"

const Home = () => {
  const navItems = [
    {
      name: "About Me",
      link: "#about-me",
      icon: <IconHome className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Work Experience",
      link: "#workex",
      icon: <IconBriefcase className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Education",
      link: "#education",
      icon: <IconSchool className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Projects",
      link: "#projects",
      icon: <IconCode className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Publications",
      link: "#publications",
      icon: <IconBook className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
  ]
  return (
    <div className="overflow-hidden relative w-full">
      <FloatingNav navItems={navItems} />
      <Hero />

      <AnimatedBackground>
        <div id="about-me" className="flex items-center justify-center mx-10 md:mx-20 my-10 md:my-20">
          <Paragraph para={aboutme} />
        </div>
      </AnimatedBackground>

      <AnimatedBackground>
        <WorkExp />
      </AnimatedBackground>

      <AnimatedBackground>
        <Education />
      </AnimatedBackground>

      <AnimatedBackground>
        <Projects />
      </AnimatedBackground>

      <AnimatedBackground>
        <Publications />
      </AnimatedBackground>
    </div>
  )
}

export default Home