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

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: JSX.Element;
  }[];
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAtVeryTop, setIsAtVeryTop] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const initialScrollY = scrollYProgress.get();
    setIsAtVeryTop(initialScrollY < 0.05);
    lastScrollY.current = initialScrollY;

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - lastScrollY.current;
      setIsAtVeryTop(current < 0.05);

      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }

      if (current < 0.05) {
        setVisible(true);
      } else {
        if (direction < 0 && current > 0.01) {
          setVisible(true);
          autoHideTimerRef.current = setTimeout(() => {
            setVisible(false);
          }, 3000);
        } else if (direction > 0) {
          setVisible(false);
        }
      }
      lastScrollY.current = current;
    }
  });

  const resumeLink = process.env.NEXT_PUBLIC_RESUME_LINK;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="floating-nav"
        initial={{ y: -100, opacity: 0 }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "flex max-w-fit fixed top-10 inset-x-0 mx-auto rounded-full text-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4",
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
            className={cn(
              "relative text-white items-center flex space-x-1 hover:text-neutral-300"
            )}
          >
            <span className="block sm:hidden">{navItem.icon}</span>
            <span className="hidden sm:block text-sm">{navItem.name}</span>
          </Link>
        ))}
        <Link href={resumeLink!} target="_blank" rel="noopener noreferrer">
          <button className={cn(
            "text-sm font-medium relative px-4 py-2 rounded-full",
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
  );
};