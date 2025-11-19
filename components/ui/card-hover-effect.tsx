"use client";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useState, useRef } from "react";

export const HoverEffect = ({
  items,
  className,
  column = 3,
}: {
  items: {
    title: string;
    description: string;
    link: string;
  }[];
  className?: string;
  column?: 2 | 3;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const flexContainerClasses = cn("flex flex-wrap justify-center py-10", className);

  return (
    <div className={flexContainerClasses}>
      {items.map((item, idx) => (
        <TiltCard
          key={item?.link}
          item={item}
          idx={idx}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
          column={column}
        />
      ))}
    </div>
  );
};

// --- New Tilt Card Wrapper ---
const TiltCard = ({
  item,
  idx,
  hoveredIndex,
  setHoveredIndex,
  column,
}: {
  item: { title: string; description: string; link: string };
  idx: number;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  column: 2 | 3;
}) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    x.set(0);
    y.set(0);
  };

  let itemResponsiveBasisClasses: string[];
  if (column === 3) {
    itemResponsiveBasisClasses = ["basis-full", "md:basis-1/2", "lg:basis-1/3"];
  } else {
    itemResponsiveBasisClasses = ["basis-full", "md:basis-1/2", "lg:basis-1/2"];
  }
  const linkWrapperBaseClasses = ["relative", "group", "block", "p-2", "flex-shrink-0", "perspective-1000"];

  return (
    <motion.div
      className={cn(linkWrapperBaseClasses, ...itemResponsiveBasisClasses)}
      style={{ perspective: 1000 }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="h-full w-full"
      >
        <Link
          ref={ref}
          href={item?.link}
          target="_blank"
          rel="noopener noreferrer"
          className="h-full w-full block"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-teal-500/20 block rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ transform: "translateZ(-10px)" }} // Push background slightly back
              />
            )}
          </AnimatePresence>

          {/* Card Content with Lift */}
          <div style={{ transform: "translateZ(20px)" }} className="h-full">
            <Card className="w-full h-full" isHovered={hoveredIndex === idx}>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </Card>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
};

export const Card = ({
  className,
  children,
  isHovered = false,
}: {
  className?: string;
  children: React.ReactNode;
  isHovered?: boolean;
}) => {
  return (
    <motion.div
      className={cn(
        "rounded-2xl h-full p-4 overflow-hidden border relative z-20",
        className
      )}
      style={{
        backdropFilter: "blur(120px)", // Hardcoded high blur
        WebkitBackdropFilter: "blur(120px)", // Safari support
        background: "rgba(0, 0, 0, 0.6)", // Darker background to show the frosting
      }}
      animate={{
        borderColor: isHovered ? "rgba(148, 163, 184, 0.7)" : "rgba(255, 255, 255, 0.15)",
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </motion.div>
  );
};

export const CardTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <h4
      className={cn(
        "text-zinc-100 font-bold tracking-wide mt-4 group-hover:text-white transition-colors duration-300",
        className
      )}
    >
      {children}
    </h4>
  );
};

export const CardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <p
      className={cn(
        "mt-8 text-zinc-400 tracking-wide leading-relaxed text-sm group-hover:text-zinc-300 transition-colors duration-300",
        className
      )}
    >
      {children}
    </p>
  );
};