"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

const CHARS = "-_~=\\/[]{}!@#$%^&*()+<>";

export const CipherText = ({
    text,
    className,
}: {
    text: string;
    className?: string;
}) => {
    const [displayText, setDisplayText] = useState(text); // Start with text for SEO
    const elementRef = useRef<HTMLSpanElement>(null);

    // Changed: Removed margin to trigger immediately when visible
    const isInView = useInView(elementRef, { once: true });

    useEffect(() => {
        if (!isInView) return;

        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayText(() =>
                text
                    .split("")
                    .map((letter, index) => {
                        // If the character is a space, keep it a space
                        if (letter === " ") return " ";

                        if (index < iteration) {
                            return text[index];
                        }
                        return CHARS[Math.floor(Math.random() * CHARS.length)];
                    })
                    .join("")
            );

            if (iteration >= text.length) {
                clearInterval(interval);
            }

            iteration += 1 / 3; // Speed of decryption
        }, 30); // 30ms update rate

        return () => clearInterval(interval);
    }, [isInView, text]);

    return (
        <span ref={elementRef} className={cn(className)}>
            {displayText}
        </span>
    );
};