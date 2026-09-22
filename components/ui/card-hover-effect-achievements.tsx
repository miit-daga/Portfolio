"use client";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useState, useRef } from "react";
import { Card, CardTitle, CardDescription } from "./card-hover-effect-publications";
import { Medal, placeFromTitle } from "./medal";

export const HoverEffectAchievements = ({
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
                        key={item.title}
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

    return (
        <motion.div
            className={cn(
                "relative group block p-2 h-full perspective-1000",
                isLonelyItem ? "md:w-1/2 lg:w-1/2" : "w-full",
                isLonelyItem && "md:col-span-2 md:justify-self-center lg:col-span-2 lg:justify-self-center",
            )}
            style={{ perspective: 1000 }}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="h-full w-full"
            >
                <Link
                    ref={ref}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full w-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <AnimatePresence>
                        {hoveredIndex === idx && (
                            <motion.span
                                className="absolute inset-0 h-full w-full block rounded-3xl"
                                layoutId="hoverBackgroundAchievements"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    transform: "translateZ(-10px)",
                                    background:
                                        "linear-gradient(to bottom right, rgba(var(--accent-rgb, 45, 212, 191), 0.2), rgba(var(--accent-rgb-2, 59, 130, 246), 0.16), rgba(var(--accent-rgb, 45, 212, 191), 0.08))",
                                }}
                            />
                        )}
                    </AnimatePresence>
                    <div style={{ transform: "translateZ(20px)" }} className="h-full">
                        <Card className="w-full h-full" isHovered={hoveredIndex === idx}>
                            <div className="flex flex-col items-center text-center p-4">
                                <Medal
                                    place={placeFromTitle(item.title)}
                                    isHovered={hoveredIndex === idx}
                                    pointerX={mouseXSpring}
                                    pointerY={mouseYSpring}
                                />
                                <CardTitle className="mt-0">{item.title}</CardTitle>
                                <CardDescription className="mt-2">{item.description}</CardDescription>
                            </div>
                        </Card>
                    </div>
                </Link>
            </motion.div>
        </motion.div>
    );
};