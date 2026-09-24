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
    // read at /stats. A beacon, so it survives the page moving on
    try {
        const body = JSON.stringify({ event: name, props });
        if (!navigator.sendBeacon?.("/api/tally", new Blob([body], { type: "application/json" }))) {
            fetch("/api/tally", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
        }
    } catch {
        /* ignore */
    }
}
