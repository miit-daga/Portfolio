"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
} from "framer-motion";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { RESUME_PAGE } from "@/lib/resume";
import { IconMenu2, IconX, IconBrandGithub, IconBrandLinkedin, IconMail } from "@tabler/icons-react";
import { IconFileText } from "@tabler/icons-react";
import { kolkataNow } from "@/lib/kolkata";
import { scrollToSection } from "@/lib/scroll-to-section";
import { MagneticWrapper } from "./magnetic-wrapper";
import { getSection, type SectionId } from "@/constants/sections";

// Desktop: the full bar at the top of the page and whenever you scroll up;
// otherwise it shrinks to a small pill showing where you are, which opens
// back into the bar on hover. Each section wears its own colour, the active
// pill fills as you read through that section, hovering an item previews
// what is in it, and a long jump leaves a comet trail.

// One line on what each part of the page holds, for the hover previews
const TEASERS: Record<string, string> = {
  "#about-me": "the short version, and a hidden constellation",
  "#workex": "5 missions · full-time since June 2026",
  "#education": "B.Tech IT at VIT · CGPA 9.22",
  "#skills-achievements": "9 languages · 2 hackathon wins",
  "#projects": "featured repos, live from GitHub",
  "#publications": "10 Scopus-indexed papers · 1 patent",
  "#contact": "email, crew card, and a guestbook on the radar",
};

// Shorter names for the long ones, below 1400px wide, where the full bar
// would run off the screen
const SHORT: Record<string, string> = {
  "#workex": "Experience",
  "#skills-achievements": "Skills",
  "#publications": "Publications",
};

const TEAL = { rgb: [45, 212, 191] as [number, number, number], light: "#5eead4" };

// A section's colours from its "#id" link; teal for anything else
const accentOf = (link: string) => {
  if (!link.startsWith("#")) return TEAL;
  try {
    const s = getSection(link.slice(1) as SectionId);
    return { rgb: s.rgb, light: s.light, eyebrow: s.eyebrow, index: s.index };
  } catch {
    return TEAL;
  }
};
const rgba = (rgb: [number, number, number], a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;


export const FloatingNav = ({
  navItems,
  className,
  isImploding = false, // Added Prop
}: {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactElement;
  }[];
  className?: string;
  isImploding?: boolean; // Added Type
}) => {
  const { scrollY } = useScroll();

  const [visible, setVisible] = useState(true);
  const [isAtVeryTop, setIsAtVeryTop] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Auto-hide on scroll is a laptop-only behaviour; on phones the nav/menu stay put.
  const [isDesktop, setIsDesktop] = useState(false);

  // Refs for logic
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // How far through the active section the reader is, 0 to 1
  const sectionProgress = useMotionValue(0);
  // Hovering the collapsed pill opens the full bar
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // The bar and the collapsed pill are one shape: its edges spring between
  // the two sizes, clipping the bar's contents as they close in
  const compactRef = useRef<HTMLButtonElement>(null);
  const [sizes, setSizes] = useState({ fullW: 0, fullH: 0, compactW: 0, compactH: 0 });
  const insetX = useSpring(0, { stiffness: 260, damping: 32 });
  const insetY = useSpring(0, { stiffness: 260, damping: 32 });
  // Clipped only while it closes in or opens out; fully open it clips nothing,
  // so hover cards reaching past the bar's ends are not sliced off
  const contentClip = useTransform([insetX, insetY], ([x, y]: number[]) =>
    x < 0.5 && y < 0.5 ? "none" : `inset(${y}px ${x}px -400px ${x}px)`
  );
  // Comet trail left by a long jump of the active pill
  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const prevActive = useRef("");
  const [trail, setTrail] = useState<{ left: number; width: number; toRight: boolean; rgb: [number, number, number]; key: number } | null>(null);


  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => {
      // Cleanup timer on unmount
      if (timerRef.current) clearTimeout(timerRef.current);
      mq.removeEventListener("change", update);
    };
  }, []);

  // Tell the scroll-progress bar to hide while the mobile menu is open
  // (otherwise the rocket overlaps the menu's close button).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("nav-menu-toggle", { detail: isMenuOpen }));
  }, [isMenuOpen]);

  // --- SCROLL LOGIC (Pixels + Auto-Hide Timer) ---
  useMotionValueEvent(scrollY, "change", (current) => {
    if (typeof current === "number") {
      // Auto-hide is laptop-only. On phones, the address-bar show/hide fires
      // scroll events that would randomly hide the nav and close the menu.
      if (!isDesktop) return;

      const previous = scrollY.getPrevious() ?? 0;
      const direction = current - previous;

      // 50px threshold for "Very Top"
      const isTop = current < 50;

      // Always clear existing timer on any scroll event
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (isTop) {
        setIsAtVeryTop(true);
        setVisible(true);
        setActiveSection("");
      } else {
        setIsAtVeryTop(false);

        if (direction < 0) {
          // Scrolling UP -> Show Immediately
          setVisible(true);

          // Start Auto-Hide Timer (5s)
          timerRef.current = setTimeout(() => {
            setVisible(false);
            setIsMenuOpen(false);
          }, 5000);

        } else if (direction > 0) {
          // Scrolling DOWN -> Hide Immediately
          setVisible(false);
          setIsMenuOpen(false);
        }
      }
    }
  });

  // --- Active section from scroll position ---
  // Mirrors ScrollProgress, which measures offsetTop against the viewport
  // centre and is reliable. This previously used an IntersectionObserver that
  // picked by intersectionRatio, a fraction *of the section*, so it compared
  // short sections against tall ones; once the sections were rebuilt at
  // different heights it stopped resolving and the hash froze.
  useEffect(() => {
    const sectionLinks = navItems.filter((item) => item.link.startsWith("#"));

    // Position up the offset chain, immune to the reveal animations' translateY
    // that getBoundingClientRect would otherwise include.
    const offsetTopOf = (el: HTMLElement) => {
      let y = 0;
      let node: HTMLElement | null = el;
      while (node) {
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return y;
    };

    let tops: { link: string; top: number }[] = [];

    const measure = () => {
      tops = sectionLinks.flatMap((item) => {
        const el = document.getElementById(item.link.substring(1));
        return el ? [{ link: item.link, top: offsetTopOf(el) }] : [];
      });
    };

    const update = () => {
      if (window.scrollY < 100) {
        setActiveSection((prev) => (prev === "" ? prev : ""));
        sectionProgress.set(0);
        return;
      }
      if (!tops.length) return;
      const center = window.scrollY + window.innerHeight / 2;
      let current = tops[0].link;
      for (const t of tops) if (center >= t.top) current = t.link;
      // Short final sections never reach the centre line, so pin the last one
      // once we are against the bottom of the document.
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (nearBottom) current = tops[tops.length - 1].link;
      setActiveSection((prev) => (prev === current ? prev : current));

      // Progress through it: from its top crossing the centre line to the next one's
      const k = tops.findIndex((t) => t.link === current);
      const start = tops[k].top - window.innerHeight / 2;
      const end =
        k + 1 < tops.length
          ? tops[k + 1].top - window.innerHeight / 2
          : document.documentElement.scrollHeight - window.innerHeight;
      sectionProgress.set(nearBottom ? 1 : Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start))));
    };

    measure();
    update();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };

    // Projects loads asynchronously and the reveals settle late, both of which
    // move every section below them.
    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    const settle = setTimeout(() => {
      measure();
      update();
    }, 800);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      clearTimeout(settle);
    };
  }, [navItems, sectionProgress]);

  // Keep the URL hash in sync with the section in view. Debounced so the
  // history write happens only after scrolling settles - calling replaceState
  // mid-scroll interrupts momentum and makes scrolling feel jaggy/sticky.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = activeSection
      ? activeSection
      : window.location.pathname + window.location.search;
    const id = setTimeout(() => history.replaceState(null, "", url), 250);
    return () => clearTimeout(id);
  }, [activeSection]);

  // The on-site resume page (lib/resume.ts), not the raw Drive file
  const resumeLink = RESUME_PAGE;
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  // In-page links glide via the shared eased window scroll (lib/scroll-to-section)
  const handleNavClick = (e: React.MouseEvent, link: string) => {
    if (!link.startsWith("#")) return; // external / terminal - let it behave normally
    e.preventDefault();
    if (!document.getElementById(link.substring(1))) return;
    setIsMenuOpen(false);
    history.replaceState(null, "", link); // reflect the section in the URL
    scrollToSection(link);
  };

  // COMBINED LOGIC: Show if scrolled up AND not currently imploding
  const shouldShow = visible && !isImploding;
  // Desktop: the full bar, or the collapsed pill where it used to hide
  const expanded = (visible || hovered) && !isImploding;
  const showCompact = !expanded && !isImploding && !isAtVeryTop;

  const sectionItems = navItems.filter((i) => i.link.startsWith("#"));
  const toolItems = navItems.filter((i) => !i.link.startsWith("#"));
  const activeIdx = sectionItems.findIndex((i) => i.link === activeSection);
  const activeItem = activeIdx >= 0 ? sectionItems[activeIdx] : null;
  const activeAccent = accentOf(activeSection);

  // A jump of two or more sections streaks the pill across with a comet tail
  const fireTrail = (from: string, to: string) => {
    if (!from || !to) return;
    const order = sectionItems.map((i) => i.link);
    if (Math.abs(order.indexOf(to) - order.indexOf(from)) < 2) return;
    const bar = barRef.current?.getBoundingClientRect();
    const a = itemRefs.current[from]?.getBoundingClientRect();
    const b = itemRefs.current[to]?.getBoundingClientRect();
    if (!bar || !a || !b) return;
    const toRight = b.left > a.left;
    const left = (toRight ? a.left + a.width / 2 : b.left + b.width / 2) - bar.left;
    const right = (toRight ? b.left + b.width / 2 : a.left + a.width / 2) - bar.left;
    setTrail({ left, width: right - left, toRight, rgb: accentOf(to).rgb, key: Date.now() });
  };
  // A click glides there through every section between, so the click fires
  // it; an instant jump (the palette, a hash link) changes it in one step
  useEffect(() => {
    const from = prevActive.current;
    prevActive.current = activeSection;
    if (expanded) fireTrail(from, activeSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Both sizes, kept current as labels and the active section change
  useEffect(() => {
    const measure = () => {
      const full = barRef.current;
      const compact = compactRef.current;
      if (!full || !compact) return;
      setSizes((s) => {
        const next = { fullW: full.offsetWidth, fullH: full.offsetHeight, compactW: compact.offsetWidth, compactH: compact.offsetHeight };
        return next.fullW === s.fullW && next.fullH === s.fullH && next.compactW === s.compactW && next.compactH === s.compactH ? s : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (barRef.current) ro.observe(barRef.current);
    if (compactRef.current) ro.observe(compactRef.current);
    return () => ro.disconnect();
  }, [mounted]);

  useEffect(() => {
    const collapsed = !expanded && showCompact;
    insetX.set(collapsed ? Math.max(0, (sizes.fullW - sizes.compactW) / 2) : 0);
    insetY.set(collapsed ? Math.max(0, (sizes.fullH - sizes.compactH) / 2) : 0);
  }, [expanded, showCompact, sizes, insetX, insetY]);

  const openBar = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  };
  const closeBarSoon = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(false), 250);
  };

  // One entry in the bar, with its hover preview
  const renderItem = (navItem: { name: string; link: string }, tool = false) => {
    const isActive = activeSection === navItem.link;
    const acc = accentOf(navItem.link);
    const meta = "eyebrow" in acc ? acc : null;
    const isTerminal = navItem.name === "Terminal";
    const isArcade = navItem.name === "Arcade";
    const newTab = isTerminal || isArcade;
    return (
      <MagneticWrapper key={navItem.link} strength={0.2}>
        <Link
          ref={(el) => {
            itemRefs.current[navItem.link] = el;
          }}
          href={navItem.link}
          // terminal.html is a static file, not a route: prefetching it
          // as one wasted a request and logged a 404 on every page load
          prefetch={false}
          onClick={(e) => {
            fireTrail(activeSection, navItem.link);
            handleNavClick(e, navItem.link);
          }}
          onMouseEnter={() => setPreview(navItem.link)}
          onMouseLeave={() => setPreview((p) => (p === navItem.link ? null : p))}
          onFocus={() => setPreview(navItem.link)}
          onBlur={() => setPreview((p) => (p === navItem.link ? null : p))}
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener noreferrer" : undefined}
          className={cn(
            "relative items-center flex hidden lg:flex px-2 py-1 transition-colors duration-300 min-[1400px]:px-3",
            isActive ? "" : "text-white hover:text-neutral-300"
          )}
          style={isActive ? { color: acc.light } : undefined}
        >
          {isActive && (
            <motion.span
              layoutId="nav-active-pill"
              className="absolute inset-0 z-0 overflow-hidden rounded-full"
              style={{ background: rgba(acc.rgb, 0.08), border: `1px solid ${rgba(acc.rgb, 0.4)}` }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {/* Fills as you read through the section */}
              <motion.span
                className="absolute inset-y-0 left-0 w-full origin-left"
                style={{ scaleX: sectionProgress, background: `linear-gradient(90deg, ${rgba(acc.rgb, 0.1)}, ${rgba(acc.rgb, 0.28)})` }}
              />
            </motion.span>
          )}
          {tool && isTerminal ? (
            <span className="relative z-10 font-mono text-xs font-semibold tracking-wide">
              <span className="text-teal-300/90">&gt;_</span> terminal <span className="text-neutral-500">↗</span>
            </span>
          ) : tool && isArcade ? (
            <span className="relative z-10 font-mono text-xs font-semibold tracking-wide">
              <span className="text-teal-300/90">▶</span> arcade <span className="text-neutral-500">↗</span>
            </span>
          ) : (
            <span className="relative z-10 flex items-center gap-1.5 text-sm font-bold">
              <span
                className="h-1.5 w-1.5 rounded-full transition-opacity"
                style={{ background: acc.light, boxShadow: `0 0 6px ${rgba(acc.rgb, 0.8)}`, opacity: isActive ? 1 : 0.55 }}
              />
              {SHORT[navItem.link] ? (
                <>
                  <span className="hidden min-[1400px]:inline">{navItem.name}</span>
                  <span className="min-[1400px]:hidden">{SHORT[navItem.link]}</span>
                </>
              ) : (
                navItem.name
              )}
            </span>
          )}

          {/* What is in there */}
          <AnimatePresence>
            {preview === navItem.link && (
              <motion.span
                className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 block w-max max-w-[260px] -translate-x-1/2"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                transition={{ duration: 0.16 }}
              >
                <span
                  className="block rounded-xl bg-slate-950/95 px-3 py-2 text-left shadow-lg backdrop-blur-md"
                  style={{ border: `1px solid ${rgba(acc.rgb, 0.35)}`, boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 18px ${rgba(acc.rgb, 0.15)}` }}
                >
                  <span className="block font-mono text-[11px] sm:text-[9px] uppercase tracking-[0.25em]" style={{ color: acc.light }}>
                    {meta?.index ? `${String(meta.index).padStart(2, "0")} · ` : ""}
                    {meta?.eyebrow ?? (newTab ? "new tab" : "about")}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium leading-snug text-neutral-200">
                    {isTerminal ? "a real shell, with an arcade" : isArcade ? "three 3D space games, made for this site" : TEASERS[navItem.link] ?? navItem.name}
                  </span>
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </MagneticWrapper>
    );
  };

  const navContent = (
    <>
      {/* The bar, desktop. One shape: expanded it holds every section; scrolled
          down it closes in to a small pill saying where you are, and opens
          back out on hover */}
      <motion.div
        key="desktop-nav"
        className="pointer-events-none fixed inset-x-0 top-10 z-[5000] mx-auto hidden w-max lg:block"
        initial={{ y: -100, opacity: 0 }}
        animate={expanded || showCompact ? { y: 0, opacity: 1 } : { y: -100, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* The shape itself: its edges spring between the two sizes */}
        <motion.div
          aria-hidden
          className={cn(
            "absolute rounded-full shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]",
            "transition-colors duration-300 ease-in-out",
            // At the top it is glass over the hero's nebula, dark enough that
            // the labels keep their contrast on its brightest parts
            isAtVeryTop && visible
              ? "bg-slate-950/55 backdrop-blur-xl backdrop-saturate-150 border border-white/20"
              : "bg-black/90 backdrop-blur-md border border-white/[0.25]"
          )}
          style={{ left: insetX, right: insetX, top: insetY, bottom: insetY }}
        />

        {/* Collapsed: where you are */}
        <motion.button
          ref={compactRef}
          type="button"
          aria-label={`Navigation: ${activeItem?.name ?? "top of the page"}. Open the menu`}
          className={cn(
            "absolute left-1/2 top-1/2 flex w-max -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-full py-2 pl-4 pr-3 text-sm font-bold text-white",
            showCompact && !expanded ? "pointer-events-auto" : "pointer-events-none"
          )}
          initial={false}
          animate={{ opacity: showCompact && !expanded ? 1 : 0 }}
          transition={showCompact && !expanded ? { duration: 0.2, delay: 0.18 } : { duration: 0.1 }}
          onMouseEnter={openBar}
          onMouseLeave={closeBarSoon}
          onFocus={openBar}
          onClick={openBar}
          tabIndex={showCompact && !expanded ? 0 : -1}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: activeAccent.light, boxShadow: `0 0 8px ${rgba(activeAccent.rgb, 0.9)}` }} />
          <span style={{ color: activeItem ? activeAccent.light : undefined }}>{activeItem?.name ?? "Launch pad"}</span>
          {activeIdx >= 0 && (
            <span className="font-mono text-[11px] sm:text-[10px] font-medium tracking-wider text-neutral-500">
              {activeIdx + 1}/{sectionItems.length}
            </span>
          )}
          {/* the same reading progress, as a thin line under it */}
          <span className="absolute inset-x-4 bottom-1 h-px overflow-hidden rounded-full bg-white/5">
            <motion.span className="block h-full w-full origin-left" style={{ scaleX: sectionProgress, background: activeAccent.light }} />
          </span>
        </motion.button>

      {/* Expanded: every section, clipped by the shape's edges as it closes */}
      <motion.div
        ref={barRef}
        initial={false}
        animate={{ opacity: expanded ? 1 : 0 }}
        transition={expanded ? { duration: 0.22, delay: 0.06 } : { duration: 0.18 }}
        style={{ clipPath: contentClip }}
        className={cn(
          "relative flex items-center justify-center space-x-1 rounded-full py-2 pl-4 pr-2 text-white min-[1400px]:space-x-2 min-[1400px]:pl-6",
          expanded ? "pointer-events-auto" : "pointer-events-none",
          className
        )}
        // Pause auto-hide on hover
        onMouseEnter={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          openBar();
        }}
        onMouseLeave={() => {
          setPreview(null);
          closeBarSoon();
          // Restart timer on leave if not at top
          if (!isAtVeryTop && visible) {
            timerRef.current = setTimeout(() => {
              setVisible(false);
              setIsMenuOpen(false);
            }, 2500);
          }
        }}
      >
        {/* A long jump's comet trail, under the labels */}
        <AnimatePresence>
          {trail && (
            <motion.span
              key={trail.key}
              aria-hidden
              className="pointer-events-none absolute top-1/2 z-0 h-7 -translate-y-1/2 rounded-full"
              style={{
                left: trail.left,
                width: trail.width,
                transformOrigin: trail.toRight ? "left center" : "right center",
                background: `linear-gradient(${trail.toRight ? "90deg" : "270deg"}, transparent, ${rgba(trail.rgb, 0.45)})`,
                filter: "blur(1px)",
              }}
              initial={{ opacity: 0, scaleX: 0.2 }}
              animate={{ opacity: [0, 1, 0], scaleX: [0.2, 1, 1] }}
              transition={{ duration: 0.75, times: [0, 0.35, 1], ease: "easeOut" }}
              onAnimationComplete={() => setTrail((t) => (t?.key === trail.key ? null : t))}
            />
          )}
        </AnimatePresence>

        {sectionItems.map((item) => renderItem(item))}

        {/* Tools, apart from the sections */}
        <span aria-hidden className="!mx-2 h-5 w-px bg-white/15" />
        {toolItems.map((item) => renderItem(item, true))}

        <MagneticWrapper strength={0.2}>
          <Link
            href={resumeLink!}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setPreview("resume")}
            onMouseLeave={() => setPreview((p) => (p === "resume" ? null : p))}
            className="relative block"
          >
            <button
              className={cn(
                "text-sm font-bold relative px-4 py-2 rounded-full",
                "transition-colors duration-300 ease-in-out",
                isAtVeryTop && visible
                  ? "border border-white/[0.3] hover:bg-white/[0.1]"
                  : "border border-white/[0.3] text-white hover:bg-white/10"
              )}
            >
              <span>Resume</span>
              <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px h-px" />
            </button>
            <AnimatePresence>
              {preview === "resume" && (
                <motion.span
                  // Right-aligned: Resume is the bar's last item, so a centred card would hang off its end
                  className="pointer-events-none absolute right-0 top-full z-20 mt-3 block w-max rounded-xl border border-teal-400/35 bg-slate-950/95 px-3 py-2 text-left backdrop-blur-md"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.16 }}
                >
                  <span className="block font-mono text-[11px] sm:text-[9px] uppercase tracking-[0.25em] text-teal-300">new tab</span>
                  <span className="mt-0.5 block text-xs font-medium text-neutral-200">opens on the site · PDF download</span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </MagneticWrapper>

      </motion.div>
      </motion.div>

      <div className="lg:hidden">
        <motion.button
          key="mobile-nav-trigger"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: shouldShow ? 0 : -100, opacity: shouldShow ? 1 : 0 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          onClick={toggleMenu}
          className={cn(
            "fixed top-4 left-4 z-[5001] flex items-center justify-center w-10 h-10 rounded-full",
            "transition-colors duration-300 ease-in-out",
            isAtVeryTop
              ? "bg-black/15 backdrop-blur-lg border border-white/[0.3]"
              : "bg-black border border-white/[0.3]"
          )}
          aria-label="Toggle navigation menu"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isMenuOpen ? "close" : "menu"}
              initial={{ opacity: 0, rotate: -30 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 30 }}
              transition={{ duration: 0.2 }}
            >
              {isMenuOpen ? (
                <IconX className="h-6 w-6 text-white" />
              ) : (
                <IconMenu2 className="h-6 w-6 text-white" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleMenu}
                className="fixed inset-0 bg-black/60 z-[4999]"
              />
              {/* The drawer: each section in its own colour, the one you are in
                  marked with how far through it you are. Swipe it left to close */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.5, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70 || info.velocity.x < -400) setIsMenuOpen(false);
                }}
                className="fixed bottom-0 left-0 top-0 z-[5000] flex w-[84%] max-w-[340px] flex-col overflow-y-auto overscroll-contain border-r border-white/10 bg-[#05070d]/95 backdrop-blur-xl"
                style={{
                  backgroundImage: `radial-gradient(120% 45% at 0% 0%, ${rgba(activeAccent.rgb, 0.16)}, transparent 70%), radial-gradient(90% 30% at 100% 100%, rgba(129,140,248,0.08), transparent 70%)`,
                }}
              >
                {/* Who, and the hour at home */}
                <div className="pl-[4.5rem] pr-5 pt-5">
                  <p className="font-display text-base font-bold text-white">Miit Daga</p>
                  <MenuClock />
                </div>

                <nav className="mt-6 flex flex-col gap-1.5 px-3">
                  {navItems.map((item, idx) => {
                    if ((item as any).isDesktopOnly) return null;
                    const isActive = activeSection === item.link;
                    const acc = accentOf(item.link);
                    const meta = "eyebrow" in acc ? acc : null;
                    return (
                      <motion.div
                        key={`link=${idx}`}
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 + idx * 0.04, type: "spring", stiffness: 380, damping: 30 }}
                      >
                        <Link
                          href={item.link}
                          target={item.name === "Terminal" || item.name === "Arcade" ? "_blank" : undefined}
                          rel={item.name === "Terminal" || item.name === "Arcade" ? "noopener noreferrer" : undefined}
                          onClick={(e) => { handleNavClick(e, item.link); toggleMenu(); }}
                          className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl border px-3.5 py-2.5 transition-colors active:bg-white/5"
                          style={{
                            borderColor: isActive ? rgba(acc.rgb, 0.4) : "transparent",
                            background: isActive ? rgba(acc.rgb, 0.1) : undefined,
                          }}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: rgba(acc.rgb, isActive ? 0.18 : 0.08), boxShadow: isActive ? `0 0 14px ${rgba(acc.rgb, 0.3)}` : undefined }}
                          >
                            {React.cloneElement(item.icon as any, { className: "h-[18px] w-[18px]", style: { color: acc.light } })}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[11px] sm:text-[9px] uppercase tracking-[0.22em]" style={{ color: rgba(acc.rgb, isActive ? 0.95 : 0.6) }}>
                              {meta?.index ? `${String(meta.index).padStart(2, "0")} · ` : ""}
                              {meta?.eyebrow ?? (item.name === "Arcade" ? "3 space games · new tab" : "about")}
                            </span>
                            <span className="block truncate text-[15px] font-semibold leading-snug" style={{ color: isActive ? acc.light : "#f5f5f5" }}>
                              {item.name}
                            </span>
                          </span>
                          {isActive && (
                            <span className="shrink-0 font-mono text-[11px] sm:text-[8.5px] uppercase tracking-[0.18em]" style={{ color: acc.light }}>
                              here
                            </span>
                          )}
                          {/* How far through this section you are */}
                          {isActive && (
                            <span className="absolute inset-x-3.5 bottom-1 h-[2px] overflow-hidden rounded-full bg-white/5">
                              <motion.span className="block h-full w-full origin-left" style={{ scaleX: sectionProgress, background: acc.light }} />
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* The resume, and the other ways to reach out */}
                <motion.div
                  className="mt-auto space-y-3 px-4 pb-6 pt-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <Link
                    href={resumeLink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={toggleMenu}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_24px_rgba(251,191,36,0.25)]"
                  >
                    <IconFileText className="h-4 w-4" />
                    Resume
                  </Link>
                  <div className="flex items-center justify-center gap-3">
                    {[
                      { href: "https://github.com/miit-daga", label: "GitHub", Icon: IconBrandGithub },
                      { href: "https://www.linkedin.com/in/miit-daga", label: "LinkedIn", Icon: IconBrandLinkedin },
                      { href: "mailto:miitcodes27@gmail.com", label: "Email", Icon: IconMail },
                    ].map(({ href, label, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-neutral-300 active:bg-white/10"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                  <p className="text-center font-mono text-[11px] sm:text-[9px] uppercase tracking-[0.2em] text-neutral-600">swipe left to close</p>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  // Only render via portal once mounted to avoid hydration mismatch
  if (!mounted) return null;

  return createPortal(navContent, document.body);
};

// Kolkata's hour, for the phone menu's header
function MenuClock() {
  const [now, setNow] = useState<ReturnType<typeof kolkataNow> | null>(null);
  useEffect(() => {
    const tick = () => setNow(kolkataNow());
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) return null;
  return (
    <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] sm:text-[10px] text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: now.mood.color, boxShadow: `0 0 6px ${now.mood.color}` }} />
      Kolkata {now.time} · {now.mood.label}
    </p>
  );
}
