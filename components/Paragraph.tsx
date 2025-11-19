import React from 'react';
import { cn } from "@/lib/utils";

interface ParagraphProps {
  para: string;
  className?: string;
}

const Paragraph: React.FC<ParagraphProps> = ({ para, className }) => {
  // Function to highlight specific keywords
  const highlightKeywords = (text: string) => {
    // Add keywords you want to highlight here
    const keywords = [
      "Information Technology",
      "backend development",
      "AI",
      "ML",
      "Deep Learning",
    ];

    let highlightedText = text;

    keywords.forEach((keyword) => {
      // Create a regex for case-insensitive replacement globally
      // We use capture groups ($1) to preserve the original casing of the match
      const regex = new RegExp(`(${keyword})`, "gi");
      highlightedText = highlightedText.replace(regex, '<span class="text-teal-400 font-bold drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">$1</span>');
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <p className={cn('text-neutral-300 font-medium text-center text-lg lg:text-2xl px-4 lg:px-20 py-20 md:py-32 max-w-4xl mx-auto leading-relaxed', className)}>
      {highlightKeywords(para)}
    </p>
  );
};

export default Paragraph;