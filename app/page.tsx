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
  const [showEnterScreen, setShowEnterScreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // COSMIC EVENT STATE
  const [isImploding, setIsImploding] = useState(false);

  useEffect(() => {
    const hasEntered = sessionStorage.getItem("hasEnteredCosmos");
    if (!hasEntered) {
      setShowEnterScreen(true);
    }
    setIsLoaded(true);

    // --- KONAMI CODE LOGIC ---
    const konamiCode = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
    let keyHistory: string[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't register keys if we are already in the black hole
      if (isImploding) return;

      keyHistory.push(e.key.toLowerCase());
      if (keyHistory.length > konamiCode.length) {
        keyHistory.shift();
      }

      if (JSON.stringify(keyHistory) === JSON.stringify(konamiCode)) {
        triggerCosmicReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImploding]);

  const triggerCosmicReset = () => {
    setIsImploding(true);

    // 1. Wait for animation to finish (Black Hole Suck)
    setTimeout(() => {
      // 2. Clear Session Logic
      sessionStorage.removeItem("hasEnteredCosmos");

      // 3. Scroll to top instantly
      window.scrollTo(0, 0);

      // 4. Force Reload to Trigger Big Bang via EnterScreen
      window.location.reload();
    }, 2500); // 2.5s duration matches the sound effect
  };

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

  if (!isLoaded) return null;

  return (
    <>
      {/* Progress Bar - Hide during implosion */}
      {!showEnterScreen && !isImploding && <ScrollProgress />}

      <AnimatePresence>
        {showEnterScreen && (
          <EnterScreen onAnimationComplete={handleEnterComplete} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showEnterScreen && (
          // Pass isImploding to background to control stars
          <AnimatedBackground isImploding={isImploding}>
            {/* This Motion Div handles the Spaghettification of the UI */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isImploding ? {
                scale: 0,
                opacity: 0,
                rotate: 720, // Spin into the void
                filter: "blur(20px)", // Blur as it accelerates
              } : {
                opacity: 1,
                scale: 1,
                rotate: 0,
                filter: "blur(0px)"
              }}
              transition={isImploding ? {
                duration: 2,
                ease: "anticipate" // Pull back then shoot
              } : {
                duration: 1.0
              }}
              className="overflow-hidden relative w-full origin-center"
            >
              <FloatingNav navItems={navItems} />
              <Hero />

              <div
                id="about-me"
                className="flex items-center justify-center mx-10 md:mx-20 my-10 md:my-20"
              >
                <Paragraph para={aboutme} />
              </div>

              <WorkExp />
              <Education />
              <SkillsAndAchievements />
              <Projects />
              <Publications />
              <Contact />

              <BackToTop />
            </motion.div>
          </AnimatedBackground>
        )}
      </AnimatePresence>
    </>
  );
};

export default Home;