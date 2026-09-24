"use client";
import { useEffect } from "react";

// The last resort: when the site's own layout fails, so even app/error.tsx
// can't show. It has to bring its own <html>, and stays plain; the crash is
// reported for /stats with a beacon, as lib/report-error.ts would
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        try {
            const body = JSON.stringify({ game: "page", kind: "crash", message: `${error.name}: ${error.message}`.slice(0, 300) });
            navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }));
        } catch {
            /* ignore */
        }
    }, [error]);
    return (
        <html lang="en">
            <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
                <div>
                    <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
                    <p style={{ color: "#a3a3a3", fontSize: 14 }}>It has been reported. Reloading usually fixes it.</p>
                    <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 999, border: "none", background: "#2dd4bf", fontWeight: 600, cursor: "pointer" }}>
                        Reload
                    </button>
                </div>
            </body>
        </html>
    );
}
