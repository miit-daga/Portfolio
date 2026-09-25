// What Mission Control (app/api/mission-control) knows: the site's own
// content, condensed, and nothing else. It answers only from this, so when the
// site changes (a new job, paper or project), this changes with it. Each part
// is tagged with the section it comes from, so an answer can offer to fly the
// visitor there, and the no-AI fallback can search it.
//
// Sources: constants/index.ts (about), components/WorkExp.tsx, Education.tsx,
// SkillsAndAchievements.tsx, Publications.tsx, Contact.tsx, and the curated
// repos in constants/projects.ts (their descriptions are GitHub's).

export type SectionId = "about-me" | "workex" | "education" | "skills-achievements" | "projects" | "publications" | "contact" | "arcade";

/** Where each section is, and what it's called, for the answer's buttons. */
export const PLACES: Record<SectionId, { label: string; href: string }> = {
    "about-me": { label: "About", href: "#about-me" },
    workex: { label: "Work Experience", href: "#workex" },
    education: { label: "Education", href: "#education" },
    "skills-achievements": { label: "Skills & Achievements", href: "#skills-achievements" },
    projects: { label: "Projects", href: "#projects" },
    publications: { label: "Publications & Patents", href: "#publications" },
    contact: { label: "Contact", href: "#contact" },
    arcade: { label: "Crew Arcade", href: "/arcade" },
};

// (`keys`: words people might use for it, for the no-AI search)
export const FACTS: { section: SectionId; text: string; keys?: string }[] = [
    {
        section: "about-me",
        text: "Miit Daga is a software development engineer, full-time since June 2026 (remote), who loves backend development (FastAPI, NodeJS, ExpressJS, PostgreSQL, Nginx). B.Tech in Information Technology from VIT Vellore, CGPA 9.22. Into AI and ML on the side, exploring deep learning lately; happiest turning ideas into systems people use. Speaks English, Hindi, Gujarati and Bengali. Learns fast and works best alongside a team. Based in Kolkata, India. At a glance: 10 Scopus-indexed publications, 1 published patent, 2 hackathon wins, CGPA 9.22.",
        keys: "who summary overview introduction background languages speak location based kolkata india",
    },
    {
        section: "workex",
        text: "Software Development Engineer at Talendy Holdings (via Tech Japan Lab), remote, June 2026 to present. Builds and ships full-stack features across internal products, from specification and design through to production deployment. Owns technical workstreams, partners with senior engineers to deliver on schedule, helps shape architecture and design decisions, resolves production issues, and steadily improves performance and stability.",
        keys: "current job role now present employer full time sde",
    },
    {
        section: "workex",
        text: "Full Stack Engineering Intern at Akatsuki AI Technologies, remote, Oct 2025 to May 2026. Internally selected for the CAIO Technical Unit: supported technical research, system design and project-level planning under the CAIO's supervision. Led a team and coordinated development alongside senior engineers; drove end-to-end feature development and aligned technical decisions across internal initiatives. Also improved system reliability, contributed to architecture discussions, ran technical investigations, documented engineering processes and supported internal project management.",
        keys: "internship intern lead leadership team caio research",
    },
    {
        section: "workex",
        text: "Project Intern at Tata Power, Mumbai, May 2025 to July 2025. Modernized operational data systems for three plants (Maithon, PPGCL, Jojobera) with AWS and PostgreSQL: replaced manual CSV logging with a cloud PostgreSQL database orchestrated by AWS Step Functions and cron jobs. Cut a core pipeline from 6 minutes to under 30 seconds and dashboard responses from about 35 seconds to under 5 (caching, endpoint optimization, pushing aggregation into the database after finding missing indexes). Fixed a UTC to IST conversion bug and incorrect API usage that had caused discrepancies across 80+ units. Built real-time mill runtime tracking with an isolated scheduler thread, restructured legacy services into a modular asynchronous design (40% less response lag), integrated a time-series forecasting model for anomaly detection, and built diagnostic APIs for LRSB health tracking (caution flags, inactivity reports) for predictive maintenance.",
        keys: "internship intern aws postgresql performance optimization pipeline database cloud data",
    },
    {
        section: "workex",
        text: "Full Stack Developer Intern at TechWire Studio, remote, March 2025 to June 2025. Led the backend for Xceed Electronics' business management platform: real-time inventory tracking, order enquiries, role-based admin, the Waldom API for extended products, deployed on AWS, handling 1,000+ inventory and order actions a month; cut backend latency by over 40%. Led the backend of a headless inventory and ordering SaaS: transactional ordering across product variants, dual-role auth with Firebase JWT, AWS S3 uploads including asynchronous bulk ZIP image processing with CSV reports.",
        keys: "internship intern backend aws s3 firebase saas inventory api latency cloud",
    },
    {
        section: "workex",
        text: "SDE Intern at Seculinx, Vellore, Sep 2024 to Jan 2025. Built the digital foundation and backend API for a smart home automation startup: a high-performance, SEO-optimized website, scalable responsive UI components and real-time product features; improved load times by 35%.",
        keys: "internship intern frontend website seo smart home",
    },
    {
        section: "education",
        text: "Vellore Institute of Technology (VIT Vellore), B.Tech in Information Technology, 2022 to 2026, CGPA 9.22 out of 10. Focus: backend engineering, DBMS, cloud computing, AI/ML. While studying: 10 Scopus-indexed papers, 1 published patent, 2 hackathon wins, 4 internships. Before that: Swami Vivekananda Vidyamandir, CBSE Class XII, 92% (2020 to 2022, first serious Python work); St. Helen's School, ICSE Class X, 91.6% (2008 to 2020, Java and object-oriented foundations).",
        keys: "education university college degree btech school cgpa gpa grades marks vit",
    },
    {
        section: "skills-achievements",
        text: "Languages: JavaScript, TypeScript, Java, Python, C, C++, HTML, CSS, SQL. Libraries and frameworks: NodeJS, ExpressJS, FastAPI, ReactJS, NextJS, Bootstrap, Chakra UI. Databases: MongoDB, MySQL, PostgreSQL, Redis, Firebase, BigQuery. Tools and platforms: Git, Postman, Playwright, AWS, GCP, Nginx, VS Code, Render, Vercel, Netlify.",
        keys: "skills stack tech technologies tools languages frameworks databases cloud platforms aws gcp",
    },
    {
        section: "skills-achievements",
        text: "Hackathons: 2nd place at the Synapse Hackathon (Yantra-2025), building the backend for a tool that automates the MoCA cognitive test for at-home dementia assessment. 2nd place at the Hackovation Hackathon (GraVITas-2024), building the backend for a high-volume emergency system that prioritizes calls by severity and dispatches the nearest response teams.",
        keys: "hackathon hackathons competition award prize win wins winner",
    },
    {
        section: "projects",
        text: "Featured open-source projects: quick-seed (npm), a database-agnostic seeding tool for realistic development data, TypeScript. flowsquire (npm), organizes local files with WHEN to DO workflows, zero cloud dependency, priority-based rule matching, templates and a CLI, TypeScript. env-guard (npm), validates, parses and type-checks Node.js environment variables with a schema, zero-dependency, TypeScript-native, with a CLI. DriftGuard-ETC, adaptive ML network traffic classification that handles concept drift by watching shifts in predicted class centroids and retraining an XGBoost model, evaluated on CIC-IDS2017. FitAI-backend, a cloud and AI wellness platform analyzing wearable health data with AWS services and Amazon Bedrock. DisMan, a high-volume emergency call system that prioritizes by severity and dispatches the nearest response teams.",
        keys: "projects built build open source npm packages github portfolio work",
    },
    {
        section: "projects",
        text: "Also on GitHub: LinkSage (URL shortener with custom links), QRify (Node.js and Express API for QR codes for text and Wi-Fi credentials, custom colours), semi-e-commerce (product catalog with CSV import, Node.js and Prisma backend, React and Chakra UI frontend), TaskFlow (Next.js task manager with auth, a Kanban board and AWS SNS deadline notifications). GitHub: github.com/miit-daga.",
        keys: "projects github side apps",
    },
    {
        section: "publications",
        text: "Research: 10 Scopus-indexed papers (more under review), a book chapter and a published patent; full record on ORCID (orcid.org/0009-0005-4629-458X), linked in the Publications section. Highlights: VeriX-Anon (Array, Elsevier), a framework that lets a data owner verify outsourced anonymisation with a cryptographic fingerprint, planted decoy records and an AI check on the data's shape; it caught 27 of 28 cheating attempts with no false alarms, checking in under a second even at a million rows. Adaptive Quantum Kernel Selection via Leakage-Free Stacking for Clinical Diagnostics on NISQ Hardware (Scientific Reports, Nature Portfolio): three quantum encodings with a meta-learner; on Parkinson's, specificity rose from 0.585 to 0.813 with recall above 0.95. AquaSelect (Array, Elsevier): learns when to abstain for underwater species classification; passing on the hardest 20% lifts accuracy from 87.3% to 94.8%, at 149 FPS, about 2.8 times faster than deep ensembles.",
        keys: "research papers publications published journal quantum anonymization anonymisation underwater scopus orcid",
    },
    {
        section: "publications",
        text: "Patent: co-inventor, AI Powered Smart Disease Detection, an Indian patent filed in September 2025 and now published. It detects disease in the leaves of five crops (coconut, rubber, black gram, turmeric, eggplant) from an ordinary photo with 99.3% accuracy in under 2.5 seconds, without specialised hardware.",
        keys: "patent invention inventor crop leaf disease detection agriculture",
    },
    {
        section: "contact",
        text: "Contact: email miitcodes27@gmail.com; GitHub github.com/miit-daga; LinkedIn linkedin.com/in/miit-daga; the resume is at /resume on this site. The Let's Connect section has a message form, the email and phone, and a guestbook. Miit is open to questions about his research, project ideas and conversations about code.",
        keys: "contact email reach hire hiring message phone linkedin resume cv get in touch",
    },
    {
        section: "arcade",
        text: "The site also has a Crew Arcade (/arcade) of space games Miit built with three.js: Gravity Assist, Asteroid Run (with Free flight) and Stack the Station, with daily challenges and leaderboards, plus a terminal page and hidden easter eggs.",
        keys: "games arcade game play fun easter eggs terminal",
    },
];

/** The notes the model answers from, each line tagged with its section. */
export const KNOWLEDGE = FACTS.map((f) => `[${f.section}] ${f.text}`).join("\n");
