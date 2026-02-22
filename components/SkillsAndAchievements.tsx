import Heading from "./Heading"
import { HoverEffectAchievements } from "./ui/card-hover-effect-achievements"
import { Spotlight } from "./ui/spotlight-card"

const skillsData = {
    "Languages": ["JavaScript", "TypeScript", "Java", "Python", "C", "C++", "HTML", "CSS", "SQL"],
    "Libraries/Frameworks": ["NodeJS", "ExpressJS", "ReactJS", "NextJS", "Bootstrap", "Chakra UI"],
    "Databases": ["MongoDB", "MySQL", "PostgreSQL", "Redis", "Firebase"],
    "Other Tools & Platforms": ["Git", "Postman", "AWS", "Nginx", "VS Code", "Render", "Vercel", "Netlify"],
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
                                {skills.map(skill => (
                                    <Spotlight key={skill} className="w-auto inline-block rounded-lg">
                                        <div className="px-6 py-3 font-medium text-neutral-200">
                                            {skill}
                                        </div>
                                    </Spotlight>
                                ))}
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