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
    languages?: Record<string, number>;
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
  item: { title: string; description: string; link: string; languages?: Record<string, number> };
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
          className="h-full w-full block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
            <Card className="w-full h-full" isHovered={hoveredIndex === idx} languages={item.languages}>
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
  languages,
}: {
  className?: string;
  children: React.ReactNode;
  isHovered?: boolean;
  languages?: Record<string, number>;
}) => {
  const langEntries = languages
    ? Object.entries(languages).sort(([, a], [, b]) => b - a)
    : [];
  const totalBytes = langEntries.reduce((sum, [, bytes]) => sum + bytes, 0);

  return (
    <motion.div
      className={cn(
        "rounded-2xl h-full p-4 overflow-hidden relative z-20 meteor-border",
        isHovered && "meteor-active",
        className
      )}
      style={{
        backdropFilter: "blur(120px)",
        WebkitBackdropFilter: "blur(120px)",
        background: "rgba(0, 0, 0, 0.6)",
      }}
      animate={{
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div className="relative z-50">
        <div className="p-4">
          {children}
          {langEntries.length > 0 && (
            <motion.div
              className="mt-5 overflow-hidden"
              animate={{
                opacity: isHovered ? 1 : 0,
                height: isHovered ? "auto" : 0,
              }}
              initial={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Signal frequency header */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-px flex-1 bg-gradient-to-r from-teal-500/40 to-transparent" />
                <span className="text-[9px] uppercase tracking-[0.2em] text-teal-500/60 font-mono">Signal Freq</span>
                <div className="h-px flex-1 bg-gradient-to-l from-teal-500/40 to-transparent" />
              </div>
              {/* Frequency rows */}
              <div className="flex flex-col gap-1.5">
                {langEntries.slice(0, 4).map(([lang, bytes], i) => {
                  const pct = (bytes / totalBytes) * 100;
                  const color = langColor(lang);
                  return (
                    <div key={lang} className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-zinc-500 w-[52px] truncate flex-shrink-0">
                        {lang}
                      </span>
                      {/* Signal bar track */}
                      <div className="flex-1 h-[6px] rounded-sm overflow-hidden relative"
                        style={{
                          background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 4px)",
                        }}
                      >
                        {/* Filled signal bar */}
                        <motion.div
                          className="h-full rounded-sm relative"
                          initial={{ width: 0 }}
                          animate={{ width: isHovered ? `${Math.max(pct, 3)}%` : "0%" }}
                          transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                          style={{
                            background: `linear-gradient(90deg, ${color}cc, ${color})`,
                            boxShadow: `0 0 8px ${color}80, 0 0 2px ${color}40`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 w-[32px] text-right flex-shrink-0">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
                {langEntries.length > 4 && (
                  <span className="text-[8px] font-mono text-zinc-600 text-right">
                    +{langEntries.length - 4} more
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// GitHub-style language colors
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Lua: "#000080",
  "Vim Script": "#199f4b",
  Dockerfile: "#384d54",
  "Jupyter Notebook": "#DA5B0B",
  Makefile: "#427819",
  Nix: "#7e7eff",
};

function langColor(lang: string): string {
  return LANG_COLORS[lang] || "#6e7681";
}

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