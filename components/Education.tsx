"use client";
import { motion, useReducedMotion } from "framer-motion";
import Heading from "./Heading";
import { TelemetryGauge, type GaugeAccent } from "./ui/telemetry-gauge";
import { accentVars, getSection } from "@/constants/sections";
import { scrollToSection } from "@/lib/scroll-to-section";

// Education as a launch: school was the pad and the first stage, VIT the orbit.
//
// It deliberately shares nothing with Work Experience above it (a vertical
// rail, a rocket, stacked tilting cards). Here a single trajectory climbs
// left to right across the section, the two school records are compact
// markers on it, and the degree gets the one full card, because for someone
// already working that is the record that counts. The card's readout shows
// what shipped while studying, each figure linking to where it is on the page.

type Stage = {
    tag: string;
    years: string;
    name: string;
    detail: string;
    /** The detail line on phones, where three labels share one row. */
    short: string;
    note: string;
    /** Marker position in the trajectory's 1000 x 200 viewBox. */
    at: { x: number; y: number };
};

// A single climbing curve; the three markers sit on it
const PATH = "M 70 172 C 260 176, 390 160, 500 136 C 650 102, 800 52, 930 30";
const STAGES: Stage[] = [
    {
        tag: "Launch",
        years: "2008 – 2020",
        name: "St. Helen's School",
        detail: "ICSE · Class X · 91.6%",
        short: "ICSE · 91.6%",
        note: "Java and object-oriented foundations",
        at: { x: 70, y: 172 },
    },
    {
        tag: "Stage 2",
        years: "2020 – 2022",
        name: "Swami Vivekananda Vidyamandir",
        detail: "CBSE · Class XII · 92%",
        short: "CBSE XII · 92%",
        note: "First serious Python work",
        at: { x: 500, y: 136 },
    },
    {
        tag: "Orbit",
        years: "2022 – 2026",
        name: "Vellore Institute of Technology",
        detail: "B.Tech IT · CGPA 9.22",
        short: "CGPA 9.22",
        note: "Details below",
        at: { x: 930, y: 30 },
    },
];

// What shipped during the degree. Figures come from the rest of the page:
// Publications (10 Scopus-indexed papers, 1 patent), the hackathon medals, and
// the four internships in Work Experience that fall within 2022-2026.
const WHILE_STUDYING = [
    { value: "10", label: "Scopus-indexed papers", to: "#publications" },
    { value: "1", label: "Patent filed", to: "#publications" },
    { value: "2", label: "Hackathon wins", to: "#skills-achievements" },
    { value: "4", label: "Internships", to: "#workex" },
];

const COURSEWORK = ["Backend engineering", "DBMS", "Cloud computing", "AI / ML"];

export function Education() {
    const reduce = useReducedMotion();
    const section = getSection("education");
    const accent: GaugeAccent = { hex: section.hex, light: section.light, rgb: section.rgb };
    const rgb = section.rgb.join(",");
    const DRAW = 1.8;

    return (
        <div className="relative w-full overflow-clip py-16" id="education" style={accentVars(section)}>
            <Heading section="education" />

            <div className="mx-auto mt-4 max-w-5xl px-6 md:px-8">
                {/* ---------------- Trajectory ---------------- */}
                <div className="relative">
                    <svg viewBox="0 0 1000 200" className="block h-auto w-full overflow-visible" aria-hidden>
                        <defs>
                            <linearGradient id="edu-trail" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor={section.hex} stopOpacity="0.25" />
                                <stop offset="1" stopColor={section.light} stopOpacity="1" />
                            </linearGradient>
                        </defs>
                        {/* The planned path, then the flown one drawing over it */}
                        <path d={PATH} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="2" strokeDasharray="3 8" strokeLinecap="round" />
                        <motion.path
                            d={PATH}
                            fill="none"
                            stroke="url(#edu-trail)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={reduce ? false : { pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: DRAW, ease: [0.45, 0, 0.2, 1] }}
                            style={{ filter: `drop-shadow(0 0 6px rgba(${rgb},0.55))` }}
                        />
                        {/* Launch pad under the first marker */}
                        <g stroke="rgba(148,163,184,0.5)" strokeWidth="2" strokeLinecap="round">
                            <path d="M 44 190 L 96 190" />
                            <path d="M 54 190 L 60 180 M 86 190 L 80 180" />
                        </g>
                        {STAGES.map((s, i) => {
                            const orbit = i === STAGES.length - 1;
                            return (
                                <motion.g
                                    key={s.tag}
                                    initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true, margin: "-80px" }}
                                    // Each marker lights as the trail reaches it
                                    transition={{ duration: 0.4, delay: reduce ? 0 : (i / (STAGES.length - 1)) * DRAW * 0.92 }}
                                    style={{ transformOrigin: `${s.at.x}px ${s.at.y}px`, transformBox: "view-box" }}
                                >
                                    {orbit && (
                                        // The orbit itself: a tilted ring round the final marker
                                        <ellipse cx={s.at.x} cy={s.at.y} rx="30" ry="10" fill="none" stroke={section.light} strokeOpacity="0.6" strokeWidth="1.5" transform={`rotate(-14 ${s.at.x} ${s.at.y})`} />
                                    )}
                                    <circle cx={s.at.x} cy={s.at.y} r={orbit ? 11 : 8} fill="#0b1020" stroke={orbit ? section.light : section.hex} strokeWidth="2.5" />
                                    <circle cx={s.at.x} cy={s.at.y} r={orbit ? 4.5 : 3} fill={orbit ? section.pale : section.light} />
                                </motion.g>
                            );
                        })}
                    </svg>

                    {/* Stage labels, placed over the markers */}
                    <div className="mt-4 grid grid-cols-3 gap-3 md:mt-0 md:block">
                        {STAGES.map((s, i) => {
                            const orbit = i === STAGES.length - 1;
                            return (
                                <motion.div
                                    key={s.tag}
                                    initial={reduce ? false : { opacity: 0, y: 8 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-80px" }}
                                    transition={{ duration: 0.45, delay: reduce ? 0 : (i / (STAGES.length - 1)) * DRAW * 0.92 + 0.15 }}
                                    className={
                                        // Desktop: pinned beside its marker. Phones: a three-column row
                                        // The orbit label sits above its marker: below it,
                                        // the climbing trail ran straight through the text
                                        orbit
                                            ? "md:absolute md:right-[9%] md:top-[-20%] md:text-right"
                                            : i === 0
                                                ? "md:absolute md:left-[2%] md:top-[4%]"
                                                : "md:absolute md:left-[41%] md:top-[80%]"
                                    }
                                >
                                    {/* Phones: tag and years stacked, so a date never breaks */}
                                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] md:text-[10px] md:tracking-[0.25em]" style={{ color: section.light }}>
                                        <span className="block md:inline">{s.tag}</span>
                                        <span className="hidden md:inline"> · </span>
                                        <span className="block md:inline">{s.years}</span>
                                    </p>
                                    <p className="font-display mt-1 text-xs font-bold leading-snug text-white md:text-base">{s.name}</p>
                                    {orbit ? (
                                        <p className="mt-0.5 font-mono text-[10px] text-neutral-300 md:hidden">{s.short}</p>
                                    ) : (
                                        <>
                                            <p className="mt-0.5 font-mono text-[10px] text-neutral-300 md:text-xs">
                                                <span className="md:hidden">{s.short}</span>
                                                <span className="hidden md:inline">{s.detail}</span>
                                            </p>
                                            <p className="mt-0.5 hidden text-xs text-neutral-500 md:block">{s.note}</p>
                                        </>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* ---------------- The degree ---------------- */}
                <motion.div
                    initial={reduce ? false : { opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.55, delay: reduce ? 0 : 0.3, ease: "easeOut" }}
                    className="relative mt-14 overflow-hidden rounded-3xl border bg-neutral-950/55 backdrop-blur-sm md:mt-24"
                    style={{ borderColor: `rgba(${rgb},0.28)` }}
                >
                    {/* Orbit glow in the corner, echoing the trajectory's end */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
                        style={{ background: `radial-gradient(circle, rgba(${rgb},0.18), transparent 70%)` }}
                    />

                    <div className="relative grid gap-8 p-6 md:grid-cols-[auto,1fr] md:items-center md:gap-10 md:p-9">
                        <div className="flex justify-center">
                            <TelemetryGauge value={9.22} max={10} decimals={2} suffix="" label="CGPA · out of 10" caption="orbit·01" index={0} accent={accent} />
                        </div>
                        <div className="text-center md:text-left">
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: section.light }}>
                                Orbit reached · 2022 – 2026
                            </p>
                            <h3 className="font-display mt-2 text-2xl font-bold leading-tight text-white md:text-3xl">Vellore Institute of Technology</h3>
                            <p className="mt-1 text-base text-neutral-300">B.Tech, Information Technology</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                                {COURSEWORK.map((c) => (
                                    <span
                                        key={c}
                                        className="rounded-full border px-3 py-1 font-mono text-[11px] text-neutral-200"
                                        style={{ borderColor: `rgba(${rgb},0.3)`, background: `rgba(${rgb},0.08)` }}
                                    >
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* While studying: what shipped alongside the degree */}
                    <div className="relative border-t px-6 py-5 md:px-9" style={{ borderColor: `rgba(${rgb},0.16)` }}>
                        <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500 md:text-left">
                            While studying
                        </p>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {WHILE_STUDYING.map((w) => (
                                <a
                                    key={w.label}
                                    href={w.to}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection(w.to);
                                    }}
                                    className="group rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.05]"
                                    style={{ ["--edu-hover" as string]: `rgba(${rgb},0.45)` }}
                                >
                                    <span className="font-display block text-3xl font-bold text-white transition-colors group-hover:text-[color:var(--edu-light)]" style={{ ["--edu-light" as string]: section.light }}>
                                        {w.value}
                                    </span>
                                    <span className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                                        {w.label}
                                        <span aria-hidden className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: section.light }}>
                                            ↗
                                        </span>
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
