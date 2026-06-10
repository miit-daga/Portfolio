"use client";
import React, { useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParagraphProps {
  para: string;
  className?: string;
}

// Words highlighted in teal once revealed
const KEYWORDS = [
  "Information Technology",
  "backend development",
  "AI",
  "ML",
  "Deep Learning",
];

type WordToken = { text: string; keyword: boolean };

// Split the paragraph into words, tagging the ones inside a keyword phrase
function tokenize(para: string): WordToken[] {
  const pattern = new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "gi");
  const spans: { text: string; keyword: boolean }[] = [];
  let last = 0;
  for (const m of para.matchAll(pattern)) {
    const i = m.index ?? 0;
    if (i > last) spans.push({ text: para.slice(last, i), keyword: false });
    spans.push({ text: m[0], keyword: true });
    last = i + m[0].length;
  }
  if (last < para.length) spans.push({ text: para.slice(last), keyword: false });

  const words: WordToken[] = [];
  for (const span of spans) {
    for (const w of span.text.split(/\s+/)) {
      if (w) words.push({ text: w, keyword: span.keyword });
    }
  }
  return words;
}

const keywordClass = "text-teal-400 font-bold drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]";

const Word = ({
  token,
  progress,
  range,
}: {
  token: WordToken;
  progress: MotionValue<number>;
  range: [number, number];
}) => {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={token.keyword ? keywordClass : undefined}>
      {token.text}{" "}
    </motion.span>
  );
};

const Paragraph: React.FC<ParagraphProps> = ({ para, className }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const words = useMemo(() => tokenize(para), [para]);

  // Scrub the reveal across the paragraph's pass through the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.55"],
  });

  const baseClass = cn(
    "text-neutral-300 font-medium text-center text-lg lg:text-2xl px-4 lg:px-20 py-20 md:py-32 max-w-4xl mx-auto leading-relaxed",
    className
  );

  // Reduced motion: render the old static version, keywords always lit
  if (reduce) {
    return (
      <p ref={ref} className={baseClass}>
        {words.map((w, i) => (
          <span key={i} className={w.keyword ? keywordClass : undefined}>
            {w.text}{" "}
          </span>
        ))}
      </p>
    );
  }

  return (
    <p ref={ref} className={baseClass}>
      {words.map((w, i) => {
        // Each word's reveal window, slightly widened so neighbours overlap smoothly
        const start = i / words.length;
        const end = Math.min(1, (i + 2) / words.length);
        return <Word key={i} token={w} progress={scrollYProgress} range={[start, end]} />;
      })}
    </p>
  );
};

export default Paragraph;
