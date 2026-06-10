"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
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
    const reduce = useReducedMotion();

    // Changed: Removed margin to trigger immediately when visible
    const isInView = useInView(elementRef, { once: true });

    // Words kept whole (inline-flex blocks can't break mid-word) with each
    // character's offset into displayText, so glyphs can be rendered into
    // per-character slots sized by the FINAL character. That keeps the layout
    // width-stable during the scramble in a proportional font.
    const tokens = useMemo(() => {
        let offset = 0;
        return text
            .split(/(\s+)/)
            .filter(Boolean)
            .map((part) => {
                const token = { part, offset, isSpace: /^\s+$/.test(part) };
                offset += part.length;
                return token;
            });
    }, [text]);

    useEffect(() => {
        if (!isInView || reduce) return;

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
        }, 30);

        return () => clearInterval(interval);
    }, [isInView, text, reduce]);

    return (
        <span ref={elementRef} className={cn(className)}>
            {/* Real text for screen readers, search engines, and copy/paste;
                the animated glyphs below are presentation-only. */}
            <span className="sr-only">{text}</span>
            {tokens.map(({ part, offset, isSpace }, ti) =>
                isSpace ? (
                    <span key={ti} aria-hidden className="select-none whitespace-pre">
                        {part}
                    </span>
                ) : (
                    <span key={ti} aria-hidden className="inline-flex select-none whitespace-pre">
                        {part.split("").map((ch, i) => (
                            <span key={i} className="inline-block">
                                {/* Zero-width slot paints the live glyph without
                                    affecting layout; the invisible final character
                                    reserves the exact resting width. */}
                                <span className="inline-block w-0">{displayText[offset + i] ?? ch}</span>
                                <span className="invisible">{ch}</span>
                            </span>
                        ))}
                    </span>
                )
            )}
        </span>
    );
};
