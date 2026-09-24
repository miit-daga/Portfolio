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
}
