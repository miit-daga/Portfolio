"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Circular count-up gauge. Extracted from Stats so Education can reuse the same
// idiom instead of duplicating a second timeline.
//
// Without `max` the arc simply completes as the number counts up (how Stats has
// always read: "8 publications" has no ceiling). With `max` the arc represents
// the value as a fraction of that ceiling, which is what a score out of 10 or
// 100 actually means.

const R = 50;
const CIRC = 2 * Math.PI * R;

export type GaugeAccent = { hex: string; light: string; rgb: [number, number, number] };

export const TEAL_GAUGE: GaugeAccent = { hex: "#2dd4bf", light: "#818cf8", rgb: [45, 212, 191] };

export function TelemetryGauge({
    value,
    max,
    decimals = 0,
    suffix = "",
    label,
    caption,
    index,
    accent = TEAL_GAUGE,
    duration = 1.5,
    className,
}: {
    value: number;
    /** When set, the arc fills to value/max rather than sweeping all the way round. */
    max?: number;
    decimals?: number;
    suffix?: string;
    label: string;
    /** Small mono line above the label, e.g. "tlm·01". */
    caption?: string;
    index: number;
    accent?: GaugeAccent;
    duration?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    const reduce = useReducedMotion();
    // One eased value drives both the count-up and the ring sweep so they stay in lockstep
    const [progress, setProgress] = useState(0);
    const gradientId = `gauge-grad-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

    useEffect(() => {
        if (!inView) return;
        if (reduce) {
            setProgress(1);
            return;
        }
        let raf = 0;
        let startTs = 0;
        const delay = index * 150; // gauges light up in sequence, left to right
        const tick = (ts: number) => {
            if (!startTs) startTs = ts;
            const t = Math.min(1, Math.max(0, (ts - startTs - delay) / (duration * 1000)));
            setProgress(1 - Math.pow(1 - t, 3)); // easeOutCubic
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, reduce, index, duration]);

    // Fraction of the ring that should be drawn once fully animated.
    const target = max ? Math.min(1, value / max) : 1;
    const swept = target * progress;

    // Tip of the arc in the SVG's own coordinates; the CSS -rotate-90 carries
    // both the dash origin and this dot from 3 o'clock up to 12 o'clock.
    const tipAngle = swept * 2 * Math.PI;
    const tipX = 60 + R * Math.cos(tipAngle);
    const tipY = 60 + R * Math.sin(tipAngle);
    const rgb = accent.rgb.join(",");

    return (
        <div ref={ref} className={cn("group flex flex-col items-center text-center", className)}>
            <div className="relative h-28 w-28 transition-transform duration-300 group-hover:scale-[1.04] md:h-32 md:w-32">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={accent.hex} />
                            <stop offset="100%" stopColor={accent.light} />
                        </linearGradient>
                    </defs>
                    {/* Inner tick ring: 30 hairline marks */}
                    <circle
                        cx="60"
                        cy="60"
                        r="43"
                        fill="none"
                        stroke="rgba(255,255,255,0.13)"
                        strokeWidth="3"
                        strokeDasharray="1 8.01"
                    />
                    {/* Track */}
                    <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
                    {/* Progress arc */}
                    <circle
                        cx="60"
                        cy="60"
                        r={R}
                        fill="none"
                        stroke={`url(#${gradientId})`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC * (1 - swept)}
                        style={{ filter: `drop-shadow(0 0 5px rgba(${rgb},0.45))` }}
                    />
                    {/* Sweep tip */}
                    {swept > 0.01 && (
                        <circle
                            cx={tipX}
                            cy={tipY}
                            r="3"
                            fill={accent.light}
                            style={{ filter: `drop-shadow(0 0 4px rgba(${rgb},0.9))` }}
                        />
                    )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span
                        className="font-display text-2xl font-bold tabular-nums md:text-3xl"
                        style={{ color: accent.hex, filter: `drop-shadow(0 0 12px rgba(${rgb},0.35))` }}
                    >
                        {(value * progress).toFixed(decimals)}
                        {suffix}
                    </span>
                </div>
            </div>
            {caption && (
                <span
                    className="mt-3 font-mono text-[9px] uppercase tracking-[0.3em]"
                    style={{ color: `rgba(${rgb},0.7)` }}
                >
                    {caption}
                </span>
            )}
            <span className="mt-1 max-w-[10rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-neutral-400 md:text-[11px]">
                {label}
            </span>
        </div>
    );
}
