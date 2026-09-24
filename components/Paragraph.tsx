"use client";
import React, { useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { glideTo } from "@/lib/glide";

interface ParagraphProps {
  para: string;
  className?: string;
}

// The About paragraph. As it scrolls through the viewport each word decodes
// from signal glyphs into letters. The highlighted keywords show where the
// claim is backed up and fly there on click; the languages say hello in
// their own script.

type Keyword = {
  title: string;
  detail: string;
  /** Where a click glides to; falls back to the section. */
  target: () => Element | null;
  section: string;
};

const byText = (selector: string, needle: string) =>
  Array.from(document.querySelectorAll(selector)).find((el) => el.textContent?.includes(needle)) ?? null;

// Keys are lower case; matched case-insensitively against the paragraph
const KEYWORDS: Record<string, Keyword> = {
  "software development engineer": {
    title: "Full-time since June 2026",
    detail: "remote · full-stack features, spec to production",
    target: () => document.querySelector("#workex [role=button]"),
    section: "workex",
  },
  "backend development": {
    title: "FastAPI · NodeJS · ExpressJS · PostgreSQL · Nginx",
    detail: "hover a skill to see where it was used",
    target: () => byText("#skills-achievements li", "FastAPI"),
    section: "skills-achievements",
  },
  "information technology": {
    title: "B.Tech IT · VIT Vellore",
    detail: "CGPA 9.22",
    target: () => byText("#education h3", "Vellore")?.parentElement ?? null,
    section: "education",
  },
  ai: {
    title: "Co-inventor on a patent",
    detail: "AI powered smart disease detection",
    target: () => byText("#publications h4", "Co-inventor")?.closest(".group") ?? null,
    section: "publications",
  },
  ml: {
    title: "Published research",
    detail: "quantum kernels, abstaining classifiers, anonymisation",
    target: () => byText("#publications h4", "Quantum")?.closest(".group") ?? null,
    section: "publications",
  },
  "deep learning": {
    title: "Exploring it on the side",
    detail: "AquaSelect put it to work on underwater species",
    target: () => byText("#publications h4", "AquaSelect")?.closest(".group") ?? null,
    section: "publications",
  },
};

const LANGUAGES: Record<string, { hello: string; say: string }> = {
  english: { hello: "Hello", say: "hi there" },
  hindi: { hello: "नमस्ते", say: "namaste" },
  gujarati: { hello: "કેમ છો", say: "kem cho" },
  bengali: { hello: "নমস্কার", say: "nomoshkar" },
};

type Group = { kind: "keyword" | "lang"; key: string };
type WordToken = { text: string; tail: string; group: number | null };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Split the paragraph into words, grouping the ones inside a keyword or a
// language so each group hovers as one. Punctuation right after a word rides
// along as its tail, so "ML." does not come out as "ML ."
function tokenize(para: string): { words: WordToken[]; groups: Group[] } {
  const terms = [...Object.keys(KEYWORDS), ...Object.keys(LANGUAGES)].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${terms.map(escape).join("|")})\\b`, "gi");
  const words: WordToken[] = [];
  const groups: Group[] = [];

  const pushPlain = (text: string) => {
    // Leading punctuation belongs to the word before it
    const lead = text.match(/^[^\s]+/);
    if (lead && words.length && !/^\s/.test(text)) {
      words[words.length - 1].tail += lead[0];
      text = text.slice(lead[0].length);
    }
    for (const w of text.split(/\s+/)) if (w) words.push({ text: w, tail: "", group: null });
  };

  let last = 0;
  for (const m of para.matchAll(pattern)) {
    const i = m.index ?? 0;
    if (i > last) pushPlain(para.slice(last, i));
    const key = m[0].toLowerCase();
    groups.push({ kind: key in KEYWORDS ? "keyword" : "lang", key });
    for (const w of m[0].split(/\s+/)) words.push({ text: w, tail: "", group: groups.length - 1 });
    last = i + m[0].length;
  }
  if (last < para.length) pushPlain(para.slice(last));
  return { words, groups };
}

// Sky, matching the About section's gauges (constants/sections.ts)
const keywordClass = "text-sky-400 font-bold drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]";
const langClass = "underline decoration-sky-400/40 decoration-dotted underline-offset-[6px]";

const GLYPHS = "ΛΣΞΠΦΨΩΔ◊⊕⊗⋄∴≡≈±×<>/\\|#%&*+=?";
const glyphFor = (seed: number) => GLYPHS[Math.abs(Math.imul(seed ^ 0x5bd1e995, 2654435761)) % GLYPHS.length];

// One word: dim glyphs that resolve into letters, left to right, as the
// scroll crosses its window
const Word = ({
  token,
  index,
  progress,
  range,
  className,
}: {
  token: WordToken;
  index: number;
  progress: MotionValue<number>;
  range: [number, number];
  className?: string;
}) => {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const len = token.text.length;
  const resolvedAt = (v: number) => {
    const p = Math.min(1, Math.max(0, (v - range[0]) / (range[1] - range[0])));
    return p >= 1 ? len : Math.floor(p * (len + 1));
  };
  const [shown, setShown] = useState(() => resolvedAt(progress.get()));
  // Changes as the scroll moves, so the undecoded letters flicker only then
  const [roll, setRoll] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    const n = resolvedAt(v);
    setShown((prev) => (prev === n ? prev : n));
    if (n > 0 && n < len) setRoll((r) => r + 1);
  });

  return (
    <motion.span style={{ opacity }} className={className}>
      {shown >= len ? (
        token.text
      ) : (
        <>
          <span className="sr-only">{token.text}</span>
          <span aria-hidden>
            {token.text.slice(0, shown)}
            {Array.from(token.text.slice(shown)).map((ch, i) => (
              <span key={i} className="relative">
                <span className="invisible">{ch}</span>
                <span className="absolute left-0 top-0 font-mono font-normal text-sky-300/70">
                  {glyphFor(index * 131 + (shown + i) * 17 + Math.floor(roll / 3) * 7)}
                </span>
              </span>
            ))}
          </span>
        </>
      )}
      {token.tail}
    </motion.span>
  );
};

// Shared card chrome for a keyword's evidence and a language's greeting
const cardClass =
  "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 leading-snug -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-xl border border-sky-400/30 bg-slate-950/95 px-3.5 py-2 text-center font-normal opacity-0 shadow-[0_0_24px_rgba(56,189,248,0.18)] backdrop-blur-sm transition-all duration-200 group-hover/kw:translate-y-0 group-hover/kw:opacity-100 group-focus-visible/kw:translate-y-0 group-focus-visible/kw:opacity-100";

const KeywordCard = ({ k }: { k: Keyword }) => (
  <span aria-hidden className={cardClass}>
    <span className="block font-mono text-[11px] text-sky-200">{k.title}</span>
    <span className="mt-0.5 block font-mono text-[11px] sm:text-[10px] text-neutral-400">{k.detail}</span>
    <span className="mt-1 block font-mono text-[11px] sm:text-[9px] uppercase tracking-[0.2em] text-sky-400/70">click to fly there ↓</span>
  </span>
);

const LanguageCard = ({ l }: { l: { hello: string; say: string } }) => (
  <span aria-hidden className={cardClass}>
    <span className="block text-xl leading-tight text-sky-100">{l.hello}</span>
    <span className="mt-0.5 block font-mono text-[11px] sm:text-[10px] text-neutral-400">{l.say}</span>
  </span>
);

function flyTo(k: Keyword) {
  const el = k.target() ?? document.getElementById(k.section);
  if (!el) return;
  // A skill also opens its readout, as it does when hovered
  glideTo(el, k.section === "skills-achievements" && el.tagName === "LI" ? () => (el as HTMLElement).click() : undefined);
}

const Paragraph: React.FC<ParagraphProps> = ({ para, className }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { words, groups } = useMemo(() => tokenize(para), [para]);

  // Scrub the reveal across the paragraph's pass through the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.55"],
  });

  const wrapClass = cn("px-4 lg:px-20 py-20 md:py-32 max-w-4xl mx-auto", className);
  const textClass = "text-neutral-300 font-medium text-center text-lg lg:text-2xl leading-relaxed";

  // Render the words, wrapping each keyword or language group in its hover target
  const renderWord = (w: WordToken, i: number) => {
    const g = w.group === null ? null : groups[w.group];
    const cls = g?.kind === "keyword" ? keywordClass : g?.kind === "lang" ? langClass : undefined;
    if (reduce) {
      return (
        <span key={i} className={cls}>
          {w.text}
          {w.tail}
        </span>
      );
    }
    // Each word's reveal window, slightly widened so neighbours overlap smoothly
    const start = i / words.length;
    const end = Math.min(1, (i + 2) / words.length);
    return <Word key={i} token={w} index={i} progress={scrollYProgress} range={[start, end]} className={cls} />;
  };

  const out: React.ReactNode[] = [];
  for (let i = 0; i < words.length; ) {
    const gi = words[i].group;
    if (gi === null) {
      out.push(renderWord(words[i], i), " ");
      i++;
      continue;
    }
    const members: React.ReactNode[] = [];
    let j = i;
    while (j < words.length && words[j].group === gi) {
      if (j > i) members.push(" ");
      members.push(renderWord(words[j], j));
      j++;
    }
    const g = groups[gi];
    if (g.kind === "keyword") {
      const k = KEYWORDS[g.key];
      out.push(
        <span
          key={`g${gi}`}
          role="link"
          tabIndex={0}
          aria-label={`${words.slice(i, j).map((w) => w.text).join(" ")}: ${k.title}. Go there`}
          className="group/kw relative cursor-pointer whitespace-nowrap rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          onClick={() => flyTo(k)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              flyTo(k);
            }
          }}
        >
          {members}
          <KeywordCard k={k} />
        </span>,
        " ",
      );
    } else {
      out.push(
        <span key={`g${gi}`} tabIndex={0} className="group/kw relative cursor-default rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60">
          {members}
          <LanguageCard l={LANGUAGES[g.key]} />
        </span>,
        " ",
      );
    }
    i = j;
  }

  return (
    <div className={wrapClass}>
      <p ref={ref} className={textClass}>
        {out}
      </p>
    </div>
  );
};

export default Paragraph;
