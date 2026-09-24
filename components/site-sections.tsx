"use client";
// Everything on the page behind the entry screen, gathered into one chunk that
// app/page.tsx loads on its own: the first screen is only the entry screen, so
// its JavaScript is all a first visit waits for. The chunk is fetched while the
// entry screen is up (and at once for anyone who has entered already).
export { default as Hero } from "@/components/Hero";
export { default as Paragraph } from "@/components/Paragraph";
export { WorkExp } from "@/components/WorkExp";
export { default as Projects } from "@/components/Projects";
export { default as Publications } from "@/components/Publications";
export { Contact } from "@/components/Contact";
export { Education } from "@/components/Education";
export { SkillsAndAchievements } from "@/components/SkillsAndAchievements";
export { Stats } from "@/components/Stats";
export { FloatingNav } from "@/components/ui/floating-navbar";
export { AnimatedBackground } from "@/components/ui/animated-background";
export { ScrollProgress } from "@/components/ScrollProgress";
export { BackToTop } from "@/components/BackToTop";
export { SectionDivider } from "@/components/ui/section-divider";
export { Reveal } from "@/components/ui/reveal";
export { MobileNotice } from "@/components/ui/mobile-notice";
export { FlightPath } from "@/components/ui/flight-path";
export { AmbientGlow } from "@/components/ui/ambient-glow";
