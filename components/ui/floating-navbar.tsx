"use client";
import React, { useState, useRef, useEffect } from "react";
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

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactElement;
  }[];
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();

  const [visible, setVisible] = useState(true);
  const [isAtVeryTop, setIsAtVeryTop] = useState(true);
  const lastScrollY = useRef(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - lastScrollY.current;
      const isCurrentlyAtTop = current < 0.05;

      if (isCurrentlyAtTop) {
        setVisible(true);
      } else {
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
          setIsMenuOpen(false);
        }
      }
      setIsAtVeryTop(isCurrentlyAtTop);
      lastScrollY.current = current;
    }
  });

  const resumeLink = process.env.NEXT_PUBLIC_RESUME_LINK;
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key="desktop-nav"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn(
            "hidden sm:flex max-w-fit fixed top-10 inset-x-0 mx-auto rounded-full text-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4",
            "transition-colors transition-backdrop-filter duration-300 ease-in-out",
            isAtVeryTop && visible
              ? "bg-black/15 backdrop-blur-lg border border-white/[0.3]"
              : "bg-black border border-white/[0.3]",
            className
          )}
        >
          {navItems.map((navItem: any) => (
            <Link
              key={navItem.link}
              href={navItem.link}
              className="relative text-white items-center flex space-x-1 hover:text-neutral-300"
            >
              <span className="hidden sm:block text-sm font-bold">
                {navItem.name}
              </span>
            </Link>
          ))}
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
        </motion.div>
      </AnimatePresence>

      <div className="sm:hidden">
        <motion.button
          key="mobile-nav-trigger"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
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
                  {navItems.map((item, idx) => (
                    <Link
                      key={`link=${idx}`}
                      href={item.link}
                      onClick={toggleMenu}
                      className="flex items-center space-x-4 text-white text-lg font-semibold hover:text-neutral-300 transition-colors"
                    >
                      <span className="w-6 flex items-center justify-center">
                        {React.cloneElement(item.icon as any, {
                          className: "h-5 w-5 text-white",
                        })}
                      </span>
                      <span>{item.name}</span>
                    </Link>
                  ))}
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
};