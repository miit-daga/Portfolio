"use client";
import { socials } from "@/constants";
import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

const MagneticIcon = ({ children, url }: { children: React.ReactNode; url: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current?.getBoundingClientRect() || { height: 0, width: 0, left: 0, top: 0 };
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);

    // Move the icon slightly towards the mouse (magnetic effect)
    // Factor 0.3 controls the "strength" of the magnet
    setPosition({ x: middleX * 0.3, y: middleY * 0.3 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-500/50 transition-colors group"
      >
        {children}
      </Link>
    </motion.div>
  );
};

const Socials = () => {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-center my-10 sm:my-14 px-4">
      {socials.map((social) => {
        const Icon = social.icon as React.ComponentType<{ className?: string }>;
        return (
          <MagneticIcon key={social.key} url={social.url}>
            <Icon className="h-5 w-5 text-neutral-300 group-hover:text-teal-400 transition-colors" />
            <span className="text-neutral-300 group-hover:text-white font-medium">{social.name}</span>
          </MagneticIcon>
        );
      })}
    </div>
  );
};

export default Socials;