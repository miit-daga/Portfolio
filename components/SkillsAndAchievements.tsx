"use client"
import type { ComponentType, CSSProperties } from "react"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { IconCode, IconStack2, IconDatabase, IconTools } from "@tabler/icons-react"
import Heading from "./Heading"
import { HoverEffectAchievements } from "./ui/card-hover-effect-achievements"
import { SKILL_ICONS } from "./ui/skill-icons"
import { accentVars, getSection } from "@/constants/sections"

const SECTION = getSection("skills-achievements")
const RGB = SECTION.rgb.join(",")

const skillsData = {
    "Languages": ["JavaScript", "TypeScript", "Java", "Python", "C", "C++", "HTML", "CSS", "SQL"],
    "Libraries/Frameworks": ["NodeJS", "ExpressJS", "FastAPI", "ReactJS", "NextJS", "Bootstrap", "Chakra UI"],
    "Databases": ["MongoDB", "MySQL", "PostgreSQL", "Redis", "Firebase", "BigQuery"],
    "Other Tools & Platforms": ["Git", "Postman", "Playwright", "AWS", "Nginx", "VS Code", "Render", "Vercel", "Netlify"],
};

const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string; stroke?: number; style?: CSSProperties }>> = {
    "Languages": IconCode,
    "Libraries/Frameworks": IconStack2,
    "Databases": IconDatabase,
    "Other Tools & Platforms": IconTools,
};

const achievementsData = [
    {
        title: "2nd Place Winner | Synapse Hackathon (Yantra-2025)",
        description: "Developed the backend for a tool that automates the MoCA cognitive test, enabling at-home assessment for dementia patients.",
        link: "https://drive.google.com/file/d/1Vlum8GZOXLz00Fti1dgI3qeT8yNSUB4J/view",
    },
    {
        title: "2nd Place Winner | Hackovation Hackathon (GraVITas-2024)",
        description: "Engineered the backend for a high-volume emergency system that auto-prioritizes calls by severity and dispatches the nearest response teams.",
        link: "https://drive.google.com/file/d/1MxDTGQdqa6crxf11ZEfn_Q_KUPHDnYSX/view",
    }
];

// Four subsystem consoles instead of one flat wall of 35 identical chips.
// The old layout was the least characterful block on a page full of orbiting
// planets; this gives the section a shape without hurting scannability.
function SystemPanel({
    category,
    skills,
    index,
}: {
    category: string;
    skills: string[];
    index: number;
}) {
    const CategoryIcon = CATEGORY_ICONS[category];
    const reduce = useReducedMotion();

    const container: Variants = {
        hidden: {},
        show: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
    };
    const chip: Variants = {
        hidden: { opacity: 0, y: reduce ? 0 : 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            className="group relative overflow-hidden rounded-2xl border bg-neutral-950/50 backdrop-blur-sm transition-colors duration-300"
            style={{ borderColor: `rgba(${RGB}, 0.22)` }}
        >
            {/* Console header strip */}
            <header
                className="flex items-center gap-2.5 border-b px-4 py-2.5"
                style={{
                    borderColor: `rgba(${RGB}, 0.18)`,
                    background: `linear-gradient(90deg, rgba(${RGB}, 0.10), transparent)`,
                }}
            >
                {CategoryIcon && (
                    <CategoryIcon
                        className="h-4 w-4 flex-shrink-0"
                        stroke={1.7}
                        style={{ color: SECTION.hex }}
                    />
                )}
                <h3 className="font-display flex-1 text-sm font-bold uppercase tracking-[0.14em] text-neutral-200 md:text-base">
                    {category}
                </h3>
                <span
                    className="font-mono text-[9px] uppercase tracking-[0.25em]"
                    style={{ color: `rgba(${RGB}, 0.75)` }}
                >
                    sys·0{index + 1}
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                    {String(skills.length).padStart(2, "0")}
                </span>
            </header>

            <motion.ul
                className="flex flex-wrap gap-x-4 gap-y-2.5 px-4 py-4"
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
            >
                {skills.map((skill) => {
                    const meta = SKILL_ICONS[skill];
                    const Icon = meta?.Icon as
                        | ComponentType<{ className?: string; style?: CSSProperties }>
                        | undefined;
                    return (
                        <motion.li
                            key={skill}
                            variants={chip}
                            className="flex items-center gap-1.5 text-sm text-neutral-300 transition-colors duration-200 hover:text-white"
                        >
                            <span
                                aria-hidden
                                className="h-1 w-1 rounded-full"
                                style={{ background: `rgba(${RGB}, 0.5)` }}
                            />
                            {Icon && (
                                <Icon
                                    className="h-[15px] w-[15px] flex-shrink-0 transition-transform duration-300 hover:scale-125"
                                    style={{ color: meta.color }}
                                />
                            )}
                            <span>{skill}</span>
                        </motion.li>
                    );
                })}
            </motion.ul>

            {/* Scanline sweep on hover, so the panel reads as a live readout */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `linear-gradient(90deg, transparent, ${SECTION.hex}, transparent)` }}
            />
        </motion.section>
    );
}

export function SkillsAndAchievements() {
    return (
        <div
            className="relative w-full overflow-clip py-16"
            id="skills-achievements"
            style={accentVars(SECTION)}
        >
            <Heading section="skills-achievements" />

            <div className="max-w-5xl mx-auto px-8 mt-10">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {Object.entries(skillsData).map(([category, skills], i) => (
                        <SystemPanel key={category} category={category} skills={skills} index={i} />
                    ))}
                </div>

                <div className="mt-20">
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-neutral-300 mb-2 text-center">Hackathon Achievements</h3>
                    <div className="max-w-4xl mx-auto">
                        <HoverEffectAchievements items={achievementsData} />
                    </div>
                </div>
            </div>
        </div>
    )
}
