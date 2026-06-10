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
import { Stats } from "@/components/Stats";
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
import { SectionDivider } from "@/components/ui/section-divider";
import { Reveal } from "@/components/ui/reveal";
import { CollectiblesProvider, CollectibleHUD, Fragment as Collectible, FRAGMENTS_STORAGE_KEY } from "@/components/ui/collectibles";
import { BlackHoleOverlay } from "@/components/ui/black-hole";
import { WarpOverlay } from "@/components/ui/warp-overlay";
import { ConstellationPuzzle, CONSTELLATION_STORAGE_KEY } from "@/components/ui/constellation-puzzle";
import { DefenseMode } from "@/components/ui/defense-mode";
import { IdleAlien } from "@/components/ui/idle-alien";

const Home = () => {
  const [showEnterScreen, setShowEnterScreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // COSMIC EVENT STATE
  const [isImploding, setIsImploding] = useState(false);
  // The page content is far taller than the screen, so the implosion must pivot
  // around the CURRENT viewport centre, not the element's geometric centre.
  const [implodeOrigin, setImplodeOrigin] = useState("50% 50%");

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

  // Phase one of the implosion: a few visible elements get plucked into the
  // hole one by one (WAAPI, outside React), before the wrapper takes the rest.
  const suckElementsOneByOne = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>("h1, h2, h3, .meteor-border, #about-me p, button, .pulse-border")
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 20 && r.height > 14 && r.top < vh * 0.95 && r.bottom > vh * 0.05 && r.left < vw && r.right > 0;
    });
    // Keep leaves only, so a card and its own heading don't both fly
    const leaves = candidates.filter((el) => !candidates.some((o) => o !== el && el.contains(o)));
    for (let i = leaves.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
    }
    leaves.slice(0, 7).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dx = vw / 2 - (r.left + r.width / 2);
      const dy = vh / 2 - (r.top + r.height / 2);
      const spin = i % 2 ? 260 : -260;
      el.animate(
        [
          { transform: "translate(0px, 0px) scale(1) rotate(0deg)", opacity: "1", offset: 0 },
          { transform: `translate(${dx * 0.12}px, ${dy * 0.12}px) scale(0.96) rotate(${spin / 30}deg)`, opacity: "1", offset: 0.35 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.04) rotate(${spin}deg)`, opacity: "0", offset: 1 },
        ],
        { duration: 700, delay: 180 + i * 135, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "forwards" }
      );
    });
  };

  const triggerCosmicReset = () => {
    setImplodeOrigin(`50% ${window.scrollY + window.innerHeight / 2}px`);
    suckElementsOneByOne();
    setIsImploding(true);

    // 1. Wait for animation to finish (Black Hole Suck)
    setTimeout(() => {
      // 2. Clear Session Logic
      sessionStorage.removeItem("hasEnteredCosmos");
      sessionStorage.removeItem(FRAGMENTS_STORAGE_KEY);
      sessionStorage.removeItem(CONSTELLATION_STORAGE_KEY);
      sessionStorage.removeItem("visitor-callsign");

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
    <CollectiblesProvider>
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

            {/* 
              FIX: BackToTop moved OUTSIDE the transformed motion.div so 'position: fixed' works correctly.
              We add a transition wrapper so it still disappears during the black hole event.
            */}
            <div className={`relative z-50 transition-opacity duration-500 ${isImploding ? "opacity-0" : "opacity-100"}`}>
              <BackToTop />
              <CollectibleHUD isImploding={isImploding} onCosmicReset={triggerCosmicReset} />
            </div>

            {/* The singularity itself - fixed at viewport centre, outside the imploding transform */}
            {isImploding && <BlackHoleOverlay />}

            {/* Hyperspace streaks on section warps (renders null while idle) */}
            <WarpOverlay />

            {/* Asteroid shooter over the live page (renders null until triggered) */}
            <DefenseMode />

            {/* Peek-a-boo alien after 30s of inactivity */}
            {!isImploding && <IdleAlien />}

            {/* This Motion Div handles the Spaghettification of the UI */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isImploding ? {
                // Resist, shudder, then spaghettify into the hole: the centre is
                // swallowed first while the edges stretch, lag, and finally follow.
                scaleX: [1, 0.94, 0.975, 0.88, 0.94, 0.5, 0],
                scaleY: [1, 0.955, 0.985, 0.9, 1.03, 1.28, 0],
                rotate: [0, -5, 2.5, -9, 3.5, 140, 660],
                rotateX: [0, 1.5, -1.5, 2.5, -2, 10, 24],
                z: [0, 0, 0, 0, -40, -280, -1200],
                x: [0, 7, -8, 9, -6, 0, 0],
                opacity: [1, 1, 1, 1, 1, 0.9, 0],
                filter: ["blur(0px)", "blur(0px)", "blur(0px)", "blur(1px)", "blur(1px)", "blur(5px)", "blur(8px)"],
              } : {
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
                rotate: 0,
                rotateX: 0,
                z: 0,
                x: 0,
                filter: "blur(0px)"
              }}
              transition={isImploding ? {
                duration: 2.25,
                times: [0, 0.16, 0.28, 0.42, 0.54, 0.8, 1],
                ease: ["easeOut", "easeInOut", "easeOut", "easeInOut", "easeIn", "easeIn"],
              } : {
                duration: 1.0
              }}
              className="overflow-hidden relative w-full"
              style={{ transformOrigin: implodeOrigin }}
            >
              {/* FIXED: Passing isImploding prop */}
              <FloatingNav navItems={navItems} isImploding={isImploding} />

              <Hero />

              <Reveal>
                <div
                  id="about-me"
                  className="flex flex-col items-center justify-center gap-12 md:gap-16 mx-10 md:mx-20 my-10 md:my-20"
                >
                  <Paragraph para={aboutme} />
                  <Stats />
                  <ConstellationPuzzle />
                </div>
              </Reveal>

              <SectionDivider variant="comet" />
              <Reveal>
                <div className="relative">
                  <WorkExp />
                  <Collectible id="workex" className="top-10 right-6 md:right-16" />
                </div>
              </Reveal>
              <SectionDivider variant="planet" />
              <Reveal>
                <div className="relative">
                  <Education />
                  <Collectible id="education" className="top-12 left-6 md:left-16" />
                </div>
              </Reveal>
              <SectionDivider variant="constellation" />
              <Reveal>
                <div className="relative">
                  <SkillsAndAchievements />
                  <Collectible id="skills" className="bottom-12 right-8 md:right-20" />
                </div>
              </Reveal>
              <SectionDivider variant="nova" />
              <Reveal>
                <div className="relative">
                  <Projects />
                  <Collectible id="projects" className="top-12 left-8 md:left-20" />
                </div>
              </Reveal>
              <SectionDivider variant="galaxy" />
              <Reveal>
                <div className="relative">
                  <Publications />
                  <Collectible id="publications" className="bottom-14 right-8 md:right-24" />
                </div>
              </Reveal>
              <SectionDivider variant="rocket" />
              <Reveal>
                <Contact />
              </Reveal>

            </motion.div>
          </AnimatedBackground>
        )}
      </AnimatePresence>
    </CollectiblesProvider>
  );
};

export default Home;