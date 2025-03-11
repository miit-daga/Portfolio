import React from 'react';
import { TypewriterEffect } from './ui/typewriter-effect';

const Heading = ({ text = " Projects" }) => {
  // Convert text to array of word objects for TypewriterEffect
  const words = text.split(" ").map(word => ({
    text: word,
    className: "text-white" // Always white text
  }));

  return (
    <div className='py-10 text-center'>
      <TypewriterEffect
        words={words}
        className='font-extrabold text-4xl md:text-6xl lg:text-8xl'
        cursorClassName='bg-white h-8 md:h-12 lg:h-16 w-[6px] md:w-[8px] lg:w-[10px]' // Always white cursor
        repeat={false}
      />
    </div>
  );
};

export default Heading;