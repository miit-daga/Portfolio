import type { SectionId } from "./sections";

// Where each skill in the Skills section was actually used, shown in the
// panel readout when a visitor hovers or taps a skill.
//
// Only entries with evidence are listed: the work descriptions in
// components/WorkExp.tsx, the education notes, and the featured repos'
// dependencies. A skill with no entry simply shows no trail, so add to this
// rather than guessing.

export type Usage = {
  label: string;
  /** Which part of the page it points to; colours its dot to match. */
  section: SectionId;
};

const TATA: Usage = { label: "Tata Power", section: "workex" };
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
  ReactJS: [THIS_SITE, DISMAN],
  NextJS: [THIS_SITE],

  MongoDB: [DISMAN],
  MySQL: [QUICK_SEED],
  PostgreSQL: [TATA, QUICK_SEED],
  Firebase: [TECHWIRE],

  AWS: [TATA, TECHWIRE, FITAI],
  Vercel: [THIS_SITE],
};
