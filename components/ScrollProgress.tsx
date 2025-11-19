"use client";
import { motion, useScroll, useSpring } from "framer-motion";

export const ScrollProgress = () => {
    const { scrollYProgress } = useScroll();

    // Smooth spring animation
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-teal-500 to-teal-300 origin-left z-[6000] shadow-[0_0_10px_rgba(45,212,191,0.5)]"
            style={{ scaleX }}
        />
    );
};