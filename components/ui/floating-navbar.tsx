"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { IconFileText } from "@tabler/icons-react";
import { MagneticWrapper } from "./magnetic-wrapper";

export const FloatingNav = ({
  navItems,
  className,
  isImploding = false, // Added Prop
}: {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactElement;
  }[];
  className?: string;
  isImploding?: boolean; // Added Type
}) => {
  const { scrollY } = useScroll();

  const [visible, setVisible] = useState(true);
  const [isAtVeryTop, setIsAtVeryTop] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Refs for logic
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Cleanup timer on unmount
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // --- SCROLL LOGIC (Pixels + Auto-Hide Timer) ---
  useMotionValueEvent(scrollY, "change", (current) => {
    if (typeof current === "number") {
      const previous = scrollY.getPrevious() ?? 0;
      const direction = current - previous;

      // 50px threshold for "Very Top"
      const isTop = current < 50;

      // Always clear existing timer on any scroll event
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (isTop) {
        setIsAtVeryTop(true);
        setVisible(true);
        setActiveSection("");
      } else {
        setIsAtVeryTop(false);

        if (direction < 0) {
          // Scrolling UP -> Show Immediately
          setVisible(true);

          // Start Auto-Hide Timer (2.5s)
          timerRef.current = setTimeout(() => {
            setVisible(false);
            setIsMenuOpen(false);
          }, 2500);

        } else if (direction > 0) {
          // Scrolling DOWN -> Hide Immediately
          setVisible(false);
          setIsMenuOpen(false);
        }
      }
    }
  });

  // --- Intersection Observer for Sections ---
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -35% 0px",
      threshold: 0.1,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (window.scrollY < 100) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(`#${entry.target.id}`);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    navItems.forEach((item) => {
      if (item.link.startsWith("#")) {
        const element = document.getElementById(item.link.substring(1));
        if (element) observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [navItems]);

  const resumeLink = process.env.NEXT_PUBLIC_RESUME_LINK;
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  // COMBINED LOGIC: Show if scrolled up AND not currently imploding
  const shouldShow = visible && !isImploding;

  const navContent = (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key="desktop-nav"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: shouldShow ? 0 : -100, opacity: shouldShow ? 1 : 0 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn(
            "hidden lg:flex max-w-fit fixed top-10 inset-x-0 mx-auto rounded-full text-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4",
            "transition-colors transition-backdrop-filter duration-300 ease-in-out",
            isAtVeryTop && visible
              ? "bg-black/15 backdrop-blur-lg border border-white/[0.3]"
              : "bg-black border border-white/[0.3]",
            className
          )}
          // Optional: Pause auto-hide on hover
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
          }}
          onMouseLeave={() => {
            // Restart timer on leave if not at top
            if (!isAtVeryTop && visible) {
              timerRef.current = setTimeout(() => {
                setVisible(false);
                setIsMenuOpen(false);
              }, 2500);
            }
          }}
        >
          {navItems.map((navItem: any) => {
            const isActive = activeSection === navItem.link;

            return (
              <MagneticWrapper key={navItem.link} strength={0.2}>
                <Link
                  href={navItem.link}
                  target={navItem.name === "Terminal" ? "_blank" : undefined}
                  rel={navItem.name === "Terminal" ? "noopener noreferrer" : undefined}
                  className={cn(
                    "relative items-center flex space-x-1 hidden lg:flex px-2 py-1 transition-colors duration-300",
                    isActive ? "text-teal-400" : "text-white hover:text-neutral-300"
                  )}
                >
                  <span className="text-sm font-bold">
                    {navItem.name}
                  </span>
                </Link>
              </MagneticWrapper>
            );
          })}

          <MagneticWrapper strength={0.2}>
            <Link href={resumeLink!} target="_blank" rel="noopener noreferrer">
              <button
                className={cn(
                  "text-sm font-bold relative px-4 py-2 rounded-full",
                  "transition-colors duration-300 ease-in-out",
                  isAtVeryTop && visible
                    ? "border border-white/[0.3] hover:bg-white/[0.1]"
                    : "border border-white/[0.3] text-white hover:bg-white/10"
                )}
              >
                <span>Resume</span>
                <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px h-px" />
              </button>
            </Link>
          </MagneticWrapper>
        </motion.div>
      </AnimatePresence>

      <div className="lg:hidden">
        <motion.button
          key="mobile-nav-trigger"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: shouldShow ? 0 : -100, opacity: shouldShow ? 1 : 0 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          onClick={toggleMenu}
          className={cn(
            "fixed top-4 left-4 z-[5001] flex items-center justify-center w-10 h-10 rounded-full",
            "transition-colors duration-300 ease-in-out",
            isAtVeryTop
              ? "bg-black/15 backdrop-blur-lg border border-white/[0.3]"
              : "bg-black border border-white/[0.3]"
          )}
          aria-label="Toggle navigation menu"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isMenuOpen ? "close" : "menu"}
              initial={{ opacity: 0, rotate: -30 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 30 }}
              transition={{ duration: 0.2 }}
            >
              {isMenuOpen ? (
                <IconX className="h-6 w-6 text-white" />
              ) : (
                <IconMenu2 className="h-6 w-6 text-white" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleMenu}
                className="fixed inset-0 bg-black/60 z-[4999]"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed top-0 left-0 bottom-0 w-3/4 max-w-xs bg-black/90 backdrop-blur-lg z-[5000] p-8"
              >
                <div className="flex flex-col items-start space-y-6 pt-16">
                  {navItems.map((item, idx) => {
                    const isActive = activeSection === item.link;
                    return (
                      (item as any).isDesktopOnly ? null : (
                        <Link
                          key={`link=${idx}`}
                          href={item.link}
                          target={item.name === "Terminal" ? "_blank" : undefined}
                          rel={item.name === "Terminal" ? "noopener noreferrer" : undefined}
                          onClick={toggleMenu}
                          className={cn(
                            "flex items-center space-x-4 text-lg font-semibold transition-colors",
                            isActive ? "text-teal-400" : "text-white hover:text-neutral-300"
                          )}
                        >
                          <span className="w-6 flex items-center justify-center">
                            {React.cloneElement(item.icon as any, {
                              className: cn("h-5 w-5", isActive ? "text-teal-400" : "text-white"),
                            })}
                          </span>
                          <span>{item.name}</span>
                        </Link>
                      )
                    );
                  })}
                  <Link
                    href={resumeLink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={toggleMenu}
                    className="flex items-center space-x-4 text-white text-lg font-semibold hover:text-neutral-300 transition-colors"
                  >
                    <span className="w-6 flex items-center justify-center">
                      <IconFileText className="h-5 w-5 text-white" />
                    </span>
                    <span>Resume</span>
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  // Only render via portal once mounted to avoid hydration mismatch
  if (!mounted) return null;

  return createPortal(navContent, document.body);
};