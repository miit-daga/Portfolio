"use client";
import { useEffect } from "react";

// Some decorations animate in CSS forever: the meteor borders round the cards
// (.meteor-border, a spinning conic gradient) and the headings' flowing
// gradients (marked data-offscreen-pause). Both are repainted on every frame
// they run, seen or not. This marks each one that is well out of view with
// data-offscreen, and globals.css pauses it there; on screen nothing changes.
// Elements that mount later (sections load as the page is used) are picked up.
const SELECTOR = ".meteor-border, [data-offscreen-pause]";

export function OffscreenPause() {
    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.target.isConnected) {
                        io.unobserve(e.target);
                        continue;
                    }
                    e.target.toggleAttribute("data-offscreen", !e.isIntersecting);
                }
            },
            { rootMargin: "200px" },
        );
        const watched = new WeakSet<Element>();
        const scan = () =>
            document.querySelectorAll(SELECTOR).forEach((el) => {
                if (watched.has(el)) return;
                watched.add(el);
                io.observe(el);
            });
        scan();
        // new elements: looked for at most once a frame
        let queued = 0;
        const mo = new MutationObserver(() => {
            if (queued) return;
            queued = requestAnimationFrame(() => {
                queued = 0;
                scan();
            });
        });
        mo.observe(document.body, { childList: true, subtree: true });
        return () => {
            mo.disconnect();
            io.disconnect();
            cancelAnimationFrame(queued);
        };
    }, []);
    return null;
}
