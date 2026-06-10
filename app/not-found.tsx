"use client";

import Link from "next/link";
import { RocketIcon } from "@/components/ui/rocket";
import { motion, useReducedMotion } from "framer-motion";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { Dodge404 } from "@/components/ui/dodge-404";

export default function NotFound() {
    const shouldReduceMotion = useReducedMotion();

    const floatAnimation = shouldReduceMotion
        ? {}
        : {
            y: [0, -20, 0],
            rotate: [0, -5, 5, 0],
            transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut" as const,
            },
        };

    return (
        <div className="min-h-screen w-full relative overflow-hidden bg-black text-white font-sans">
            <BackgroundGradientAnimation containerClassName="absolute inset-0 opacity-20" />

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-14 text-center">
                <motion.div
                    animate={floatAnimation}
                    className="w-24 h-24 md:w-36 md:h-36 mb-6 text-neutral-400"
                >
                    <RocketIcon className="w-full h-full text-neutral-400" isIgnited={!shouldReduceMotion} />
                </motion.div>

                <h1 className="font-display text-6xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                    404
                </h1>

                <h2 className="text-2xl md:text-4xl font-light text-neutral-300 mt-4 mb-6">
                    Houston, we have a problem.
                </h2>

                <p className="text-neutral-400 max-w-lg mb-8 text-lg">
                    The coordinates you entered seem to lead to a black hole.
                    Let's get you back to safe territory.
                </p>

                <Link href="/">
                    <button className="px-8 py-3 rounded-full bg-teal-500/10 border border-teal-500/50 text-teal-400 hover:bg-teal-500/20 hover:text-teal-300 transition-all duration-300 font-medium tracking-wide group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
                        <span className="relative z-10">Return to Base</span>
                        <div className="absolute inset-0 bg-teal-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    </button>
                </Link>

                <div className="mt-12">
                    <Dodge404 />
                </div>
            </div>
        </div>
    );
}