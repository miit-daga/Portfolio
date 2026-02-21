"use client";

import { cn } from "@/utils/cn";
import { motion, stagger, useAnimate, useInView } from "framer-motion";
import { useEffect, useState, useRef } from "react";

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
  repeat = true,
  repeatDelay = 5000,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
  repeat?: boolean;
  repeatDelay?: number;
}) => {
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(""),
    };
  });

  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once: false });
  const [isComplete, setIsComplete] = useState(false);
  const [key, setKey] = useState(0);
  const animationRef = useRef<any>(null);
  const initialized = useRef(false);
  const cursorRef = useRef<HTMLSpanElement>(null);

  const startAnimation = async () => {
    setIsComplete(false);

    await animate(
      "span",
      {
        display: "inline-block",
        opacity: 1,
        width: "fit-content",
      },
      {
        duration: 0.3,
        delay: stagger(0.1),
        ease: "easeInOut",
      }
    );

    setIsComplete(true);

    if (repeat) {
      animationRef.current = setTimeout(async () => {
        await animate(
          "span",
          {
            display: "none",
            opacity: 0,
          },
          {
            duration: 0.1,
            delay: stagger(0.01),
            ease: "easeInOut",
          }
        );

        setKey((prevKey) => prevKey + 1);
      }, repeatDelay);
    }
  };

  useEffect(() => {
    if (isInView && !initialized.current) {
      initialized.current = true;
      startAnimation();
    }

    if (key > 0 && initialized.current) {
      startAnimation();
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isInView, key]);

  return (
    <div
      className={cn(
        "text-base sm:text-xl md:text-3xl lg:text-5xl font-bold text-center relative",
        className
      )}
    >
      <div className="inline-flex items-center justify-center">
        <motion.div ref={scope} className="inline" key={key}>
          {wordsArray.map((word, idx) => (
            <div key={`word-${idx}`} className="inline-block">
              {word.text.map((char, index) => (
                <motion.span
                  initial={{}}
                  key={`char-${index}`}
                  className={cn(
                    `dark:text-white text-black opacity-0 hidden`,
                    word.className
                  )}
                >
                  {char}
                </motion.span>
              ))}
              &nbsp;
            </div>
          ))}
        </motion.div>
        <motion.span
          ref={cursorRef}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            backgroundColor: "white"
          }}
          transition={{
            duration: 0.8,
            repeat: isComplete ? 0 : Infinity,
            repeatType: "reverse"
          }}
          className={cn(
            "inline-block rounded-sm w-[4px]",
            cursorClassName
          )}
          style={{
            height: "1em",
            position: "relative",
            display: isComplete ? "none" : "inline-block"
          }}
        ></motion.span>

      </div>
    </div>
  );
};
