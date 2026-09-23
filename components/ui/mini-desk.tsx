"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// A small computer in the hero's corner (Hero.tsx): the terminal desk's
// display and tower in miniature, typing commands on its screen. It opens the
// terminal, which on a large screen is the desk (app/terminal/desk.tsx)

const LINES = ["help", "play snake", "sign hi!", "ls /Volumes", "duck", "selfie"];

export function MiniDesk() {
    const reduce = useReducedMotion();
    const [text, setText] = useState("");
    useEffect(() => {
        if (reduce) {
            setText(LINES[0]);
            return;
        }
        let line = 0;
        let at = 0;
        let back = false;
        let id = 0;
        const tick = () => {
            const word = LINES[line];
            if (!back) {
                at += 1;
                setText(word.slice(0, at));
                if (at >= word.length) back = true;
                id = window.setTimeout(tick, at >= word.length ? 1600 : 110);
            } else {
                at -= 1;
                setText(word.slice(0, Math.max(0, at)));
                if (at <= 0) {
                    back = false;
                    line = (line + 1) % LINES.length;
                }
                id = window.setTimeout(tick, at <= 0 ? 400 : 45);
            }
        };
        id = window.setTimeout(tick, 1200);
        return () => window.clearTimeout(id);
    }, [reduce]);

    return (
        <a
            href="/terminal.html"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the terminal: a desk in orbit"
            className="group relative flex items-end gap-1.5 rounded-xl px-1 pt-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
            {/* a caption, on hover */}
            <span className="pointer-events-none absolute -top-3 right-0 whitespace-nowrap rounded-full border border-teal-400/30 bg-black/80 px-2 py-0.5 font-mono text-[10px] text-teal-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                a desk in orbit · step in
            </span>
            <motion.span
                className="flex items-end gap-1.5"
                animate={reduce ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* the display, on its stand */}
                <span className="flex flex-col items-center">
                    <span
                        className="block rounded-[5px] p-[2px] transition-shadow duration-300 group-hover:shadow-[0_0_24px_rgba(45,212,191,0.45)]"
                        style={{ background: "linear-gradient(180deg, #eef0f3, #b3b8c0)" }}
                    >
                        <span className="flex h-[44px] w-[72px] items-start rounded-[3px] border-[3px] border-[#0a0a0b] bg-black px-1 py-0.5 font-mono text-[7px] leading-[9px] text-teal-300">
                            <span className="text-teal-500">$</span>
                            <span className="ml-0.5 break-all">{text}</span>
                            <span className="ml-px inline-block h-[8px] w-[4px] animate-pulse bg-teal-300 motion-reduce:animate-none" />
                        </span>
                    </span>
                    <span className="block h-[8px] w-[12px]" style={{ background: "linear-gradient(90deg, #a9aeb6, #f2f3f5, #c4c8ce)", clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" }} />
                    <span className="block h-[3px] w-[30px] rounded-full bg-[#cfd3d9]" />
                </span>
                {/* the tower, its lattice glowing on hover */}
                <span className="relative mb-[1px] block h-[40px] w-[18px] rounded-[3px] p-[2px]" style={{ background: "linear-gradient(90deg, #a9aeb6, #f2f3f5 55%, #c4c8ce)" }}>
                    <span
                        className="block h-full w-full rounded-[2px] transition-colors duration-300 group-hover:bg-teal-400/60"
                        style={{ backgroundColor: "#8b9099", backgroundImage: "radial-gradient(circle, #1f2937 0.9px, transparent 1.2px)", backgroundSize: "3px 3px" }}
                    />
                </span>
            </motion.span>
        </a>
    );
}
