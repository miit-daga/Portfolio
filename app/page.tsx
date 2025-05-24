
"use client"
import { Hero, Projects, Paragraph, Publications, WorkExp } from "@/components"
import { aboutme } from "@/constants"
import { FloatingNav } from "@/components/ui/floating-navbar"
import { IconHome, IconMessage, IconCode, IconBook, IconBriefcase } from "@tabler/icons-react";
const Home = () => {
  const navItems = [
    {
      name: "About Me",
      link: "/",
      icon: <IconHome className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Work Experience", // Added this
      link: "#workex",         // Link to the ID in WorkExp.tsx
      icon: <IconBriefcase className="h-4 w-4 text-neutral-500 dark:text-white" />, // Added icon
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
      <div className="flex items-center justify-center mx-10 md:mx-20 my-10 md:my-20"> {/* Adjusted margins for potentially better spacing */}
        <Paragraph para={aboutme} />
      </div>
      <WorkExp /> {/* Add the WorkExp component here */}
      <Projects />
      <Publications />
    </div>
  )
}

export default Home
