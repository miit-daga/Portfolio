"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Hero from "@/components/Hero";
import Paragraph from "@/components/Paragraph";
import { WorkExp } from "@/components/WorkExp";
import Projects from "@/components/Projects";
import Publications from "@/components/Publications";
import { Contact } from "@/components/Contact";
import { Education } from "@/components/Education";
import { SkillsAndAchievements } from "@/components/SkillsAndAchievements";
import { aboutme } from "@/constants";
import { FloatingNav } from "@/components/ui/floating-navbar";
import {
  IconHome,
  IconCode,
  IconBook,
  IconBriefcase,
  IconAward,
  IconMail,
  IconSchool,
  IconTerminal,
} from "@tabler/icons-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { EnterScreen } from "@/components/EnterScreen";
import { ScrollProgress } from "@/components/ScrollProgress";
import { BackToTop } from "@/components/BackToTop";

const Home = () => {
  // CHANGED: Default to false to prevent flash, controlled by useEffect
  const [showEnterScreen, setShowEnterScreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // To handle hydration

  useEffect(() => {
    // Check session storage on mount to see if user already viewed intro
    const hasEntered = sessionStorage.getItem("hasEnteredCosmos");
    if (!hasEntered) {
      setShowEnterScreen(true);
    }
    setIsLoaded(true);
  }, []);

  const handleEnterComplete = () => {
    setShowEnterScreen(false);
    sessionStorage.setItem("hasEnteredCosmos", "true");
  };

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
      name: "Skills & Achievements",
      link: "#skills-achievements",
      icon: <IconAward className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Projects",
      link: "#projects",
      icon: <IconCode className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Publications & Patents",
      link: "#publications",
      icon: <IconBook className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Contact",
      link: "#contact",
      icon: <IconMail className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Terminal",
      link: "/terminal.html",
      icon: <IconTerminal className="h-4 w-4 text-neutral-500 dark:text-white" />,
      isDesktopOnly: true,
    },
  ];

  // Prevent hydration mismatch by waiting for client load
  if (!isLoaded) return null;

  return (
    <>
      {/* Progress Bar - Always visible after enter screen */}
      {!showEnterScreen && <ScrollProgress />}

      <AnimatePresence>
        {showEnterScreen && (
          <EnterScreen onAnimationComplete={handleEnterComplete} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showEnterScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0 }}
            className="overflow-hidden relative w-full"
          >
            <FloatingNav navItems={navItems} />
            <Hero />

            <AnimatedBackground>
              <div
                id="about-me"
                className="flex items-center justify-center mx-10 md:mx-20 my-10 md:my-20"
              >
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
              <SkillsAndAchievements />
            </AnimatedBackground>

            <AnimatedBackground>
              <Projects />
            </AnimatedBackground>

            <AnimatedBackground>
              <Publications />
            </AnimatedBackground>

            <AnimatedBackground>
              <Contact />
            </AnimatedBackground>

            {/* Back To Top Button */}
            <BackToTop />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Home;