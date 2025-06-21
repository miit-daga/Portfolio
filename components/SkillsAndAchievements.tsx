import Heading from "./Heading"
import { useState } from "react"
import { motion } from "framer-motion"
import { HoverEffectAchievements } from "./ui/card-hover-effect-achievements"

const skillsData = {
    "Languages": ["JavaScript", "TypeScript", "Java", "Python", "C", "C++", "HTML", "CSS", "SQL"],
    "Libraries & Frameworks": ["Node.js", "Express.js", "React.js", "Next.js", "Bootstrap", "Chakra UI", "ShadCN UI"],
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

const SkillBadge = ({ skill }: { skill: string }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative group rounded-lg overflow-hidden cursor-default"
        >
            <motion.div
                className="relative backdrop-blur-sm rounded-lg overflow-hidden"
                animate={{
                    scale: isHovered ? 1.05 : 1,
                }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                <div className="absolute inset-0 bg-black/30 rounded-lg" />
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/40 via-purple-500/40 to-teal-500/40 rounded-lg"
                    initial={{ x: "-100%" }}
                    animate={{ x: isHovered ? "0%" : "-100%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{
                        borderColor: isHovered ? "rgba(148, 163, 184, 0.5)" : "rgba(255, 255, 255, 0.15)",
                    }}
                    style={{ border: "1px solid" }}
                    transition={{ duration: 0.25 }}
                />
                <div className="relative z-10 px-4 py-2 text-neutral-100 font-semibold">
                    {skill}
                </div>
            </motion.div>
        </div>
    );
};


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
                                    <SkillBadge key={skill} skill={skill} />
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