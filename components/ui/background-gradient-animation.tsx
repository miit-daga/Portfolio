"use client";
import { cn } from "@/utils/cn";
import { useEffect, useRef, useState } from "react";
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handleResize = () => setIsMobile(mediaQuery.matches);
    handleResize();

    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, [breakpoint]);

  return isMobile;
};

export const BackgroundGradientAnimation = ({
  gradientBackgroundStart = "rgb(0, 0, 0)",
  gradientBackgroundEnd = "rgb(0, 0, 0)",
  firstColor = "180, 120, 255",
  secondColor = "120, 180, 255",
  thirdColor = "150, 220, 180",
  fourthColor = "220, 180, 150",
  fifthColor = "180, 220, 255",
  sixthColor = "255, 180, 220",
  seventhColor = "220, 150, 255",
  eighthColor = "255, 220, 180",
  ninthColor = "150, 255, 220",
  tenthColor = "255, 150, 180",
  pointerColor = "255, 190, 255",
  size = "80%",
  blendingValue = "hard-light",
  children,
  className,
  interactive = true,
  containerClassName,
  animationSpeed = 5,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  sixthColor?: string;
  seventhColor?: string;
  eighthColor?: string;
  ninthColor?: string;
  tenthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
  animationSpeed?: number;
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null);

  const [curX, setCurX] = useState(0);
  const [curY, setCurY] = useState(0);
  const [tgX, setTgX] = useState(0);
  const [tgY, setTgY] = useState(0);


  const isMobile = useIsMobile();
  const isInteractive = interactive && !isMobile;
  const baseSpeed = isMobile ? animationSpeed * 2 : animationSpeed;

  useEffect(() => {
    document.body.style.setProperty(
      "--gradient-background-start",
      gradientBackgroundStart
    );
    document.body.style.setProperty(
      "--gradient-background-end",
      gradientBackgroundEnd
    );
    document.body.style.setProperty("--first-color", firstColor);
    document.body.style.setProperty("--second-color", secondColor);
    document.body.style.setProperty("--third-color", thirdColor);
    document.body.style.setProperty("--fourth-color", fourthColor);
    document.body.style.setProperty("--fifth-color", fifthColor);
    document.body.style.setProperty("--sixth-color", sixthColor);
    document.body.style.setProperty("--seventh-color", seventhColor);
    document.body.style.setProperty("--eighth-color", eighthColor);
    document.body.style.setProperty("--ninth-color", ninthColor);
    document.body.style.setProperty("--tenth-color", tenthColor);
    document.body.style.setProperty("--pointer-color", pointerColor);
    document.body.style.setProperty("--size", size);
    document.body.style.setProperty("--blending-value", blendingValue);
  }, []);

  useEffect(() => {
    function move() {
      if (!isInteractive || !interactiveRef.current) {
        return;
      }
      setCurX(curX + (tgX - curX) / 20);
      setCurY(curY + (tgY - curY) / 20);
      interactiveRef.current.style.transform = `translate(${Math.round(
        curX
      )}px, ${Math.round(curY)}px)`;
    }

    move();
  }, [tgX, tgY, isInteractive]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractive && interactiveRef.current) {
      const rect = interactiveRef.current.getBoundingClientRect();
      setTgX(event.clientX - rect.left);
      setTgY(event.clientY - rect.top);
    }
  };

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  return (
    <div
      className={cn(
        "h-screen w-screen relative overflow-hidden top-0 left-0 bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName
      )}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn("", className)}>{children}</div>
      <div
        className={cn(
          "gradients-container h-full w-full blur-lg",
          isSafari || isMobile ? "blur-2xl" : "[filter:url(#blurMe)_blur(40px)]"
        )}
      >
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_var(--first-color)_0,_var(--first-color)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:center_center]`,
            `animate-first`,
            `opacity-100`
          )}
          style={{ animationDuration: `${baseSpeed * 4}s` }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),_0.8)_0,_rgba(var(--second-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-400px)]`,
            `animate-second`,
            `opacity-100`
          )}
          style={{ animationDuration: `${baseSpeed * 3}s` }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),_0.8)_0,_rgba(var(--third-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%+400px)]`,
            `animate-third`,
            `opacity-100`
          )}
          style={{ animationDuration: `${baseSpeed * 5}s` }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_0.8)_0,_rgba(var(--fourth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-200px)]`,
            `animate-fourth`,
            `opacity-70`
          )}
          style={{ animationDuration: `${baseSpeed * 3.5}s` }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_0.8)_0,_rgba(var(--fifth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-800px)_calc(50%+800px)]`,
            `animate-fifth`,
            `opacity-100`
          )}
          style={{ animationDuration: `${baseSpeed * 4.5}s` }}
        ></div>

        {!isMobile && (
          <>
            <div
              className={cn(
                `absolute [background:radial-gradient(circle_at_center,_rgba(var(--sixth-color),_0.7)_0,_rgba(var(--sixth-color),_0)_50%)_no-repeat]`,
                `[mix-blend-mode:var(--blending-value)] w-[calc(var(--size)*0.8)] h-[calc(var(--size)*0.8)] top-[calc(50%-var(--size)*0.4)] left-[calc(50%-var(--size)*0.4)]`,
                `[transform-origin:calc(50%+600px)_calc(50%-300px)]`,
                `animate-sixth`,
                `opacity-80`
              )}
              style={{ animationDuration: `${baseSpeed * 4}s` }}
            ></div>
            <div
              className={cn(
                `absolute [background:radial-gradient(circle_at_center,_rgba(var(--seventh-color),_0.6)_0,_rgba(var(--seventh-color),_0)_50%)_no-repeat]`,
                `[mix-blend-mode:var(--blending-value)] w-[calc(var(--size)*0.9)] h-[calc(var(--size)*0.9)] top-[calc(50%-var(--size)*0.45)] left-[calc(50%-var(--size)*0.45)]`,
                `[transform-origin:calc(50%-600px)_calc(50%-600px)]`,
                `animate-seventh`,
                `opacity-75`
              )}
              style={{ animationDuration: `${baseSpeed * 5}s` }}
            ></div>
            <div
              className={cn(
                `absolute [background:radial-gradient(circle_at_center,_rgba(var(--eighth-color),_0.7)_0,_rgba(var(--eighth-color),_0)_50%)_no-repeat]`,
                `[mix-blend-mode:var(--blending-value)] w-[calc(var(--size)*0.7)] h-[calc(var(--size)*0.7)] top-[calc(50%-var(--size)*0.35)] left-[calc(50%-var(--size)*0.35)]`,
                `[transform-origin:calc(50%+300px)_calc(50%+600px)]`,
                `animate-eighth`,
                `opacity-65`
              )}
              style={{ animationDuration: `${baseSpeed * 3}s` }}
            ></div>
            <div
              className={cn(
                `absolute [background:radial-gradient(circle_at_center,_rgba(var(--ninth-color),_0.8)_0,_rgba(var(--ninth-color),_0)_50%)_no-repeat]`,
                `[mix-blend-mode:var(--blending-value)] w-[calc(var(--size)*0.6)] h-[calc(var(--size)*0.6)] top-[calc(50%-var(--size)*0.3)] left-[calc(50%-var(--size)*0.3)]`,
                `[transform-origin:calc(50%-500px)_calc(50%+400px)]`,
                `animate-ninth`,
                `opacity-70`
              )}
              style={{ animationDuration: `${baseSpeed * 4.5}s` }}
            ></div>
            <div
              className={cn(
                `absolute [background:radial-gradient(circle_at_center,_rgba(var(--tenth-color),_0.6)_0,_rgba(var(--tenth-color),_0)_50%)_no-repeat]`,
                `[mix-blend-mode:var(--blending-value)] w-[calc(var(--size)*0.85)] h-[calc(var(--size)*0.85)] top-[calc(50%-var(--size)*0.425)] left-[calc(50%-var(--size)*0.425)]`,
                `[transform-origin:calc(50%+700px)_calc(50%-200px)]`,
                `animate-tenth`,
                `opacity-60`
              )}
              style={{ animationDuration: `${baseSpeed * 3.5}s` }}
            ></div>
          </>
        )}

        {isInteractive && (
          <div
            ref={interactiveRef}
            onMouseMove={handleMouseMove}
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),_0.8)_0,_rgba(var(--pointer-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-full h-full -top-1/2 -left-1/2`,
              `opacity-70`
            )}
          ></div>
        )}
      </div>
    </div>
  );
};