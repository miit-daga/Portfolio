import type { SectionId } from "./sections";

// Where each skill in the Skills section was actually used, shown in the
// panel readout when a visitor hovers or taps a skill.
//
// Only entries with evidence are listed: the work descriptions in
// components/WorkExp.tsx, the education notes, and the featured repos'
// dependencies, plus what Miit has confirmed directly. A skill with no entry
// falls back to FALLBACK_USAGE, so add to this rather than guessing.

export type Usage = {
  label: string;
  /** Which part of the page it points to; colours its dot to match. */
  section: SectionId;
};

const TALENDY: Usage = { label: "Talendy Holdings", section: "workex" };
const TATA: Usage = { label: "Tata Power", section: "workex" };
const AKATSUKI: Usage = { label: "Akatsuki AI", section: "workex" };
const TECHWIRE: Usage = { label: "TechWire Studio", section: "workex" };
const SECULINX: Usage = { label: "Seculinx", section: "workex" };

const QUICK_SEED: Usage = { label: "quick-seed", section: "projects" };
const FLOWSQUIRE: Usage = { label: "flowsquire", section: "projects" };
const ENV_GUARD: Usage = { label: "env-guard", section: "projects" };
const DRIFTGUARD: Usage = { label: "DriftGuard-ETC", section: "projects" };
const FITAI: Usage = { label: "FitAI-backend", section: "projects" };
const DISMAN: Usage = { label: "DisMan", section: "projects" };

const RESEARCH: Usage = { label: "Research papers", section: "publications" };
const ICSE: Usage = { label: "ICSE · Class X", section: "education" };
const THIS_SITE: Usage = { label: "This site", section: "about-me" };

// Tools that run through everything rather than a list of places
const EVERYWHERE: Usage = { label: "Every project and internship", section: "workex" };
const DAILY: Usage = { label: "Daily, for everything", section: "about-me" };

/** Shown for a skill with no entry below, so the readout is never empty. */
export const FALLBACK_USAGE: Usage[] = [{ label: "Various projects", section: "projects" }];

export const SKILL_USAGE: Record<string, Usage[]> = {
  JavaScript: [FITAI, DISMAN],
  TypeScript: [QUICK_SEED, FLOWSQUIRE, ENV_GUARD, THIS_SITE],
  Java: [ICSE],
  Python: [RESEARCH, DRIFTGUARD, DISMAN],
  HTML: [SECULINX, THIS_SITE],
  CSS: [SECULINX, THIS_SITE],
  SQL: [TATA, QUICK_SEED],

  NodeJS: [QUICK_SEED, FLOWSQUIRE, ENV_GUARD, FITAI],
  ExpressJS: [FITAI, DISMAN],
  FastAPI: [TATA, AKATSUKI],
  ReactJS: [THIS_SITE, DISMAN],
  NextJS: [THIS_SITE],

  MongoDB: [DISMAN],
  MySQL: [QUICK_SEED],
  PostgreSQL: [TATA, QUICK_SEED],
  Firebase: [TECHWIRE],

  Git: [EVERYWHERE],
  AWS: [TALENDY, AKATSUKI, TATA, TECHWIRE, FITAI],
  // DisMan's services run on Google Cloud Speech-to-Text and Translate
  GCP: [DISMAN],
  Nginx: [TATA, TECHWIRE],
  "VS Code": [DAILY],
  Vercel: [THIS_SITE],
};
