import React from 'react';
import { CipherText } from './ui/cipher-text';

const Heading = ({ text = "Projects" }) => {
  // For "X & Y" titles, keep "X &" and "Y" on separate lines below lg so the
  // cipher animation doesn't wrap at a shifting point on smaller screens.
  const ampIndex = text.indexOf(" & ");
  const first = ampIndex !== -1 ? text.slice(0, ampIndex + 2) : text; // e.g. "Skills &"
  const second = ampIndex !== -1 ? text.slice(ampIndex + 3) : null; // e.g. "Achievements"

  return (
    <div className='py-10 text-center overflow-x-clip'>
      {/* CipherText sizes each character slot to its final glyph, so the
          display face stays width-stable during the scramble.
          The title is a flowing white -> teal -> indigo gradient (clipped to text).
          leading + padding keep descenders (j, g, p) from being clipped by bg-clip-text. */}
      <h2
        className='font-display font-bold text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.2] pb-1 bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none'
        style={{
          backgroundImage:
            "linear-gradient(90deg, #e2e8f0, #5eead4, #818cf8, #5eead4, #e2e8f0)",
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
          <CipherText text={text} />
        )}
      </h2>
      {/* Flowing gradient underline */}
      <div className="relative mx-auto mt-4 h-1 w-24 overflow-hidden rounded-full opacity-90">
        <div
          className="h-full w-full animate-shimmer rounded-full bg-[length:200%_100%] motion-reduce:animate-none"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #3b82f6, #2dd4bf, #a855f7, #2dd4bf, #3b82f6)",
          }}
        />
      </div>
    </div>
  );
};

export default Heading;