"use client";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { RocketIcon } from "./ui/rocket"; // Reusing your existing icon

export const ScrollProgress = () => {
    const { scrollYProgress } = useScroll();

    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Map progress 0-1 to percentage 0-100 for the rocket position
    const rocketX = useTransform(scaleX, (value) => `${value * 100}%`);

    return (
        <div className="fixed top-0 left-0 right-0 h-1.5 z-[6000] pointer-events-none">
            {/* The Gradient Line */}
            <motion.div
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-blue-600 via-teal-500 to-teal-300 origin-left shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                style={{ scaleX, width: "100%" }}
            />

            {/* The Rocket Ship Leader */}
            <motion.div
                className="absolute top-1/2 -translate-y-1/2 -ml-3 w-6 h-6 z-10"
                style={{ left: rocketX }}
            >
                {/* Rotate 90deg so it faces right */}
                <div className="rotate-90 transform w-full h-full drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]">
                    <RocketIcon isIgnited={true} />
                </div>
            </motion.div>
        </div>
    );
};