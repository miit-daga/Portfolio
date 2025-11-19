import React from 'react';
import { CipherText } from './ui/cipher-text';

const Heading = ({ text = "Projects" }) => {
  return (
    <div className='py-10 text-center overflow-hidden'>
      {/* Added font-mono to the container to prevent width-jitter during animation */}
      <h2 className='font-mono font-extrabold text-4xl md:text-6xl lg:text-7xl text-white tracking-tight'>
        <CipherText text={text} />
      </h2>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-teal-500 mx-auto mt-4 rounded-full opacity-80" />
    </div>
  );
};

export default Heading;