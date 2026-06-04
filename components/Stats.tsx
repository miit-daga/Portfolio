"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const STATS: { to: number; decimals?: number; label: string }[] = [
    { to: 8, label: "Scopus-Indexed Publications" },
    { to: 1, label: "Patent Filed" },
    { to: 2, label: "Hackathon Wins" },
    { to: 9.22, decimals: 2, label: "CGPA" },
];

function CountUp({ to, decimals = 0, duration = 1.5 }: { to: number; decimals?: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    const reduce = useReducedMotion();
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!inView) return;
        if (reduce) {
            setValue(to);
            return;
        }
        let raf = 0;
        let startTs = 0;
        const tick = (ts: number) => {
            if (!startTs) startTs = ts;
            const t = Math.min(1, (ts - startTs) / (duration * 1000));
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setValue(to * eased);
            if (t < 1) raf = requestAnimationFrame(tick);
            else setValue(to);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, to, duration, reduce]);

    return (
        <span ref={ref} className="tabular-nums">
            {value.toFixed(decimals)}
        </span>
    );
}

export function Stats() {
    return (
        <div className="grid w-full max-w-3xl grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {STATS.map((s) => (
                <div key={s.label} className="flex flex-col items-center text-center">
                    <span className="text-4xl font-extrabold text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.35)] md:text-5xl">
                        <CountUp to={s.to} decimals={s.decimals} />
                    </span>
                    <span className="mt-2 text-[11px] uppercase tracking-wider text-neutral-400 md:text-xs">{s.label}</span>
                </div>
            ))}
        </div>
    );
}
