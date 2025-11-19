// "use client";
// import React, { useState } from "react";
// import { Timeline } from "./ui/timeline";
// import Heading from "./Heading";
// import { motion, AnimatePresence } from "framer-motion";
// import { IconChevronDown } from "@tabler/icons-react";
// import { cn } from "@/lib/utils";

// // --- Reusable Card Component ---
// const ExperienceCard = ({
//   company,
//   role,
//   date,
//   points,
//   children,
// }: {
//   company: string;
//   role: string;
//   date: string;
//   points: string[];
//   children: React.ReactNode;
// }) => {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <div
//       role="button" // Helps accessibility and triggers the global CSS sun cursor rule
//       onClick={() => setIsOpen(!isOpen)}
//       className={cn(
//         "group relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/40 backdrop-blur-sm transition-all duration-300 hover:bg-neutral-900/60 hover:border-white/20 p-5 md:p-6",
//         isOpen ? "bg-neutral-900/60 border-white/20" : ""
//       )}
//     >
//       {/* Card Header - Always Visible */}
//       <div className="flex flex-col gap-2">
//         <div className="flex justify-between items-start">
//           <div>
//             <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-teal-400 transition-colors">
//               {company}
//             </h3>
//             <p className="text-md md:text-lg font-medium text-neutral-400">
//               {role}
//             </p>
//             <p className="text-sm font-mono text-neutral-500 mt-1">{date}</p>
//           </div>

//           {/* Chevron Icon */}
//           <motion.div
//             animate={{ rotate: isOpen ? 180 : 0 }}
//             transition={{ duration: 0.3 }}
//             className="p-1 rounded-full bg-white/5 group-hover:bg-white/10 text-neutral-300"
//           >
//             <IconChevronDown size={20} />
//           </motion.div>
//         </div>

//         {/* Summary Points - "Resume Style" */}
//         <ul className="mt-3 space-y-2">
//           {points.map((point, idx) => (
//             <li key={idx} className="flex items-start gap-2 text-sm md:text-base text-neutral-300">
//               <span className="mt-2 h-1.5 w-1.5 min-w-[6px] rounded-full bg-teal-500/70" />
//               <span>{point}</span>
//             </li>
//           ))}
//         </ul>
//       </div>

//       {/* Expandable Paragraphs - "Full Story" */}
//       <AnimatePresence>
//         {isOpen && (
//           <motion.div
//             initial={{ height: 0, opacity: 0 }}
//             animate={{ height: "auto", opacity: 1 }}
//             exit={{ height: 0, opacity: 0 }}
//             transition={{ duration: 0.3, ease: "easeInOut" }}
//             className="overflow-hidden"
//           >
//             <div className="pt-6 border-t border-white/10 mt-4 space-y-4 text-sm md:text-base text-neutral-300 leading-relaxed">
//               {children}
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Click hint (only visible on hover when closed) */}
//       {!isOpen && (
//         <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
//       )}
//     </div>
//   );
// };

// export function WorkExp() {
//   const data = [
//     {
//       title: "Project Intern — Mumbai, India",
//       content: (
//         <ExperienceCard
//           company="Tata Power"
//           role="Project Intern"
//           date="[May 2025 – July 2025]"
//           points={[
//             "Modernized operational data systems for 3 major plants (Maithon, PPGCL, Jojobera) using AWS & PostgreSQL.",
//             "Reduced pipeline processing time from 6 mins to <30 seconds using caching & optimization.",
//             "Fixed critical data discrepancies across 80+ units by resolving UTC/IST bugs.",
//           ]}
//         >
//           <p>
//             Improved the reliability and performance of operational data systems across Tata Power’s Maithon, PPGCL, and Jojobera plants by automating daily logging workflows and modernizing backend infrastructure. Replaced manual CSV-based processes with a cloud-hosted PostgreSQL database, orchestrated using AWS Step Functions and scheduled cron jobs. This made data collection for blower states and temperature violations significantly more consistent and maintainable. Fixed critical data issues, including a UTC to IST time conversion bug and incorrect API usage, which had caused discrepancies across over 80 units. These fixes helped restore accuracy in real-time dashboards and improved trust in key operational metrics.
//           </p>
//           <p>
//             Focused on speeding up pipelines and dashboards that were slowing down decision-making. Reduced a core processing pipeline’s runtime from six minutes to under thirty seconds and cut dashboard response times from over forty seconds to under five. Achieved this through caching, endpoint optimization, and pushing heavy aggregation work into the database after identifying missing indexes. Built a real-time mill runtime tracking system with reliable job execution by isolating the scheduler in a dedicated thread. Also restructured legacy services into a modular, asynchronous design, which improved scalability and reduced response lag by forty percent.
//           </p>
//           <p>
//             Enhanced the platform’s analytical capabilities by integrating an existing time-series forecasting model for anomaly detection into the upgraded codebase, ensuring it worked smoothly after migration. On top of that, built a new suite of diagnostic APIs for LRSB health tracking, including caution flags and historical inactivity reports, which enabled a shift toward predictive maintenance and improved system visibility for plant operators.
//           </p>
//         </ExperienceCard>
//       ),
//     },
//     {
//       title: "Full Stack Developer Intern — Remote",
//       content: (
//         <ExperienceCard
//           company="TechWire Studio"
//           role="Full Stack Developer Intern"
//           date="[March 2025 – June 2025]"
//           points={[
//             "Built backend for 'Xceed Electronics' handling 1000+ monthly inventory & order actions.",
//             "Optimized API workflows to reduce backend latency by over 40%.",
//             "Developed a headless SaaS inventory platform featuring bulk asynchronous S3 uploads.",
//           ]}
//         >
//           <p>
//             Developed backend systems for multiple high-impact projects within the company. Led the development of a comprehensive business management platform for Xceed Electronics, featuring core functionalities such as real-time in-house inventory tracking, order enquiry processing, and secure, role-based admin operations. The platform also integrated the Waldom API to source and manage an extended range of products. Optimized API workflows to reduce backend latency by over 40%. Deployed the application on AWS to ensure scalability and reliability. The system currently handles over 1,000 inventory and order-related actions per month.
//           </p>
//           <p>
//             Led the complete backend development for a headless inventory and ordering platform, designed as a scalable Software-as-a-Service (SaaS) solution. The system was engineered with a robust, transactional ordering process to ensure data integrity and precise inventory control across products with multiple variants. A secure, dual-role authentication flow was implemented using Firebase JWT to manage distinct permissions for administrators and clients. For file management, the platform was integrated with AWS S3, featuring both single image uploads from product forms and a sophisticated, asynchronous bulk-upload system for ZIP archives that automatically processes images and generates CSV reports. The API was designed to be highly practical, accepting user-friendly identifiers (like product size) to simplify frontend integration and enhance the overall user experience for the authenticated ordering portal.
//           </p>
//         </ExperienceCard>
//       ),
//     },
//     {
//       title: "SDE Intern — Vellore, India",
//       content: (
//         <ExperienceCard
//           company="Seculinx"
//           role="SDE Intern"
//           date="[Sep 2024 – Jan 2025]"
//           points={[
//             "Built the digital foundation and backend API for smart home automation.",
//             "Improved load times by 35% through SEO strategies and UI component optimization.",
//             "Integrated real-time product features to enhance early brand presence.",
//           ]}
//         >
//           <p>
//             Played a key role in building the digital foundation for Seculinx, a smart home automation startup focused on AI-powered, intuitive living experiences. Designed and developed a high-performance, SEO-optimized website that showcased Seculinx's vision for intelligent home systems and energy-efficient automation.
//           </p>
//           <p>
//             Implemented scalable, responsive UI components and integrated real-time product features using modern web technologies. Achieved a 35% improvement in load times and enhanced user engagement through interactive, lifestyle-centric content — contributing to stronger early brand presence and lead generation.
//           </p>
//         </ExperienceCard>
//       ),
//     },
//   ];

//   return (
//     <div className="relative w-full overflow-clip py-16" id="workex">
//       <Heading text="Work Experience" />
//       <Timeline data={data} />
//     </div>
//   );
// }
"use client";
import React, { useState, useRef } from "react";
import { Timeline } from "./ui/timeline";
import Heading from "./Heading";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// --- 3D Tilt Card Logic ---
const ExperienceCard = ({
  company,
  role,
  date,
  points,
  children,
}: {
  company: string;
  role: string;
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
      {/* Content Container with slight Z lift for depth */}
      <div style={{ transform: "translateZ(20px)" }}>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-teal-400 transition-colors">
                {company}
              </h3>
              <p className="text-md md:text-lg font-medium text-neutral-400">
                {role}
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

export function WorkExp() {
  const data = [
    {
      title: "Project Intern — Mumbai, India",
      content: (
        <ExperienceCard
          company="Tata Power"
          role="Project Intern"
          date="[May 2025 – July 2025]"
          points={[
            "Modernized operational data systems for 3 major plants (Maithon, PPGCL, Jojobera) using AWS & PostgreSQL.",
            "Reduced pipeline processing time from 6 mins to <30 seconds using caching & optimization.",
            "Fixed critical data discrepancies across 80+ units by resolving UTC/IST bugs.",
          ]}
        >
          <p>
            Improved the reliability and performance of operational data systems across Tata Power’s Maithon, PPGCL, and Jojobera plants by automating daily logging workflows and modernizing backend infrastructure. Replaced manual CSV-based processes with a cloud-hosted PostgreSQL database, orchestrated using AWS Step Functions and scheduled cron jobs. This made data collection for blower states and temperature violations significantly more consistent and maintainable. Fixed critical data issues, including a UTC to IST time conversion bug and incorrect API usage, which had caused discrepancies across over 80 units. These fixes helped restore accuracy in real-time dashboards and improved trust in key operational metrics.
          </p>
          <p>
            Focused on speeding up pipelines and dashboards that were slowing down decision-making. Reduced a core processing pipeline’s runtime from six minutes to under thirty seconds and cut dashboard response times from over forty seconds to under five. Achieved this through caching, endpoint optimization, and pushing heavy aggregation work into the database after identifying missing indexes. Built a real-time mill runtime tracking system with reliable job execution by isolating the scheduler in a dedicated thread. Also restructured legacy services into a modular, asynchronous design, which improved scalability and reduced response lag by forty percent.
          </p>
          <p>
            Enhanced the platform’s analytical capabilities by integrating an existing time-series forecasting model for anomaly detection into the upgraded codebase, ensuring it worked smoothly after migration. On top of that, built a new suite of diagnostic APIs for LRSB health tracking, including caution flags and historical inactivity reports, which enabled a shift toward predictive maintenance and improved system visibility for plant operators.
          </p>
        </ExperienceCard>
      ),
    },
    {
      title: "Full Stack Developer Intern — Remote",
      content: (
        <ExperienceCard
          company="TechWire Studio"
          role="Full Stack Developer Intern"
          date="[March 2025 – June 2025]"
          points={[
            "Built backend for 'Xceed Electronics' handling 1000+ monthly inventory & order actions.",
            "Optimized API workflows to reduce backend latency by over 40%.",
            "Developed a headless SaaS inventory platform featuring bulk asynchronous S3 uploads.",
          ]}
        >
          <p>
            Developed backend systems for multiple high-impact projects within the company. Led the development of a comprehensive business management platform for Xceed Electronics, featuring core functionalities such as real-time in-house inventory tracking, order enquiry processing, and secure, role-based admin operations. The platform also integrated the Waldom API to source and manage an extended range of products. Optimized API workflows to reduce backend latency by over 40%. Deployed the application on AWS to ensure scalability and reliability. The system currently handles over 1,000 inventory and order-related actions per month.
          </p>
          <p>
            Led the complete backend development for a headless inventory and ordering platform, designed as a scalable Software-as-a-Service (SaaS) solution. The system was engineered with a robust, transactional ordering process to ensure data integrity and precise inventory control across products with multiple variants. A secure, dual-role authentication flow was implemented using Firebase JWT to manage distinct permissions for administrators and clients. For file management, the platform was integrated with AWS S3, featuring both single image uploads from product forms and a sophisticated, asynchronous bulk-upload system for ZIP archives that automatically processes images and generates CSV reports. The API was designed to be highly practical, accepting user-friendly identifiers (like product size) to simplify frontend integration and enhance the overall user experience for the authenticated ordering portal.
          </p>
        </ExperienceCard>
      ),
    },
    {
      title: "SDE Intern — Vellore, India",
      content: (
        <ExperienceCard
          company="Seculinx"
          role="SDE Intern"
          date="[Sep 2024 – Jan 2025]"
          points={[
            "Built the digital foundation and backend API for smart home automation.",
            "Improved load times by 35% through SEO strategies and UI component optimization.",
            "Integrated real-time product features to enhance early brand presence.",
          ]}
        >
          <p>
            Played a key role in building the digital foundation for Seculinx, a smart home automation startup focused on AI-powered, intuitive living experiences. Designed and developed a high-performance, SEO-optimized website that showcased Seculinx's vision for intelligent home systems and energy-efficient automation.
          </p>
          <p>
            Implemented scalable, responsive UI components and integrated real-time product features using modern web technologies. Achieved a 35% improvement in load times and enhanced user engagement through interactive, lifestyle-centric content — contributing to stronger early brand presence and lead generation.
          </p>
        </ExperienceCard>
      ),
    },
  ];

  return (
    <div className="relative w-full overflow-clip py-16" id="workex">
      <Heading text="Work Experience" />
      <Timeline data={data} />
    </div>
  );
}