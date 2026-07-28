import type { CSSProperties } from "react";

// Single source of truth for per-section identity: the heading label, its
// mission-log eyebrow, and the accent colour that section paints with.
//
// Before this file the palette existed twice and disagreed with itself:
// AmbientGlow had one ramp, FlightPath had another. Both now read from here.
//
// Colours are deliberately steered away from the site's omnipresent teal so the
// page reads as a journey through different regions of space rather than one
// long teal corridor.

export type SectionId =
  | "about-me"
  | "workex"
  | "education"
  | "skills-achievements"
  | "projects"
  | "publications"
  | "contact";

export type SectionMeta = {
  id: SectionId;
  /** Heading text. */
  label: string;
  /** Mono eyebrow above the heading. Null for sections without a heading. */
  eyebrow: string | null;
  /** Display index, e.g. 1 renders as "01". Null for About, which has no heading. */
  index: number | null;
  /** Primary accent. */
  rgb: [number, number, number];
  /** Secondary accent, used as the second stop in gradients and card borders. */
  rgb2: [number, number, number];
  hex: string;
  /** ~300-weight tint, for highlights against the dark backdrop. */
  light: string;
  /** ~100-weight tint, for the brightest specular details. */
  pale: string;
};

export const SECTIONS: SectionMeta[] = [
  {
    id: "about-me",
    label: "About",
    eyebrow: null,
    index: null,
    rgb: [56, 189, 248],
    rgb2: [45, 212, 191],
    hex: "#38bdf8",
    light: "#7dd3fc",
    pale: "#e0f2fe",
  },
  {
    id: "workex",
    label: "Work Experience",
    eyebrow: "MISSION LOG",
    index: 1,
    rgb: [251, 146, 60],
    rgb2: [251, 191, 36],
    hex: "#fb923c",
    light: "#fdba74",
    pale: "#ffedd5",
  },
  {
    id: "education",
    label: "Education",
    eyebrow: "ORIGIN",
    index: 2,
    rgb: [96, 165, 250],
    rgb2: [56, 189, 248],
    hex: "#60a5fa",
    light: "#93c5fd",
    pale: "#dbeafe",
  },
  {
    id: "skills-achievements",
    label: "Skills & Achievements",
    eyebrow: "SYSTEMS",
    index: 3,
    rgb: [167, 139, 250],
    rgb2: [129, 140, 248],
    hex: "#a78bfa",
    light: "#c4b5fd",
    pale: "#ede9fe",
  },
  {
    id: "projects",
    label: "Projects",
    eyebrow: "PAYLOAD",
    index: 4,
    rgb: [244, 114, 182],
    rgb2: [167, 139, 250],
    hex: "#f472b6",
    light: "#f9a8d4",
    pale: "#fce7f3",
  },
  {
    id: "publications",
    label: "Publications & Patents",
    eyebrow: "RESEARCH LOG",
    index: 5,
    rgb: [129, 140, 248],
    rgb2: [167, 139, 250],
    hex: "#818cf8",
    light: "#a5b4fc",
    pale: "#e0e7ff",
  },
  {
    id: "contact",
    label: "Let's Connect",
    eyebrow: "OPEN CHANNEL",
    index: 6,
    rgb: [251, 191, 36],
    rgb2: [251, 146, 60],
    hex: "#fbbf24",
    light: "#fcd34d",
    pale: "#fef3c7",
  },
];

const BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));

export function getSection(id: SectionId): SectionMeta {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown section: ${id}`);
  return found;
}

/** `rgba(...)` string from a section's primary accent. */
export function accentRgba(section: SectionMeta, alpha: number): string {
  const [r, g, b] = section.rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Inline style that hands a section's accent to the shared CSS
 * (.meteor-border, .pulse-border), which read --accent-rgb / --accent-rgb-2
 * and fall back to teal when nothing sets them.
 */
export function accentVars(section: SectionMeta): CSSProperties {
  return {
    "--accent-rgb": section.rgb.join(", "),
    "--accent-rgb-2": section.rgb2.join(", "),
  } as CSSProperties;
}
