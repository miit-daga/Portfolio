"use client"
import { cn } from "@/utils/cn"
import type React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { useState } from "react"
import { Card, CardTitle, CardDescription } from "./card-hover-effect-publications"
import { IconAward } from "@tabler/icons-react"

export const HoverEffectAchievements = ({
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
                        key={item.title}
                        href={item.link}
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
                                    layoutId="hoverBackgroundAchievements"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                        </AnimatePresence>
                        <Card className="w-full h-full" isHovered={hoveredIndex === idx}>
                            <div className="flex flex-col items-center text-center p-4">
                                <div className="mb-4 flex items-center justify-center h-16 w-16 rounded-full bg-black/50">
                                    <IconAward className="h-8 w-8 text-neutral-200" />
                                </div>
                                <CardTitle className="mt-0">{item.title}</CardTitle>
                                <CardDescription className="mt-2">{item.description}</CardDescription>
                            </div>
                        </Card>
                    </Link>
                )
            })}
        </div>
    )
}