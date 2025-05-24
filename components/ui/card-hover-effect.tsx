"use client";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

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
  let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const flexContainerClasses = cn(
    "flex flex-wrap justify-center py-10",
    className
  );

  return (
    <div className={flexContainerClasses}>
      {items.map((item, idx) => {
        let itemResponsiveBasisClasses: string[];
        if (column === 3) {
          itemResponsiveBasisClasses = ["basis-full", "md:basis-1/2", "lg:basis-1/3"];
        } else {
          itemResponsiveBasisClasses = ["basis-full", "md:basis-1/2", "lg:basis-1/2"];
        }
        const linkWrapperBaseClasses = ["relative", "group", "block", "p-2", "flex-shrink-0"];

        return (
          <Link
            href={item?.link}
            target="_blank"
            rel="noopener noreferrer"
            key={item?.link}
            className={cn(linkWrapperBaseClasses, ...itemResponsiveBasisClasses)}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence>
              {hoveredIndex === idx && (
                <motion.span
                  className="absolute inset-0 h-full w-full bg-neutral-200 dark:bg-slate-800/[0.8] block rounded-3xl"
                  layoutId="hoverBackground"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.15 },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.2 },
                  }}
                />
              )}
            </AnimatePresence>
            <Card className="w-full h-full">
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl h-full p-4 overflow-hidden bg-black border border-transparent dark:border-white/[0.2] group-hover:border-slate-700 relative z-20",
        className
      )}
    >
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </div>
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
    <h4 className={cn("text-zinc-100 font-bold tracking-wide mt-4", className)}>
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
        "mt-8 text-zinc-400 tracking-wide leading-relaxed text-sm",
        className
      )}
    >
      {children}
    </p>
  );
};