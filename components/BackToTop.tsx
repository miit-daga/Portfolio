"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RocketIcon } from "@/components/ui/rocket";

export const BackToTop = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Show button when page is scrolled down
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 500) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        setIsLaunching(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        // Reset launch state after animation finishes
        setTimeout(() => setIsLaunching(false), 1000);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-8 right-8 z-[5000]"
                >
                    <button
                        onClick={scrollToTop}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 hover:border-teal-500/50 transition-all group shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        aria-label="Back to top"
                    >
                        <div className="w-6 h-6 md:w-8 md:h-8 relative overflow-visible">
                            <motion.div
                                // If launching, fly up off screen. If just hovering, shake slightly.
                                animate={isLaunching ? { y: -100, opacity: 0 } : { y: 0, opacity: 1 }}
                                transition={{ duration: isLaunching ? 0.8 : 0.2, ease: isLaunching ? "easeIn" : "linear" }}
                            >
                                {/* Ignite the engine on hover or during launch */}
                                <RocketIcon className="w-full h-full" isIgnited={isHovered || isLaunching} />
                            </motion.div>
                        </div>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};