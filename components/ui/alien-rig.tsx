"use client";
import { createContext, memo, useContext, type ReactNode } from "react";
import { motion, type TargetAndTransition } from "framer-motion";

// The idle alien's two rigs (idle-alien.tsx), from public/alien-front.svg and
// public/alien-profile.svg. Every limb is split at its joints into nested
// groups, each rotating round its own pivot, so the code can bend an elbow,
// wag a hand from the wrist or swing a leg from the hip and everything below
// follows.
//
// A pose maps joint ids to framer-motion targets (rotate, x, scaleY,
// opacity, each with its own transition if needed). Joints left out of a
// pose settle back to rest.

export type Pose = Partial<Record<string, TargetAndTransition>>;

type Pivots = Record<string, [number, number]>;

// In viewBox units (0 0 256 512), as marked by data-pivot in the SVGs
const FRONT_PIVOTS: Pivots = {
    "leg-l": [112, 368],
    "shin-l": [110, 430],
    "foot-l": [108, 486],
    "leg-r": [144, 368],
    "shin-r": [146, 430],
    "foot-r": [148, 486],
    "arm-l": [90, 262],
    "fore-l": [82, 326],
    "hand-l": [80, 390],
    "arm-r": [166, 262],
    "fore-r": [174, 326],
    "hand-r": [176, 390],
    "head": [128, 236],
    "antenna-l": [106, 46],
    "antenna-r": [150, 46],
    "eye-l": [94, 160],
    "eye-r": [162, 160],
    "body": [128, 500],
    "mouth": [128, 218],
    "mouth-open": [128, 219],
    "blush": [128, 187],
};

const PROFILE_PIVOTS: Pivots = {
    "leg-far": [128, 368],
    "shin-far": [128, 430],
    "foot-far": [128, 486],
    "arm-far": [128, 262],
    "fore-far": [128, 326],
    "hand-far": [128, 390],
    "leg-near": [124, 368],
    "shin-near": [124, 430],
    "foot-near": [124, 486],
    "arm-near": [124, 262],
    "fore-near": [124, 326],
    "hand-near": [124, 390],
    "head": [128, 236],
    "antenna-far": [140, 44],
    "antenna-near": [118, 46],
    "eye": [70, 160],
    "body": [128, 500],
    "mouth": [60, 214],
};

// Hidden until a pose shows them
const HIDDEN = new Set(["mouth-open", "blush"]);

const RigCtx = createContext<{ pose: Pose; pivots: Pivots }>({ pose: {}, pivots: {} });

const J = ({ id, children }: { id: string; children?: ReactNode }) => {
    const { pose, pivots } = useContext(RigCtx);
    const [x, y] = pivots[id] ?? [0, 0];
    const rest = HIDDEN.has(id) ? { opacity: 0 } : { rotate: 0, x: 0, scaleY: 1, scale: 1 };
    return (
        <motion.g
            style={{ transformOrigin: `${x}px ${y}px` }}
            initial={rest}
            animate={pose[id] ?? { ...rest, transition: { duration: 0.25 } }}
        >
            {children}
        </motion.g>
    );
};

/** Facing the viewer. `handL` is drawn in the left hand (the night torch). */
export const AlienFront = memo(function AlienFront({ pose, handL }: { pose: Pose; handL?: ReactNode }) {
    return (
        <RigCtx.Provider value={{ pose, pivots: FRONT_PIVOTS }}>
              <defs>
                <radialGradient id="alien-head-grad" cx="0.38" cy="0.3" r="0.78" fx="0.3" fy="0.2">
                  <stop offset="0" stopColor="#C2D4C8"/>
                  <stop offset="0.45" stopColor="#9AB0A2"/>
                  <stop offset="0.7" stopColor="#7E988A"/>
                  <stop offset="0.9" stopColor="#465A4F"/>
                  <stop offset="1" stopColor="#64888D"/>
                </radialGradient>
                <linearGradient id="alien-torso-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#C2D4C8"/>
                  <stop offset="0.45" stopColor="#7E988A"/>
                  <stop offset="0.85" stopColor="#465A4F"/>
                  <stop offset="1" stopColor="#64888D"/>
                </linearGradient>
                <linearGradient id="alien-limb-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#B0C4B8"/>
                  <stop offset="0.5" stopColor="#7E988A"/>
                  <stop offset="1" stopColor="#465A4F"/>
                </linearGradient>
                <linearGradient id="alien-leg-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#9EB3A6"/>
                  <stop offset="0.5" stopColor="#6F8A7B"/>
                  <stop offset="1" stopColor="#465A4F"/>
                </linearGradient>
                <radialGradient id="alien-eye-grad" cx="0.4" cy="0.35" r="0.7">
                  <stop offset="0" stopColor="#1A2520"/>
                  <stop offset="1" stopColor="#050806"/>
                </radialGradient>
                <radialGradient id="alien-bulb-grad" cx="0.4" cy="0.35" r="0.65">
                  <stop offset="0" stopColor="#ECFFFB"/>
                  <stop offset="0.55" stopColor="#5eead4"/>
                  <stop offset="1" stopColor="#2BBFAA"/>
                </radialGradient>
                <radialGradient id="alien-halo-grad" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#5eead4" stopOpacity="0.45"/>
                  <stop offset="1" stopColor="#5eead4" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="alien-blush-grad" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#fda4af" stopOpacity="0.7"/>
                  <stop offset="1" stopColor="#fda4af" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <J id="body">
                {/* Left leg */}
                <J id="leg-l">
                  <path d="M102,368 A10,10 0 0 1 122,368 L118,430 A8,8 0 0 1 102,430 Z" fill="url(#alien-leg-grad)"/>
                  <J id="shin-l">
                    <path d="M102,430 A8,8 0 0 1 118,430 L114,486 A6,6 0 0 1 102,486 Z" fill="url(#alien-leg-grad)"/>
                    <J id="foot-l">
                      <path d="M101,486 A7,7 0 0 1 115,486 C116,492 117,499 112,500 L95,500 C88,500 86,493 93,491 C98,490 101,489 101,486 Z" fill="url(#alien-leg-grad)"/>
                    </J>
                  </J>
                </J>
                {/* Right leg */}
                <J id="leg-r">
                  <path d="M134,368 A10,10 0 0 1 154,368 L154,430 A8,8 0 0 1 138,430 Z" fill="url(#alien-leg-grad)"/>
                  <J id="shin-r">
                    <path d="M138,430 A8,8 0 0 1 154,430 L154,486 A6,6 0 0 1 142,486 Z" fill="url(#alien-leg-grad)"/>
                    <J id="foot-r">
                      <path d="M155,486 A7,7 0 0 0 141,486 C140,492 139,499 144,500 L161,500 C168,500 170,493 163,491 C158,490 155,489 155,486 Z" fill="url(#alien-leg-grad)"/>
                    </J>
                  </J>
                </J>
                {/* Torso */}
                <path d="M119,232 L137,232 C138,242 141,248 150,252 C156,255 162,260 162,270 C162,282 158,296 158,310 C158,326 166,340 164,354 C162,366 152,376 140,378 L116,378 C104,376 94,366 92,354 C90,340 98,326 98,310 C98,296 94,282 94,270 C94,260 100,255 106,252 C115,248 118,242 119,232 Z" fill="url(#alien-torso-grad)"/>
                <path d="M106,252 C100,255 94,260 94,270 C94,282 98,296 98,310 C98,326 90,340 92,354" fill="none" stroke="#DCF0E4" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round"/>
                {/* Left arm */}
                <J id="arm-l">
                  <path d="M81,262 A9,9 0 0 1 99,262 L89,326 A7,7 0 0 1 75,326 Z" fill="url(#alien-limb-grad)"/>
                  <J id="fore-l">
                    <path d="M75,326 A7,7 0 0 1 89,326 L85,390 A5,5 0 0 1 75,390 Z" fill="url(#alien-limb-grad)"/>
                    <J id="hand-l">
                      <circle cx="80" cy="390" r="6" fill="#8FA89A"/>
                      <path d="M72,396 C72,390 88,390 88,396 L89,406 C89,412 71,412 71,406 Z" fill="url(#alien-limb-grad)"/>
                      <g fill="none" stroke="#6F8A7B" strokeWidth="4.5" strokeLinecap="round">
                        <path d="M72,398 L65,410"/>
                        <path d="M75,406 L71,423"/>
                        <path d="M80,408 L80,426"/>
                        <path d="M85,406 L89,423"/>
                      </g>
                      <circle cx="64.5" cy="411" r="3" fill="#7E988A"/>
                      <circle cx="70.5" cy="424.5" r="3.2" fill="#7E988A"/>
                      <circle cx="80" cy="427.5" r="3.2" fill="#7E988A"/>
                      <circle cx="89.5" cy="424.5" r="3.2" fill="#6F8A7B"/>
                        {handL}
                    </J>
                  </J>
                </J>
                {/* Right arm (waving arm) */}
                <J id="arm-r">
                  <path d="M157,262 A9,9 0 0 1 175,262 L181,326 A7,7 0 0 1 167,326 Z" fill="url(#alien-limb-grad)"/>
                  <J id="fore-r">
                    <path d="M167,326 A7,7 0 0 1 181,326 L181,390 A5,5 0 0 1 171,390 Z" fill="url(#alien-limb-grad)"/>
                    <J id="hand-r">
                      <circle cx="176" cy="390" r="6" fill="#7E988A"/>
                      <path d="M168,396 C168,390 184,390 184,396 L185,406 C185,412 167,412 167,406 Z" fill="url(#alien-limb-grad)"/>
                      <g fill="none" stroke="#5E7869" strokeWidth="4.5" strokeLinecap="round">
                        <path d="M184,398 L191,410"/>
                        <path d="M181,406 L185,423"/>
                        <path d="M176,408 L176,426"/>
                        <path d="M171,406 L167,423"/>
                      </g>
                      <circle cx="191.5" cy="411" r="3" fill="#6A8575"/>
                      <circle cx="185.5" cy="424.5" r="3.2" fill="#6A8575"/>
                      <circle cx="176" cy="427.5" r="3.2" fill="#7E988A"/>
                      <circle cx="166.5" cy="424.5" r="3.2" fill="#7E988A"/>
                    </J>
                  </J>
                </J>
                {/* Head */}
                <J id="head">
                  <J id="antenna-l">
                    <path d="M106,46 C104,30 94,20 85,13" fill="none" stroke="#7E988A" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="84" cy="10" r="13" fill="url(#alien-halo-grad)"/>
                    <circle cx="84" cy="10" r="5" fill="url(#alien-bulb-grad)"/>
                  </J>
                  <J id="antenna-r">
                    <path d="M150,46 C152,30 162,20 171,13" fill="none" stroke="#6F8A7B" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="172" cy="10" r="13" fill="url(#alien-halo-grad)"/>
                    <circle cx="172" cy="10" r="5" fill="url(#alien-bulb-grad)"/>
                  </J>
                  <path d="M128,36 C170,36 196,64 196,110 C196,150 180,186 158,210 C146,224 138,240 128,240 C118,240 110,224 98,210 C76,186 60,150 60,110 C60,64 86,36 128,36 Z" fill="url(#alien-head-grad)"/>
                  <ellipse cx="104" cy="78" rx="24" ry="14" fill="#E4F0E8" opacity="0.16"/>
                  <path d="M102,43 C78,54 62,78 61,110 C61,140 70,165 84,186" fill="none" stroke="#DCF0E4" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round"/>
                  <J id="eye-l">
                    <path d="M71,151 C80,138 110,144 117,165 C106,180 74,176 71,151 Z" fill="url(#alien-eye-grad)" stroke="#3A4A41" strokeWidth="1.5" strokeLinejoin="round"/>
                    <ellipse cx="83" cy="153" rx="4.5" ry="3" fill="#FFFFFF" opacity="0.95"/>
                    <circle cx="91" cy="150" r="1.8" fill="#FFFFFF" opacity="0.5"/>
                  </J>
                  <J id="eye-r">
                    <path d="M185,151 C176,138 146,144 139,165 C150,180 182,176 185,151 Z" fill="url(#alien-eye-grad)" stroke="#3A4A41" strokeWidth="1.5" strokeLinejoin="round"/>
                    <ellipse cx="173" cy="153" rx="4.5" ry="3" fill="#FFFFFF" opacity="0.95"/>
                    <circle cx="165" cy="150" r="1.8" fill="#FFFFFF" opacity="0.5"/>
                  </J>
                  <circle cx="123.5" cy="197" r="1.3" fill="#3A4A41" opacity="0.5"/>
                  <circle cx="132.5" cy="197" r="1.3" fill="#3A4A41" opacity="0.5"/>
                  <J id="mouth"><path d="M120,217 Q128,221.5 136,217" fill="none" stroke="#3A4A41" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round"/></J>
                  <J id="mouth-open"><ellipse cx="128" cy="219" rx="5" ry="6" fill="#1A2520"/></J>
                  <J id="blush">
                    <ellipse cx="92" cy="187" rx="11" ry="5.5" fill="url(#alien-blush-grad)"/>
                    <ellipse cx="164" cy="187" rx="11" ry="5.5" fill="url(#alien-blush-grad)"/>
                  </J>
                </J>
              </J>
        </RigCtx.Provider>
    );
});

/** In profile, facing left. */
export const AlienProfile = memo(function AlienProfile({ pose }: { pose: Pose }) {
    return (
        <RigCtx.Provider value={{ pose, pivots: PROFILE_PIVOTS }}>
              <defs>
                <radialGradient id="alien-p-head-grad" cx="0.36" cy="0.3" r="0.78" fx="0.28" fy="0.2">
                  <stop offset="0" stopColor="#C2D4C8"/>
                  <stop offset="0.45" stopColor="#9AB0A2"/>
                  <stop offset="0.7" stopColor="#7E988A"/>
                  <stop offset="0.9" stopColor="#465A4F"/>
                  <stop offset="1" stopColor="#64888D"/>
                </radialGradient>
                <linearGradient id="alien-p-torso-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#C2D4C8"/>
                  <stop offset="0.45" stopColor="#7E988A"/>
                  <stop offset="0.85" stopColor="#465A4F"/>
                  <stop offset="1" stopColor="#64888D"/>
                </linearGradient>
                <linearGradient id="alien-p-near-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#B0C4B8"/>
                  <stop offset="0.5" stopColor="#7E988A"/>
                  <stop offset="1" stopColor="#465A4F"/>
                </linearGradient>
                <linearGradient id="alien-p-far-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#5C7A68"/>
                  <stop offset="0.55" stopColor="#3A4A41"/>
                  <stop offset="1" stopColor="#24302A"/>
                </linearGradient>
                <radialGradient id="alien-p-eye-grad" cx="0.45" cy="0.35" r="0.7">
                  <stop offset="0" stopColor="#1A2520"/>
                  <stop offset="1" stopColor="#050806"/>
                </radialGradient>
                <radialGradient id="alien-p-bulb-grad" cx="0.4" cy="0.35" r="0.65">
                  <stop offset="0" stopColor="#ECFFFB"/>
                  <stop offset="0.55" stopColor="#5eead4"/>
                  <stop offset="1" stopColor="#2BBFAA"/>
                </radialGradient>
                <radialGradient id="alien-p-halo-grad" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#5eead4" stopOpacity="0.45"/>
                  <stop offset="1" stopColor="#5eead4" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <J id="body">
                {/* Far leg (behind torso, darker) */}
                <J id="leg-far">
                  <path d="M118,368 A10,10 0 0 1 138,368 L136,430 A8,8 0 0 1 120,430 Z" fill="url(#alien-p-far-grad)"/>
                  <J id="shin-far">
                    <path d="M120,430 A8,8 0 0 1 136,430 L134,486 A6,6 0 0 1 122,486 Z" fill="url(#alien-p-far-grad)"/>
                    <J id="foot-far">
                      <path d="M121,486 A7,7 0 0 1 135,486 C137,492 137,499 132,500 L108,500 C100,500 98,493 105,490 C112,488 120,490 121,486 Z" fill="url(#alien-p-far-grad)"/>
                    </J>
                  </J>
                </J>
                {/* Far arm (behind torso, darker) */}
                <J id="arm-far">
                  <path d="M119,262 A9,9 0 0 1 137,262 L135,326 A7,7 0 0 1 121,326 Z" fill="url(#alien-p-far-grad)"/>
                  <J id="fore-far">
                    <path d="M121,326 A7,7 0 0 1 135,326 L133,390 A5,5 0 0 1 123,390 Z" fill="url(#alien-p-far-grad)"/>
                    <J id="hand-far">
                      <path d="M122,390 A6,6 0 0 1 134,390 C136,402 135,414 131,422 C128,429 120,430 118,424 C116,419 121,417 121,410 C121,402 122,396 122,390 Z" fill="url(#alien-p-far-grad)"/>
                      <path d="M122,400 C117,404 116,410 118,413" fill="none" stroke="#24302A" strokeWidth="3" strokeLinecap="round"/>
                    </J>
                  </J>
                </J>
                {/* Torso */}
                <path d="M120,232 L138,232 C139,244 142,252 146,262 C150,278 148,300 146,320 C144,340 148,356 146,368 C144,378 134,382 124,382 C114,382 106,376 104,366 C102,352 100,340 102,326 C104,312 106,300 104,288 C102,276 108,264 114,256 C118,250 120,242 120,232 Z" fill="url(#alien-p-torso-grad)"/>
                <path d="M114,256 C108,264 102,276 104,288 C106,300 104,312 102,326 C100,340 102,352 104,366" fill="none" stroke="#DCF0E4" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round"/>
                {/* Near leg */}
                <J id="leg-near">
                  <path d="M114,368 A10,10 0 0 1 134,368 L132,430 A8,8 0 0 1 116,430 Z" fill="url(#alien-p-near-grad)"/>
                  <J id="shin-near">
                    <path d="M116,430 A8,8 0 0 1 132,430 L130,486 A6,6 0 0 1 118,486 Z" fill="url(#alien-p-near-grad)"/>
                    <J id="foot-near">
                      <path d="M117,486 A7,7 0 0 1 131,486 C133,492 133,499 128,500 L104,500 C96,500 94,493 101,490 C108,488 116,490 117,486 Z" fill="url(#alien-p-near-grad)"/>
                    </J>
                  </J>
                </J>
                {/* Near arm */}
                <J id="arm-near">
                  <path d="M115,262 A9,9 0 0 1 133,262 L131,326 A7,7 0 0 1 117,326 Z" fill="url(#alien-p-near-grad)"/>
                  <J id="fore-near">
                    <path d="M117,326 A7,7 0 0 1 131,326 L129,390 A5,5 0 0 1 119,390 Z" fill="url(#alien-p-near-grad)"/>
                    <J id="hand-near">
                      <path d="M118,390 A6,6 0 0 1 130,390 C132,402 131,414 127,422 C124,429 116,430 114,424 C112,419 117,417 117,410 C117,402 118,396 118,390 Z" fill="url(#alien-p-near-grad)"/>
                      <path d="M118,400 C113,404 112,410 114,413" fill="none" stroke="#6F8A7B" strokeWidth="3" strokeLinecap="round"/>
                      <path d="M126,410 C125,416 122,420 118,422" fill="none" stroke="#465A4F" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round"/>
                    </J>
                  </J>
                </J>
                {/* Head */}
                <J id="head">
                  <J id="antenna-far">
                    <path d="M140,44 C142,28 152,18 160,12" fill="none" stroke="#465A4F" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="162" cy="10" r="12" fill="url(#alien-p-halo-grad)" opacity="0.7"/>
                    <circle cx="162" cy="10" r="4.5" fill="url(#alien-p-bulb-grad)" opacity="0.75"/>
                  </J>
                  <J id="antenna-near">
                    <path d="M118,46 C118,30 124,18 132,12" fill="none" stroke="#7E988A" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="134" cy="10" r="13" fill="url(#alien-p-halo-grad)"/>
                    <circle cx="134" cy="10" r="5" fill="url(#alien-p-bulb-grad)"/>
                  </J>
                  <path d="M120,36 C166,34 202,62 202,104 C202,140 186,168 164,196 C152,212 142,226 132,236 C120,242 100,242 88,236 C74,232 60,220 54,202 C48,184 44,162 44,140 C44,82 76,38 120,36 Z" fill="url(#alien-p-head-grad)"/>
                  <ellipse cx="100" cy="76" rx="26" ry="14" fill="#E4F0E8" opacity="0.16"/>
                  <path d="M104,40 C74,50 52,76 46,112 C45,122 44,132 44,140" fill="none" stroke="#DCF0E4" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round"/>
                  <J id="eye">
                    <path d="M52,166 C56,150 80,140 90,148 C92,164 70,180 52,166 Z" fill="url(#alien-p-eye-grad)" stroke="#3A4A41" strokeWidth="1.5" strokeLinejoin="round"/>
                    <ellipse cx="82" cy="151" rx="4" ry="2.8" fill="#FFFFFF" opacity="0.95"/>
                    <circle cx="75" cy="149.5" r="1.6" fill="#FFFFFF" opacity="0.5"/>
                  </J>
                  <circle cx="52" cy="190" r="1.3" fill="#3A4A41" opacity="0.5"/>
                  <J id="mouth"><path d="M56,213 Q60,215.5 65,214" fill="none" stroke="#3A4A41" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round"/></J>
                </J>
              </J>
        </RigCtx.Provider>
    );
});

// ---- Poses ------------------------------------------------------------------

const N = 16; // keyframes per cycle; linear between them, so the curves stay smooth
const sample = (f: (phi: number) => number) =>
    Array.from({ length: N + 1 }, (_, i) => +f((i / N) * Math.PI * 2).toFixed(2));
const loop = (duration: number) => ({ duration, repeat: Infinity, ease: "linear" as const });

/**
 * One stride cycle (both feet), in profile. Worked out per joint rather than
 * drawn, so it loops without a seam: the legs swing from the hip, the knee
 * folds as the leg swings through, the foot lands heel first and pushes off
 * with the toe, the arms counter-swing with a lagging forearm, and the head
 * and antennae bob a beat behind the step.
 *
 * gait: "walk", "tiptoe" (Kolkata's night: slower, smaller, knees bent),
 * or "sprint" (fleeing: bigger strides, pumping arms, leaning in).
 */
export function stridePose(cycle: number, gait: "walk" | "tiptoe" | "sprint"): Pose {
    const a = gait === "sprint" ? 1.35 : gait === "tiptoe" ? 0.6 : 1;
    const bend = gait === "tiptoe" ? 14 : 6; // knee never quite straight
    const pump = gait === "sprint" ? 60 : 10; // forearm carried bent
    const t = loop(cycle);

    const leg = (off: number): Pose => {
        const hip = (p: number) => 24 * a * Math.cos(p + off);
        const knee = (p: number) => -(bend + 42 * a * Math.max(0, -Math.sin(p + off)) ** 1.5);
        // Keeps the sole near flat in stance, toe trailing in the swing
        const foot = (p: number) => -0.6 * (hip(p) + knee(p));
        return { hip: { rotate: sample(hip), transition: t }, knee: { rotate: sample(knee), transition: t }, foot: { rotate: sample(foot), transition: t } };
    };
    const arm = (off: number): Pose => ({
        arm: { rotate: sample((p) => -18 * a * Math.cos(p + off)), transition: t },
        fore: { rotate: sample((p) => pump + 20 * a * Math.max(0, -Math.cos(p + off - 0.5))), transition: t },
    });
    const near = leg(0);
    const far = leg(Math.PI);
    const nearArm = arm(0);
    const farArm = arm(Math.PI);
    return {
        "leg-near": near.hip,
        "shin-near": near.knee,
        "foot-near": near.foot,
        "leg-far": far.hip,
        "shin-far": far.knee,
        "foot-far": far.foot,
        "arm-near": nearArm.arm,
        "fore-near": nearArm.fore,
        "arm-far": farArm.arm,
        "fore-far": farArm.fore,
        head: { rotate: sample((p) => 2 * Math.sin(2 * p - 0.6)), transition: t },
        "antenna-near": { rotate: sample((p) => 7 * a * Math.sin(2 * p - 1.2)), transition: t },
        "antenna-far": { rotate: sample((p) => 7 * a * Math.sin(2 * p - 1.6)), transition: t },
        // Leaning into it: forward is to the left, round the feet
        body: { rotate: gait === "sprint" ? -9 : gait === "tiptoe" ? -4 : -2, transition: { duration: 0.2 } },
    };
}

export type FrontMood = "idle" | "startled" | "caught" | "beam" | "still";

// Browsing: the head turns this way and that, the eyes follow it
const BROWSE_T = { duration: 6.5, times: [0, 0.14, 0.32, 0.48, 0.62, 0.86, 1], repeat: Infinity, ease: "easeInOut" as const };
const BLINK_T = { duration: 4.4, times: [0, 0.46, 0.5, 0.54, 1], repeat: Infinity };

/** Facing the viewer. `wave` plays a wave of that many seconds on top. */
export function frontPose(mood: FrontMood, wave: number | null): Pose {
    const pose: Pose = {};
    const eyes = (target: TargetAndTransition) => {
        pose["eye-l"] = target;
        pose["eye-r"] = target;
    };

    if (mood === "idle") {
        pose.head = { rotate: [0, -7, -7, 0, 7, 7, 0], transition: BROWSE_T };
        eyes({ x: [0, -7, -7, 0, 7, 7, 0], scaleY: [1, 1, 0.08, 1, 1], scale: 1, transition: { x: BROWSE_T, scaleY: BLINK_T, scale: { duration: 0.2 } } });
        pose["antenna-l"] = { rotate: [0, -5, 0, 4, 0], transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } };
        pose["antenna-r"] = { rotate: [0, 4, 0, -5, 0], transition: { duration: 3.7, repeat: Infinity, ease: "easeInOut" } };
        pose["arm-l"] = { rotate: [0, 2.5, 0], transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } };
        pose["arm-r"] = { rotate: [0, -2.5, 0], transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } };
    } else if (mood === "startled") {
        // Eyes wide, "o" mouth, antennae spring upright, arms fling out
        const spring = { type: "spring" as const, stiffness: 700, damping: 9 };
        eyes({ x: 0, scale: 1.18, scaleY: 1, transition: { duration: 0.12 } });
        pose.mouth = { opacity: 0, transition: { duration: 0.05 } };
        pose["mouth-open"] = { opacity: 1, transition: { duration: 0.05 } };
        pose["antenna-l"] = { rotate: 18, transition: spring };
        pose["antenna-r"] = { rotate: -18, transition: spring };
        pose["arm-l"] = { rotate: 20, transition: spring };
        pose["arm-r"] = { rotate: -20, transition: spring };
        pose["fore-l"] = { rotate: 12, transition: spring };
        pose["fore-r"] = { rotate: -12, transition: spring };
    } else if (mood === "caught") {
        // Sheepish: blushing, antennae drooping, head down a touch
        pose.blush = { opacity: 1, transition: { duration: 0.4 } };
        pose["antenna-l"] = { rotate: -24, transition: { duration: 0.5, ease: "easeOut" } };
        pose["antenna-r"] = { rotate: 24, transition: { duration: 0.5, ease: "easeOut" } };
        pose.head = { rotate: -4, transition: { duration: 0.4 } };
        eyes({ x: 0, scale: 1, scaleY: [1, 1, 0.08, 1, 1], transition: { scaleY: BLINK_T, duration: 0.2 } });
    } else if (mood === "beam") {
        // Floating up: arms out, legs dangling, wide-eyed
        eyes({ x: 0, scale: 1.12, scaleY: 1, transition: { duration: 0.3 } });
        pose["arm-l"] = { rotate: 28, transition: { duration: 0.8, ease: "easeOut" } };
        pose["arm-r"] = { rotate: -28, transition: { duration: 0.8, ease: "easeOut" } };
        pose["leg-l"] = { rotate: 5, transition: { duration: 0.8 } };
        pose["leg-r"] = { rotate: -5, transition: { duration: 0.8 } };
        pose["antenna-l"] = { rotate: [0, 8, 0], transition: { duration: 0.9, repeat: Infinity } };
        pose["antenna-r"] = { rotate: [0, -8, 0], transition: { duration: 0.9, repeat: Infinity } };
    }

    if (wave) {
        // The upper arm lifts, the elbow bends, and the hand wags from the
        // wrist. Caught, it is a smaller, sheepish one, the arm half raised
        const shy = mood === "caught";
        const times = [0, 0.16, 0.32, 0.5, 0.68, 0.84, 1];
        const w = { duration: wave, times, ease: "easeInOut" as const };
        const lift = shy ? -95 : -140;
        pose["arm-r"] = { rotate: [0, lift, lift, lift, lift, lift, 0], transition: w };
        pose["fore-r"] = { rotate: shy ? [0, -55, -40, -62, -40, -55, 0] : [0, -38, -12, -52, -12, -38, 0], transition: w };
        pose["hand-r"] = { rotate: [0, 0, 20, -20, 20, 0, 0], transition: w };
        if (!shy) pose.head = { rotate: [0, 6, 6, 6, 6, 6, 0], transition: w };
    }
    return pose;
}
