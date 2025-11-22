"use client";
import React, { useRef, useState, MouseEvent } from "react";
import { cn } from "@/lib/utils";

export const Spotlight = ({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;

        const div = divRef.current;
        const rect = div.getBoundingClientRect();

        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/50 text-neutral-200",
                className
            )}
        >
            <div
                className="pointer-events-none absolute -inset-px transition duration-300"
                style={{
                    opacity,
                    // CHANGED: 600px -> 120px for a focused beam
                    // CHANGED: Opacity 0.15 -> 0.25 for better visibility
                    background: `radial-gradient(120px circle at ${position.x}px ${position.y}px, rgba(45,212,191,0.25), transparent 40%)`,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
};