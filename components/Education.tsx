// "use client";
// import React, { useState } from "react";
// import { Timeline } from "./ui/timeline";
// import Heading from "./Heading";
// import { motion, AnimatePresence } from "framer-motion";
// import { IconChevronDown } from "@tabler/icons-react";
// import { cn } from "@/lib/utils";

// // --- Reusable Card Component (Education Variant) ---
// const EducationCard = ({
//     institution,
//     degree,
//     date,
//     points,
//     children,
// }: {
//     institution: string;
//     degree: string;
//     date: string;
//     points: string[];
//     children: React.ReactNode;
// }) => {
//     const [isOpen, setIsOpen] = useState(false);

//     return (
//         <div
//             role="button" // Triggers global CSS sun cursor
//             onClick={() => setIsOpen(!isOpen)}
//             className={cn(
//                 "group relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/40 backdrop-blur-sm transition-all duration-300 hover:bg-neutral-900/60 hover:border-white/20 p-5 md:p-6",
//                 isOpen ? "bg-neutral-900/60 border-white/20" : ""
//             )}
//         >
//             {/* Card Header - Always Visible */}
//             <div className="flex flex-col gap-2">
//                 <div className="flex justify-between items-start">
//                     <div>
//                         <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-teal-400 transition-colors">
//                             {institution}
//                         </h3>
//                         <p className="text-md md:text-lg font-medium text-neutral-400">
//                             {degree}
//                         </p>
//                         <p className="text-sm font-mono text-neutral-500 mt-1">{date}</p>
//                     </div>

//                     {/* Chevron Icon */}
//                     <motion.div
//                         animate={{ rotate: isOpen ? 180 : 0 }}
//                         transition={{ duration: 0.3 }}
//                         className="p-1 rounded-full bg-white/5 group-hover:bg-white/10 text-neutral-300"
//                     >
//                         <IconChevronDown size={20} />
//                     </motion.div>
//                 </div>

//                 {/* Summary Points */}
//                 <ul className="mt-3 space-y-2">
//                     {points.map((point, idx) => (
//                         <li key={idx} className="flex items-start gap-2 text-sm md:text-base text-neutral-300">
//                             <span className="mt-2 h-1.5 w-1.5 min-w-[6px] rounded-full bg-teal-500/70" />
//                             <span>{point}</span>
//                         </li>
//                     ))}
//                 </ul>
//             </div>

//             {/* Expandable Paragraphs */}
//             <AnimatePresence>
//                 {isOpen && (
//                     <motion.div
//                         initial={{ height: 0, opacity: 0 }}
//                         animate={{ height: "auto", opacity: 1 }}
//                         exit={{ height: 0, opacity: 0 }}
//                         transition={{ duration: 0.3, ease: "easeInOut" }}
//                         className="overflow-hidden"
//                     >
//                         <div className="pt-6 border-t border-white/10 mt-4 space-y-4 text-sm md:text-base text-neutral-300 leading-relaxed">
//                             {children}
//                         </div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>

//             {/* Click hint */}
//             {!isOpen && (
//                 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
//             )}
//         </div>
//     );
// };

// export function Education() {
//     const data = [
//         {
//             title: "Bachelor of Technology — Vellore, India",
//             content: (
//                 <EducationCard
//                     institution="Vellore Institute of Technology"
//                     degree="B.Tech in Information Technology"
//                     date="Sep 2022 – Present"
//                     points={[
//                         "Current CGPA: 9.16 / 10",
//                         "Focus Areas: Backend Development, DBMS, Data Structures, Cloud Computing, and AI/ML.",
//                         "Active participant in Hackathons (Synapse, GraVITas) and Technical Clubs.",
//                     ]}
//                 >
//                     <p>
//                         Currently pursuing a B.Tech in Information Technology, maintaining a consistent academic record. The curriculum has provided a strong foundation in core computing concepts, including Operating Systems, Computer Networks, and Cloud Computing.
//                     </p>
//                     <p>
//                         Beyond the classroom, I actively apply this knowledge in competitive hackathons and practical projects, bridging the gap between theoretical concepts and real-world software engineering challenges.
//                     </p>
//                 </EducationCard>
//             ),
//         },
//         {
//             title: "Higher Secondary Education (Class XII) — India",
//             content: (
//                 <EducationCard
//                     institution="Swami Vivekananda Vidyamandir"
//                     degree="Higher Secondary (Science Stream)"
//                     date="May 2020 – Jun 2022"
//                     points={[
//                         "Secured 92% in Board Examinations.",
//                         "Specialization: Physics, Chemistry, Mathematics, and Computer Science.",
//                         "Developed a strong programming foundation in Python.",
//                     ]}
//                 >
//                     <p>
//                         Completed Higher Secondary education with a distinction in the Science stream. This period was crucial in developing a strong analytical mindset through rigorous problem-solving in Mathematics and Physics.
//                     </p>
//                     <p>
//                         It also marked the beginning of a serious pursuit of Computer Science, where I gained proficiency in Python programming and algorithmic thinking, setting the stage for my engineering journey.
//                     </p>
//                 </EducationCard>
//             ),
//         },
//         {
//             title: "Primary & Secondary Education (Class X) — India",
//             content: (
//                 <EducationCard
//                     institution="St. Helen's School"
//                     degree="ICSE Board"
//                     date="Apr 2008 – Jul 2020"
//                     points={[
//                         "Achieved 91.6% in Board Examinations.",
//                         "Learned Java and Object-Oriented Programming (OOP) concepts.",
//                         "Demonstrated consistent academic excellence and discipline.",
//                     ]}
//                 >
//                     <p>
//                         Completed foundational education with high academic standing. This formative period instilled values of perseverance, time management, and a deep curiosity for scientific inquiry.
//                     </p>
//                     <p>
//                         Balanced academic rigour with a strong introduction to computer science, specifically learning Java and Object-Oriented Programming concepts as part of the curriculum.
//                     </p>
//                 </EducationCard>
//             ),
//         },
//     ];

//     return (
//         <div className="relative w-full overflow-clip py-16" id="education">
//             <Heading text="Education" />
//             <Timeline data={data} />
//         </div>
//     );
// }
"use client";
import React, { useState, useRef } from "react";
import { Timeline } from "./ui/timeline";
import Heading from "./Heading";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// --- 3D Tilt Education Card ---
const EducationCard = ({
    institution,
    degree,
    date,
    points,
    children,
}: {
    institution: string;
    degree: string;
    date: string;
    points: string[];
    children: React.ReactNode;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // 3D Tilt State
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            role="button"
            onClick={() => setIsOpen(!isOpen)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
            }}
            className={cn(
                "group relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/40 backdrop-blur-sm transition-colors duration-300 hover:bg-neutral-900/60 hover:border-white/20 p-5 md:p-6 perspective-1000",
                isOpen ? "bg-neutral-900/60 border-white/20" : ""
            )}
        >
            {/* Content Container with slight Z lift */}
            <div style={{ transform: "translateZ(20px)" }}>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-teal-400 transition-colors">
                                {institution}
                            </h3>
                            <p className="text-md md:text-lg font-medium text-neutral-400">
                                {degree}
                            </p>
                            <p className="text-sm font-mono text-neutral-500 mt-1">{date}</p>
                        </div>

                        <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-1 rounded-full bg-white/5 group-hover:bg-white/10 text-neutral-300"
                        >
                            <IconChevronDown size={20} />
                        </motion.div>
                    </div>

                    <ul className="mt-3 space-y-2">
                        {points.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm md:text-base text-neutral-300">
                                <span className="mt-2 h-1.5 w-1.5 min-w-[6px] rounded-full bg-teal-500/70" />
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <div className="pt-6 border-t border-white/10 mt-4 space-y-4 text-sm md:text-base text-neutral-300 leading-relaxed">
                                {children}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {!isOpen && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
        </motion.div>
    );
};

export function Education() {
    const data = [
        {
            title: "Bachelor of Technology — Vellore, India",
            content: (
                <EducationCard
                    institution="Vellore Institute of Technology"
                    degree="B.Tech in Information Technology"
                    date="Sep 2022 – Present"
                    points={[
                        "Current CGPA: 9.16 / 10",
                        "Focus Areas: Backend Development, DBMS, Cloud Computing, and AI/ML.",
                        "Active participant in Hackathons (Synapse, GraVITas) and Technical Clubs.",
                    ]}
                >
                    <p>
                        Currently pursuing a B.Tech in Information Technology, maintaining a consistent academic record. The curriculum has provided a strong foundation in core computing concepts, including Operating Systems, Computer Networks, and Cloud Computing.
                    </p>
                    <p>
                        Beyond the classroom, I actively apply this knowledge in competitive hackathons and practical projects, bridging the gap between theoretical concepts and real-world software engineering challenges.
                    </p>
                </EducationCard>
            ),
        },
        {
            title: "Higher Secondary Education (Class XII) — India",
            content: (
                <EducationCard
                    institution="Swami Vivekananda Vidyamandir"
                    degree="Higher Secondary (Science Stream)"
                    date="May 2020 – Jun 2022"
                    points={[
                        "Secured 92% in Board Examinations.",
                        "Specialization: Physics, Chemistry, Mathematics, and Computer Science.",
                        "Developed a strong programming foundation in Python.",
                    ]}
                >
                    <p>
                        Completed Higher Secondary education with a distinction in the Science stream. This period was crucial in developing a strong analytical mindset through rigorous problem-solving in Mathematics and Physics.
                    </p>
                    <p>
                        It also marked the beginning of a serious pursuit of Computer Science, where I gained proficiency in Python programming and algorithmic thinking, setting the stage for my engineering journey.
                    </p>
                </EducationCard>
            ),
        },
        {
            title: "Primary & Secondary Education (Class X) — India",
            content: (
                <EducationCard
                    institution="St. Helen's School"
                    degree="ICSE Board"
                    date="Apr 2008 – Jul 2020"
                    points={[
                        "Achieved 91.6% in Board Examinations.",
                        "Learned Java and Object-Oriented Programming (OOP) concepts.",
                        "Demonstrated consistent academic excellence and discipline.",
                    ]}
                >
                    <p>
                        Completed foundational education with high academic standing. This formative period instilled values of perseverance, time management, and a deep curiosity for scientific inquiry.
                    </p>
                    <p>
                        Balanced academic rigour with a strong introduction to computer science, specifically learning Java and Object-Oriented Programming concepts as part of the curriculum.
                    </p>
                </EducationCard>
            ),
        },
    ];

    return (
        <div className="relative w-full overflow-clip py-16" id="education">
            <Heading text="Education" />
            <Timeline data={data} />
        </div>
    );
}