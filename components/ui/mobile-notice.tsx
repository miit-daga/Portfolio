"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Heads-up for phone visitors: the full experience lives on desktop. Shows a
// few seconds after entry; a dismissal silences it for 24 hours.
const STORAGE_KEY = "mobile-notice-dismissed-at";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const MobileNotice = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        try {
            const dismissedAt = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
            if (Date.now() - dismissedAt < COOLDOWN_MS) return;
        } catch {
            /* ignore */
        }
        if (window.innerWidth >= 768) return;
        const t = window.setTimeout(() => setShow(true), 3500);
        return () => clearTimeout(t);
    }, []);

    const dismiss = () => {
        setShow(false);
        try {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch {
            /* ignore */
        }
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="fixed inset-x-4 bottom-4 z-[6000] mx-auto max-w-sm rounded-2xl border border-teal-500/30 bg-neutral-950/95 p-4 shadow-[0_0_30px_rgba(45,212,191,0.2)]"
                >
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal-400/80">
                        pocket edition detected
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-200">
                        You&apos;re seeing the travel-size cosmos. 📱 On a desktop this place
                        also has a command palette, an asteroid defense mode, a stardust
                        cursor, and one very illegal keyboard code.
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                        Don&apos;t worry: the hidden shards (and one nosy alien) work right
                        here. Happy hunting.
                    </p>
                    <button
                        onClick={dismiss}
                        className="mt-3 w-full rounded-full border border-teal-500/40 bg-teal-500/15 px-5 py-2 text-sm font-medium text-teal-200 transition-colors hover:bg-teal-500/25"
                    >
                        Understood, commander
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
