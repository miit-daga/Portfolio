
"use client"
import { Hero, Projects, Paragraph, Publications, WorkExp } from "@/components"
import { aboutme } from "@/constants"
import { FloatingNav } from "@/components/ui/floating-navbar"
import { IconHome, IconMessage, IconCode, IconBook, IconBriefcase } from "@tabler/icons-react";
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
      name: "Projects",
      link: "#projects",
      icon: <IconCode className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Publications",
      link: "#publications",
      icon: (
        <IconBook className="h-4 w-4 text-neutral-500 dark:text-white" />
      ),
    },
  ];
  return (
    <div className="overflow-hidden relative w-full">
      <FloatingNav navItems={navItems} />
      <Hero />
      <div id="about-me" className="flex items-center justify-center mx-10 md:mx-20 my-10 md:my-20">
        <Paragraph para={aboutme} />
      </div>
      <WorkExp />
      <Projects />
      <Publications />
    </div>
  )
}

export default Home
