"use client";
import { motion, useReducedMotion } from "framer-motion";

// A little astronaut drifting in the hero. Grab him, toss him - he tumbles off
// with momentum, then slowly drifts back to his post. Pure transforms.
export const AstronautBuddy = ({ className }: { className?: string }) => {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={`pointer-events-auto absolute z-[55] cursor-grab active:cursor-grabbing ${className ?? ""}`}
            drag
            dragSnapToOrigin
            dragElastic={0.18}
            dragTransition={{ bounceStiffness: 28, bounceDamping: 7, power: 0.4, timeConstant: 320 }}
            whileDrag={{ scale: 1.08, rotate: 10 }}
            whileHover={{ scale: 1.05 }}
            style={{ touchAction: "none" }}
            aria-label="Floating astronaut. Drag to send him tumbling."
            role="img"
        >
            {/* Idle zero-g bob */}
            <motion.div
                animate={reduce ? undefined : { y: [0, -8, 0], rotate: [-5, 4, -5] }}
                transition={reduce ? undefined : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
                style={{ width: 46, height: 66, filter: "drop-shadow(0 0 8px rgba(45,212,191,0.18))" }}
            >
                {/* Backpack */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-md"
                    style={{ top: 16, width: 34, height: 32, background: "linear-gradient(180deg, #94a3b8, #475569)" }}
                />
                {/* Arms */}
                <div
                    className="absolute rounded-full"
                    style={{ left: 1, top: 24, width: 9, height: 22, background: "linear-gradient(180deg, #f1f5f9, #94a3b8)", transform: "rotate(18deg)" }}
                />
                <div
                    className="absolute rounded-full"
                    style={{ right: 1, top: 24, width: 9, height: 22, background: "linear-gradient(180deg, #f1f5f9, #94a3b8)", transform: "rotate(-18deg)" }}
                />
                {/* Legs */}
                <div
                    className="absolute rounded-full"
                    style={{ left: 11, bottom: 0, width: 10, height: 18, background: "linear-gradient(180deg, #e2e8f0, #64748b)", transform: "rotate(6deg)" }}
                />
                <div
                    className="absolute rounded-full"
                    style={{ right: 11, bottom: 0, width: 10, height: 18, background: "linear-gradient(180deg, #e2e8f0, #64748b)", transform: "rotate(-6deg)" }}
                />
                {/* Torso suit */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-[10px]"
                    style={{
                        top: 22,
                        width: 28,
                        height: 28,
                        background: "linear-gradient(160deg, #ffffff 0%, #e2e8f0 55%, #94a3b8 100%)",
                        boxShadow: "inset -2px -2px 4px rgba(71,85,105,0.35)",
                    }}
                >
                    {/* Chest panel */}
                    <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-[3px]" style={{ width: 12, height: 8, background: "#334155" }}>
                        <span className="absolute rounded-full" style={{ left: 2, top: 2.5, width: 2.5, height: 2.5, background: "#2dd4bf" }} />
                        <span className="absolute rounded-full" style={{ left: 6.5, top: 2.5, width: 2.5, height: 2.5, background: "#f59e0b" }} />
                    </div>
                </div>
                {/* Helmet */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                        top: 0,
                        width: 30,
                        height: 28,
                        background: "linear-gradient(160deg, #ffffff, #cbd5e1 70%, #94a3b8)",
                        boxShadow: "inset -2px -2px 4px rgba(71,85,105,0.3)",
                    }}
                >
                    {/* Visor */}
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
                        style={{ width: 21, height: 16, background: "radial-gradient(circle at 38% 30%, #1e293b, #020617 75%)" }}
                    >
                        {/* Visor glint */}
                        <div
                            className="absolute rounded-full"
                            style={{ left: 3, top: 2.5, width: 7, height: 3.5, background: "rgba(94,234,212,0.45)", transform: "rotate(-18deg)" }}
                        />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
