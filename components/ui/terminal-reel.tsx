"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import type { Reel, ReelLine, ReelTone } from "@/constants/project-reels";

// A tiny terminal inside a featured project card that replays a scripted run
// (constants/project-reels.ts): commands type out, output prints line by line,
// progress bars fill, then it holds and loops. It only plays while on screen
// and restarts from the top each time it scrolls back in. Reduced motion gets
// the finished transcript, still.
//
// One timeout chain per card and plain text nodes, so six of these cost next
// to nothing.

const BAR_CELLS = 14;
const LOOP_HOLD_MS = 3400;

const TONE_CLASS: Record<ReelTone, string> = {
  dim: "text-zinc-500",
  ok: "text-emerald-400",
  err: "text-rose-400",
  warn: "text-amber-300",
  accent: "",
};

const ACCENT = "rgb(var(--accent-rgb, 45, 212, 191))";

function barText(pct: number, total: number, label: string) {
  const filled = Math.round((pct / 100) * BAR_CELLS);
  const value = Math.round((pct / 100) * total);
  return `${"█".repeat(filled)}${"░".repeat(BAR_CELLS - filled)} ${pct}% | ${value}/${total} | ${label}`;
}

// How long a finished line waits before the next one starts
function pauseAfter(line: ReelLine): number {
  if (line.kind === "cmd") return 420;
  if (line.kind === "bar") return 200;
  if (line.kind === "gap") return 90;
  return 150 + Math.min(260, line.text.length * 2);
}

export const TerminalReel = ({ reel }: { reel: Reel }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion();

  // `step` is the line currently playing; lines before it are complete
  const [step, setStep] = useState(0);
  const [chars, setChars] = useState(0);
  const [barPct, setBarPct] = useState(0);

  const { lines } = reel;
  const done = step >= lines.length;

  // Back to the top whenever the card leaves the screen
  useEffect(() => {
    if (!inView) {
      setStep(0);
      setChars(0);
      setBarPct(0);
    }
  }, [inView]);

  useEffect(() => {
    if (reduce || !inView) return;
    let t: ReturnType<typeof setTimeout>;

    if (done) {
      t = setTimeout(() => {
        setStep(0);
        setChars(0);
        setBarPct(0);
      }, LOOP_HOLD_MS);
      return () => clearTimeout(t);
    }

    const line = lines[step];
    const next = () => {
      setStep((s) => s + 1);
      setChars(0);
      setBarPct(0);
    };

    if (line.kind === "cmd" && chars < line.text.length) {
      // Human-ish typing: quick with the odd hesitation
      t = setTimeout(() => setChars((c) => c + 1), 22 + Math.random() * 38);
    } else if (line.kind === "bar" && barPct < 100) {
      t = setTimeout(() => setBarPct((p) => Math.min(100, p + 5)), 45);
    } else {
      t = setTimeout(next, pauseAfter(line));
    }
    return () => clearTimeout(t);
  }, [reduce, inView, done, step, chars, barPct, lines]);

  const prompt = reel.prompt ?? "$";

  const renderLine = (line: ReelLine, i: number, partial: boolean) => {
    if (line.kind === "gap") return <div key={i} className="h-[1.45em]" />;
    if (line.kind === "cmd") {
      const text = partial ? line.text.slice(0, chars) : line.text;
      return (
        <div key={i} className="text-zinc-100">
          <span style={{ color: ACCENT }}>{prompt}</span> {text}
          {partial && <Cursor />}
        </div>
      );
    }
    if (line.kind === "bar") {
      return (
        <div key={i} style={{ color: ACCENT }}>
          {barText(partial ? barPct : 100, line.total, line.label)}
        </div>
      );
    }
    return (
      <div
        key={i}
        className={line.tone ? TONE_CLASS[line.tone] : "text-zinc-300"}
        style={line.tone === "accent" ? { color: ACCENT } : undefined}
      >
        {line.text}
      </div>
    );
  };

  const visible = reduce ? lines.length : step;
  const current = !reduce && !done ? lines[step] : null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-black/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5">
        <span className="flex gap-1">
          <span className="h-[7px] w-[7px] rounded-full bg-[#ff5f57]/80" />
          <span className="h-[7px] w-[7px] rounded-full bg-[#febc2e]/80" />
          <span className="h-[7px] w-[7px] rounded-full bg-[#28c840]/80" />
        </span>
        {/* min-w-0: without it this flex item's minimum width is the full,
            untruncated path, which widened the whole card and pushed DisMan
            onto a row of its own */}
        <span className="min-w-0 flex-1 truncate text-center font-mono text-[9px] text-zinc-500">{reel.title}</span>
        {reel.note ? (
          <span
            className="rounded border px-1 font-mono text-[8px] uppercase tracking-wider"
            style={{ color: ACCENT, borderColor: "rgba(var(--accent-rgb, 45, 212, 191), 0.3)" }}
          >
            {reel.note}
          </span>
        ) : (
          // Keeps the title optically centred against the dots
          <span className="w-[27px]" />
        )}
      </div>

      {/* Body: newest line pinned to the bottom, older lines scroll off the top */}
      <div
        className="flex h-[152px] flex-col justify-end overflow-hidden px-2.5 py-2 font-mono text-[10px] leading-[1.45] [overflow-wrap:anywhere]"
        style={{
          // Lines scrolling off the top fade out instead of being sliced in half
          maskImage: "linear-gradient(to bottom, transparent 0, #000 22px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 22px)",
        }}
      >
        {lines.slice(0, visible).map((l, i) => renderLine(l, i, false))}
        {current && (current.kind === "cmd" || current.kind === "bar") && renderLine(current, step, true)}
        {/* Idle prompt while holding before the loop */}
        {(done || reduce) && (
          <div className="text-zinc-100">
            <span style={{ color: ACCENT }}>{prompt}</span> {!reduce && <Cursor />}
          </div>
        )}
      </div>
    </div>
  );
};

const Cursor = () => (
  <span
    className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-pulse motion-reduce:animate-none"
    style={{ background: ACCENT }}
  />
);
