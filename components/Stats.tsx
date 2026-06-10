"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const STATS: { to: number; decimals?: number; label: string }[] = [
    { to: 8, label: "Scopus-Indexed Publications" },
    { to: 1, label: "Patent Filed" },
    { to: 2, label: "Hackathon Wins" },
    { to: 9.22, decimals: 2, label: "CGPA" },
];

const R = 50;
const CIRC = 2 * Math.PI * R;

function TelemetryGauge({
    to,
    decimals = 0,
    label,
    index,
    duration = 1.5,
}: {
    to: number;
    decimals?: number;
    label: string;
    index: number;
    duration?: number;
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

    // Tip of the arc in the SVG's own coordinates; the CSS -rotate-90 carries
    // both the dash origin and this dot from 3 o'clock up to 12 o'clock.
    const tipAngle = progress * 2 * Math.PI;
    const tipX = 60 + R * Math.cos(tipAngle);
    const tipY = 60 + R * Math.sin(tipAngle);

    return (
        <div ref={ref} className="group flex flex-col items-center text-center">
            <div className="relative h-28 w-28 transition-transform duration-300 group-hover:scale-[1.04] md:h-32 md:w-32">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2dd4bf" />
                            <stop offset="100%" stopColor="#818cf8" />
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
                        strokeDashoffset={CIRC * (1 - progress)}
                        style={{ filter: "drop-shadow(0 0 5px rgba(45,212,191,0.45))" }}
                    />
                    {/* Sweep tip */}
                    {progress > 0.01 && (
                        <circle
                            cx={tipX}
                            cy={tipY}
                            r="3"
                            fill="#99f6e4"
                            style={{ filter: "drop-shadow(0 0 4px rgba(94,234,212,0.9))" }}
                        />
                    )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-2xl font-bold tabular-nums text-teal-300 drop-shadow-[0_0_12px_rgba(45,212,191,0.35)] md:text-3xl">
                        {(to * progress).toFixed(decimals)}
                    </span>
                </div>
            </div>
            <span className="mt-3 font-mono text-[9px] uppercase tracking-[0.3em] text-teal-500/70">
                tlm·0{index + 1}
            </span>
            <span className="mt-1 max-w-[10rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-neutral-400 md:text-[11px]">
                {label}
            </span>
        </div>
    );
}

export function Stats() {
    return (
        <div className="grid w-full max-w-3xl grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-8">
            {STATS.map((s, i) => (
                <TelemetryGauge key={s.label} to={s.to} decimals={s.decimals} label={s.label} index={i} />
            ))}
        </div>
    );
}
