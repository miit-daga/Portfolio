"use client";
import { motion } from "framer-motion";
import { useMemo } from "react";

export const Galaxy = () => {
    // Generate star positions for the galaxy arms
    const particles = useMemo(() => {
        const armCount = 3;
        const starsPerArm = 35;
        const items = [];

        for (let arm = 0; arm < armCount; arm++) {
            for (let i = 0; i < starsPerArm; i++) {
                // Percentage distance from center (0 to 1)
                const t = i / starsPerArm;

                // Spiral Mathematics
                const angle = (arm * (360 / armCount)) + (t * 200);

                // REDUCED: Changed multiplier from 240 to 170 for medium spread
                const radius = 30 + (t * 170);

                const spreadX = (Math.random() - 0.5) * 20;
                const spreadY = (Math.random() - 0.5) * 20;

                items.push({
                    key: `${arm}-${i}`,
                    rotation: angle,
                    distance: radius,
                    size: Math.random() * 3 + 1,
                    opacity: 0.8 + (Math.random() * 0.2),
                    color: i % 2 === 0 ? "#2dd4bf" : "#a78bfa",
                    delay: Math.random() * 2,
                    spreadX,
                    spreadY
                });
            }
        }
        return items;
    }, []);

    return (
        // REDUCED: Changed lg:scale-[1.4] to lg:scale-110
        <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center perspective-1000 scale-50 md:scale-100 lg:scale-110 origin-center">
            {/* The Rotating Container */}
            <motion.div
                className="relative w-full h-full transform-style-3d flex items-center justify-center"
                animate={{ rotateZ: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
                {/* Central Core */}
                <div className="absolute w-16 h-16 bg-white rounded-full blur-xl shadow-[0_0_80px_rgba(255,255,255,0.9)] z-10" />
                <div className="absolute w-10 h-10 bg-teal-100 rounded-full blur-md z-20" />

                {/* Particles */}
                {particles.map((p) => (
                    <div
                        key={p.key}
                        className="absolute rounded-full shadow-[0_0_4px_currentColor]"
                        style={{
                            width: p.size,
                            height: p.size,
                            backgroundColor: p.color,
                            color: p.color,
                            opacity: p.opacity,
                            transform: `rotate(${p.rotation}deg) translate(${p.distance}px) translate(${p.spreadX}px, ${p.spreadY}px)`,
                        }}
                    />
                ))}
            </motion.div>

            {/* Background Glow */}
            <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full pointer-events-none" />
        </div>
    );
};