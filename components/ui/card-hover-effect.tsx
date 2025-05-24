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

  const gridClasses = column === 3
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 py-10";

  return (
    <div className={cn(gridClasses, className)}>
      {items.map((item, idx) => {
        const isLastItem = idx === items.length - 1;
        const totalItems = items.length;

        // Calculate if last item is lonely
        const isLonelyOnLg = column === 3
          ? (totalItems % 3 === 1 && isLastItem)
          : (totalItems % 2 === 1 && isLastItem);

        const isLonelyOnMd = totalItems % 2 === 1 && isLastItem;

        // Base classes for the Link wrapper
        const linkWrapperClasses = ["relative", "group", "block", "p-2", "h-full", "w-full"];

        // Handle centering for lonely items
        if (isLonelyOnLg) {
          if (column === 3) {
            // For 3-column layout, place lonely item in center column (column 2)
            linkWrapperClasses.push("lg:col-start-2");
          } else {
            // For 2-column layout, span both columns and center the content
            linkWrapperClasses.push("lg:col-span-2", "lg:flex", "lg:justify-center");
            // Remove w-full and add specific width for centering
            const wFullIndex = linkWrapperClasses.indexOf("w-full");
            if (wFullIndex !== -1) {
              linkWrapperClasses.splice(wFullIndex, 1);
            }
            linkWrapperClasses.push("lg:w-1/2");
          }
        }

        if (isLonelyOnMd && column === 3) {
          // For MD breakpoint with 2 columns, span both and center
          linkWrapperClasses.push("md:col-span-2", "md:flex", "md:justify-center");
          // Remove w-full and add specific width for centering
          const wFullIndex = linkWrapperClasses.indexOf("w-full");
          if (wFullIndex !== -1) {
            linkWrapperClasses.splice(wFullIndex, 1);
          }
          linkWrapperClasses.push("md:w-1/2");
        }

        return (
          <Link
            href={item?.link}
            key={item?.link}
            className={cn(linkWrapperClasses)}
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
