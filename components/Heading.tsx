import React from 'react';
import { TypewriterEffect } from './ui/typewriter-effect';

const Heading = ({ text = "  Projects" }) => {
  // Convert text to array of word objects for TypewriterEffect
  const words = text.split(" ").map(word => ({
    text: word,
    className: "text-black dark:text-white"
  }));

  return (
    <div className='py-10 text-center'>
      <TypewriterEffect
        words={words}
        className='font-extrabold text-4xl md:text-6xl lg:text-8xl'
        cursorClassName='bg-black dark:bg-white h-8 md:h-12 lg:h-16 w-[6px] md:w-[8px] lg:w-[10px]'
        repeat={false}
      />
    </div>
  );
};

export default Heading;