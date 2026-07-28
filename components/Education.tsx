"use client";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import Heading from "./Heading";
import { TelemetryGauge, type GaugeAccent } from "./ui/telemetry-gauge";
import { accentVars, getSection } from "@/constants/sections";

// Education deliberately does NOT reuse the Work Experience treatment. It used
// to be a near line-for-line copy: same timeline rail, same 3D tilt, same
// meteor border, same expand chevron, stacked directly beneath it. Two
// identical timelines back to back read as one long component with a bug.
//
// Now it is a quiet row of academic record panels, and the flight-path rocket
// belongs to Work Experience alone.

type AcademicRecord = {
    institution: string;
    degree: string;
    date: string;
    /** Score and the scale it is out of, so the gauge means something. */
    score: number;
    max: number;
    decimals: number;
    suffix: string;
    scoreLabel: string;
    notes: string[];
};

const RECORDS: AcademicRecord[] = [
    {
        institution: "Vellore Institute of Technology",
        degree: "B.Tech, Information Technology",
        date: "2022 – 2026",
        score: 9.22,
        max: 10,
        decimals: 2,
        suffix: "",
        scoreLabel: "CGPA · out of 10",
        notes: [
            "Backend, DBMS, Cloud Computing, AI/ML",
            "Hackathons: Synapse, GraVITas",
        ],
    },
    {
        institution: "Swami Vivekananda Vidyamandir",
        degree: "CBSE Board (Science Stream)",
        date: "2020 – 2022",
        score: 92,
        max: 100,
        decimals: 0,
        suffix: "%",
        scoreLabel: "CBSE · Class XII",
        notes: [
            "Physics, Chemistry, Maths, Computer Science",
            "First serious Python work",
        ],
    },
    {
        institution: "St. Helen's School",
        degree: "ICSE Board",
        date: "2008 – 2020",
        score: 91.6,
        max: 100,
        decimals: 1,
        suffix: "%",
        scoreLabel: "ICSE · Class X",
        notes: [
            "Java and object-oriented foundations",
            "Twelve years, one school",
        ],
    },
];

export function Education() {
    const reduce = useReducedMotion();
    const section = getSection("education");
    const accent: GaugeAccent = { hex: section.hex, light: section.light, rgb: section.rgb };

    const container: Variants = {
        hidden: {},
        show: { transition: { staggerChildren: 0.12 } },
    };
    const panel: Variants = {
        hidden: { opacity: 0, y: reduce ? 0 : 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    };

    return (
        <div
            className="relative w-full overflow-clip py-16"
            id="education"
            style={accentVars(section)}
        >
            <Heading section="education" />

            <motion.div
                className="mx-auto mt-4 grid max-w-5xl grid-cols-1 gap-5 px-8 md:grid-cols-3 md:gap-6"
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
            >
                {RECORDS.map((r, i) => (
                    <motion.div
                        key={r.institution}
                        variants={panel}
                        className="group relative flex flex-col items-center rounded-2xl border border-white/10 bg-neutral-950/50 px-5 py-7 text-center backdrop-blur-sm transition-colors duration-300 hover:border-white/20"
                    >
                        {/* Accent rail, echoing the Publications log cards */}
                        <span
                            aria-hidden
                            className="absolute inset-x-8 top-0 h-px transition-opacity duration-300"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${section.hex}, transparent)`,
                                opacity: 0.5,
                            }}
                        />

                        <TelemetryGauge
                            value={r.score}
                            max={r.max}
                            decimals={r.decimals}
                            suffix={r.suffix}
                            label={r.scoreLabel}
                            caption={`rec·0${i + 1}`}
                            index={i}
                            accent={accent}
                        />

                        <h3 className="font-display mt-5 text-lg font-bold leading-snug text-white md:text-xl">
                            {r.institution}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-neutral-400">{r.degree}</p>
                        <p className="mt-1 font-mono text-xs text-neutral-500">{r.date}</p>

                        <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-left">
                            {r.notes.map((n) => (
                                <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-neutral-400">
                                    <span
                                        className="mt-1.5 h-1 w-1 min-w-[4px] rounded-full"
                                        style={{ background: section.hex }}
                                    />
                                    <span>{n}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
