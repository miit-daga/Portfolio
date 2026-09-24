"use client";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion, useMotionValue, useMotionTemplate, useSpring, useTransform } from "framer-motion";
import { IconArrowUpRight } from "@tabler/icons-react";
import Link from "next/link";
import { useState, useRef, useId } from "react";
import { VisualAbstract, type VisualAbstractKind } from "./visual-abstract";

type PublicationItem = {
  title: string;
  description: string;
  link: string;
  type?: "journal" | "patent";
  venue?: string;
  status?: string;
  /** Animated diagram of the paper's idea, shown above the abstract. */
  visual?: VisualAbstractKind;
  /** A 20-second plain-English version, shown first. */
  tldr?: string;
  /** Ready-to-paste references, from the DOI's own metadata. */
  cite?: { bibtex: string; apa: string };
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or clipboard permission refused
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

// "Cite": BibTeX and APA, each copied with one tap. Clickable on top of the
// card's DOI overlay, like the abstract toggle
const CiteRow = ({ cite }: { cite: { bibtex: string; apa: string } }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"bibtex" | "apa" | null>(null);
  const copy = async (e: React.MouseEvent, kind: "bibtex" | "apa") => {
    e.stopPropagation();
    e.preventDefault();
    if (await copyText(cite[kind])) {
      setCopied(kind);
      window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
    }
  };
  const chip =
    "pointer-events-auto inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className={cn(chip, open ? "border-violet-300/60 bg-violet-500/20 text-white" : "border-white/15 bg-white/5 text-neutral-300 hover:border-violet-300/50 hover:text-white")}
      >
        Cite
      </button>
      <AnimatePresence>
        {open &&
          (["bibtex", "apa"] as const).map((k, i) => (
            <motion.button
              key={k}
              type="button"
              onClick={(e) => copy(e, k)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
              exit={{ opacity: 0, x: -6 }}
              title={`Copy the ${k === "bibtex" ? "BibTeX entry" : "APA reference"}`}
              className={cn(chip, copied === k ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : "border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20")}
            >
              {copied === k ? "copied ✓" : k === "bibtex" ? "BibTeX" : "APA"}
            </motion.button>
          ))}
      </AnimatePresence>
    </span>
  );
};

// The venue is the single strongest credibility signal on the card, and it used
// to render as 11px grey mono, the least important-looking text in the block.
// Each publisher now gets a proper badge in its own colour family.
//
// Text only, deliberately: publisher logos are trademarked and self-hosting
// them on a personal site is a licensing question worth avoiding.
type VenueStyle = { border: string; bg: string; text: string; dot: string };

const VENUE_STYLES: { match: RegExp; style: VenueStyle }[] = [
  {
    // Nature Portfolio's house colour is a deep green with warm sand type.
    match: /nature|scientific reports/i,
    style: {
      border: "rgba(52, 168, 121, 0.45)",
      bg: "rgba(52, 168, 121, 0.12)",
      text: "#6ee7b7",
      dot: "#34a879",
    },
  },
  {
    match: /elsevier|array/i,
    style: {
      border: "rgba(255, 111, 0, 0.45)",
      bg: "rgba(255, 111, 0, 0.12)",
      text: "#fdba74",
      dot: "#ff6f00",
    },
  },
  {
    match: /ieee/i,
    style: {
      border: "rgba(0, 98, 155, 0.55)",
      bg: "rgba(0, 98, 155, 0.18)",
      text: "#7dd3fc",
      dot: "#00629b",
    },
  },
  {
    match: /patent/i,
    style: {
      border: "rgba(245, 158, 11, 0.45)",
      bg: "rgba(245, 158, 11, 0.12)",
      text: "#fcd34d",
      dot: "#f59e0b",
    },
  },
];

const NEUTRAL_VENUE: VenueStyle = {
  border: "rgba(255,255,255,0.15)",
  bg: "rgba(255,255,255,0.05)",
  text: "#a3a3a3",
  dot: "#737373",
};

function venueStyle(venue: string): VenueStyle {
  return VENUE_STYLES.find((v) => v.match.test(venue))?.style ?? NEUTRAL_VENUE;
}

const VenueBadge = ({ venue }: { venue: string }) => {
  const s = venueStyle(venue);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{ borderColor: s.border, background: s.bg, color: s.text }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {venue}
    </span>
  );
};

export const HoverEffectPublications = ({
  items,
  className,
}: {
  items: PublicationItem[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 py-10", className)}>
      {items.map((item, idx) => {
        const isLastItem = idx === items.length - 1;
        const isLonelyItem = isLastItem && items.length % 2 === 1;

        return (
          <TiltCard
            key={idx}
            item={item}
            idx={idx}
            isLonelyItem={isLonelyItem}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
          />
        );
      })}
    </div>
  );
};

// Rubber-stamp style venue seal: double ring, circular caption, star core.
// Violet ink for journals, amber for patents; "inks in" on hover.
const VenueSeal = ({ isPatent, isHovered }: { isPatent: boolean; isHovered: boolean }) => {
  const arcId = `seal-arc-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-5 top-5 z-30 h-16 w-16 -rotate-12 transition-opacity duration-300"
      style={{ opacity: isHovered ? 0.9 : 0.45, color: isPatent ? "#fcd34d" : "#a78bfa" }}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <defs>
          <path id={arcId} d="M 32 32 m -21 0 a 21 21 0 1 1 42 0 a 21 21 0 1 1 -42 0" />
        </defs>
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
        <circle cx="32" cy="32" r="27.5" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.55" />
        <circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.55" />
        <text fill="currentColor" fontSize="5" letterSpacing="0.9" fontFamily="ui-monospace, SFMono-Regular, monospace">
          <textPath href={`#${arcId}`}>
            {isPatent ? "PATENT PUBLISHED · INDIAN IP OFFICE · " : "PEER REVIEWED · SCOPUS INDEXED · "}
          </textPath>
        </text>
        <path d="M32 25 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2 Z" fill="currentColor" opacity="0.8" />
      </svg>
    </div>
  );
};

const TiltCard = ({
  item,
  idx,
  isLonelyItem,
  hoveredIndex,
  setHoveredIndex,
}: {
  item: PublicationItem;
  idx: number;
  isLonelyItem: boolean;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const hasValidLink = item?.link && item.link.trim() !== "";
  const isPatent = item.type === "patent";
  // With a visual abstract the prose collapses to a teaser behind a toggle
  const [expanded, setExpanded] = useState(false);
  const collapsible = !!item.visual;
  // The plain-English version first; the abstract a tap away
  const [plain, setPlain] = useState(!!item.tldr);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  // Specular glare that follows the cursor across the glass
  const sheenX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const sheenY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  const sheen = useMotionTemplate`radial-gradient(260px circle at ${sheenX} ${sheenY}, rgba(255, 255, 255, 0.10), rgba(167, 139, 250, 0.05) 45%, transparent 70%)`;

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
    setHoveredIndex(null);
    x.set(0);
    y.set(0);
  };

  const Content = (
    <>
      <AnimatePresence>
        {hoveredIndex === idx && (
          <motion.span
            // Decorative only. It is a sibling of the DOI overlay rather than
            // inside it, so it must not take the click
            className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-fuchsia-500/10 block rounded-3xl"
            layoutId="hoverBackgroundPublications"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ transform: "translateZ(-10px)" }}
          />
        )}
      </AnimatePresence>

      {/* Lifted 20px in 3D, which puts it in front of the DOI overlay no matter
          the z-index, so it must pass clicks through as well */}
      <div style={{ transform: "translateZ(20px)" }} className={cn("h-full", hasValidLink && "pointer-events-none")}>
        {/* With a DOI the whole card is covered by a link (rendered below), so
            the card itself lets clicks fall through to it; only the abstract
            toggle opts back in. */}
        <Card className={cn("w-full h-full", hasValidLink && "pointer-events-none")} isHovered={hoveredIndex === idx} variant="log">
          {/* For the command palette's search (command-menu.tsx): the full
              abstract and summary, whichever is on screen */}
          <span hidden data-search={`${item.venue ?? ""} ${item.description} ${item.tldr ?? ""} ${isPatent ? "patent published filed" : "peer reviewed scopus indexed journal paper research"}`} />
          {/* Log index + type badge + venue */}
          <div className="flex flex-wrap items-center gap-2 pr-14">
            <span className="font-mono text-[11px] sm:text-[10px] tracking-[0.25em] text-violet-300/60">
              LOG·0{idx + 1}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider",
                isPatent
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-violet-500/30 bg-violet-500/10 text-violet-300"
              )}
            >
              {isPatent ? "Patent" : "Journal"}
            </span>
            {item.venue && <VenueBadge venue={item.venue} />}
          </div>

          <CardTitle className="pr-12">{item.title}</CardTitle>
          {item.visual && <VisualAbstract kind={item.visual} />}
          {item.tldr && (
            <div className="pointer-events-auto mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[11px] sm:text-[10.5px] tracking-wide">
              {([["plain", "in 20 seconds"], ["abstract", "abstract"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={(k === "plain") === plain}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPlain(k === "plain");
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                    (k === "plain") === plain ? "bg-violet-500/20 text-violet-100" : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {item.tldr && plain ? (
            <CardDescription className="mt-3 text-zinc-300">{item.tldr}</CardDescription>
          ) : collapsible ? (
            // The collapsed teaser is itself a target: clicking it opens the
            // abstract instead of falling through to the DOI overlay, which is
            // what a click just missing the toggle used to do
            <div
              onClick={() => !expanded && setExpanded(true)}
              className={cn("pointer-events-auto relative", !expanded && "cursor-pointer")}
            >
              <CardDescription className={cn("mt-4", !expanded && "line-clamp-3")}>
                {item.description}
              </CardDescription>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                aria-expanded={expanded}
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-500/10 px-3.5 py-1.5 font-mono text-xs tracking-wide text-violet-200 transition-colors hover:border-violet-300/60 hover:bg-violet-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 md:min-h-8"
              >
                {expanded ? "Show less" : "Read abstract"}
                <span aria-hidden className={cn("transition-transform duration-300", expanded && "rotate-180")}>↓</span>
              </button>
            </div>
          ) : (
            <CardDescription>{item.description}</CardDescription>
          )}

          {/* Footer: DOI link affordance or filed-status chip */}
          <div className="mt-6">
            {hasValidLink ? (
              <span className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition-colors group-hover:text-violet-200">
                  View DOI <IconArrowUpRight className="h-3.5 w-3.5" />
                </span>
                {item.cite && <CiteRow cite={item.cite} />}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                {item.status ?? "Published"}
              </span>
            )}
          </div>
        </Card>
        {/* Venue seal stamped over the card's top-right corner */}
        <VenueSeal isPatent={isPatent} isHovered={hoveredIndex === idx} />
        {/* Cursor-tracked specular sheen */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-30 rounded-2xl"
          style={{ background: sheen }}
          animate={{ opacity: hoveredIndex === idx ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </>
  );

  const wrapperClass = cn(
    "relative group block p-2 h-full perspective-1000",
    isLonelyItem ? "md:w-1/2 lg:w-1/2" : "w-full",
    isLonelyItem && "md:col-span-2 md:justify-self-center lg:col-span-2 lg:justify-self-center"
  );

  return (
    <motion.div
      className={wrapperClass}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setHoveredIndex(idx)}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="h-full w-full"
      >
        {hasValidLink ? (
          <div className="relative h-full w-full block">
            {Content}
            <Link
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.title} (opens the DOI)`}
              className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            />
          </div>
        ) : (
          <div className="h-full w-full block">
            {Content}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export const Card = ({
  className,
  children,
  isHovered = false,
  variant = "default",
}: {
  className?: string;
  children: React.ReactNode;
  isHovered?: boolean;
  // "default": teal meteor-border (Achievements). "log": the Publications
  // identity - quiet border + violet accent rail, no spinning conic.
  variant?: "default" | "log";
}) => {
  return (
    <motion.div
      className={cn(
        "rounded-2xl h-full p-4 overflow-hidden relative z-20",
        variant === "default" && "meteor-border",
        variant === "default" && isHovered && "meteor-active",
        variant === "log" && "border transition-colors duration-300",
        variant === "log" && (isHovered ? "border-violet-400/40" : "border-white/10"),
        className
      )}
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        background: "rgba(0, 0, 0, 0.6)",
      }}
      animate={{
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {variant === "log" && (
        <span
          aria-hidden
          className="absolute bottom-5 left-0 top-5 w-[2px] rounded-full bg-gradient-to-b from-violet-400/80 via-indigo-400/40 to-transparent transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0.55,
            boxShadow: isHovered ? "0 0 8px rgba(167,139,250,0.45)" : "none",
          }}
        />
      )}
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </motion.div>
  );
};
export const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return (
    <h4
      className={cn(
        "font-display text-zinc-100 font-bold tracking-wide mt-4 group-hover:text-white transition-colors duration-300",
        className
      )}
    >
      {children}
    </h4>
  );
};

export const CardDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return (
    <p
      className={cn(
        "mt-8 text-zinc-400 tracking-wide leading-relaxed text-sm group-hover:text-zinc-300 transition-colors duration-300",
        className
      )}
    >
      {children}
    </p>
  );
};