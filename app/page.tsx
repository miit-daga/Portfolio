"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { aboutme } from "@/constants";
import {
  IconHome,
  IconCode,
  IconBook,
  IconBriefcase,
  IconAward,
  IconMail,
  IconSchool,
  IconTerminal,
  IconDeviceGamepad2,
} from "@tabler/icons-react";
import { EnterScreen } from "@/components/EnterScreen";
import { CollectiblesProvider, CollectibleHUD, Fragment as Collectible, FRAGMENTS_STORAGE_KEY } from "@/components/ui/collectibles";
import { BlackHoleOverlay } from "@/components/ui/black-hole";
import { CONSTELLATION_STORAGE_KEY } from "@/components/ui/constellation-key";
import { scrollToSection } from "@/lib/scroll-to-section";
import { OffscreenPause } from "@/components/ui/offscreen-pause";

// The page behind the entry screen, in one chunk of its own
// (components/site-sections.tsx). A first visit sees only the entry screen, so
// that is all it waits for; the chunk is fetched while the entry screen is up,
// ready by the time anyone clicks, and straight away for anyone who has
// entered already (the page then shows as soon as it arrives).
const sections = () => import("@/components/site-sections");
if (typeof window !== "undefined") {
  try {
    if (sessionStorage.getItem("hasEnteredCosmos") || /[?&]embed=1(&|$)/.test(window.location.search)) sections();
  } catch {
    /* ignore */
  }
}
const Hero = dynamic(() => sections().then((m) => m.Hero));
const Paragraph = dynamic(() => sections().then((m) => m.Paragraph));
const WorkExp = dynamic(() => sections().then((m) => m.WorkExp));
const Projects = dynamic(() => sections().then((m) => m.Projects));
const Publications = dynamic(() => sections().then((m) => m.Publications));
const Contact = dynamic(() => sections().then((m) => m.Contact));
const Education = dynamic(() => sections().then((m) => m.Education));
const SkillsAndAchievements = dynamic(() => sections().then((m) => m.SkillsAndAchievements));
const Stats = dynamic(() => sections().then((m) => m.Stats));
const FloatingNav = dynamic(() => sections().then((m) => m.FloatingNav));
const AnimatedBackground = dynamic(() => sections().then((m) => m.AnimatedBackground));
const ScrollProgress = dynamic(() => sections().then((m) => m.ScrollProgress));
const BackToTop = dynamic(() => sections().then((m) => m.BackToTop));
const SectionDivider = dynamic(() => sections().then((m) => m.SectionDivider));
const Reveal = dynamic(() => sections().then((m) => m.Reveal));
const MobileNotice = dynamic(() => sections().then((m) => m.MobileNotice));
const FlightPath = dynamic(() => sections().then((m) => m.FlightPath));
const AmbientGlow = dynamic(() => sections().then((m) => m.AmbientGlow));
const ArcadeTeaser = dynamic(() => sections().then((m) => m.ArcadeTeaser));

// Easter eggs and the About puzzle load just after first paint, in their own
// chunks, rather than in the page bundle every visitor downloads up front.
// Each renders exactly as before once loaded. The black hole stays eager: it
// is part of the timed Konami sequence and must be ready the instant it fires.
const WarpOverlay = dynamic(() => import("@/components/ui/warp-overlay").then((m) => m.WarpOverlay), { ssr: false });
const DefenseMode = dynamic(() => import("@/components/ui/defense-mode").then((m) => m.DefenseMode), { ssr: false });
const IdleAlien = dynamic(() => import("@/components/ui/idle-alien").then((m) => m.IdleAlien), { ssr: false });
const Presence = dynamic(() => import("@/components/ui/explorers").then((m) => m.Presence), { ssr: false });
const MissionControl = dynamic(() => import("@/components/ui/mission-control").then((m) => m.MissionControl), { ssr: false });
const ConstellationPuzzle = dynamic(
  () => import("@/components/ui/constellation-puzzle").then((m) => m.ConstellationPuzzle),
  { ssr: false },
);

const Home = () => {
  // Shown in the page as sent, so it paints at once; hidden before the first
  // paint for anyone who has entered this session (app/layout.tsx), and taken
  // away here as the page starts
  const [showEnterScreen, setShowEnterScreen] = useState(true);
  // Set as the entry starts: the site renders behind the Big Bang and is revealed by it
  const [revealing, setRevealing] = useState(false);
  // The entry to start on: the Big Bang after a Big Crunch, otherwise the
  // porthole; the visitor can switch either way before entering
  const [entry, setEntry] = useState<"bang" | "porthole" | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // COSMIC EVENT STATE
  const [isImploding, setIsImploding] = useState(false);
  // The page content is far taller than the screen, so the implosion must pivot
  // around the CURRENT viewport centre, not the element's geometric centre.
  const [implodeOrigin, setImplodeOrigin] = useState("50% 50%");
  // Mirror for the konami listener (registered once) to check the live value
  const showEnterScreenRef = useRef(showEnterScreen);
  showEnterScreenRef.current = showEnterScreen;

  useEffect(() => {
    // The terminal's `open` command frames this page with ?embed=1. A preview
    // should land on the site itself; an iframe shares the tab's sessionStorage,
    // so without this it would inherit the portal screen.
    const embedded = new URLSearchParams(window.location.search).get("embed") === "1";
    const hasEntered = sessionStorage.getItem("hasEnteredCosmos");
    if (sessionStorage.getItem("after-big-crunch")) {
      sessionStorage.removeItem("after-big-crunch");
      setEntry("bang");
    }
    if (hasEntered || embedded) {
      setShowEnterScreen(false);
    } else {
      // the page behind the entry screen, fetched once it is up and idle
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
      idle(() => {
        sections();
      });
    }
    setIsLoaded(true);

    // --- KONAMI CODE LOGIC ---
    const konamiCode = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
    let keyHistory: string[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't register keys in the black hole or on the enter screen
      if (isImploding || showEnterScreenRef.current) return;

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

      // 4. Force Reload to Trigger Big Bang via EnterScreen (it starts on the Big Bang this once)
      sessionStorage.setItem("after-big-crunch", "1");
      window.location.reload();
    }, 2500); // 2.5s duration matches the sound effect
  };

  // Honour a #hash once the sections actually exist. The browser tries on load,
  // but the sections only render once the page has started (isLoaded), so
  // there is nothing to scroll to at that moment and it gives up. Affects any deep link to the
  // site, not only the terminal's framed preview.
  useEffect(() => {
    if (!isLoaded || showEnterScreen) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    // scrollToSection re-reads the target's live position each frame, which
    // matters here because Projects loads asynchronously and shifts the page
    // underneath the scroll.
    const t = setTimeout(() => {
      if (document.getElementById(id)) scrollToSection(`#${id}`);
    }, 350);
    return () => clearTimeout(t);
  }, [isLoaded, showEnterScreen]);

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
    {
      name: "Arcade",
      link: "/arcade",
      icon: <IconDeviceGamepad2 className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
  ];

  return (
    // Framer's slim core for the first screen: the entry screen, the fragments and
    // the black hole animate with m components and only the features they use
    // (domAnimation). The sections, in their own chunk, bring the rest with them
    <LazyMotion features={domAnimation}>
    <CollectiblesProvider>
      {/* Progress Bar - Hide during implosion */}
      {!showEnterScreen && !isImploding && <ScrollProgress />}
      {/* Pauses the CSS decorations that are out of view */}
      {!showEnterScreen && <OffscreenPause />}

      <AnimatePresence>
        {showEnterScreen && (
          <EnterScreen onAnimationComplete={handleEnterComplete} onReveal={() => setRevealing(true)} variant={entry ?? undefined} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(!showEnterScreen || revealing) && (
          // Pass isImploding to background to control stars
          <AnimatedBackground isImploding={isImploding}>

            {/* 
              FIX: BackToTop moved OUTSIDE the transformed m.div so 'position: fixed' works correctly.
              We add a transition wrapper so it still disappears during the black hole event.
            */}
            <div className={`relative z-50 transition-opacity duration-500 ${isImploding ? "opacity-0" : "opacity-100"}`}>
              <BackToTop />
              <CollectibleHUD isImploding={isImploding} onCosmicReset={triggerCosmicReset} />
              <MobileNotice />
              <FlightPath />
            </div>

            {/* The singularity itself - fixed at viewport centre, outside the imploding transform */}
            {isImploding && <BlackHoleOverlay />}

            {/* Section-keyed ambient tint behind the page content */}
            {!isImploding && <AmbientGlow />}

            {/* Hyperspace streaks on section warps (renders null while idle) */}
            <WarpOverlay />

            {/* Asteroid shooter over the live page (renders null until triggered) */}
            <DefenseMode />

            {/* Peek-a-boo alien after 30s of inactivity */}
            {!isImploding && <IdleAlien />}

            {/* Who else is aboard right now (the flight path's other ships, the footer's line) */}
            <Presence />

            {/* Ask Mission Control about Miit (the button above the rocket, or the command menu) */}
            {!isImploding && <MissionControl />}

            {/* This Motion Div handles the Spaghettification of the UI */}
            <m.div
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

              <SectionDivider variant="comet" section="workex" />
              <Reveal>
                <div className="relative">
                  <WorkExp />
                  <Collectible id="workex" className="top-10 right-6 md:right-16" />
                </div>
              </Reveal>
              <SectionDivider variant="planet" section="education" />
              <Reveal>
                <div className="relative">
                  <Education />
                  <Collectible id="education" className="top-12 left-6 md:left-16" />
                </div>
              </Reveal>
              <SectionDivider variant="constellation" section="skills-achievements" />
              <Reveal>
                <div className="relative">
                  <SkillsAndAchievements />
                  <Collectible id="skills" className="bottom-12 right-8 md:right-20" />
                </div>
              </Reveal>
              <SectionDivider variant="nova" section="projects" />
              <Reveal>
                <div className="relative">
                  <Projects />
                  <Collectible id="projects" className="top-12 left-8 md:left-20" />
                </div>
              </Reveal>
              {/* the crew arcade, where people will see it */}
              <Reveal>
                <ArcadeTeaser />
              </Reveal>
              <SectionDivider variant="galaxy" section="publications" />
              <Reveal>
                <div className="relative">
                  <Publications />
                  <Collectible id="publications" className="bottom-14 right-8 md:right-24" />
                </div>
              </Reveal>
              <SectionDivider variant="rocket" section="contact" />
              <Reveal>
                <Contact />
              </Reveal>

            </m.div>
          </AnimatedBackground>
        )}
      </AnimatePresence>
    </CollectiblesProvider>
    </LazyMotion>
  );
};

export default Home;