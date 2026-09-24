// Quietly tells the site something went wrong in the arcade (app/api/errors),
// for /stats. One report per distinct problem per page, a beacon so it gets
// out even as the page reloads or closes, and it never throws.

type Game = "assist" | "run" | "stack" | "arcade";
type Kind = "crash" | "no-webgl" | "load-failed" | "error" | "rejection" | "stuck-loading";
const sent = new Set<string>();

export function reportError(game: Game, kind: Kind, error?: unknown) {
    try {
        const message = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : error ? String(error) : "";
        const key = `${game}|${kind}|${message}`;
        if (sent.has(key) || sent.size > 20) return;
        sent.add(key);
        const body = JSON.stringify({ game, kind, message: message.slice(0, 300) });
        if (!navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }))) {
            fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
        }
    } catch {
        /* ignore */
    }
}
