"use client";

import { useState } from "react";
import Heading from "./Heading";
import Socials from "./Socials";
import { IconMail, IconPhone, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export function Contact() {
    const [copied, setCopied] = useState(false);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevents the default browser right-click menu
        navigator.clipboard.writeText("miitcodes27@gmail.com");
        setCopied(true);

        // Reset back to original text after 2 seconds
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative w-full overflow-clip pt-16 pb-10" id="contact">
            <Heading text="Let's Connect" />

            <div className="mt-10 mx-auto max-w-2xl text-center px-4">
                <p className="text-base md:text-lg text-neutral-300">
                    I am currently open to new opportunities and collaborations. If you have a question, a project, or simply want to say hello, feel free to reach out. I will get back to you as soon as possible.
                </p>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-center gap-8 mt-12">

                    {/* Email Container */}
                    <div className="group relative flex flex-col items-center justify-center mx-auto md:mx-0">
                        <a
                            href="mailto:miitcodes27@gmail.com"
                            onContextMenu={handleContextMenu}
                            className={cn(
                                "flex items-center gap-3 text-lg font-semibold transition-all duration-300",
                                copied ? "text-green-400 scale-105" : "text-neutral-200 hover:text-teal-400"
                            )}
                        >
                            {copied ? (
                                <IconCheck className="h-6 w-6 text-green-500" />
                            ) : (
                                <IconMail className="h-6 w-6 text-teal-500" />
                            )}

                            <span>
                                {copied ? "Email Copied!" : "miitcodes27@gmail.com"}
                            </span>
                        </a>

                        {/* Helper Text */}
                        <span className="absolute -bottom-6 text-[10px] uppercase tracking-wider text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                            Left-click to Send • Right-click to Copy
                        </span>
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col items-center justify-center mx-auto md:mx-0">
                        <a
                            href="tel:+917003816564"
                            className="flex items-center gap-3 text-lg font-semibold text-neutral-200 hover:text-teal-400 transition-colors duration-300"
                        >
                            <IconPhone className="h-6 w-6 text-teal-500" />
                            +91 7003816564
                        </a>
                    </div>
                </div>
            </div>

            <div className="mt-16 mb-20">
                <Socials />
            </div>

            {/* --- FOOTER / EASTER EGG HINT --- */}
            <div className="border-t border-white/10 pt-8 pb-4 flex flex-col items-center gap-4">
                <p className="text-neutral-500 text-sm">
                    © {new Date().getFullYear()} Miit Daga. All rights reserved.
                </p>

                {/* The Catchy Hint */}
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

// Small helper component for the Keyboard Keys visual
const Kbd = ({ children }: { children: React.ReactNode }) => {
    return (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-white/10 border border-white/20 text-[10px] font-bold font-mono text-neutral-300 shadow-[0_2px_0_rgba(255,255,255,0.1)] group-hover:bg-teal-500/20 group-hover:border-teal-500/50 group-hover:text-teal-200 group-hover:shadow-[0_0_10px_rgba(45,212,191,0.5)] transition-all duration-300">
            {children}
        </span>
    );
};