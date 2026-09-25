// When a page fails only because one of its script files didn't arrive (a
// slow or dropped connection: the browser waits, gives up, and the page
// errors), reloading fixes it, so the error pages (app/error.tsx,
// app/global-error.tsx) reload once by themselves instead of showing the
// error. Once per page per minute, so a page that really is broken can't
// loop: the second failure shows the error as before.

const KEY = "chunk-retry";
const WINDOW_MS = 60_000;

/** A failure to load part of the page, not a bug in it. */
export function isLoadFailure(error: unknown) {
    const e = error as { name?: string; message?: string } | null;
    const text = `${e?.name ?? ""} ${e?.message ?? ""}`;
    return /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(text);
}

/** Reloads the page if it hasn't just been reloaded for this; whether it did. */
export function reloadOnce() {
    try {
        const path = window.location.pathname;
        const last = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { path: string; at: number } | null;
        if (last && last.path === path && Date.now() - last.at < WINDOW_MS) return false;
        sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
    } catch {
        // (no storage: reload anyway, as the old code would have asked the visitor to)
    }
    window.location.reload();
    return true;
}
