"use client"
import { cn } from "@/utils/cn"
import type React from "react"

import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { useState } from "react"

export const HoverEffectPublications = ({
  items,
  className,
}: {
  items: {
    title: string
    description: string
    link: string
  }[]
  className?: string
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 py-10", className)}>
      {items.map((item, idx) => {
        const isLastItem = idx === items.length - 1
        const isLonelyItem = isLastItem && items.length % 2 === 1

        return (
          <Link
            key={item?.link}
            href={item?.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "relative group block p-2 h-full",
              isLonelyItem ? "md:w-1/2 lg:w-1/2" : "w-full",
              isLonelyItem && "md:col-span-2 md:justify-self-center lg:col-span-2 lg:justify-self-center",
            )}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence>
              {hoveredIndex === idx && (
                <motion.span
                  className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-teal-500/20 block rounded-3xl"
                  layoutId="hoverBackgroundPublications"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>
            <Card className="w-full h-full" isHovered={hoveredIndex === idx}>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export const Card = ({
  className,
  children,
  isHovered = false,
}: {
  className?: string
  children: React.ReactNode
  isHovered?: boolean
}) => {
  return (
    <motion.div
      className={cn(
        "rounded-2xl h-full p-4 overflow-hidden bg-black/30 border border-transparent dark:border-white/[0.2] relative z-20 backdrop-blur-sm",
        className,
      )}
      animate={{
        borderColor: isHovered ? "rgba(148, 163, 184, 0.7)" : "rgba(255, 255, 255, 0.2)",
        backgroundColor: isHovered ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.3)",
        scale: isHovered ? 1.02 : 1,
        boxShadow: isHovered
          ? "0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)"
          : "0 0px 0px 0px rgba(59, 130, 246, 0)",
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
  )
}

export const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return (
    <h4
      className={cn(
        "text-zinc-100 font-bold tracking-wide mt-4 group-hover:text-white transition-colors duration-300",
        className,
      )}
    >
      {children}
    </h4>
  )
}

export const CardDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return (
    <p
      className={cn(
        "mt-8 text-zinc-400 tracking-wide leading-relaxed text-sm group-hover:text-zinc-300 transition-colors duration-300",
        className,
      )}
    >
      {children}
    </p>
  )
}