import React from 'react';

interface ParagraphProps {
  para: string; 
}

const Paragraph: React.FC<ParagraphProps> = ({ para }) => {
  return <p className='text-white font-medium text-center text-lg lg:text-2xl px-2 lg:px-10 py-64'>{para}</p>;
};

export default Paragraph;
