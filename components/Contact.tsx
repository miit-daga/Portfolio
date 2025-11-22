"use client";

import { useState } from "react";
import Heading from "./Heading";
import Socials from "./Socials";
import { IconMail, IconPhone, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Constellation } from "./ui/constellation";

export function Contact() {
    const [copied, setCopied] = useState(false);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        navigator.clipboard.writeText("miitcodes27@gmail.com");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative w-full overflow-hidden pt-16 pb-10" id="contact">
            <Heading text="Let's Connect" />

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mt-10">

                {/* Left Side: Text */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-20 order-2 lg:order-1">
                    <p className="text-base md:text-lg text-neutral-300 max-w-lg leading-relaxed">
                        I am currently open to new opportunities. Whether you have a question about my research, a project proposal, or just want to discuss the cosmos of code, my frequencies are open.
                    </p>

                    <div className="flex flex-col gap-6 mt-10 w-full items-center lg:items-start">
                        {/* Email */}
                        <div className="group relative w-fit">
                            <a
                                href="mailto:miitcodes27@gmail.com"
                                onContextMenu={handleContextMenu}
                                className={cn(
                                    "flex items-center gap-4 text-xl font-semibold transition-all duration-300 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-teal-500/30",
                                    copied ? "text-green-400" : "text-neutral-200"
                                )}
                            >
                                {copied ? <IconCheck className="h-6 w-6" /> : <IconMail className="h-6 w-6 text-teal-400" />}
                                <span>{copied ? "Email Copied!" : "miitcodes27@gmail.com"}</span>
                            </a>
                            <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-wider text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Left-click: Send • Right-click: Copy
                            </span>
                        </div>

                        {/* Phone */}
                        <a
                            href="tel:+917003816564"
                            className="w-fit flex items-center gap-4 text-xl font-semibold text-neutral-200 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-teal-500/30 transition-all duration-300"
                        >
                            <IconPhone className="h-6 w-6 text-teal-400" />
                            +91 7003816564
                        </a>
                    </div>

                    {/* Socials - FIXED ALIGNMENT */}
                    <div className="mt-10 w-full">
                        <Socials className="justify-center lg:justify-start" />
                    </div>
                </div>

                {/* Right Side: Constellation */}
                <div className="relative h-[400px] w-full flex items-center justify-center order-1 lg:order-2 overflow-visible">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-blue-500/10 blur-3xl opacity-20 rounded-full" />
                    <Constellation className="relative z-10" />
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 mt-20 pt-8 pb-4 flex flex-col items-center gap-4">
                <p className="text-neutral-500 text-sm">
                    © {new Date().getFullYear()} Miit Daga. All rights reserved.
                </p>
                <div
                    className="group flex flex-col md:flex-row items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-help"
                    title="Enter this code on your keyboard!"
                >
                    <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest group-hover:text-teal-400 transition-colors">
                        Initiate Warp Drive:
                    </span>
                    <div className="flex gap-1.5">
                        <Kbd>↑</Kbd><Kbd>↑</Kbd>
                        <Kbd>↓</Kbd><Kbd>↓</Kbd>
                        <Kbd>←</Kbd><Kbd>→</Kbd>
                        <Kbd>←</Kbd><Kbd>→</Kbd>
                        <Kbd>B</Kbd><Kbd>A</Kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Kbd = ({ children }: { children: React.ReactNode }) => {
    return (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-white/10 border border-white/20 text-[10px] font-bold font-mono text-neutral-300 shadow-[0_2px_0_rgba(255,255,255,0.1)] group-hover:bg-teal-500/20 group-hover:border-teal-500/50 group-hover:text-teal-200 transition-all duration-300">
            {children}
        </span>
    );
};