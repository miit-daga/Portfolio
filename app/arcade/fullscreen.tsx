"use client";
import { useEffect, useState } from "react";

// A full screen button for the games' button row. The browser's own full
// screen (F11, or Ctrl+Cmd+F on a Mac) works too; this one is for the mouse,
// and for browsers where that key isn't obvious. Hidden where the page can't
// go full screen (iPhone Safari, for one). Leaving a game leaves full screen
// too (arcade.tsx).
export function FullscreenButton({ className }: { className?: string }) {
    const [can, setCan] = useState(false);
    const [on, setOn] = useState(false);
    useEffect(() => {
        setCan(!!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false);
        const sync = () => setOn(!!document.fullscreenElement);
        sync();
        document.addEventListener("fullscreenchange", sync);
        return () => document.removeEventListener("fullscreenchange", sync);
    }, []);
    if (!can) return null;
    const toggle = () => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void document.documentElement.requestFullscreen().catch(() => {});
    };
    return (
        <button type="button" onClick={toggle} aria-label={on ? "Exit full screen" : "Full screen"} title={on ? "Exit full screen" : "Full screen"} className={className}>
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {on ? <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" /> : <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />}
            </svg>
        </button>
    );
}

/** Leave full screen, if the page is in it (on leaving a game). */
export function leaveFullscreen() {
    if (typeof document !== "undefined" && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}
