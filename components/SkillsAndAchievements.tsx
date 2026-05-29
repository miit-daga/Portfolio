import type { ComponentType, CSSProperties } from "react"
import Heading from "./Heading"
import { HoverEffectAchievements } from "./ui/card-hover-effect-achievements"
import { Spotlight } from "./ui/spotlight-card"
import { SKILL_ICONS } from "./ui/skill-icons"

const skillsData = {
    "Languages": ["JavaScript", "TypeScript", "Java", "Python", "C", "C++", "HTML", "CSS", "SQL"],
    "Libraries/Frameworks": ["NodeJS", "ExpressJS", "FastAPI", "ReactJS", "NextJS", "Bootstrap", "Chakra UI"],
    "Databases": ["MongoDB", "MySQL", "PostgreSQL", "Redis", "Firebase", "BigQuery"],
    "Other Tools & Platforms": ["Git", "Postman", "Playwright", "AWS", "Nginx", "VS Code", "Render", "Vercel", "Netlify"],
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

export function SkillsAndAchievements() {
    return (
        <div className="relative w-full overflow-clip py-16" id="skills-achievements">
            <Heading text="Skills & Achievements" />
            <div className="max-w-5xl mx-auto px-8 mt-10">

                <div className="space-y-12">
                    {Object.entries(skillsData).map(([category, skills]) => (
                        <div key={category}>
                            <h3 className="text-2xl md:text-3xl font-bold text-neutral-300 mb-6 text-center">{category.replace(/ & /g, ' & ')}</h3>
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {skills.map(skill => {
                                    const meta = SKILL_ICONS[skill];
                                    const Icon = meta?.Icon as
                                        | ComponentType<{ className?: string; style?: CSSProperties }>
                                        | undefined;
                                    return (
                                        <Spotlight key={skill} className="w-auto inline-block rounded-lg">
                                            <div className="group flex items-center gap-2.5 px-5 py-3 font-medium text-neutral-200">
                                                {Icon && (
                                                    <Icon
                                                        className="h-[18px] w-[18px] flex-shrink-0 transition-transform duration-300 group-hover:scale-125"
                                                        style={{ color: meta.color }}
                                                    />
                                                )}
                                                <span>{skill}</span>
                                            </div>
                                        </Spotlight>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-24">
                    <h3 className="text-2xl md:text-3xl font-bold text-neutral-300 mb-2 text-center">Hackathon Achievements</h3>
                    <div className="max-w-4xl mx-auto">
                        <HoverEffectAchievements items={achievementsData} />
                    </div>
                </div>
            </div>
        </div>
    )
}