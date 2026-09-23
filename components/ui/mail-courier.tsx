"use client";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Ufo } from "./ufo";

// "Send a message" as an errand for the contact scene's saucer: it swoops from
// its orbit to hover over the button, beams the message up as an envelope,
// and zooms off as the mail app opens. The scene's own saucer hides meanwhile
// (window event "ufo-courier"), so there is only ever one.
//
// Reduced motion, or a modified click (new tab, etc.), skips straight to the
// normal link.

type Pt = { x: number; y: number };
type Run = { from: Pt; hover: Pt; button: Pt; key: number };

const FLY_IN = 0.6;
const BEAM = 0.75;
const FLY_OUT = 0.5;

export function useMailCourier(href: string) {
    const [run, setRun] = useState<Run | null>(null);

    const launch = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            e.preventDefault();
            if (run) return;

            const btn = e.currentTarget.getBoundingClientRect();
            const button = { x: btn.left + btn.width / 2, y: btn.top + btn.height / 2 };
            // Start from the scene's saucer if it is on screen, else from the top right
            const src = document.querySelector("[data-signal-ufo]")?.getBoundingClientRect();
            const from =
                src && src.bottom > 0 && src.top < window.innerHeight
                    ? { x: src.left + src.width / 2, y: src.top + src.height / 2 }
                    : { x: window.innerWidth + 80, y: -60 };
            const hover = { x: button.x, y: Math.max(40, btn.top - 78) };

            window.dispatchEvent(new CustomEvent("ufo-courier", { detail: { active: true } }));
            setRun({ from, hover, button, key: Date.now() });

            // The mail app opens as the envelope reaches the saucer
            window.setTimeout(() => {
                window.location.href = href;
            }, (FLY_IN + BEAM * 0.8) * 1000);
            window.setTimeout(() => {
                setRun(null);
                window.dispatchEvent(new CustomEvent("ufo-courier", { detail: { active: false } }));
            }, (FLY_IN + BEAM + FLY_OUT + 0.1) * 1000);
        },
        [href, run],
    );

    const node =
        run && typeof document !== "undefined"
            ? createPortal(<Courier run={run} />, document.body)
            : null;

    return { launch, node };
}

const Courier = ({ run }: { run: Run }) => {
    const { from, hover, button } = run;
    const exit = { x: window.innerWidth + 120, y: -120 };
    const total = FLY_IN + BEAM + FLY_OUT;
    const tIn = FLY_IN / total;
    const tBeam = (FLY_IN + BEAM) / total;
    const beamH = Math.max(20, button.y - hover.y - 14);

    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[99990]">
            {/* The saucer: in, hover, out */}
            <motion.div
                className="absolute left-0 top-0"
                style={{ width: 58, height: 24, marginLeft: -29, marginTop: -12 }}
                initial={{ x: from.x, y: from.y, scale: 1, rotate: 0 }}
                animate={{
                    x: [from.x, hover.x, hover.x, exit.x],
                    y: [from.y, hover.y, hover.y, exit.y],
                    scale: [1, 1.5, 1.5, 0.8],
                    rotate: [0, -8, 0, 14],
                }}
                transition={{ duration: total, times: [0, tIn, tBeam, 1], ease: ["easeOut", "linear", "easeIn"] }}
            >
                <Ufo reduce={false} hatchOpen thrust={false} />
            </motion.div>

            {/* Tractor beam, down to the button */}
            <motion.div
                className="absolute left-0 top-0"
                style={{
                    x: hover.x - 40,
                    y: hover.y + 10,
                    width: 80,
                    height: beamH,
                    clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)",
                    background: "linear-gradient(to bottom, rgba(253,230,138,0.6), rgba(251,191,36,0.15))",
                }}
                initial={{ opacity: 0 }}
                // Held on until the envelope is aboard, then off
                animate={{ opacity: [0, 0, 1, 1, 0] }}
                transition={{ duration: total, times: [0, tIn, tIn + 0.04, tBeam + 0.02, tBeam + 0.06] }}
            />

            {/* The message, rising up the beam */}
            <motion.div
                className="absolute left-0 top-0"
                style={{ marginLeft: -11, marginTop: -8 }}
                initial={{ x: button.x, y: button.y, opacity: 0, scale: 1 }}
                // Appears once the beam is on, and is aboard just before it goes off
                animate={{
                    x: [button.x, button.x, button.x, hover.x, hover.x],
                    y: [button.y, button.y, button.y - 8, hover.y + 8, hover.y + 8],
                    opacity: [0, 0, 1, 0.9, 0],
                    scale: [1, 1, 1.1, 0.35, 0.3],
                    rotate: [0, 0, -6, 8, 8],
                }}
                transition={{ duration: total, times: [0, tIn + 0.03, tIn + 0.08, tBeam - 0.01, tBeam + 0.02], ease: "easeIn" }}
            >
                <svg width="22" height="16" viewBox="0 0 22 16">
                    <rect x="0.75" y="0.75" width="20.5" height="14.5" rx="2.5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M1.5 2 L11 9 L20.5 2" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
            </motion.div>
        </div>
    );
};
