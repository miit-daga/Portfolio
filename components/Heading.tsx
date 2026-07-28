import React from 'react';
import { CipherText } from './ui/cipher-text';
import { getSection, type SectionId, type SectionMeta } from '@/constants/sections';

// Teal fallback for any heading rendered outside a known section.
const DEFAULT_ACCENT = { hex: '#2dd4bf', light: '#5eead4' };

const Heading = ({
  section,
  text,
}: {
  /** Pulls the label, eyebrow, index and accent from constants/sections.ts. */
  section?: SectionId;
  /** Overrides the section's label. Required when no section is given. */
  text?: string;
}) => {
  const meta: SectionMeta | null = section ? getSection(section) : null;
  const title = text ?? meta?.label ?? 'Projects';
  const accent = meta ?? DEFAULT_ACCENT;

  // For "X & Y" titles, keep "X &" and "Y" on separate lines below lg so the
  // cipher animation doesn't wrap at a shifting point on smaller screens.
  const ampIndex = title.indexOf(" & ");
  const first = ampIndex !== -1 ? title.slice(0, ampIndex + 2) : title; // e.g. "Skills &"
  const second = ampIndex !== -1 ? title.slice(ampIndex + 3) : null; // e.g. "Achievements"

  return (
    <div className='py-10 text-center overflow-x-clip'>
      {/* Mission-log eyebrow: gives the page a spine and lets each section
          announce its own colour before the title arrives. */}
      {meta?.eyebrow && meta.index !== null && (
        <div className="mb-3 flex items-center justify-center gap-3">
          <span
            aria-hidden
            className="h-px w-8 md:w-14"
            style={{ background: `linear-gradient(90deg, transparent, ${meta.hex})` }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-[0.35em] md:text-[11px]"
            style={{ color: meta.light }}
          >
            {String(meta.index).padStart(2, '0')} &middot; {meta.eyebrow}
          </span>
          <span
            aria-hidden
            className="h-px w-8 md:w-14"
            style={{ background: `linear-gradient(90deg, ${meta.hex}, transparent)` }}
          />
        </div>
      )}

      {/* CipherText sizes each character slot to its final glyph, so the
          display face stays width-stable during the scramble.
          The title flows white -> section accent -> white (clipped to text).
          leading + padding keep descenders (j, g, p) from being clipped by bg-clip-text. */}
      <h2
        className='font-display font-bold text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.2] pb-1 bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none'
        style={{
          backgroundImage:
            `linear-gradient(90deg, #e2e8f0, ${accent.light}, ${accent.hex}, ${accent.light}, #e2e8f0)`,
        }}
      >
        {second ? (
          <>
            <CipherText text={first} />
            <span className="hidden lg:inline"> </span>
            <br className="lg:hidden" />
            <CipherText text={second} />
          </>
        ) : (
          <CipherText text={title} />
        )}
      </h2>
      {/* Flowing gradient underline, same accent */}
      <div className="relative mx-auto mt-4 h-1 w-24 overflow-hidden rounded-full opacity-90">
        <div
          className="h-full w-full animate-shimmer rounded-full bg-[length:200%_100%] motion-reduce:animate-none"
          style={{
            backgroundImage:
              `linear-gradient(90deg, ${accent.hex}, ${accent.light}, #e2e8f0, ${accent.light}, ${accent.hex})`,
          }}
        />
      </div>
    </div>
  );
};

export default Heading;
