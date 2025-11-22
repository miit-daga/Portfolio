"use client";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useState, useRef } from "react";

export const HoverEffectPublications = ({
  items,
  className,
}: {
  items: {
    title: string;
    description: string;
    link: string;
  }[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 py-10", className)}>
      {items.map((item, idx) => {
        const isLastItem = idx === items.length - 1;
        const isLonelyItem = isLastItem && items.length % 2 === 1;

        return (
          <TiltCard
            key={idx}
            item={item}
            idx={idx}
            isLonelyItem={isLonelyItem}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
          />
        );
      })}
    </div>
  );
};

const TiltCard = ({
  item,
  idx,
  isLonelyItem,
  hoveredIndex,
  setHoveredIndex,
}: {
  item: { title: string; description: string; link: string };
  idx: number;
  isLonelyItem: boolean;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const hasValidLink = item?.link && item.link.trim() !== "";

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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

  const Content = (
    <>
      <AnimatePresence>
        {hoveredIndex === idx && (
          <motion.span
            className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-teal-500/20 block rounded-3xl"
            layoutId="hoverBackgroundPublications"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ transform: "translateZ(-10px)" }}
          />
        )}
      </AnimatePresence>

      <div style={{ transform: "translateZ(20px)" }} className="h-full">
        <Card className="w-full h-full" isHovered={hoveredIndex === idx}>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </Card>
      </div>
    </>
  );

  const wrapperClass = cn(
    "relative group block p-2 h-full perspective-1000",
    isLonelyItem ? "md:w-1/2 lg:w-1/2" : "w-full",
    isLonelyItem && "md:col-span-2 md:justify-self-center lg:col-span-2 lg:justify-self-center"
  );

  return (
    <motion.div
      className={wrapperClass}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setHoveredIndex(idx)}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="h-full w-full"
      >
        {hasValidLink ? (
          <Link
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="h-full w-full block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {Content}
          </Link>
        ) : (
          <div className="h-full w-full block">
            {Content}
          </div>
        )}
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
        backdropFilter: "blur(120px)",
        WebkitBackdropFilter: "blur(120px)",
        background: "rgba(0, 0, 0, 0.6)",
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
export const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => {
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

export const CardDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => {
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