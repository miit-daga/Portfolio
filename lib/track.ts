import { track } from "@vercel/analytics";

// Custom Vercel Analytics events, for how the arcade gets found and played.
// (They show under Analytics, Events, on plans that include custom events;
// elsewhere, and on localhost, they're simply not recorded.) Never throws.
export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
    try {
        track(name, props);
    } catch {
        /* ignore */
    }
    // ...and to the site's own tally (app/api/tally), which any plan keeps,
    // read at /stats: gathered, and sent together as the visitor leaves
    queue.push({ event: name, props });
    listen();
}

// A visit's events, sent in one beacon when the page is hidden or closed (one
// request per visit, not one per event: the tally is saved to a gist, which
// GitHub lets be edited only so often)
const queue: { event: string; props?: Record<string, string | number | boolean> }[] = [];
let listening = false;
function flush() {
    if (!queue.length) return;
    const body = JSON.stringify({ events: queue.splice(0, queue.length) });
    try {
        if (!navigator.sendBeacon?.("/api/tally", new Blob([body], { type: "application/json" }))) {
            fetch("/api/tally", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
        }
    } catch {
        /* ignore */
    }
}
function listen() {
    if (listening || typeof window === "undefined") return;
    listening = true;
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
    window.addEventListener("pagehide", flush);
}
