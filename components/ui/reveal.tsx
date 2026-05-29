"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export const Reveal = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      // Fire once ~25% of the section is actually on screen, so the rise plays
      // while it's in the reading zone (not while it's still off the bottom edge).
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.8,
        ease: [0.21, 0.47, 0.32, 0.98],
        delay,
      }}
    >
      {children}
    </motion.div>
  );
};
